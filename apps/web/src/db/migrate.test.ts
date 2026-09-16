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

/**
 * Wanderung 3 — der Aktionspunkte-Zähler bekommt seine Regel.
 *
 * Sein Auftrag: `Action points setze nur bei level up zurueck.` Die Regel stand längst
 * im Kern (Martins Antwort: Reset bei Stufenaufstieg), nur sein Zähler hing an nichts —
 * er kam aus dem Fight-Club-Import, und die Namensliste dort kannte ihn damals nicht.
 *
 * Gefragt und entschieden hat er: einmal geradeziehen. Die Prüfung hält deshalb vor
 * allem die SCHRANKEN fest — was eine Wanderung NICHT anfassen darf, sieht man sonst
 * erst, wenn etwas fehlt.
 */
describe("Wanderung 3 — die Aktionspunkte kommen an ihre Regel", () => {
  const bogen = (trackers: unknown[]): Record<string, unknown> => ({
    id: "hike-1",
    name: "Hike Greatbush",
    raceId: "srd:race:human",
    abilities: { base: { str: 15, dex: 12, con: 12, int: 10, wis: 16, cha: 10 } },
    levels: [{ classId: "srd:class:fighter", hpRoll: 6 }],
    trackers,
    // Ohne schemaVersion — so liegt die Zeile auf seinem Gerät.
  });

  const punkte = (extra: Record<string, unknown> = {}) => ({
    id: "t1",
    name: "Action Points",
    kind: "counter",
    value: 3,
    max: 6,
    maxManual: true,
    ...extra,
  });

  it("hängt ihn an den Vorschlag — und lässt seine Zahlen in Ruhe", () => {
    const c = migrateAndParseCharacter(bogen([punkte()]));
    const t = c.trackers[0]!;
    expect(t.suggestedFrom).toBe("action-points");
    // Die Bedingung wird NICHT hineingeschrieben: sie ist eine Folge aus dem Vorschlag,
    // und `refillOf` rechnet sie. Ein geschriebener Wert wäre eine zweite Wahrheit.
    expect(t.refill).toBeUndefined();
    // Und das Versprechen an ihn: deine 6 bleiben 6.
    expect(t.max).toBe(6);
    expect(t.maxManual).toBe(true);
    expect(t.value).toBe(3);
    expect(t.name).toBe("Action Points");
  });

  it("auch auf deutsch — der Zähler kann längst umbenannt sein", () => {
    const c = migrateAndParseCharacter(bogen([punkte({ name: "Aktionspunkte" })]));
    expect(c.trackers[0]!.suggestedFrom).toBe("action-points");
  });

  it("was er selbst eingestellt hat, bleibt stehen", () => {
    /*
      Die wichtigste Schranke. Wer die Knopfreihe im Bearbeiten-Modus benutzt hat, hat
      eine Entscheidung getroffen — eine Wanderung, die sie überschreibt, ist keine
      Wanderung, sondern ein Verlust.
    */
    const c = migrateAndParseCharacter(bogen([punkte({ refill: ["long"] })]));
    expect(c.trackers[0]!.suggestedFrom).toBeUndefined();
    expect(c.trackers[0]!.refill).toEqual(["long"]);
  });

  it("und fasst keinen anderen Zähler an", () => {
    /*
      `derivedTrackerKey` kennt auch `turn undead` und `rage`. Ohne die Einengung auf
      `action-points` hinge hier plötzlich ein von Hand angelegter Zähler an einer
      gerechneten Grenze — und seine eigene Zahl wäre still eine andere.
    */
    const c = migrateAndParseCharacter(
      bogen([
        punkte({ id: "t2", name: "Turn Undead", max: 8 }),
        punkte({ id: "t3", name: "Schicksalspunkte" }),
      ]),
    );
    expect(c.trackers.map((t) => t.suggestedFrom)).toEqual([undefined, undefined]);
    expect(c.trackers[0]!.max).toBe(8);
  });

  it("überlebt eine Zeile, die gar nicht so aussieht wie erwartet", () => {
    // Erste Fehlerfamilie, von vorn bedacht: auf der rohen Zeile kann alles liegen.
    const c = migrateAndParseCharacter(bogen([]));
    expect(c.trackers).toEqual([]);
    expect(c.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});
