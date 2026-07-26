import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { classLevelGain, classSummary, raceSummary } from "./classinfo.js";

const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const packsAvailable = existsSync(join(packsDir, "manifest.json"));

function loadCompendium(): Map<string, Entity> {
  const manifest = JSON.parse(readFileSync(join(packsDir, "manifest.json"), "utf8")) as {
    files: string[];
  };
  const entities: Entity[] = [];
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    for (const item of JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[]) {
      entities.push(entitySchema.parse(item));
    }
  }
  return resolveCompendium(entities);
}

describe.skipIf(!packsAvailable)("classSummary gegen die PHB-Tabellen", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();
  const get = (id: string): Entity => {
    const entity = compendium.get(id);
    if (!entity) throw new Error(`${id} fehlt im Pack`);
    return entity;
  };

  it(`liest den Kämpfer richtig: W10, voller GAB, nur Fortitude gut`, () => {
    const summary = classSummary(get("srd:class:fighter"));
    expect(summary?.hitDie).toBe(10);
    expect(summary?.skillPointsPerLevel).toBe(2);
    expect(summary?.babProgression).toBe("full");
    expect(summary?.goodSaves).toEqual(["fort"]);
    expect(summary?.spellcasting).toBeUndefined();
    expect(summary?.isPrestige).toBe(false);
  });

  it(`liest den Magier richtig: W4, halber GAB, nur Will gut, Zauberbuch`, () => {
    const summary = classSummary(get("srd:class:wizard"));
    expect(summary?.hitDie).toBe(4);
    expect(summary?.babProgression).toBe("half");
    expect(summary?.goodSaves).toEqual(["will"]);
    expect(summary?.spellcasting?.model).toBe("prepared");
    expect(summary?.spellcasting?.ability).toBe("int");
    expect(summary?.spellcasting?.usesSpellbook).toBe(true);
    expect(summary?.spellcasting?.firstLevel).toBe(1);
    expect(summary?.spellcasting?.maxSpellLevel).toBe(9);
  });

  it(`liest den Kleriker richtig: W8, 3/4-GAB, Fort und Will gut`, () => {
    const summary = classSummary(get("srd:class:cleric"));
    expect(summary?.hitDie).toBe(8);
    expect(summary?.babProgression).toBe("threeQuarter");
    expect(summary?.goodSaves).toEqual(["fort", "will"]);
    expect(summary?.spellcasting?.ability).toBe("wis");
    // Kleriker kennt seine ganze Liste, führt kein Zauberbuch.
    expect(summary?.spellcasting?.usesSpellbook).toBe(false);
  });

  it(`liest den Schurken richtig: W6, 3/4-GAB, nur Reflex gut, 8 Punkte`, () => {
    const summary = classSummary(get("srd:class:rogue"));
    expect(summary?.hitDie).toBe(6);
    expect(summary?.skillPointsPerLevel).toBe(8);
    expect(summary?.goodSaves).toEqual(["ref"]);
  });

  it(`erkennt den Mönch: alle drei Rettungswürfe gut`, () => {
    expect(classSummary(get("srd:class:monk"))?.goodSaves).toEqual(["fort", "ref", "will"]);
  });

  it(`erkennt eine Prestigeklasse als solche`, () => {
    const assassin = classSummary(get("srd:class:assassin"));
    expect(assassin?.isPrestige).toBe(true);
    expect(assassin?.maxLevel).toBeLessThan(20);
  });

  it(`liefert für jede Klasse im Pack ein Ergebnis`, () => {
    const classes = [...compendium.values()].filter((e) => e.kind === "class");
    expect(classes.length).toBeGreaterThan(30);
    for (const entity of classes) {
      const summary = classSummary(entity);
      expect(summary, entity.id).not.toBeNull();
      expect(summary?.hitDie, entity.id).toBeGreaterThan(0);
      expect(["full", "threeQuarter", "half"]).toContain(summary?.babProgression);
    }
  });
});

describe.skipIf(!packsAvailable)("classLevelGain — was bringt genau diese Stufe", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();
  const get = (id: string): Entity => {
    const entity = compendium.get(id);
    if (!entity) throw new Error(`${id} fehlt im Pack`);
    return entity;
  };

  it(`Kämpfer Stufe 2: +1 GAB, Bonustalent`, () => {
    const gain = classLevelGain(get("srd:class:fighter"), 2);
    expect(gain?.babDelta).toBe(1);
    expect(gain?.saveDeltas.fort).toBe(1);
    expect(gain?.features.some((f) => /bonus feat/i.test(f.name))).toBe(true);
  });

  // Die echte Kleriker-Tabelle (ohne Domänen-Bonusplätze):
  //   1: 3/1   2: 4/2   3: 4/2/1   4: 5/3/2   5: 5/3/2/1
  it(`Kleriker Stufe 3: Grad-2-Zauber kommen neu dazu`, () => {
    const gain = classLevelGain(get("srd:class:cleric"), 3);
    expect(gain?.newSpellLevels).toEqual([2]);
    expect(gain?.slots?.[2]).toBe(1);
  });

  it(`Kleriker Stufe 4: kein neuer Grad, aber mehr Plätze`, () => {
    const gain = classLevelGain(get("srd:class:cleric"), 4);
    expect(gain?.newSpellLevels).toEqual([]);
    expect(gain?.slots?.[1]).toBe(3);
    expect(gain?.slots?.[2]).toBe(2);
  });

  it(`Kleriker Stufe 5: Grad 3 kommt neu, GAB steht still`, () => {
    const gain = classLevelGain(get("srd:class:cleric"), 5);
    expect(gain?.newSpellLevels).toEqual([3]);
    // 3/4-Progression: von Stufe 4 auf 5 bleibt der GAB bei +3.
    expect(gain?.babDelta).toBe(0);
    expect(gain?.saveDeltas).toEqual({ fort: 0, ref: 0, will: 0 });
  });

  it(`Stufe 1 vergleicht gegen nichts — die Werte sind die Stufe selbst`, () => {
    const gain = classLevelGain(get("srd:class:cleric"), 1);
    expect(gain?.babDelta).toBe(0); // Kleriker hat auf Stufe 1 GAB +0
    expect(gain?.saveDeltas.fort).toBe(2);
    expect(gain?.saveDeltas.will).toBe(2);
    expect(gain?.newSpellLevels).toContain(0);
  });

  it(`gibt null jenseits der Höchststufe zurück statt zu raten`, () => {
    expect(classLevelGain(get("srd:class:fighter"), 21)).toBeNull();
    expect(classLevelGain(get("srd:class:assassin"), 11)).toBeNull();
  });

  it(`liefert für jede Stufe jeder Klasse plausible Sprünge`, () => {
    for (const entity of [...compendium.values()].filter((e) => e.kind === "class")) {
      const summary = classSummary(entity);
      if (!summary) continue;
      for (let level = 1; level <= summary.maxLevel; level++) {
        const gain = classLevelGain(entity, level);
        expect(gain, `${entity.id} Stufe ${level}`).not.toBeNull();
        // Kein Rettungswurf und kein GAB springt je um mehr als 1 pro Stufe.
        expect(gain?.babDelta, `${entity.id} Stufe ${level}`).toBeLessThanOrEqual(1);
        for (const key of ["fort", "ref", "will"] as const) {
          expect(gain?.saveDeltas[key], `${entity.id} ${key} Stufe ${level}`).toBeLessThanOrEqual(2);
        }
      }
    }
  });
});

describe.skipIf(!packsAvailable)("raceSummary", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();
  const get = (id: string): Entity => {
    const entity = compendium.get(id);
    if (!entity) throw new Error(`${id} fehlt im Pack`);
    return entity;
  };

  it(`Zwerg: KO +2, CH −2, Bewegung 20`, () => {
    const summary = raceSummary(get("srd:race:dwarf"));
    expect(summary?.abilityMods).toEqual([
      { ability: "cha", value: -2 },
      { ability: "con", value: 2 },
    ]);
    expect(summary?.speedFt).toBe(20);
    expect(summary?.size).toBe("medium");
    expect(summary?.favoredClassId).toBe("srd:class:fighter");
    expect(summary?.traits.length).toBeGreaterThan(3);
  });

  it(`Mensch: keine Attributsänderung, Bewegung 30`, () => {
    const summary = raceSummary(get("srd:race:human"));
    expect(summary?.abilityMods).toEqual([]);
    expect(summary?.speedFt).toBe(30);
  });

  it(`Halbling: klein und langsamer`, () => {
    const summary = raceSummary(get("srd:race:halfling"));
    expect(summary?.size).toBe("small");
    expect(summary?.speedFt).toBe(20);
  });

  it(`liefert für jede Rasse im Pack ein Ergebnis mit Merkmalen`, () => {
    const races = [...compendium.values()].filter((e) => e.kind === "race");
    expect(races.length).toBe(7);
    for (const entity of races) {
      const summary = raceSummary(entity);
      expect(summary, entity.id).not.toBeNull();
      expect(summary?.speedFt, entity.id).toBeGreaterThan(0);
      expect(summary?.traits.length, entity.id).toBeGreaterThan(0);
    }
  });
});
