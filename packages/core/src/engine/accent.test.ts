import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { accentClassIdOf } from "./accent.js";

/**
 * Die Regel für die Klassenfarbe, festgenagelt: meiste Stufen gewinnt, bei Gleichstand die
 * zuletzt gestiegene. Gefragt und von ihm entschieden — deshalb ein Test und nicht bloß
 * ein Kommentar.
 */
function withLevels(classIds: string[]): Character {
  return characterSchema.parse({
    id: "accent-test",
    name: "Test",
    raceId: "srd:race:human",
    abilities: { base: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } },
    levels: classIds.map((classId) => ({ classId, hpRoll: "avg" })),
  });
}

const FIGHTER = "srd:class:fighter";
const CLERIC = "srd:class:cleric";
const WIZARD = "srd:class:wizard";

describe("accentClassIdOf", () => {
  it("eine Klasse: die ist es", () => {
    expect(accentClassIdOf(withLevels([CLERIC, CLERIC, CLERIC]))).toBe(CLERIC);
  });

  it("Hike: Kämpfer 1 / Kleriker 6 wird ein KLERIKER", () => {
    // Genau sein Bogen — und die Antwort, die er gewählt hat.
    const hike = withLevels([FIGHTER, CLERIC, CLERIC, CLERIC, CLERIC, CLERIC, CLERIC]);
    expect(accentClassIdOf(hike)).toBe(CLERIC);
  });

  it("die Reihenfolge der Stufen ist gleichgültig, die Menge zählt", () => {
    expect(accentClassIdOf(withLevels([CLERIC, CLERIC, FIGHTER]))).toBe(CLERIC);
    expect(accentClassIdOf(withLevels([FIGHTER, CLERIC, CLERIC]))).toBe(CLERIC);
  });

  it("bei Gleichstand gewinnt die ZULETZT gestiegene", () => {
    expect(accentClassIdOf(withLevels([FIGHTER, CLERIC]))).toBe(CLERIC);
    expect(accentClassIdOf(withLevels([CLERIC, FIGHTER]))).toBe(FIGHTER);
    // Drei gleich starke: die letzte gewinnt, nicht die alphabetisch erste.
    expect(accentClassIdOf(withLevels([FIGHTER, CLERIC, WIZARD]))).toBe(WIZARD);
  });

  it("ein Bogen ohne Stufen hat keine Farbe", () => {
    // Kommt im Assistenten vor, solange keine Klasse gewählt ist.
    expect(accentClassIdOf(withLevels([]))).toBeUndefined();
  });

  it("liefert immer eine Kennung, die auch in den Stufen steht", () => {
    const c = withLevels([FIGHTER, FIGHTER, CLERIC, WIZARD, WIZARD, WIZARD]);
    const id = accentClassIdOf(c);
    expect(id).toBe(WIZARD);
    expect(c.levels.some((l) => l.classId === id)).toBe(true);
  });
});
