import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { abilityAdviceFor, adviceFor, isKeyAbility } from "./advice.js";

/**
 * Gegen die ECHTEN Packs, und das ist der Punkt.
 *
 * Die Empfehlung besteht zur Hälfte aus handgeschriebenen Tabellen, die auf Kennungen
 * zeigen — `srd:skill:move-silently`, `srd:class:cleric`. Genau dort verschwindet ein
 * Tippfehler lautlos: die Zeile wird einfach nicht markiert, und niemand merkt es. Beim
 * Schreiben dieser Tabelle hatte ich drei Kennungen falsch geraten
 * (`handleanimal` statt `handle-animal`, `movesilently`, `disabledevice`) — dieser Test
 * hätte sie gefunden, und deshalb steht er hier zuerst.
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

const PLAYER_CLASSES = [
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "wizard",
] as const;

describe.skipIf(!packsAvailable)("Empfehlungen für Volk und Klasse", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();
  const klass = (slug: string): Entity => {
    const hit = compendium.get(`srd:class:${slug}`);
    if (hit === undefined) throw new Error(`Klasse srd:class:${slug} fehlt im Pack`);
    return hit;
  };
  const race = (slug: string): Entity => {
    const hit = compendium.get(`srd:race:${slug}`);
    if (hit === undefined) throw new Error(`Volk srd:race:${slug} fehlt im Pack`);
    return hit;
  };

  it("zeigt mit keiner Fertigkeit auf eine Kennung, die es nicht gibt", () => {
    const unknown: string[] = [];
    for (const slug of PLAYER_CLASSES) {
      const advice = adviceFor(klass(slug), undefined);
      for (const skill of advice?.skills ?? []) {
        if (compendium.get(skill.skillId) === undefined) unknown.push(`${slug} → ${skill.skillId}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it("empfiehlt jeder der elf Spielerklassen Attribute und Fertigkeiten", () => {
    for (const slug of PLAYER_CLASSES) {
      const advice = adviceFor(klass(slug), undefined);
      expect(advice, slug).toBeDefined();
      expect(advice?.abilities.length, slug).toBeGreaterThanOrEqual(2);
      expect(advice?.skills.length, slug).toBeGreaterThanOrEqual(3);
    }
  });

  it("stellt bei jeder Zauberklasse ihr Zauber-Attribut nach vorn", () => {
    for (const slug of PLAYER_CLASSES) {
      const entity = klass(slug);
      if (entity.kind !== "class") throw new Error(`${slug} ist keine Klasse`);
      const casting = entity.data.spellcasting;
      if (casting === undefined) continue;
      const advice = adviceFor(entity, undefined);
      // Beim Paladin und Waldläufer sind die Zauber Beiwerk — sie müssen das Attribut
      // nennen, aber nicht an erster Stelle. Bei den echten Zauberern schon.
      if (slug === "paladin" || slug === "ranger") {
        expect(isKeyAbility(advice!, casting.ability), slug).toBe(true);
      } else {
        expect(advice?.abilities[0]?.ability, slug).toBe(casting.ability);
      }
    }
  });

  it("nennt bei einer Klasse ohne Zauber kein Zauber-Attribut als erstes", () => {
    const advice = adviceFor(klass("fighter"), undefined);
    expect(advice?.abilities[0]?.ability).toBe("str");
    // Der Kämpfer hat kein Zauber-Attribut — es darf auch keins mit dieser Begründung
    // auftauchen.
    expect(advice?.abilities.some((a) => /Zauber/.test(a.why))).toBe(false);
  });

  it("begründet JEDES aufgeführte Attribut", () => {
    /*
      Das war ein echter Fehler: Reihenfolge und Begründung lagen in zwei getrennten
      Feldern, und ein Attribut ohne Begründung fiel stumm heraus — beim Kämpfer
      verschwand so DEX 13 (Dodge) samt Mindestwert. Jetzt verbietet der Typ es; dieser
      Test hält fest, was dabei herauskommen muss.
    */
    for (const slug of PLAYER_CLASSES) {
      const advice = adviceFor(klass(slug), undefined);
      for (const entry of advice?.abilities ?? []) {
        expect(entry.why, `${slug} ${entry.ability}`).toBeTruthy();
      }
      // Kein Attribut doppelt — sonst stünde dieselbe Zeile zweimal in der Karte.
      const seen = (advice?.abilities ?? []).map((a) => a.ability);
      expect(new Set(seen).size, slug).toBe(seen.length);
    }
  });

  it("nennt beim Kämpfer DEX 13 für Dodge und INT 13 für Combat Expertise", () => {
    const advice = adviceFor(klass("fighter"), undefined);
    expect(abilityAdviceFor(advice!, "dex")?.min).toBe(13);
    expect(abilityAdviceFor(advice!, "dex")?.minWhy).toMatch(/Dodge/);
    expect(abilityAdviceFor(advice!, "int")?.min).toBe(13);
    expect(abilityAdviceFor(advice!, "int")?.minWhy).toMatch(/Combat Expertise/);
  });

  it("begründet jeden Mindestwert", () => {
    for (const slug of PLAYER_CLASSES) {
      const advice = adviceFor(klass(slug), undefined);
      for (const entry of advice?.abilities ?? []) {
        if (entry.min === undefined) continue;
        expect(entry.minWhy, `${slug} ${entry.ability}`).toBeTruthy();
        expect(entry.min, `${slug} ${entry.ability}`).toBeGreaterThanOrEqual(10);
        expect(entry.min, `${slug} ${entry.ability}`).toBeLessThanOrEqual(18);
      }
    }
  });

  it("sagt seinem Halb-Ork-Kleriker, dass CHA −2 das Vertreiben trifft", () => {
    const advice = adviceFor(klass("cleric"), race("half-orc"));
    expect(advice?.abilities[0]?.ability).toBe("wis");
    expect(advice?.abilities[0]?.min).toBe(14);
    expect(advice?.raceNote).toMatch(/Half-Orc/);
    expect(advice?.raceNote).toMatch(/CHA -2/);
    // STR +2 hilft dem Kleriker — beides gehört in denselben Satz.
    expect(advice?.raceNote).toMatch(/STR \+2/);
  });

  it("schweigt beim Volk, wenn es zu dieser Klasse nichts zu sagen hat", () => {
    // Der Mensch hat keine Attributs-Modifikatoren, also gibt es keine Notiz.
    const advice = adviceFor(klass("fighter"), race("human"));
    expect(advice?.raceNote).toBeUndefined();
  });

  it("kommt auch ohne Handarbeit zu einer Empfehlung (Prestigeklasse)", () => {
    /*
      Für den Assassinen gibt es keinen Tabelleneintrag — trotzdem muss etwas Sinnvolles
      herauskommen, sonst stünde bei jeder Prestige-, NSC- und Homebrew-Klasse nichts da.
      Gerechnet aus seinen Daten: W6, 4 Fertigkeitspunkte, BAB 7 auf 10 Stufen (drei
      Viertel) → Nahkampf und Trefferpunkte.

      NEBENBEFUND: im Pack steht `spellcasting: null`, obwohl der Assassine im SRD
      zaubert. Das ist eine Lücke in den Daten, nicht in dieser Rechnung — hier wird sie
      festgehalten, damit sie nicht als Empfehlungsfehler durchgeht.
    */
    const assassin = compendium.get("srd:class:assassin");
    expect(assassin).toBeDefined();
    if (assassin?.kind !== "class") throw new Error("srd:class:assassin ist keine Klasse");
    expect(assassin.data.spellcasting).toBeUndefined();

    const advice = adviceFor(assassin, undefined);
    expect(advice).toBeDefined();
    expect(advice?.abilities.map((a) => a.ability)).toEqual(["str", "con"]);
    // Ohne Zauberdaten darf auch keine Zauber-Begründung erscheinen.
    expect(advice?.abilities.some((a) => /Zauber/.test(a.why))).toBe(false);
  });

  it("liefert ohne Klasse gar keine Empfehlung", () => {
    expect(adviceFor(undefined, race("half-orc"))).toBeUndefined();
    // Ein Volk ist keine Klasse — es darf nicht als eine durchgehen.
    expect(adviceFor(race("half-orc"), undefined)).toBeUndefined();
  });

  it("findet den Eintrag zu einem einzelnen Attribut", () => {
    const advice = adviceFor(klass("wizard"), undefined);
    expect(abilityAdviceFor(advice!, "int")?.min).toBe(15);
    expect(abilityAdviceFor(advice!, "cha")).toBeUndefined();
    expect(isKeyAbility(advice!, "int")).toBe(true);
    expect(isKeyAbility(advice!, "cha")).toBe(false);
  });
});
