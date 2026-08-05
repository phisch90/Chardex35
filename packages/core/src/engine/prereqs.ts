import type { Ability } from "../schema/common.js";
import type { Entity, Prerequisite } from "../schema/entities.js";
import { displayName } from "../schema/entities.js";
import type { DerivedSheet } from "./types.js";

/**
 * Erfüllt ein Charakter die Voraussetzungen eines Talents?
 *
 * Der Anlass, wörtlich: „Es muss klar sein, welche Vorraussetzungen die Talente
 * haben. Dann sollte es auch verhindert werden, dass ich ein Talent wählen kann für
 * das ich die Mindestanforderungen nicht erfülle."
 *
 * Diese Prüfung gab es schon — als eingemauerte Hilfsfunktion in `validate.ts`, die
 * nur über Talente lief, die der Charakter BEREITS hat. Für die Auswahl brauchte sie
 * jemand von außen, und zwei Fassungen derselben Regel wären die schlimmste Antwort:
 * dann sperrt die Auswahl anders, als der Bogen hinterher warnt. Also EINE Funktion,
 * die beide benutzen.
 *
 * Zwei Entscheidungen stecken darin:
 *
 * **Nicht Prüfbares sperrt nicht.** 163 der Voraussetzungen in den SRD-Daten sind
 * Freitext (`custom`) — „ability to cast spells of the chosen school", „proficiency
 * with the weapon". Die App kann das nicht entscheiden, und eine geratene Regel ist
 * schlimmer als eine fehlende. Sie stehen als Zeile da und sind als ungeprüft
 * gekennzeichnet; gesperrt wird nur, was WIRKLICH geprüft wurde.
 *
 * **Beschriftungen tragen Namen, keine Kennungen.** Vorher stand in der Warnung
 * „Talent srd:feat:power-attack" und „3 Ränge in srd:skill:hide". Am Tisch liest das
 * niemand. Der Preis ist das Kompendium als Parameter — dafür stimmt es überall.
 */

/** Englische Regelkürzel wie in seinen Büchern — nicht „GE", das muss man übersetzen. */
const ABILITY_LABEL: Record<Ability, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

export interface PrereqLine {
  prerequisite: Prerequisite;
  /**
   * Erfüllt? Bei `custom` immer `true` — was die App nicht prüfen kann, hält sie
   * nicht für verletzt.
   */
  met: boolean;
  /** Konnte die App das überhaupt prüfen? Bei `custom` nein. */
  checkable: boolean;
  /** „STR 13", „BAB +6", „Talent Power Attack", „5 Ränge in Hide". */
  label: string;
}

export interface FeatEligibility {
  lines: PrereqLine[];
  /**
   * Ist alles Prüfbare erfüllt? Nur das entscheidet über die Sperre in der Auswahl.
   */
  eligible: boolean;
  /** Was fehlt — kurz, für die Marke an der Zeile und die Rückfrage. */
  missing: string[];
  /** Was nicht geprüft werden konnte — steht dran, sperrt nicht. */
  unverifiable: string[];
}

/**
 * Wie viele Ränge zählen für eine Voraussetzung?
 *
 * Voraussetzungen nennen die GRUNDfertigkeit („8 Ränge Knowledge (arcana)" steht als
 * `srd:skill:knowledge` in den Daten). Es zählt das beste Teilgebiet — sonst erfüllt
 * niemand mit Teilgebieten je eine Voraussetzung.
 */
function bestRanks(sheet: DerivedSheet, skillId: string): number {
  let best = 0;
  for (const skill of sheet.skills) {
    if (skill.skillId === skillId) best = Math.max(best, skill.ranks);
  }
  return best;
}

function nameOf(compendium: ReadonlyMap<string, Entity> | undefined, id: string): string {
  const entity = compendium?.get(id);
  return entity ? displayName(entity) : id;
}

/**
 * Eine einzelne Voraussetzung gegen den abgeleiteten Bogen prüfen.
 *
 * Der Bogen genügt: Attribute, BAB, Talente, Ränge, Zauberstufe und Klassenstufen
 * stehen alle darin. Deshalb kann die Oberfläche dieselbe Funktion rufen wie die
 * Engine — sie hat den Bogen ohnehin.
 */
export function checkPrerequisite(
  prerequisite: Prerequisite,
  sheet: DerivedSheet,
  compendium?: ReadonlyMap<string, Entity>,
): PrereqLine {
  const p = prerequisite;
  switch (p.type) {
    case "minAbility":
      return {
        prerequisite: p,
        checkable: true,
        met: sheet.abilities[p.ability].score.total >= p.value,
        label: `${ABILITY_LABEL[p.ability]} ${p.value}`,
      };
    case "minBab":
      return {
        prerequisite: p,
        checkable: true,
        met: sheet.bab >= p.value,
        label: `BAB +${p.value}`,
      };
    case "hasFeat":
      return {
        prerequisite: p,
        checkable: true,
        met: sheet.featIds.includes(p.featId),
        label: `Talent ${nameOf(compendium, p.featId)}`,
      };
    case "minSkillRanks":
      return {
        prerequisite: p,
        checkable: true,
        met: bestRanks(sheet, p.skillId) >= p.ranks,
        // „1 Ränge in Ride" stand vorher da — es gibt Talente mit genau einem Rang.
        label: `${p.ranks} ${p.ranks === 1 ? "Rang" : "Ränge"} in ${nameOf(compendium, p.skillId)}`,
      };
    case "minCasterLevel": {
      const best = Math.max(0, ...sheet.spellcasting.map((s) => s.casterLevel.total));
      return {
        prerequisite: p,
        checkable: true,
        met: best >= p.value,
        label: `Zauberstufe ${p.value}`,
      };
    }
    case "classLevel": {
      const level = sheet.classLevels.find((c) => c.classId === p.classId)?.level ?? 0;
      return {
        prerequisite: p,
        checkable: true,
        met: level >= p.level,
        label: `${nameOf(compendium, p.classId)} Stufe ${p.level}`,
      };
    }
    case "custom":
      // Nur Anzeige. `met: true`, damit nichts gesperrt wird, was die App nicht
      // beurteilen kann — `checkable: false` sagt der Oberfläche, dass sie es
      // trotzdem hinschreiben soll.
      return { prerequisite: p, checkable: false, met: true, label: p.text };
  }
}

/**
 * Alle Voraussetzungen eines Talents auf einmal.
 *
 * `feat` darf auch ein Talent sein, das gar nicht im Kompendium steht (dann kommt
 * eine leere, erfüllte Auskunft) — die Oberfläche soll nicht abstürzen, wenn ein Bogen
 * vom iPad ein Talent trägt, dessen Pack hier fehlt.
 */
export function featEligibility(
  feat: Entity | undefined,
  sheet: DerivedSheet,
  compendium?: ReadonlyMap<string, Entity>,
): FeatEligibility {
  const prerequisites =
    feat !== undefined && feat.kind === "feat" ? feat.data.prerequisites : [];
  const lines = prerequisites.map((p) => checkPrerequisite(p, sheet, compendium));
  return {
    lines,
    eligible: lines.every((line) => !line.checkable || line.met),
    missing: lines.filter((line) => line.checkable && !line.met).map((line) => line.label),
    unverifiable: lines.filter((line) => !line.checkable).map((line) => line.label),
  };
}
