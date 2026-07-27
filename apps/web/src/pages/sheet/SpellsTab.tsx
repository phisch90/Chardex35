import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  displayName,
  spellsForList,
  type Character,
  type SpellEntity,
  type SpellcastingBlock,
} from "@codex35/core";
import { S } from "../../strings.js";
import { useCompendium } from "../../lib/hooks.js";
import { Card, Chip, GhostButton, SearchInput, SectionTitle, fmtMod } from "../../ui/bits.js";
import type { TabProps } from "./index.js";

export function SpellsTab(props: TabProps) {
  return (
    <div className="space-y-3">
      {props.sheet.spellcasting.map((block) => (
        <CasterBlock key={block.classId} block={block} {...props} />
      ))}
    </div>
  );
}

function emptySpellState(): NonNullable<Character["spellState"][string]> {
  return { known: [], prepared: [], usedSlots: [] };
}

/** „Enchantment (V, S, DF)" — Schule und Komponenten wie auf einer Zauberkarte. */
function spellSubline(spell: SpellEntity | null): string {
  if (!spell) return "";
  const parts = [spell.data.school, ...(spell.data.subschool ? [spell.data.subschool] : [])]
    .filter((p) => p !== "")
    .join("/");
  return spell.data.components ? `${parts} (${spell.data.components})` : parts;
}

function CasterBlock({ block, character, save }: TabProps & { block: SpellcastingBlock }) {
  const compendium = useCompendium();
  const [query, setQuery] = useState("");
  const [addLevel, setAddLevel] = useState<number | null>(null);

  const entries = useMemo(
    () => (compendium ? spellsForList(compendium, block.spellListId) : []),
    [compendium, block.spellListId],
  );
  const state = character.spellState[block.classId] ?? emptySpellState();
  const knownSet = new Set(state.known);
  const isPrepared = block.model === "prepared";
  // Nur Magier (und Assassine) führen ein Zauberbuch — Kleriker, Druiden,
  // Paladine und Waldläufer kennen ihre gesamte Klassenliste (3.5-Regeln).
  const usesSpellbook = block.usesSpellbook;

  const mutate = (fn: (s: NonNullable<Character["spellState"][string]>) => void) =>
    save((c) => {
      const s = (c.spellState[block.classId] ??= emptySpellState());
      fn(s);
      // Direkte Index-Zuweisung kann Sparse-Löcher erzeugen — normalisieren,
      // damit Export (JSON) und Zod-Import sauber bleiben.
      s.usedSlots = Array.from(s.usedSlots, (v) => v ?? 0);
    });

  const slotFor = (level: number) => block.slots.find((s) => s.level === level);

  const castAt = (level: number) => {
    const slot = slotFor(level);
    if (!slot || slot.total === null) return;
    const total = slot.total;
    mutate((s) => {
      s.usedSlots[level] = Math.min(total, (s.usedSlots[level] ?? 0) + 1);
    });
  };

  const canCastAt = (level: number) => {
    const slot = slotFor(level);
    return slot !== undefined && slot.total !== null && (state.usedSlots[level] ?? 0) < slot.total;
  };

  // 3.5: je Grad nur so viele Zauber vorbereiten, wie Slots vorhanden sind.
  const preparedCountAt = (level: number) =>
    state.prepared.filter((p) => p.slotLevel === level).length;
  const canPrepareAt = (level: number) => {
    const slot = slotFor(level);
    return slot !== undefined && slot.total !== null && preparedCountAt(level) < slot.total;
  };

  // Spontanzauberer: bekannte Zauber je Grad aus der spellsKnown-Tabellenzeile.
  const knownCountAt = (level: number) =>
    entries.filter((e) => e.level === level && knownSet.has(e.spellId)).length;
  const canLearnAt = (level: number) => {
    const limit = block.spellsKnown?.[level];
    if (limit === undefined || limit === null) return true;
    return knownCountAt(level) < limit;
  };

  const availableLevels = block.slots.filter((s) => s.total !== null).map((s) => s.level);

  /**
   * Was im Grad-Abschnitt steht: beim Magier sein Zauberbuch, bei allen anderen
   * die ganze Klassenliste. Fight Club zeigt genau das — die Auswahl passiert
   * direkt in der Liste, nicht in einem zweiten Dialog.
   */
  const repertoireAt = (level: number) => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (e.level !== level || e.spell === null) return false;
      if (usesSpellbook && !knownSet.has(e.spellId)) return false;
      return !q || e.spell.name.toLowerCase().includes(q);
    });
  };

  /** Nur für Zauberbuch-Klassen: was noch nicht im Buch steht. */
  const missingAt = (level: number) => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (e.level !== level || e.spell === null) return false;
      if (knownSet.has(e.spellId)) return false;
      return !q || e.spell.name.toLowerCase().includes(q);
    });
  };

  const togglePrepared = (spellId: string, level: number) =>
    mutate((s) => {
      const index = s.prepared.findIndex((p) => p.spellId === spellId && p.slotLevel === level);
      if (index >= 0) s.prepared.splice(index, 1);
      else if (canPrepareAt(level)) s.prepared.push({ spellId, slotLevel: level });
    });

  const toggleKnown = (spellId: string, level: number) =>
    mutate((s) => {
      if (s.known.includes(spellId)) s.known = s.known.filter((id) => id !== spellId);
      else if (canLearnAt(level)) s.known.push(spellId);
    });

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <SectionTitle>
            {block.className} — {isPrepared ? "vorbereitet" : "spontan"}
          </SectionTitle>
          <p className="text-xs text-slate-400">
            {S.sheet.casterLevel} {block.casterLevel.total} · {S.spells.dc} {block.dcBase} +{" "}
            {S.spells.level} · {S.abilities[block.ability]} {fmtMod(block.abilityMod)}
          </p>
        </div>
        <GhostButton onClick={() => mutate((s) => void (s.usedSlots = []))} title={S.spells.rest}>
          🌙
        </GhostButton>
      </div>

      <div className="mt-2">
        <SearchInput value={query} onChange={setQuery} placeholder={S.actions.search} />
      </div>

      {availableLevels.map((level) => {
        const slot = slotFor(level)!;
        const total = slot.total ?? 0;
        const used = state.usedSlots[level] ?? 0;
        const repertoire = repertoireAt(level);
        const missing = usesSpellbook ? missingAt(level) : [];
        return (
          <section key={level} className="mt-4">
            {/* Grad-Kopf mit Slot-Pips, Verbrauch und SG — wie in Fight Club. */}
            <div className="flex items-center gap-2 border-b border-slate-700 pb-1">
              <span className="text-xs font-bold uppercase tracking-wide text-amber-400">
                {S.spells.level} {level}
              </span>
              <span className="flex-1 truncate font-mono text-[11px] text-slate-400">
                {Array.from({ length: total }, (_, i) => (i < used ? "●" : "○")).join(" ")}
                {slot.bonus > 0 && <span className="ml-1 text-emerald-500">(+{slot.bonus})</span>}
              </span>
              <span className="shrink-0 text-[11px] text-slate-400">
                {S.spells.slots} {total - used}/{total}
              </span>
              <span className="shrink-0 text-[11px] text-slate-500">
                {S.spells.dc} {block.dcBase + level}
              </span>
              <GhostButton
                onClick={() =>
                  mutate((s) => {
                    s.usedSlots[level] = Math.max(0, (s.usedSlots[level] ?? 0) - 1);
                  })
                }
                title={S.spells.rest}
              >
                −
              </GhostButton>
              <GhostButton
                disabled={!canCastAt(level)}
                onClick={() => castAt(level)}
                title={S.spells.cast}
              >
                +
              </GhostButton>
            </div>

            <ul className="divide-y divide-slate-800">
              {repertoire.map((entry) => {
                const count = isPrepared
                  ? state.prepared.filter((p) => p.spellId === entry.spellId && p.slotLevel === level)
                      .length
                  : 0;
                const active = isPrepared ? count > 0 : knownSet.has(entry.spellId);
                const blocked = active
                  ? false
                  : isPrepared
                    ? !canPrepareAt(level)
                    : !canLearnAt(level);
                return (
                  <li key={entry.spellId} className="flex items-center gap-2 py-1.5">
                    <button
                      onClick={() =>
                        isPrepared
                          ? togglePrepared(entry.spellId, level)
                          : toggleKnown(entry.spellId, level)
                      }
                      disabled={blocked}
                      aria-label={
                        active
                          ? isPrepared
                            ? S.spells.unprepare
                            : S.spells.unlearn
                          : isPrepared
                            ? S.spells.prepare
                            : S.spells.learn
                      }
                      className={`w-6 shrink-0 text-center text-base leading-none ${
                        active ? "text-amber-400" : blocked ? "text-slate-700" : "text-slate-500"
                      }`}
                    >
                      {active ? "◉" : "○"}
                    </button>
                    <Link
                      to="/kompendium/$kind/$entityId"
                      params={{ kind: "spell", entityId: entry.spellId }}
                      className="min-w-0 flex-1 hover:text-amber-300"
                    >
                      <div className={`truncate text-sm ${active ? "font-semibold" : ""}`}>
                        {entry.spell ? displayName(entry.spell) : entry.spellId}
                        {count > 1 && <span className="text-slate-400"> ×{count}</span>}
                      </div>
                      <div className="truncate text-[11px] text-slate-500">
                        {spellSubline(entry.spell)}
                      </div>
                    </Link>
                    {isPrepared && count > 0 && (
                      <GhostButton
                        disabled={!canPrepareAt(level)}
                        onClick={() =>
                          mutate((s) => void s.prepared.push({ spellId: entry.spellId, slotLevel: level }))
                        }
                        title={S.spells.another}
                      >
                        ＋
                      </GhostButton>
                    )}
                    {active && (
                      <GhostButton
                        disabled={!canCastAt(level)}
                        onClick={() => castAt(level)}
                        title={S.spells.cast}
                      >
                        ✨
                      </GhostButton>
                    )}
                    {usesSpellbook && (
                      <GhostButton
                        danger
                        onClick={() => mutate((s) => void (s.known = s.known.filter((id) => id !== entry.spellId)))}
                        title={S.spells.removeFromSpellbook}
                      >
                        ✕
                      </GhostButton>
                    )}
                  </li>
                );
              })}
              {repertoire.length === 0 && (
                <li className="py-2 text-sm text-slate-500">
                  {usesSpellbook ? S.spells.emptySpellbook : S.spells.noneAtLevel}
                </li>
              )}
            </ul>

            {/* Zauberbuch-Klassen: der Rest der Klassenliste, aufklappbar. */}
            {usesSpellbook && (
              <div className="mt-1">
                <Chip
                  active={addLevel === level}
                  onClick={() => setAddLevel(addLevel === level ? null : level)}
                >
                  📖 {S.spells.addToSpellbook}
                </Chip>
                {addLevel === level && (
                  <ul className="mt-1 max-h-64 divide-y divide-slate-800 overflow-y-auto rounded-lg bg-slate-900/60 p-1">
                    {missing.slice(0, 80).map((entry) => (
                      <li key={entry.spellId} className="flex items-center gap-2 py-1.5">
                        <Link
                          to="/kompendium/$kind/$entityId"
                          params={{ kind: "spell", entityId: entry.spellId }}
                          className="min-w-0 flex-1 hover:text-amber-300"
                        >
                          <div className="truncate text-sm">
                            {entry.spell ? displayName(entry.spell) : entry.spellId}
                          </div>
                          <div className="truncate text-[11px] text-slate-500">
                            {spellSubline(entry.spell)}
                          </div>
                        </Link>
                        <GhostButton
                          onClick={() => mutate((s) => void s.known.push(entry.spellId))}
                        >
                          + {S.spells.spellbook}
                        </GhostButton>
                      </li>
                    ))}
                    {missing.length === 0 && (
                      <li className="py-2 text-sm text-slate-500">{S.spells.noneAtLevel}</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}

      {!isPrepared && block.spellsKnown && (
        <p className="mt-3 text-[11px] text-slate-500">
          {S.spells.knownLimit(
            state.known.length,
            block.spellsKnown.filter((k) => k !== null).reduce((a, b) => a + (b ?? 0), 0).toString(),
          )}
        </p>
      )}
      {isPrepared && <p className="mt-3 text-[10px] text-slate-500">{S.spells.preparedHint}</p>}

      {/*
        Legende. Die Zeichen sind kompakt genug für ein Handy, aber niemand
        errät, dass ◉ „vorbereitet“ und 🌙 „Rast“ heißt — einmal pro
        Klassen-Karte erklärt, unten, wo sie nicht im Weg steht.
      */}
      <details className="mt-3 border-t border-slate-800 pt-2">
        <summary className="cursor-pointer text-xs text-slate-400">Zeichen-Legende</summary>
        <ul className="mt-1.5 space-y-1 text-xs leading-snug text-slate-500">
          <li>
            <span className="text-amber-400">◉</span> / <span className="text-slate-500">○</span> —{" "}
            {isPrepared ? "vorbereitet / nicht vorbereitet" : "bekannt / nicht bekannt"}; antippen
            schaltet um
          </li>
          <li>
            <span className="text-amber-400">●</span> / <span className="text-slate-500">○</span> im
            Grad-Kopf — verbrauchter / freier Slot dieses Grads
          </li>
          <li>
            <span className="text-slate-300">✨</span> — wirken: zählt einen Slot des Grads als
            verbraucht
          </li>
          <li>
            <span className="text-slate-300">＋</span> / <span className="text-slate-300">−</span> im
            Grad-Kopf — Slot von Hand verbrauchen bzw. zurückgeben
          </li>
          {isPrepared && (
            <li>
              <span className="text-slate-300">＋</span> an einem Zauber — denselben Zauber ein
              weiteres Mal vorbereiten (×2 hinter dem Namen)
            </li>
          )}
          <li>
            <span className="text-slate-300">🌙</span> — Rast: setzt alle verbrauchten Slots dieser
            Klasse zurück
          </li>
          {usesSpellbook && (
            <li>
              <span className="text-slate-300">📖</span> — Zauberbuch erweitern ·{" "}
              <span className="text-red-400">✕</span> — Zauber aus dem Buch nehmen
            </li>
          )}
          <li>
            <span className="text-emerald-400">(+n)</span> hinter der Slot-Zahl — Bonus-Slots aus{" "}
            {S.abilities[block.ability]}
          </li>
        </ul>
      </details>
    </Card>
  );
}
