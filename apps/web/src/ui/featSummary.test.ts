import { describe, expect, it } from "vitest";
import { entitySchema, type Entity } from "@codex35/core";
import { featBonuses, featOneLiner } from "./featSummary.js";

/**
 * Die eine Zeile und die Bonus-Marken in der Talentwahl.
 *
 * Sein Auftrag, wörtlich: „Grundsätzlich sollte einfach bei der Wahl der Talente
 * klar sein was der Effekt und Bonus sind."
 */
const feat = (raw: Record<string, unknown>): Entity =>
  entitySchema.parse({ id: "t:feat:x", kind: "feat", name: "X", source: "srd", data: {}, ...raw });

describe("Ein Satz statt eines Absatzes", () => {
  it("Die deutsche Kurzfassung gewinnt", () => {
    const out = featOneLiner(
      feat({
        localized: { de: { summary: "Ein zweiter Angriff mit der Nebenhandwaffe, dieser mit −5." } },
        data: { benefit: "**Benefit:** In addition to the standard single extra attack…" },
      }),
    );
    expect(out).toEqual({
      text: "Ein zweiter Angriff mit der Nebenhandwaffe, dieser mit −5.",
      german: true,
    });
  });

  it("Ohne deutschen Text: der erste Satz des Originals, ohne das Benefit-Präfix", () => {
    /*
      152 der 327 Talente haben keine deutsche Kurzfassung. Für die stand vorher der
      GANZE englische Absatz in der Liste — bei dreißig Zeilen eine Textwand.
    */
    const out = featOneLiner(
      feat({
        data: {
          benefit:
            "**Benefit:** If you deal a creature enough damage to make it drop, you get an immediate, extra melee attack. You cannot take a 5-foot step before making this extra attack.",
        },
      }),
    );
    expect(out.german).toBe(false);
    expect(out.text).toBe(
      "If you deal a creature enough damage to make it drop, you get an immediate, extra melee attack.",
    );
  });

  it("Ein einzelner Satz ohne Satzzeichen am Ende bleibt ganz", () => {
    const out = featOneLiner(feat({ data: { benefit: "You get a +2 bonus on Listen checks" } }));
    expect(out.text).toBe("You get a +2 bonus on Listen checks");
  });

  it("Gar kein Text ergibt eine leere Zeile, keinen Absturz", () => {
    expect(featOneLiner(feat({ data: {} })).text).toBe("");
  });

  it("Ein Punkt in einer Abkürzung beendet den Satz nicht", () => {
    // „5-ft." mitten im Satz hat die naive Trennung am Punkt zerlegt.
    const out = featOneLiner(
      feat({ data: { benefit: "You can move 5 ft. as a free action. Then you attack." } }),
    );
    expect(out.text).toBe("You can move 5 ft. as a free action.");
  });
});

describe("Die Marken sagen, welche Zahl im Bogen ankommt", () => {
  it("Boni werden mit Vorzeichen und Ziel benannt", () => {
    const out = featBonuses(
      feat({
        effects: [
          { target: "hp.max", bonusType: "untyped", value: 3 },
          { target: "ac", bonusType: "dodge", value: 1 },
        ],
      }),
    );
    // Die Beschriftungen kommen aus MODIFIER_TARGETS — dieselbe Tabelle wie im
    // Modifikator-Editor, damit nicht zwei Wortlaute nebeneinander stehen.
    expect(out).toEqual(["+3 Max. Trefferpunkte", "+1 RK: Ausweichen"]);
  });

  it("Ein Talent, das nur mit einer gewählten Waffe wirkt, sagt das", () => {
    /*
      Kurzform, nicht die Beschriftung aus dem Gegenstands-Editor: dort heißt es
      „Nur dieser Gegenstand: Angriff", was am Talent Kauderwelsch wäre.
    */
    const out = featBonuses(
      feat({ effects: [{ target: "attack.self", bonusType: "enhancement", value: 1, scope: "chosenItem" }] }),
    );
    expect(out).toEqual(["+1 Angriff (gewählte Waffe)"]);
  });

  it(`Die Bonusart "untyped" hängt nicht mehr hinten dran`, () => {
    // Sie ist der Standardfall und sagt einem Leser nichts — vorher stand am
    // Weapon Specialization „+2 Nur dieser Gegenstand: Schaden (untyped)".
    const out = featBonuses(
      feat({ effects: [{ target: "damage.self", bonusType: "untyped", value: 2, scope: "chosenItem" }] }),
    );
    expect(out).toEqual(["+2 Schaden (gewählte Waffe)"]);
  });

  it("Reine Schalter erzeugen keine Marke — sie sind keine Zahl", () => {
    /*
      Weapon Finesse setzt einen Schalter, keinen Bonus. „+1 flag:weaponFinesse"
      wäre eine erfundene Zahl.
    */
    const out = featBonuses(
      feat({ effects: [{ target: "flag:weaponFinesse", bonusType: "untyped", value: 1 }] }),
    );
    expect(out).toEqual([]);
  });

  it("Ein Talent ohne Effekte hat keine Marken — und das ist eine Aussage", () => {
    // Cleave gibt einen zusätzlichen Angriff, keinen Bonus. Das soll man sehen.
    expect(featBonuses(feat({ effects: [] }))).toEqual([]);
  });
});
