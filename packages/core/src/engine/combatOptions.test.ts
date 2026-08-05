import { describe, expect, it } from "vitest";
import { applyCombatOptions, canAttackThisRound, type CombatOptionContext } from "./combatOptions.js";
import type { CombatOptions } from "../schema/character.js";

const options = (patch: Partial<CombatOptions> = {}): CombatOptions => ({
  powerAttack: 0,
  combatExpertise: 0,
  fightingDefensively: false,
  totalDefense: false,
  dodgeActive: false,
  dodgeTarget: "",
  twoWeaponFighting: false,
  ...patch,
});

const context = (patch: Partial<CombatOptionContext> = {}): CombatOptionContext => ({
  bab: 6,
  hasPowerAttack: true,
  hasCombatExpertise: true,
  hasDodge: true,
  twoWeapon: null,
  hasTwoWeaponFighting: false,
  hasImprovedTwoWeaponFighting: false,
  hasGreaterTwoWeaponFighting: false,
  ...patch,
});

/**
 * Was am Ende auf dem Bogen landet — also nur ANGEWENDETE Beiträge.
 *
 * Der Unterschied ist seit dem Dodge-Schalter kein Detail mehr: die Dodge-Zeile
 * steht immer in der Liste, ausgeschaltet aber durchgestrichen. Wer hier alle
 * Werte addiert, prüft die Anzeige und nicht die Rechnung.
 */
const sum = (list: { value: number; applied: boolean }[]) =>
  list.filter((c) => c.applied).reduce((a, c) => a + c.value, 0);

describe("Power Attack", () => {
  it(`nimmt vom NAHKAMPF-Angriff und gibt auf den Schaden`, () => {
    const out = applyCombatOptions(options({ powerAttack: 4 }), context());
    expect(sum(out.meleeAttack)).toBe(-4);
    expect(sum(out.meleeDamage({ handedness: "one", hand: "main" }))).toBe(4);
  });

  it(`lässt Fernkampfangriffe in Ruhe — das ist der Fehler, der auf dem Bogen stand`, () => {
    /*
      Im SRD steht „subtract a number from all MELEE attack rolls". Vorher gab es
      nur eine Liste für alle Angriffe, und damit fiel der Langbogen von +8/+3
      auf +4/−1, sobald Power Attack eingestellt war.
    */
    const out = applyCombatOptions(options({ powerAttack: 4 }), context());
    expect(out.attack).toEqual([]);
  });

  it(`zählt zweihändig DOPPELT — das ist der Grund, warum man es nicht im Kopf rechnet`, () => {
    const out = applyCombatOptions(options({ powerAttack: 5 }), context());
    expect(sum(out.meleeDamage({ handedness: "two", hand: "main" }))).toBe(10);
    expect(out.meleeDamage({ handedness: "two", hand: "main" })[0]?.source).toContain("×2");
  });

  it(`gibt mit einer LEICHTEN Waffe keinen Schaden, der Angriffsmalus bleibt aber`, () => {
    const out = applyCombatOptions(options({ powerAttack: 3 }), context());
    expect(sum(out.meleeDamage({ handedness: "light", hand: "main" }))).toBe(0);
    expect(sum(out.meleeAttack)).toBe(-3);
  });

  it(`macht für unbewaffnet und natürliche Waffen die SRD-Ausnahme`, () => {
    // „except with unarmed strikes or natural weapon attacks" — sonst kassiert
    // ein waffenloser Mönch den Malus und bekommt nichts dafür.
    const out = applyCombatOptions(options({ powerAttack: 3 }), context());
    expect(sum(out.meleeDamage({ handedness: "light", naturalOrUnarmed: true, hand: "main" }))).toBe(3);
  });

  it(`zählt eine EINHÄNDIGE Waffe doppelt, wenn sie beidhändig geführt wird`, () => {
    // Langschwert in beiden Händen: der häufigste Fall am Tisch, und vorher gab
    // es dafür +4 statt +8.
    const out = applyCombatOptions(options({ powerAttack: 4 }), context());
    expect(sum(out.meleeDamage({ handedness: "one", wieldedInTwoHands: true, hand: "main" }))).toBe(8);
    expect(sum(out.meleeDamage({ handedness: "one", hand: "main" }))).toBe(4);
  });

  it(`wirkt nicht auf Fernkampfschaden`, () => {
    const out = applyCombatOptions(options({ powerAttack: 3 }), context());
    expect(out.meleeDamage({ handedness: "ranged", hand: "main" })).toEqual([]);
  });

  it(`meldet eine Höhe über dem BAB, wendet sie aber an (der DM hat Recht)`, () => {
    const out = applyCombatOptions(options({ powerAttack: 9 }), context({ bab: 6 }));
    expect(sum(out.meleeAttack)).toBe(-9);
    expect(out.warnings.join(" ")).toContain("über dem BAB");
  });

  it(`tut ohne das Talent gar nichts und sagt das`, () => {
    const out = applyCombatOptions(options({ powerAttack: 4 }), context({ hasPowerAttack: false }));
    expect(out.attack).toEqual([]);
    expect(out.meleeAttack).toEqual([]);
    expect(sum(out.meleeDamage({ handedness: "one", hand: "main" }))).toBe(0);
    expect(out.warnings.join(" ")).toContain("hat das Talent nicht");
  });
});

describe("Kampfgeschick", () => {
  it(`nimmt vom NAHKAMPF-Angriff und gibt auf die RK, als Ausweichen-Bonus`, () => {
    const out = applyCombatOptions(options({ combatExpertise: 3 }), context());
    expect(sum(out.meleeAttack)).toBe(-3);
    expect(sum(out.ac)).toBe(3);
    expect(out.ac[0]?.bonusType).toBe("dodge");
    // „when you use the attack action … in melee" — der Bogen bleibt unberührt.
    expect(out.attack).toEqual([]);
  });

  it(`ERSETZT das defensive Kämpfen, statt sich dazuzuaddieren`, () => {
    /*
      Der „Normal"-Absatz des Talents sagt, was ein Charakter OHNE Kampfgeschick
      kann: defensiv kämpfen für −4/+2. Es ist also die Alternative, nicht ein
      Zusatz. Vorher kamen −7 Angriff und +5 RK heraus.
    */
    const out = applyCombatOptions(
      options({ combatExpertise: 3, fightingDefensively: true }),
      context(),
    );
    expect(sum(out.meleeAttack)).toBe(-3);
    expect(sum(out.attack)).toBe(0);
    expect(sum(out.ac)).toBe(3);
    expect(out.warnings.join(" ")).toContain("ERSETZT");
  });

  it(`meldet die Grenze von 5`, () => {
    const out = applyCombatOptions(options({ combatExpertise: 7 }), context({ bab: 10 }));
    expect(out.warnings.join(" ")).toContain("höchstens 5");
  });

  it(`und dass der BAB die Grenze zusätzlich drückt`, () => {
    const out = applyCombatOptions(options({ combatExpertise: 3 }), context({ bab: 2 }));
    expect(out.warnings.join(" ")).toContain("höchstens 2");
  });
});

describe("Defensiv kämpfen und totale Verteidigung", () => {
  it(`defensiv: −4 auf ALLE Angriffe, +2 RK`, () => {
    // Hier steht im SRD wirklich „all attacks", also auch Fernkampf.
    const out = applyCombatOptions(options({ fightingDefensively: true }), context());
    expect(sum(out.attack)).toBe(-4);
    expect(sum(out.meleeAttack)).toBe(0);
    expect(sum(out.ac)).toBe(2);
  });

  it(`totale Verteidigung: +4 RK und kein Angriff`, () => {
    const out = applyCombatOptions(options({ totalDefense: true }), context());
    expect(sum(out.ac)).toBe(4);
    expect(out.attack).toEqual([]);
    expect(out.warnings.join(" ")).toContain("kein Angriff");
    expect(canAttackThisRound(options({ totalDefense: true }))).toBe(false);
  });

  it(`schließen sich aus: beides gleichzeitig zählt nicht doppelt`, () => {
    const out = applyCombatOptions(
      options({ totalDefense: true, fightingDefensively: true }),
      context(),
    );
    expect(sum(out.ac)).toBe(4); // nicht 6
    expect(sum(out.attack)).toBe(0);
    expect(out.warnings.join(" ")).toContain("kein weiterer Angriff-gegen-RK-Tausch");
  });
});

describe("Dodge", () => {
  it(`ist ein SCHALTER und zählt in den Total`, () => {
    /*
      Vorher hing der Bonus daran, ob ein Gegnername eingetippt war — und er trug
      eine `condition`, zählte also nicht mit. Am Tisch tippt im Kampf niemand
      einen Namen, und ein Bonus, der nur durchgestrichen dasteht, hilft nicht.
    */
    const out = applyCombatOptions(options({ dodgeActive: true }), context());
    expect(out.ac).toHaveLength(1);
    expect(out.ac[0]?.value).toBe(1);
    expect(out.ac[0]?.bonusType).toBe("dodge");
    expect(out.ac[0]?.applied).toBe(true);
    expect(out.ac[0]?.condition).toBeUndefined();
  });

  it(`nimmt den Gegnernamen mit, wenn einer da ist — nötig ist er nicht`, () => {
    const mitName = applyCombatOptions(
      options({ dodgeActive: true, dodgeTarget: "Ogerhäuptling" }),
      context(),
    );
    expect(mitName.ac[0]?.source).toContain("Ogerhäuptling");
    const ohneName = applyCombatOptions(options({ dodgeActive: true }), context());
    expect(ohneName.ac[0]?.source).toBe("Talent: Dodge");
  });

  it(`ohne Talent nur eine Meldung, kein Bonus`, () => {
    const out = applyCombatOptions(options({ dodgeActive: true }), context({ hasDodge: false }));
    expect(out.ac).toEqual([]);
    expect(out.warnings.join(" ")).toContain("Talent Dodge nicht");
  });

  it(`ein Name allein schaltet NICHTS ein`, () => {
    const out = applyCombatOptions(options({ dodgeTarget: "Ork" }), context());
    expect(sum(out.ac)).toBe(0);
  });

  it(`steht auch ausgeschaltet in der Liste — durchgestrichen, nicht verschwunden`, () => {
    /*
      Wer die RK aufklappt und Dodge gar nicht findet, sucht den Fehler im
      Charakter statt am Schalter. Die Zeile nennt deshalb den Grund.
    */
    const out = applyCombatOptions(options(), context());
    expect(out.ac).toHaveLength(1);
    expect(out.ac[0]?.applied).toBe(false);
    expect(out.ac[0]?.condition).toContain("Schalter");
  });
});

describe("Zusammenspiel", () => {
  it(`Power Attack und Kampfgeschick summieren ihre Nahkampf-Mali`, () => {
    const out = applyCombatOptions(
      options({ powerAttack: 2, combatExpertise: 2 }),
      context({ bab: 6 }),
    );
    expect(sum(out.meleeAttack)).toBe(-4);
    expect(sum(out.ac)).toBe(2);
    expect(sum(out.meleeDamage({ handedness: "one", hand: "main" }))).toBe(2);
    expect(out.attack).toEqual([]);
  });

  it(`totale Verteidigung schluckt auch das Kampfgeschick`, () => {
    const out = applyCombatOptions(options({ totalDefense: true, combatExpertise: 4 }), context());
    expect(sum(out.ac)).toBe(4); // nicht 8
    expect(out.meleeAttack).toEqual([]);
  });

  it(`nichts eingestellt heißt: kein einziger Beitrag und keine Meldung`, () => {
    // Ohne Dodge-Talent ist die Liste wirklich leer — mit Talent steht dort die
    // ausgeschaltete Zeile, siehe den Dodge-Block.
    const out = applyCombatOptions(options(), context({ hasDodge: false }));
    expect(out.attack).toEqual([]);
    expect(out.meleeAttack).toEqual([]);
    expect(out.ac).toEqual([]);
    expect(out.warnings).toEqual([]);
    expect(canAttackThisRound(options())).toBe(true);
  });
});
