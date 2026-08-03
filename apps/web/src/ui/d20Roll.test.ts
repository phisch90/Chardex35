import { describe, expect, it } from "vitest";
import { parseDice } from "@codex35/core";
import { d20Roll } from "./bits.js";

/**
 * Der Würfelknopf und der Würfelparser müssen zusammenpassen.
 *
 * Gefunden beim Aufräumen der halben Fertigkeitsränge, und es ist die Fehlerfamilie
 * „eine Anzeige, die etwas weiß, und eine Aktion, die es nicht kann": liegt am Bogen ein
 * halber Rang, ist der Gesamtwert krumm (2,5 Ränge + DEX 2 = 4,5). Die Anzeige baute
 * daraus „1d20+4.5" — `parseDice` kennt keine Dezimalstellen, gibt `null` zurück, und
 * `diceStore.roll` verschluckt das mit einem stillen `return null`. Der Knopf tat nichts,
 * ohne ein Wort dazu.
 *
 * Deshalb prüft dieser Test nicht die Zeichenkette allein, sondern die STRECKE: was
 * `d20Roll` baut, muss `parseDice` auch lesen können. Ein Test nur auf den Text hätte
 * genau den Fehler durchgelassen, um den es hier geht.
 */
describe("d20Roll", () => {
  it("baut die gewohnten Ausdrücke", () => {
    expect(d20Roll(0)).toBe("1d20+0");
    expect(d20Roll(7)).toBe("1d20+7");
    expect(d20Roll(-2)).toBe("1d20-2");
  });

  it("rundet einen krummen Gesamtwert ab — wie überall in 3.5", () => {
    expect(d20Roll(4.5)).toBe("1d20+4");
    expect(d20Roll(-1.5)).toBe("1d20-2");
  });

  it("liefert für JEDEN Wert etwas, das der Würfelparser lesen kann", () => {
    for (const mod of [0, 1, 4, 4.5, 7.5, -1, -1.5, -0.5, 12.5, 23]) {
      const expression = d20Roll(mod);
      expect(parseDice(expression), `${mod} → ${expression}`).not.toBeNull();
    }
  });

  it("verliert den Wurf selbst nicht: 1d20 bleibt drin", () => {
    const parsed = parseDice(d20Roll(4.5));
    expect(parsed?.terms).toEqual([{ sign: 1, count: 1, sides: 20 }]);
    expect(parsed?.modifier).toBe(4);
  });
});
