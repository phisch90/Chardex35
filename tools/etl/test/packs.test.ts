/**
 * Validiert die COMMITTETEN Packs: alle Dateien aus manifest.files parsen
 * als Entity-Arrays gegen entitySchema + dieselben Stichproben wie verify.ts.
 * Datenfehler schlagen so in CI auf, ohne das ETL zu re-runnen.
 */
import { entitySchema } from "@codex35/core";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadEntities, loadManifest, PACKS_DIR, runChecks } from "../src/checks.js";

describe("packs/srd", () => {
  const manifest = loadManifest();

  it("manifest listet Dateien und counts", () => {
    expect(manifest.srdRev).toBe(7);
    expect(manifest.files.length).toBeGreaterThan(0);
    expect([...manifest.files].sort()).toEqual(manifest.files);
    expect(manifest.files).not.toContain("manifest.json");
  });

  /**
   * Die deutschen Erklärungen entstehen im ETL aus data/feats-de.ts. Ein
   * Tippfehler im Slug fiele sonst niemandem auf — der Eintrag hätte einfach
   * keinen deutschen Text, und in der App stünde weiter Englisch.
   */
  it("Talente tragen deutsche Erklärungen", () => {
    const feats = [...loadEntities(manifest).values()].filter((e) => e.kind === "feat");
    const withGerman = feats.filter((e) => e.localized?.de?.summary !== undefined);
    const nonEpic = feats.filter((e) => !(e.data as { featType?: string }).featType?.includes("Epic"));

    expect(feats.length).toBeGreaterThan(300);
    // Alle nicht-epischen Talente sind abgedeckt; Epic bleibt bewusst englisch.
    expect(withGerman.length).toBe(nonEpic.length);
    expect(nonEpic.every((e) => e.localized?.de?.summary !== undefined)).toBe(true);

    // Stichproben: die Talente, die an einem Tisch wirklich fallen.
    const byId = new Map(feats.map((e) => [e.id, e]));
    expect(byId.get("srd:feat:weapon-focus")?.localized?.de?.summary).toContain("+1 auf alle Angriffswürfe");
    expect(byId.get("srd:feat:toughness")?.localized?.de?.summary).toContain("+3 Trefferpunkte");
    expect(byId.get("srd:feat:power-attack")?.localized?.de?.summary).toContain("Grundangriffsbonus");

    // Der englische Originaltext bleibt daneben stehen.
    expect(byId.get("srd:feat:weapon-focus")?.description).toBeTruthy();
  });

  for (const file of manifest.files) {
    it(`${file} validiert gegen entitySchema`, () => {
      const raw = JSON.parse(readFileSync(join(PACKS_DIR, file), "utf8")) as unknown[];
      expect(Array.isArray(raw)).toBe(true);
      for (const item of raw) {
        const result = entitySchema.safeParse(item);
        if (!result.success) {
          const id = (item as { id?: string }).id ?? "<ohne id>";
          throw new Error(`${file} / ${id}: ${result.error.message}`);
        }
      }
    });
  }

  it("Stichproben halten (gleiche Checks wie verify.ts)", () => {
    const entities = loadEntities(manifest);
    expect(() => runChecks(manifest, entities)).not.toThrow();
  });
});
