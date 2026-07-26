import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEFAULT_HOUSE_RULES, characterSchema, type Character } from "../schema/character.js";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { deriveSheet } from "./index.js";
import { maxRanks, skillPointCost } from "./tables.js";

/**
 * Die 3.5-Regel für Fertigkeitspunkte, festgenagelt:
 * Klassenfertigkeit 1 Punkt je Rang, klassenfremd 2 — und ganze Ränge.
 * Halbe Ränge zum halben Preis waren 3.0.
 */
describe("maxRanks", () => {
  it(`gibt Stufe+3 für Klassenfertigkeiten`, () => {
    expect(maxRanks(1, true)).toBe(4);
    expect(maxRanks(8, true)).toBe(11);
    expect(maxRanks(20, true)).toBe(23);
  });

  it(`rundet klassenfremd ab — kein „5,5" in der Oberfläche`, () => {
    // PHB schreibt die Hälfte von 11 als 5½; erreichbar sind 5 ganze Ränge.
    expect(maxRanks(8, false)).toBe(5);
    expect(maxRanks(1, false)).toBe(2);
    expect(maxRanks(2, false)).toBe(2);
    expect(maxRanks(3, false)).toBe(3);
    expect(maxRanks(20, false)).toBe(11);
  });

  it(`liefert nie einen gebrochenen Wert`, () => {
    for (let level = 1; level <= 20; level++) {
      for (const isClass of [true, false]) {
        expect(Number.isInteger(maxRanks(level, isClass))).toBe(true);
      }
    }
  });
});

describe("skillPointCost", () => {
  it(`kostet klassenfremd das Doppelte`, () => {
    expect(skillPointCost(true)).toBe(1);
    expect(skillPointCost(false)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Gegen die echten SRD-Packs: rechnet die Engine wirklich mit 2 Punkten?
// ---------------------------------------------------------------------------

const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const packsAvailable = existsSync(join(packsDir, "manifest.json"));

function loadCompendium(): Map<string, Entity> {
  const manifest = JSON.parse(readFileSync(join(packsDir, "manifest.json"), "utf8")) as {
    files: string[];
  };
  const entities: Entity[] = [];
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    for (const item of JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[]) {
      entities.push(entitySchema.parse(item));
    }
  }
  return resolveCompendium(entities);
}

describe.skipIf(!packsAvailable)("Verbrauch von Fertigkeitspunkten", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();

  const fighter = (skillRanks: Record<string, number>): Character =>
    characterSchema.parse({
      id: "sp-test",
      name: "Test",
      abilities: { base: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 } },
      raceId: "srd:race:human",
      levels: [{ classId: "srd:class:fighter", hpRoll: "avg" }],
      skillRanks,
    });

  const derive = (character: Character) =>
    deriveSheet(character, compendium, DEFAULT_HOUSE_RULES);

  it(`zählt einen Rang in einer Klassenfertigkeit als 1 Punkt`, () => {
    // Climb ist Kämpfer-Klassenfertigkeit.
    const sheet = derive(fighter({ "srd:skill:climb": 4 }));
    expect(sheet.skillPoints.spent).toBe(4);
  });

  it(`zählt einen Rang in einer klassenfremden Fertigkeit als 2 Punkte`, () => {
    // Spot ist für den Kämpfer klassenfremd.
    const sheet = derive(fighter({ "srd:skill:spot": 2 }));
    expect(sheet.skillPoints.spent).toBe(4);
  });

  it(`mischt beides korrekt`, () => {
    const sheet = derive(fighter({ "srd:skill:climb": 3, "srd:skill:spot": 2 }));
    expect(sheet.skillPoints.spent).toBe(3 + 4);
  });

  it(`meldet Überschreitung des klassenfremden Maximums`, () => {
    // Stufe 1: klassenfremd höchstens 2 Ränge.
    const ok = derive(fighter({ "srd:skill:spot": 2 }));
    expect(ok.issues.some((i) => i.message.includes("übersteigen das Maximum"))).toBe(false);

    const tooMany = derive(fighter({ "srd:skill:spot": 3 }));
    const issue = tooMany.issues.find((i) => i.message.includes("übersteigen das Maximum"));
    expect(issue).toBeDefined();
    // Die Meldung muss die abgerundete 2 nennen, nicht „2,5".
    expect(issue?.message).toContain("2");
    expect(issue?.message).not.toContain(",5");
    expect(issue?.message).not.toContain(".5");
  });

  it(`zeigt das klassenfremde Maximum als ganze Zahl im Bogen`, () => {
    const sheet = derive(fighter({}));
    for (const skill of sheet.skills) {
      expect(Number.isInteger(skill.maxRanks)).toBe(true);
    }
  });
});
