import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEFAULT_HOUSE_RULES, characterSchema, type Character } from "../schema/character.js";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { deriveSheet } from "./index.js";
import { countDiffEntries, diffSheets, type SheetDiffGroup } from "./diff.js";

/**
 * Gegen die ECHTEN SRD-Packs: der Vergleich ist nur so gut wie die Werte, die
 * er gegenüberstellt. Handgebaute Attrappen würden genau die Fälle verstecken,
 * um die es geht (neue Zauberslots, neue Klassenfähigkeiten, Iterativangriffe).
 */
const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const manifestPath = join(packsDir, "manifest.json");
const packsAvailable = existsSync(manifestPath);

function loadCompendium(): Map<string, Entity> {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: string[] };
  const entities: Entity[] = [];
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    const raw = JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[];
    for (const item of raw) entities.push(entitySchema.parse(item));
  }
  return resolveCompendium(entities);
}

const C = (raw: unknown): Character => characterSchema.parse(raw);

/** Kämpfer/Kleriker wie Hike — die Vorlage, an der er es ausprobieren wird. */
function hike(levels: { classId: string; hpRoll: "avg" }[]): Character {
  return C({
    id: "diff-test",
    name: "Hike",
    abilities: { base: { str: 15, dex: 13, con: 12, int: 8, wis: 11, cha: 10 } },
    raceId: "srd:race:human",
    levels,
    skillRanks: { "srd:skill:ride": 4 },
  });
}

const FIGHTER = { classId: "srd:class:fighter", hpRoll: "avg" } as const;
const CLERIC = { classId: "srd:class:cleric", hpRoll: "avg" } as const;

function find(groups: SheetDiffGroup[], title: string, label: string) {
  return groups.find((g) => g.title === title)?.entries.find((e) => e.label === label);
}

describe.skipIf(!packsAvailable)("diffSheets", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();
  const derive = (character: Character) =>
    deriveSheet(character, compendium, DEFAULT_HOUSE_RULES);

  it(`zeigt bei identischen Bögen gar nichts an`, () => {
    const sheet = derive(hike([FIGHTER, FIGHTER, FIGHTER]));
    const groups = diffSheets(sheet, sheet);
    expect(groups).toEqual([]);
    expect(countDiffEntries(groups)).toBe(0);
  });

  it(`stellt zwei Wege für dieselbe nächste Stufe gegenüber — genau die Frage`, () => {
    // Fighter 3 / Cleric 3 wird entweder Fighter 4 oder Cleric 4.
    const base = [FIGHTER, FIGHTER, FIGHTER, CLERIC, CLERIC, CLERIC];
    const alsFighter = derive(hike([...base, FIGHTER]));
    const alsCleric = derive(hike([...base, CLERIC]));
    const groups = diffSheets(alsFighter, alsCleric);

    expect(find(groups, "Stufe & Klassen", "Klassen")).toEqual({
      label: "Klassen",
      before: "Fighter 4 / Cleric 3",
      after: "Fighter 3 / Cleric 4",
    });
    // Die Stufe bleibt 7 — darf also NICHT auftauchen.
    expect(find(groups, "Stufe & Klassen", "Stufe")).toBeUndefined();

    // Der lehrreiche Teil: der BAB ist in BEIDEN Wegen +6 (4+2 bzw. 3+3).
    // Wer „dann nehme ich Kämpfer für den Angriff" denkt, sieht hier, dass
    // das auf dieser Stufe nichts bringt.
    expect(find(groups, "Angriff", "BAB")).toBeUndefined();

    // Was sich stattdessen unterscheidet:
    expect(find(groups, "Rettungswürfe", "Will")).toMatchObject({
      before: "+4",
      after: "+5",
      delta: 1,
    });
    // Kämpfer-Stufe 4 gibt ein Bonustalent, Kleriker nicht.
    expect(find(groups, "Punkte", "Talent-Slots")?.delta).toBe(-1);
    // … und der Kleriker bringt Grad-2-Zauber.
    //
    // Ab Grad 1 ist der Domänenplatz mitgezählt: die Tabelle sagt für Kleriker 3
    // „4/2/1", der Bogen zeigt 4/3/2. Grad 0 bleibt bei 4 — Kantrips bekommen
    // keinen Domänenplatz.
    const slots = groups
      .find((g) => g.title === "Zauber")
      ?.entries.find((e) => e.label.endsWith("Slots"));
    expect(slots?.before).toBe("4/3/2/—/—/—/—/—/—/—");
    expect(slots?.after).toBe("5/4/3/—/—/—/—/—/—/—");
  });

  it(`macht neue Trefferpunkte und Rettungswürfe sichtbar`, () => {
    const groups = diffSheets(derive(hike([FIGHTER])), derive(hike([FIGHTER, FIGHTER])));
    const hp = find(groups, "Trefferpunkte & Verteidigung", "HP (max)");
    expect(hp?.delta).toBeGreaterThan(0);
    const fort = find(groups, "Rettungswürfe", "Fortitude");
    expect(fort?.before).toMatch(/^\+/);
    expect(fort?.delta).toBe(1);
  });

  it(`meldet einen neuen Iterativangriff als Textänderung`, () => {
    // BAB +5 → zweiter Angriff. Ohne Waffe gibt es die Unbewaffnet-Zeile.
    const groups = diffSheets(
      derive(hike(Array.from({ length: 5 }, () => FIGHTER))),
      derive(hike(Array.from({ length: 6 }, () => FIGHTER))),
    );
    const attack = groups.find((g) => g.title === "Angriff")?.entries.find((e) => e.before.includes("/") || e.after.includes("/"));
    expect(attack).toBeDefined();
    expect(attack?.after).toContain("/");
  });

  it(`listet neue Klassenfähigkeiten als „neu"`, () => {
    const groups = diffSheets(derive(hike([FIGHTER])), derive(hike([FIGHTER, CLERIC])));
    const features = groups.find((g) => g.title === "Klassenfähigkeiten");
    expect(features).toBeDefined();
    expect(features?.entries.every((e) => e.after === "neu" || e.after === "entfällt")).toBe(true);
    expect(features?.entries.some((e) => e.after === "neu")).toBe(true);
  });

  it(`ist richtungsabhängig: vertauschte Eingaben tauschen vorher und nachher`, () => {
    const a = derive(hike([FIGHTER]));
    const b = derive(hike([FIGHTER, FIGHTER]));
    const forward = find(diffSheets(a, b), "Trefferpunkte & Verteidigung", "HP (max)");
    const backward = find(diffSheets(b, a), "Trefferpunkte & Verteidigung", "HP (max)");
    expect(forward?.before).toBe(backward?.after);
    expect(forward?.after).toBe(backward?.before);
    expect(forward?.delta).toBe(-(backward?.delta ?? 0));
  });

  it(`gibt nur Gruppen aus, in denen wirklich etwas steht`, () => {
    const groups = diffSheets(derive(hike([FIGHTER])), derive(hike([FIGHTER, FIGHTER])));
    expect(groups.every((g) => g.entries.length > 0)).toBe(true);
    // Attribute ändern sich zwischen Stufe 1 und 2 nicht.
    expect(groups.find((g) => g.title === "Attribute")).toBeUndefined();
  });

  it(`zeigt eine neu antrainierte Fertigkeit als „—" davor, nicht als Wertsprung`, () => {
    const before = hike([FIGHTER]);
    const after = C({ ...before, skillRanks: { ...before.skillRanks, "srd:skill:tumble": 1 } });
    const groups = diffSheets(derive(before), derive(after));
    const tumble = groups
      .find((g) => g.title === "Fertigkeiten")
      ?.entries.find((e) => e.label.startsWith("Tumble"));
    expect(tumble?.before).toBe("—");
    expect(tumble?.after).toContain("1 Rg");
  });
});
