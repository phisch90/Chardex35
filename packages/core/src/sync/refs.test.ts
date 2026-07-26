import { describe, expect, it } from "vitest";
import { characterSchema } from "../schema/character.js";
import { entitySchema, type Entity } from "../schema/entities.js";
import { collectHomebrewClosure } from "./refs.js";

const E = (raw: Record<string, unknown>): Entity =>
  entitySchema.parse({ kind: "feat", source: "homebrew", data: {}, ...raw });

/** Minimal gültige Klassendaten — der Test prüft Verweise, nicht die Tabelle. */
const CLASS_DATA = {
  hitDie: 10,
  skillPointsPerLevel: 2,
  levels: [{ bab: 1, fort: 2, ref: 0, will: 0 }],
};

const character = characterSchema.parse({
  id: "char-1",
  name: "Hike",
  abilities: { base: { str: 14, dex: 12, con: 13, int: 10, wis: 15, cha: 8 } },
  raceId: "hb:race:halbtempler",
  levels: [{ classId: "srd:class:fighter", hpRoll: "avg" }],
  skillRanks: { "hb:skill:tempelwissen#orden": 4 },
  feats: [{ featId: "hb:feat:tempelschlag", choiceRef: "hb:item:templer-schwert" }],
  inventory: [{ id: "inv-1", itemId: "hb:item:templer-schwert" }],
  spellState: { "srd:class:cleric": { known: ["hb:spell:tempelsegen"] } },
  conditionIds: [],
  toggledEffectKeys: ["hb:feat:tempelschlag#0"],
});

describe("collectHomebrewClosure", () => {
  it(`findet Verweise aus allen Ecken des Bogens — auch aus Schlüsseln`, () => {
    const pool = [
      E({ id: "hb:race:halbtempler", kind: "race", name: "Halbtempler", data: { speedFt: 30, size: "medium" } }),
      E({ id: "hb:skill:tempelwissen", kind: "skill", name: "Tempelwissen", data: { keyAbility: "int" } }),
      E({ id: "hb:feat:tempelschlag", name: "Tempelschlag" }),
      E({ id: "hb:item:templer-schwert", kind: "item", name: "Templer Schwert", data: {} }),
      E({ id: "hb:spell:tempelsegen", kind: "spell", name: "Tempelsegen", data: {} }),
      E({ id: "hb:feat:unbenutzt", name: "Nie gewählt" }),
    ];
    const picked = collectHomebrewClosure(character, pool).map((e) => e.id);
    expect(picked).toEqual([
      "hb:feat:tempelschlag",
      "hb:item:templer-schwert",
      "hb:race:halbtempler",
      "hb:skill:tempelwissen",
      "hb:spell:tempelsegen",
    ]);
    expect(picked).not.toContain("hb:feat:unbenutzt");
  });

  it(`nimmt Überschreibungen mit — sonst scheint beim Empfänger das SRD durch`, () => {
    const pool = [
      E({
        id: "hb:override:fighter",
        kind: "class",
        name: "Fighter (Haus)",
        data: CLASS_DATA,
        overrides: "srd:class:fighter",
      }),
    ];
    expect(collectHomebrewClosure(character, pool).map((e) => e.id)).toEqual(["hb:override:fighter"]);
  });

  it(`folgt Ketten: Talent verweist auf Waffe, Waffe stammt von Eigenbau ab`, () => {
    const pool = [
      E({
        id: "hb:item:templer-schwert",
        kind: "item",
        name: "Templer Schwert",
        data: {},
        basedOn: "hb:item:tempelklinge",
      }),
      E({ id: "hb:item:tempelklinge", kind: "item", name: "Tempelklinge", data: {} }),
      E({ id: "hb:item:fremd", kind: "item", name: "Nicht verwandt", data: {} }),
    ];
    const picked = collectHomebrewClosure(character, pool).map((e) => e.id);
    expect(picked).toEqual(["hb:item:tempelklinge", "hb:item:templer-schwert"]);
  });

  it(`lässt SRD-Einträge grundsätzlich draußen`, () => {
    const pool = [
      entitySchema.parse({
        id: "srd:class:fighter",
        kind: "class",
        name: "Fighter",
        source: "srd",
        data: CLASS_DATA,
      }),
    ];
    expect(collectHomebrewClosure(character, pool)).toEqual([]);
  });

  it(`läuft nicht in eine Schleife, wenn zwei Einträge sich gegenseitig nennen`, () => {
    const pool = [
      E({ id: "hb:feat:tempelschlag", name: "A", basedOn: "hb:feat:b" }),
      E({ id: "hb:feat:b", name: "B", basedOn: "hb:feat:tempelschlag" }),
    ];
    expect(collectHomebrewClosure(character, pool).map((e) => e.id)).toEqual([
      "hb:feat:b",
      "hb:feat:tempelschlag",
    ]);
  });
});
