/**
 * Validiert die COMMITTETEN Packs: alle Dateien aus manifest.files parsen
 * als Entity-Arrays gegen entitySchema + dieselben Stichproben wie verify.ts.
 * Datenfehler schlagen so in CI auf, ohne das ETL zu re-runnen.
 */
import { classCategory, entitySchema, isEpicClass } from "@codex35/core";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadEntities, loadManifest, PACKS_DIR, runChecks } from "../src/checks.js";

describe("packs/srd", () => {
  const manifest = loadManifest();

  it("manifest listet Dateien und counts", () => {
    /*
      Die Nummer steht hier ABSICHTLICH als Zahl und nicht als „ist größer als".

      Sie entscheidet, ob sein Gerät das Kompendium neu einspielt (`db/seed.ts`): ändert
      sich ein Pack und die Nummer NICHT, bleibt sein iPhone auf dem alten Stand — die
      achte Falle in CLAUDE.md. Umgekehrt kostet jede Erhöhung ein Neu-Einrichten, also
      soll sie kein Versehen sein. Ein fester Wert erzwingt beides: wer ein Pack anfasst,
      sieht diese Zeile im Diff.

      Stand 11: die alten Wörter sind aus den deutschen Texten (GE/ST/KO/WE/CH →
      DEX/STR/CON/WIS/CHA, Ringkampf → Grapple) — 19 Stellen in `feats-1.json`,
      `feats-2.json` und `conditions.json`. Und die Zahl kommt seither wieder aus
      dem ERZEUGER: bei Stand 10 wurde nur das Manifest von Hand erhöht und
      `build.ts` vergessen — ein Neu-Erzeugen hätte die Version zurückgedreht.

      Stand 10: die deutschen Texte sagen „HP" statt „TP" (vier Stellen in
      `conditions.json` und `feats-1.json`).
    */
    expect(manifest.srdRev).toBe(11);
    expect(manifest.files.length).toBeGreaterThan(0);
    expect([...manifest.files].sort()).toEqual(manifest.files);
    expect(manifest.files).not.toContain("manifest.json");
  });

  /**
   * Die Kategorie einer Klasse kommt AUS DEN TAGS — die App gruppiert danach.
   * Hier stehen die Sollzahlen, damit ein verrutschtes Tag im ETL auffällt und
   * nicht erst dadurch, dass der Commoner wieder zwischen den Basisklassen
   * steht. NPC-Klassen tragen absichtlich `base` UND `npc`.
   */
  it("Klassen sind in Basis, NPC und Prestige eingeteilt", () => {
    const classes = [...loadEntities(manifest).values()].filter((e) => e.kind === "class");
    const byCategory = { base: [] as string[], npc: [] as string[], prestige: [] as string[] };
    for (const cls of classes) byCategory[classCategory(cls)].push(cls.name);

    expect(byCategory.npc.sort()).toEqual(["Adept", "Aristocrat", "Commoner", "Expert", "Warrior"]);
    expect(byCategory.base.sort()).toEqual([
      "Barbarian",
      "Bard",
      "Cleric",
      "Druid",
      "Fighter",
      "Monk",
      "Paladin",
      "Ranger",
      "Rogue",
      "Sorcerer",
      "Wizard",
    ]);
    expect(byCategory.prestige).toHaveLength(24);
    // Von den Prestigeklassen sind neun episch (Einstieg jenseits Stufe 20).
    expect(classes.filter(isEpicClass)).toHaveLength(9);
    expect(classes.filter(isEpicClass).every((c) => classCategory(c) === "prestige")).toBe(true);
  });

  /**
   * Talente, die eine Tages-Mechanik aufwerten, tragen die Zahl als DATEN
   * (`data.extraUses`). Der Schlüssel muss zu den Zähler-Vorschlägen in
   * core/engine/trackers.ts passen — ein Tippfehler wäre in der App unsichtbar:
   * der Vorschlag stünde einfach ohne den Bonus da.
   */
  it("Extra Turning und Extra Music tragen extraUses mit gültigem Schlüssel", () => {
    const feats = [...loadEntities(manifest).values()].filter((e) => e.kind === "feat");
    const byId = new Map(feats.map((e) => [e.id, e]));
    const extraUses = (id: string) =>
      (byId.get(id)?.data as { extraUses?: { mechanic: string; perInstance: number }[] }).extraUses ?? [];

    expect(extraUses("srd:feat:extra-turning")).toEqual([{ mechanic: "turn-undead", perInstance: 4 }]);
    expect(extraUses("srd:feat:extra-music")).toEqual([{ mechanic: "bardic-music", perInstance: 4 }]);

    // Beide sind laut SRD mehrfach nehmbar — sonst stapelt der Bonus nicht.
    expect((byId.get("srd:feat:extra-turning")?.data as { stackable: boolean }).stackable).toBe(true);
    expect((byId.get("srd:feat:extra-music")?.data as { stackable: boolean }).stackable).toBe(true);

    // Jeder verwendete Schlüssel ist einer, den suggestTrackers auch vergibt.
    const known = new Set(["turn-undead", "smite-evil", "bardic-music", "rage", "stunning-fist", "wild-shape"]);
    for (const feat of feats) {
      for (const bonus of extraUses(feat.id)) {
        expect(known, `${feat.id} → ${bonus.mechanic}`).toContain(bonus.mechanic);
      }
    }
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
