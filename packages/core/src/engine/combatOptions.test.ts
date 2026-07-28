import { describe, expect, it } from "vitest";
import { applyCombatOptions, canAttackThisRound, type CombatOptionContext } from "./combatOptions.js";
import type { CombatOptions } from "../schema/character.js";

const options = (patch: Partial<CombatOptions> = {}): CombatOptions => ({
  powerAttack: 0,
  combatExpertise: 0,
  fightingDefensively: false,
  totalDefense: false,
  dodgeTarget: "",
  ...patch,
});

const context = (patch: Partial<CombatOptionContext> = {}): CombatOptionContext => ({
  bab: 6,
  hasPowerAttack: true,
  hasCombatExpertise: true,
  hasDodge: true,
  ...patch,
});

const sum = (list: { value: number }[]) => list.reduce((a, c) => a + c.value, 0);

describe("Power Attack", () => {
  it(`nimmt vom Angriff und gibt auf den Schaden`, () => {
    const out = applyCombatOptions(options({ powerAttack: 4 }), context());
    expect(sum(out.attack)).toBe(-4);
    expect(sum(out.meleeDamage({ handedness: "one" }))).toBe(4);
  });

  it(`zählt zweihändig DOPPELT — das ist der Grund, warum man es nicht im Kopf rechnet`, () => {
    const out = applyCombatOptions(options({ powerAttack: 5 }), context());
    expect(sum(out.meleeDamage({ handedness: "two" }))).toBe(10);
    expect(out.meleeDamage({ handedness: "two" })[0]?.source).toContain("×2");
  });

  it(`gibt mit einer LEICHTEN Waffe keinen Schaden, der Angriffsmalus bleibt aber`, () => {
    const out = applyCombatOptions(options({ powerAttack: 3 }), context());
    expect(sum(out.meleeDamage({ handedness: "light" }))).toBe(0);
    expect(sum(out.attack)).toBe(-3);
  });

  it(`wirkt nicht auf Fernkampfschaden`, () => {
    const out = applyCombatOptions(options({ powerAttack: 3 }), context());
    expect(out.meleeDamage({ handedness: "ranged" })).toEqual([]);
  });

  it(`meldet eine Höhe über dem GAB, wendet sie aber an (der DM hat Recht)`, () => {
    const out = applyCombatOptions(options({ powerAttack: 9 }), context({ bab: 6 }));
    expect(sum(out.attack)).toBe(-9);
    expect(out.warnings.join(" ")).toContain("über dem Grundangriffsbonus");
  });

  it(`tut ohne das Talent gar nichts und sagt das`, () => {
    const out = applyCombatOptions(options({ powerAttack: 4 }), context({ hasPowerAttack: false }));
    expect(out.attack).toEqual([]);
    expect(sum(out.meleeDamage({ handedness: "one" }))).toBe(0);
    expect(out.warnings.join(" ")).toContain("hat das Talent nicht");
  });
});

describe("Kampfgeschick", () => {
  it(`nimmt vom Angriff und gibt auf die RK, als Ausweichen-Bonus`, () => {
    const out = applyCombatOptions(options({ combatExpertise: 3 }), context());
    expect(sum(out.attack)).toBe(-3);
    expect(sum(out.ac)).toBe(3);
    expect(out.ac[0]?.bonusType).toBe("dodge");
  });

  it(`meldet die Grenze von 5`, () => {
    const out = applyCombatOptions(options({ combatExpertise: 7 }), context({ bab: 10 }));
    expect(out.warnings.join(" ")).toContain("höchstens 5");
  });

  it(`und dass der GAB die Grenze zusätzlich drückt`, () => {
    const out = applyCombatOptions(options({ combatExpertise: 3 }), context({ bab: 2 }));
    expect(out.warnings.join(" ")).toContain("höchstens 2");
  });
});

describe("Defensiv kämpfen und totale Verteidigung", () => {
  it(`defensiv: −4 Angriff, +2 RK`, () => {
    const out = applyCombatOptions(options({ fightingDefensively: true }), context());
    expect(sum(out.attack)).toBe(-4);
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
    expect(out.warnings.join(" ")).toContain("nicht zusätzlich");
  });
});

describe("Dodge", () => {
  it(`hängt am Ziel und bleibt situativ — deshalb mit Bedingung`, () => {
    const out = applyCombatOptions(options({ dodgeTarget: "Ogerhäuptling" }), context());
    expect(out.ac).toHaveLength(1);
    expect(out.ac[0]?.condition).toContain("Ogerhäuptling");
    expect(out.ac[0]?.bonusType).toBe("dodge");
  });

  it(`ohne Talent nur eine Meldung, kein Bonus`, () => {
    const out = applyCombatOptions(options({ dodgeTarget: "Ork" }), context({ hasDodge: false }));
    expect(out.ac).toEqual([]);
    expect(out.warnings.join(" ")).toContain("Talent Dodge nicht");
  });

  it(`leeres Ziel heißt aus`, () => {
    expect(applyCombatOptions(options({ dodgeTarget: "   " }), context()).ac).toEqual([]);
  });
});

describe("Zusammenspiel", () => {
  it(`Power Attack und Kampfgeschick summieren ihre Angriffsmali`, () => {
    const out = applyCombatOptions(
      options({ powerAttack: 2, combatExpertise: 2 }),
      context({ bab: 6 }),
    );
    expect(sum(out.attack)).toBe(-4);
    expect(sum(out.ac)).toBe(2);
    expect(sum(out.meleeDamage({ handedness: "one" }))).toBe(2);
  });

  it(`nichts eingestellt heißt: kein einziger Beitrag und keine Meldung`, () => {
    const out = applyCombatOptions(options(), context());
    expect(out.attack).toEqual([]);
    expect(out.ac).toEqual([]);
    expect(out.warnings).toEqual([]);
    expect(canAttackThisRound(options())).toBe(true);
  });
});
