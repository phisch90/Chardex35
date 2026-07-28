/**
 * Zauber-Einträge → Homebrew-Entities.
 *
 * Der Aufbau eines Zauber-Eintrags ist in allen 3.5-Büchern derselbe: Name, dann
 * eine Schulzeile („Evocation [Fire]", „Conjuration (Healing)"), dann die
 * beschrifteten Felder. Daran hängt die Erkennung.
 *
 * Die Grad-Zeile ist der einzige Teil, der ÜBERSETZT werden muss: im Buch steht
 * „Sor/Wiz 3", im Kompendium heißt die Liste `sorcerer-wizard`. Trifft eine
 * Abkürzung auf keine bekannte Liste, wird sie NICHT geraten, sondern gemeldet —
 * ein Zauber in der falschen Klassenliste fällt niemandem auf, bis er am Tisch
 * fehlt.
 */
import { type Entity, type EntityInput } from "@codex35/core";
import { finishEntity } from "../finish.js";
import type { SrdIndex } from "../lookup.js";
import { field, type RawEntry } from "../segment.js";

export interface ParsedSpell {
  entity: Entity;
  inferred: string[];
  warnings: string[];
}

/** Feldnamen, an denen ein Zauber-Eintrag erkennbar ist. */
export const SPELL_ANCHORS = ["Level"];

/** Zeilen, die zwischen Name und Feldern stehen dürfen (die Schulzeile). */
export const SPELL_SKIP_ABOVE =
  /^(Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation|Universal)\b/i;

/**
 * Buch-Abkürzung → Listen-Slug im Kompendium. Die Slugs stammen aus den
 * committeten Packs, nicht aus dem Gedächtnis.
 */
const LIST_BY_ABBREV: Record<string, string> = {
  "sor/wiz": "sorcerer-wizard",
  sor: "sorcerer-wizard",
  wiz: "sorcerer-wizard",
  clr: "cleric",
  drd: "druid",
  brd: "bard",
  pal: "paladin",
  rgr: "ranger",
  asn: "assassin",
  blk: "blackguard",
  adp: "adept",
};

const SCHOOLS = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
  "Universal",
];

export interface SchoolLine {
  school: string;
  subschool?: string;
  descriptors: string[];
}

/** „Conjuration (Creation) [Force]" → Schule, Teilschule, Deskriptoren. */
export function parseSchoolLine(text: string): SchoolLine | null {
  const school = SCHOOLS.find((s) => new RegExp(`^${s}\\b`, "i").test(text.trim()));
  if (!school) return null;
  const rest = text.trim().slice(school.length);
  const subschool = /\(([^)]+)\)/.exec(rest)?.[1]?.trim();
  const descriptors = (/\[([^\]]+)\]/.exec(rest)?.[1] ?? "")
    .split(/\s*,\s*/)
    .map((d) => d.trim())
    .filter((d) => d !== "");
  return { school, ...(subschool === undefined ? {} : { subschool }), descriptors };
}

/**
 * „Brd 1, Clr 1, Drd 1" → { bard: 1, cleric: 1, druid: 1 }.
 * Unbekannte Abkürzungen landen in `unknown`, nicht im Ergebnis.
 */
export function parseSpellLevels(text: string): {
  levels: Record<string, number>;
  unknown: string[];
} {
  const levels: Record<string, number> = {};
  const unknown: string[] = [];
  for (const part of text.split(/\s*,\s*/)) {
    const match = /^(.+?)\s+(\d+)$/.exec(part.trim());
    if (!match) {
      if (part.trim() !== "") unknown.push(part.trim());
      continue;
    }
    const key = match[1]!.trim().toLowerCase();
    const level = parseInt(match[2]!, 10);
    const slug = LIST_BY_ABBREV[key];
    if (slug === undefined) {
      // Domänen stehen im Buch als Klartext („Fire 3") — als Domäne übernehmen.
      if (/^[a-z]+$/.test(key)) levels[`domain-${key}`] = level;
      else unknown.push(part.trim());
      continue;
    }
    levels[slug] = level;
  }
  return { levels, unknown };
}

export function parseSpell(
  index: SrdIndex,
  entry: RawEntry,
  options: { sourcePack: string; now: string },
): ParsedSpell {
  const inferred: string[] = [];
  const warnings: string[] = [];

  // Die Schulzeile ist der erste Absatz ohne Feldnamen.
  const schoolLine = entry.body.map(parseSchoolLine).find((s) => s !== null) ?? null;
  if (schoolLine === null) warnings.push("keine Schulzeile gefunden (Evocation, Conjuration …)");

  const levelText = field(entry, "Level") ?? "";
  const { levels, unknown } = parseSpellLevels(levelText);
  for (const part of unknown) {
    warnings.push(`Grad-Angabe nicht zuzuordnen: „${part}" — Klassenliste bitte prüfen`);
  }
  if (Object.keys(levels).length === 0) warnings.push("kein Grad erkannt — der Zauber taucht in keiner Liste auf");
  for (const slug of Object.keys(levels)) {
    if (!index.spellListIdByAbbrev.has(slug)) {
      warnings.push(`Liste „${slug}" gibt es im Kompendium nicht — Tippfehler oder eigene Liste?`);
    }
  }

  // Der Beschreibungstext ist alles ohne Feldnamen außer der Schulzeile.
  const description = entry.body
    .filter((paragraph) => parseSchoolLine(paragraph) === null)
    .join("\n\n");
  if (description.trim() === "") warnings.push("kein Beschreibungstext gefunden");

  const optional = (label: string) => {
    const value = field(entry, label);
    return value === undefined || value === "" ? {} : { [label]: value };
  };

  const entity: EntityInput = {
    id: crypto.randomUUID(),
    name: entry.name,
    kind: "spell",
    source: "homebrew",
    sourcePack: options.sourcePack,
    schemaVersion: 1,
    rev: 1,
    updatedAt: options.now,
    tags: [],
    description,
    effects: [],
    data: {
      school: schoolLine?.school ?? "",
      ...(schoolLine?.subschool === undefined ? {} : { subschool: schoolLine.subschool }),
      descriptors: schoolLine?.descriptors ?? [],
      levels,
      ...renameField(optional("Components"), "Components", "components"),
      ...renameField(optional("Casting Time"), "Casting Time", "castingTime"),
      ...renameField(optional("Range"), "Range", "range"),
      ...renameField(optional("Target"), "Target", "target"),
      ...renameField(optional("Area"), "Area", "area"),
      ...renameField(optional("Effect"), "Effect", "effect"),
      ...renameField(optional("Duration"), "Duration", "duration"),
      ...renameField(optional("Saving Throw"), "Saving Throw", "savingThrow"),
      ...renameField(optional("Spell Resistance"), "Spell Resistance", "spellResistance"),
    },
  };

  if (Object.keys(levels).length > 0) {
    inferred.push(
      `Klassenlisten: ${Object.entries(levels)
        .map(([slug, level]) => `${slug} ${level}`)
        .join(", ")}`,
    );
  }

  return { entity: finishEntity(entity), inferred, warnings };
}

/** Kleiner Umbenenner, damit die Feldnamen des Buches im Schema landen. */
function renameField(
  source: Record<string, string>,
  from: string,
  to: string,
): Record<string, string> {
  const value = source[from];
  return value === undefined ? {} : { [to]: value };
}
