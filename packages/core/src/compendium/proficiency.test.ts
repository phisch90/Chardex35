import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  entitySchema,
  resolveCompendium,
  type Entity,
  type ItemEntity,
} from "../schema/entities.js";
import { withGermanItemNames } from "./itemGerman.js";
import {
  PROFICIENCY_CLASS_IDS,
  PROFICIENCY_RACE_IDS,
  STARTER_KIT_CLASS_IDS,
  WEAPON_CHOICE_FEAT_IDS,
  classProficiency,
  proficiencyFor,
  proficiencyItemKeys,
  proficiencyOf,
  starterKit,
  weaponSuggestions,
} from "./proficiency.js";

/**
 * Gegen die ECHTEN Packs. Der wichtigste Test ist derselbe wie überall hier: eine
 * Kennung, die ins Leere zeigt, tut NICHTS — die Waffe hat dann still keine
 * Übungsmarke, und niemand merkt es.
 */
const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const manifestPath = join(packsDir, "manifest.json");
const packsAvailable = existsSync(manifestPath);

function loadEntities(): Entity[] {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: string[] };
  const entities: Entity[] = [];
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    for (const item of JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[]) {
      entities.push(entitySchema.parse(item));
    }
  }
  return entities;
}

describe.skipIf(!packsAvailable)("Vertrautheit, Vorschläge, Startausrüstung", () => {
  const entities = packsAvailable ? loadEntities() : [];
  const compendium = resolveCompendium(withGermanItemNames(entities));
  const item = (key: string): ItemEntity => {
    const hit = compendium.get(`srd:item:${key}`);
    if (hit?.kind !== "item") throw new Error(`${key} ist kein Gegenstand`);
    return hit;
  };

  it("keine Gegenstands-Kennung zeigt ins Leere", () => {
    const unknown = proficiencyItemKeys().filter((key) => !compendium.has(`srd:item:${key}`));
    expect(unknown).toEqual([]);
  });

  it("keine Klassen- oder Volks-Kennung zeigt ins Leere", () => {
    const bad: string[] = [];
    for (const id of [...PROFICIENCY_CLASS_IDS, ...STARTER_KIT_CLASS_IDS]) {
      if (compendium.get(id)?.kind !== "class") bad.push(id);
    }
    for (const id of PROFICIENCY_RACE_IDS) {
      if (compendium.get(id)?.kind !== "race") bad.push(id);
    }
    expect(bad).toEqual([]);
  });

  it("kein Talent-Kennung im Waffen-Hinweis zeigt ins Leere", () => {
    const bad = WEAPON_CHOICE_FEAT_IDS.filter((id) => compendium.get(id)?.kind !== "feat");
    expect(bad).toEqual([]);
  });

  it("alle 11 Spielerklassen haben eine Handtabelle", () => {
    /*
      Die Zahl steht hier ausdrücklich: kommt eine Klasse dazu (eigenes Buch), soll
      auffallen, dass sie keine Vertrautheit hat und alles als „ohne Übung" gilt.
    */
    const players = [...compendium.values()].filter(
      (e) =>
        e.kind === "class" &&
        e.deletedAt === undefined &&
        e.tags.includes("base") &&
        !e.tags.includes("npc") &&
        !e.tags.includes("prestige"),
    );
    expect(players).toHaveLength(11);
    const missing = players.filter((c) => classProficiency(c.id) === undefined).map((c) => c.id);
    expect(missing).toEqual([]);
    const withoutKit = players.filter((c) => starterKit(c.id).length === 0).map((c) => c.id);
    expect(withoutKit).toEqual([]);
  });

  it("der Kleriker: einfache Waffen ja, Kriegswaffen nein, schwere Rüstung ja", () => {
    const prof = proficiencyFor(["srd:class:cleric"], "srd:race:human");
    expect(proficiencyOf(item("morningstar"), prof)).toEqual({ kind: "ok" });
    expect(proficiencyOf(item("mace-heavy"), prof)).toEqual({ kind: "ok" });
    // Langschwert ist eine Kriegswaffe — ohne Übung.
    expect(proficiencyOf(item("longsword"), prof)).toEqual({ kind: "untrained", reason: "weapon" });
    expect(proficiencyOf(item("full-plate"), prof)).toEqual({ kind: "ok" });
    expect(proficiencyOf(item("shield-heavy-steel"), prof)).toEqual({ kind: "ok" });
    // Turmschild: nur der Kämpfer.
    expect(proficiencyOf(item("shield-tower"), prof)).toEqual({ kind: "untrained", reason: "shield" });
  });

  it("der Barde: einfache Waffen plus die sechs namentlichen", () => {
    const prof = proficiencyFor(["srd:class:bard"], "srd:race:human");
    for (const key of ["longsword", "rapier", "sap", "sword-short", "shortbow", "whip"]) {
      expect(proficiencyOf(item(key), prof), key).toEqual({ kind: "ok" });
    }
    expect(proficiencyOf(item("greataxe"), prof)).toEqual({ kind: "untrained", reason: "weapon" });
    expect(proficiencyOf(item("chainmail"), prof)).toEqual({ kind: "untrained", reason: "armor" });
  });

  it("der Druide trägt kein Metall — und nur hölzerne Schilde", () => {
    const prof = proficiencyFor(["srd:class:druid"], "srd:race:human");
    expect(proficiencyOf(item("hide"), prof)).toEqual({ kind: "ok" });
    expect(proficiencyOf(item("leather"), prof)).toEqual({ kind: "ok" });
    // Schuppenpanzer ist mittlere Rüstung — die Stärke stimmt, das Material nicht.
    expect(proficiencyOf(item("scale-mail"), prof)).toEqual({ kind: "untrained", reason: "material" });
    expect(proficiencyOf(item("shield-heavy-wooden"), prof)).toEqual({ kind: "ok" });
    expect(proficiencyOf(item("shield-heavy-steel"), prof)).toEqual({
      kind: "untrained",
      reason: "material",
    });
  });

  it("der Schurke darf leichte Rüstung, aber KEINEN Schild", () => {
    const prof = proficiencyFor(["srd:class:rogue"], "srd:race:human");
    expect(proficiencyOf(item("leather"), prof)).toEqual({ kind: "ok" });
    expect(proficiencyOf(item("shield-light-wooden"), prof)).toEqual({
      kind: "untrained",
      reason: "shield",
    });
  });

  it("Zwerg und Elf bringen ihre Waffen mit", () => {
    const dwarf = proficiencyFor(["srd:class:cleric"], "srd:race:dwarf");
    // Exotisch — aber der Zwerg darf sie.
    expect(proficiencyOf(item("waraxe-dwarven"), dwarf)).toEqual({ kind: "ok" });
    const human = proficiencyFor(["srd:class:cleric"], "srd:race:human");
    expect(proficiencyOf(item("waraxe-dwarven"), human)).toEqual({
      kind: "untrained",
      reason: "weapon",
    });
    const elf = proficiencyFor(["srd:class:wizard"], "srd:race:elf");
    expect(proficiencyOf(item("longbow"), elf)).toEqual({ kind: "ok" });
  });

  it("Vertrautheit summiert sich über Klassen — Einschränkungen nicht", () => {
    const both = proficiencyFor(["srd:class:druid", "srd:class:fighter"], "srd:race:human");
    // Der Kämpfer bringt Kriegswaffen und Metall mit.
    expect(proficiencyOf(item("greatsword"), both)).toEqual({ kind: "ok" });
    expect(proficiencyOf(item("full-plate"), both)).toEqual({ kind: "ok" });
    expect(proficiencyOf(item("shield-heavy-steel"), both)).toEqual({ kind: "ok" });
    expect(both.sources).toContain("Druid");
    expect(both.sources).toContain("Fighter");
  });

  it("Munition, Rucksäcke und der waffenlose Schlag sind keine Übungsfrage", () => {
    const prof = proficiencyFor(["srd:class:wizard"], "srd:race:human");
    for (const key of ["arrows-20", "bolts-crossbow-10", "unarmed-strike", "backpack-empty", "torch"]) {
      expect(proficiencyOf(item(key), prof), key).toEqual({ kind: "notApplicable" });
    }
  });

  it("eine unbekannte Klasse macht alles zu „ohne Übung“, statt zu behaupten", () => {
    const prof = proficiencyFor(["srd:class:assassin"], "srd:race:human");
    expect(prof.sources).toEqual([]);
    expect(proficiencyOf(item("dagger"), prof)).toEqual({ kind: "untrained", reason: "weapon" });
  });

  it("ein Talent mit Waffenwahl schlägt genau diese Waffe vor", () => {
    const hits = weaponSuggestions(
      [{ featId: "srd:feat:weapon-focus", choice: "Longsword" }],
      undefined,
      compendium,
    );
    expect(hits.map((h) => h.itemId)).toContain("srd:item:longsword");
    expect(hits.find((h) => h.itemId === "srd:item:longsword")?.why).toMatch(/Weapon Focus/);
  });

  it("…auch wenn er den DEUTSCHEN Namen gewählt hat", () => {
    /*
      Der gespeicherte `choice` ist Freitext. Seit die Gegenstände deutsche Namen
      haben, steht dort vielleicht „Langschwert" — dann muss es genauso treffen.
    */
    const hits = weaponSuggestions(
      [{ featId: "srd:feat:weapon-focus", choice: "Langschwert" }],
      undefined,
      compendium,
    );
    expect(hits.map((h) => h.itemId)).toContain("srd:item:longsword");
  });

  it("ein Talent ohne Wahl schlägt nichts vor, statt zu raten", () => {
    expect(weaponSuggestions([{ featId: "srd:feat:power-attack" }], undefined, compendium)).toEqual([]);
    expect(weaponSuggestions([{ featId: "srd:feat:weapon-focus" }], undefined, compendium)).toEqual([]);
    expect(
      weaponSuggestions([{ featId: "srd:feat:weapon-focus", choice: "  " }], undefined, compendium),
    ).toEqual([]);
  });

  it("das Volk schlägt seine eigene Waffe vor", () => {
    const hits = weaponSuggestions([], "srd:race:dwarf", compendium);
    expect(hits.map((h) => h.itemId)).toEqual([
      "srd:item:urgrosh-dwarven",
      "srd:item:waraxe-dwarven",
    ]);
    expect(hits[0]?.why).toMatch(/Dwarf/);
  });

  it("jede Startausrüstung ist tragbar und vollständig", () => {
    for (const classId of STARTER_KIT_CLASS_IDS) {
      const entries = starterKit(classId);
      expect(entries.length, classId).toBeGreaterThanOrEqual(8);
      for (const entry of entries) {
        expect(compendium.has(entry.itemId), `${classId}: ${entry.itemId}`).toBe(true);
        expect(entry.qty, `${classId}: ${entry.itemId}`).toBeGreaterThan(0);
      }
      // Keine Zeile doppelt — sonst stünde derselbe Rucksack zweimal im Gepäck.
      const ids = entries.map((e) => e.itemId);
      expect(new Set(ids).size, classId).toBe(ids.length);
    }
  });

  it("die Startausrüstung enthält nur, was die Klasse auch FÜHREN darf", () => {
    /*
      Der Test, der die Tabelle ehrlich hält: ein Vorschlag, den der Charakter
      nicht benutzen kann, wäre schlimmer als kein Vorschlag. (Der Druide ist der
      empfindliche Fall — Fellrüstung ja, Schuppenpanzer nein.)
    */
    const bad: string[] = [];
    for (const classId of STARTER_KIT_CLASS_IDS) {
      const prof = proficiencyFor([classId], undefined);
      for (const entry of starterKit(classId)) {
        const entity = compendium.get(entry.itemId);
        if (entity?.kind !== "item") continue;
        const verdict = proficiencyOf(entity, prof);
        if (verdict.kind === "untrained") bad.push(`${classId}: ${entry.itemId} (${verdict.reason})`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("der Vorschlag für den Kleriker enthält sein heiliges Symbol", () => {
    const ids = starterKit("srd:class:cleric").map((e) => e.itemId);
    expect(ids).toContain("srd:item:holy-symbol-wooden");
    expect(ids).toContain("srd:item:chainmail");
    const wizard = starterKit("srd:class:wizard").map((e) => e.itemId);
    expect(wizard).toContain("srd:item:spellbook-wizard-s-blank");
    expect(wizard).toContain("srd:item:spell-component-pouch");
    const rogue = starterKit("srd:class:rogue").map((e) => e.itemId);
    expect(rogue).toContain("srd:item:thieves-tools");
  });
});
