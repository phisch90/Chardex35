/**
 * Der ganze Weg für Talente: erzeugtes Buch-PDF → Entities, verglichen mit dem
 * Soll aus fixtures.ts. Prüft nicht nur „irgendwas kam raus", sondern die Felder,
 * die den Unterschied machen: Voraussetzungen als VERKNÜPFUNG (nicht als Text),
 * und keine erfundenen Effekte.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadSrdIndex, type SrdIndex } from "../src/lookup.js";
import { readPdfLines } from "../src/pdf.js";
import { FEAT_ANCHORS, parseFeat, deriveSkillBonusEffects } from "../src/parse/feats.js";
import { segmentEntries } from "../src/segment.js";
import { FEAT_BLOCKS, FEAT_EXPECTED } from "./fixtures.js";
import { makeRulebookPdf } from "./makePdf.js";

let index: SrdIndex;
let parsed: ReturnType<typeof parseFeat>[];

beforeAll(async () => {
  index = loadSrdIndex();
  const dir = await mkdtemp(join(tmpdir(), "chardex-feats-"));
  const path = join(dir, "feats.pdf");
  await writeFile(path, await makeRulebookPdf({ title: "Test Compendium", blocks: FEAT_BLOCKS }));
  const { lines } = await readPdfLines(path);
  const entries = segmentEntries(lines, { anchors: FEAT_ANCHORS });
  parsed = entries.map((entry) =>
    parseFeat(index, entry, { sourcePack: "probe", now: "2026-07-27T00:00:00.000Z" }),
  );
});

describe(`Talente aus einem Buch-PDF`, () => {
  it(`findet alle fünf, keinen doppelt und nichts dazu`, () => {
    expect(parsed.map((p) => p.entity.name)).toEqual(FEAT_EXPECTED.map((e) => e.name));
  });

  it(`übernimmt Art und Nutzen-Text`, () => {
    for (const [i, soll] of FEAT_EXPECTED.entries()) {
      const entity = parsed[i]!.entity;
      expect(entity.kind).toBe("feat");
      if (entity.kind !== "feat") continue;
      expect(entity.data.featType, soll.name).toBe(soll.featType);
      expect(entity.data.benefit ?? "", soll.name).toContain(soll.benefitStartsWith);
      expect(entity.data.specialText !== undefined, soll.name).toBe(soll.hasSpecial);
    }
  });

  /** Der eigentliche Wert: „Str 13, Power Attack" wird zur prüfbaren Bedingung. */
  it(`verknüpft Voraussetzungen mit dem SRD statt sie als Text abzulegen`, () => {
    for (const [i, soll] of FEAT_EXPECTED.entries()) {
      const entity = parsed[i]!.entity;
      if (entity.kind !== "feat") continue;
      expect(entity.data.prerequisites, soll.name).toEqual(soll.prerequisites);
    }
    // Und die verknüpften IDs existieren wirklich — kein erfundener Slug.
    for (const p of parsed) {
      if (p.entity.kind !== "feat") continue;
      for (const prereq of p.entity.data.prerequisites) {
        if (prereq.type === "hasFeat") expect(index.byId.has(prereq.featId)).toBe(true);
        if (prereq.type === "minSkillRanks") expect(index.byId.has(prereq.skillId)).toBe(true);
      }
    }
  });

  it(`erkennt mehrfach-wählbar am Special-Absatz`, () => {
    const extraTurning = parsed.find((p) => p.entity.name === "Extra Turning")!.entity;
    const cleave = parsed.find((p) => p.entity.name === "Cleave")!.entity;
    if (extraTurning.kind === "feat") expect(extraTurning.data.stackable).toBe(true);
    if (cleave.kind === "feat") expect(cleave.data.stackable).toBe(false);
  });

  /*
   * Kein selbst ausgedachtes Soll: „Stealthy" gibt es im SRD als geprüften
   * Eintrag. Aus dem Buchtext muss GENAU dasselbe herauskommen wie dort steht.
   *
   * Diese Fassung des Tests hat einen echten Fehler von mir gefunden: ich hatte
   * das Effekt-Ziel als „skill.<id>" geschrieben, richtig ist „skill:<id>".
   * Mein erster Test hatte denselben Tippfehler im Soll und ging deshalb durch —
   * die Effekte wären in der App wirkungslos gewesen.
   */
  it(`leitet Stealthy so ab, wie es auch im SRD steht`, () => {
    const stealthy = parsed.find((p) => p.entity.name === "Stealthy")!;
    const srd = index.byId.get("srd:feat:stealthy")!;
    expect(srd).toBeDefined();
    expect(stealthy.entity.effects).toEqual(srd.effects);
    expect(stealthy.inferred.join(" ")).toContain("aus dem Text abgeleitet");
  });

  it(`erfindet für Prosa KEINE Wirkung und sagt das ebenfalls`, () => {
    const power = parsed.find((p) => p.entity.name === "Power Attack")!;
    expect(power.entity.effects).toEqual([]);
    expect(power.warnings.join(" ")).toContain("ohne mechanische Wirkung");
  });

  it(`meldet eine Voraussetzung, die keine Maschine prüfen kann`, () => {
    const extraTurning = parsed.find((p) => p.entity.name === "Extra Turning")!;
    expect(extraTurning.warnings.join(" ")).toContain("nicht maschinell prüfbar");
  });
});

describe(`deriveSkillBonusEffects`, () => {
  it(`lässt die Finger davon, wenn ein Name unbekannt ist`, () => {
    // „+2 bonus on all Zauberkunde checks" — Zauberkunde gibt es nicht. Dann
    // darf NICHTS abgeleitet werden, auch nicht der Teil, der passt.
    expect(deriveSkillBonusEffects(loadSrdIndex(), "You get a +2 bonus on all Zauberkunde checks.")).toBeNull();
  });

  it(`ignoriert Sätze ohne diesen Satzbau`, () => {
    expect(deriveSkillBonusEffects(loadSrdIndex(), "You may make an extra attack once per round.")).toBeNull();
  });
});
