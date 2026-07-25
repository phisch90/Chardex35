import { ABILITIES, type Ability } from "../schema/common.js";
import {
  CURRENT_SCHEMA_VERSION,
  characterSchema,
  type Character,
  type HouseRules,
} from "../schema/character.js";
import { displayName, type Entity } from "../schema/entities.js";
import { deriveSheet } from "../engine/index.js";

/**
 * Importer für Charakter-Exporte der App „Fight Club" (Lion's Den), 3.5-Edition:
 * `<characters version="3"><pc>…</pc></characters>`.
 *
 * Der Export enthält überwiegend ABGELEITETE Werte (RK, Angriffsboni, Saves),
 * unser Modell speichert aber rohe Entscheidungen. Der Importer rekonstruiert
 * daher, was rekonstruierbar ist (Volk, Klassenstufen, Attribute, Ränge,
 * Talente, Waffen) und behandelt den Rest so:
 *
 * - **TP** werden als `overrideMax` + Schaden übernommen (exakte Kontinuität).
 * - **RK und Rettungswürfe** werden über EINEN manuellen Ausgleichsmodifikator
 *   auf den Importwert gebracht — dort sitzt typischerweise Ausrüstung, die der
 *   Export nicht mitliefert. Der Modifikator ist im Bogen sichtbar und löschbar.
 * - **Alles andere** (GAB, Ringkampf, Initiative, Angriffsboni, Fertigkeits-
 *   summen) wird NICHT verbogen: Abweichungen erscheinen als Bericht, damit man
 *   sieht, wo eine Regel-Interpretation auseinandergeht.
 */

export interface ImportIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
}

export interface FightClubAction {
  name: string;
  attack?: string | undefined;
  damage?: string | undefined;
  critical?: string | undefined;
}

export interface FightClubPc {
  name: string;
  raceClass: string;
  size?: string | undefined;
  /** Endwerte inklusive Volksmodifikatoren. */
  abilities: Partial<Record<Ability, number>>;
  hp?: { current: number; max: number } | undefined;
  ac?: number | undefined;
  touch?: number | undefined;
  flatFooted?: number | undefined;
  init?: number | undefined;
  bab?: number | undefined;
  grapple?: number | undefined;
  saves: { fort?: number | undefined; ref?: number | undefined; will?: number | undefined };
  speed?: string | undefined;
  featTokens: string[];
  skills: { name: string; ranks: number; total: number | undefined }[];
  actions: FightClubAction[];
}

// ---------------------------------------------------------------------------
// XML-Extraktion — tolerant und DOM-frei (läuft im Browser, in Node und in Tests)
// ---------------------------------------------------------------------------

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

function blocks(xml: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi");
  return [...xml.matchAll(pattern)].map((m) => m[1] ?? "");
}

function tagText(block: string, tag: string): string | undefined {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const match = pattern.exec(block);
  if (!match) return undefined;
  const text = decodeEntities(match[1] ?? "").trim();
  return text === "" ? undefined : text;
}

function tagNumber(block: string, tag: string): number | undefined {
  const text = tagText(block, tag);
  if (text === undefined) return undefined;
  const match = /[+-]?\d+/.exec(text);
  return match ? Number(match[0]) : undefined;
}

/** Zerlegt „Bluff (1) +1" — Skill-Namen dürfen selbst Klammern enthalten. */
function parseSkillToken(token: string): { name: string; ranks: number; total: number | undefined } | null {
  const match = /^(.+?)\s*\((\d+(?:[.,]\d+)?)\)\s*([+-]\s*\d+)?/.exec(token.trim());
  if (!match) return null;
  const totalText = match[3]?.replace(/\s+/g, "");
  return {
    name: (match[1] ?? "").trim(),
    ranks: Number((match[2] ?? "0").replace(",", ".")),
    total: totalText ? Number(totalText) : undefined,
  };
}

export function parseFightClubXml(xml: string): { pcs: FightClubPc[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const version = /<characters(?:\s[^>]*)?\sversion="([^"]*)"/i.exec(xml)?.[1];
  if (version !== undefined && version !== "3") {
    issues.push({
      severity: "info",
      code: "fc-version",
      message: `Datei meldet Fight-Club-Version „${version}" — erwartet wird 3 (3.5-Edition). Import wird versucht.`,
    });
  }

  // Fight Club GM exportiert Spieler- und NSC-Blöcke.
  const pcBlocks = [...blocks(xml, "pc"), ...blocks(xml, "npc")];
  if (pcBlocks.length === 0) {
    issues.push({
      severity: "error",
      code: "fc-no-characters",
      message: "Keine <pc>- oder <npc>-Einträge in der Datei gefunden.",
    });
    return { pcs: [], issues };
  }

  const pcs = pcBlocks.map((block): FightClubPc => {
    const abilities: Partial<Record<Ability, number>> = {};
    for (const ability of ABILITIES) {
      const value = tagNumber(block, ability);
      if (value !== undefined) abilities[ability] = value;
    }

    const hpText = tagText(block, "hp");
    const hpMatch = hpText ? /(\d+)\s*\/\s*(\d+)/.exec(hpText) : null;
    const hpSingle = hpText && !hpMatch ? /(\d+)/.exec(hpText) : null;

    const featTokens = (tagText(block, "feats") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t !== "");

    const skills = (tagText(block, "skills") ?? "")
      .split(",")
      .map(parseSkillToken)
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const actions = blocks(block, "action").map((actionBlock) => ({
      name: tagText(actionBlock, "name") ?? "",
      attack: tagText(actionBlock, "attack"),
      damage: tagText(actionBlock, "damage"),
      critical: tagText(actionBlock, "critical"),
    }));

    return {
      name: tagText(block, "name") ?? "Unbenannt",
      raceClass: tagText(block, "raceClass") ?? "",
      size: tagText(block, "size"),
      abilities,
      hp: hpMatch
        ? { current: Number(hpMatch[1]), max: Number(hpMatch[2]) }
        : hpSingle
          ? { current: Number(hpSingle[1]), max: Number(hpSingle[1]) }
          : undefined,
      ac: tagNumber(block, "ac"),
      touch: tagNumber(block, "touch"),
      flatFooted: tagNumber(block, "flat"),
      init: tagNumber(block, "init"),
      bab: tagNumber(block, "bab"),
      grapple: tagNumber(block, "grapple"),
      saves: {
        fort: tagNumber(block, "fort"),
        ref: tagNumber(block, "ref"),
        will: tagNumber(block, "will"),
      },
      speed: tagText(block, "speed"),
      featTokens,
      skills,
      actions: actions.filter((a) => a.name !== ""),
    };
  });

  return { pcs, issues };
}

// ---------------------------------------------------------------------------
// Namens-Zuordnung gegen das Kompendium
// ---------------------------------------------------------------------------

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,.'’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface NameIndex {
  /** normalisierter Name → kanonische ID */
  exact: Map<string, string>;
  /** absteigend nach Länge, für Präfix-Zuordnung („Weapon Focus Kurzschwert") */
  byLength: { normalized: string; id: string }[];
}

function buildIndex(compendium: Map<string, Entity>, kind: Entity["kind"]): NameIndex {
  const exact = new Map<string, string>();
  const byLength: { normalized: string; id: string }[] = [];
  for (const [id, entity] of compendium) {
    if (entity.kind !== kind || entity.deletedAt) continue;
    // Overrides liegen unter eigener UND Ziel-ID — nur die kanonische nutzen.
    if (id !== (entity.overrides ?? entity.id)) continue;
    for (const variant of new Set([normalize(entity.name), normalize(displayName(entity))])) {
      if (!exact.has(variant)) exact.set(variant, id);
      byLength.push({ normalized: variant, id });
    }
  }
  byLength.sort((a, b) => b.normalized.length - a.normalized.length);
  return { exact, byLength };
}

/** Exakter Treffer, sonst längster Namens-Präfix; liefert den Restteil mit. */
function matchName(index: NameIndex, raw: string): { id: string; rest: string } | null {
  const needle = normalize(raw);
  const direct = index.exact.get(needle);
  if (direct) return { id: direct, rest: "" };
  for (const candidate of index.byLength) {
    if (needle === candidate.normalized) return { id: candidate.id, rest: "" };
    if (needle.startsWith(`${candidate.normalized} `)) {
      // Restteil aus dem ORIGINAL schneiden, damit die Schreibweise erhalten bleibt.
      const rest = raw.trim().slice(candidate.normalized.length).replace(/^[\s(]+|[\s)]+$/g, "");
      return { id: candidate.id, rest };
    }
  }
  return null;
}

/** „Human Fighter 3/Cleric 4" → Volk + Klassenstufen. */
export function parseRaceClass(
  raceClass: string,
  compendium: Map<string, Entity>,
): {
  raceId: string | null;
  classLevels: { classId: string; level: number }[];
  unmatched: string[];
} {
  const raceIndex = buildIndex(compendium, "race");
  const classIndex = buildIndex(compendium, "class");
  const unmatched: string[] = [];

  let rest = raceClass.trim();
  let raceId: string | null = null;
  // Längster Rassenname am Anfang der Zeile.
  for (const candidate of raceIndex.byLength) {
    if (normalize(rest) === candidate.normalized) {
      raceId = candidate.id;
      rest = "";
      break;
    }
    if (normalize(rest).startsWith(`${candidate.normalized} `)) {
      raceId = candidate.id;
      rest = rest.slice(candidate.normalized.length).trim();
      break;
    }
  }

  const classLevels: { classId: string; level: number }[] = [];
  for (const part of rest.split("/")) {
    const token = part.trim();
    if (token === "") continue;
    const match = /^(.*?)\s+(\d+)$/.exec(token);
    const className = (match?.[1] ?? token).trim();
    const level = match ? Number(match[2]) : 1;
    const hit = matchName(classIndex, className);
    if (hit && hit.rest === "") classLevels.push({ classId: hit.id, level });
    else unmatched.push(token);
  }

  return { raceId, classLevels, unmatched };
}

// ---------------------------------------------------------------------------
// Abbildung auf einen Charakter
// ---------------------------------------------------------------------------

export interface ImportComparison {
  label: string;
  imported: number;
  derived: number;
  /**
   * `match` – App rechnet denselben Wert (Vertrauensbeweis),
   * `reconciled` – Differenz per sichtbarem Modifikator angeglichen,
   * `reported` – Differenz bleibt bestehen und wird nur erklärt.
   */
  status: "match" | "reconciled" | "reported";
  hint?: string | undefined;
}

export interface ImportResultPc {
  character: Character;
  issues: ImportIssue[];
  comparisons: ImportComparison[];
}

/**
 * Baut aus einem Fight-Club-Eintrag einen Charakter. `idFactory` und
 * `houseRules` werden injiziert, damit die Funktion pur und testbar bleibt.
 */
export function mapFightClubPc(
  pc: FightClubPc,
  compendium: Map<string, Entity>,
  options: { idFactory: () => string; houseRules?: HouseRules },
): ImportResultPc {
  const issues: ImportIssue[] = [];
  const { idFactory } = options;

  const { raceId, classLevels, unmatched } = parseRaceClass(pc.raceClass, compendium);
  if (raceId === null) {
    issues.push({
      severity: "error",
      code: "race-unmatched",
      message: `Volk aus „${pc.raceClass}" nicht erkannt — der Bogen rechnet ohne Volksboni.`,
    });
  }
  for (const token of unmatched) {
    issues.push({
      severity: "error",
      code: "class-unmatched",
      message: `Klasse „${token}" nicht im Kompendium gefunden — diese Stufen fehlen im Bogen.`,
    });
  }
  if (classLevels.length === 0) {
    issues.push({
      severity: "error",
      code: "no-classes",
      message: "Keine Klassenstufen erkannt — Stufe, GAB und Rettungswürfe bleiben leer.",
    });
  }

  // Attribute: der Export nennt ENDWERTE, unser Modell speichert Basiswerte.
  const race = raceId ? compendium.get(raceId) : undefined;
  const racialMods = race?.kind === "race" ? race.data.abilityMods : {};
  const base: Record<Ability, number> = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  for (const ability of ABILITIES) {
    const final = pc.abilities[ability];
    if (final === undefined) {
      issues.push({
        severity: "warning",
        code: "ability-missing",
        message: `Attribut ${ability.toUpperCase()} fehlt im Export — auf 10 gesetzt.`,
      });
      continue;
    }
    base[ability] = final - (racialMods[ability] ?? 0);
  }

  const levels = classLevels.flatMap(({ classId, level }) =>
    Array.from({ length: level }, () => ({ classId, hpRoll: "avg" as const })),
  );

  // Talente: „Weapon Focus Kurzschwert" → Talent + Auswahl.
  const featIndex = buildIndex(compendium, "feat");
  const feats: Character["feats"] = [];
  for (const token of pc.featTokens) {
    const hit = matchName(featIndex, token);
    if (!hit) {
      issues.push({
        severity: "warning",
        code: "feat-unmatched",
        message: `Talent „${token}" nicht im Kompendium — als Notiz übernommen.`,
      });
      continue;
    }
    feats.push(hit.rest === "" ? { featId: hit.id } : { featId: hit.id, choice: hit.rest });
  }
  const unmatchedFeats = pc.featTokens.filter((t) => matchName(featIndex, t) === null);

  // Fertigkeitsränge.
  const skillIndex = buildIndex(compendium, "skill");
  const skillRanks: Record<string, number> = {};
  const skillTotals = new Map<string, number>();
  for (const entry of pc.skills) {
    const hit = matchName(skillIndex, entry.name);
    if (!hit) {
      issues.push({
        severity: "warning",
        code: "skill-unmatched",
        message: `Fertigkeit „${entry.name}" nicht im Kompendium — Ränge nicht übernommen.`,
      });
      continue;
    }
    if (hit.rest !== "") {
      issues.push({
        severity: "info",
        code: "skill-subtype",
        message: `„${entry.name}": Teilgebiet „${hit.rest}" wird von der App noch nicht getrennt geführt — Ränge auf ${hit.id.split(":")[2]} addiert.`,
      });
    }
    skillRanks[hit.id] = (skillRanks[hit.id] ?? 0) + entry.ranks;
    if (entry.total !== undefined) skillTotals.set(hit.id, entry.total);
  }

  // Waffen aus den Aktionszeilen ins Inventar (angelegt → Angriffszeilen).
  const itemIndex = buildIndex(compendium, "item");
  const inventory: Character["inventory"] = pc.actions.map((action) => {
    const hit = matchName(itemIndex, action.name);
    if (hit && hit.rest === "") {
      return { id: idFactory(), itemId: hit.id, qty: 1, equipped: true, extraEffects: [] };
    }
    // Eigene Namen („Templer Schwert") als freie Zeile mit den Werten aus dem Export.
    const notes = [action.attack && `Angriff ${action.attack}`, action.damage && `Schaden ${action.damage}`, action.critical && `Krit. ${action.critical}`]
      .filter(Boolean)
      .join(" · ");
    return {
      id: idFactory(),
      customName: action.name,
      qty: 1,
      equipped: false,
      extraEffects: [],
      ...(notes ? { notes } : {}),
    };
  });
  for (const action of pc.actions) {
    const hit = matchName(itemIndex, action.name);
    if (!hit || hit.rest !== "") {
      issues.push({
        severity: "info",
        code: "item-unmatched",
        message: `Waffe „${action.name}" ist kein SRD-Gegenstand — als freie Inventarzeile übernommen (Werte in den Notizen).`,
      });
    }
  }

  const notesLines = [
    "Aus Fight Club importiert.",
    `Original: ${pc.raceClass}${pc.speed ? ` · ${pc.speed}` : ""}`,
    ...(unmatchedFeats.length > 0 ? [`Nicht zugeordnete Talente: ${unmatchedFeats.join(", ")}`] : []),
    ...pc.actions
      .filter((a) => a.attack || a.damage)
      .map((a) => `${a.name}: ${a.attack ?? ""} ${a.damage ?? ""}${a.critical ? ` (${a.critical})` : ""}`.trim()),
  ];

  let character = characterSchema.parse({
    id: idFactory(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    rev: 1,
    updatedAt: "",
    name: pc.name,
    raceId: raceId ?? "",
    abilities: { method: "rolled", base, levelUps: [] },
    levels,
    skillRanks,
    feats,
    inventory,
    hp: pc.hp
      ? { damage: Math.max(0, pc.hp.max - pc.hp.current), nonlethal: 0, temp: 0, overrideMax: pc.hp.max }
      : { damage: 0, nonlethal: 0, temp: 0 },
    notes: notesLines.join("\n"),
  });

  // --- Abgleich: RK und Rettungswürfe ausgleichen, alles andere berichten ---
  const sheet = deriveSheet(character, compendium, options.houseRules);
  const comparisons: ImportComparison[] = [];
  const miscModifiers: Character["miscModifiers"] = [];

  /**
   * Ausgleich für Werte, in denen typischerweise die NICHT exportierte
   * Ausrüstung steckt. Bonustyp bewusst typisiert statt „untyped":
   * - `armor` bleibt korrekt aus der Berührungs-RK heraus und wird später von
   *   echter Rüstung überdeckt statt addiert (3.5-Stacking).
   * - `resistance` wird später von einem echten Resistenz-Umhang überdeckt.
   */
  const reconcile = (
    label: string,
    imported: number | undefined,
    derived: number,
    target: "ac" | "save.fort" | "save.ref" | "save.will",
  ) => {
    if (imported === undefined) return;
    const delta = imported - derived;
    if (delta === 0) {
      comparisons.push({ label, imported, derived, status: "match" });
      return;
    }
    comparisons.push({
      label,
      imported,
      derived,
      status: "reconciled",
      hint: `Ausrüstung steckt nicht im Export — als „Sonstiges"-Modifikator eingetragen und jederzeit löschbar.`,
    });
    miscModifiers.push({
      id: idFactory(),
      target,
      bonusType: target === "ac" ? "armor" : "resistance",
      value: delta,
      note: "Fight-Club-Import (fehlende Ausrüstung)",
    });
  };

  reconcile("RK", pc.ac, sheet.ac.total.total, "ac");
  reconcile("Fortitude", pc.saves.fort, sheet.saves.fort.total, "save.fort");
  reconcile("Reflex", pc.saves.ref, sheet.saves.ref.total, "save.ref");
  reconcile("Will", pc.saves.will, sheet.saves.will.total, "save.will");

  const report = (
    label: string,
    imported: number | undefined,
    derived: number,
    opts: { always?: boolean; hint?: string } = {},
  ) => {
    if (imported === undefined) return;
    if (imported === derived) {
      if (opts.always) comparisons.push({ label, imported, derived, status: "match" });
      return;
    }
    comparisons.push({ label, imported, derived, status: "reported", hint: opts.hint });
  };

  // Aus den Klassentabellen abgeleitet — hier wäre ein Ausgleich Selbstbetrug.
  report("GAB", pc.bab, sheet.bab, { always: true });
  report("Ringkampf", pc.grapple, sheet.grapple.total, { always: true });
  report("Initiative", pc.init, sheet.init.total, {
    always: true,
    hint: `Die App zählt Talent-Boni wie „Improved Initiative" mit; Fight Club listet hier oft nur den GE-Modifikator.`,
  });
  for (const [skillId, total] of skillTotals) {
    const line = sheet.skills.find((s) => s.skillId === skillId);
    if (line) report(line.name, total, line.total.total);
  }

  if (pc.touch !== undefined || pc.flatFooted !== undefined) {
    issues.push({
      severity: "info",
      code: "ac-variants",
      message: `Berührungs-RK${pc.touch !== undefined ? ` (${pc.touch})` : ""} und RK auf dem falschen Fuß${pc.flatFooted !== undefined ? ` (${pc.flatFooted})` : ""} lassen sich nicht rekonstruieren — sie ergeben sich in der App aus der eingetragenen Ausrüstung.`,
    });
  }

  if (miscModifiers.length > 0) {
    character = { ...character, miscModifiers };
  }
  if (pc.hp) {
    issues.push({
      severity: "info",
      code: "hp-override",
      message: `TP aus dem Export übernommen (${pc.hp.current}/${pc.hp.max}) — als festes Maximum gesetzt, im Bogen änderbar.`,
    });
  }

  return { character, issues, comparisons };
}

/** Komfort: komplette Datei → Charaktere mit Bericht. */
export function importFightClubXml(
  xml: string,
  compendium: Map<string, Entity>,
  options: { idFactory: () => string; houseRules?: HouseRules },
): { results: ImportResultPc[]; issues: ImportIssue[] } {
  const { pcs, issues } = parseFightClubXml(xml);
  const results = pcs.map((pc) => mapFightClubPc(pc, compendium, options));
  return { results, issues };
}
