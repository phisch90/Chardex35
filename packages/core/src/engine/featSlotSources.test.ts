import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { buildDeity } from "../compendium/deity.js";
import { assignFeatOrigins, sameOrigin } from "./featSlots.js";
import { deriveSheet } from "./index.js";

/*
  KOPFNOTIZ: keine deutschen Anfuehrungszeichen in dieser Datei.

  WOHER die Talentplaetze kommen — Platz fuer Platz.

  Sein Auftrag: "man kann doch jetzt mal den Charakter zurueckgehen und sehen,
  okay, drei Fighter, Mensch und vier Kleriker. Da raus kann man doch herleiten,
  wie viele Talente ich habe … Und in der Zukunft, jedes Mal, wenn man ein neues
  Talent auswaehlt, dann steht drin, dass es vom Level-up zu Klasse Rang x y
  kommt oder was anderes als Quelle hat."

  Gemessen gegen die ECHTEN Packs: die Liste haengt an der Kaempfer-Tabelle
  (Bonustalent auf Stufe 1, 2, 4, 6 …), am Menschen-Bonustalent in races.json und
  an baseFeatSlots. Mit erfundenen Kennungen waere nichts davon bewiesen.
*/

const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const manifestPath = join(packsDir, "manifest.json");
const packsAvailable = existsSync(manifestPath);

function loadEntities(): Entity[] {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: string[] };
  const out: Entity[] = [];
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    for (const item of JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[]) {
      out.push(entitySchema.parse(item));
    }
  }
  return out;
}

const FIGHTER = "srd:class:fighter";
const CLERIC = "srd:class:cleric";
const WAR = "srd:spelllist:domain-war";

const kriegsgott = buildDeity({
  id: "hb:deity:kriegsgott-probe",
  name: "Kriegsgott (Probe)",
  domainIds: [WAR],
  favoredWeaponId: "srd:item:halberd",
  favoredWeaponName: "Halbarte",
});

function bogen(patch: Record<string, unknown> = {}): Character {
  return characterSchema.parse({
    id: "slots-1",
    name: "Probe",
    raceId: "srd:race:human",
    abilities: { base: { str: 14, dex: 12, con: 14, int: 10, wis: 14, cha: 12 } },
    levels: [
      ...Array.from({ length: 3 }, () => ({ classId: FIGHTER, hpRoll: "avg" as const })),
      ...Array.from({ length: 4 }, () => ({ classId: CLERIC, hpRoll: "avg" as const })),
    ],
    ...patch,
  });
}

describe.skipIf(!packsAvailable)("Woher die Talentplaetze kommen", () => {
  const compendium = packsAvailable
    ? resolveCompendium([...loadEntities(), kriegsgott])
    : new Map<string, Entity>();
  const slots = (c: Character) => deriveSheet(c, compendium).featSlots;

  it("Mensch, Kaempfer 3 / Kleriker 4: sechs Plaetze mit NAMEN", () => {
    /*
      3 aus der Charakterstufe (1, 3, 6) + 1 vom Volk + 2 Kaempfer-Bonustalente
      (Kaempfer 1 und 2). Die Klassenplaetze tragen die KLASSENstufe — genau seine
      Formulierung "Klasse Rang x y": bei einem Mehrklassler sagt "Fighter 2" mehr
      als "Stufe 5".
    */
    expect(slots(bogen()).sources.map((s) => s.label)).toEqual([
      "Stufe 1",
      "Stufe 3",
      "Stufe 6",
      "Human",
      "Fighter 1",
      "Fighter 2",
    ]);
  });

  it("die Liste ist immer so lang wie die Zahl daneben", () => {
    /*
      Die wichtigste Pruefung hier: `available` und `sources` sind zwei Zaehlungen
      derselben Sache. Liefen sie auseinander, haette der Auswaehler fuer einen
      Platz, den der Bogen wirklich hat, keinen Knopf — oder einen zu viel.
    */
    for (const c of [
      bogen(),
      bogen({ levels: [{ classId: CLERIC, hpRoll: "avg" }] }),
      bogen({ raceId: "srd:race:elf" }),
      bogen({ deityRef: kriegsgott.id, domains: [{ classId: CLERIC, spellListId: WAR }] }),
      bogen({ levels: Array.from({ length: 20 }, () => ({ classId: FIGHTER, hpRoll: "avg" })) }),
    ]) {
      const s = slots(c);
      expect(s.sources).toHaveLength(s.available);
    }
  });

  it("ein Elf hat KEIN Bonustalent — gelesen wird der Effekt, nicht der Name", () => {
    const elf = slots(bogen({ raceId: "srd:race:elf" })).sources;
    expect(elf.map((s) => s.label)).not.toContain("Elf");
    expect(elf.filter((s) => s.kind === "race")).toHaveLength(0);
    // Und die Gegenprobe: beim Menschen steht er da.
    expect(slots(bogen()).sources.filter((s) => s.kind === "race")).toHaveLength(1);
  });

  it("die War-Domaene bringt ihren gewaehrten Platz mit Namen mit", () => {
    const mitWar = slots(
      bogen({ deityRef: kriegsgott.id, domains: [{ classId: CLERIC, spellListId: WAR }] }),
    ).sources;
    expect(mitWar).toHaveLength(7);
    expect(mitWar[6]).toMatchObject({
      kind: "granted",
      label: "War Domain (Kriegsgott (Probe))",
    });
  });

  it("Kaempfer 20: die Bonustalente stehen mit ihrer Klassenstufe da", () => {
    const s = slots(
      bogen({ levels: Array.from({ length: 20 }, () => ({ classId: FIGHTER, hpRoll: "avg" })) }),
    ).sources;
    // Stufe 1, 3, 6, 9, 12, 15, 18 = 7 · Mensch = 1 · Kaempfer 1,2,4,6,…,20 = 11.
    expect(s.filter((x) => x.kind === "level")).toHaveLength(7);
    expect(s.filter((x) => x.kind === "class")).toHaveLength(11);
    expect(s.map((x) => x.label)).toContain("Fighter 20");
    expect(s.map((x) => x.label)).not.toContain("Fighter 3");
  });

  it("genau EIN Feld je Platz — damit die Anzeige bleibt, wie sie ist", () => {
    /*
      Die Anzeige am Talent gibt es schon: Quelle gewinnt, sonst "Stufe N". Setzte
      ein Platz beide Felder, stuende dort die Haelfte der Auskunft. Deshalb steht
      an einem Platz genau eines von beiden — und das Schema muss sich nicht
      aendern (ein Feld, das schon ausgeliefert ist, wird benutzt, nicht umgebaut).
    */
    for (const slot of slots(
      bogen({ deityRef: kriegsgott.id, domains: [{ classId: CLERIC, spellListId: WAR }] }),
    ).sources) {
      const felder = [slot.origin.level, slot.origin.source].filter((v) => v !== undefined);
      expect(felder).toHaveLength(1);
    }
  });
});

describe("Herkunft zuordnen", () => {
  const plaetze = [
    { kind: "level" as const, label: "Stufe 1", origin: { level: 1 } },
    { kind: "level" as const, label: "Stufe 3", origin: { level: 3 } },
    { kind: "race" as const, label: "Human", origin: { source: "Human" } },
    { kind: "class" as const, label: "Fighter 1", origin: { source: "Fighter 1" } },
  ];

  it("verteilt die freien Plaetze in der Reihenfolge, in der sie entstehen", () => {
    expect(assignFeatOrigins([undefined, undefined, undefined], plaetze)).toEqual([
      { level: 1 },
      { level: 3 },
      { source: "Human" },
    ]);
  });

  it("was schon eine Herkunft hat, behaelt sie — und belegt seinen Platz", () => {
    /*
      Sonst wuerde ein von Hand gesetztes "Fighter 1" gleich zweimal vergeben, und
      der Vorschlag machte die Zuordnung kaputt, die er selbst gemacht hat.
    */
    expect(assignFeatOrigins([{ source: "Fighter 1" }, undefined, undefined], plaetze)).toEqual([
      { source: "Fighter 1" },
      { level: 1 },
      { level: 3 },
    ]);
  });

  it("mehr Talente als Plaetze: der Rest bleibt ohne — keine erfundene Herkunft", () => {
    const ergebnis = assignFeatOrigins(Array.from({ length: 6 }, () => undefined), plaetze);
    expect(ergebnis.filter((o) => o !== undefined)).toHaveLength(4);
    expect(ergebnis[4]).toBeUndefined();
    expect(ergebnis[5]).toBeUndefined();
  });

  it("zwei Zeilen mit derselben Herkunft belegen nur EINEN Platz", () => {
    /*
      Ein Tippfehler von damals (zweimal "Human") soll aufloesbar bleiben: die
      zweite Zeile gilt als unbelegt und bekommt einen neuen Vorschlag. Sie behaelt
      ihre Angabe aber, solange sie dasteht — angefasst wird nur, was leer ist.
    */
    const ergebnis = assignFeatOrigins([{ source: "Human" }, { source: "Human" }, undefined], plaetze);
    expect(ergebnis[2]).toEqual({ level: 1 });
  });

  it("sameOrigin erkennt denselben Platz — und nur den", () => {
    expect(sameOrigin({ level: 3 }, { level: 3 })).toBe(true);
    expect(sameOrigin({ source: "Fighter 1" }, { source: "Fighter 1" })).toBe(true);
    expect(sameOrigin({ level: 3 }, { level: 6 })).toBe(false);
    expect(sameOrigin({ level: 3 }, { source: "Human" })).toBe(false);
    expect(sameOrigin(undefined, { level: 1 })).toBe(false);
    // Und zwei Leere sind dasselbe „Nichts" — sonst waere der Vergleich nicht total.
    expect(sameOrigin(undefined, undefined)).toBe(true);
  });
});
