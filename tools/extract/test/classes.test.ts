/**
 * Prestigeklassen aus einem Buch-PDF.
 *
 * Das Soll ist hier besonders belastbar: derselbe Assassine liegt als geprüfte
 * Entity in packs/srd. Es wird also nicht gegen meine eigene Erwartung geprüft,
 * sondern gegen eine Tabelle, die schon von den Golden-Tests der Engine benutzt
 * wird. Stimmen GAB und Rettungswürfe über alle zehn Stufen mit dem SRD überein,
 * hat das Raster gestimmt — und nur dann.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadSrdIndex, type SrdIndex } from "../src/lookup.js";
import { CLASS_ANCHORS, parseClass, splitFeatures } from "../src/parse/classes.js";
import { readRulebook } from "../src/read.js";
import { segmentEntries } from "../src/segment.js";
import { gridRows, type LevelTable } from "../src/table.js";
import { CLASS_BLOCKS } from "./fixtures.js";
import { makeRulebookPdf } from "./makePdf.js";

let index: SrdIndex;
let parsed: ReturnType<typeof parseClass>;
let table: LevelTable | null;

beforeAll(async () => {
  index = loadSrdIndex();
  const dir = await mkdtemp(join(tmpdir(), "chardex-classes-"));
  const path = join(dir, "classes.pdf");
  await writeFile(
    path,
    await makeRulebookPdf({
      title: "Test Compendium",
      blocks: CLASS_BLOCKS,
      pageSize: [612, 520],
    }),
  );
  const book = await readRulebook(path);
  table = book.tables[0] ?? null;
  const entries = segmentEntries(book.lines, { anchors: CLASS_ANCHORS });
  expect(entries.length, "genau ein Klassen-Eintrag").toBe(1);
  parsed = parseClass(index, entries[0]!, table, {
    sourcePack: "probe",
    now: "2026-07-28T00:00:00.000Z",
    prestige: true,
  });
});

/** Der geprüfte Assassine aus den Packs. */
function srdAssassin() {
  const srd = index.byId.get("srd:class:assassin");
  expect(srd, "srd:class:assassin fehlt im Pack").toBeDefined();
  if (srd?.kind !== "class") throw new Error("srd:class:assassin ist keine Klasse");
  return srd;
}

describe("Prestigeklasse aus einem Buch-PDF", () => {
  it(`findet die Klasse mit Namen, Trefferwürfel und Fertigkeitspunkten`, () => {
    const srd = srdAssassin();
    expect(parsed.entity.name).toBe("Assassin");
    if (parsed.entity.kind !== "class") throw new Error("keine Klasse");
    expect(parsed.entity.data.hitDie).toBe(srd.data.hitDie);
    expect(parsed.entity.data.skillPointsPerLevel).toBe(srd.data.skillPointsPerLevel);
    expect(parsed.entity.data.maxLevel).toBe(srd.data.maxLevel);
  });

  it(`liest alle Klassenfertigkeiten und löst sie auf`, () => {
    const srd = srdAssassin();
    if (parsed.entity.kind !== "class") throw new Error("keine Klasse");
    expect(parsed.entity.data.classSkillIds).toEqual(srd.data.classSkillIds);
  });

  /** Der harte Teil: das Raster. */
  it(`liest GAB und Rettungswürfe für alle zehn Stufen wie im SRD`, () => {
    const srd = srdAssassin();
    if (parsed.entity.kind !== "class") throw new Error("keine Klasse");
    const mine = parsed.entity.data.levels.map((l) => [l.bab, l.fort, l.ref, l.will]);
    const soll = srd.data.levels.map((l) => [l.bab, l.fort, l.ref, l.will]);
    expect(mine).toEqual(soll);
  });

  it(`ordnet „Zauber pro Tag" dem richtigen Grad zu, auch wenn Spalten leer sind`, () => {
    const srd = srdAssassin();
    if (parsed.entity.kind !== "class") throw new Error("keine Klasse");
    // Genau hier wäre ein Fehler unsichtbar: rutscht die Zuordnung um eine
    // Spalte, hat der Assassine auf Stufe 3 Zauber des 1. statt des 2. Grades.
    expect(parsed.entity.data.levels.map((l) => l.spellsPerDay)).toEqual(
      srd.data.levels.map((l) => l.spellsPerDay),
    );
  });

  it(`übernimmt die Spalte „Special" als Namen, ohne Mechanik zu erfinden`, () => {
    const srd = srdAssassin();
    if (parsed.entity.kind !== "class") throw new Error("keine Klasse");
    expect(parsed.entity.data.levels.map((l) => l.features.map((f) => f.name))).toEqual(
      srd.data.levels.map((l) => l.features.map((f) => f.name)),
    );
    for (const level of parsed.entity.data.levels) {
      for (const feature of level.features) expect(feature.effects, feature.name).toEqual([]);
    }
  });

  it(`liest eine umgebrochene Zelle der Spalte „Special" vollständig`, () => {
    if (parsed.entity.kind !== "class") throw new Error("keine Klasse");
    // Diese Zelle ist im Prüf-PDF zu breit für eine Zeile. Ohne das Anhängen der
    // Fortsetzungszeile fehlte „poison use, spells".
    expect(parsed.entity.data.levels[0]!.features.map((f) => f.name)).toEqual([
      "Sneak attack +1d6",
      "death attack",
      "poison use",
      "spells",
    ]);
  });

  it(`übersetzt die prüfbaren Voraussetzungen in echte Bedingungen`, () => {
    const srd = srdAssassin();
    if (parsed.entity.kind !== "class") throw new Error("keine Klasse");
    const mechanical = parsed.entity.data.requirements.filter((r) => r.type !== "custom");
    expect(mechanical).toEqual(srd.data.requirements.filter((r) => r.type !== "custom"));
  });

  it(`lässt nicht prüfbare Voraussetzungen als Text stehen und meldet sie`, () => {
    if (parsed.entity.kind !== "class") throw new Error("keine Klasse");
    const texts = parsed.entity.data.requirements
      .filter((r) => r.type === "custom")
      .map((r) => (r.type === "custom" ? r.text : ""));
    // Gesinnung ist eine echte Bedingung, aber keine, die die App nachrechnen
    // kann. Sie verschwindet nicht — sie steht als Text da und ist gemeldet.
    expect(texts).toContain("Alignment: Any evil");
    expect(texts).toContain(
      "The character must kill someone for no other reason than to join the assassins",
    );
    expect(parsed.warnings.join(" ")).toContain("Alignment: Any evil");
  });

  it(`erkennt das Zauberwirken nur aus den regelmäßigen Sätzen`, () => {
    if (parsed.entity.kind !== "class") throw new Error("keine Klasse");
    expect(parsed.entity.data.spellcasting).toEqual({
      model: "prepared",
      ability: "int",
      spellListId: "srd:spelllist:assassin",
      bonusSlots: true,
      armorFailure: false,
      spellbook: false,
    });
  });

  it(`hält die Tabelle aus der Beschreibung heraus`, () => {
    // Ohne withoutTableLines steht die halbe Tabelle im Beschreibungstext, weil
    // die Spaltenerkennung sie mittendurch schneidet.
    expect(parsed.entity.description).toContain("Class Features");
    expect(parsed.entity.description).not.toMatch(/\+2\s+\+0\s+Sneak/);
  });

  it(`markiert die Klasse als Prestigeklasse`, () => {
    expect(parsed.entity.tags).toContain("prestige");
  });
});

describe("Tabellen-Raster", () => {
  it(`bündelt Textstücke zu Zellen, nicht zu einer Zeile`, async () => {
    const dir = await mkdtemp(join(tmpdir(), "chardex-grid-"));
    const path = join(dir, "grid.pdf");
    await writeFile(
      path,
      await makeRulebookPdf({
        title: "Test Compendium",
        blocks: CLASS_BLOCKS,
        pageSize: [612, 520],
      }),
    );
    const { pages } = await readRulebook(path);
    const withTable = pages.find((p) => p.number === table?.page)!;
    const row = gridRows(withTable).find((r) => r.cells[0]?.text === "5th");
    expect(row, "Stufenzeile 5 gefunden").toBeDefined();
    // Wären die Wörter nicht nach Abstand gebündelt, stünde hier jedes Wort
    // einzeln — und „Improved uncanny dodge" wäre keine Zelle mehr.
    expect(row!.cells.slice(0, 5).map((c) => c.text)).toEqual(["5th", "+3", "+1", "+4", "+1"]);
    expect(row!.cells[5]!.text).toBe("Improved uncanny dodge, sneak attack +3d6");
  });
});

describe("splitFeatures", () => {
  it(`trennt am Komma und lässt „—" leer`, () => {
    expect(splitFeatures("Sneak attack +2d6")).toEqual(["Sneak attack +2d6"]);
    expect(splitFeatures("+1 save against poison, uncanny dodge")).toEqual([
      "+1 save against poison",
      "uncanny dodge",
    ]);
    expect(splitFeatures("—")).toEqual([]);
    expect(splitFeatures("")).toEqual([]);
  });
});
