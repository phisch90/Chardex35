/**
 * Erst die Grundlage: kommt der Text eines zweispaltigen PDF in LESERICHTUNG
 * heraus und ohne die laufende Kopfzeile? Stimmt das nicht, ist alles weitere
 * wertlos.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { readPdfLines } from "../src/pdf.js";
import { FEAT_BLOCKS } from "./fixtures.js";
import { makeRulebookPdf } from "./makePdf.js";

let lines: string[];
let pageCount: number;

beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), "chardex-extract-"));
  const path = join(dir, "probe.pdf");
  await writeFile(path, await makeRulebookPdf({ title: "Test Compendium", blocks: FEAT_BLOCKS }));
  const result = await readPdfLines(path);
  lines = result.lines.map((l) => l.text);
  pageCount = result.pages.length;
});

describe(`readPdfLines`, () => {
  it(`liest mehrere Seiten`, () => {
    expect(pageCount).toBeGreaterThan(1);
  });

  it(`wirft die laufende Kopfzeile weg`, () => {
    // Der Buchtitel steht auf jeder Seite oben — im Fließtext hat er nichts zu suchen.
    expect(lines.filter((l) => l.includes("Test Compendium"))).toHaveLength(0);
    expect(lines.filter((l) => /^Page \d+$/.test(l))).toHaveLength(0);
  });

  it(`hält die Leserichtung ein: Spalte fertig, dann die nächste`, () => {
    const joined = lines.join("\n");
    const order = ["Power Attack", "Cleave", "Improved Two-Weapon Fighting", "Stealthy", "Extra Turning"];
    let cursor = -1;
    for (const name of order) {
      const at = joined.indexOf(name);
      expect(at, `${name} nicht gefunden`).toBeGreaterThan(-1);
      expect(at, `${name} steht in falscher Reihenfolge`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it(`hält Feldnamen und ihren Text in derselben Zeile zusammen`, () => {
    // Fett/normal ist ein Schriftwechsel — pdf.js liefert dort zwei Stücke.
    // Wenn die nicht zusammenfinden, sucht der Parser später ins Leere.
    expect(lines.some((l) => /^Prerequisite: Str 13\.$/.test(l))).toBe(true);
    expect(lines.some((l) => /^Prerequisites: Str 13, Power Attack\.$/.test(l))).toBe(true);
  });

  it(`baut einen umbrochenen Absatz Wort für Wort korrekt zusammen`, () => {
    /*
     * Der harte Test gegen Trennfehler: dieser Absatz steht im PDF über mehrere
     * Zeilen verteilt. Wieder zusammengefügt muss er ZEICHEN FÜR ZEICHEN dem
     * Original entsprechen — ein verschluckter oder ein zusätzlich eingestreuter
     * Zwischenraum fällt hier auf, während eine Heuristik wie „kurzes Wort vor
     * langem Wort" nur normales Englisch anmeckert.
     */
    const soll = FEAT_BLOCKS.find((b) => b.text?.startsWith("On your action"))?.text ?? "";
    expect(soll).not.toBe("");
    const start = lines.findIndex((l) => l.startsWith("Benefit: On your action"));
    expect(start).toBeGreaterThan(-1);
    let ist = lines[start]!.replace(/^Benefit: /, "");
    for (let i = start + 1; i < lines.length && ist.length < soll.length; i++) {
      ist += ` ${lines[i]}`;
    }
    expect(ist.slice(0, soll.length)).toBe(soll);
  });
});
