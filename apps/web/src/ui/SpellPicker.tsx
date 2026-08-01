import { useState } from "react";
import {
  displayName,
  spellsForList,
  type Entity,
  type SpellcastingBlock,
} from "@codex35/core";
import { S } from "../strings.js";
import { Chip, GhostButton, SearchInput } from "./bits.js";

/**
 * Zauber wählen — einmal geschrieben, im Assistenten und im Stufenaufstieg benutzt.
 *
 * Sein Wunsch: „Beim Barden zum Beispiel hatte ich dir gesagt, dass ich Zauber für Level 1
 * schon beim Erstellen auswählen will." Im Stufenaufstieg gab es die Liste schon — als
 * eigene Kopie mit eigener Suche. Eine zweite Kopie im Assistenten wäre die dritte Fassung
 * derselben Sache; genau so ist es bei den Talenten schon einmal gelaufen, bis der
 * `FeatPicker` daraus wurde.
 *
 * Die Grenze je Zaubergrad kommt aus `spellsKnown` des abgeleiteten Zauberblocks: ein
 * Hexenmeister der 4. Stufe darf genau EINEN Grad-2-Zauber kennen, nicht drei. Wer ein
 * Zauberbuch führt (Magier), hat diese Grenze nicht — sein Buch wächst, solange er
 * Seiten und Zeit hat, und die App zählt ihm da nichts vor.
 */
export function SpellPicker({
  compendium,
  block,
  alreadyKnown,
  picked,
  onPick,
  onDrop,
}: {
  compendium: Map<string, Entity>;
  /** Der Zauberblock der betroffenen Klasse aus dem abgeleiteten Bogen. */
  block: SpellcastingBlock | undefined;
  /** Was der Charakter schon kennt (im Assistenten: leer). */
  alreadyKnown: string[];
  /** Was in diesem Durchgang gewählt wurde. */
  picked: string[];
  onPick: (spellId: string) => void;
  onDrop: (spellId: string) => void;
}) {
  const [query, setQuery] = useState("");
  if (block === undefined) return null;

  const entries = spellsForList(compendium, block.spellListId);
  /*
    Bis zu welchem Grad darf diese Klasse überhaupt? Aus den Plätzen, nicht geraten: ein
    Barde der 1. Stufe hat nur Grad-0-Plätze, also stehen auch nur Grad-0-Zauber zur Wahl.
  */
  const maxLevel = Math.max(
    -1,
    ...block.slots.filter((slot) => slot.total !== null).map((slot) => slot.level),
  );

  const knownIds = new Set([...alreadyKnown, ...picked]);
  const countAtLevel = (level: number) =>
    entries.filter((entry) => entry.level === level && knownIds.has(entry.spellId)).length;
  const limitAtLevel = (level: number): number | null => {
    if (block.usesSpellbook) return null; // Zauberbuch: keine Grenze in der App.
    const limit = block.spellsKnown?.[level];
    return limit === undefined || limit === null ? null : limit;
  };
  const canLearn = (level: number) => {
    const limit = limitAtLevel(level);
    return limit === null || countAtLevel(level) < limit;
  };

  const needle = query.trim().toLowerCase();
  const visible = entries
    .filter((entry) => entry.spell !== null && entry.level <= maxLevel)
    .filter((entry) => !alreadyKnown.includes(entry.spellId))
    .filter((entry) => needle === "" || entry.spell!.name.toLowerCase().includes(needle))
    .slice(0, 60);

  return (
    <div>
      {picked.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1.5">
          {picked.map((id) => {
            const spell = compendium.get(id);
            return (
              <Chip key={id} active onClick={() => onDrop(id)}>
                {spell ? displayName(spell) : id} ✕
              </Chip>
            );
          })}
        </div>
      )}

      {/* Wie viele je Grad noch gehen — die Zahl, die man beim Wählen braucht. */}
      <p className="mb-1 text-xs text-slate-500">
        {block.slots
          .filter((slot) => slot.total !== null)
          .map((slot) => {
            const limit = limitAtLevel(slot.level);
            return limit === null
              ? `${S.spells.level} ${slot.level}`
              : `${S.spells.level} ${slot.level}: ${countAtLevel(slot.level)}/${limit}`;
          })
          .join(" · ")}
      </p>

      <SearchInput value={query} onChange={setQuery} placeholder={S.actions.search} />
      <ul className="mt-1 max-h-60 divide-y divide-slate-800 overflow-y-auto">
        {visible.map((entry) => {
          const chosen = picked.includes(entry.spellId);
          const full = !chosen && !canLearn(entry.level);
          return (
            <li
              key={entry.spellId}
              className="flex items-center justify-between gap-2 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate">
                {displayName(entry.spell!)}
                <span className="ml-1 text-xs text-slate-500">
                  {S.spells.level} {entry.level}
                </span>
              </span>
              {chosen ? (
                <GhostButton onClick={() => onDrop(entry.spellId)}>{S.actions.remove}</GhostButton>
              ) : (
                <GhostButton
                  disabled={full}
                  {...(full ? { title: S.spells.levelFull(entry.level) } : {})}
                  onClick={() => onPick(entry.spellId)}
                >
                  {S.actions.add}
                </GhostButton>
              )}
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && <p className="mt-1 text-xs text-slate-500">{S.spells.noneFound}</p>}
    </div>
  );
}
