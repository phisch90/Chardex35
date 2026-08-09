import type { Character } from "../schema/character.js";
import type { DerivedSheet, SpellcastingBlock } from "./types.js";

/**
 * Zaubern über eine Spellcraft-Probe — Martins Hausregel, von seinem Blatt
 * („Spellcasting by Spellcraft (HB)"):
 *
 * Statt einen Platz zu verbrauchen, darf ein Zauberwirker eine Spellcraft-Probe
 * ablegen. Der DC ist 12 + Zaubergrad — und die 12 ist eine GRUNDLAGE, die mit
 * jeder Nutzung um den Grad des gewirkten Zaubers steigt („Ermüdung"), bis eine
 * lange Rast sie auf 12 zurücksetzt. Philipps Klärung dazu, wörtlich: „Ermüdung
 * bei jeder Nutzung" — nicht nur beim Fehlschlag; dort kommt nur der
 * Gelegenheitsangriff dazu.
 *
 * - Geschafft: der Zauber wirkt, als wäre ein Platz benutzt worden.
 * - Daneben: nichts passiert, im Kampf provoziert der Versuch einen
 *   Gelegenheitsangriff.
 * - Kritisch (hohe natürliche Würfe): eines von dreien nach Wahl — kein
 *   Rettungswurf, doppelte Wirkungswürfel, oder im Kampf kein
 *   Gelegenheitsangriff für den Gegner.
 * - Patzer (natürliche 1): wie daneben, und die Magie schlägt zurück —
 *   1 Schaden je Zaubergrad an den Wirker.
 *
 * Die Crit-Reichweite je Grad wächst um die BONUS-Plätze dieses Grads (das
 * Beispiel vom Blatt: 2 Bonus-Grad-1-Plätze → 18–20). Grad-0-Zauber zählen als
 * Grad 1 (Ermüdung und Patzer-Schaden), ihre Crit-Reichweite ist dafür um 1
 * weiter (Grundlage 19–20).
 *
 * Die ERMÜDUNG ist eine Eingabe und Spielzustand — sie entsteht am Tisch wie
 * verbrauchte Plätze, gehört also dem Spieler (`group/orders.ts`) und setzt sich
 * bei der langen Rast zurück (`rest.ts`). Gespeichert wird die SUMME der
 * gewirkten Grade, nicht der DC: die 12 ist eine Regel und kein Zustand, und ein
 * gespeicherter DC wäre ein abgeleiteter Wert im Speicher — die erste
 * Fehlerfamilie dieses Projekts.
 */

/**
 * Der Leser fürs optionale Feld. KEIN `.default(0)` im Schema: ein Default macht
 * das Feld im Ausgabe-Typ Pflicht, und dann muss jede Stelle, die einen
 * Charakter als Literal baut, es mitschreiben — genau daraus entstand einmal
 * „fehlende Schema-Standardwerte, weil Parser Literale bauten".
 */
export function spellcraftExhaustionOf(character: Character): number {
  return character.spellcraftExhaustion ?? 0;
}

/** Grad-0-Zauber zählen in dieser Regel als Grad 1 — wörtlich vom Blatt. */
export function effectiveSpellLevel(level: number): number {
  return Math.max(1, level);
}

export interface SpellcraftCastPlan {
  /** Der Grad, wie er am Bogen steht (0 bleibt 0 — nur die Rechnung hebt an). */
  level: number;
  /** Grad 0 rechnet als 1. */
  effectiveLevel: number;
  /** 12 + Ermüdung + Grad. */
  dc: number;
  /** Die Ermüdung VOR diesem Versuch — als Zahl für die Ansage. */
  exhaustion: number;
  /** …und danach: jede Nutzung erhöht um den (effektiven) Grad. */
  exhaustionAfter: number;
  /**
   * Der Spellcraft-Gesamtwert des Bogens, oder `null`, wenn die Fertigkeit ohne
   * Ränge unbrauchbar ist (Spellcraft ist im Regelwerk nur geübt nutzbar).
   * Gewarnt, nicht gesperrt — der DM hat Recht, nicht die App.
   */
  checkBonus: number | null;
  /** „1d20+9" — oder null ohne brauchbare Fertigkeit (kein toter Würfelknopf). */
  roll: string | null;
  /** Ab welchem natürlichen Wurf es kritisch ist (20 − Bonusplätze − Grad-0-Bonus). */
  critFrom: number;
  /** Patzer: 1 Schaden je effektivem Grad, zurück an den Wirker. */
  critFailDamage: number;
}

/**
 * Was ein Versuch auf diesem Grad kostet und braucht — rein, ohne zu schreiben.
 * Dieselbe Trennung wie `planRest`/`applyRest`: was die Anzeige nennt, ist
 * dieselbe Rechnung, die hinterher gebucht wird.
 */
export function spellcraftCastPlan(
  character: Character,
  sheet: DerivedSheet,
  block: SpellcastingBlock,
  level: number,
): SpellcraftCastPlan {
  const effectiveLevel = effectiveSpellLevel(level);
  const exhaustion = spellcraftExhaustionOf(character);
  const dc = 12 + exhaustion + effectiveLevel;

  /*
    Die Bonus-Plätze des EFFEKTIVEN Grads: Grad 0 zählt als Grad 1, also weitet
    ihn auch der Grad-1-Bonus — konsequent mit „they are considered level-1
    spells". Dazu der eigene +1 vom Blatt („base crit-range of 19-20").
  */
  const slot = block.slots.find((s) => s.level === effectiveLevel);
  const critFrom = 20 - (slot?.bonus ?? 0) - (level === 0 ? 1 : 0);

  /*
    Spellcraft ist nur geübt nutzbar (`usable` rechnet das schon). Ohne brauchbare
    Fertigkeit gibt es keinen Würfelausdruck — aus einem `null` hier wird in der
    Anzeige eine Warnung statt eines Knopfs, der wortlos nichts tut.
  */
  const line = sheet.skills.find((s) => s.skillId === "srd:skill:spellcraft");
  const checkBonus = line !== undefined && line.usable ? line.total.total : null;

  return {
    level,
    effectiveLevel,
    dc,
    exhaustion,
    exhaustionAfter: exhaustion + effectiveLevel,
    checkBonus,
    roll: checkBonus === null ? null : `1d20${checkBonus >= 0 ? "+" : ""}${checkBonus}`,
    critFrom,
    critFailDamage: effectiveLevel,
  };
}

/**
 * Bucht GENAU den Plan — nie eine neue Rechnung. Zwischen Lesen und Tippen kann
 * ein Abgleich dazwischenkommen; passiert dann etwas anderes als angesagt, ist
 * die Ansage wertlos.
 */
export function applySpellcraftCast(character: Character, plan: SpellcraftCastPlan): void {
  character.spellcraftExhaustion = plan.exhaustionAfter;
}
