import { describe, expect, it } from "vitest";
import { COINS_PER_POUND, carriedWeight, type CarryRow } from "./carry.js";

const leer = { pp: 0, gp: 0, sp: 0, cp: 0 };
const ohneMünzen = { countCoins: false };

const zeile = (id: string, weightLb: number, rest: Partial<CarryRow> = {}): CarryRow => ({
  id,
  weightLb,
  qty: 1,
  ...rest,
});

describe("Traglast — die Summe", () => {
  it("nimmt Gewicht mal Menge", () => {
    const block = carriedWeight(
      [zeile("a", 3, { qty: 4 }), zeile("b", 0.5, { qty: 2 })],
      leer,
      ohneMünzen,
    );
    expect(block.loadLb).toBe(13);
    expect(block.itemsLb).toBe(13);
  });

  it("zählt eine Zeile ohne bekanntes Gewicht als 0 und nicht als Fehler", () => {
    // Viele magische Gegenstände tragen im SRD gar kein Gewicht. Die App warnt
    // statt zu sperren — eine fehlende Zahl ist keine.
    expect(carriedWeight([zeile("a", 0)], leer, ohneMünzen).loadLb).toBe(0);
  });
});

describe("Traglast — Behälter", () => {
  const rucksack = zeile("ruck", 2, { container: { weightless: false } });
  const sack = zeile("magisch", 15, { container: { weightless: true } });

  it("ein gewöhnlicher Behälter ändert an der Summe nichts", () => {
    const block = carriedWeight(
      [rucksack, zeile("seil", 10, { containerId: "ruck" })],
      leer,
      ohneMünzen,
    );
    // 2 lb Rucksack + 10 lb Seil. Einpacken macht nichts leichter.
    expect(block.loadLb).toBe(12);
    expect(block.weightlessLb).toBe(0);
  });

  it("sagt je Behälter, was darin liegt", () => {
    const block = carriedWeight(
      [
        rucksack,
        zeile("seil", 10, { containerId: "ruck" }),
        zeile("ration", 1, { qty: 4, containerId: "ruck" }),
        zeile("schwert", 4),
      ],
      leer,
      ohneMünzen,
    );
    expect(block.containers).toEqual([{ id: "ruck", contentLb: 14, rows: 2, weightless: false }]);
    // Der Behälter selbst zählt NICHT zu seinem Inhalt.
    expect(block.loadLb).toBe(2 + 14 + 4);
  });

  it("der Sack der Bewahrung nimmt den INHALT heraus, sich selbst nicht", () => {
    const block = carriedWeight(
      [sack, zeile("amboss", 100, { containerId: "magisch" })],
      leer,
      ohneMünzen,
    );
    // Die 15 lb des Sacks bleiben — gewichtslos ist der Inhalt, nicht der Beutel.
    // Wer das verwechselt, verschenkt am Tisch ein paar Pfund und merkt es nie.
    expect(block.loadLb).toBe(15);
    expect(block.weightlessLb).toBe(100);
    expect(block.containers[0]).toEqual({
      id: "magisch",
      contentLb: 100,
      rows: 1,
      weightless: true,
    });
  });

  it("eine Kennung ins Leere heißt „am Körper", () => {
    /*
      Der Fall, der wirklich vorkommt: der Rucksack wird gelöscht, sein Inhalt
      zeigt noch auf ihn. Die Zeilen dürfen dabei nicht verschwinden und ihr
      Gewicht auch nicht — sonst wird ein Bogen durch ein Löschen leichter.
    */
    const block = carriedWeight([zeile("seil", 10, { containerId: "weg" })], leer, ohneMünzen);
    expect(block.loadLb).toBe(10);
    expect(block.containers).toEqual([]);
  });

  it("ein Behälter liegt nie in einem anderen — kein Kreis möglich", () => {
    /*
      Zwei Behälter, die aufeinander zeigen. Ohne die Regel „ein Behälter liegt
      immer am Körper" bräuchte die Rechnung einen Zykluswächter; mit ihr terminiert
      sie von allein, und beide zählen genau einmal.
    */
    const block = carriedWeight(
      [
        zeile("a", 2, { container: { weightless: false }, containerId: "b" }),
        zeile("b", 3, { container: { weightless: true }, containerId: "a" }),
      ],
      leer,
      ohneMünzen,
    );
    expect(block.loadLb).toBe(5);
    expect(block.weightlessLb).toBe(0);
    for (const container of block.containers) expect(container.contentLb).toBe(0);
  });
});

describe("Traglast — Münzen", () => {
  const beutel = { pp: 0, gp: 500, sp: 0, cp: 0 };

  it("zählen nur mit der Hausregel", () => {
    expect(carriedWeight([], beutel, { countCoins: false }).coinLb).toBe(0);
    expect(carriedWeight([], beutel, { countCoins: true }).coinLb).toBe(10);
  });

  it("50 Münzen sind ein Pfund, ganz gleich welche Sorte", () => {
    // Ein Kupferstück wiegt so viel wie ein Platinstück. Steht so im Buch und
    // überrascht am Tisch regelmäßig.
    expect(COINS_PER_POUND).toBe(50);
    const gemischt = { pp: 10, gp: 10, sp: 10, cp: 20 };
    expect(carriedWeight([], gemischt, { countCoins: true }).coinLb).toBe(1);
  });

  it("wird aufgerundet, nicht abgeschnitten", () => {
    /*
      56 Münzen sind mehr als ein Pfund. Wer auf 1 lb abschneidet, gibt Gewicht
      her, das der DM gleich wieder dazurechnet — und an einer Lastgrenze ist genau
      diese Richtung die Frage.
    */
    expect(carriedWeight([], { pp: 0, gp: 45, sp: 0, cp: 11 }, { countCoins: true }).coinLb).toBe(2);
    expect(carriedWeight([], { pp: 0, gp: 1, sp: 0, cp: 0 }, { countCoins: true }).coinLb).toBe(1);
    expect(carriedWeight([], leer, { countCoins: true }).coinLb).toBe(0);
  });

  it("stehen in der Summe UND einzeln da", () => {
    const block = carriedWeight([zeile("schwert", 4)], beutel, { countCoins: true });
    expect(block.loadLb).toBe(14);
    expect(block.itemsLb).toBe(4);
    expect(block.coinLb).toBe(10);
    // Die Summe ist wirklich die Summe und kein dritter Zähler.
    expect(block.loadLb).toBe(block.itemsLb + block.coinLb);
  });
});
