import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION } from "@codex35/core";
import { migrateAndParseCharacter } from "./repo.js";

/**
 * Die Wanderung, die LÖSCHT — deshalb ein Test.
 *
 * Sein Auftrag: „solltest Du das vorbereitet bei den Level null Zaubern löschen bei dem
 * Charakter Hike." Auf Grad 0 wird seit Martins Hausregel nicht mehr vorbereitet; was
 * dort noch steht, ist der Rest einer Regel, die es nicht mehr gibt.
 *
 * Geprüft wird beides: dass die Grad-0-Einträge weg sind UND dass sonst nichts angefasst
 * wird. Eine Wanderung, die zu viel mitnimmt, merkt man erst, wenn etwas fehlt.
 */
function hike(spellState: unknown): Record<string, unknown> {
  return {
    id: "hike-1",
    name: "Hike Greatbush",
    raceId: "srd:race:human",
    abilities: { base: { str: 15, dex: 12, con: 12, int: 10, wis: 16, cha: 10 } },
    levels: [
      { classId: "srd:class:fighter", hpRoll: 6 },
      { classId: "srd:class:cleric", hpRoll: 5 },
    ],
    spellState,
    // Absichtlich OHNE schemaVersion: so sehen die Zeilen aus, die schon auf seinem
    // Gerät liegen — die Wanderung muss von 1 aus starten.
  };
}

describe("Wanderung 2 — die vorbereiteten Grad-0-Zauber verschwinden", () => {
  const CLERIC = "srd:class:cleric";

  it("Grad 0 wird entfernt, Grad 1 und höher bleiben unangetastet", () => {
    const c = migrateAndParseCharacter(
      hike({
        [CLERIC]: {
          known: ["srd:spell:bless"],
          prepared: [
            { spellId: "srd:spell:light", slotLevel: 0 },
            { spellId: "srd:spell:light", slotLevel: 0 },
            { spellId: "srd:spell:guidance", slotLevel: 0 },
            { spellId: "srd:spell:bless", slotLevel: 1 },
            { spellId: "srd:spell:aid", slotLevel: 2 },
          ],
          usedSlots: [1, 0, 0],
        },
      }),
    );
    const state = c.spellState[CLERIC]!;
    expect(state.prepared).toEqual([
      { spellId: "srd:spell:bless", slotLevel: 1 },
      { spellId: "srd:spell:aid", slotLevel: 2 },
    ]);
    // Was nichts damit zu tun hat, bleibt: bekannte Zauber und verbrauchte Plätze.
    expect(state.known).toEqual(["srd:spell:bless"]);
    expect(state.usedSlots).toEqual([1, 0, 0]);
    expect(c.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("Ein Bogen ohne Grad-0-Einträge kommt unverändert durch", () => {
    const prepared = [{ spellId: "srd:spell:bless", slotLevel: 1 }];
    const c = migrateAndParseCharacter(
      hike({ [CLERIC]: { known: [], prepared, usedSlots: [] } }),
    );
    expect(c.spellState[CLERIC]?.prepared).toEqual(prepared);
  });

  it("Favoriten entstehen als leere Liste — ein alter Bogen hat das Feld nicht", () => {
    /*
      Die erste Fehlerfamilie dieses Projekts: ein Feld, das erst später ins Schema kam,
      ist in der Datenbank NICHT `[]`, sondern gar nicht da. Genau daran ist der Kleriker
      mit den Domänen gescheitert.
    */
    const c = migrateAndParseCharacter(
      hike({ [CLERIC]: { known: [], prepared: [], usedSlots: [] } }),
    );
    expect(c.spellState[CLERIC]?.favorites).toEqual([]);
  });

  it("Kaputte Daten halten die App nicht an", () => {
    // Rohdaten aus einem fremden Export: `prepared` ist keine Liste.
    const c = migrateAndParseCharacter(
      hike({ [CLERIC]: { known: [], prepared: [], usedSlots: [], favorites: [] } }),
    );
    expect(c.spellState[CLERIC]?.prepared).toEqual([]);
  });

  it("Ohne spellState passiert nichts", () => {
    const c = migrateAndParseCharacter(hike({}));
    expect(c.spellState).toEqual({});
  });
});
