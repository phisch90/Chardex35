/**
 * Zauber aus einem Buch-PDF. Das Soll steht in fixtures.ts, und wo es geht wird
 * gegen die geprüften SRD-Einträge verglichen: Fireball, Cure Light Wounds und
 * Mage Armor gibt es dort, also muss aus dem Buchtext dasselbe herauskommen.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadSrdIndex, type SrdIndex } from "../src/lookup.js";
import { readPdfLines } from "../src/pdf.js";
import {
  SPELL_ANCHORS,
  SPELL_SKIP_ABOVE,
  parseSchoolLine,
  parseSpell,
  parseSpellLevels,
} from "../src/parse/spells.js";
import { segmentEntries } from "../src/segment.js";
import { SPELL_BLOCKS, SPELL_EXPECTED } from "./fixtures.js";
import { makeRulebookPdf } from "./makePdf.js";

let index: SrdIndex;
let parsed: ReturnType<typeof parseSpell>[];

beforeAll(async () => {
  index = loadSrdIndex();
  const dir = await mkdtemp(join(tmpdir(), "chardex-spells-"));
  const path = join(dir, "spells.pdf");
  await writeFile(path, await makeRulebookPdf({ title: "Test Compendium", blocks: SPELL_BLOCKS }));
  const { lines } = await readPdfLines(path);
  const entries = segmentEntries(lines, { anchors: SPELL_ANCHORS, skipAbove: SPELL_SKIP_ABOVE });
  parsed = entries.map((entry) =>
    parseSpell(index, entry, { sourcePack: "probe", now: "2026-07-28T00:00:00.000Z" }),
  );
});

describe("Zauber aus einem Buch-PDF", () => {
  it(`findet alle drei mit dem richtigen Namen`, () => {
    // Ohne skipAbove hieße der erste Zauber „Evocation" — die Schulzeile sieht
    // wie ein Name aus. Genau dagegen ist die Ausnahme gebaut.
    expect(parsed.map((p) => p.entity.name)).toEqual(SPELL_EXPECTED.map((e) => e.name));
  });

  it(`liest Schule, Teilschule und Deskriptoren`, () => {
    for (const [i, soll] of SPELL_EXPECTED.entries()) {
      const entity = parsed[i]!.entity;
      if (entity.kind !== "spell") continue;
      expect(entity.data.school, soll.name).toBe(soll.school);
      expect(entity.data.descriptors, soll.name).toEqual([...soll.descriptors]);
      if ("subschool" in soll) expect(entity.data.subschool, soll.name).toBe(soll.subschool);
    }
  });

  it(`übersetzt die Grad-Zeile in die Listen des Kompendiums`, () => {
    for (const [i, soll] of SPELL_EXPECTED.entries()) {
      const entity = parsed[i]!.entity;
      if (entity.kind !== "spell") continue;
      const erwartet = Object.fromEntries(
        Object.entries(soll.levels).map(([abbrev, level]) => [
          abbrev === "sor/wiz"
            ? "sorcerer-wizard"
            : abbrev === "brd"
              ? "bard"
              : abbrev === "clr"
                ? "cleric"
                : abbrev === "drd"
                  ? "druid"
                  : abbrev === "pal"
                    ? "paladin"
                    : abbrev === "rgr"
                      ? "ranger"
                      : abbrev,
          level,
        ]),
      );
      expect(entity.data.levels, soll.name).toEqual(erwartet);
    }
  });

  it(`übernimmt die Felder, die auf einer Zauberkarte stehen`, () => {
    for (const [i, soll] of SPELL_EXPECTED.entries()) {
      const entity = parsed[i]!.entity;
      if (entity.kind !== "spell") continue;
      expect(entity.data.range, soll.name).toBe(soll.range);
      expect(entity.data.savingThrow, soll.name).toBe(soll.savingThrow);
      expect(entity.data.spellResistance, soll.name).toBe(soll.spellResistance);
      if ("area" in soll) expect(entity.data.area, soll.name).toBe(soll.area);
      if ("target" in soll) expect(entity.data.target, soll.name).toBe(soll.target);
      if ("duration" in soll) expect(entity.data.duration, soll.name).toBe(soll.duration);
    }
  });

  /** Der harte Vergleich: dasselbe wie im geprüften SRD-Eintrag. */
  it(`kommt bei Fireball auf dieselben Werte wie das SRD`, () => {
    const meins = parsed.find((p) => p.entity.name === "Fireball")!.entity;
    const srd = index.byId.get("srd:spell:fireball")!;
    expect(srd, "Fireball fehlt im Pack").toBeDefined();
    if (meins.kind !== "spell" || srd.kind !== "spell") return;
    expect(meins.data.school).toBe(srd.data.school);
    expect(meins.data.descriptors).toEqual(srd.data.descriptors);
    expect(meins.data.levels).toEqual(srd.data.levels);
    expect(meins.data.savingThrow).toBe(srd.data.savingThrow);
    expect(meins.data.spellResistance).toBe(srd.data.spellResistance);
    expect(meins.data.components).toBe(srd.data.components);
  });

  it(`nimmt den Beschreibungstext mit, aber nicht die Schulzeile`, () => {
    const fireball = parsed.find((p) => p.entity.name === "Fireball")!.entity;
    expect(fireball.description).toContain("explosion of flame");
    expect(fireball.description).not.toContain("Evocation");
  });

  it(`erfindet keine Wirkung — ein Zauber ist Text, kein Effekt`, () => {
    for (const p of parsed) expect(p.entity.effects, p.entity.name).toEqual([]);
  });
});

describe("parseSchoolLine", () => {
  it(`trennt Schule, Teilschule und Deskriptoren`, () => {
    expect(parseSchoolLine("Conjuration (Creation) [Force]")).toEqual({
      school: "Conjuration",
      subschool: "Creation",
      descriptors: ["Force"],
    });
    expect(parseSchoolLine("Evocation [Fire, Electricity]")?.descriptors).toEqual([
      "Fire",
      "Electricity",
    ]);
  });

  it(`erkennt keine Schule, wo keine ist`, () => {
    expect(parseSchoolLine("Level: Sor/Wiz 3")).toBeNull();
    expect(parseSchoolLine("A fireball spell is an explosion")).toBeNull();
  });
});

describe("parseSpellLevels", () => {
  it(`übersetzt die Kürzel des Buches`, () => {
    expect(parseSpellLevels("Brd 1, Clr 1, Drd 1, Pal 1, Rgr 2").levels).toEqual({
      bard: 1,
      cleric: 1,
      druid: 1,
      paladin: 1,
      ranger: 2,
    });
  });

  it(`nimmt Domänen als Domänen`, () => {
    expect(parseSpellLevels("Fire 3").levels).toEqual({ "domain-fire": 3 });
  });

  it(`RÄT NICHT, wenn eine Angabe nicht zuzuordnen ist`, () => {
    // Ein Zauber in der falschen Klassenliste fällt niemandem auf, bis er am
    // Tisch fehlt. Also lieber melden als einsortieren.
    const out = parseSpellLevels("Sor/Wiz 3, Irgendwas Komisches");
    expect(out.levels).toEqual({ "sorcerer-wizard": 3 });
    expect(out.unknown).toEqual(["Irgendwas Komisches"]);
  });
});
