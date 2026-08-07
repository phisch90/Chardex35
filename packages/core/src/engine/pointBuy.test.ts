import { describe, expect, it } from "vitest";
import {
  POINT_BUY_COST,
  POINT_BUY_MAX,
  pointBuyCost,
  pointBuySpent,
  pointBuyState,
  suggestPointBuy,
} from "./pointBuy.js";
import type { Advice } from "./advice.js";
import type { Ability } from "../schema/common.js";

const base = (werte: Partial<Record<Ability, number>>): Record<Ability, number> => ({
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
  ...werte,
});

describe("Punktekauf — die Tabelle", () => {
  it("8 ist gratis, und ab 15 wird es teuer", () => {
    expect(pointBuyCost(8)).toBe(0);
    expect(pointBuyCost(14)).toBe(6);
    // Der Sprung, um den es beim Punktekauf überhaupt geht: 14 → 15 kostet 2, nicht 1.
    expect(pointBuyCost(15) - pointBuyCost(14)).toBe(2);
    expect(pointBuyCost(18) - pointBuyCost(17)).toBe(3);
    expect(pointBuyCost(18)).toBe(16);
  });

  it("die Standardwerte des Assistenten sind genau 25 Punkte", () => {
    /*
      Der Knopf „Standardwerte" setzt 15/14/13/12/10/8. Dass das die übliche Vorgabe
      von 25 Punkten ist, war bisher eine Behauptung — jetzt ist es geprüft, und die
      App kann es ihm bestätigen statt es ihn glauben zu lassen.
    */
    expect(pointBuySpent(base({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }))).toBe(25);
  });

  it("unter der Tabelle gibt jeder Punkt einen zurück", () => {
    expect(pointBuyCost(7)).toBe(-1);
    expect(pointBuyCost(6)).toBe(-2);
    expect(pointBuyCost(3)).toBe(-5);
  });

  it("über der Tabelle wird weitergezählt, statt eine Lücke zu lassen", () => {
    /*
      Die Tabelle des Regelwerks endet bei 18. Diese App warnt statt zu sperren, also
      braucht auch eine getippte 19 eine Zahl — sonst stünde im Assistenten ein Strich,
      wo eine Auskunft hingehört. Die Fortsetzung ist die des Programms: die Schritte
      wachsen weiter wie in der Tabelle.
    */
    expect(pointBuyCost(19)).toBe(20);
    expect(pointBuyCost(20)).toBe(24);
    expect(pointBuyCost(21)).toBeGreaterThan(pointBuyCost(20));
    // Und sie bleibt monoton — ein teurerer Wert darf nie billiger sein.
    for (let value = 4; value < 25; value++) {
      expect(pointBuyCost(value + 1)).toBeGreaterThan(pointBuyCost(value));
    }
  });

  it("jeder Wert der Buchtabelle steht auch in der Funktion", () => {
    for (const [score, cost] of Object.entries(POINT_BUY_COST)) {
      expect(pointBuyCost(Number(score))).toBe(cost);
    }
  });
});

describe("Punktekauf — der Stand", () => {
  it("ohne Budget zählt die App nichts", () => {
    // Seine Entscheidung: aus, bis er es setzt. `null` heißt „kein Wort dazu".
    expect(pointBuyState(base({}), undefined)).toBeNull();
    expect(pointBuyState(base({}), 0)).toBeNull();
  });

  it("nennt beide Richtungen mit EINER Zahl", () => {
    const passt = pointBuyState(base({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }), 25)!;
    expect(passt.spent).toBe(25);
    expect(passt.left).toBe(0);

    const übrig = pointBuyState(base({ str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }), 25)!;
    expect(übrig.left).toBeGreaterThan(0);

    const zuViel = pointBuyState(base({ str: 18, dex: 16, con: 14, int: 12, wis: 12, cha: 10 }), 25)!;
    expect(zuViel.left).toBeLessThan(0);
    // Und die Zahl ist wirklich die Differenz, nicht ein zweiter Zähler.
    expect(zuViel.left).toBe(zuViel.budget - zuViel.spent);
  });
});

describe("Punktekauf — der Verteilen-Knopf", () => {
  const kaempferRat: Advice = {
    abilities: [
      { ability: "str", why: "Angriff und Schaden", min: 15 },
      { ability: "con", why: "Trefferpunkte", min: 14 },
      { ability: "dex", why: "RK und Initiative" },
    ],
    skills: [],
  };

  it("gibt das Budget aus, ohne es zu überziehen", () => {
    for (const budget of [22, 25, 28, 32]) {
      const werte = suggestPointBuy(budget, kaempferRat);
      const spent = pointBuySpent(werte);
      expect(spent).toBeLessThanOrEqual(budget);
      /*
        Und er lässt nichts liegen, das noch etwas BRINGT. Die erste Fassung dieser
        Prüfung verlangte, dass gar kein Punkt übrig bleibt — damit gab der Vorschlag
        den letzten Punkt in ein STR 9, und das verbessert in 3.5 keinen Modifikator.
        Das Ziel ist also nicht „alles ausgeben", sondern „nichts verschwenden":
        übrig bleiben darf nur, was keinen geraden Wert mehr erreicht.
      */
      const übrig = budget - spent;
      const billigsterNützlicherSchritt = Math.min(
        ...(Object.keys(werte) as Ability[])
          .filter((a) => werte[a] + 2 <= POINT_BUY_MAX)
          .map((a) => pointBuyCost(werte[a] + 2) - pointBuyCost(werte[a])),
      );
      expect(übrig).toBeLessThan(billigsterNützlicherSchritt);
    }
  });

  it("hält die genannten Untergrenzen ein", () => {
    const werte = suggestPointBuy(28, kaempferRat);
    expect(werte.str).toBeGreaterThanOrEqual(15);
    expect(werte.con).toBeGreaterThanOrEqual(14);
  });

  it("bedient das Wichtigste zuerst", () => {
    const werte = suggestPointBuy(25, kaempferRat);
    // STR steht in der Empfehlung vor CON, CON vor DEX, und die drei vor dem Rest.
    expect(werte.str).toBeGreaterThanOrEqual(werte.con);
    expect(werte.con).toBeGreaterThanOrEqual(werte.int);
    expect(werte.dex).toBeGreaterThanOrEqual(werte.int);
  });

  it("kauft nie über 18 — darüber wird gewürfelt, nicht gekauft", () => {
    const werte = suggestPointBuy(200, kaempferRat);
    for (const value of Object.values(werte)) expect(value).toBeLessThanOrEqual(POINT_BUY_MAX);
  });

  it("kauft keinen krummen Wert ohne Grund", () => {
    /*
      8 und 9 geben beide −1: ein Punkt von 8 auf 9 kauft NICHTS. Krumm darf nur sein,
      was die Empfehlung ausdrücklich nennt (hier STR 15). Gefunden hat das ein Blatt
      mit allen Vorschlägen, kein Test.
    */
    for (const budget of [22, 25, 28, 32]) {
      const werte = suggestPointBuy(budget, kaempferRat);
      for (const [ability, value] of Object.entries(werte)) {
        if (value % 2 === 0) continue;
        const genannt = kaempferRat.abilities.find((a) => a.ability === ability)?.min;
        expect(genannt).toBe(value);
      }
    }
  });

  it("liefert zweimal dasselbe (kein Zufall im Knopf)", () => {
    expect(suggestPointBuy(25, kaempferRat)).toEqual(suggestPointBuy(25, kaempferRat));
  });

  it("kommt auch ohne Empfehlung zurecht", () => {
    // Ohne Klasse gibt es keine Empfehlung — dann verteilt er gleichmäßig statt zu werfen.
    const werte = suggestPointBuy(25, undefined);
    expect(pointBuySpent(werte)).toBeLessThanOrEqual(25);
    expect(Math.min(...Object.values(werte))).toBeGreaterThanOrEqual(8);
  });

  it("bei einem winzigen Budget bleibt alles auf dem Nullpunkt", () => {
    expect(suggestPointBuy(0, kaempferRat)).toEqual({
      str: 8,
      dex: 8,
      con: 8,
      int: 8,
      wis: 8,
      cha: 8,
    });
  });
});
