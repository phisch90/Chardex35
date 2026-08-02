import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { refillOf, resetToOf } from "./trackers.js";
import { planRest } from "./rest.js";
import type { DerivedSheet } from "./types.js";

/**
 * „Füllt sich bei der Rast“ — jetzt ein FELD statt einer Ableitung.
 *
 * Seine Antwort: „ja, bzw soll man das selber einstellen können.“ Vorher entschied
 * `planRest` nach `suggestedFrom`: aus einem Vorschlag der App entstanden = füllt
 * sich. Bei „Aktionspunkte“ kannte die App die Regel nicht und sagte das — obwohl
 * sein Tisch sie kennt.
 *
 * Der heikle Teil ist der RÜCKFALL. Das Feld ist neu, jeder gespeicherte Zähler hat
 * es nicht, und ein falscher Standardwert hätte seine kurze Pause stillgelegt — ohne
 * Fehlermeldung, denn eine Rast, die nichts füllt, sieht aus wie eine Rast. Genau
 * das hat ein Test gefangen, und deshalb steht es hier noch einmal ausdrücklich.
 */
const sheet = {
  spellcasting: [],
  abilities: {},
  classLevels: [],
  extraUses: {},
  featIds: [],
  totalLevel: 1,
} as unknown as DerivedSheet;

const C = (trackers: unknown[]): Character =>
  characterSchema.parse({
    id: "t",
    name: "T",
    raceId: "srd:race:human",
    abilities: { base: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } },
    trackers,
  });

const counter = (extra: Record<string, unknown>) => ({
  id: "c1",
  name: "Zähler",
  kind: "counter",
  value: 0,
  max: 3,
  maxManual: true,
  ...extra,
});

describe("Füllt sich bei der Rast", () => {
  it("nichts gesagt und aus einem Vorschlag: wie bisher, auch bei der kurzen Pause", () => {
    /*
      DAS ist die Zusage an die Vergangenheit. „Kurze Pause (nur Tageszähler)“ war
      seine Entscheidung; ein Rückfall auf „nur 8 Stunden“ hätte sie kassiert.
    */
    expect([...refillOf({ suggestedFrom: "turn-undead" })].sort()).toEqual(["long", "short"]);
    const character = C([counter({ suggestedFrom: "turn-undead" })]);
    expect(planRest(character, sheet, "short").trackers).toHaveLength(1);
    expect(planRest(character, sheet, "full").trackers).toHaveLength(1);
  });

  it("nichts gesagt und selbst angelegt: bleibt in Ruhe, wie bisher", () => {
    expect(refillOf({}).size).toBe(0);
    const character = C([counter({})]);
    expect(planRest(character, sheet, "full").trackers).toEqual([]);
    expect(planRest(character, sheet, "full").skipped).toEqual([
      { name: "Zähler", reason: "eigene Mechanik" },
    ]);
  });

  it("„nie“ gewinnt auch gegen einen Vorschlag — seine Entscheidung zählt", () => {
    const character = C([counter({ suggestedFrom: "turn-undead", refill: "never" })]);
    expect(planRest(character, sheet, "full").trackers).toEqual([]);
  });

  it("„long“: füllt sich nachts, NICHT in der kurzen Pause", () => {
    /*
      Der eigentliche Gewinn des Feldes: ein Zähler lässt sich auf acht Stunden
      beschränken. Im Regelwerk ist das der Normalfall — die kurze Pause ist die
      Hausregel seines Tisches.
    */
    const character = C([counter({ refill: "long" })]);
    expect(planRest(character, sheet, "full").trackers).toHaveLength(1);
    const short = planRest(character, sheet, "short");
    expect(short.trackers).toEqual([]);
    expect(short.skipped).toEqual([{ name: "Zähler", reason: "erst nach acht Stunden" }]);
  });

  it("„short“: füllt sich bei beidem — kurz schließt lang ein", () => {
    const character = C([counter({ refill: "short" })]);
    expect(planRest(character, sheet, "short").trackers).toHaveLength(1);
    expect(planRest(character, sheet, "full").trackers).toHaveLength(1);
  });

  it("ein selbst angelegter Zähler lässt sich einschalten — sein Fall „Aktionspunkte“", () => {
    /*
      Vorher unmöglich: die App entschied nach `suggestedFrom`, und „Aktionspunkte“
      hat keinen Vorschlag. Der Zähler blieb liegen, mit dem Satz „eigene Mechanik“.
    */
    const character = C([counter({ name: "Aktionspunkte", refill: "short" })]);
    const plan = planRest(character, sheet, "short");
    expect(plan.trackers).toEqual([{ id: "c1", name: "Aktionspunkte", from: 0, to: 3 }]);
    expect(plan.skipped).toEqual([]);
  });

  it("ohne Grenze füllt sich nichts, egal was eingestellt ist", () => {
    // Ein Zähler ohne Obergrenze hat kein „voll“ — und eine erfundene Grenze wäre
    // schlimmer als keine.
    const character = C([{ ...counter({ refill: "short" }), max: undefined }]);
    expect(planRest(character, sheet, "full").skipped).toEqual([
      { name: "Zähler", reason: "keine Grenze" },
    ]);
  });

  it("ein fester Wert und ein Würfelwurf füllen sich NIE", () => {
    /*
      Ein `roll`-Zähler hält den letzten Würfelwurf. Ihn auf ein Maximum zu setzen
      hieße, einen Wurf zu erfinden, den niemand gemacht hat.
    */
    const character = C([
      { ...counter({ refill: "short" }), id: "v", kind: "value" },
      { ...counter({ refill: "short" }), id: "r", kind: "roll", formula: "1d6" },
    ]);
    const plan = planRest(character, sheet, "full");
    expect(plan.trackers).toEqual([]);
    expect(plan.skipped).toEqual([]);
  });

  it("die Ansage nennt jeden übersprungenen Zähler mit Grund", () => {
    /*
      Ein Zähler, der stillschweigend nicht mitrastet, ist genau das, was ihn an
      „Aktionspunkte“ gestört hat.
    */
    const character = C([
      { ...counter({}), id: "a", name: "Eigen" },
      { ...counter({ refill: "long" }), id: "b", name: "Nur nachts" },
      { ...counter({ refill: "short" }), id: "c", name: "Voll", value: 3 },
    ]);
    const plan = planRest(character, sheet, "short");
    expect(plan.skipped).toEqual([
      { name: "Eigen", reason: "eigene Mechanik" },
      { name: "Nur nachts", reason: "erst nach acht Stunden" },
      { name: "Voll", reason: "schon voll" },
    ]);
    expect(plan.nothingToDo).toBe(true);
  });

  // ============ Die zweite Runde: Menge, Stufenaufstieg, Richtung ===========

  it("die AUSGELIEFERTE erste Fassung des Feldes gilt weiter", () => {
    /*
      `"long" | "short" | "never"` steht auf seinem Gerät in den Zählern — die erste
      Fassung war schon live. Sie hier zu übersetzen statt die Datenbank umzubauen
      ist die kleinere Wunde; ein zweites Feld daneben wären zwei Wahrheiten.
    */
    expect([...refillOf({ refill: "long" })]).toEqual(["long"]);
    expect([...refillOf({ refill: "short" })].sort()).toEqual(["long", "short"]);
    expect(refillOf({ refill: "never" }).size).toBe(0);
    // Und der Vorschlag darf den ausdrücklichen Wert nicht überstimmen.
    expect(refillOf({ refill: "never", suggestedFrom: "turn-undead" }).size).toBe(0);
  });

  it("mehrere Bedingungen zugleich — sein Fall „lange Rast ODER Stufenaufstieg“", () => {
    const set = refillOf({ refill: ["long", "levelUp"] });
    expect([...set].sort()).toEqual(["levelUp", "long"]);
  });

  it("kurze Pause schließt die lange Rast IMMER ein", () => {
    /*
      Der Zustand „nur kurze Pause, aber nicht die lange Rast“ hat am Tisch keinen
      Sinn. Er wird deshalb nicht abgefangen, sondern ist gar nicht herstellbar.
    */
    expect([...refillOf({ refill: ["short"] })].sort()).toEqual(["long", "short"]);
    expect([...refillOf({ refill: ["short", "levelUp"] })].sort()).toEqual([
      "levelUp",
      "long",
      "short",
    ]);
  });

  it("leere Liste heißt ausdrücklich „nie“ — auch mit Vorschlag", () => {
    expect(refillOf({ refill: [], suggestedFrom: "turn-undead" }).size).toBe(0);
  });

  it("nur beim Stufenaufstieg: keine Rast fasst ihn an, und sie sagt warum", () => {
    const character = C([counter({ refill: ["levelUp"] })]);
    for (const scope of ["full", "short"] as const) {
      const plan = planRest(character, sheet, scope);
      expect(plan.trackers).toEqual([]);
      expect(plan.skipped).toEqual([
        {
          name: "Zähler",
          reason: scope === "short" ? "erst nach acht Stunden" : "nur beim Stufenaufstieg",
        },
      ]);
    }
  });

  it("„zurück auf 0“ zählt HERUNTER statt hoch — der Fehler, der da war", () => {
    /*
      Vorher setzte die Rast jeden Zähler auf sein MAXIMUM. Für „Aktionspunkte
      ausgegeben: 3" heißt das „alle ausgegeben“ — genau verkehrt.
    */
    const character = C([
      { ...counter({ refill: ["long"], resetTo: "zero" }), name: "Ausgegeben", value: 3 },
    ]);
    expect(planRest(character, sheet, "full").trackers).toEqual([
      { id: "c1", name: "Ausgegeben", from: 3, to: 0 },
    ]);
  });

  it("„auf 0“ braucht keine Obergrenze", () => {
    // Es gibt nichts zu wissen außer der Null — ein `max` wäre hier eine Hürde
    // ohne Zweck.
    const character = C([
      { ...counter({ refill: ["long"], resetTo: "zero" }), max: undefined, value: 2 },
    ]);
    const plan = planRest(character, sheet, "full");
    expect(plan.trackers).toHaveLength(1);
    expect(plan.skipped).toEqual([]);
  });

  it("„auf 0“ und schon 0: bleibt in Ruhe", () => {
    const character = C([counter({ refill: ["long"], resetTo: "zero", value: 0 })]);
    expect(planRest(character, sheet, "full").skipped).toEqual([
      { name: "Zähler", reason: "schon voll" },
    ]);
  });

  it("ohne Angabe wird weiter auf VOLL gesetzt", () => {
    // Ein stiller Wechsel auf 0 hätte jeden bestehenden Zähler geleert.
    expect(resetToOf({})).toBe("max");
    const character = C([counter({ refill: ["long"] })]);
    expect(planRest(character, sheet, "full").trackers).toEqual([
      { id: "c1", name: "Zähler", from: 0, to: 3 },
    ]);
  });
});
