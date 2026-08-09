import { describe, expect, it } from "vitest";
import {
  allowedSlots,
  conflictingEquipIds,
  cycleEquipSlot,
  equipTap,
  isNaturalOrUnarmed,
  itemKind,
  nextSlot,
  type EquipCandidate,
} from "./equipment.js";
import { entitySchema, resolveCompendium, type ItemEntity } from "../schema/entities.js";
import { characterSchema } from "../schema/character.js";
import { deriveSheet } from "./index.js";

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

/**
 * Eigene Boni AN einem Gegenstand — die Lücke, die beim Umbau der Ausrüstung
 * aufgefallen ist: `inventory[].extraEffects` wird von der Engine seit langem
 * angewendet, war aber von keinem Test gedeckt. Und daran hängt eine Falle, die
 * man nur EINMAL falsch baut, wenn ein Test sie festhält.
 */
describe("Eigene Modifikatoren an einer Inventarzeile", () => {
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
        levels: [{ bab: 1, fort: 2, ref: 0, will: 0, features: [] }],
      },
    }),
    entitySchema.parse({
      id: "homebrew:item:amulett",
      kind: "item",
      name: "Drachenamulett",
      source: "homebrew",
      data: { category: "wondrous" },
    }),
  ]);

  const withAmulet = (slot: string, activation: string) =>
    characterSchema.parse({
      id: "extra-1",
      name: "Prüfling",
      raceId: "srd:race:human",
      abilities: { base: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } },
      levels: [{ classId: "srd:class:fighter", hpRoll: "avg" }],
      inventory: [
        {
          id: "i1",
          itemId: "homebrew:item:amulett",
          slot,
          extraEffects: [{ target: "ac", bonusType: "natural", value: 2, activation }],
        },
      ],
    });

  it("wirkt, wenn der Gegenstand angelegt ist — und steht mit seinem Namen da", () => {
    const sheet = deriveSheet(withAmulet("worn", "equipped"), COMPENDIUM);
    expect(sheet.ac.total.total).toBe(12);
    expect(sheet.ac.total.contributions.map((c) => c.source)).toContain("Drachenamulett");
  });

  it("wirkt NICHT aus dem Rucksack", () => {
    expect(deriveSheet(withAmulet("none", "equipped"), COMPENDIUM).ac.total.total).toBe(10);
  });

  it(`mit „passive" wirkt er auch aus dem Rucksack — deshalb schreibt die Oberfläche „equipped"`, () => {
    /*
      Die Falle, absichtlich festgeschrieben. Der Modifikator-Editor kommt von den
      TALENTEN, und dort ist „passive" richtig: ein Talent hat man immer. An einem
      Gegenstand ist es falsch — ein Ring mit „RK +2", einmal so angelegt,
      verschiebt die RK dauerhaft, und in der Aufschlüsselung steht nur der
      Gegenstandsname. Man sucht den Fehler überall, nur nicht dort.
    */
    expect(deriveSheet(withAmulet("none", "passive"), COMPENDIUM).ac.total.total).toBe(12);
  });

  it(`Ein „nur diese Waffe"-Bonus bleibt bei seiner Waffe`, () => {
    const compendium = resolveCompendium([
      ...[...COMPENDIUM.values()],
      entitySchema.parse({
        id: "homebrew:item:schwert",
        kind: "item",
        name: "Schwert aus der Gruft",
        source: "homebrew",
        data: { category: "weapon", weapon: { damage: "1d8", critRange: "20", critMult: "x2", handedness: "one" } },
      }),
      entitySchema.parse({
        id: "homebrew:item:knüppel",
        kind: "item",
        name: "Knüppel",
        source: "homebrew",
        data: { category: "weapon", weapon: { damage: "1d6", critRange: "20", critMult: "x2", handedness: "one" } },
      }),
    ]);
    const character = characterSchema.parse({
      id: "extra-2",
      name: "Prüfling",
      raceId: "srd:race:human",
      abilities: { base: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } },
      levels: [{ classId: "srd:class:fighter", hpRoll: "avg" }],
      inventory: [
        {
          id: "w1",
          itemId: "homebrew:item:schwert",
          slot: "mainHand",
          extraEffects: [
            { target: "attack.self", bonusType: "enhancement", value: 1, activation: "equipped" },
            { target: "damage.self", bonusType: "enhancement", value: 1, activation: "equipped" },
          ],
        },
        { id: "w2", itemId: "homebrew:item:knüppel", slot: "none", extraEffects: [] },
      ],
    });
    const sheet = deriveSheet(character, compendium);
    const byLabel = new Map(sheet.attacks.map((a) => [a.label, a]));
    // Grundangriffsbonus 1, STR 10 (+0): das Schwert +2, der Knüppel +1.
    expect(byLabel.get("Schwert aus der Gruft")?.bonuses).toEqual([2]);
    expect(byLabel.get("Schwert aus der Gruft")?.damageText).toBe("1d8+1");
    expect(byLabel.get("Knüppel")?.bonuses).toEqual([1]);
    expect(byLabel.get("Knüppel")?.damageText).toBe("1d6");
    // Und die Sammelzeile bleibt unberührt — sonst wäre jede Waffe besser.
    expect(byLabel.get("Nahkampf")?.bonuses).toEqual([1]);
  });
});

/*
  Der KURZE Tipp auf die Marke — seine drei Beispiele, woertlich abgepruft.

  Sein Auftrag: "wenn ich 'ne Einhandwaffe und ein Schild fuehre und dann auf den
  Zweihaender drauftippe, dass er den automatisch dann ausruestet und die anderen beiden
  Sachen dann halt wegpackt. Genauso, wenn ich 'n Einhandwaffe trage und eine andere
  Einhandwaffe antippe, dass die dann einfach nur tauschen."
*/
describe("equipTap — anlegen mit einem Griff", () => {
  const einhand = weapon("one");
  const zweihand = weapon("two");
  const schild = item({ armor: { kind: "shield", ac: 2 } } as never);

  it("legt einen Zweihaender an und packt Waffe UND Schild weg", () => {
    const items: EquipCandidate[] = [
      { id: "schwert", slot: "mainHand" },
      { id: "schild", slot: "offHand" },
      { id: "zweihand", slot: "none" },
    ];
    const out = equipTap(zweihand, items, "zweihand");
    expect(out.slot).toBe("bothHands");
    expect([...out.displaced].sort()).toEqual(["schild", "schwert"]);
  });

  it("tauscht eine Einhandwaffe gegen die andere — und laesst das Schild in Ruhe", () => {
    /*
      Die zweite Haelfte ist die wichtigere: ein Tipp auf das neue Schwert darf NUR das
      alte Schwert wegpacken. Wer hier zu viel verdraengt, nimmt ihm im Kampf die RK.
    */
    const items: EquipCandidate[] = [
      { id: "alt", slot: "mainHand" },
      { id: "schild", slot: "offHand" },
      { id: "neu", slot: "none" },
    ];
    const out = equipTap(einhand, items, "neu");
    expect(out.slot).toBe("mainHand");
    expect(out.displaced).toEqual(["alt"]);
  });

  it("legt in eine freie Hand, ohne irgendetwas zu verdraengen", () => {
    const items: EquipCandidate[] = [{ id: "neu", slot: "none" }];
    expect(equipTap(einhand, items, "neu")).toEqual({ slot: "mainHand", displaced: [] });
  });

  it("legt ab, was schon angelegt ist", () => {
    /*
      Ohne diesen Weg waere der kurze Tipp eine Einbahnstrasse: angelegt bliebe angelegt,
      und ablegen ginge nur ueber den langen Druck. Ein Knopf, der nur in eine Richtung
      geht, ist genau der Fall, den diese App sonst ueberall vermeidet.
    */
    const items: EquipCandidate[] = [{ id: "neu", slot: "mainHand" }];
    expect(equipTap(einhand, items, "neu")).toEqual({ slot: "none", displaced: [] });
  });

  it("schickt ein Schild in die Schildhand und eine Ruestung auf den Ruestungsplatz", () => {
    expect(equipTap(schild, [{ id: "s", slot: "none" }], "s").slot).toBe("offHand");
    const ruestung = item({ armor: { kind: "light", ac: 4 } } as never);
    const out = equipTap(ruestung, [{ id: "alt", slot: "armor" }, { id: "neu", slot: "none" }], "neu");
    expect(out.slot).toBe("armor");
    expect(out.displaced).toEqual(["alt"]);
  });

  it("laesst cycleEquipSlot unangetastet — die zwei Wege sind verschieden gemeint", () => {
    /*
      Die Gegenprobe zur Entscheidung dieser Runde. `cycleEquipSlot` sucht den naechsten
      FREIEN Platz (der Assistent fuehrt damit durch die Plaetze), `equipTap` nimmt den
      ersten ERLAUBTEN und verdraengt. Waere das dasselbe, haette eine der beiden
      Bitten von ihm verloren.
    */
    const items: EquipCandidate[] = [
      { id: "alt", slot: "mainHand" },
      { id: "neu", slot: "none" },
    ];
    expect(cycleEquipSlot(einhand, items, "neu")).toBe("offHand");
    expect(equipTap(einhand, items, "neu").slot).toBe("mainHand");
  });
});
