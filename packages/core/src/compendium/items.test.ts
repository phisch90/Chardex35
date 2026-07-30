import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { entitySchema, resolveCompendium, type Entity, type ItemEntity } from "../schema/entities.js";
import { ITEM_GROUPS, groupItems, isEpicItem, itemGroupOf, itemSubgroupOf, scrollInfo } from "./items.js";

/**
 * Gegen die ECHTEN Packs. Der Sinn dieser Einteilung ist, dass sie die 1866
 * Gegenstände vollständig und ohne Rest abdeckt — das kann man nur an den echten
 * Daten prüfen. Mit erfundenen Einträgen wäre der wichtigste Test (die Summe)
 * bedeutungslos.
 */
const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const manifestPath = join(packsDir, "manifest.json");
const packsAvailable = existsSync(manifestPath);

function loadCompendium(): Map<string, Entity> {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: string[] };
  const entities: Entity[] = [];
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    for (const item of JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[]) {
      entities.push(entitySchema.parse(item));
    }
  }
  return resolveCompendium(entities);
}

describe.skipIf(!packsAvailable)("Gegenstände gruppieren", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();
  const groups = groupItems(compendium);
  const item = (id: string): ItemEntity => {
    const hit = compendium.get(id);
    if (hit?.kind !== "item") throw new Error(`${id} ist kein Gegenstand`);
    return hit;
  };

  it("deckt alle 1866 Gegenstände ab, ohne Rest", () => {
    /*
      Der wichtigste Test der Datei. Eine Einteilung, die etwas übrig lässt,
      versteckt genau die Gegenstände, die man dann wieder nicht findet — und das
      war der Anlass für die ganze Arbeit.
    */
    const total = [...groups.values()].reduce((sum, list) => sum + list.length, 0);
    expect(total).toBe(1866);
  });

  it("teilt so ein, wie die Zahlen es hergeben", () => {
    const counts = Object.fromEntries([...groups].map(([key, list]) => [key, list.length]));
    expect(counts).toEqual({
      weapon: 78,
      armor: 18, // 12 Rüstungen + 6 Schilde — die Antwort auf „ich finde keine Rüstungen"
      gear: 186, // 166 Ausrüstung + 20 Werkzeug
      potion: 85,
      scroll: 734,
      wands: 176, // 81 Zauberstäbe + 61 Zepter + 34 Stäbe
      ring: 65,
      wondrous: 297,
      magicGear: 72,
      specialAbility: 103,
      cursed: 28,
      artifact: 24,
      other: 0,
    });
  });

  it("Rüstung und Schilde landen zusammen, getrennt nach Art", () => {
    expect(itemGroupOf(item("srd:item:shield-heavy-wooden"))).toBe("armor");
    expect(itemSubgroupOf(item("srd:item:shield-heavy-wooden"))).toBe("shield");
    expect(itemSubgroupOf(item("srd:item:leather"))).toBe("light");
    const kinds = groups.get("armor")!.map((e) => itemSubgroupOf(e));
    expect(kinds.filter((k) => k === "light")).toHaveLength(4);
    expect(kinds.filter((k) => k === "medium")).toHaveLength(4);
    expect(kinds.filter((k) => k === "heavy")).toHaveLength(4);
    expect(kinds.filter((k) => k === "shield")).toHaveLength(6);
  });

  it("Waffen nach Vertrautheit, weil danach gewählt wird", () => {
    expect(itemSubgroupOf(item("srd:item:dagger"))).toBe("simple");
    expect(itemSubgroupOf(item("srd:item:longsword"))).toBe("martial");
    const cats = groups.get("weapon")!.map((e) => itemSubgroupOf(e));
    expect(cats.filter((c) => c === "simple")).toHaveLength(21);
    expect(cats.filter((c) => c === "martial")).toHaveLength(36);
    expect(cats.filter((c) => c === "exotic")).toHaveLength(21);
  });

  it("Eine Waffeneigenschaft ist kein Gegenstand — die Marke schlägt die Kategorie", () => {
    /*
      „Flaming" trägt `category: "magic"`, gehört aber nicht zwischen die
      Zauberringe: man kann es nicht in den Rucksack legen. Prüft die
      Reihenfolge der Prüfungen in itemGroupOf.
    */
    const flaming = [...compendium.values()].find(
      (e) => e.kind === "item" && e.name === "Flaming",
    ) as ItemEntity | undefined;
    expect(flaming).toBeDefined();
    expect(flaming!.data.category).toBe("magic");
    expect(itemGroupOf(flaming!)).toBe("specialAbility");
  });

  it("Episches ist markiert, damit man es ausblenden UND zählen kann", () => {
    const epic = [...groups.values()].flat().filter(isEpicItem);
    expect(epic).toHaveLength(150);
    // Verteilt über fünf Gruppen — ein globaler Schalter ist deshalb richtig.
    expect(new Set(epic.map(itemGroupOf)).size).toBe(5);
  });

  describe("Schriftrollen", () => {
    it("rechnet Grad und Tradition aus dem Zauber", () => {
      expect(scrollInfo(item("srd:item:acid-arrow"), compendium)).toEqual({
        grade: 2,
        tradition: "arcane",
        spellId: "srd:spell:acid-arrow",
      });
      expect(scrollInfo(item("srd:item:alarm-scroll-divine"), compendium)).toEqual({
        grade: 1,
        tradition: "divine",
        spellId: "srd:spell:alarm",
      });
    });

    it("löst 728 von 734 auf und lässt die 6 Sammeleinträge übrig", () => {
      /*
        Die sechs sind „Detect Chaos/Evil/Good/Law" und Geschwister: eine Rolle,
        vier Zauber. Die bekommen in der Anzeige eine eigene, BENANNTE
        Restgruppe — 6 verschwiegene Zeilen wären genau die Sorte stiller
        Abschneidung, die dieses Projekt verbietet.
      */
      const scrolls = groups.get("scroll")!;
      const resolved = scrolls.map((e) => scrollInfo(e, compendium)).filter((x) => x !== undefined);
      expect(resolved).toHaveLength(728);
      expect(resolved.filter((x) => x!.tradition === "arcane")).toHaveLength(404);
      expect(resolved.filter((x) => x!.tradition === "divine")).toHaveLength(324);
    });

    it("schneidet die Preis-Zahl VOR dem -scroll-Anhang ab", () => {
      // Umgekehrt bleiben acht Rollen unauflösbar — genau daran ist die erste
      // Fassung gescheitert.
      const hit = [...compendium.values()].find(
        (e) => e.kind === "item" && e.id.endsWith("-scroll-divine-1050"),
      ) as ItemEntity | undefined;
      expect(hit).toBeDefined();
      expect(scrollInfo(hit!, compendium)?.spellId).toBe("srd:spell:break-enchantment");
    });

    it("Für einen Kleriker auf Stufe 7 bleiben 173 statt 734", () => {
      // Göttlich bis Grad 4 — das ist die Zahl, die den Unterschied macht.
      const relevant = groups
        .get("scroll")!
        .map((e) => scrollInfo(e, compendium))
        .filter((x) => x !== undefined && x.tradition === "divine" && x.grade <= 4);
      expect(relevant.length).toBeLessThan(200);
      expect(relevant.length).toBeGreaterThan(100);
    });

    it("Was keine Schriftrolle ist, bekommt keinen Grad", () => {
      expect(scrollInfo(item("srd:item:longsword"), compendium)).toBeUndefined();
    });
  });

  it("Die Gruppen-Reihenfolge ist die vom Spieltisch, nicht das Alphabet", () => {
    // Waffen und Rüstung zuerst — danach sucht man im Kampf.
    expect(ITEM_GROUPS[0]).toBe("weapon");
    expect(ITEM_GROUPS[1]).toBe("armor");
    expect([...groups.keys()]).toEqual([...ITEM_GROUPS]);
  });

  it("Jede Gruppe ist nach Namen sortiert, damit die Reihenfolge vorhersagbar ist", () => {
    for (const [key, list] of groups) {
      const names = list.map((e) => e.name);
      expect(names, key).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    }
  });
});
