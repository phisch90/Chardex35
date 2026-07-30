import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { characterSchema, type Character, type EquipSlot } from "../schema/character.js";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { deriveSheet } from "./index.js";

/**
 * Stärkeschaden bei Fernkampfwaffen — gegen die ECHTEN Packs.
 *
 * Vorher galt eine einzige Regel: „Fernkampf bekommt keinen Stärkebonus." Damit
 * machte ein Wurfspeer bei STR 18 denselben Schaden wie bei STR 8. Der Bogen
 * schrieb sogar „außer Wurfwaffen/Kompositbögen" darunter — er kannte die
 * Ausnahme also und wandte sie nicht an.
 *
 * Beide Regeln stehen wörtlich in unseren eigenen Packdaten, in den
 * Waffenbeschreibungen — deshalb wird hier gegen die echten Waffen geprüft und
 * nicht gegen erfundene.
 */
const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const manifestPath = join(packsDir, "manifest.json");
const packsAvailable = existsSync(manifestPath);

function loadCompendium(): Map<string, Entity> {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: string[] };
  const entities: Entity[] = [];
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    for (const item of JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[]) {
      entities.push(entitySchema.parse(item));
    }
  }
  return resolveCompendium(entities);
}

describe.skipIf(!packsAvailable)("Stärkeschaden im Fernkampf", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();

  /** Ein Kämpfer 1 mit wählbarer Stärke und einer Waffe im Rucksack. */
  const fighter = (str: number, itemIds: string[]): Character =>
    characterSchema.parse({
      id: "thrown-1",
      name: "Werfer",
      raceId: "srd:race:human",
      abilities: { base: { str, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } },
      levels: [{ classId: "srd:class:fighter", hpRoll: "avg" as const }],
      inventory: itemIds.map((itemId, i) => ({
        id: `i${i}`,
        itemId,
        slot: "none" as EquipSlot,
        extraEffects: [],
      })),
    });

  const damage = (str: number, itemId: string): string => {
    const sheet = deriveSheet(fighter(str, [itemId]), compendium);
    const line = sheet.attacks.find((a) => a.key === `weapon:i0`);
    if (!line) throw new Error(`keine Angriffszeile für ${itemId}`);
    return line.damageText;
  };
  const note = (str: number, itemId: string): string => {
    const sheet = deriveSheet(fighter(str, [itemId]), compendium);
    return sheet.attacks.find((a) => a.key === `weapon:i0`)!.notes.join(" ");
  };

  it("Wurfwaffen bekommen den Stärkebonus — der gemeldete Fehler", () => {
    // STR 18 = +4. Vorher stand hier überall der nackte Würfel.
    expect(damage(18, "srd:item:javelin")).toBe("1d6+4");
    expect(damage(18, "srd:item:dart")).toBe("1d4+4");
    expect(damage(18, "srd:item:bolas")).toBe("1d4+4");
    expect(damage(18, "srd:item:shuriken-5")).toBe("1d2+4");
  });

  it("Die Schleuder auch — das steht wörtlich in ihrem Regeltext", () => {
    /*
      `srd:item:sling`, Beschreibung: „Your Strength modifier applies to damage
      rolls when you use a sling, just as it does for thrown weapons." Die
      Schleuder ist der Grund, warum die Marke nicht „thrown" heißt: sie wirft
      nichts, sie schleudert.
    */
    expect(damage(18, "srd:item:sling")).toBe("1d4+4");
    expect(damage(6, "srd:item:sling")).toBe("1d4-2");
  });

  it("Armbrüste bekommen nichts — auch keinen Malus", () => {
    expect(damage(18, "srd:item:crossbow-light")).toBe("1d8");
    expect(damage(6, "srd:item:crossbow-heavy")).toBe("1d10");
    expect(damage(6, "srd:item:crossbow-hand")).toBe("1d4");
  });

  it("Bögen: der MALUS zählt, der Bonus nicht", () => {
    /*
      `srd:item:longbow`: „If you have a penalty for low Strength, apply it to
      damage rolls when you use a longbow. If you have a bonus for high Strength,
      you can apply it … when you use a composite longbow … but not a regular
      longbow." Die asymmetrische Regel, die vorher gar nicht ausdrückbar war.
    */
    expect(damage(18, "srd:item:longbow")).toBe("1d8");
    expect(damage(6, "srd:item:longbow")).toBe("1d8-2");
    expect(damage(18, "srd:item:shortbow")).toBe("1d6");
    expect(damage(6, "srd:item:shortbow")).toBe("1d6-2");
  });

  it("Kompositbögen bekommen den Bonus", () => {
    expect(damage(18, "srd:item:longbow-composite")).toBe("1d8+4");
    expect(damage(6, "srd:item:longbow-composite")).toBe("1d8-2");
  });

  it("Jede Fernkampfzeile sagt, welche Regel gilt", () => {
    // Eine Zahl ohne Begründung ist am Tisch schlimmer als eine falsche.
    expect(note(18, "srd:item:javelin")).toContain("Wurfwaffe");
    expect(note(18, "srd:item:longbow")).toContain("MALUS");
    expect(note(18, "srd:item:crossbow-light")).toContain("Kein STR-Modifikator");
  });

  it("Der Nahkampf bleibt unberührt", () => {
    // Wurfaxt und leichter Hammer haben eine Reichweite, sind aber leichte
    // NAHKAMPFwaffen — sie bekommen ihren Bonus über den Nahkampf-Pfad und
    // dürfen von dieser Änderung nichts merken.
    expect(damage(18, "srd:item:axe-throwing")).toBe("1d6+4");
    expect(damage(18, "srd:item:hammer-light")).toBe("1d4+4");
    expect(damage(18, "srd:item:longsword")).toBe("1d8+4");
    expect(damage(6, "srd:item:longsword")).toBe("1d8-2");
  });

  it("Zweihändig geführt zählt weiter das Anderthalbfache", () => {
    const c = characterSchema.parse({
      ...fighter(18, ["srd:item:greatsword"]),
      inventory: [
        { id: "i0", itemId: "srd:item:greatsword", slot: "bothHands", extraEffects: [] },
      ],
    });
    const line = deriveSheet(c, compendium).attacks.find((a) => a.key === "weapon:i0")!;
    // STR 18 = +4, ×1,5 = 6.
    expect(line.damageText).toBe("2d6+6");
  });

  it("Alle 20 Fernkampfwaffen tragen eine Marke — keine bleibt undefiniert", () => {
    /*
      Der Test gegen die stille Lücke: eine neue Fernkampfwaffe ohne Marke fällt
      auf `none` zurück, und das wäre bei einer Wurfwaffe wieder der alte Fehler.
      Hier fällt es auf.
    */
    const ranged = [...compendium.values()].filter(
      (e) => e.kind === "item" && e.data.weapon?.handedness === "ranged" && e.id === e.id,
    );
    expect(ranged.length).toBeGreaterThanOrEqual(20);
    for (const entity of ranged) {
      if (entity.kind !== "item") continue;
      expect(entity.data.weapon?.strDamage, entity.name).toBeDefined();
    }
  });
});
