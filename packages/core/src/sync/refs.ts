import type { Character } from "../schema/character.js";
import type { Entity } from "../schema/entities.js";

/**
 * Sammelt ALLE Zeichenketten eines Objekts — Werte UND Schlüssel. Schlüssel
 * zählen mit, weil im Charakter Verweise auch dort stehen (`skillRanks`,
 * `spellState` sind nach ID indiziert), und `id#zusatz`-Formen (Teilgebiete,
 * `toggledEffectKeys`) werden zusätzlich am `#` gekappt.
 *
 * Absichtlich stumpf statt Feld für Feld: eine neue ID-tragende Eigenschaft im
 * Schema würde sonst still aus dem Export fallen. Zu viel zu sammeln kostet
 * hier nichts (ein überzähliger Homebrew-Eintrag), zu wenig kostet den Bogen.
 */
function collectStrings(value: unknown, into: Set<string>, depth = 0): void {
  if (depth > 20) return;
  if (typeof value === "string") {
    into.add(value);
    const hash = value.indexOf("#");
    if (hash > 0) into.add(value.slice(0, hash));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, into, depth + 1);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      collectStrings(key, into, depth + 1);
      collectStrings(item, into, depth + 1);
    }
  }
}

/**
 * Die Homebrew-Einträge, die ein einzelner Charakter zum Funktionieren braucht
 * — transitiv. Zwei Aufnahmegründe:
 *
 *  - der Eintrag wird direkt verwiesen (Rasse, Klasse, Talent, Gegenstand …)
 *  - der Eintrag ÜBERSCHREIBT etwas Verwiesenes (`overrides`). Ohne das würde
 *    beim Empfänger der SRD-Eintrag durchscheinen und die Werte wären andere.
 *
 * SRD kommt nie mit: stabile Slugs lösen auf der anderen Seite selbst auf.
 */
export function collectHomebrewClosure(character: Character, homebrew: Entity[]): Entity[] {
  const seen = new Set<string>();
  collectStrings(character, seen);

  const pool = homebrew.filter((e) => e.source === "homebrew");
  const picked = new Map<string, Entity>();

  for (let pass = 0; pass <= pool.length; pass++) {
    let added = false;
    for (const entity of pool) {
      if (picked.has(entity.id)) continue;
      const referenced = seen.has(entity.id);
      const shadows = entity.overrides !== undefined && seen.has(entity.overrides);
      if (!referenced && !shadows) continue;
      picked.set(entity.id, entity);
      collectStrings(entity, seen);
      added = true;
    }
    if (!added) break;
  }

  return [...picked.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
