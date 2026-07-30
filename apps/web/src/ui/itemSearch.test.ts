import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { entitySchema, type Entity, type ItemEntity } from "@codex35/core";
import { buildItemSearchIndex, groupForQuery, normalize, searchItems } from "./itemSearch.js";

/**
 * Gegen die ECHTEN Packnamen. Jeder Test hier ist eine Eingabe, die vorher NULL
 * Treffer hatte — genau das war Philipps Beschwerde.
 */
const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const manifestPath = join(packsDir, "manifest.json");
const packsAvailable = existsSync(manifestPath);

function loadItems(): ItemEntity[] {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: string[] };
  const out: ItemEntity[] = [];
  for (const file of manifest.files) {
    if (!file.startsWith("items-")) continue;
    for (const raw of JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[]) {
      const entity: Entity = entitySchema.parse(raw);
      if (entity.kind === "item") out.push(entity);
    }
  }
  return out;
}

describe("normalize", () => {
  it("löst Umlaute auf, damit „rüstung\" und „ruestung\" dasselbe sind", () => {
    expect(normalize("Rüstung")).toBe("ruestung");
    expect(normalize("Ausrüstung")).toBe("ausruestung");
  });

  it("macht aus Satzzeichen Leerzeichen", () => {
    expect(normalize("Sword, short")).toBe("sword short");
    expect(normalize("Shield, heavy wooden")).toBe("shield heavy wooden");
  });
});

describe.skipIf(!packsAvailable)("Gegenstände suchen", () => {
  const items = packsAvailable ? loadItems() : [];
  const index = buildItemSearchIndex(items);
  const names = (query: string) =>
    searchItems(index, query).flatMap((g) => g.items.map((i) => i.name));

  it("findet „Sword, short\" unter „shortsword\"", () => {
    // Zusammengeschrieben — vorher null Treffer.
    expect(names("shortsword")).toContain("Sword, short");
  });

  it("findet es auch in der gedrehten Wortfolge", () => {
    expect(names("short sword")).toContain("Sword, short");
    expect(names("sword short")).toContain("Sword, short");
  });

  it("findet seinen „wooden heavy shield\"", () => {
    // Seine eigene Formulierung aus dem Chat. Das Pack schreibt
    // „Shield, heavy wooden".
    expect(names("wooden heavy shield")).toContain("Shield, heavy wooden");
  });

  it("„rüstung\" trifft die GRUPPE, weil kein Name das Wort enthält", () => {
    expect(names("rüstung")).toHaveLength(0);
    expect(groupForQuery("rüstung")).toBe("armor");
    expect(groupForQuery("armor")).toBe("armor");
    expect(groupForQuery("ruest")).toBe("armor");
  });

  it("„trank\" und „potion\" treffen die Gruppe — 0 von 85 Tränken heißen so", () => {
    const potions = items.filter((i) => i.data.category === "potion");
    expect(potions).toHaveLength(85);
    expect(potions.filter((p) => /potion/i.test(p.name))).toHaveLength(0);
    expect(groupForQuery("trank")).toBe("potion");
    expect(groupForQuery("potion")).toBe("potion");
  });

  it("dasselbe bei Schriftrollen und Zauberstäben", () => {
    expect(groupForQuery("schriftrolle")).toBe("scroll");
    expect(groupForQuery("scroll")).toBe("scroll");
    expect(groupForQuery("zauberstab")).toBe("wands");
    expect(groupForQuery("zepter")).toBe("wands");
  });

  it("Mehrdeutiges liefert keine Gruppe, statt zu raten", () => {
    // „r" passt auf ring, rolle, rod, rüstung.
    expect(groupForQuery("r")).toBeUndefined();
    expect(groupForQuery("")).toBeUndefined();
  });

  it("sortiert Treffer nach Gruppe, mit der größten zuerst", () => {
    const groups = searchItems(index, "cure light");
    expect(groups.length).toBeGreaterThan(1);
    // „Cure Light Wounds" gibt es als Trank, zwei Rollen und Zauberstab.
    const all = groups.flatMap((g) => g.items.map((i) => i.name));
    expect(all.filter((n) => n === "Cure Light Wounds").length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i]!.items.length).toBeLessThanOrEqual(groups[i - 1]!.items.length);
    }
  });

  it("„shield\" findet Schilde UND die Schildstoß-Waffen, getrennt nach Gruppe", () => {
    const groups = searchItems(index, "shield");
    const armor = groups.find((g) => g.group === "armor");
    const weapon = groups.find((g) => g.group === "weapon");
    expect(armor?.items.map((i) => i.name)).toContain("Shield, heavy wooden");
    expect(weapon?.items.map((i) => i.name)).toContain("Shield, heavy");
  });

  it("Innerhalb einer Gruppe ist die Reihenfolge alphabetisch und damit vorhersagbar", () => {
    for (const group of searchItems(index, "sword")) {
      const list = group.items.map((i) => i.name);
      expect(list).toEqual([...list].sort((a, b) => a.localeCompare(b)));
    }
  });
});
