/**
 * Die volle Attacke — und warum sie einen eigenen Test bekommt.
 *
 * Diese Zahlenreihe stand über Monate als OFFENE Frage in `CLAUDE.md`: der Bogen zeigt sie
 * (genau wie Fight Club), aber niemand wusste, ob sein Tisch sie überhaupt spielt. Wäre die
 * Antwort „bei uns gibt es einen Angriff pro Runde" gewesen, hätte die Reihe weggemusst —
 * und weil das JEDEN Bogen der Gruppe ändert, durfte bis zur Antwort nichts angefasst
 * werden.
 *
 * Jetzt ist sie da, wörtlich: **„Wir spielen bei 6bab mit zwei Angriffen."** Also bleibt
 * alles, wie es ist — und genau deshalb steht dieser Test hier. Eine Regel, die man NICHT
 * geändert hat, hat keinen Commit, an dem sie ablesbar wäre; ohne Test sieht die Reihe wie
 * eine unbelegte Annahme aus, und die nächste Aufräumrunde entfernt sie mit dem besten
 * Gewissen. (Dasselbe hat Martins Regel 4 gebraucht — der Anderthalbfach-Schaden war auch
 * schon richtig und bekam trotzdem einen Test.)
 *
 * Geprüft wird BEIDES: die Tabelle für sich, und dass die Reihe wirklich am Bogen ankommt.
 * Eine Tabelle allein wäre zu wenig — sie war nie das Zweifelhafte.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { deriveSheet } from "./index.js";
import { iterativeAttacks } from "./tables.js";

describe("Die Angriffsreihe aus dem BAB", () => {
  /*
    Die Grenze ist die Sache, um die es geht — und sie wird von BEIDEN Seiten geprüft.
    „Bei +6 zwei Angriffe" allein wäre grün, selbst wenn die Reihe schon bei +1 anfängt;
    dann bekäme ein Stufe-1-Kämpfer zwei Angriffe, und der Test hätte es gutgeheißen.
    Dieselbe Disziplin wie bei den Schranken in `validate.ts`: wer `>` schreibt, muss `<`
    mitdenken.
  */
  it("bei BAB +6 sind es zwei Angriffe — bei +5 noch einer", () => {
    expect(iterativeAttacks(5)).toEqual([5]);
    expect(iterativeAttacks(6)).toEqual([6, 1]);
  });

  it("jeder weitere kommt fünf später und liegt fünf tiefer", () => {
    expect(iterativeAttacks(10)).toEqual([10, 5]);
    expect(iterativeAttacks(11)).toEqual([11, 6, 1]);
    expect(iterativeAttacks(15)).toEqual([15, 10, 5]);
    expect(iterativeAttacks(16)).toEqual([16, 11, 6, 1]);
  });

  it("bei vier ist Schluss, auch auf Stufe 20", () => {
    // Der Kämpfer auf 20 hat BAB +20 und trotzdem vier Angriffe, nicht fünf.
    expect(iterativeAttacks(20)).toEqual([20, 15, 10, 5]);
    expect(iterativeAttacks(24)).toHaveLength(4);
  });

  it("ein niedriger oder negativer BAB gibt genau einen Angriff", () => {
    // Ein Magier auf Stufe 1 hat BAB +0 — eine leere Liste wäre „kein Angriff möglich".
    expect(iterativeAttacks(0)).toEqual([0]);
    expect(iterativeAttacks(1)).toEqual([1]);
    expect(iterativeAttacks(-2)).toEqual([-2]);
  });
});

/*
  Und die andere Hälfte: die Reihe muss am BOGEN stehen. `iterativeAttacks` könnte
  tadellos rechnen, während `deriveSheet` nur den ersten Wert weitergibt — dann stünde am
  Tisch eine Zahl statt zwei, und der Test oben wäre grün.

  Ohne Power Attack und ohne Talente: der Fall, den die Golden-Tests NICHT abdecken (dort
  hängt die Reihe an einem Power-Attack-Fall, und wer den entfernt, nimmt die Probe mit).
*/
const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const manifestPath = join(packsDir, "manifest.json");
const packsAvailable = existsSync(manifestPath);

function loadCompendium(): Map<string, Entity> {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: string[] };
  const entities: Entity[] = [];
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    const raw = JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[];
    for (const item of raw) entities.push(entitySchema.parse(item));
  }
  return resolveCompendium(entities);
}

const C = (raw: unknown): Character => characterSchema.parse(raw);

describe.skipIf(!packsAvailable)("Die Reihe kommt am Bogen an", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();

  const kaempfer = (stufen: number) =>
    deriveSheet(
      C({
        id: "iter-1",
        name: "Reihenprobe",
        raceId: "srd:race:human",
        abilities: { base: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 } },
        levels: Array.from({ length: stufen }, () => ({
          classId: "srd:class:fighter",
          hpRoll: "max",
        })),
        inventory: [{ id: "w1", itemId: "srd:item:longsword", qty: 1, slot: "mainHand" }],
      }),
      compendium,
    );

  const schwert = (stufen: number) => {
    const sheet = kaempfer(stufen);
    const line = sheet.attacks.find((a) => a.label.includes("Longsword"));
    if (!line) throw new Error("Langschwert-Zeile fehlt");
    return { bab: sheet.bab, bonuses: line.bonuses };
  };

  it("Kämpfer 5: BAB +5, ein Angriff", () => {
    const { bab, bonuses } = schwert(5);
    expect(bab).toBe(5);
    // BAB 5 + STR 2 = +7.
    expect(bonuses).toEqual([7]);
  });

  it("Kämpfer 6: BAB +6, zwei Angriffe — seine Tischregel", () => {
    const { bab, bonuses } = schwert(6);
    expect(bab).toBe(6);
    // BAB 6 + STR 2 = +8, der zweite fünf tiefer.
    expect(bonuses).toEqual([8, 3]);
  });

  it("Kämpfer 11: drei Angriffe", () => {
    expect(schwert(11).bonuses).toEqual([13, 8, 3]);
  });
});
