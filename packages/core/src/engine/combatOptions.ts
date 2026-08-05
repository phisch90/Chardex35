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
  /** BAB — die Obergrenze für Power Attack. */
  bab: number;
  /** Hat der Charakter das Talent? Ohne Talent gibt es die Option nicht. */
  hasPowerAttack: boolean;
  hasCombatExpertise: boolean;
  hasDodge: boolean;
  /**
   * `null` = in dieser Runde wird nicht mit zwei Waffen gekämpft — entweder weil
   * der Schalter aus ist oder weil gar nicht in jeder Hand eine Nahkampfwaffe
   * liegt. Was in den Händen liegt, weiß nur derive.ts; die Regel steht hier.
   */
  twoWeapon: TwoWeaponSetup | null;
  hasTwoWeaponFighting: boolean;
  hasImprovedTwoWeaponFighting: boolean;
  hasGreaterTwoWeaponFighting: boolean;
}

/**
 * Welche Hand — für den Zweiwaffen-Malus, der für beide Hände UNTERSCHIEDLICH
 * hoch ist.
 *
 * `none` deckt drei Fälle ab, die alle keinen Malus bekommen: die zwei
 * Sammelzeilen („Nahkampf", „Fernkampf", die zu keiner Waffe gehören), der
 * Rucksack, und der Altbestand `worn` aus der Zeit vor den Slot-Marken.
 */
export type Hand = "main" | "off" | "both" | "none";

/**
 * Was in dieser Runde in den Händen liegt. TATSACHEN, keine Regel — die Höhe der
 * Mali rechnet applyCombatOptions daraus aus.
 */
export interface TwoWeaponSetup {
  /**
   * Ist die Waffe in der ZWEITEN Hand leicht?
   *
   * Nur sie entscheidet, wörtlich im SRD am Talent Two-Weapon Fighting: „If your
   * off-hand weapon is light the penalties are reduced by 2 each." Über die Waffe
   * in der Haupthand sagt die Regel nichts — und beide Mali sinken, auch der der
   * Haupthand. Wer hier die Haupthand prüft, baut einen Fehler, der bei zwei
   * leichten Waffen unsichtbar bleibt.
   */
  offHandIsLight: boolean;
}

/** Kampfgeschick ist laut SRD auf 5 begrenzt, zusätzlich zum BAB. */
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
  /**
   * In welcher Hand sie steckt. VERPFLICHTEND, obwohl ein Standardwert bequemer
   * wäre: eine vergessene Angabe würde den Zweiwaffen-Malus lautlos abschalten,
   * und lautlos ist in diesem Projekt die teuerste Eigenschaft. So meldet sich
   * der Typprüfer.
   */
  hand: Hand;
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
  /**
   * Der Zweiwaffen-Malus — auf den Angriffswurf GENAU DIESER Waffe.
   *
   * Warum eine Funktion und nicht eine Liste wie `attack`/`meleeAttack`: dieser
   * Malus ist für Haupthand und zweite Hand verschieden hoch (−4 gegen −8), und
   * eine Liste kann das nicht ausdrücken. Ihn in `meleeAttack` zu legen wäre der
   * bequeme Weg und genau der schon einmal behobene Power-Attack-Fehler: dann
   * fiele auch die Sammelzeile „Nahkampf" mit, obwohl dort gar keine
   * Waffenkombination gemeint ist.
   */
  weaponAttack: (weapon: WieldContext) => Contribution[];
  /**
   * Die Angriffe der ZWEITEN Hand als Abzüge vom eigenen Angriffswert:
   * `[]` = keiner (es wird nicht mit zwei Waffen gekämpft), `[0]` = einer,
   * `[0, -5]` mit Improved, `[0, -5, -10]` mit Greater.
   *
   * Die zweite Hand bekommt NICHT die absteigende Reihe aus dem
   * BAB. Genau das tat der Bogen vorher: bei BAB +6 zeigte er der
   * zweiten Hand zwei Angriffe — zufällig das, was ein Charakter MIT Improved
   * Two-Weapon Fighting bekäme, und für alle anderen einer zu viel.
   */
  offHandSteps: number[];
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
      `Power Attack ${powerAttack} liegt über dem BAB (+${context.bab}) — nach den Regeln ist höchstens ${context.bab} erlaubt.`,
    );
  }

  const expertise = context.hasCombatExpertise ? Math.max(0, options.combatExpertise) : 0;
  if (options.combatExpertise > 0 && !context.hasCombatExpertise) {
    warnings.push("Kampfgeschick ist eingestellt, aber der Charakter hat das Talent nicht.");
  }
  const expertiseCap = Math.min(COMBAT_EXPERTISE_MAX, context.bab);
  if (expertise > expertiseCap) {
    warnings.push(
      `Kampfgeschick ${expertise} liegt über der Grenze (höchstens ${expertiseCap}: 5 und nicht mehr als der BAB).`,
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

  /*
    Dodge: +1 Ausweichen gegen EINEN Gegner, den man zu Beginn seiner Aktion
    bestimmt.

    Der Schalter ist die Bedingung, nicht das Textfeld. Vorher musste man einen
    Namen eintippen, damit der Bonus überhaupt entstand — und im Kampf tippt
    niemand. Wer den Gegner benennen will, kann; nötig ist es nicht.

    Der Bonus zählt jetzt in den TOTAL (kein `condition`). Das ist die
    Entscheidung, die dahinter steckt: wer den Schalter umlegt, sagt damit „gegen
    diesen Gegner", und dann soll die RK oben auch danach aussehen. Gegen wen es
    gilt, steht daneben — mit Namen, wenn einer eingetragen ist.
  */
  if (context.hasDodge) {
    /*
      Die Zeile steht IMMER da, wenn das Talent vorhanden ist — ausgeschaltet
      durchgestrichen. Sie ist damit der einzige Ort, an dem Dodge auftaucht: der
      Kompendium-Effekt des Talents wird in derive.ts verworfen, weil sonst zwei
      gleich beschriftete Zeilen in der Aufschlüsselung stünden.

      Ganz zu verschwinden wäre falsch. Wer die RK aufklappt und Dodge nicht
      findet, sucht den Fehler in seinem Charakter statt am Schalter.
    */
    const gegner = options.dodgeTarget.trim();
    ac.push({
      source: gegner === "" ? "Talent: Dodge" : `Talent: Dodge (${gegner})`,
      bonusType: "dodge",
      value: 1,
      applied: options.dodgeActive,
      condition: options.dodgeActive ? undefined : "Schalter im Kampf-Reiter ist aus",
    });
  } else if (options.dodgeActive) {
    warnings.push("Dodge ist eingeschaltet, aber der Charakter hat das Talent Dodge nicht.");
  }

  /*
    Zweiwaffenkampf.

    Der Schalter allein reicht nicht — es muss auch in jeder Hand eine
    Nahkampfwaffe liegen. Beides zusammen ergibt `twoWeapon`; ist der Schalter an
    und die Hände sind leer, wird gemeldet statt gerechnet. Ein Malus ohne Grund
    ist schlimmer als kein Malus: er wandert unbemerkt in die Zahl, die Philipp am
    Tisch dem Spielleiter sagt.

    Die vier Zeilen der SRD-Tabelle als EINE Formel, weil es zwei getrennte
    Ermäßigungen sind, die sich addieren:

      Grundlage                              −6 / −10
      Waffe in der zweiten Hand ist leicht   je +2   („reduced by 2 each")
      Talent Two-Weapon Fighting             +2 / +6 („lessens by 2 / by 6")

    → −6/−10 · −4/−8 · −4/−4 · −2/−2
  */
  const twoWeapon = options.twoWeaponFighting ? context.twoWeapon : null;
  if (options.twoWeaponFighting && context.twoWeapon === null) {
    warnings.push(
      "Zweiwaffenkampf ist eingeschaltet, aber es liegt nicht in jeder Hand eine Nahkampfwaffe — es gilt kein Malus.",
    );
  }
  const offHandLight = twoWeapon?.offHandIsLight === true;
  const twfFeat = context.hasTwoWeaponFighting;
  const primaryPenalty = twoWeapon === null ? 0 : -6 + (offHandLight ? 2 : 0) + (twfFeat ? 2 : 0);
  const offHandPenalty = twoWeapon === null ? 0 : -10 + (offHandLight ? 2 : 0) + (twfFeat ? 6 : 0);

  const weaponAttack: CombatOptionOutcome["weaponAttack"] = (weapon) => {
    // Fernkampf kennt keinen Zweiwaffenkampf. Doppelt geprüft (auch schon beim
    // Aufbau der Hände), weil genau dieser Fehlertyp hier schon einmal live war:
    // eine Armbrust in der Haupthand darf keinen Nahkampf-Malus abbekommen.
    if (twoWeapon === null || weapon.handedness === "ranged") return [];
    const zusatz = offHandLight ? ", leichte Waffe in der zweiten Hand" : "";
    if (weapon.hand === "main") return [mod(`Zweiwaffenkampf (Haupthand${zusatz})`, primaryPenalty)];
    if (weapon.hand === "off") return [mod(`Zweiwaffenkampf (zweite Hand${zusatz})`, offHandPenalty)];
    return [];
  };

  /*
    Wie viele Angriffe die zweite Hand hergibt. Die Talente stapeln aufeinander:
    ohne Talent einer, Two-Weapon Fighting gibt KEINEN weiteren (es senkt nur die
    Mali — steht wörtlich am Talent), Improved einen zweiten bei −5, Greater einen
    dritten bei −10.

    Ob die −5 „zusätzlich zum Zweiwaffen-Malus" oder „als absteigende Reihe"
    gemeint ist, lässt die Quelle offen — rechnerisch macht es keinen
    Unterschied: (BAB−5)+Mali ist dasselbe wie BAB+Mali−5.
  */
  const offHandSteps =
    twoWeapon === null
      ? []
      : context.hasGreaterTwoWeaponFighting
        ? [0, -5, -10]
        : context.hasImprovedTwoWeaponFighting
          ? [0, -5]
          : [0];

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

  return { attack, meleeAttack, meleeDamage, weaponAttack, offHandSteps, ac, warnings };
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
