import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { entitySchema, type Entity, type FeatEntity } from "../schema/entities.js";
import {
  FEAT_BONUS_KINDS,
  featBonusAliasTargets,
  featBonusKeys,
  featBonusKinds,
  featMatchesKind,
  featsWithoutBonus,
  hasFeatBonus,
} from "./featBonus.js";

/**
 * Gegen die ECHTEN Packs. Der Sinn dieses Filters ist die DECKUNG: er darf nichts
 * verstecken, was an einem Bogen der Stufen 1–20 vorkommt. Genau daran wäre ein
 * Filter über die eingetragenen `effects` gescheitert — die haben nur 27 von 327.
 */
const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const manifestPath = join(packsDir, "manifest.json");
const packsAvailable = existsSync(manifestPath);

function loadEntities(): Entity[] {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: string[] };
  const entities: Entity[] = [];
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    for (const item of JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[]) {
      entities.push(entitySchema.parse(item));
    }
  }
  return entities;
}

describe.skipIf(!packsAvailable)("Talente: worauf wirken sie?", () => {
  const entities = packsAvailable ? loadEntities() : [];
  const feats = entities.filter((e): e is FeatEntity => e.kind === "feat");
  const keys = new Set(feats.map((f) => f.id.replace(/^srd:feat:/, "")));
  const nonEpic = feats.filter((f) => !f.tags.includes("epic"));

  it("keine Kennung in der Tabelle zeigt ins Leere", () => {
    /*
      Der wichtigste Test, wie überall hier: ein Tippfehler tut NICHTS. Das Talent
      fällt still aus jedem Filter, und niemand merkt es.
    */
    const unknown = featBonusKeys().filter((key) => !keys.has(key));
    expect(unknown).toEqual([]);
  });

  it("jedes Alias zeigt auf ein Talent, das es gibt", () => {
    const unknown = featBonusAliasTargets().filter((key) => !keys.has(key));
    expect(unknown).toEqual([]);
  });

  it("ALLE nicht-epischen Talente haben eine Wirkung", () => {
    /*
      Die eigentliche Zusage. 175 Stück — das ist alles, was an einem Bogen der
      Stufen 1–20 überhaupt auftauchen kann.
    */
    expect(nonEpic).toHaveLength(175);
    const without = nonEpic.filter((f) => !hasFeatBonus(f)).map((f) => f.id);
    expect(without).toEqual([]);
  });

  it("nur Kategorien aus der Liste, keine erfundenen", () => {
    const allowed = new Set<string>(FEAT_BONUS_KINDS);
    const bad: string[] = [];
    for (const feat of feats) {
      for (const kind of featBonusKinds(feat)) {
        if (!allowed.has(kind)) bad.push(`${feat.id}: ${kind}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("keine Kategorie ist doppelt an einem Talent", () => {
    const bad: string[] = [];
    for (const feat of feats) {
      const kinds = featBonusKinds(feat);
      if (new Set(kinds).size !== kinds.length) bad.push(feat.id);
    }
    expect(bad).toEqual([]);
  });

  it("jede der 13 Kategorien trifft auch wirklich etwas", () => {
    /*
      Eine Kategorie ohne Treffer wäre ein Filter-Knopf, der nichts tut — schlimmer
      als kein Knopf, weil er wie ein Fehler aussieht.
    */
    const empty = FEAT_BONUS_KINDS.filter(
      (kind) => !feats.some((feat) => featMatchesKind(feat, kind)),
    );
    expect(empty).toEqual([]);
  });

  it("die Beispiele, die er am Bogen nachprüfen kann", () => {
    const kinds = (key: string) => featBonusKinds({ id: `srd:feat:${key}` });
    // Power Attack kostet Angriff und gibt Schaden — steht unter beidem.
    expect(kinds("power-attack")).toEqual(["attack", "damage"]);
    expect(kinds("dodge")).toEqual(["ac"]);
    expect(kinds("toughness")).toEqual(["hp"]);
    expect(kinds("improved-initiative")).toEqual(["initiative"]);
    expect(kinds("great-fortitude")).toEqual(["save"]);
    expect(kinds("skill-focus")).toEqual(["skill"]);
    expect(kinds("spell-focus")).toEqual(["spell"]);
    expect(kinds("scribe-scroll")).toEqual(["craft"]);
    expect(kinds("martial-weapon-proficiency")).toEqual(["proficiency"]);
    // Extra Turning ist sein Talent — es füllt einen Zähler, das ist „Besonderes".
    expect(kinds("extra-turning")).toEqual(["special"]);
    // Kampfgeschick gibt RK und kostet Angriff.
    expect(kinds("combat-expertise")).toEqual(["ac", "attack"]);
  });

  it("„was verbessert meine RK?“ hat eine brauchbare Antwort", () => {
    const ac = nonEpic.filter((f) => featMatchesKind(f, "ac")).map((f) => f.name);
    expect(ac.length).toBeGreaterThanOrEqual(10);
    expect(ac).toContain("Dodge");
    expect(ac).toContain("Mobility");
    expect(ac).toContain("Two-Weapon Defense");
    expect(ac).toContain("Combat Expertise");
  });

  it("epische Talente erben die Wirkung ihres Vorbilds", () => {
    /*
      Eine RECHNUNG aus dem Namen, keine zweite Handtabelle: „Epic Toughness" ist
      Toughness. Zwei getrennte Tabellen wären zwei Wahrheiten, die auseinanderlaufen.
    */
    expect(featBonusKinds({ id: "srd:feat:epic-toughness" })).toEqual(["hp"]);
    expect(featBonusKinds({ id: "srd:feat:epic-will" })).toEqual(["save"]);
    expect(featBonusKinds({ id: "srd:feat:epic-dodge" })).toEqual(["ac"]);
    expect(featBonusKinds({ id: "srd:feat:epic-skill-focus" })).toEqual(["skill"]);
  });

  it("zählt ehrlich, was noch keine Wirkung hat — und es ist alles episch", () => {
    const missing = featsWithoutBonus(entities);
    // 223 von 327 gedeckt. Die Schranke darf nur FALLEN.
    expect(missing.length).toBeLessThanOrEqual(104);
    for (const id of missing) {
      const feat = feats.find((f) => f.id === id);
      expect(feat?.tags, `${id} ist nicht episch`).toContain("epic");
    }
  });

  it("ein unbekanntes Talent behauptet nichts", () => {
    expect(featBonusKinds({ id: "homebrew:feat:mein-talent" })).toEqual([]);
    expect(hasFeatBonus({ id: "homebrew:feat:mein-talent" })).toBe(false);
  });
});
