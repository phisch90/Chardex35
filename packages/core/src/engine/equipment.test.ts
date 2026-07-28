import { describe, expect, it } from "vitest";
import { conflictingEquipIds, itemSlot, type EquipCandidate } from "./equipment.js";
import type { ItemEntity } from "../schema/entities.js";

const item = (data: Partial<ItemEntity["data"]>): ItemEntity =>
  ({
    id: "x",
    name: "X",
    kind: "item",
    source: "homebrew",
    schemaVersion: 1,
    rev: 1,
    updatedAt: "",
    tags: [],
    effects: [],
    data: { category: "gear", ...data },
  }) as ItemEntity;

describe("itemSlot", () => {
  it(`trennt Schild von Rüstung — beide stehen im Datenmodell unter armor`, () => {
    expect(itemSlot(item({ armor: { kind: "shield", acBonus: 2, maxDex: null, acp: 1, asf: 0 } }))).toBe("shield");
    expect(itemSlot(item({ armor: { kind: "medium", acBonus: 5, maxDex: 3, acp: 4, asf: 0 } }))).toBe("armor");
  });

  it(`erkennt Waffen und lässt alles andere „other"`, () => {
    expect(itemSlot(item({ weapon: { damage: "1d8", critical: "20/×2" } as never }))).toBe("weapon");
    expect(itemSlot(item({}))).toBe("other");
    expect(itemSlot(undefined)).toBe("other");
  });
});

describe("conflictingEquipIds", () => {
  const rüstung = (id: string, equipped: boolean): EquipCandidate => ({ id, slot: "armor", equipped });
  const schild = (id: string, equipped: boolean): EquipCandidate => ({ id, slot: "shield", equipped });
  const waffe = (id: string, equipped: boolean): EquipCandidate => ({ id, slot: "weapon", equipped });

  it(`zieht die alte Rüstung aus, wenn eine neue angelegt wird`, () => {
    const items = [rüstung("kettenhemd", true), rüstung("platte", false)];
    expect(conflictingEquipIds(items, "platte")).toEqual(["kettenhemd"]);
  });

  it(`fasst den Schild dabei NICHT an — der gehört an den anderen Arm`, () => {
    const items = [rüstung("kettenhemd", true), schild("buckler", true), rüstung("platte", false)];
    expect(conflictingEquipIds(items, "platte")).toEqual(["kettenhemd"]);
  });

  it(`und umgekehrt: ein zweiter Schild verdrängt nur den ersten`, () => {
    const items = [rüstung("kettenhemd", true), schild("buckler", true), schild("turmschild", false)];
    expect(conflictingEquipIds(items, "turmschild")).toEqual(["buckler"]);
  });

  it(`lässt Waffen in Ruhe — Zweiwaffenkampf ist ein normaler Fall`, () => {
    const items = [waffe("kurzschwert", true), waffe("dolch", false)];
    expect(conflictingEquipIds(items, "dolch")).toEqual([]);
  });

  it(`verlangt nichts, wenn nichts im Weg ist`, () => {
    expect(conflictingEquipIds([rüstung("platte", false)], "platte")).toEqual([]);
    expect(conflictingEquipIds([], "gibtsnicht")).toEqual([]);
  });
});
