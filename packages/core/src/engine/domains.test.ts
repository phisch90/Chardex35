import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { deriveSheet } from "./index.js";
import { domainSpellLists, spellsForCaster } from "./spells.js";

/**
 * Domänen — gegen die ECHTEN Packs, nicht gegen Platzhalter.
 *
 * Der Anlass steht in seinem Bogen: Fight Club zeigt seinem Kleriker 4 Plätze
 * auf Grad 1, die App zeigte 3. Die Tabelle im SRD schreibt „3+1", und das „+1"
 * ist der Domänenplatz — eine Fußnote, die kein Tabellenfeld hat und die dieser
 * App deshalb komplett fehlte.
 *
 * Mit erfundenen Kennungen wäre das nicht prüfbar: die Zahl hängt an der
 * Klerikertabelle im Pack, die Zauber hängen an den 36 Domänenlisten, die die
 * Umwandlung dort ablegt. Beides gehört zum Beweis.
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

const CLERIC = "srd:class:cleric";
const HEALING = "srd:spelllist:domain-healing";
const WAR = "srd:spelllist:domain-war";

/**
 * Sein Kleriker, auf das Nötige zusammengezogen: WIS 11 heißt Attributsbonus 0,
 * und damit ist jeder Platz, der über der Tabelle liegt, der Domänenplatz und
 * nichts anderes. Mit WIS 14 wäre die Zahl auf Grad 1 dieselbe und der Test
 * würde nichts beweisen.
 */
function cleric(levels: number, domains: { classId: string; spellListId: string }[] = []): Character {
  return characterSchema.parse({
    id: "domain-1",
    name: "Hike",
    abilities: { base: { str: 12, dex: 10, con: 12, int: 10, wis: 11, cha: 14 } },
    raceId: "srd:race:human",
    levels: Array.from({ length: levels }, () => ({ classId: CLERIC, hpRoll: "avg" as const })),
    domains,
  });
}

describe.skipIf(!packsAvailable)("Domänen", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();
  const block = (character: Character) => {
    const sheet = deriveSheet(character, compendium);
    const found = sheet.spellcasting.find((b) => b.classId === CLERIC);
    if (!found) throw new Error("kein Kleriker-Zauberblock");
    return found;
  };

  it("Kleriker 4 mit WIS 11: Grad 1 hat 4 Plätze, Grad 2 hat 3 — das fehlende +1", () => {
    const slots = block(cleric(4)).slots;
    // Tabelle: 5 / 3 / 2. Auf dem Bogen: 5 / 4 / 3.
    expect(slots[1]).toMatchObject({ base: 3, bonus: 0, domain: 1, total: 4 });
    expect(slots[2]).toMatchObject({ base: 2, bonus: 0, domain: 1, total: 3 });
  });

  it("Grad 0 bekommt keinen Domänenplatz — Kantrips sind keine Domänenzauber", () => {
    const slots = block(cleric(4)).slots;
    expect(slots[0]).toMatchObject({ base: 5, domain: 0, total: 5 });
  });

  it("Ein Grad ohne Plätze bleibt ohne Plätze — kein Zauber aus dem Nichts", () => {
    // Kleriker 1 kann Grad 2 noch nicht.
    const slots = block(cleric(1)).slots;
    expect(slots[1]).toMatchObject({ base: 1, domain: 1, total: 2 });
    expect(slots[2]).toMatchObject({ base: null, domain: 0, total: null });
  });

  it("Der Domänenplatz stapelt mit dem Attributsbonus, statt ihn zu ersetzen", () => {
    const withWisdom = characterSchema.parse({
      ...cleric(4),
      abilities: { base: { str: 12, dex: 10, con: 12, int: 10, wis: 18, cha: 14 } },
    });
    // WIS 18 = +4: Bonus-Slot auf Grad 1 und 2, dazu je der Domänenplatz.
    expect(block(withWisdom).slots[1]).toMatchObject({ base: 3, bonus: 1, domain: 1, total: 5 });
  });

  it("Nur der Kleriker hat Domänen — der Druide nicht", () => {
    const druid = characterSchema.parse({
      ...cleric(4),
      levels: Array.from({ length: 4 }, () => ({ classId: "srd:class:druid", hpRoll: "avg" as const })),
    });
    const sheet = deriveSheet(druid, compendium);
    const found = sheet.spellcasting.find((b) => b.classId === "srd:class:druid")!;
    expect(found.domainPick).toBe(0);
    // Kein Domänenplatz heißt: die Summe ist genau die Tabellenzahl.
    expect(found.slots[1]?.domain).toBe(0);
    expect(found.slots[1]?.total).toBe(found.slots[1]?.base);
  });

  it("Gewählte Domänen kommen mit Namen im Zauberblock an", () => {
    const found = block(
      cleric(4, [
        { classId: CLERIC, spellListId: HEALING },
        { classId: CLERIC, spellListId: WAR },
      ]),
    );
    expect(found.domainPick).toBe(2);
    expect(found.domains).toEqual([
      { spellListId: HEALING, name: "Healing Domain" },
      { spellListId: WAR, name: "War Domain" },
    ]);
  });

  it("Domänen einer anderen Klasse landen nicht im Kleriker-Block", () => {
    const found = block(cleric(4, [{ classId: "srd:class:druid", spellListId: WAR }]));
    expect(found.domains).toEqual([]);
  });

  it("Fehlende Domänen sind eine Warnung, keine Sperre", () => {
    const sheet = deriveSheet(cleric(4), compendium);
    const issue = sheet.issues.find((i) => i.code === "domains-missing");
    expect(issue?.severity).toBe("warning");
    expect(issue?.message).toContain("0 von 2");
    // Der Platz ist trotzdem da — ein halb ausgefüllter Bogen rechnet richtig.
    expect(sheet.spellcasting[0]?.slots[1]?.total).toBe(4);
  });

  it("Zwei gewählte Domänen sind kein Grund zu meckern", () => {
    const sheet = deriveSheet(
      cleric(4, [
        { classId: CLERIC, spellListId: HEALING },
        { classId: CLERIC, spellListId: WAR },
      ]),
      compendium,
    );
    expect(sheet.issues.filter((i) => i.code.startsWith("domains-"))).toEqual([]);
  });

  it("Eine dritte Domäne wird gemeldet", () => {
    const sheet = deriveSheet(
      cleric(4, [
        { classId: CLERIC, spellListId: HEALING },
        { classId: CLERIC, spellListId: WAR },
        { classId: CLERIC, spellListId: "srd:spelllist:domain-sun" },
      ]),
      compendium,
    );
    expect(sheet.issues.find((i) => i.code === "domains-too-many")).toBeDefined();
  });

  describe("Zauberauswahl", () => {
    const found = () =>
      block(
        cleric(4, [
          { classId: CLERIC, spellListId: HEALING },
          { classId: CLERIC, spellListId: WAR },
        ]),
      );

    it("bringt Domänenzauber mit, die auf keiner Klerikerliste stehen", () => {
      const entries = spellsForCaster(compendium, found());
      // Power Word Kill ist War 9 und sonst nirgends beim Kleriker.
      const pwk = entries.find((e) => e.spellId === "srd:spell:power-word-kill");
      expect(pwk).toMatchObject({ level: 9, domain: "War Domain" });
      // Gegenprobe: über die Klassenliste allein wäre er nicht dabei.
      expect(
        spellsForCaster(compendium, { spellListId: found().spellListId, domains: [] }).some(
          (e) => e.spellId === "srd:spell:power-word-kill",
        ),
      ).toBe(false);
    });

    it("listet einen Zauber, der auf beiden Listen im gleichen Grad steht, nur einmal", () => {
      const entries = spellsForCaster(compendium, found());
      // Cure Light Wounds ist Cleric 1 UND Healing 1.
      const clw = entries.filter(
        (e) => e.spellId === "srd:spell:cure-light-wounds" && e.level === 1,
      );
      expect(clw).toHaveLength(1);
      // Die Klassenliste gewinnt — also ohne Domänen-Marke.
      expect(clw[0]?.domain).toBeUndefined();
    });

    it("ohne gewählte Domänen ist die Auswahl genau die Klassenliste", () => {
      const bare = block(cleric(4));
      const entries = spellsForCaster(compendium, bare);
      expect(entries.every((e) => e.domain === undefined)).toBe(true);
      expect(entries).toHaveLength(236);
    });

    it("bleibt nach Grad und Name sortiert", () => {
      const entries = spellsForCaster(compendium, found());
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i]!.level).toBeGreaterThanOrEqual(entries[i - 1]!.level);
      }
    });
  });

  it("Die Auswahlliste der Domänen kommt aus der Marke, nicht aus dem Namensmuster", () => {
    const lists = domainSpellLists(compendium);
    expect(lists).toHaveLength(36);
    expect(lists.map((l) => l.name)).toContain("War Domain");
    expect(lists.map((l) => l.name)).toContain("Healing Domain");
    // Die Klassenlisten tragen die Marke nicht.
    expect(lists.map((l) => l.id)).not.toContain("srd:spelllist:cleric");
    // Sortiert, damit die Auswahl im Bogen nicht springt.
    expect(lists.map((l) => l.name)).toEqual([...lists.map((l) => l.name)].sort((a, b) => a.localeCompare(b)));
  });
});
