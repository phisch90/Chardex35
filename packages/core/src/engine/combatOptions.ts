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

/**
 * Wie eine Waffe in dieser Runde geführt wird — das entscheidet über den
 * Schadensbonus von Power Attack.
 *
 * `wieldedInTwoHands` ist nicht dasselbe wie „die Waffe IST zweihändig": ein
 * Langschwert (`one`) in beiden Händen zählt für Power Attack doppelt, und genau
 * das war vorher nicht ausdrückbar. Die Angabe kommt aus dem Ausrüstungs-Slot,
 * nicht aus den Waffendaten.
 */
export interface WieldContext {
  handedness: "light" | "one" | "two" | "ranged";
  /**
   * Unbewaffneter Schlag oder natürliche Waffe? Das ist die einzige Ausnahme von
   * „leichte Waffe bekommt keinen Power-Attack-Schaden".
   *
   * Bewusst ein Ja/Nein und nicht die Waffenart: `weapon.category` ist in den
   * Packs die Vertrautheits-Klasse (simple/martial/exotic) und sagt darüber
   * nichts. Wer das daraus ableiten wollte, bekäme für jeden Dolch dasselbe
   * Ergebnis wie für einen Faustschlag.
   */
  naturalOrUnarmed?: boolean;
  /** Wird sie in dieser Runde mit beiden Händen geführt? */
  wieldedInTwoHands?: boolean;
}

export interface CombatOptionOutcome {
  /**
   * Auf JEDEN Angriffswurf, egal ob Nah- oder Fernkampf (immer ≤ 0).
   * Hier steht nur, was laut Regeln wirklich für alles gilt — defensiv kämpfen
   * und totale Verteidigung.
   */
  attack: Contribution[];
  /**
   * NUR auf Nahkampf-Angriffswürfe.
   *
   * Diese Trennung ist der Kern eines behobenen Regelfehlers: vorher gab es nur
   * `attack`, und der Abzug von Power Attack landete damit auch auf dem Bogen
   * beim Langbogen — aus +8/+3 wurde +4/−1. Im SRD steht ausdrücklich „subtract a
   * number from all MELEE attack rolls"; dasselbe gilt für Kampfgeschick („when
   * you use the attack action … in melee").
   */
  meleeAttack: Contribution[];
  /** Auf den Nahkampfschaden. Zweihändige Führung verdoppelt Power Attack. */
  meleeDamage: (weapon: WieldContext) => Contribution[];
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
  const meleeAttack: Contribution[] = [];
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

  // Power Attack gilt NUR im Nahkampf (siehe meleeAttack).
  if (powerAttack > 0) {
    meleeAttack.push(mod("Power Attack", -powerAttack));
  }

  /*
    Drei Wege, Angriff gegen RK zu tauschen — und alle drei schließen sich
    gegenseitig aus:

      totale Verteidigung  > Kampfgeschick > defensiv kämpfen

    Dass Kampfgeschick das defensive Kämpfen ERSETZT und nicht dazukommt, steht
    im SRD im „Normal"-Absatz des Talents: „A character without the Combat
    Expertise feat can fight defensively … to take a −4 penalty on attack rolls
    and gain a +2 dodge bonus." Vorher addierte sich beides zu −7 Angriff und
    +5 RK — ein Wert, den es in 3.5 nicht gibt.

    Gesperrt wird nichts: die stärkere Option gewinnt und der Rest wird gemeldet.
  */
  if (options.totalDefense) {
    ac.push(dodge("Totale Verteidigung", 4));
    warnings.push("Totale Verteidigung: in dieser Runde kein Angriff.");
    if (options.fightingDefensively || expertise > 0) {
      warnings.push("Neben der totalen Verteidigung zählt kein weiterer Angriff-gegen-RK-Tausch.");
    }
  } else if (expertise > 0) {
    // Nur im Nahkampf — „when you use the attack action … in melee".
    meleeAttack.push(mod("Kampfgeschick", -expertise));
    ac.push(dodge("Kampfgeschick", expertise));
    if (options.fightingDefensively) {
      warnings.push(
        "Kampfgeschick ERSETZT das defensive Kämpfen (−4/+2) und wird nicht zusätzlich gerechnet.",
      );
    }
  } else if (options.fightingDefensively) {
    // Das gilt laut SRD für ALLE Angriffe der Runde, nicht nur im Nahkampf.
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
      SRD, wörtlich: „If you attack with a two-handed weapon, or with a
      one-handed weapon wielded in two hands, instead add twice the number
      subtracted from your attack rolls. You can't add the bonus from Power
      Attack to the damage dealt with a light weapon (except with unarmed strikes
      or natural weapon attacks)."

      Daraus drei Fälle, und alle drei waren vorher falsch oder nicht
      ausdrückbar:

       1. zweihändig GEFÜHRT zählt doppelt — nicht nur „die Waffe ist
          zweihändig". Ein Langschwert in beiden Händen ist der häufigste Fall am
          Tisch und ergab vorher +4 statt +8.
       2. leichte Waffe: kein Schadensbonus, der Angriffsmalus bleibt.
       3. AUSNAHME zu 2: unbewaffnet und natürliche Waffen bekommen den Bonus,
          obwohl sie als „light" geführt sind. Ohne diese Ausnahme kassiert ein
          waffenloser Mönch den Malus und bekommt nichts dafür.
    */
    if (weapon.handedness === "light" && weapon.naturalOrUnarmed !== true) return [];
    const twoHanded = weapon.handedness === "two" || weapon.wieldedInTwoHands === true;
    const factor = twoHanded ? 2 : 1;
    return [
      {
        source: factor === 2 ? "Power Attack (×2 zweihändig geführt)" : "Power Attack",
        bonusType: "untyped",
        value: powerAttack * factor,
        applied: true,
        condition: undefined,
      },
    ];
  };

  return { attack, meleeAttack, meleeDamage, ac, warnings };
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
