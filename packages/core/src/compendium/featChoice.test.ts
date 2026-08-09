import { describe, expect, it } from "vitest";
import { featNeedsWeaponChoice, isWeaponEntity } from "./featChoice.js";
import { entitySchema, type Entity } from "../schema/entities.js";

/*
  KOPFNOTIZEN:
  - Keine deutschen Anfuehrungszeichen in dieser Datei — sie haben esbuild schon
    sechsmal an einer voellig gesunden Zeile weiter unten scheitern lassen.
  - Gebaut wird UEBER das Schema (`entitySchema.parse`) und nicht als Literal mit
    `as Entity`. Genau daraus ist einmal die Fehlerfamilie 1 entstanden: ein Parser,
    der Literale baut, laesst Standardwerte weg, und der Test prueft dann etwas, das
    es in der App so nie gibt.
*/
const E = (raw: unknown): Entity => entitySchema.parse(raw);

const weaponFocus = E({
  id: "test:feat:weapon-focus",
  kind: "feat",
  name: "Weapon Focus",
  source: "srd",
  data: { requiresChoice: true, prerequisites: [] },
  effects: [{ target: "attack.self", bonusType: "untyped", value: 1, scope: "chosenItem" }],
});

const alertness = E({
  id: "test:feat:alertness",
  kind: "feat",
  name: "Alertness",
  source: "srd",
  data: { prerequisites: [] },
  effects: [{ target: "skill.all", bonusType: "untyped", value: 2 }],
});

const toughness = E({
  id: "test:feat:toughness",
  kind: "feat",
  name: "Toughness",
  source: "srd",
  data: { prerequisites: [] },
  effects: [],
});

const longsword = E({
  id: "test:item:longsword",
  kind: "item",
  name: "Longsword",
  source: "srd",
  data: { weight: 4, weapon: { damage: "1d8", critical: "19-20/x2", handedness: "one" } },
});

const rope = E({
  id: "test:item:rope",
  kind: "item",
  name: "Hemp Rope",
  source: "srd",
  data: { weight: 10 },
});

describe("featNeedsWeaponChoice", () => {
  it("sagt ja bei einem Talent, dessen Bonus an der gewaehlten Waffe haengt", () => {
    expect(featNeedsWeaponChoice(weaponFocus)).toBe(true);
  });

  it("sagt nein bei einem Talent, das immer wirkt", () => {
    expect(featNeedsWeaponChoice(alertness)).toBe(false);
  });

  /*
    Ein Talent ohne jede eingetragene Wirkung ist der Normalfall: 300 der 327
    SRD-Talente bringen keine Zahl mit. Die duerfen keine Waffenfrage ausloesen,
    sonst steht bei jedem zweiten Talent ein Blatt im Weg, das nichts zu entscheiden
    hat.
  */
  it("sagt nein bei einem Talent ganz ohne Wirkung", () => {
    expect(featNeedsWeaponChoice(toughness)).toBe(false);
  });

  it("sagt nein zu allem, was gar kein Talent ist", () => {
    expect(featNeedsWeaponChoice(undefined)).toBe(false);
    expect(featNeedsWeaponChoice(longsword)).toBe(false);
  });
});

describe("isWeaponEntity", () => {
  it("erkennt eine Waffe an ihren Waffendaten, nicht am Namen", () => {
    expect(isWeaponEntity(longsword)).toBe(true);
  });

  it("sagt nein bei einem Gegenstand ohne Waffendaten und bei allem anderen", () => {
    expect(isWeaponEntity(rope)).toBe(false);
    expect(isWeaponEntity(weaponFocus)).toBe(false);
    expect(isWeaponEntity(undefined)).toBe(false);
  });
});

/*
  Die Gegenprobe gegen die ECHTEN Packs: es geht hier nicht um die Zahl, sondern
  darum, dass die Regel ueberhaupt jemanden trifft. Eine Bedingung, die auf kein
  einziges Talent zutrifft, waere gruen und trotzdem wertlos — genau der Test, der
  einmal alle elf Klassenfarben gegen einen Startwert von 999 verglichen hat und
  Erfolg meldete, ohne ein einziges Thema gefunden zu haben.
*/
describe("gegen die Packs", () => {
  it("Weapon Focus aus dem SRD braucht wirklich eine Waffe", async () => {
    const { readFileSync, existsSync } = await import("node:fs");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const packs = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
    const manifest = join(packs, "manifest.json");
    if (!existsSync(manifest)) return;
    const files = (JSON.parse(readFileSync(manifest, "utf8")) as { files: string[] }).files;
    const feats: Entity[] = [];
    for (const file of files) {
      if (!file.startsWith("feats")) continue;
      for (const raw of JSON.parse(readFileSync(join(packs, file), "utf8")) as unknown[]) {
        feats.push(entitySchema.parse(raw));
      }
    }
    const needing = feats.filter((entity) => featNeedsWeaponChoice(entity));
    expect(needing.length).toBeGreaterThan(0);
    expect(needing.map((entity) => entity.name)).toContain("Weapon Focus");
  });
});
