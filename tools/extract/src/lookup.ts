/**
 * Namensauflösung gegen die committeten SRD-Packs.
 *
 * Damit wird aus „Prerequisites: Str 13, Power Attack" eine echte Verknüpfung
 * auf `srd:feat:power-attack` — und die App kann die Voraussetzung prüfen,
 * anstatt nur einen Satz anzuzeigen. Ohne das wäre ein importiertes Talent
 * mechanisch stumm.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { entitySchema, type Entity, type NameLookup } from "@codex35/core";

export const PACKS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../packs/srd");

export interface SrdIndex extends NameLookup {
  /** Alle SRD-Entities nach ID — für Zauberlisten und Klassenbezüge. */
  byId: Map<string, Entity>;
  /** lowercase Klassen-Kürzel/Name → Klassen-ID („sor/wiz" → beide). */
  spellListIdByAbbrev: Map<string, string>;
}

export function loadSrdIndex(packsDir = PACKS_DIR): SrdIndex {
  const byId = new Map<string, Entity>();
  for (const file of readdirSync(packsDir)) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    const raw: unknown = JSON.parse(readFileSync(join(packsDir, file), "utf8"));
    if (!Array.isArray(raw)) continue;
    for (const item of raw) {
      const parsed = entitySchema.safeParse(item);
      if (parsed.success) byId.set(parsed.data.id, parsed.data);
    }
  }

  const skillIdByName = new Map<string, string>();
  const featIdByName = new Map<string, string>();
  const spellListIdByAbbrev = new Map<string, string>();
  for (const entity of byId.values()) {
    if (entity.kind === "skill") skillIdByName.set(entity.name.toLowerCase(), entity.id);
    if (entity.kind === "feat") featIdByName.set(entity.name.toLowerCase(), entity.id);
    if (entity.kind === "spelllist") {
      spellListIdByAbbrev.set(entity.name.toLowerCase(), entity.id);
      // „srd:spelllist:sorcerer-wizard" ist auch über den Slug ansprechbar.
      spellListIdByAbbrev.set(entity.id.replace(/^srd:spelllist:/, ""), entity.id);
    }
  }
  return { byId, skillIdByName, featIdByName, spellListIdByAbbrev };
}
