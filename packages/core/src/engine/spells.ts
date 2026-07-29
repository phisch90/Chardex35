import type { Entity, SpellEntity, SpellListEntity } from "../schema/entities.js";
import type { SpellcastingBlock } from "./types.js";

export interface SpellListEntry {
  spellId: string;
  level: number;
  spell: SpellEntity | null;
  /**
   * Gesetzt, wenn dieser Eintrag aus einer DOMÄNEN-Liste kommt („War Domain").
   * Nur zur Beschriftung — für die Plätze zählt der Grad, nicht die Herkunft.
   */
  domain?: string;
}

/** Marke, unter der die Packs die Domänen-Zauberlisten führen. */
export const DOMAIN_TAG = "domain";

/**
 * Zauber einer Zauberliste (spelllist-Entity) auflösen — sortiert nach Grad,
 * dann Name. Fehlende Zauber-Referenzen bleiben als null erhalten (die UI
 * kann sie ausblenden oder anzeigen), die Liste crasht nie.
 */
export function spellsForList(
  compendium: Map<string, Entity>,
  spellListId: string,
): SpellListEntry[] {
  const list = compendium.get(spellListId);
  if (!list || list.kind !== "spelllist" || list.deletedAt) return [];

  const entries: SpellListEntry[] = Object.entries(list.data.spells).map(([spellId, level]) => {
    const entity = compendium.get(spellId);
    const spell = entity && entity.kind === "spell" && !entity.deletedAt ? entity : null;
    return { spellId, level, spell };
  });

  return sortEntries(entries);
}

/**
 * Was dieser Zauberblock zur Auswahl hat: die Klassenliste PLUS die Zauber der
 * gewählten Domänen.
 *
 * Der Grund, warum das nicht die Klassenliste allein sein kann: die Domänen
 * bringen Zauber mit, die auf keiner Klerikerliste stehen. Power Word Kill ist
 * War 9 und sonst nirgends — ohne diese Zusammenführung wäre der Domänenplatz
 * ein Platz ohne Zauber, den man hineinlegen könnte.
 *
 * Steht ein Zauber auf beiden Listen im GLEICHEN Grad (Cure Light Wounds ist
 * Cleric 1 und Healing 1), gewinnt die Klassenliste und der Eintrag erscheint
 * einmal. Doppelt gelistet wäre er zweimal antippbar und einmal zu viel
 * vorbereitet.
 */
export function spellsForCaster(
  compendium: Map<string, Entity>,
  block: Pick<SpellcastingBlock, "spellListId" | "domains">,
): SpellListEntry[] {
  const entries = spellsForList(compendium, block.spellListId);
  if (block.domains.length === 0) return entries;

  const seen = new Set(entries.map((entry) => `${entry.spellId}@${entry.level}`));
  for (const domain of block.domains) {
    for (const entry of spellsForList(compendium, domain.spellListId)) {
      const key = `${entry.spellId}@${entry.level}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ ...entry, domain: domain.name });
    }
  }
  return sortEntries(entries);
}

/**
 * Alle Domänen des Kompendiums, für die Auswahl im Bogen.
 *
 * Über die Marke `domain` und nicht über das Namensmuster der Kennung: eine
 * eigene Domäne aus seinen Büchern heißt nicht `srd:spelllist:domain-…`, trägt
 * aber dieselbe Marke — und soll in derselben Auswahl stehen.
 */
export function domainSpellLists(compendium: Map<string, Entity>): SpellListEntity[] {
  const out: SpellListEntity[] = [];
  for (const [id, entity] of compendium) {
    if (entity.kind !== "spelllist" || entity.deletedAt) continue;
    if (id !== entity.id) continue; // Overrides liegen doppelt in der Map.
    if (!entity.tags.includes(DOMAIN_TAG)) continue;
    out.push(entity);
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

function sortEntries(entries: SpellListEntry[]): SpellListEntry[] {
  entries.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    const nameA = a.spell?.name ?? a.spellId;
    const nameB = b.spell?.name ?? b.spellId;
    return nameA.localeCompare(nameB);
  });
  return entries;
}
