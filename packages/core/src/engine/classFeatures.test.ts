import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import {
  classFeatureOverview,
  classFeatureTexts,
  featureKey,
  germanFeatureKeys,
} from "./classFeatures.js";

/**
 * Gegen die ECHTEN Packs, und hier ist es der ganze Sinn der Datei.
 *
 * Diese Runde bringt zwei Quellen zusammen, die dasselbe verschieden benennen: die
 * Stufentabelle („Rage 2/day") und die Klassenbeschreibung („Rage (Ex)"). Wenn die
 * Zuordnung nicht greift, passiert nichts Sichtbares — das Merkmal steht einfach ohne
 * Erklärung da, so wie vorher. Genau diese Stille prüfen die Tests hier ab.
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

describe.skipIf(!packsAvailable)("Klassenmerkmale erklären", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();
  const klass = (slug: string): Entity => {
    const hit = compendium.get(`srd:class:${slug}`);
    if (hit === undefined) throw new Error(`srd:class:${slug} fehlt im Pack`);
    return hit;
  };

  it("normalisiert die Namen beider Quellen auf denselben Schlüssel", () => {
    expect(featureKey("Rage 2/day")).toBe("rage");
    expect(featureKey("Rage (Ex)")).toBe("rage");
    expect(featureKey("3rd favored enemy")).toBe("favored enemy");
    expect(featureKey("Favored Enemy (Ex)")).toBe("favored enemy");
    expect(featureKey("Trap sense +1")).toBe("trap sense");
    expect(featureKey("Sneak attack +1d6")).toBe("sneak attack");
    expect(featureKey("slow fall 20 ft.")).toBe("slow fall");
    expect(featureKey("slow fall any distance")).toBe("slow fall");
    expect(featureKey("Wild shape (Large)")).toBe("wild shape");
    expect(featureKey("Ki strike (adamantine)")).toBe("ki strike");
    expect(featureKey("Damage reduction 1/-")).toBe("damage reduction");
    expect(featureKey("Remove Disease 1/week")).toBe("remove disease");
    // Kleriker und Paladin nennen dasselbe verschieden.
    expect(featureKey("Turn undead")).toBe("turn or rebuke undead");
    // KEINE Plural-Regel: „A Thousand Faces" darf nicht zu „a thousand face" verstümmeln.
    expect(featureKey("A Thousand Faces (Su)")).toBe("a thousand faces");
    expect(featureKey("Bonus Feats")).toBe("bonus feat");
  });

  it("erklärt JEDES Merkmal aus JEDER Stufentabelle auf Deutsch", () => {
    /*
      Der wichtigste Test der Datei. Ein Merkmal ohne deutschen Satz fällt nicht auf: es
      steht als nackter englischer Name da — also genau der Zustand, den diese Runde
      abschaffen soll.
    */
    const missing: string[] = [];
    for (const slug of PLAYER_CLASSES) {
      const overview = classFeatureOverview(klass(slug));
      for (const level of overview?.levels ?? []) {
        for (const feature of level.features) {
          if (feature.summary === undefined) missing.push(`${slug} Stufe ${level.level}: ${feature.name}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("findet zu (fast) jedem Merkmal den englischen Regeltext in der Beschreibung", () => {
    /*
      Nicht jedes Merkmal der Tabelle hat eine eigene Überschrift in der Beschreibung —
      manche stehen als Absatz unter einer anderen. Gemessen wird deshalb der ANTEIL, und
      wenn er einbricht, ist die Zuordnung kaputt.
    */
    let withText = 0;
    let total = 0;
    for (const slug of PLAYER_CLASSES) {
      const overview = classFeatureOverview(klass(slug));
      for (const level of overview?.levels ?? []) {
        for (const feature of level.features) {
          total += 1;
          if (feature.text !== undefined && feature.text.length > 20) withText += 1;
        }
      }
    }
    expect(total).toBeGreaterThan(150);
    expect(withText / total).toBeGreaterThan(0.6);
  });

  it("holt beim Kleriker die Merkmale nach, die in der Stufentabelle fehlen", () => {
    /*
      Sein eigener Charakter. Im Pack steht in der Tabelle EIN Merkmal
      („Turn or rebuke undead") — Domänen, spontanes Wirken und Aura führt nur die
      Beschreibung aus. Ohne die zweite Gruppe wäre der Kleriker im Assistenten eine
      Klasse mit einem einzigen Merkmal.
    */
    const overview = classFeatureOverview(klass("cleric"));
    const alwaysKeys = (overview?.always ?? []).map((f) => f.key);
    expect(alwaysKeys).toContain("domains");
    expect(alwaysKeys).toContain("spontaneous casting");
    expect(alwaysKeys).toContain("aura");
    expect(alwaysKeys).toContain("spells");
    // Und sie tragen deutschen Namen, Satz und den englischen Text.
    const domains = overview?.always.find((f) => f.key === "domains");
    expect(domains?.germanName).toBe("Domänen");
    expect(domains?.summary).toMatch(/Domänen/);
    expect(domains?.text).toMatch(/domain/i);
    // Das eine Merkmal aus der Tabelle steht weiter auf seiner Stufe.
    expect(overview?.levels[0]?.features[0]?.key).toBe("turn or rebuke undead");
  });

  it("erklärt auch die nachgeholten Merkmale, nicht nur die aus der Tabelle", () => {
    const missing: string[] = [];
    for (const slug of PLAYER_CLASSES) {
      const overview = classFeatureOverview(klass(slug));
      for (const feature of overview?.always ?? []) {
        if (feature.summary === undefined) missing.push(`${slug}: ${feature.name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("meldet nichts als unerklärt, was erklärt ist", () => {
    for (const slug of PLAYER_CLASSES) {
      const overview = classFeatureOverview(klass(slug));
      expect(overview?.untranslated, slug).toEqual([]);
    }
  });

  it("trägt keine deutschen Sätze mit, die keine Klasse benutzt", () => {
    /*
      Die Gegenrichtung: ein Schlüssel, den niemand nachfragt, ist entweder ein Tippfehler
      oder toter Ballast. Beides will man sehen.
    */
    const used = new Set<string>();
    for (const slug of PLAYER_CLASSES) {
      const overview = classFeatureOverview(klass(slug));
      for (const level of overview?.levels ?? []) for (const f of level.features) used.add(f.key);
      for (const f of overview?.always ?? []) used.add(f.key);
    }
    const unused = germanFeatureKeys().filter((key) => !used.has(key));
    expect(unused).toEqual([]);
  });

  it("holt den Regeltext auch aus den kursiven Unterabschnitten", () => {
    /*
      Genau die fünf Namen aus seiner Beschwerde. Sie stehen im SRD nicht als eigenes
      Merkmal, sondern als kursiver Unterabschnitt INNERHALB von „Bardic Music" —
      `*Countersong (Su):*`. Wer nur die fetten Überschriften liest, gibt dem Barden vier
      Regeltexte und lässt seine fünf ohne.
    */
    const texts = classFeatureTexts(klass("bard"));
    for (const key of ["countersong", "fascinate", "inspire courage", "inspire competence", "suggestion"]) {
      expect(texts.get(key)?.text, key).toBeTruthy();
      expect((texts.get(key)?.text ?? "").length, key).toBeGreaterThan(50);
    }
    // Und die Abschnittsgrenze stimmt: im Countersong-Text steht kein Fascinate.
    expect(texts.get("countersong")?.text).not.toMatch(/fascinate/i);
  });

  it("lässt Tabellenspalten nicht als Merkmale durchgehen", () => {
    /*
      Der Preis der kursiven Ebene: beim Druiden sind `*Class Level:*` und `*Bonus HD:*`
      SPALTENKÖPFE der Tiergefährten-Tabelle. Sie würden als „Class Level — nur englisch"
      dastehen. Deshalb entsteht die zweite Gruppe nur aus Schlüsseln mit deutschem Satz.
    */
    for (const slug of PLAYER_CLASSES) {
      const names = (classFeatureOverview(klass(slug))?.always ?? []).map((f) => f.name);
      expect(names, slug).not.toContain("Class Level");
      expect(names, slug).not.toContain("Bonus HD");
      expect(names, slug).not.toContain("Natural Armor Adj.");
    }
  });

  it("liest den Regeltext erst ab „Class Features“", () => {
    // Vor diesem Abschnitt stehen dieselben Fettschriften für etwas anderes
    // („Hit Die:", „Fort Save") — die dürfen nicht als Merkmale durchgehen.
    const texts = classFeatureTexts(klass("cleric"));
    expect([...texts.keys()]).not.toContain("hit die");
    expect([...texts.keys()]).not.toContain("alignment");
    expect([...texts.keys()]).not.toContain("fort save");
    expect(texts.size).toBeGreaterThan(4);
  });

  it("verkraftet eine Klasse ohne Beschreibung und ohne Merkmale", () => {
    const bare = { ...klass("fighter") } as Entity;
    delete (bare as { description?: string }).description;
    const overview = classFeatureOverview(bare);
    expect(overview).toBeDefined();
    expect(overview?.always).toEqual([]);
    // Ohne Beschreibung gibt es keinen englischen Text, die deutschen Sätze bleiben.
    expect(overview?.levels[0]?.features[0]?.text).toBeUndefined();
    expect(overview?.levels[0]?.features[0]?.summary).toBeTruthy();
  });

  it("gibt für etwas, das keine Klasse ist, nichts zurück", () => {
    expect(classFeatureOverview(undefined)).toBeUndefined();
    expect(classFeatureOverview(compendium.get("srd:race:human"))).toBeUndefined();
  });
});
