import { describe, expect, it } from "vitest";
import {
  allowedSlots,
  conflictingEquipIds,
  cycleEquipSlot,
  isNaturalOrUnarmed,
  itemKind,
  nextSlot,
  type EquipCandidate,
} from "./equipment.js";
import type { ItemEntity } from "../schema/entities.js";

const item = (data: Partial<ItemEntity["data"]>, over: Partial<ItemEntity> = {}): ItemEntity =>
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
    ...over,
  }) as ItemEntity;

const weapon = (handedness: string, extra: Record<string, unknown> = {}) =>
  item({ weapon: { damage: "1d8", critical: "20/×2", handedness, ...extra } as never });

describe("itemKind", () => {
  it(`trennt Schild von Rüstung — beide stehen im Datenmodell unter armor`, () => {
    expect(itemKind(item({ armor: { kind: "shield", acBonus: 2, maxDex: null, acp: 1, asf: 0 } }))).toBe("shield");
    expect(itemKind(item({ armor: { kind: "medium", acBonus: 5, maxDex: 3, acp: 4, asf: 0 } }))).toBe("armor");
  });

  it(`erkennt Waffen und lässt alles andere „other"`, () => {
    expect(itemKind(weapon("one"))).toBe("weapon");
    expect(itemKind(item({}))).toBe("other");
    expect(itemKind(undefined)).toBe("other");
  });
});

describe("allowedSlots", () => {
  it(`steckt den Schild in die Schildhand, nicht in einen eigenen Schild-Platz`, () => {
    // Genau so zeigt es Fight Club: am Schild steht „OH".
    expect(allowedSlots(item({ armor: { kind: "shield", acBonus: 2, maxDex: null, acp: 1, asf: 0 } }))).toEqual([
      "offHand",
    ]);
  });

  it(`erlaubt einer einhändigen Waffe beide Hände`, () => {
    // Der Normalfall am Tisch: Langschwert zweihändig zuschlagen. Ohne diesen
    // Platz gäbe es den doppelten Power-Attack-Schaden nicht.
    expect(allowedSlots(weapon("one"))).toEqual(["mainHand", "offHand", "bothHands"]);
  });

  it(`lässt eine zweihändige Waffe nur beidhändig zu`, () => {
    expect(allowedSlots(weapon("two"))).toEqual(["bothHands"]);
  });

  it(`gibt allem anderen den Platz „getragen"`, () => {
    expect(allowedSlots(item({}))).toEqual(["worn"]);
    expect(allowedSlots(item({ armor: { kind: "medium", acBonus: 5, maxDex: 3, acp: 4, asf: 0 } }))).toEqual([
      "armor",
    ]);
  });
});

describe("nextSlot", () => {
  it(`tippt sich durch die erlaubten Plätze und wieder heraus`, () => {
    const sword = weapon("one");
    expect(nextSlot(sword, "none")).toBe("mainHand");
    expect(nextSlot(sword, "mainHand")).toBe("offHand");
    expect(nextSlot(sword, "offHand")).toBe("bothHands");
    expect(nextSlot(sword, "bothHands")).toBe("none");
  });

  it(`legt einen Altbestands-Platz einmal ab, statt hängen zu bleiben`, () => {
    // „worn" an einer Rüstung stammt aus der Umstellung von equipped: true.
    const plate = item({ armor: { kind: "heavy", acBonus: 8, maxDex: 1, acp: 6, asf: 0 } });
    expect(nextSlot(plate, "worn")).toBe("none");
    expect(nextSlot(plate, "none")).toBe("armor");
  });
});

describe("isNaturalOrUnarmed", () => {
  it(`erkennt den unbewaffneten Schlag an seiner SRD-Kennung`, () => {
    // Über weapon.category geht es NICHT: dort steht „simple", wie beim Dolch.
    expect(isNaturalOrUnarmed(item({}, { id: "srd:item:unarmed-strike" }))).toBe(true);
    expect(isNaturalOrUnarmed(weapon("light", { category: "simple" }))).toBe(false);
  });

  it(`nimmt eigene natürliche Waffen über Waffenart oder Schlagwort`, () => {
    expect(isNaturalOrUnarmed(weapon("light", { category: "natural" }))).toBe(true);
    expect(isNaturalOrUnarmed(item({}, { tags: ["natural"] }))).toBe(true);
    expect(isNaturalOrUnarmed(undefined)).toBe(false);
  });
});

describe("conflictingEquipIds", () => {
  const armor = (id: string, slot: EquipCandidate["slot"]): EquipCandidate => ({ id, slot });

  it(`zieht die alte Rüstung aus, wenn eine neue angelegt wird`, () => {
    const items = [armor("kettenhemd", "armor"), armor("platte", "none")];
    expect(conflictingEquipIds(items, "platte", "armor")).toEqual(["kettenhemd"]);
  });

  it(`fasst den Schild dabei NICHT an — der gehört an den anderen Arm`, () => {
    const items = [armor("kettenhemd", "armor"), armor("buckler", "offHand"), armor("platte", "none")];
    expect(conflictingEquipIds(items, "platte", "armor")).toEqual(["kettenhemd"]);
  });

  it(`erlaubt Zweiwaffenkampf: Haupthand und Schildhand stören sich nicht`, () => {
    const items = [armor("kurzschwert", "mainHand"), armor("dolch", "none")];
    expect(conflictingEquipIds(items, "dolch", "offHand")).toEqual([]);
  });

  it(`räumt beide Hände frei, wenn beidhändig geführt wird`, () => {
    const items = [
      armor("kurzschwert", "mainHand"),
      armor("buckler", "offHand"),
      armor("zweihänder", "none"),
    ];
    expect(conflictingEquipIds(items, "zweihänder", "bothHands")).toEqual([
      "kurzschwert",
      "buckler",
    ]);
  });

  it(`verdrängt die beidhändige Waffe, sobald eine Hand gebraucht wird`, () => {
    const items = [armor("zweihänder", "bothHands"), armor("dolch", "none")];
    expect(conflictingEquipIds(items, "dolch", "mainHand")).toEqual(["zweihänder"]);
  });

  it(`tauscht in derselben Hand`, () => {
    const items = [armor("kurzschwert", "mainHand"), armor("axt", "none")];
    expect(conflictingEquipIds(items, "axt", "mainHand")).toEqual(["kurzschwert"]);
  });

  it(`lässt Getragenes unbegrenzt — Ringe und Amulette brauchen keine Hand`, () => {
    const items = [armor("ring1", "worn"), armor("ring2", "worn"), armor("amulett", "none")];
    expect(conflictingEquipIds(items, "amulett", "worn")).toEqual([]);
  });

  it(`verlangt nichts, wenn nichts im Weg ist`, () => {
    expect(conflictingEquipIds([armor("platte", "none")], "platte", "armor")).toEqual([]);
    expect(conflictingEquipIds([], "gibtsnicht", "mainHand")).toEqual([]);
  });
});

describe("cycleEquipSlot", () => {
  const sword = weapon("one");
  const dagger = weapon("light");

  it(`nimmt die FREIE Hand, statt die andere Waffe zu verdrängen`, () => {
    /*
      Der Fehler, der im Bogen zu sehen war: der erste Tap auf den Dolch nahm die
      Haupthand und warf das Kurzschwert heraus; erst der zweite Tap landete in
      der Schildhand — am Ende hielt die Figur nur den Dolch.
    */
    const items: EquipCandidate[] = [
      { id: "kurzschwert", slot: "mainHand" },
      { id: "dolch", slot: "none" },
    ];
    expect(cycleEquipSlot(dagger, items, "dolch")).toBe("offHand");
  });

  it(`geht der Reihe nach, wenn nichts im Weg ist`, () => {
    const items: EquipCandidate[] = [{ id: "s", slot: "none" }];
    expect(cycleEquipSlot(sword, items, "s")).toBe("mainHand");
    expect(cycleEquipSlot(sword, [{ id: "s", slot: "mainHand" }], "s")).toBe("offHand");
  });

  it(`legt weg, statt der anderen Hand die Waffe zu nehmen`, () => {
    /*
      Beide Hände voll (Schwert + Dolch). Ein Tap auf das Schwert könnte auf
      „beidhändig" gehen — dafür müsste aber der Dolch weg, und das wäre wieder ein
      Nebeneffekt, den niemand angetippt hat. Also: weglegen.

      Zweihändig führen setzt eine freie Hand voraus. Das ist keine Einschränkung
      der App, sondern der Körper: erst den Dolch ab, dann das Schwert in beide
      Hände.
    */
    const items: EquipCandidate[] = [
      { id: "s", slot: "mainHand" },
      { id: "d", slot: "offHand" },
    ];
    expect(cycleEquipSlot(sword, items, "s")).toBe("none");
  });

  it(`erreicht beidhändig, sobald die andere Hand frei ist`, () => {
    const allein: EquipCandidate[] = [{ id: "s", slot: "offHand" }];
    expect(cycleEquipSlot(sword, allein, "s")).toBe("bothHands");
  });

  it(`legt am Ende des Rings wieder ab`, () => {
    expect(cycleEquipSlot(sword, [{ id: "s", slot: "bothHands" }], "s")).toBe("none");
  });

  it(`räumt einen Altbestands-Platz auf`, () => {
    const plate = item({ armor: { kind: "heavy", acBonus: 8, maxDex: 1, acp: 6, asf: 0 } });
    expect(cycleEquipSlot(plate, [{ id: "p", slot: "worn" }], "p")).toBe("none");
  });
});
