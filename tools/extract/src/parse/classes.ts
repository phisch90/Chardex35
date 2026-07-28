/**
 * Prestigeklassen → Homebrew-Entities.
 *
 * Eine Klasse besteht aus zwei Teilen, die getrennt gelesen werden müssen:
 *
 *  - TEXT: Trefferwürfel, Voraussetzungen, Klassenfertigkeiten,
 *    Fertigkeitspunkte, Beschreibung der Klassenfähigkeiten.
 *  - TABELLE: GAB, Rettungswürfe, Spalte „Special", Zauber pro Tag. Die darf
 *    NICHT als Text gelesen werden — welche Spalte ein „+2" meint, sagt allein
 *    die Position (siehe table.ts).
 *
 * Was nicht aus einem völlig regelmäßigen Muster kommt, wird gemeldet statt
 * geraten. Eine Klasse mit falschen Rettungswürfen fällt am Tisch erst auf,
 * wenn der Wurf schon misslungen ist.
 */
import {
  parsePrerequisites,
  resolveSkillId,
  splitTopLevel,
  type ClassLevelRow,
  type Entity,
  type EntityInput,
  type Prerequisite,
} from "@codex35/core";
import { finishEntity } from "../finish.js";
import type { SrdIndex } from "../lookup.js";
import { field, type RawEntry } from "../segment.js";
import { readLevelRow, type LevelTable } from "../table.js";

export interface ParsedClass {
  entity: Entity;
  inferred: string[];
  warnings: string[];
}

/** Feldnamen, an denen ein Klassen-Eintrag erkennbar ist. */
export const CLASS_ANCHORS = ["Hit Die", "Hit Dice"];

/** Überschriften innerhalb eines Klassen-Eintrags (Fließtext, keine Felder). */
const REQUIREMENTS_HEADING = /^requirements?$/i;
const CLASS_SKILLS_HEADING = /^class skills$/i;
const CLASS_FEATURES_HEADING = /^class features$/i;

/**
 * Trefferwürfel: „Hit Die: d6." → 6. Andere Würfel als die sechs erlaubten gibt
 * es in 3.5 nicht, deshalb wird ein abweichender Wert gemeldet statt gerundet.
 */
const HIT_DICE = [4, 6, 8, 10, 12] as const;

export function parseClass(
  index: SrdIndex,
  entry: RawEntry,
  table: LevelTable | null,
  options: { sourcePack: string; now: string; prestige?: boolean },
): ParsedClass {
  const inferred: string[] = [];
  const warnings: string[] = [];

  // --- Trefferwürfel ------------------------------------------------------
  const hitDieText = field(entry, "Hit Die", "Hit Dice") ?? "";
  const hitDieMatch = /d(\d+)/i.exec(hitDieText);
  const hitDieValue = hitDieMatch === null ? null : parseInt(hitDieMatch[1]!, 10);
  const hitDie = HIT_DICE.find((d) => d === hitDieValue) ?? 8;
  if (hitDieValue === null) warnings.push(`Trefferwürfel nicht erkannt („${hitDieText}") — d8 eingesetzt`);
  else if (hitDie !== hitDieValue) {
    warnings.push(`Trefferwürfel d${hitDieValue} gibt es in 3.5 nicht — d8 eingesetzt, bitte prüfen`);
  }

  // --- Fertigkeitspunkte je Stufe -----------------------------------------
  const skillPointsText = field(entry, "Skill Points at Each Level", "Skill Points") ?? "";
  const skillPointsMatch = /(\d+)\s*\+/.exec(skillPointsText);
  const skillPointsPerLevel = skillPointsMatch === null ? 2 : parseInt(skillPointsMatch[1]!, 10);
  if (skillPointsMatch === null) {
    warnings.push(`Fertigkeitspunkte je Stufe nicht erkannt („${skillPointsText}") — 2 eingesetzt`);
  }

  // --- Voraussetzungen ----------------------------------------------------
  const { requirements, unresolved } = readRequirements(index, entry);
  for (const text of unresolved) {
    warnings.push(`Voraussetzung nur als Text übernommen: „${text}"`);
  }

  // --- Klassenfertigkeiten ------------------------------------------------
  const skills = readClassSkills(index, entry);
  for (const name of skills.unknown) {
    warnings.push(`Fertigkeit „${name}" gibt es im Kompendium nicht — Klassenfertigkeit fehlt`);
  }
  if (skills.ids.length === 0) warnings.push("keine Klassenfertigkeiten gefunden");

  // --- Stufentabelle ------------------------------------------------------
  const levels: ClassLevelRow[] = [];
  const highestSpellLevel = table === null ? 0 : Math.max(0, ...table.spellColumns.keys());
  if (table === null) {
    warnings.push("keine Stufentabelle gefunden — GAB und Rettungswürfe fehlen komplett");
  } else {
    const sorted = [...table.rows.keys()].sort((a, b) => a - b);
    for (const level of sorted) {
      const values = readLevelRow(table.rows.get(level)!, table.spellColumns);
      if (values === null) {
        warnings.push(`Stufe ${level}: Zeile der Tabelle nicht lesbar`);
        continue;
      }
      const features = splitFeatures(values.special);
      const row: ClassLevelRow = {
        bab: values.bab,
        fort: values.fort,
        ref: values.ref,
        will: values.will,
        features: features.map((name) => ({ name, effects: [] })),
      };
      if (table.spellColumns.size > 0) {
        // Index = Zaubergrad, also ist Feld 0 die Zaubertricks-Spalte. Fehlt ein
        // Grad in der Zeile („—"), bleibt er null — nicht 0: „0 Zauber" und
        // „diesen Grad gibt es noch nicht" sind verschiedene Dinge.
        row.spellsPerDay = Array.from({ length: highestSpellLevel + 1 }, (_, spellLevel) =>
          values.spellsPerDay.has(spellLevel) ? values.spellsPerDay.get(spellLevel)! : null,
        );
      }
      levels.push(row);
    }
    if (levels.length > 0) {
      inferred.push(
        `Stufentabelle: ${levels.length} Stufen, GAB ${levels[0]!.bab}…${levels[levels.length - 1]!.bab}`,
      );
    }
  }
  if (levels.length === 0) {
    // Das Schema verlangt mindestens eine Stufe. Eine leere Stufe 1 ist ehrlicher
    // als eine erfundene Tabelle — die Warnung sagt, was zu tun ist.
    levels.push({ bab: 0, fort: 0, ref: 0, will: 0, features: [] });
  }

  const maxLevel = levels.length;
  if (options.prestige === true && maxLevel !== 10 && maxLevel !== 5) {
    warnings.push(`Prestigeklasse mit ${maxLevel} Stufen — bitte prüfen, üblich sind 5 oder 10`);
  }

  // --- Zauberwirken -------------------------------------------------------
  const spellcasting = readSpellcasting(index, entry, highestSpellLevel);
  if (spellcasting === null && highestSpellLevel > 0) {
    warnings.push(
      "Zauber pro Tag übernommen, aber Zauberliste/Modell/Attribut nicht eindeutig im Text — " +
        "bitte in der App nachtragen, sonst bleibt die Tabelle wirkungslos",
    );
  }
  if (spellcasting !== null) {
    inferred.push(
      `Zauberwirken: ${spellcasting.model === "prepared" ? "vorbereitend" : "spontan"}, ` +
        `${spellcasting.ability.toUpperCase()}, Liste ${spellcasting.spellListId}`,
    );
  }

  const entity: EntityInput = {
    id: crypto.randomUUID(),
    name: entry.name,
    kind: "class",
    source: "homebrew",
    sourcePack: options.sourcePack,
    schemaVersion: 1,
    rev: 1,
    updatedAt: options.now,
    tags: options.prestige === true ? ["prestige"] : [],
    description: entry.body.join("\n\n"),
    effects: [],
    data: {
      hitDie,
      skillPointsPerLevel,
      classSkillIds: skills.ids,
      maxLevel,
      requirements,
      levels,
      ...(spellcasting === null ? {} : { spellcasting }),
      ...(readProficiencies(entry) === undefined
        ? {}
        : { proficiencies: readProficiencies(entry)! }),
    },
  };

  return { entity: finishEntity(entity), inferred, warnings };
}

/**
 * Voraussetzungen: die Felder zwischen der Überschrift „Requirements" und der
 * nächsten Überschrift. Ein Whitelist-Ansatz („alles namens Skills:") wäre hier
 * falsch — „Skills:" steht auch unter „Class Features" und beschreibt dort eine
 * Fähigkeit, keine Bedingung.
 */
function readRequirements(
  index: SrdIndex,
  entry: RawEntry,
): { requirements: Prerequisite[]; unresolved: string[] } {
  const requirements: Prerequisite[] = [];
  const unresolved: string[] = [];

  let inside = false;
  for (const step of entry.sequence) {
    if (step.kind === "body") {
      const text = entry.body[step.index] ?? "";
      if (REQUIREMENTS_HEADING.test(text.trim())) {
        inside = true;
        continue;
      }
      // Jede weitere Überschrift beendet den Abschnitt; Fließtext („To qualify to
      // become an assassin …") beendet ihn nicht.
      if (inside && (CLASS_SKILLS_HEADING.test(text.trim()) || CLASS_FEATURES_HEADING.test(text.trim()))) {
        break;
      }
      continue;
    }
    if (!inside) continue;
    const entryField = entry.fields[step.index];
    if (entryField === undefined) continue;
    const parsed = parsePrerequisites(index, entryField.text);
    for (const requirement of parsed) {
      if (requirement.type === "custom") {
        /*
          „Alignment: Any evil" und „Special: The character must kill someone …"
          sind echte Bedingungen, aber nicht maschinell prüfbar. Sie kommen als
          custom mit, damit sie am Charakter sichtbar sind — und werden gemeldet,
          damit niemand glaubt, die App prüfe sie.
        */
        const label = entryField.label.toLowerCase() === "special" ? "" : `${entryField.label}: `;
        const text = `${label}${requirement.text}`.trim();
        requirements.push({ type: "custom", text });
        unresolved.push(text);
      } else requirements.push(requirement);
    }
  }
  return { requirements, unresolved };
}

/**
 * Klassenfertigkeiten aus dem Absatz „The assassin's class skills (and the key
 * ability for each skill) are Balance (Dex), Bluff (Cha), …".
 */
function readClassSkills(
  index: SrdIndex,
  entry: RawEntry,
): { ids: string[]; unknown: string[] } {
  const paragraph = entry.body.find(
    (text) => /class skills/i.test(text) && / are /i.test(text),
  );
  if (paragraph === undefined) return { ids: [], unknown: [] };

  const list = paragraph.slice(paragraph.search(/ are /i) + 5);
  const ids: string[] = [];
  const unknown: string[] = [];
  for (const raw of splitTopLevel(list)) {
    const name = raw
      .replace(/^\s*and\s+/i, "")
      .replace(/\s*\((?:Str|Dex|Con|Int|Wis|Cha)\)\s*$/i, "")
      .replace(/[.;]+$/, "")
      .trim();
    if (name === "") continue;
    const id = resolveSkillId(index, name);
    if (id === undefined) unknown.push(name);
    else if (!ids.includes(id)) ids.push(id);
  }
  return { ids, unknown };
}

/** Freitext der Waffen-/Rüstungsvertrautheit, falls das Feld existiert. */
function readProficiencies(entry: RawEntry): string | undefined {
  const text = field(entry, "Weapon and Armor Proficiency", "Weapon and Armor Proficiencies");
  return text === undefined || text === "" ? undefined : text;
}

/**
 * Der Zauberwirken-Block — nur aus zwei Sätzen, die in 3.5 vollständig
 * regelmäßig sind, und nur ALLES ODER NICHTS:
 *
 *  - „must have a[n] Intelligence score of at least 10 + the spell's level"
 *    nennt das Attribut. Dieser Satz steht so in jeder zaubernden Klasse.
 *  - „prepares" vs. „knows / without preparation" nennt das Modell.
 *
 * Fehlt eines davon oder gibt es keine Zauberliste dieses Namens, entsteht KEIN
 * Block. Ein geratenes Attribut verschiebt jede Zauber-SG der Klasse.
 */
function readSpellcasting(
  index: SrdIndex,
  entry: RawEntry,
  highestSpellLevel: number,
): { model: "prepared" | "spontaneous"; ability: "int" | "wis" | "cha"; spellListId: string } | null {
  if (highestSpellLevel === 0) return null;

  const spellListId = index.spellListIdByAbbrev.get(entry.name.toLowerCase());
  if (spellListId === undefined) return null;

  const all = [...entry.body, ...entry.fields.map((f) => `${f.label}: ${f.text}`)].join(" ");
  const ability = /must have (?:an?|a) (Intelligence|Wisdom|Charisma) score of at least 10 \+/i.exec(all);
  if (ability === null) return null;
  const abilityKey = { intelligence: "int", wisdom: "wis", charisma: "cha" } as const;
  const key = abilityKey[ability[1]!.toLowerCase() as keyof typeof abilityKey];

  /*
    Die Reihenfolge ist wichtig, nicht die Und-Verknüpfung: „casts spells without
    advance preparation" enthält das Wort „preparation" und wäre bei einer
    Gleichzeitig-Prüfung unentscheidbar. Die Negation ist aber der eindeutigere
    Satz und schlägt deshalb vor.
  */
  const spontaneous = /without (?:advance )?preparation|need not prepare/i.test(all);
  const prepares = /\bprepar(?:e|es|ed|ing)\b/i.test(all);
  if (!spontaneous && !prepares) return null;

  return { model: spontaneous ? "spontaneous" : "prepared", ability: key, spellListId };
}

/**
 * Spalte „Special" → Namen der Klassenfähigkeiten. Genau am Komma getrennt, wie
 * das Buch es setzt; Mechanik wird NICHT abgeleitet („Sneak attack +1d6" bleibt
 * ein Name, kein Effekt). Die Beschreibung dazu steht im Text der Klasse.
 */
export function splitFeatures(special: string): string[] {
  const text = special.trim();
  if (text === "" || text === "—" || text === "-" || text === "–") return [];
  return splitTopLevel(text)
    .map((part) => part.replace(/[.;]+$/, "").trim())
    .filter((part) => part !== "");
}
