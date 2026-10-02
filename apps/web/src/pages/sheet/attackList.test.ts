/*
  Die Angriffsliste des Kampf-Reiters — und vor allem ihr RUECKFALL.

  KOPFNOTIZ: keine deutschen Anfuehrungszeichen in Pruefdateien. Sie haben esbuild in
  diesem Projekt schon achtmal mit einer Meldung an der falschen Zeile abbrechen lassen.
  Backticks, wenn ein Zitat noetig ist.
*/
import { describe, expect, it } from "vitest";
import type { AttackLine } from "@codex35/core";
import { combatAttackList, isBaseAttackLine, weaponAttackLines } from "./attackList.js";

const leer = { total: 0, contributions: [] };

const zeile = (key: string, label: string, slot?: AttackLine["slot"]): AttackLine => ({
  key,
  label,
  bonuses: [6, 1],
  attack: leer,
  damageText: key === "melee" || key === "ranged" ? "—" : "1d8+3",
  damageBonus: leer,
  critical: "20/x2",
  notes: [],
  ...(slot === undefined ? {} : { slot }),
});

const NAHKAMPF = zeile("melee", "Nahkampf");
const FERNKAMPF = zeile("ranged", "Fernkampf");
const SCHWERT = zeile("weapon:w1", "Langschwert", "mainHand");
const BOGEN = zeile("weapon:w2", "Kurzbogen", "none");

describe("Welche Angriffe zeigt der Kampf-Reiter", () => {
  it("mit einer Waffe stehen die zwei Grundwerte NICHT in der Liste", () => {
    const liste = combatAttackList([NAHKAMPF, FERNKAMPF, SCHWERT]);
    expect(liste.map((l) => l.label)).toEqual(["Langschwert"]);
  });

  /*
    Sein Satz, woertlich: `Aber wenn es ein Schwert ist brauchen wir doch kein
    fernkampfschaden.` Die Fernkampf-Zeile ist der Fall, den er gemeldet hat — die
    Nahkampf-Zeile der zweite, den er mitgemeint hat: sie trug dieselbe Zahl wie die
    Waffenzeile direkt darunter.
  */
  it("auch dann nicht, wenn die Waffe im Gepaeck liegt", () => {
    const liste = combatAttackList([NAHKAMPF, FERNKAMPF, BOGEN]);
    expect(liste.some(isBaseAttackLine)).toBe(false);
    expect(liste).toHaveLength(1);
  });

  it("angelegte Waffen vor verstauten", () => {
    const liste = combatAttackList([NAHKAMPF, FERNKAMPF, BOGEN, SCHWERT]);
    expect(liste.map((l) => l.label)).toEqual(["Langschwert", "Kurzbogen"]);
  });

  /*
    Die GEGENPROBE, und sie ist der Grund fuer diese Datei: ohne Waffe waere die Karte
    sonst leer. Eine frische Figur vor der Ausruestung hat genau diese zwei Zahlen, und
    sie sind dann das Einzige, was es zu sagen gibt.
  */
  it("ohne jede Waffe sind die zwei Grundwerte der Rueckfall", () => {
    const liste = combatAttackList([NAHKAMPF, FERNKAMPF]);
    expect(liste.map((l) => l.label)).toEqual(["Nahkampf", "Fernkampf"]);
  });

  it("die Liste der Engine bleibt unberuehrt — sortiert wird eine KOPIE", () => {
    const quelle = [NAHKAMPF, FERNKAMPF, BOGEN, SCHWERT];
    combatAttackList(quelle);
    expect(quelle.map((l) => l.key)).toEqual(["melee", "ranged", "weapon:w2", "weapon:w1"]);
  });
});

describe("Was eine Sammelzeile ist", () => {
  it("erkannt wird der SCHLUESSEL, nicht der Platz", () => {
    expect(isBaseAttackLine(NAHKAMPF)).toBe(true);
    expect(isBaseAttackLine(FERNKAMPF)).toBe(true);
    expect(isBaseAttackLine(SCHWERT)).toBe(false);
    // Eine verstaute Waffe ist eine Waffe — sie hat nur keinen Platz am Koerper.
    expect(isBaseAttackLine(BOGEN)).toBe(false);
  });

  /*
    Dieselbe Funktion treibt die Uebersichtsseite (Martins DM-Blatt). Stuende die
    Bedingung dort ein zweites Mal ausgeschrieben, waeren es zwei Wahrheiten — und die
    zwei Ansichten listeten irgendwann verschiedene Angriffe.
  */
  it("die Uebersichtsseite bekommt dieselbe Liste", () => {
    expect(weaponAttackLines([NAHKAMPF, FERNKAMPF, SCHWERT, BOGEN]).map((l) => l.key)).toEqual([
      "weapon:w1",
      "weapon:w2",
    ]);
  });
});
