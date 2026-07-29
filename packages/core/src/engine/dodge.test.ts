import { describe, expect, it } from "vitest";
import { characterSchema, houseRulesSchema, type CombatOptions } from "../schema/character.js";
import { entitySchema, resolveCompendium } from "../schema/entities.js";
import { deriveSheet } from "./index.js";

/**
 * Dodge auf dem BOGEN — nicht in der Kampfoptions-Rechnung, die steht daneben.
 *
 * Der Anlass ist echt und war in der App zu sehen: das SRD-Talent bringt einen
 * eigenen Effekt mit („+1 RK, gegen einen gewählten Gegner"), und seit der
 * Schalter denselben Bonus liefert, standen zwei gleich beschriftete Zeilen in
 * der Aufschlüsselung — eine durchgestrichen, eine gezählt. Für eine Regel gibt
 * es einen Besitzer.
 *
 * Deshalb die echten SRD-Kennungen: an ihnen hängt beides, `hasDodge` und der
 * Filter in derive.ts. Mit Platzhalter-IDs würde der Test nichts prüfen.
 */

const COMPENDIUM = resolveCompendium([
  entitySchema.parse({
    id: "srd:race:human",
    kind: "race",
    name: "Human",
    source: "srd",
    data: { size: "medium", speedFt: 30 },
  }),
  entitySchema.parse({
    id: "srd:class:fighter",
    kind: "class",
    name: "Fighter",
    source: "srd",
    data: {
      hitDie: 10,
      skillPointsPerLevel: 2,
      classSkillIds: [],
      levels: [
        {
          bab: 1,
          fort: 2,
          ref: 0,
          will: 0,
          features: [],
          template: { bab: "good", fort: "good", ref: "poor", will: "poor" },
        },
      ],
    },
  }),
  entitySchema.parse({
    id: "srd:feat:dodge",
    kind: "feat",
    name: "Dodge",
    source: "srd",
    // Wortgleich zum Pack (tools/etl/src/convert/feats.ts).
    data: {},
    effects: [
      {
        target: "ac",
        bonusType: "dodge",
        value: 1,
        condition: "gegen einen gewählten Gegner",
        activation: "passive",
      },
    ],
  }),
]);

const HOUSE = houseRulesSchema.parse({});

function sheet(combatOptions: Partial<CombatOptions>, feats: string[] = ["srd:feat:dodge"]) {
  const character = characterSchema.parse({
    id: "t",
    name: "Testfigur",
    raceId: "srd:race:human",
    abilities: { base: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } },
    levels: [{ classId: "srd:class:fighter", hpRoll: "avg" }],
    feats: feats.map((featId) => ({ featId })),
    combatOptions,
  });
  return deriveSheet(character, COMPENDIUM, HOUSE);
}

const dodgeLines = <T extends { source: string }>(lines: readonly T[]): T[] =>
  lines.filter((c) => c.source.startsWith("Talent: Dodge"));

describe("Dodge auf dem Bogen", () => {
  it(`erscheint GENAU EINMAL in der RK — nicht doppelt aus Talent und Schalter`, () => {
    const aus = sheet({ dodgeActive: false });
    expect(dodgeLines(aus.ac.total.contributions)).toHaveLength(1);
    const an = sheet({ dodgeActive: true });
    expect(dodgeLines(an.ac.total.contributions)).toHaveLength(1);
  });

  it(`zählt erst mit dem Schalter — vorher steht die Zeile durchgestrichen da`, () => {
    const aus = sheet({ dodgeActive: false });
    const an = sheet({ dodgeActive: true });
    expect(aus.ac.total.total).toBe(10);
    expect(an.ac.total.total).toBe(11);
    expect(dodgeLines(aus.ac.total.contributions)[0]?.applied).toBe(false);
    expect(dodgeLines(an.ac.total.contributions)[0]?.applied).toBe(true);
  });

  it(`nennt den Gegner, wenn einer eingetragen ist`, () => {
    const an = sheet({ dodgeActive: true, dodgeTarget: "Ogerhäuptling" });
    expect(dodgeLines(an.ac.total.contributions)[0]?.source).toBe("Talent: Dodge (Ogerhäuptling)");
  });

  it(`bleibt ohne das Talent ganz weg`, () => {
    const ohne = sheet({ dodgeActive: true }, []);
    expect(dodgeLines(ohne.ac.total.contributions)).toEqual([]);
    expect(ohne.ac.total.total).toBe(10);
  });

  it(`fällt bei „auf dem falschen Fuß" weg — Ausweichen braucht Reaktion`, () => {
    // 3.5: „Any time a creature loses its Dexterity bonus to AC … it loses its
    // dodge bonus, too." Das prüft zugleich, dass der Bonus als dodge und nicht
    // als untyped in der Liste steht.
    const an = sheet({ dodgeActive: true });
    expect(an.ac.total.total).toBe(11);
    expect(an.ac.flatFooted.total).toBe(10);
  });
});
