import { describe, expect, it } from "vitest";
import {
  applySpellcraftCast,
  effectiveSpellLevel,
  spellcraftCastPlan,
  spellcraftExhaustionOf,
} from "./spellcraftCasting.js";
import { parseDice } from "../dice/dice.js";
import { planRest, applyRest, snapshotForRest, undoRest } from "./rest.js";
import type { Character } from "../schema/character.js";
import type { DerivedSheet, SpellcastingBlock } from "./types.js";

/*
  KOPFNOTIZ: keine deutschen Anfuehrungszeichen in dieser Datei — esbuild bricht
  sonst an einer voellig gesunden Zeile weiter unten ab (siebenmal bezahlt).

  Martins Blatt, die Zahlen: DC 12 + Grad, die 12 steigt mit JEDER Nutzung um den
  Grad (Philipps Klaerung: "Ermuedung bei jeder Nutzung"), lange Rast setzt auf 12
  zurueck. Crit-Reichweite je Grad waechst um die Bonus-Plaetze (Beispiel vom
  Blatt: 2 Bonus-Grad-1-Plaetze -> 18-20). Grad 0 zaehlt als Grad 1, Crit-Range
  dafuer +1 (Grundlage 19-20). Patzer: 1 Schaden je Grad zurueck.
*/

function fakeCharacter(exhaustion?: number): Character {
  return {
    spellcraftExhaustion: exhaustion,
    spellState: {},
    trackers: [],
    hp: { damage: 0, nonlethal: 0, temp: 0, stabilized: false },
  } as unknown as Character;
}

function fakeBlock(bonusAt1: number): SpellcastingBlock {
  return {
    classId: "srd:class:cleric",
    className: "Cleric",
    model: "prepared",
    ability: "wis",
    abilityMod: 3,
    casterLevel: { total: 6, contributions: [] },
    dcBase: 13,
    slots: [
      { level: 0, base: 5, bonus: 0, domain: 0, total: 5, used: 0 },
      { level: 1, base: 4, bonus: bonusAt1, domain: 1, total: 5 + bonusAt1, used: 0 },
      { level: 2, base: 3, bonus: 1, domain: 1, total: 5, used: 0 },
    ],
    spellsKnown: undefined,
    spellListId: "srd:spelllist:cleric",
    usesSpellbook: false,
    domainPick: 2,
    domains: [],
  };
}

function fakeSheet(spellcraftTotal: number | null): DerivedSheet {
  return {
    skills: [
      spellcraftTotal === null
        ? {
            skillId: "srd:skill:spellcraft",
            key: "srd:skill:spellcraft",
            subtyped: false,
            name: "Spellcraft",
            usable: false,
            total: { total: 0, contributions: [] },
            ranks: 0,
          }
        : {
            skillId: "srd:skill:spellcraft",
            key: "srd:skill:spellcraft",
            subtyped: false,
            name: "Spellcraft",
            usable: true,
            total: { total: spellcraftTotal, contributions: [] },
            ranks: 5,
          },
    ],
  } as unknown as DerivedSheet;
}

describe("spellcraftCastPlan — die Zahlen vom Blatt", () => {
  it("erste Probe des Tages: DC 12 + Grad", () => {
    const plan = spellcraftCastPlan(fakeCharacter(), fakeSheet(9), fakeBlock(0), 2);
    expect(plan.dc).toBe(14);
    expect(plan.exhaustion).toBe(0);
    expect(plan.exhaustionAfter).toBe(2);
    expect(plan.checkBonus).toBe(9);
    expect(plan.roll).toBe("1d20+9");
  });

  it("die Ermuedung steigt bei JEDER Nutzung — Philipps Klaerung, nicht nur beim Fehlschlag", () => {
    const character = fakeCharacter();
    const first = spellcraftCastPlan(character, fakeSheet(9), fakeBlock(0), 2);
    applySpellcraftCast(character, first);
    expect(spellcraftExhaustionOf(character)).toBe(2);
    // Der naechste Grad-1-Zauber prueft gegen 12 + 2 + 1 = 15.
    const second = spellcraftCastPlan(character, fakeSheet(9), fakeBlock(0), 1);
    expect(second.dc).toBe(15);
    applySpellcraftCast(character, second);
    expect(spellcraftExhaustionOf(character)).toBe(3);
  });

  it("Grad 0 zaehlt als Grad 1: Ermuedung, DC und Patzer-Schaden", () => {
    expect(effectiveSpellLevel(0)).toBe(1);
    const plan = spellcraftCastPlan(fakeCharacter(), fakeSheet(9), fakeBlock(0), 0);
    expect(plan.dc).toBe(13);
    expect(plan.exhaustionAfter).toBe(1);
    expect(plan.critFailDamage).toBe(1);
  });

  /*
    Das Beispiel WOERTLICH vom Blatt: "With 2 level-1 bonus spell-slot, the caster
    has crit-range of 18-20 for spellcasting by spellcraft." Und die Gegenprobe
    ohne Bonus, sonst waere die Rechnung nie gegen eine zweite Zahl gelaufen.
  */
  it("Crit-Reichweite: Bonus-Plaetze weiten sie (2 Bonus -> 18-20, 0 Bonus -> 20)", () => {
    expect(spellcraftCastPlan(fakeCharacter(), fakeSheet(9), fakeBlock(2), 1).critFrom).toBe(18);
    expect(spellcraftCastPlan(fakeCharacter(), fakeSheet(9), fakeBlock(0), 1).critFrom).toBe(20);
  });

  it("Grad 0 hat die Grundlage 19-20 — der eigene +1 vom Blatt", () => {
    expect(spellcraftCastPlan(fakeCharacter(), fakeSheet(9), fakeBlock(0), 0).critFrom).toBe(19);
  });

  /*
    Kein toter Wuerfelknopf: was der Plan als Wurf nennt, muss `parseDice` lesen —
    genau an dieser Strecke ist schon einmal ein Knopf entstanden, der wortlos
    nichts tat (halbe Raenge, "1d20+4.5").
  */
  it("der Wurf geht durch parseDice — auch mit negativem Bonus", () => {
    const plan = spellcraftCastPlan(fakeCharacter(), fakeSheet(9), fakeBlock(0), 1);
    expect(parseDice(plan.roll!)).not.toBeNull();
    const negative = spellcraftCastPlan(fakeCharacter(), fakeSheet(-1), fakeBlock(0), 1);
    expect(negative.roll).toBe("1d20-1");
    expect(parseDice(negative.roll!)).not.toBeNull();
  });

  it("ohne brauchbares Spellcraft gibt es KEINEN Wurf — gewarnt, nicht gesperrt", () => {
    const plan = spellcraftCastPlan(fakeCharacter(), fakeSheet(null), fakeBlock(0), 1);
    expect(plan.checkBonus).toBeNull();
    expect(plan.roll).toBeNull();
    // Die Rechnung steht trotzdem da — der DM kann es erlauben.
    expect(plan.dc).toBe(13);
  });
});

describe("die lange Rast setzt die Ermuedung zurueck", () => {
  const sheet = {
    spellcasting: [],
    skills: [],
  } as unknown as DerivedSheet;

  it("voll: Ermuedung steht im Plan und wird geloescht — die kurze Pause laesst sie stehen", () => {
    const character = fakeCharacter(5);
    const short = planRest(character, sheet, "short");
    expect(short.spellcraftExhaustion).toBe(0);

    const full = planRest(character, sheet, "full");
    expect(full.spellcraftExhaustion).toBe(5);
    expect(full.nothingToDo).toBe(false);
    applyRest(character, full);
    // Geloescht, nicht 0: ein ausgeruhter Bogen sieht aus wie einer, der die
    // Regel nie benutzt hat.
    expect(character.spellcraftExhaustion).toBeUndefined();
    expect(spellcraftExhaustionOf(character)).toBe(0);
  });

  it("die Ruecknahme bringt die Ermuedung zurueck", () => {
    const character = fakeCharacter(4);
    const plan = planRest(character, sheet, "full");
    const undo = snapshotForRest(character, plan);
    applyRest(character, plan);
    expect(spellcraftExhaustionOf(character)).toBe(0);
    undoRest(character, undo);
    expect(spellcraftExhaustionOf(character)).toBe(4);
  });

  it("ohne Ermuedung bleibt nothingToDo eine ehrliche Auskunft", () => {
    const character = fakeCharacter();
    const plan = planRest(character, sheet, "full");
    expect(plan.spellcraftExhaustion).toBe(0);
    expect(plan.nothingToDo).toBe(true);
  });
});
