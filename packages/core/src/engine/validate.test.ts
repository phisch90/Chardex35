import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { deriveSheet } from "./index.js";
import {
  issuesForTab,
  muteIssue,
  mutedIssues,
  openBuildWork,
  openIssues,
  openWork,
  tabsWithIssues,
  unmuteIssue,
} from "./issues.js";
import type { DerivedIssue } from "./types.js";

/**
 * „Hast du etwas vergessen?“ — gegen die ECHTEN SRD-Packs.
 *
 * Sein Auftrag: „Wir brauchen eine Warnung wenn man etwas vergessen hat. Wenn man
 * zb ein Talent zu wenig oder noch skill Punkte offen sind.“
 *
 * Die Prüfungen hier zielen auf die Stille, in der so ein Hinweis stirbt: eine
 * Warnung ohne Reiter (findet niemand), ein „passt so“ mit einer Zahl im
 * Schlüssel (gilt nach der ersten Änderung nicht mehr), und die Halbheit, mit der
 * die Sache angefangen hat — „zu viel“ gemeldet, „zu wenig“ verschwiegen.
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

const C = (raw: unknown): Character => characterSchema.parse(raw);

describe.skipIf(!packsAvailable)("Warnung, wenn etwas offen ist", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();
  const sheetOf = (raw: unknown) => deriveSheet(C(raw), compendium);
  const code = (issues: readonly DerivedIssue[], want: string) => issues.find((i) => i.code === want);

  /** Mensch Kämpfer 4, INT 12 → 4 Punkte je Stufe → 16 + 12 = 28, 6 Talent-Slots. */
  const fighter4 = (extra: Record<string, unknown> = {}) => ({
    id: "t1",
    name: "Regdar",
    raceId: "srd:race:human",
    abilities: { base: { str: 16, dex: 13, con: 14, int: 12, wis: 10, cha: 8 } },
    levels: Array.from({ length: 4 }, () => ({ classId: "srd:class:fighter", hpRoll: 5 })),
    ...extra,
  });

  /** Mensch Kleriker 7 — vorbereitende Klasse, zwei Domänen. */
  const cleric7 = (extra: Record<string, unknown> = {}) => ({
    id: "t2",
    name: "Torben",
    raceId: "srd:race:human",
    abilities: { base: { str: 14, dex: 10, con: 14, int: 10, wis: 16, cha: 14 } },
    levels: Array.from({ length: 7 }, () => ({ classId: "srd:class:cleric", hpRoll: 5 })),
    ...extra,
  });

  // ============ Fertigkeitspunkte ==========================================

  it("nichts verteilt: die App sagt, wie viel offen ist", () => {
    const sheet = sheetOf(fighter4());
    expect(sheet.skillPoints).toEqual({ available: 28, spent: 0 });
    const issue = code(sheet.issues, "skill-points-open");
    expect(issue?.message).toBe("Fertigkeitspunkte: 28 von 28 noch nicht verteilt.");
    expect(issue?.open).toBe(28);
    expect(issue?.tab).toBe("skills");
  });

  it("teilweise verteilt: die Zahl ist der REST, nicht die Summe", () => {
    const sheet = sheetOf(fighter4({ skillRanks: { "srd:skill:climb": 7, "srd:skill:jump": 7 } }));
    // 14 Ränge auf Klassenfertigkeiten = 14 Punkte.
    expect(sheet.skillPoints.spent).toBe(14);
    expect(code(sheet.issues, "skill-points-open")?.open).toBe(14);
  });

  it("alles verteilt: kein Wort", () => {
    const sheet = sheetOf(
      fighter4({
        skillRanks: {
          "srd:skill:climb": 7,
          "srd:skill:jump": 7,
          "srd:skill:swim": 7,
          "srd:skill:ride": 7,
        },
      }),
    );
    expect(sheet.skillPoints).toEqual({ available: 28, spent: 28 });
    expect(code(sheet.issues, "skill-points-open")).toBeUndefined();
  });

  it("zu viel ausgegeben: die alte Warnung, und NICHT beide zugleich", () => {
    /*
      Die beiden Hälften müssen sich ausschließen. Stünden sie beide da, hieße es
      „3 zu viel ausgegeben“ und „3 noch offen“ — im selben Kasten.
    */
    const sheet = sheetOf(
      fighter4({
        skillRanks: {
          "srd:skill:climb": 7,
          "srd:skill:jump": 7,
          "srd:skill:swim": 7,
          "srd:skill:ride": 7,
          "srd:skill:handle-animal": 7,
        },
      }),
    );
    expect(code(sheet.issues, "skill-points-overspent")).toBeDefined();
    expect(code(sheet.issues, "skill-points-open")).toBeUndefined();
  });

  // ============ Talent-Slots ===============================================

  it("Talent-Slots offen — sein Beispiel", () => {
    const sheet = sheetOf(fighter4({ feats: [{ featId: "srd:feat:toughness" }] }));
    expect(sheet.featSlots).toEqual({ available: 6, used: 1 });
    const issue = code(sheet.issues, "feat-slots-open");
    expect(issue?.message).toBe("Talente: 5 Slots sind noch frei (1 von 6 gewählt).");
    expect(issue?.tab).toBe("feats");
  });

  it("genau ein Slot offen: Einzahl", () => {
    const sheet = sheetOf(
      fighter4({
        feats: [
          { featId: "srd:feat:toughness" },
          { featId: "srd:feat:dodge" },
          { featId: "srd:feat:mobility" },
          { featId: "srd:feat:alertness" },
          { featId: "srd:feat:great-fortitude" },
        ],
      }),
    );
    expect(code(sheet.issues, "feat-slots-open")?.message).toBe(
      "Talente: 1 Slot ist noch frei (5 von 6 gewählt).",
    );
  });

  it("alle Slots belegt: kein Wort", () => {
    const feats = [
      "toughness",
      "dodge",
      "mobility",
      "alertness",
      "great-fortitude",
      "iron-will",
    ].map((id) => ({ featId: `srd:feat:${id}` }));
    const sheet = sheetOf(fighter4({ feats }));
    expect(sheet.featSlots).toEqual({ available: 6, used: 6 });
    expect(code(sheet.issues, "feat-slots-open")).toBeUndefined();
  });

  // ============ Zauberplätze ===============================================

  it("vorbereitende Klasse, nichts vorbereitet: mit Graden, EINE Zeile", () => {
    const sheet = sheetOf(cleric7());
    const spells = sheet.issues.filter((i) => i.code === "spell-slots-open");
    expect(spells).toHaveLength(1);
    /*
      Grad 0 zählt NICHT mit — Martins Hausregel: „Grad-0-Zauber müssen nicht vorbereitet
      werden." Vorher standen hier 23 (mit „Grad 0: 6"), jetzt sind es 17 und die Zeile
      fängt bei Grad 1 an. Wo nichts zu belegen ist, kann nichts offen sein.
    */
    expect(spells[0]?.message).toMatch(/^Cleric: 17 Zauberplätze nicht belegt \(Grad 1: 6/);
    expect(spells[0]?.message).not.toMatch(/Grad 0/);
    expect(spells[0]?.tab).toBe("spells");
    // Es geht um HEUTE, nicht um den Aufbau.
    expect(spells[0]?.daily).toBe(true);
  });

  it("spontane Klasse: NIE eine Warnung über Vorbereiten", () => {
    /*
      Der Hexenmeister bereitet nichts vor. Eine Warnung hier wäre nicht nur
      nutzlos, sie wäre falsch — und sie würde bei jedem Barden und Hexenmeister
      der Gruppe stehen.
    */
    const sheet = sheetOf({
      id: "t3",
      name: "Hex",
      raceId: "srd:race:human",
      abilities: { base: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 16 } },
      levels: Array.from({ length: 5 }, () => ({ classId: "srd:class:sorcerer", hpRoll: 3 })),
    });
    expect(sheet.spellcasting[0]?.model).toBe("spontaneous");
    expect(code(sheet.issues, "spell-slots-open")).toBeUndefined();
  });

  it("alles vorbereitet: kein Wort", () => {
    const sheet0 = sheetOf(cleric7());
    const block = sheet0.spellcasting[0]!;
    const prepared: { spellId: string; slotLevel: number }[] = [];
    for (const slot of block.slots) {
      for (let i = 0; i < (slot.total ?? 0); i++) {
        prepared.push({ spellId: "srd:spell:bless", slotLevel: slot.level });
      }
    }
    const sheet = sheetOf(
      cleric7({ spellState: { "srd:class:cleric": { prepared } } }),
    );
    expect(code(sheet.issues, "spell-slots-open")).toBeUndefined();
  });

  // ============ „Passt so“ =================================================

  it("„passt so“ stellt genau diese Warnung ab — und nur sie", () => {
    const sheet = sheetOf(
      fighter4({
        feats: [{ featId: "srd:feat:toughness" }],
        mutedWarnings: [{ key: "feat-slots-open", upTo: 5 }],
      }),
    );
    expect(code(sheet.issues, "feat-slots-open")?.muted).toBe(true);
    // Die Fertigkeitspunkte bleiben sichtbar.
    expect(code(openIssues(sheet), "skill-points-open")).toBeDefined();
    expect(code(openIssues(sheet), "feat-slots-open")).toBeUndefined();
    // Sie ist NICHT weg, nur stumm — sonst gäbe es keinen Weg zurück.
    expect(code(mutedIssues(sheet), "feat-slots-open")).toBeDefined();
  });

  it("wird MEHR offen, meldet sich die App wieder", () => {
    /*
      Der Kern von `upTo`. Wer einen Slot aufspart, sagt das einmal; wer beim
      nächsten Stufenaufstieg einen zweiten liegen lässt, soll es erfahren.
    */
    const muted = [{ key: "feat-slots-open", upTo: 1 }];
    const einer = sheetOf(
      fighter4({
        feats: ["toughness", "dodge", "mobility", "alertness", "great-fortitude"].map((id) => ({
          featId: `srd:feat:${id}`,
        })),
        mutedWarnings: muted,
      }),
    );
    expect(code(einer.issues, "feat-slots-open")?.muted).toBe(true);

    const zwei = sheetOf(
      fighter4({
        feats: ["toughness", "dodge", "mobility", "alertness"].map((id) => ({
          featId: `srd:feat:${id}`,
        })),
        mutedWarnings: muted,
      }),
    );
    expect(code(zwei.issues, "feat-slots-open")?.open).toBe(2);
    expect(code(zwei.issues, "feat-slots-open")?.muted).toBeUndefined();
  });

  it("weniger offen als abgestellt: bleibt stumm", () => {
    const sheet = sheetOf(
      fighter4({
        feats: ["toughness", "dodge", "mobility", "alertness", "great-fortitude"].map((id) => ({
          featId: `srd:feat:${id}`,
        })),
        mutedWarnings: [{ key: "feat-slots-open", upTo: 5 }],
      }),
    );
    expect(code(sheet.issues, "feat-slots-open")?.muted).toBe(true);
  });

  it("kein Abstell-Schlüssel enthält eine Menge", () => {
    /*
      DER Fehler, der hier lauert. Stünde die Zahl im Schlüssel, hieße ein „passt
      so“ bei 6 offenen Punkten `skill-points-open:6` — und wäre bei 5 wieder
      wirkungslos. Der Schalter würde scheinbar zufällig vergessen.
    */
    for (const raw of [fighter4(), cleric7()]) {
      for (const issue of sheetOf(raw).issues) {
        if (issue.muteKey === undefined) continue;
        expect(issue.muteKey, issue.muteKey).not.toMatch(/\d/);
      }
    }
  });

  it("derselbe Schlüssel, obwohl sich die Menge ändert", () => {
    const viel = code(sheetOf(fighter4()).issues, "skill-points-open");
    const wenig = code(
      sheetOf(fighter4({ skillRanks: { "srd:skill:climb": 7 } })).issues,
      "skill-points-open",
    );
    expect(viel?.open).not.toBe(wenig?.open);
    expect(viel?.muteKey).toBe(wenig?.muteKey);
  });

  it("abstellen und wieder einschalten sind reine Funktionen", () => {
    const issue = { muteKey: "feat-slots-open", open: 3 };
    const once = muteIssue([], issue);
    expect(once).toEqual([{ key: "feat-slots-open", upTo: 3 }]);
    // Zweimal abstellen darf keinen zweiten Eintrag machen.
    const twice = muteIssue(once, { muteKey: "feat-slots-open", open: 5 });
    expect(twice).toEqual([{ key: "feat-slots-open", upTo: 5 }]);
    expect(unmuteIssue(twice, issue)).toEqual([]);
    // Eine Warnung ohne Schlüssel lässt sich nicht abstellen.
    expect(muteIssue([], { muteKey: undefined, open: 3 })).toEqual([]);
  });

  // ============ Wo es steht ================================================

  it("jede Warnung kennt ihren Reiter", () => {
    /*
      Eine Warnung ohne Ort landet in der Sammelkarte, und wer sie liest, muss
      raten, wo er hin soll. Die Meldungen über die DATEN (fehlender Verweis,
      nicht unterstützte Formel) dürfen ortlos sein — sie gehören auf keinen
      Reiter, weil man sie am Bogen nicht behebt.
      */
    const ortlos = ["missing-ref", "wrong-kind", "formula-not-supported", "class-level-beyond-table"];
    for (const raw of [fighter4(), cleric7()]) {
      for (const issue of sheetOf(raw).issues) {
        if (ortlos.includes(issue.code)) continue;
        expect(issue.tab, `${issue.code} hat keinen Reiter`).toBeDefined();
      }
    }
  });

  it("die Reiter-Punkte sitzen an den richtigen Reitern", () => {
    const sheet = sheetOf(cleric7());
    const tabs = tabsWithIssues(sheet);
    expect(tabs.get("skills")).toBe(1);
    expect(tabs.get("feats")).toBe(1);
    // Domänen fehlen UND Zauberplätze leer.
    expect(tabs.get("spells")).toBe(2);
    expect(tabs.has("combat")).toBe(false);
    expect(issuesForTab(sheet, "feats").map((i) => i.code)).toEqual(["feat-slots-open"]);
  });

  it("ein abgestellter Hinweis macht keinen Punkt mehr", () => {
    const sheet = sheetOf(cleric7({ mutedWarnings: [{ key: "feat-slots-open", upTo: 4 }] }));
    expect(tabsWithIssues(sheet).has("feats")).toBe(false);
    expect(issuesForTab(sheet, "feats", { muted: true })).toHaveLength(1);
  });

  // ============ Was der Assistent fragt ====================================

  it("die Rückfrage beim Anlegen lässt das Tages-Geschäft weg", () => {
    /*
      Ohne diese Trennung bekäme JEDER neue Zauberer eine Rückfrage („23
      Zauberplätze nicht belegt“), und eine Rückfrage, die immer kommt, klickt man
      blind weg.
    */
    const sheet = sheetOf(cleric7());
    expect(openWork(sheet).map((i) => i.code)).toContain("spell-slots-open");
    expect(openBuildWork(sheet).map((i) => i.code)).not.toContain("spell-slots-open");
    expect(openBuildWork(sheet).map((i) => i.code).sort()).toEqual([
      "domains-missing",
      "feat-slots-open",
      "skill-points-open",
    ]);
  });

  it("ein fertiger Bogen hat gar nichts offen", () => {
    const sheet = sheetOf(
      fighter4({
        feats: [
          "toughness",
          "dodge",
          "mobility",
          "alertness",
          "great-fortitude",
          "iron-will",
        ].map((id) => ({ featId: `srd:feat:${id}` })),
        skillRanks: {
          "srd:skill:climb": 7,
          "srd:skill:jump": 7,
          "srd:skill:swim": 7,
          "srd:skill:ride": 7,
        },
      }),
    );
    expect(openWork(sheet)).toEqual([]);
    expect(openIssues(sheet)).toEqual([]);
  });
});
