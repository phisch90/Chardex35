import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  entitySchema,
  resolveCompendium,
  type Entity,
  type SpellListEntity,
} from "../schema/entities.js";
import { domainSpellLists } from "./spells.js";
import { domainInfo, grantedPowerOf } from "./domains.js";

/**
 * Gegen die ECHTEN Packs. Der Sinn ist die VOLLSTÄNDIGKEIT: alle 36 Domänen
 * müssen eine gewährte Fähigkeit und neun Zauber hergeben, sonst steht im
 * Assistenten eine leere Zeile und man wählt blind.
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

describe.skipIf(!packsAvailable)("Domänen: gewährte Fähigkeit und Zauber", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();
  const domains = domainSpellLists(compendium);
  const infos = domains.map((d) => domainInfo(d, compendium));
  const byId = new Map(infos.map((i) => [i.id, i]));

  it("findet alle 36 Domänen", () => {
    expect(domains).toHaveLength(36);
  });

  it("jede Domäne hat neun Zauber, einen je Grad 1 bis 9", () => {
    for (const info of infos) {
      expect(info.spells, info.id).toHaveLength(9);
      expect(info.spells.map((s) => s.level), info.id).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });

  it("jeder Domänenzauber lässt sich im Kompendium auflösen", () => {
    /*
      Ein Zauber, der nur als Kennung dasteht, wäre im Assistenten eine Zeile
      wie „srd:spell:obscuring-mist" — das liest niemand. Hier fällt es auf.
    */
    const unresolved: string[] = [];
    for (const info of infos) {
      for (const spell of info.spells) {
        if (spell.name === spell.spellId) unresolved.push(`${info.id}: ${spell.spellId}`);
      }
    }
    expect(unresolved).toEqual([]);
  });

  it("jede Domäne sagt, was sie GEWÄHRT", () => {
    const without = infos.filter((i) => i.grantedPower === undefined).map((i) => i.id);
    expect(without).toEqual([]);
  });

  it("die gewährte Fähigkeit zieht die Zauberliste NICHT mit hinein", () => {
    /*
      Im SRD folgt direkt hinter der gewährten Fähigkeit die numerierte
      Zauberliste. Ein zu gieriges Muster hätte neun Zauberzeilen an den Satz
      geklebt — in der Auswahl ein halber Bildschirm statt einer Zeile.
    */
    for (const info of infos) {
      const power = info.grantedPower!;
      expect(power.length, info.id).toBeLessThan(700);
      // Kein „1 Obscuring mist  2 Wind wall  3 …" am Ende.
      expect(power, info.id).not.toMatch(/\b1\s+[A-Z][a-z]+.*\b2\s+[A-Z][a-z]+/);
    }
  });

  it("nennt Heal und War, die Domänen seines Klerikers", () => {
    const heal = byId.get("srd:spelllist:domain-healing") ?? byId.get("srd:spelllist:domain-heal");
    expect(heal, [...byId.keys()].join(" ")).toBeDefined();
    const war = byId.get("srd:spelllist:domain-war");
    expect(war?.grantedPower).toMatch(/Weapon Focus|martial weapon/i);
    expect(war?.spells.map((s) => s.name)).toContain("Magic Weapon");
  });

  it("grantedPowerOf bleibt still, wo es keinen Text gibt", () => {
    expect(grantedPowerOf({ description: undefined })).toBeUndefined();
    expect(grantedPowerOf({ description: "" })).toBeUndefined();
    expect(grantedPowerOf({ description: "Kein Muster hier drin." })).toBeUndefined();
  });

  it("nimmt den deutschen Namen, wenn es einen gibt", () => {
    const raw = compendium.get("srd:spelllist:domain-war") as SpellListEntity;
    const german: SpellListEntity = {
      ...raw,
      localized: { de: { name: "Domäne: Krieg" } },
    };
    expect(domainInfo(german, compendium).name).toBe("Domäne: Krieg");
  });
});
