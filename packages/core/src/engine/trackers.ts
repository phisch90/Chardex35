import type { Ability } from "../schema/common.js";
import type { DerivedSheet } from "./types.js";

/**
 * Zähler-Vorschläge aus Klassen und Stufe.
 *
 * Die App kennt die Regeln dieser Mechaniken nicht — sie führt nur Striche mit.
 * Aber WELCHE Striche jemand braucht, steht in seinen Klassen, und die Obergrenze
 * ergibt sich meist aus Stufe und einem Attribut. Das von Hand abzutippen ist
 * genau die Arbeit, die eine App übernehmen soll.
 *
 * Bewusst nur Mechaniken mit EINDEUTIGER Formel. Alles, wo die Zahl vom Tisch
 * oder von Domänen abhängt, bleibt draußen — ein falscher Vorschlag ist
 * schlimmer als keiner.
 */
export interface TrackerSuggestion {
  /** Stabiler Schlüssel, damit ein Vorschlag nicht doppelt angeboten wird. */
  key: string;
  name: string;
  max: number;
  /** Woher die Zahl kommt — steht in der Oberfläche unter dem Vorschlag. */
  note: string;
}

const CLASS_IDS = {
  cleric: "srd:class:cleric",
  paladin: "srd:class:paladin",
  bard: "srd:class:bard",
  barbarian: "srd:class:barbarian",
  monk: "srd:class:monk",
  druid: "srd:class:druid",
  sorcerer: "srd:class:sorcerer",
} as const;

const FEAT_IDS = {
  /** Der Mönch trägt es ab Stufe 1, andere wählen es — die Zahl unterscheidet sich. */
  stunningFist: "srd:feat:stunning-fist",
} as const;

function levelOf(sheet: DerivedSheet, classId: string): number {
  return sheet.classLevels.find((c) => c.classId === classId)?.level ?? 0;
}

function abilityMod(sheet: DerivedSheet, ability: Ability): number {
  return sheet.abilities[ability]?.mod ?? 0;
}

const signed = (value: number): string => `${value >= 0 ? "+" : ""}${value}`;

export function suggestTrackers(sheet: DerivedSheet): TrackerSuggestion[] {
  const out: TrackerSuggestion[] = [];
  const cha = abilityMod(sheet, "cha");

  /**
   * Talente, die dieselbe Mechanik aufwerten, kommen aus den DATEN
   * (`extraUses` am Talent), nicht aus einer Namensliste hier — sonst zählt
   * Extra Turning mit und ein Homebrew-Talent nicht.
   */
  const push = (suggestion: TrackerSuggestion) => {
    const extra = sheet.extraUses[suggestion.key] ?? 0;
    if (extra === 0) {
      out.push(suggestion);
      return;
    }
    out.push({
      ...suggestion,
      max: Math.max(1, suggestion.max + extra),
      note: `${suggestion.note} · ${signed(extra)} aus Talenten`,
    });
  };

  // Untote vertreiben: 3 + CH-Modifikator pro Tag (Kleriker, Paladin ab Stufe 4).
  const cleric = levelOf(sheet, CLASS_IDS.cleric);
  const paladin = levelOf(sheet, CLASS_IDS.paladin);
  if (cleric > 0 || paladin >= 4) {
    push({
      key: "turn-undead",
      name: "Untote vertreiben",
      max: Math.max(1, 3 + cha),
      note: `3 + CH-Modifikator (${signed(cha)}) pro Tag`,
    });
  }

  // Böses niederstrecken: 1/Tag ab Stufe 1, +1 auf Stufe 5, 10, 15, 20.
  if (paladin >= 1) {
    const smites = 1 + Math.floor(paladin / 5);
    push({
      key: "smite-evil",
      name: "Böses niederstrecken",
      max: smites,
      note: `Paladin ${paladin}: 1 + je 5 Stufen`,
    });
  }

  // Bardenmusik: einmal pro Bardenstufe und Tag.
  const bard = levelOf(sheet, CLASS_IDS.bard);
  if (bard > 0) {
    push({
      key: "bardic-music",
      name: "Bardenmusik",
      max: bard,
      note: `einmal je Bardenstufe (${bard}) pro Tag`,
    });
  }

  // Raserei: 1/Tag, +1 auf Stufe 4, 8, 12, 16, 20.
  const barbarian = levelOf(sheet, CLASS_IDS.barbarian);
  if (barbarian > 0) {
    push({
      key: "rage",
      name: "Raserei",
      max: 1 + Math.floor(barbarian / 4),
      note: `Barbar ${barbarian}: 1 + je 4 Stufen`,
    });
  }

  /**
   * Betäubender Schlag. Der Mönch bekommt das Talent auf Stufe 1 geschenkt und
   * darf einmal je MÖNCHSSTUFE plus einmal je vier Stufen anderer Klassen. Wer
   * das Talent regulär gewählt hat, darf einmal je vier Stufen — das ist die
   * Zahl aus dem Talenttext.
   */
  const monk = levelOf(sheet, CLASS_IDS.monk);
  const hasStunningFist = sheet.featIds.includes(FEAT_IDS.stunningFist);
  if (monk > 0) {
    const other = Math.max(0, sheet.totalLevel - monk);
    push({
      key: "stunning-fist",
      name: "Betäubender Schlag",
      max: monk + Math.floor(other / 4),
      note:
        other >= 4
          ? `Mönch ${monk} + je 4 Stufen anderer Klassen (${other})`
          : `einmal je Mönchsstufe (${monk}) pro Tag`,
    });
  } else if (hasStunningFist && Math.floor(sheet.totalLevel / 4) > 0) {
    push({
      key: "stunning-fist",
      name: "Betäubender Schlag",
      max: Math.floor(sheet.totalLevel / 4),
      note: `Talent: einmal je 4 Stufen (Stufe ${sheet.totalLevel})`,
    });
  }

  // Tiergestalt: 1/Tag ab Stufe 5, mehr auf 6, 10, 14, 18.
  const druid = levelOf(sheet, CLASS_IDS.druid);
  if (druid >= 5) {
    // 5.: 1× · 6.: 2× · 7.: 3× · 10.: 4× · 14.: 5× · 18.: 6×
    const uses = druid >= 18 ? 6 : druid >= 14 ? 5 : druid >= 10 ? 4 : druid >= 7 ? 3 : druid >= 6 ? 2 : 1;
    push({
      key: "wild-shape",
      name: "Tiergestalt",
      max: uses,
      note: `Druide ${druid}: ${uses}× pro Tag`,
    });
  }

  // Klassenfähigkeiten mit „X/day“ im Namen sind aus dem Datensatz eindeutig.
  for (const feature of sheet.features) {
    const match = /(\d+)\s*\/\s*day/i.exec(feature.name);
    if (!match?.[1]) continue;
    const key = `feature:${feature.key}`;
    if (out.some((entry) => entry.key === key)) continue;
    push({
      key,
      name: feature.name,
      max: Number.parseInt(match[1], 10),
      note: `${feature.className} Stufe ${feature.level}`,
    });
  }

  return out;
}
