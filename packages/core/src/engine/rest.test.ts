import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { deriveSheet } from "./index.js";
import { applyRest, planRest, snapshotForRest, undoRest } from "./rest.js";

/**
 * Die Rast.
 *
 * Gegen die echten Packs, weil die interessanten Zahlen aus den Klassentabellen
 * kommen: wie viele Plätze ein Kleriker auf Stufe 7 hat und wie hoch die Grenze
 * für „Untote vertreiben" wirklich liegt. Mit erfundenen Daten würde der Test
 * nur seine eigenen Annahmen bestätigen.
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

describe.skipIf(!packsAvailable)("Rast", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();

  /** Kleriker 7 mit CHA 12, verbrauchten Plätzen und Zählern. */
  const cleric = (over: Partial<Character> = {}): Character =>
    characterSchema.parse({
      id: "rest-1",
      name: "Schläfer",
      raceId: "srd:race:human",
      abilities: { base: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 12 } },
      levels: Array.from({ length: 7 }, () => ({
        classId: "srd:class:cleric",
        hpRoll: "avg" as const,
      })),
      ...over,
    });

  it("Verbrauchte Plätze aller Zauberklassen werden gezählt — nicht nur eine", () => {
    /*
      Der Grund, warum der Mond als Rast falsch war: er saß in JEDEM Zauberblock
      und füllte nur seinen eigenen. Ein Kleriker/Magier hatte zwei Monde, und wer
      einen davon tippte, hatte trotzdem nicht gerastet.
    */
    const c = cleric({
      levels: [
        ...Array.from({ length: 4 }, () => ({ classId: "srd:class:cleric", hpRoll: "avg" as const })),
        ...Array.from({ length: 3 }, () => ({ classId: "srd:class:wizard", hpRoll: "avg" as const })),
      ],
      spellState: {
        "srd:class:cleric": { known: [], prepared: [], usedSlots: [1, 2, 0], favorites: [] },
        "srd:class:wizard": { known: [], prepared: [], usedSlots: [0, 1], favorites: [] },
      },
    });
    const plan = planRest(c, deriveSheet(c, compendium));
    expect(plan.slots.map((s) => [s.className, s.freed])).toEqual([
      ["Cleric", 3],
      ["Wizard", 1],
    ]);
    expect(plan.nothingToDo).toBe(false);
  });

  it("Die Ausführung leert die Plätze wirklich", () => {
    const c = cleric({
      spellState: { "srd:class:cleric": { known: [], prepared: [], usedSlots: [1, 2], favorites: [] } },
    });
    const plan = planRest(c, deriveSheet(c, compendium));
    applyRest(c, plan);
    expect(c.spellState["srd:class:cleric"]?.usedSlots).toEqual([]);
  });

  it("Vorbereitete Zauber bleiben stehen — das ist ein eigener Handgriff", () => {
    // Eine Rast gibt die PLÄTZE zurück. Was er vorbereitet hatte, wegzuwerfen
    // wäre eine zweite Entscheidung, die niemand verlangt hat.
    const c = cleric({
      spellState: {
        "srd:class:cleric": {
          known: ["srd:spell:bless"],
          prepared: [{ spellId: "srd:spell:bless", slotLevel: 1 }],
          usedSlots: [0, 1],
          favorites: [],
        },
      },
    });
    applyRest(c, planRest(c, deriveSheet(c, compendium)));
    expect(c.spellState["srd:class:cleric"]?.prepared).toEqual([
      { spellId: "srd:spell:bless", slotLevel: 1 },
    ]);
    expect(c.spellState["srd:class:cleric"]?.known).toEqual(["srd:spell:bless"]);
  });

  it("Ein Tageszähler aus einem Vorschlag füllt sich auf die WIRKLICHE Grenze", () => {
    /*
      Untote vertreiben: 3 + CHA-Modifikator. CHA 12 = +1, also 4. Die Zahl steht
      NICHT am Zähler, sondern kommt live aus dem Vorschlag — daran ist Extra
      Turning schon einmal gescheitert, und eine Rast, die `max` liest, würde den
      Fehler wiederholen.
    */
    const c = cleric({
      trackers: [
        {
          id: "t1",
          name: "Untote vertreiben",
          kind: "counter",
          value: 1,
          suggestedFrom: "turn-undead",
          maxManual: false,
        },
      ],
    });
    const plan = planRest(c, deriveSheet(c, compendium));
    expect(plan.trackers).toEqual([{ id: "t1", name: "Untote vertreiben", from: 1, to: 4 }]);
    applyRest(c, plan);
    expect(c.trackers[0]?.value).toBe(4);
    // Die Grenze selbst bleibt ungespeichert — sie wird gerechnet.
    expect(c.trackers[0]?.max).toBeUndefined();
  });

  it("Eine selbst gesetzte Grenze gewinnt auch bei der Rast", () => {
    const c = cleric({
      trackers: [
        {
          id: "t1",
          name: "Untote vertreiben",
          kind: "counter",
          value: 0,
          max: 9,
          maxManual: true,
          suggestedFrom: "turn-undead",
        },
      ],
    });
    // Sein Wert, nicht der gerechnete — „wer die Grenze anfasst, meint es so."
    expect(planRest(c, deriveSheet(c, compendium)).trackers[0]?.to).toBe(9);
  });

  it("Eigene Mechaniken bleibt die Rast schuldig — und sagt das", () => {
    /*
      „Aktionspunkte" gibt es im SRD nicht. Die App kennt die Regel nicht, und eine
      geratene Regel ist schlimmer als eine fehlende — aber verschweigen darf sie
      es nicht, sonst wundert er sich am Tisch.
    */
    const c = cleric({
      trackers: [
        { id: "t1", name: "Aktionspunkte", kind: "counter", value: 2, max: 6, maxManual: false },
        { id: "t2", name: "Merkzettel", kind: "value", value: 3, maxManual: false },
        { id: "t3", name: "Letzter Wurf", kind: "roll", value: 5, formula: "1d6", maxManual: false },
      ],
    });
    const plan = planRest(c, deriveSheet(c, compendium));
    expect(plan.trackers).toEqual([]);
    expect(plan.skipped).toEqual([{ name: "Aktionspunkte", reason: "eigene Mechanik" }]);
    applyRest(c, plan);
    expect(c.trackers.map((t) => t.value)).toEqual([2, 3, 5]);
  });

  it("Ein voller Zähler wird gemeldet, nicht angefasst", () => {
    const c = cleric({
      trackers: [
        { id: "t1", name: "Untote vertreiben", kind: "counter", value: 4, suggestedFrom: "turn-undead", maxManual: false },
      ],
    });
    const plan = planRest(c, deriveSheet(c, compendium));
    expect(plan.trackers).toEqual([]);
    expect(plan.skipped).toEqual([{ name: "Untote vertreiben", reason: "schon voll" }]);
  });

  it("Nichts zu tun heißt: nichts anbieten", () => {
    const c = cleric();
    expect(planRest(c, deriveSheet(c, compendium)).nothingToDo).toBe(true);
  });

  it("TP fasst die Rast NICHT an — das ist eine Regelentscheidung für seinen Tisch", () => {
    /*
      3.5 heilt bei einer Nachtruhe 1 TP pro Stufe, und nichttödlicher Schaden geht
      mit 1 TP pro Stunde pro Stufe weg. Beides steht in diesem Programm nirgends,
      und eine Rast, die es erfindet, verschiebt Zahlen auf seinem Bogen, ohne dass
      er es entschieden hat. Der Test hält das fest, damit es niemand nebenbei
      einbaut.
    */
    const c = cleric({ hp: { damage: 12, nonlethal: 5, temp: 4, stabilized: false } });
    applyRest(c, planRest(c, deriveSheet(c, compendium)));
    expect(c.hp).toEqual({ damage: 12, nonlethal: 5, temp: 4, stabilized: false });
  });

  it("Aufbau bleibt unberührt — sonst legt der nächste Auftrag eine Rettungskopie an", () => {
    // Was in den Fingerabdruck des Spielleiter-Auftrags eingeht (Grenzen, bekannte
    // Zauber, Domänen), ist Aufbau. Eine Rast ist Spielzustand.
    const c = cleric({
      domains: [{ classId: "srd:class:cleric", spellListId: "srd:spelllist:domain-war" }],
      spellState: { "srd:class:cleric": { known: [], prepared: [], usedSlots: [0, 2], favorites: [] } },
      trackers: [
        { id: "t1", name: "Untote vertreiben", kind: "counter", value: 0, suggestedFrom: "turn-undead", maxManual: false },
      ],
    });
    const before = structuredClone({
      domains: c.domains,
      levels: c.levels,
      suggestedFrom: c.trackers[0]?.suggestedFrom,
      maxManual: c.trackers[0]?.maxManual,
    });
    applyRest(c, planRest(c, deriveSheet(c, compendium)));
    expect({
      domains: c.domains,
      levels: c.levels,
      suggestedFrom: c.trackers[0]?.suggestedFrom,
      maxManual: c.trackers[0]?.maxManual,
    }).toEqual(before);
  });

  it("Die kurze Pause lässt die Zauberplätze in Ruhe — sein Wort", () => {
    /*
      Wörtlich gefragt und beantwortet: „Ja, ohne Zauberplätze." Im Regelwerk gibt
      es die kurze Pause so nicht — dort füllen sich Fähigkeiten pro Tag erst nach
      acht Stunden. Hausregel seines Tisches, und die gewinnt.
    */
    const c = cleric({
      spellState: { "srd:class:cleric": { known: [], prepared: [], usedSlots: [0, 2], favorites: [] } },
      trackers: [
        {
          id: "t1",
          name: "Untote vertreiben",
          kind: "counter",
          value: 1,
          suggestedFrom: "turn-undead",
          maxManual: false,
        },
      ],
    });
    const plan = planRest(c, deriveSheet(c, compendium), "short");
    expect(plan.scope).toBe("short");
    expect(plan.slots).toEqual([]);
    expect(plan.trackers).toEqual([{ id: "t1", name: "Untote vertreiben", from: 1, to: 4 }]);

    applyRest(c, plan);
    // Die Plätze bleiben verbraucht — und weil `applyRest` nur ausführt, was im
    // Plan steht, KANN sie sie nicht anfassen.
    expect(c.spellState["srd:class:cleric"]?.usedSlots).toEqual([0, 2]);
    expect(c.trackers[0]?.value).toBe(4);
  });

  it("Eine kurze Pause ohne Zähler hat nichts zu tun, auch bei verbrauchten Plätzen", () => {
    // Wichtig für die Oberfläche: sonst bietet sie eine Pause an, die nichts tut.
    const c = cleric({
      spellState: { "srd:class:cleric": { known: [], prepared: [], usedSlots: [0, 3], favorites: [] } },
    });
    const plan = planRest(c, deriveSheet(c, compendium), "short");
    expect(plan.nothingToDo).toBe(true);
    // Die Nachtruhe am selben Bogen hätte sehr wohl etwas zu tun.
    expect(planRest(c, deriveSheet(c, compendium), "full").nothingToDo).toBe(false);
  });

  it("Ohne Angabe ist es die Nachtruhe", () => {
    const c = cleric({
      spellState: { "srd:class:cleric": { known: [], prepared: [], usedSlots: [1], favorites: [] } },
    });
    expect(planRest(c, deriveSheet(c, compendium)).scope).toBe("full");
  });

  it("Zurücknehmen stellt genau den Stand von vorher wieder her", () => {
    const c = cleric({
      spellState: { "srd:class:cleric": { known: [], prepared: [], usedSlots: [0, 2, 1], favorites: [] } },
      trackers: [
        { id: "t1", name: "Untote vertreiben", kind: "counter", value: 1, suggestedFrom: "turn-undead", maxManual: false },
      ],
    });
    const plan = planRest(c, deriveSheet(c, compendium));
    const undo = snapshotForRest(c, plan);
    applyRest(c, plan);
    expect(c.spellState["srd:class:cleric"]?.usedSlots).toEqual([]);
    expect(c.trackers[0]?.value).toBe(4);

    undoRest(c, undo);
    expect(c.spellState["srd:class:cleric"]?.usedSlots).toEqual([0, 2, 1]);
    expect(c.trackers[0]?.value).toBe(1);
  });

  it("Die Rücknahme fasst nur an, was die Rast angefasst hat", () => {
    /*
      Wichtig für den Abgleich: zwischen Rast und Rücknahme kann auf dem iPad etwas
      passiert sein. Eine ganze Kopie zurückzuschreiben würde das überschreiben —
      deshalb hält die Momentaufnahme nur die berührten Felder.
    */
    const c = cleric({
      spellState: { "srd:class:cleric": { known: [], prepared: [], usedSlots: [0, 2], favorites: [] } },
    });
    const plan = planRest(c, deriveSheet(c, compendium));
    const undo = snapshotForRest(c, plan);
    applyRest(c, plan);
    // Inzwischen ein Treffer und ein neuer Zähler, von woanders.
    c.hp.damage = 7;
    c.trackers.push({ id: "neu", name: "Von unterwegs", kind: "counter", value: 2, maxManual: false });
    undoRest(c, undo);
    expect(c.hp.damage).toBe(7);
    expect(c.trackers.map((t) => t.name)).toEqual(["Von unterwegs"]);
  });

  it("Ein Zähler, der zwischen Ansage und Ausführung verschwindet, bringt nichts zum Absturz", () => {
    const c = cleric({
      trackers: [
        { id: "t1", name: "Untote vertreiben", kind: "counter", value: 0, suggestedFrom: "turn-undead", maxManual: false },
      ],
    });
    const plan = planRest(c, deriveSheet(c, compendium));
    c.trackers = [];
    expect(() => applyRest(c, plan)).not.toThrow();
  });
});
