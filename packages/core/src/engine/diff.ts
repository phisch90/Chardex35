import type { DerivedSheet, SpellcastingBlock } from "./types.js";

/**
 * Zwei abgeleitete Bögen gegenüberstellen — „was ändert sich wirklich, wenn
 * ich diese Stufe so statt so nehme".
 *
 * Es werden AUSSCHLIESSLICH Unterschiede ausgegeben. Ein Vergleich, der auch
 * die vierzig gleich gebliebenen Fertigkeiten auflistet, beantwortet die Frage
 * nicht mehr — man sucht dann im Rauschen.
 *
 * Rein auf den abgeleiteten Werten: Namen sind darin schon aufgelöst, deshalb
 * braucht diese Funktion kein Kompendium und lässt sich ohne Browser testen.
 */
export interface SheetDiffEntry {
  label: string;
  before: string;
  after: string;
  /** Nur bei Zahlen gesetzt — erlaubt Färbung und ein „+2" in der Anzeige. */
  delta?: number;
}

export interface SheetDiffGroup {
  title: string;
  entries: SheetDiffEntry[];
}

/** Mit Vorzeichen — für Werte, die als Modifikator gelesen werden. */
function mod(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function num(value: number): string {
  return `${value}`;
}

function classText(sheet: DerivedSheet): string {
  return sheet.classLevels.map((c) => `${c.className} ${c.level}`).join(" / ");
}

/** Nimmt nur auf, was sich unterscheidet. */
function pushNumber(
  entries: SheetDiffEntry[],
  label: string,
  before: number,
  after: number,
  format: (value: number) => string = num,
): void {
  if (before === after) return;
  entries.push({ label, before: format(before), after: format(after), delta: after - before });
}

function pushText(entries: SheetDiffEntry[], label: string, before: string, after: string): void {
  if (before === after) return;
  entries.push({ label, before, after });
}

function group(title: string, entries: SheetDiffEntry[]): SheetDiffGroup[] {
  return entries.length > 0 ? [{ title, entries }] : [];
}

/** „5/4/3/—" je Zaubergrad; `used` bleibt bewusst außen vor. */
function slotText(block: SpellcastingBlock): string {
  return block.slots.map((slot) => (slot.total === null ? "—" : `${slot.total}`)).join("/");
}

function knownText(block: SpellcastingBlock): string {
  if (block.spellsKnown === undefined) return "";
  return block.spellsKnown.map((count) => (count === null ? "—" : `${count}`)).join("/");
}

export function diffSheets(before: DerivedSheet, after: DerivedSheet): SheetDiffGroup[] {
  const groups: SheetDiffGroup[] = [];

  // --- Stufe & Klassen ----------------------------------------------------
  const basics: SheetDiffEntry[] = [];
  pushNumber(basics, "Stufe", before.totalLevel, after.totalLevel);
  pushText(basics, "Klassen", classText(before), classText(after));
  pushNumber(basics, "Effektive Stufe (ECL)", before.ecl, after.ecl);
  groups.push(...group("Stufe & Klassen", basics));

  // --- Attribute ----------------------------------------------------------
  const abilityEntries: SheetDiffEntry[] = [];
  for (const key of ["str", "dex", "con", "int", "wis", "cha"] as const) {
    const b = before.abilities[key];
    const a = after.abilities[key];
    if (b.score.total === a.score.total) continue;
    abilityEntries.push({
      label: key.toUpperCase(),
      before: `${b.score.total} (${mod(b.mod)})`,
      after: `${a.score.total} (${mod(a.mod)})`,
      delta: a.score.total - b.score.total,
    });
  }
  groups.push(...group("Attribute", abilityEntries));

  // --- Trefferpunkte & Verteidigung --------------------------------------
  const defense: SheetDiffEntry[] = [];
  pushNumber(defense, "Trefferpunkte (max)", before.hp.max, after.hp.max);
  pushNumber(defense, "Rüstungsklasse", before.ac.total.total, after.ac.total.total);
  pushNumber(defense, "RK berührt", before.ac.touch.total, after.ac.touch.total);
  pushNumber(defense, "RK auf dem falschen Fuß", before.ac.flatFooted.total, after.ac.flatFooted.total);
  groups.push(...group("Trefferpunkte & Verteidigung", defense));

  // --- Rettungswürfe ------------------------------------------------------
  const saves: SheetDiffEntry[] = [];
  for (const [key, label] of [
    ["fort", "Fortitude"],
    ["ref", "Reflex"],
    ["will", "Will"],
  ] as const) {
    pushNumber(saves, label, before.saves[key].total, after.saves[key].total, mod);
  }
  groups.push(...group("Rettungswürfe", saves));

  // --- Angriff ------------------------------------------------------------
  const offense: SheetDiffEntry[] = [];
  pushNumber(offense, "BAB", before.bab, after.bab, mod);
  pushNumber(offense, "Initiative", before.init.total, after.init.total, mod);
  pushNumber(offense, "Raufen", before.grapple.total, after.grapple.total, mod);
  pushNumber(offense, "Bewegung (ft)", before.speedFt.total, after.speedFt.total);

  const beforeAttacks = new Map(before.attacks.map((line) => [line.key, line]));
  const afterAttacks = new Map(after.attacks.map((line) => [line.key, line]));
  for (const key of unionKeys(beforeAttacks, afterAttacks)) {
    const b = beforeAttacks.get(key);
    const a = afterAttacks.get(key);
    const describe = (line: typeof b) =>
      line === undefined
        ? "—"
        : `${line.bonuses.map(mod).join(" / ")} · ${line.damageText}`;
    const label = a?.label ?? b?.label ?? key;
    pushText(offense, label, describe(b), describe(a));
  }
  groups.push(...group("Angriff", offense));

  // --- Fertigkeiten -------------------------------------------------------
  const skills: SheetDiffEntry[] = [];
  const beforeSkills = new Map(before.skills.map((line) => [line.key, line]));
  const afterSkills = new Map(after.skills.map((line) => [line.key, line]));
  for (const key of unionKeys(beforeSkills, afterSkills)) {
    const b = beforeSkills.get(key);
    const a = afterSkills.get(key);
    const label = a?.name ?? b?.name ?? key;
    // Nicht nutzbare Fertigkeiten (trainedOnly ohne Ränge) als „—", sonst
    // sähe eine neu antrainierte Fertigkeit wie eine reine Wertänderung aus.
    const describe = (line: typeof b) =>
      line === undefined || !line.usable ? "—" : `${mod(line.total.total)} (${line.ranks} Rg)`;
    pushText(skills, label, describe(b), describe(a));
  }
  groups.push(...group("Fertigkeiten", skills));

  // --- Punkte -------------------------------------------------------------
  const budget: SheetDiffEntry[] = [];
  pushNumber(budget, "Fertigkeitspunkte", before.skillPoints.available, after.skillPoints.available);
  pushNumber(budget, "Talent-Slots", before.featSlots.available, after.featSlots.available);
  groups.push(...group("Punkte", budget));

  // --- Zauber -------------------------------------------------------------
  const spells: SheetDiffEntry[] = [];
  const beforeCasting = new Map(before.spellcasting.map((block) => [block.classId, block]));
  const afterCasting = new Map(after.spellcasting.map((block) => [block.classId, block]));
  for (const classId of unionKeys(beforeCasting, afterCasting)) {
    const b = beforeCasting.get(classId);
    const a = afterCasting.get(classId);
    const name = a?.className ?? b?.className ?? classId;
    pushText(spells, `${name} — Slots`, b ? slotText(b) : "—", a ? slotText(a) : "—");
    pushText(spells, `${name} — bekannte Zauber`, b ? knownText(b) : "", a ? knownText(a) : "");
    pushNumber(spells, `${name} — Zauberstufe`, b?.casterLevel.total ?? 0, a?.casterLevel.total ?? 0);
    pushNumber(spells, `${name} — SG-Basis`, b?.dcBase ?? 0, a?.dcBase ?? 0);
  }
  groups.push(...group("Zauber", spells));

  // --- Klassenfähigkeiten -------------------------------------------------
  const features: SheetDiffEntry[] = [];
  const beforeNames = new Set(before.features.map((f) => f.name));
  const afterNames = new Set(after.features.map((f) => f.name));
  for (const name of [...afterNames].filter((n) => !beforeNames.has(n)).sort()) {
    features.push({ label: name, before: "—", after: "neu" });
  }
  for (const name of [...beforeNames].filter((n) => !afterNames.has(n)).sort()) {
    features.push({ label: name, before: "vorhanden", after: "entfällt" });
  }
  groups.push(...group("Klassenfähigkeiten", features));

  // --- Hinweise -----------------------------------------------------------
  const issues: SheetDiffEntry[] = [];
  const beforeIssues = new Set(before.issues.map((i) => i.message));
  const afterIssues = new Set(after.issues.map((i) => i.message));
  for (const message of [...afterIssues].filter((m) => !beforeIssues.has(m)).sort()) {
    issues.push({ label: message, before: "—", after: "neu" });
  }
  for (const message of [...beforeIssues].filter((m) => !afterIssues.has(m)).sort()) {
    issues.push({ label: message, before: "vorhanden", after: "behoben" });
  }
  groups.push(...group("Hinweise", issues));

  return groups;
}

/** Vereinigung beider Schlüsselmengen, sortiert — gleiche Eingabe, gleiche Ausgabe. */
function unionKeys<T>(a: Map<string, T>, b: Map<string, T>): string[] {
  return [...new Set([...a.keys(), ...b.keys()])].sort();
}

/** Gesamtzahl der Unterschiede — für „12 Änderungen" in der Überschrift. */
export function countDiffEntries(groups: SheetDiffGroup[]): number {
  return groups.reduce((sum, g) => sum + g.entries.length, 0);
}
