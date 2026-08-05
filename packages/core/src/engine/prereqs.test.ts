import { describe, expect, it } from "vitest";
import { characterSchema, houseRulesSchema, type Character } from "../schema/character.js";
import { entitySchema, resolveCompendium, type ClassLevelRow, type Entity } from "../schema/entities.js";
import { deriveSheet } from "./index.js";
import { checkPrerequisite, featEligibility } from "./prereqs.js";

/**
 * Talent-Voraussetzungen prüfen.
 *
 * Der Anlass, wörtlich: „Es muss klar sein, welche Vorraussetzungen die Talente haben.
 * Dann sollte es auch verhindert werden, dass ich ein Talent wählen kann für das ich
 * die Mindestanforderungen nicht erfülle."
 *
 * Geprüft wird gegen einen ECHT abgeleiteten Bogen, nicht gegen einen von Hand
 * zusammengesetzten: die Auswahl in der Oberfläche bekommt auch einen echten, und ein
 * Attrappen-Bogen könnte Felder anders füllen als die Engine.
 */

const E = (raw: unknown): Entity => entitySchema.parse(raw);
const C = (raw: unknown): Character => characterSchema.parse(raw);
const HOUSE = houseRulesSchema.parse({});

const rows = (count: number): ClassLevelRow[] =>
  Array.from({ length: count }, (_, i) => ({
    bab: i + 1,
    fort: 2 + Math.floor((i + 1) / 2),
    ref: Math.floor((i + 1) / 3),
    will: Math.floor((i + 1) / 3),
    features: [],
    template: { bab: "good", fort: "good", ref: "poor", will: "poor" },
  })) as ClassLevelRow[];

const fighter = E({
  id: "t:class:fighter",
  kind: "class",
  name: "Fighter",
  source: "srd",
  data: {
    hitDie: 10,
    skillPointsPerLevel: 2,
    classSkillIds: ["t:skill:climb"],
    levels: rows(20),
  },
});

const human = E({
  id: "t:race:human",
  kind: "race",
  name: "Human",
  source: "srd",
  data: { size: "medium", speedFt: 30, abilityMods: {}, traits: [] },
});

const climb = E({
  id: "t:skill:climb",
  kind: "skill",
  name: "Climb",
  source: "srd",
  data: { keyAbility: "str" },
});

/** Teilgebiets-Fertigkeit — für die Frage, welche Ränge zählen. */
const knowledge = E({
  id: "t:skill:knowledge",
  kind: "skill",
  name: "Knowledge",
  source: "srd",
  data: { keyAbility: "int", trainedOnly: true, subtyped: true, subtypeSuggestions: ["arcana"] },
});

const powerAttack = E({
  id: "t:feat:power-attack",
  kind: "feat",
  name: "Power Attack",
  source: "srd",
  data: { prerequisites: [{ type: "minAbility", ability: "str", value: 13 }] },
});

const cleave = E({
  id: "t:feat:cleave",
  kind: "feat",
  name: "Cleave",
  source: "srd",
  data: {
    prerequisites: [
      { type: "minAbility", ability: "str", value: 13 },
      { type: "hasFeat", featId: "t:feat:power-attack" },
    ],
  },
});

const combatExpertise = E({
  id: "t:feat:combat-expertise",
  kind: "feat",
  name: "Combat Expertise",
  source: "srd",
  data: { prerequisites: [{ type: "minAbility", ability: "int", value: 13 }] },
});

const improvedTwf = E({
  id: "t:feat:improved-two-weapon-fighting",
  kind: "feat",
  name: "Improved Two-Weapon Fighting",
  source: "srd",
  data: { prerequisites: [{ type: "minBab", value: 6 }] },
});

const stealthy = E({
  id: "t:feat:knowledgeable",
  kind: "feat",
  name: "Knowledgeable",
  source: "srd",
  data: { prerequisites: [{ type: "minSkillRanks", skillId: "t:skill:knowledge", ranks: 4 }] },
});

/** Nur Freitext — die App kann das nicht entscheiden. */
const mysterious = E({
  id: "t:feat:mysterious",
  kind: "feat",
  name: "Mysterious",
  source: "srd",
  data: {
    prerequisites: [{ type: "custom", text: "ability to cast spells of the chosen school" }],
  },
});

const COMPENDIUM = resolveCompendium([
  fighter,
  human,
  climb,
  knowledge,
  powerAttack,
  cleave,
  combatExpertise,
  improvedTwf,
  stealthy,
  mysterious,
]);

function hero(overrides: Record<string, unknown> = {}): Character {
  return C({
    id: "c-1",
    name: "Tordek",
    raceId: "t:race:human",
    abilities: { base: { str: 15, dex: 13, con: 12, int: 10, wis: 11, cha: 8 } },
    levels: [{ classId: "t:class:fighter", hpRoll: "max" }],
    ...overrides,
  });
}

const sheetOf = (character: Character) => deriveSheet(character, COMPENDIUM, HOUSE);

describe("Was der Charakter darf, und was noch nicht", () => {
  it("Erfüllte und nicht erfüllte Attributsvoraussetzung", () => {
    const sheet = sheetOf(hero()); // STR 15, INT 10
    expect(featEligibility(powerAttack, sheet, COMPENDIUM).eligible).toBe(true);

    const int = featEligibility(combatExpertise, sheet, COMPENDIUM);
    expect(int.eligible).toBe(false);
    expect(int.missing).toEqual(["INT 13"]);
  });

  it("Ein fehlendes Talent wird mit NAMEN gemeldet, nicht mit Kennung", () => {
    /*
      Das war der eigentliche Mangel der alten Meldung: dort stand „Talent
      t:feat:power-attack". Am Tisch liest das niemand.
    */
    const missing = featEligibility(cleave, sheetOf(hero()), COMPENDIUM).missing;
    expect(missing).toEqual(["Talent Power Attack"]);
  });

  it("Hat er das Talent, fällt die Voraussetzung weg", () => {
    const withPa = hero({ feats: [{ featId: "t:feat:power-attack" }] });
    expect(featEligibility(cleave, sheetOf(withPa), COMPENDIUM).eligible).toBe(true);
  });

  it("Der Grundangriffsbonus zählt aus der Klasse, nicht aus der Stufe", () => {
    const sheet1 = sheetOf(hero());
    expect(featEligibility(improvedTwf, sheet1, COMPENDIUM).missing).toEqual(["BAB +6"]);

    const sheet6 = sheetOf(
      hero({ levels: Array.from({ length: 6 }, () => ({ classId: "t:class:fighter", hpRoll: "max" })) }),
    );
    expect(featEligibility(improvedTwf, sheet6, COMPENDIUM).eligible).toBe(true);
  });

  it("Bei Teilgebieten zählt das beste — sonst erfüllt sie niemand", () => {
    /*
      „4 Ränge Knowledge" steht in den Daten als Grundfertigkeit. Wer die Ränge in
      „Knowledge (arcana)" hat, erfüllt es trotzdem.
    */
    const withRanks = hero({
      abilities: { base: { str: 15, dex: 13, con: 12, int: 14, wis: 11, cha: 8 } },
      skillRanks: { "t:skill:knowledge#arcana": 4 },
      skillSubtypes: [{ skillId: "t:skill:knowledge", subtype: "arcana" }],
    });
    expect(featEligibility(stealthy, sheetOf(withRanks), COMPENDIUM).eligible).toBe(true);
    expect(featEligibility(stealthy, sheetOf(hero()), COMPENDIUM).missing).toEqual([
      "4 Ränge in Knowledge",
    ]);
  });
});

describe("Was die App nicht prüfen kann, sperrt sie nicht", () => {
  it("Eine textliche Voraussetzung steht da, hält aber nicht auf", () => {
    /*
      163 der Voraussetzungen in den SRD-Daten sind Freitext. Sie zu sperren hieße,
      eine Regel zu erfinden — und eine geratene Regel ist schlimmer als eine
      fehlende. Der Grundsatz dieses Projekts: warnen statt sperren.
    */
    const out = featEligibility(mysterious, sheetOf(hero()), COMPENDIUM);
    expect(out.eligible).toBe(true);
    expect(out.missing).toEqual([]);
    expect(out.unverifiable).toEqual(["ability to cast spells of the chosen school"]);
    expect(out.lines[0]?.checkable).toBe(false);
  });

  it("Ein Talent, das dieses Gerät gar nicht kennt, stürzt nicht ab", () => {
    // Ein Bogen vom iPad kann ein Talent tragen, dessen Pack hier fehlt.
    const out = featEligibility(undefined, sheetOf(hero()), COMPENDIUM);
    expect(out.eligible).toBe(true);
    expect(out.lines).toEqual([]);
  });

  it("Ohne Kompendium bleibt die Kennung stehen, statt zu werfen", () => {
    const line = checkPrerequisite(
      { type: "hasFeat", featId: "t:feat:power-attack" },
      sheetOf(hero()),
    );
    expect(line.label).toBe("Talent t:feat:power-attack");
  });
});

describe("Die Warnung am Bogen und die Sperre in der Auswahl sind DIESELBE Regel", () => {
  it("Ein Talent ohne Voraussetzung am Bogen wird gemeldet — mit Namen", () => {
    /*
      Der Grund, warum die Prüfung aus `validate.ts` herausgezogen wurde: zwei
      Fassungen derselben Regel laufen auseinander. Dieser Test hält fest, dass
      `validate` weiterhin genau dann meldet, wenn `featEligibility` sperrt.
    */
    const withCleaveOnly = hero({ feats: [{ featId: "t:feat:cleave" }] });
    const sheet = sheetOf(withCleaveOnly);
    const issue = sheet.issues.find((i) => i.code === "feat-prerequisite");
    expect(issue?.message).toBe("Cleave: Voraussetzung nicht erfüllt (Talent Power Attack).");
    expect(featEligibility(cleave, sheet, COMPENDIUM).eligible).toBe(false);
  });

  it("Erfüllt er alles, meldet der Bogen nichts", () => {
    const ok = hero({ feats: [{ featId: "t:feat:power-attack" }, { featId: "t:feat:cleave" }] });
    const sheet = sheetOf(ok);
    expect(sheet.issues.filter((i) => i.code === "feat-prerequisite")).toEqual([]);
  });

  it("Eine textliche Voraussetzung erzeugt am Bogen keine Warnung", () => {
    const sheet = sheetOf(hero({ feats: [{ featId: "t:feat:mysterious" }] }));
    expect(sheet.issues.filter((i) => i.code === "feat-prerequisite")).toEqual([]);
  });
});
