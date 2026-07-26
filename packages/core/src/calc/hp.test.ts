import { describe, expect, it } from "vitest";
import { applyHpChange, type HpState } from "./hp.js";

const state = (overrides: Partial<HpState> = {}): HpState => ({
  damage: 0,
  nonlethal: 0,
  temp: 0,
  ...overrides,
});

describe("applyHpChange", () => {
  it("Schaden erhöht den Schaden", () => {
    expect(applyHpChange(state(), "damage", 7)).toEqual(state({ damage: 7 }));
    expect(applyHpChange(state({ damage: 3 }), "damage", 4)).toEqual(state({ damage: 7 }));
  });

  it("Schaden geht ZUERST gegen temporäre TP (3.5)", () => {
    // 8 Schaden auf 5 temporäre TP: die 5 sind weg, 3 echter Schaden.
    expect(applyHpChange(state({ temp: 5 }), "damage", 8)).toEqual(state({ damage: 3, temp: 0 }));
    // Kleiner Schaden bleibt ganz im Puffer.
    expect(applyHpChange(state({ temp: 5 }), "damage", 2)).toEqual(state({ temp: 3 }));
    // Genau aufgebraucht.
    expect(applyHpChange(state({ temp: 5 }), "damage", 5)).toEqual(state({ temp: 0 }));
    // Bestehender Schaden bleibt unangetastet.
    expect(applyHpChange(state({ damage: 10, temp: 4 }), "damage", 6)).toEqual(
      state({ damage: 12, temp: 0 }),
    );
  });

  it("Heilung baut nichttödlichen Schaden zuerst ab", () => {
    expect(applyHpChange(state({ damage: 10, nonlethal: 4 }), "heal", 3)).toEqual(
      state({ damage: 10, nonlethal: 1 }),
    );
    // Überschuss geht auf den echten Schaden.
    expect(applyHpChange(state({ damage: 10, nonlethal: 4 }), "heal", 6)).toEqual(
      state({ damage: 8, nonlethal: 0 }),
    );
  });

  it("Heilung fällt nicht unter 0", () => {
    expect(applyHpChange(state({ damage: 3 }), "heal", 99)).toEqual(state());
    expect(applyHpChange(state(), "heal", 5)).toEqual(state());
  });

  it("Heilung lässt temporäre TP unberührt", () => {
    expect(applyHpChange(state({ damage: 5, temp: 4 }), "heal", 5)).toEqual(state({ temp: 4 }));
  });

  it("temporäre TP werden addiert", () => {
    expect(applyHpChange(state({ temp: 3 }), "temp", 5)).toEqual(state({ temp: 8 }));
  });

  it("nichttödlicher Schaden zählt getrennt", () => {
    expect(applyHpChange(state({ damage: 2 }), "nonlethal", 6)).toEqual(
      state({ damage: 2, nonlethal: 6 }),
    );
  });

  it("Betrag 0 oder negativ ändert nichts", () => {
    const before = state({ damage: 4, temp: 2, nonlethal: 1 });
    expect(applyHpChange(before, "damage", 0)).toBe(before);
    expect(applyHpChange(before, "heal", 0)).toBe(before);
    expect(applyHpChange(before, "damage", -5)).toBe(before);
  });

  it("Bruchteile fallen weg statt in den Zustand zu wandern", () => {
    expect(applyHpChange(state(), "damage", 3.9)).toEqual(state({ damage: 3 }));
  });

  it("mutiert den übergebenen Zustand nicht", () => {
    const before = state({ damage: 4, temp: 5 });
    applyHpChange(before, "damage", 10);
    expect(before).toEqual(state({ damage: 4, temp: 5 }));
  });

  it("Runde am Tisch: Puffer, Treffer, Heilung", () => {
    let hp = state({ damage: 26 }); // 36/62 wie im Fight-Club-Import
    hp = applyHpChange(hp, "temp", 5); // Aid: +5 temporäre TP
    expect(hp).toEqual(state({ damage: 26, temp: 5 }));
    hp = applyHpChange(hp, "damage", 8); // Treffer: 5 aus dem Puffer, 3 echt
    expect(hp).toEqual(state({ damage: 29, temp: 0 }));
    hp = applyHpChange(hp, "heal", 10); // Cure Moderate Wounds
    expect(hp).toEqual(state({ damage: 19 }));
  });
});
