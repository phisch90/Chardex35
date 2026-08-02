import { describe, expect, it } from "vitest";
import { characterSchema, houseRulesSchema } from "../schema/character.js";
import { entitySchema, resolveCompendium, type ClassLevelRow } from "../schema/entities.js";
import { deriveSheet } from "./index.js";
import { effectiveTrackerMax, suggestTrackers, trackerMaxNote } from "./trackers.js";

/**
 * Die Formeln hier sind der Grund für diese Tests: sie stehen im Regelwerk, nicht
 * im Datensatz, also kann sie nichts außer einem Test gegenprüfen. Zwei davon
 * hatte ich beim Schreiben falsch (Betäubender Schlag, Tiergestalt) — die
 * erwarteten Zahlen unten sind die aus den 3.5-Klassentabellen.
 */

// Nur so viel Kompendium, wie suggestTrackers braucht: echte SRD-IDs, Stufen,
// und ein paar Klassenfähigkeiten mit „X/day“ im Namen.
function rows(count: number, features: (level: number) => string[] = () => []): ClassLevelRow[] {
  return Array.from({ length: count }, (_, i) => {
    const level = i + 1;
    return {
      bab: level,
      fort: 2 + Math.floor(level / 2),
      ref: Math.floor(level / 3),
      will: Math.floor(level / 3),
      features: features(level).map((name) => ({ name })),
      template: { bab: "good", fort: "good", ref: "poor", will: "poor" },
    } as ClassLevelRow;
  });
}

function classEntity(id: string, name: string, extra: Partial<Record<string, unknown>> = {}) {
  return entitySchema.parse({
    id,
    kind: "class",
    name,
    source: "srd",
    data: {
      hitDie: 8,
      skillPointsPerLevel: 4,
      classSkillIds: [],
      levels: rows(20),
      ...extra,
    },
  });
}

function featEntity(id: string, name: string, data: Record<string, unknown> = {}) {
  return entitySchema.parse({ id, kind: "feat", name, source: "srd", data });
}

const COMPENDIUM = resolveCompendium([
  featEntity("srd:feat:extra-turning", "Extra Turning", {
    stackable: true,
    extraUses: [{ mechanic: "turn-undead", perInstance: 4 }],
  }),
  featEntity("srd:feat:extra-music", "Extra Music", {
    stackable: true,
    extraUses: [{ mechanic: "bardic-music", perInstance: 4 }],
  }),
  featEntity("srd:feat:stunning-fist", "Stunning Fist"),
  // Homebrew nimmt am selben Mechanismus teil — nichts im Code kennt Talent-Namen.
  entitySchema.parse({
    id: "hb:feat:segen-des-tempels",
    kind: "feat",
    name: "Segen des Tempels",
    source: "homebrew",
    data: { extraUses: [{ mechanic: "turn-undead", perInstance: 2 }] },
  }),
  entitySchema.parse({
    id: "srd:race:human",
    kind: "race",
    name: "Human",
    source: "srd",
    data: { size: "medium", speedFt: 30 },
  }),
  classEntity("srd:class:cleric", "Cleric"),
  classEntity("srd:class:paladin", "Paladin"),
  classEntity("srd:class:bard", "Bard"),
  classEntity("srd:class:barbarian", "Barbarian"),
  classEntity("srd:class:monk", "Monk"),
  classEntity("srd:class:druid", "Druid"),
  classEntity("srd:class:fighter", "Fighter", {
    // Fähigkeit mit eindeutiger Zahl im Namen — der generische Zweig.
    levels: rows(20, (level) => (level === 1 ? ["Second Wind 2/day"] : [])),
  }),
]);

const HOUSE = houseRulesSchema.parse({});

function sheetFor(
  classId: string,
  level: number,
  cha = 10,
  opts: { feats?: string[]; plus?: { classId: string; level: number } } = {},
) {
  const levels = [
    ...Array.from({ length: level }, () => ({ classId, hpRoll: "avg" as const })),
    ...Array.from({ length: opts.plus?.level ?? 0 }, () => ({
      classId: opts.plus!.classId,
      hpRoll: "avg" as const,
    })),
  ];
  const character = characterSchema.parse({
    id: "t",
    name: "Testfigur",
    raceId: "srd:race:human",
    abilities: { base: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha } },
    levels,
    feats: (opts.feats ?? []).map((featId) => ({ featId })),
  });
  return deriveSheet(character, COMPENDIUM, HOUSE);
}

const suggestionFor = (classId: string, level: number, key: string, cha = 10) =>
  suggestTrackers(sheetFor(classId, level, cha)).find((s) => s.key === key);

describe("suggestTrackers", () => {
  it("Untote vertreiben: 3 + CHA-Modifikator, mindestens 1", () => {
    expect(suggestionFor("srd:class:cleric", 1, "turn-undead", 16)?.max).toBe(6);
    expect(suggestionFor("srd:class:cleric", 1, "turn-undead", 10)?.max).toBe(3);
    // CH 6 → −2 → 1 statt 0: ein Zähler mit Maximum 0 wäre sinnlos.
    expect(suggestionFor("srd:class:cleric", 1, "turn-undead", 6)?.max).toBe(1);
  });

  it("Paladin vertreibt erst ab Stufe 4", () => {
    expect(suggestionFor("srd:class:paladin", 3, "turn-undead")).toBeUndefined();
    expect(suggestionFor("srd:class:paladin", 4, "turn-undead")?.max).toBe(3);
  });

  it("Böses niederstrecken: 1/Tag, +1 auf Stufe 5, 10, 15, 20", () => {
    expect(suggestionFor("srd:class:paladin", 1, "smite-evil")?.max).toBe(1);
    expect(suggestionFor("srd:class:paladin", 4, "smite-evil")?.max).toBe(1);
    expect(suggestionFor("srd:class:paladin", 5, "smite-evil")?.max).toBe(2);
    expect(suggestionFor("srd:class:paladin", 20, "smite-evil")?.max).toBe(5);
  });

  it("Bardenmusik: einmal je Bardenstufe", () => {
    expect(suggestionFor("srd:class:bard", 7, "bardic-music")?.max).toBe(7);
  });

  it("Raserei: 1/Tag, +1 auf Stufe 4, 8, 12, 16, 20", () => {
    expect(suggestionFor("srd:class:barbarian", 1, "rage")?.max).toBe(1);
    expect(suggestionFor("srd:class:barbarian", 4, "rage")?.max).toBe(2);
    expect(suggestionFor("srd:class:barbarian", 11, "rage")?.max).toBe(3);
    expect(suggestionFor("srd:class:barbarian", 20, "rage")?.max).toBe(6);
  });

  it("Betäubender Schlag: der Mönch darf einmal je Mönchsstufe", () => {
    // Die „einmal je vier Stufen“ im Talenttext gelten für Nicht-Mönche.
    expect(suggestionFor("srd:class:monk", 6, "stunning-fist")?.max).toBe(6);
  });

  it("Betäubender Schlag: Mönch plus je 4 Stufen anderer Klassen", () => {
    // SRD: „a number of times per day equal to her monk level, plus one more
    // time per day for every four levels she has in classes other than monk“.
    const sheet = sheetFor("srd:class:monk", 6, 10, {
      plus: { classId: "srd:class:fighter", level: 4 },
    });
    const found = suggestTrackers(sheet).find((s) => s.key === "stunning-fist");
    expect(found?.max).toBe(7);
    expect(found?.note).toContain("anderer Klassen");
  });

  it("Betäubender Schlag ohne Mönch: einmal je 4 Stufen, nur MIT dem Talent", () => {
    const withFeat = sheetFor("srd:class:fighter", 8, 10, {
      feats: ["srd:feat:stunning-fist"],
    });
    expect(suggestTrackers(withFeat).find((s) => s.key === "stunning-fist")?.max).toBe(2);

    // Ohne das Talent gibt es die Mechanik nicht.
    const without = sheetFor("srd:class:fighter", 8);
    expect(suggestTrackers(without).some((s) => s.key === "stunning-fist")).toBe(false);

    // Stufe 3 mit Talent: 0 Einsätze — dann lieber kein Vorschlag als „max 0“.
    const tooLow = sheetFor("srd:class:fighter", 3, 10, { feats: ["srd:feat:stunning-fist"] });
    expect(suggestTrackers(tooLow).some((s) => s.key === "stunning-fist")).toBe(false);
  });

  describe("Talente werten die Mechanik auf (aus den Daten, nicht per Namensliste)", () => {
    it("Extra Turning gibt vier Versuche mehr und stapelt", () => {
      const once = sheetFor("srd:class:cleric", 5, 16, { feats: ["srd:feat:extra-turning"] });
      const found = suggestTrackers(once).find((s) => s.key === "turn-undead");
      // 3 + CH 3 = 6, plus 4 aus dem Talent
      expect(found?.max).toBe(10);
      expect(found?.note).toContain("+4 aus Talenten");

      const twice = sheetFor("srd:class:cleric", 5, 16, {
        feats: ["srd:feat:extra-turning", "srd:feat:extra-turning"],
      });
      expect(suggestTrackers(twice).find((s) => s.key === "turn-undead")?.max).toBe(14);
    });

    it("Extra Music gibt vier Einsätze mehr", () => {
      const sheet = sheetFor("srd:class:bard", 7, 10, { feats: ["srd:feat:extra-music"] });
      expect(suggestTrackers(sheet).find((s) => s.key === "bardic-music")?.max).toBe(11);
    });

    it("Ein Talent für eine andere Mechanik lässt den Vorschlag unberührt", () => {
      const sheet = sheetFor("srd:class:cleric", 5, 10, { feats: ["srd:feat:extra-music"] });
      const found = suggestTrackers(sheet).find((s) => s.key === "turn-undead");
      expect(found?.max).toBe(3);
      expect(found?.note).not.toContain("Talenten");
    });

    it("Ein Homebrew-Talent zählt genauso mit wie ein SRD-Talent", () => {
      const sheet = sheetFor("srd:class:cleric", 5, 10, {
        feats: ["hb:feat:segen-des-tempels", "srd:feat:extra-turning"],
      });
      const found = suggestTrackers(sheet).find((s) => s.key === "turn-undead");
      // 3 + CH 0 = 3, plus 2 (Homebrew) plus 4 (Extra Turning)
      expect(found?.max).toBe(9);
      expect(found?.note).toContain("+6 aus Talenten");
    });

    /**
     * Der Absturz vom ersten Start nach dem Update: das Kompendium kommt aus der
     * Geräte-Datenbank, und eine Zeile, die eine ältere App-Version dort abgelegt
     * hat, kennt `extraUses` nicht. Ein solcher Eintrag darf die Ableitung nicht
     * umbringen — deshalb wird hier bewusst am Schema vorbei gebaut.
     */
    it("Eine Talent-Zeile ohne extraUses (alte Datenbank) stürzt nicht ab", () => {
      const legacyFeat = {
        id: "srd:feat:extra-turning",
        kind: "feat",
        name: "Extra Turning",
        source: "srd",
        schemaVersion: 1,
        rev: 1,
        updatedAt: "",
        tags: [],
        effects: [],
        // Genau wie eine Zeile aus der Zeit vor dem Feld: data ohne extraUses.
        data: { prerequisites: [], featType: "General", stackable: true, requiresChoice: false },
      } as unknown as Parameters<typeof resolveCompendium>[0][number];

      const compendium = resolveCompendium([
        legacyFeat,
        entitySchema.parse({
          id: "srd:race:human",
          kind: "race",
          name: "Human",
          source: "srd",
          data: { size: "medium", speedFt: 30 },
        }),
        classEntity("srd:class:cleric", "Cleric"),
      ]);
      const character = characterSchema.parse({
        id: "t",
        name: "Testfigur",
        raceId: "srd:race:human",
        abilities: { base: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } },
        levels: [{ classId: "srd:class:cleric", hpRoll: "avg" as const }],
        feats: [{ featId: "srd:feat:extra-turning" }],
      });

      const sheet = deriveSheet(character, compendium, HOUSE);
      // Ohne die Daten kann der Bonus nicht bekannt sein — der Vorschlag steht
      // dann eben auf dem Regelwert, statt dass die App abstürzt.
      expect(sheet.extraUses).toEqual({});
      expect(suggestTrackers(sheet).find((s) => s.key === "turn-undead")?.max).toBe(3);

      // Und mit einer sauber geparsten Zeile ist der Bonus wieder da.
      const fresh = sheetFor("srd:class:cleric", 1, 10, { feats: ["srd:feat:extra-turning"] });
      expect(suggestTrackers(fresh).find((s) => s.key === "turn-undead")?.max).toBe(7);
    });

    it("Die Engine sammelt extraUses und featIds für die Vorschläge", () => {
      const sheet = sheetFor("srd:class:cleric", 5, 10, {
        feats: ["srd:feat:extra-turning", "srd:feat:extra-turning", "srd:feat:extra-music"],
      });
      expect(sheet.extraUses).toEqual({ "turn-undead": 8, "bardic-music": 4 });
      expect(sheet.featIds).toEqual([
        "srd:feat:extra-turning",
        "srd:feat:extra-turning",
        "srd:feat:extra-music",
      ]);
    });
  });

  it("Tiergestalt folgt der Druiden-Tabelle, nicht einer Formel", () => {
    const uses = (level: number) => suggestionFor("srd:class:druid", level, "wild-shape")?.max;
    expect(uses(4)).toBeUndefined();
    expect(uses(5)).toBe(1);
    expect(uses(6)).toBe(2);
    expect(uses(7)).toBe(3);
    expect(uses(9)).toBe(3);
    expect(uses(10)).toBe(4);
    expect(uses(14)).toBe(5);
    expect(uses(18)).toBe(6);
    expect(uses(20)).toBe(6);
  });

  it("Klassenfähigkeiten mit „X/day“ im Namen werden übernommen", () => {
    const found = suggestTrackers(sheetFor("srd:class:fighter", 1)).find((s) =>
      s.name.includes("Second Wind"),
    );
    expect(found?.max).toBe(2);
    expect(found?.note).toContain("Fighter");
  });

  it("Klassen ohne eindeutige Formel bekommen keinen Vorschlag", () => {
    /*
      Nichts erfinden: ein falscher Vorschlag ist schlimmer als keiner. Geprüft wird
      deshalb die Liste OHNE die Aktionspunkte — die hängen an keiner Klasse, sondern an
      Martins Tischregel („jeder hat 6"), und sind damit keine erfundene Formel.
    */
    const keys = suggestTrackers(sheetFor("srd:class:cleric", 5)).map((s) => s.key);
    expect(keys.filter((k) => k !== "action-points")).toEqual(["turn-undead"]);
  });

  it("Aktionspunkte werden JEDEM angeboten — 6, zurück beim Stufenaufstieg", () => {
    /*
      Martin: „Action Points: Reset bei Stufenaufstieg", dazu Philipps „Actionpoints hat
      jeder 6". Der Vorschlag trägt die Bedingung selbst, weil ein Zähler ohne `refill`
      auf „kurze Pause" zurückfällt — und das wäre genau die falsche Antwort.
    */
    for (const [classId, level] of [
      ["srd:class:fighter", 1],
      ["srd:class:cleric", 5],
      ["srd:class:wizard", 12],
    ] as const) {
      const found = suggestTrackers(sheetFor(classId, level)).find(
        (s) => s.key === "action-points",
      );
      expect(found?.max, classId).toBe(6);
      expect(found?.refill, classId).toEqual(["levelUp"]);
    }
  });

  it("Schlüssel sind eindeutig — sonst wird derselbe Zähler zweimal angeboten", () => {
    const keys = suggestTrackers(sheetFor("srd:class:paladin", 20)).map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

/**
 * Philipps Fehler, wörtlich: „Extra turning wird nicht mit einberechnet bei der
 * Anzahl der turnings. Wieso? Hatten wir doch schon besprochen."
 *
 * Besprochen war es, und die Engine rechnete auch richtig — der ZÄHLER am Charakter
 * trug aber eine Momentaufnahme seiner Obergrenze vom Anlegen. Genau die Sorte
 * Fehler, die dieses Projekt schon mehrfach hatte: ein abgeleiteter Wert wurde
 * gespeichert.
 */
describe("Obergrenze eines Zählers folgt dem Vorschlag", () => {
  // CHA 14 → +2, also 3 + 2 = 5 Versuche; Extra Turning legt 4 dazu → 9.
  const klerikerMitExtraTurning = () =>
    sheetFor("srd:class:cleric", 1, 14, { feats: ["srd:feat:extra-turning"] });

  it("nimmt die vier zusätzlichen Versuche mit", () => {
    const sheet = klerikerMitExtraTurning();
    // 3 + CHA (+2) = 5, dazu 4 aus Extra Turning = 9.
    const zähler = { suggestedFrom: "turn-undead", max: 5, maxManual: false };
    expect(effectiveTrackerMax(zähler, sheet)).toBe(9);
  });

  it("überschreibt eine ALTE Momentaufnahme, statt sie zu glauben", () => {
    // Genau Philipps Zustand: der Zähler wurde vor dem Talent angelegt.
    const sheet = klerikerMitExtraTurning();
    const alt = { suggestedFrom: "turn-undead", max: 5, maxManual: false };
    expect(effectiveTrackerMax(alt, sheet)).toBe(9);
    expect(trackerMaxNote(alt, sheet)).toContain("aus Talenten");
  });

  it("lässt einen selbst gesetzten Wert in Ruhe", () => {
    const sheet = klerikerMitExtraTurning();
    const eigen = { suggestedFrom: "turn-undead", max: 12, maxManual: true };
    expect(effectiveTrackerMax(eigen, sheet)).toBe(12);
    expect(trackerMaxNote(eigen, sheet)).toBeUndefined();
  });

  it("fasst selbst gebaute Zähler nicht an", () => {
    const sheet = klerikerMitExtraTurning();
    expect(effectiveTrackerMax({ max: 3, maxManual: false }, sheet)).toBe(3);
    expect(effectiveTrackerMax({ maxManual: false }, sheet)).toBeUndefined();
  });
});
