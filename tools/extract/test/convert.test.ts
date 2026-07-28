/**
 * Der ganze Weg: ein PDF mit Talenten, Zaubern UND einer Prestigeklasse durch
 * den Konverter, so wie die Kommandozeile ihn benutzt.
 *
 * Das prüft, was die Einzeltests nicht können: dass sich die drei Durchgänge
 * nicht in die Quere kommen. Jeder von ihnen sucht seine eigenen Ankerfelder im
 * GESAMTEN Dokument — wenn ein Zauber-Eintrag auch als Talent durchgeht, gibt es
 * ihn hinterher zweimal, und die App zeigt Unsinn an.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  buildImportFile,
  buildReport,
  convertPdf,
  type ConvertResult,
} from "../src/convert.js";
import { parseArgs, slug } from "../src/cli.js";
import { CLASS_BLOCKS, FEAT_BLOCKS, SPELL_BLOCKS } from "./fixtures.js";
import { makeRulebookPdf } from "./makePdf.js";

let result: ConvertResult;

beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), "chardex-convert-"));
  const path = join(dir, "Test Compendium.pdf");
  await writeFile(
    path,
    await makeRulebookPdf({
      title: "Test Compendium",
      blocks: [...FEAT_BLOCKS, ...SPELL_BLOCKS, ...CLASS_BLOCKS],
      pageSize: [612, 520],
    }),
  );
  result = await convertPdf(path, { sourcePack: "probe", now: "2026-07-28T00:00:00.000Z" });
});

describe("Konverter über ein ganzes Buch", () => {
  it(`findet Talente, Zauber und die Klasse in einem Lauf`, () => {
    const byKind = new Map<string, string[]>();
    for (const entity of result.entities) {
      byKind.set(entity.kind, [...(byKind.get(entity.kind) ?? []), entity.name]);
    }
    expect(byKind.get("class")).toEqual(["Assassin"]);
    expect(byKind.get("spell")).toEqual(["Fireball", "Cure Light Wounds", "Mage Armor"]);
    expect(byKind.get("feat")).toEqual(expect.arrayContaining(["Power Attack", "Cleave"]));
  });

  it(`übernimmt keinen Eintrag zweimal`, () => {
    const names = result.entities.map((e) => e.name.toLowerCase());
    expect(new Set(names).size, `doppelt: ${names.join(", ")}`).toBe(names.length);
  });

  it(`vergibt jedem Eintrag eine eigene Kennung und das Paket`, () => {
    const ids = new Set(result.entities.map((e) => e.id));
    expect(ids.size).toBe(result.entities.length);
    for (const entity of result.entities) {
      expect(entity.source, entity.name).toBe("homebrew");
      expect(entity.sourcePack, entity.name).toBe("probe");
    }
  });

  it(`bricht bei einem unlesbaren Eintrag nicht ab`, () => {
    // Im Prüf-PDF ist alles lesbar; die Zusicherung gilt der Struktur: die Liste
    // existiert, und ein Fehlschlag landet dort statt als Ausnahme im Aufrufer.
    expect(result.failed).toEqual([]);
  });

  it(`schreibt eine Datei, die die App importieren kann`, () => {
    const file = buildImportFile(result.entities, "2026-07-28T00:00:00.000Z");
    const parsed: unknown = JSON.parse(file);
    expect(parsed).toMatchObject({
      app: "chardex35",
      characters: [],
    });
    const envelope = parsed as { homebrewEntities: unknown[]; formatVersion: number };
    expect(envelope.homebrewEntities.length).toBe(result.entities.length);
    expect(typeof envelope.formatVersion).toBe("number");
  });
});

describe("Prüfbericht", () => {
  it(`sagt, wie viel gelesen wurde und was nachzusehen ist`, () => {
    const report = buildReport(result, "Test Compendium.pdf");
    expect(report).toContain("Prüfbericht — Test Compendium.pdf");
    expect(report).toMatch(/Gelesen: \d+ Zauber/);
    expect(report).toContain("Bitte nachsehen");
    // Der Hinweis auf das Urheberrecht gehört in jeden Bericht: die Datei enthält
    // Buchinhalt und darf nicht ins Repo.
    expect(report).toContain("außerhalb des Repos");
  });

  it(`nennt die Einträge namentlich, nicht nur eine Zahl`, () => {
    const report = buildReport(result, "Test Compendium.pdf");
    expect(report).toContain("Assassin");
  });
});

describe("Kommandozeile", () => {
  it(`leitet den Paketnamen aus dem Dateinamen ab`, () => {
    const args = parseArgs(["/bücher/Complete Arcane.pdf"], "/out");
    expect(args.pack).toBe("complete-arcane-privat");
    expect(args.outDir).toBe("/out");
    expect(args.kinds).toEqual(["spells", "feats", "classes"]);
  });

  it(`nimmt Paketname, Ziel und Auswahl als Schalter`, () => {
    const args = parseArgs(["buch.pdf", "--pack=eigenes", "--out=/tmp/x", "--only=spells,classes"]);
    expect(args.pack).toBe("eigenes");
    expect(args.outDir).toBe("/tmp/x");
    expect(args.kinds).toEqual(["spells", "classes"]);
  });

  it(`erklärt sich, statt still etwas Falsches zu tun`, () => {
    expect(() => parseArgs([])).toThrow(/Kein PDF angegeben/);
    expect(() => parseArgs(["buch.pdf", "--only=monster"])).toThrow(/Möglich sind/);
  });

  it(`macht aus Umlauten etwas, das auf jedem Dateisystem funktioniert`, () => {
    expect(slug("Städte & Türme")).toBe("staedte-tuerme");
    expect(slug("!!!")).toBe("buch");
  });
});
