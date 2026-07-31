import { describe, expect, it } from "vitest";
import { CARD_TIERS, cardTier, fitsWithoutScrolling } from "./cardTier.js";

/**
 * Die Kartenstufen der Startseite.
 *
 * Der Anlass, wörtlich: „sobald der Bildschirm voll ist, werden die etwas kleiner,
 * sodass immer alle Charaktere angezeigt werden." Auf Rückfrage entschieden: in
 * Stufen kleiner werden, ab etwa zehn dann scrollen.
 *
 * Diese Tests halten die GRENZEN fest, nicht die Rechnung — wenn jemand später eine
 * Karte höher macht, soll hier auffallen, dass dafür ein Bogen weniger auf den
 * Schirm geht.
 */
describe("Die Karten werden kleiner, bevor gescrollt wird", () => {
  const key = (rows: number, sections: number) => cardTier(rows, sections).key;

  it("Bei zwei Kampagnen: 1–4 sehr groß, 5 groß, 6–7 mittel, ab 8 kompakt", () => {
    /*
      Sein wahrscheinlichster Fall — zwei Tische, ein paar Bögen je Tisch. Dass
      „groß" nur für genau fünf gilt, ist kein Versehen: jede Sprosse gibt es, weil
      die darüber nicht mehr passt, nicht weil sie eine runde Anzahl abdeckt.
    */
    expect([1, 2, 3, 4].map((n) => key(n, 2))).toEqual(["xl", "xl", "xl", "xl"]);
    expect(key(5, 2)).toBe("gross");
    expect([6, 7].map((n) => key(n, 2))).toEqual(["mittel", "mittel"]);
    expect([8, 9].map((n) => key(n, 2))).toEqual(["kompakt", "kompakt"]);
  });

  it("Ab etwa zehn Bögen wird gescrollt — seine Entscheidung", () => {
    /*
      Die kleinste Stufe kommt auch dann zurück, wenn sie nicht mehr passt. Noch
      kleiner zu werden hieße, die Karten unlesbar zu machen, um ein Scrollen zu
      vermeiden, das niemand störend findet.
    */
    expect(key(10, 2)).toBe("kompakt");
    expect(key(30, 2)).toBe("kompakt");
    expect(fitsWithoutScrolling(cardTier(9, 2), 9, 2)).toBe(true);
    expect(fitsWithoutScrolling(cardTier(10, 2), 10, 2)).toBe(false);
  });

  it("Eine Kampagne mehr kippt die Stufe — darum wird gerechnet und nicht geraten", () => {
    /*
      Der eigentliche Grund für die Rechnung. Fünf Bögen in zwei Kampagnen passen
      groß; dieselben fünf in drei Kampagnen nicht mehr, weil eine Überschrift und
      ein Abstand dazukommen. Eine festgeklopfte Tabelle „bis 5 groß" würde hier
      die unterste Karte abschneiden.
    */
    expect(key(5, 2)).toBe("gross");
    expect(key(5, 3)).toBe("mittel");
  });

  it("Ein einziger Abschnitt braucht keine Überschrift und gewinnt dadurch Platz", () => {
    // Ohne Kampagnen gibt es nur eine Gruppe, und die beschriftet sich nicht selbst.
    expect(fitsWithoutScrolling(CARD_TIERS[2]!, 7, 1)).toBe(true);
    expect(key(10, 1)).toBe("kompakt");
    expect(fitsWithoutScrolling(cardTier(10, 1), 10, 1)).toBe(true);
  });

  it("Eine leere Liste stürzt nicht ab und nimmt die größte Stufe", () => {
    expect(key(0, 0)).toBe("xl");
  });

  it("Jede Stufe ist wirklich kleiner als die vorige", () => {
    // Sonst wäre die Reihenfolge in CARD_TIERS eine Lüge, und die Schleife in
    // `cardTier` würde eine Stufe nie erreichen.
    const pitches = CARD_TIERS.map((tier) => tier.pitch);
    expect(pitches).toEqual([...pitches].sort((a, b) => b - a));
    expect(new Set(pitches).size).toBe(pitches.length);
  });
});
