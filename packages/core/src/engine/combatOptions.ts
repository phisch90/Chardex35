import type { CombatOptions } from "../schema/character.js";
import type { Contribution } from "./types.js";

/**
 * Kampfoptionen: was man von Runde zu Runde WÄHLT, nicht was passiv am
 * Charakter hängt.
 *
 * Warum das nicht als Talent-Effekt geht: Power Attack und Kampfgeschick haben
 * eine wählbare HÖHE („ich nehme 4 vom Angriff"), und das Effekt-Modell kennt
 * feste Zahlen. Diese Optionen sind deshalb Zustand am Charakter — neben
 * Trefferpunkten und Zuständen, wo alles Rundenweise steht — und die Regeln
 * dazu stehen hier, an einer Stelle, statt in der Oberfläche.
 *
 * Warn statt sperren, wie überall in diesem Projekt: eine Höhe über dem
 * erlaubten Maximum wird ANGEWENDET und gemeldet. Der DM hat Recht, nicht die
 * App — aber schweigen darf sie darüber nicht.
 */

export interface CombatOptionContext {
  /** Grundangriffsbonus — die Obergrenze für Power Attack. */
  bab: number;
  /** Hat der Charakter das Talent? Ohne Talent gibt es die Option nicht. */
  hasPowerAttack: boolean;
  hasCombatExpertise: boolean;
  hasDodge: boolean;
}

/** Kampfgeschick ist laut SRD auf 5 begrenzt, zusätzlich zum GAB. */
export const COMBAT_EXPERTISE_MAX = 5;

export interface CombatOptionOutcome {
  /** Auf JEDEN Angriffswurf (immer negativ oder 0). */
  attack: Contribution[];
  /** Auf den Nahkampfschaden. `twoHanded` verdoppelt Power Attack. */
  meleeDamage: (weapon: { handedness: "light" | "one" | "two" | "ranged" }) => Contribution[];
  /** Auf die RK — immer Ausweichen-Boni, die sich also summieren. */
  ac: Contribution[];
  /** Hinweise für den Bogen (Übertretung der Obergrenzen, kein Angriff …). */
  warnings: string[];
}

export function applyCombatOptions(
  options: CombatOptions,
  context: CombatOptionContext,
): CombatOptionOutcome {
  const attack: Contribution[] = [];
  const ac: Contribution[] = [];
  const warnings: string[] = [];

  const powerAttack = context.hasPowerAttack ? Math.max(0, options.powerAttack) : 0;
  if (options.powerAttack > 0 && !context.hasPowerAttack) {
    warnings.push("Power Attack ist eingestellt, aber der Charakter hat das Talent nicht.");
  }
  if (powerAttack > context.bab) {
    warnings.push(
      `Power Attack ${powerAttack} liegt über dem Grundangriffsbonus (+${context.bab}) — nach den Regeln ist höchstens ${context.bab} erlaubt.`,
    );
  }

  const expertise = context.hasCombatExpertise ? Math.max(0, options.combatExpertise) : 0;
  if (options.combatExpertise > 0 && !context.hasCombatExpertise) {
    warnings.push("Kampfgeschick ist eingestellt, aber der Charakter hat das Talent nicht.");
  }
  const expertiseCap = Math.min(COMBAT_EXPERTISE_MAX, context.bab);
  if (expertise > expertiseCap) {
    warnings.push(
      `Kampfgeschick ${expertise} liegt über der Grenze (höchstens ${expertiseCap}: 5 und nicht mehr als der Grundangriffsbonus).`,
    );
  }

  if (powerAttack > 0) {
    attack.push(mod("Power Attack", -powerAttack));
  }
  if (expertise > 0) {
    attack.push(mod("Kampfgeschick", -expertise));
    ac.push(dodge("Kampfgeschick", expertise));
  }

  /*
    Defensiv kämpfen und totale Verteidigung schließen sich aus — beides
    gleichzeitig ist keine Regel, sondern ein Bedienfehler. Totale Verteidigung
    gewinnt, weil sie die stärkere Aussage ist („ich greife gar nicht an").
  */
  if (options.totalDefense) {
    ac.push(dodge("Totale Verteidigung", 4));
    warnings.push("Totale Verteidigung: in dieser Runde kein Angriff.");
    if (options.fightingDefensively) {
      warnings.push("Defensiv kämpfen zählt nicht zusätzlich zur totalen Verteidigung.");
    }
  } else if (options.fightingDefensively) {
    attack.push(mod("Defensiv kämpfen", -4));
    ac.push(dodge("Defensiv kämpfen", 2));
  }

  // Dodge gilt gegen EINEN Gegner — deshalb mit Bedingung, damit die
  // Aufschlüsselung es zeigt, ohne es blind mitzurechnen.
  if (options.dodgeTarget.trim() !== "") {
    if (context.hasDodge) {
      ac.push({
        source: "Talent: Dodge",
        bonusType: "dodge",
        value: 1,
        applied: true,
        condition: `nur gegen ${options.dodgeTarget.trim()}`,
      });
    } else {
      warnings.push("Ein Dodge-Ziel ist eingetragen, aber der Charakter hat das Talent Dodge nicht.");
    }
  }

  const meleeDamage: CombatOptionOutcome["meleeDamage"] = (weapon) => {
    if (powerAttack === 0 || weapon.handedness === "ranged") return [];
    /*
      SRD: mit einer zweihändig geführten Waffe zählt der Schadensbonus
      DOPPELT; mit einer leichten Waffe gibt es keinen Schadensbonus — der
      Angriffsmalus bleibt trotzdem. Genau diese Asymmetrie macht Power Attack
      aus, und sie von Hand zu rechnen ist die Fehlerquelle am Tisch.
    */
    if (weapon.handedness === "light") return [];
    const factor = weapon.handedness === "two" ? 2 : 1;
    return [
      {
        source: factor === 2 ? "Power Attack (×2 zweihändig)" : "Power Attack",
        bonusType: "untyped",
        value: powerAttack * factor,
        applied: true,
        condition: undefined,
      },
    ];
  };

  return { attack, meleeDamage, ac, warnings };
}

/** Gilt in dieser Runde überhaupt ein Angriff? */
export function canAttackThisRound(options: CombatOptions): boolean {
  return !options.totalDefense;
}

function mod(source: string, value: number): Contribution {
  return { source, bonusType: "untyped", value, applied: true, condition: undefined };
}

function dodge(source: string, value: number): Contribution {
  return { source, bonusType: "dodge", value, applied: true, condition: undefined };
}
