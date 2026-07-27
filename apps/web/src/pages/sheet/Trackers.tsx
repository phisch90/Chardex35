import { useState } from "react";
import { parseDice, rollDice, suggestTrackers, type Character } from "@codex35/core";
import { S } from "../../strings.js";
import { cryptoRng } from "../../lib/rng.js";
import { useAppSettings } from "../../lib/hooks.js";
import { useDiceStore } from "../../lib/diceStore.js";
import { Card, Chip, GhostButton, SectionTitle } from "../../ui/bits.js";
import { UndoBar, useUndo } from "../../ui/UndoBar.js";
import type { TabProps } from "./index.js";

type Tracker = Character["trackers"][number];

/**
 * Freie Zähler für Hausregel-Mechaniken (Aktionspunkte, Untote vertreiben …).
 * Die App wertet nichts davon aus — sie führt nur Buch, so wie es am Tisch
 * gebraucht wird.
 */
export function TrackersCard({ character, sheet, save }: TabProps) {
  const { diceEnabled } = useAppSettings();
  const roll = useDiceStore((s) => s.roll);
  const [editing, setEditing] = useState(false);
  const undo = useUndo();
  const trackers = character.trackers;

  // Was aus Klassen und Stufe folgt, muss niemand abtippen. Schon vorhandene
  // Vorschläge fallen raus — auch wenn der Zähler umbenannt wurde.
  const taken = new Set(trackers.map((t) => t.suggestedFrom ?? `name:${t.name.toLowerCase()}`));
  const suggestions = suggestTrackers(sheet).filter(
    (s) => !taken.has(s.key) && !taken.has(`name:${s.name.toLowerCase()}`),
  );

  const mutate = (id: string, fn: (t: Tracker) => void) =>
    save((c) => {
      const target = c.trackers.find((t) => t.id === id);
      if (target) fn(target);
    });

  const addTracker = () => {
    const name = prompt(S.trackers.name + "?");
    if (!name) return;
    save((c) =>
      void c.trackers.push({
        id: crypto.randomUUID(),
        name,
        kind: "counter",
        value: 0,
      }),
    );
    setEditing(true);
  };

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between">
        <SectionTitle>{S.trackers.title}</SectionTitle>
        <Chip active={editing} onClick={() => setEditing(!editing)}>
          ✎ {S.actions.edit}
        </Chip>
      </div>

      {trackers.length === 0 && (
        <p className="mb-2 text-xs text-slate-500">{S.trackers.empty}</p>
      )}

      <ul className="divide-y divide-slate-800">
        {trackers.map((tracker) => (
          <li key={tracker.id} className="py-2 text-sm">
            <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{tracker.name}</div>
              <div className="text-xs text-slate-500">
                {/* Bei vorgeschlagenen Zählern steht hier die Herkunft der Zahl
                    („3 + CH-Modifikator …“) statt der nackten Art. */}
                {tracker.note ?? S.trackers.kinds[tracker.kind]}
                {tracker.kind === "roll" && tracker.formula ? ` · ${tracker.formula}` : ""}
                {tracker.max !== undefined ? ` · max. ${tracker.max}` : ""}
              </div>
            </div>

            {tracker.kind === "roll" ? (
              <>
                <span className="w-10 text-right font-mono text-lg font-bold tabular-nums">
                  {tracker.value}
                </span>
                {diceEnabled && tracker.formula && parseDice(tracker.formula) && (
                  <GhostButton
                    onClick={() => {
                      const expr = parseDice(tracker.formula!)!;
                      const result = rollDice(expr, cryptoRng);
                      roll(tracker.formula!, `${character.name}: ${tracker.name}`);
                      // Der letzte Wurf bleibt am Zähler sichtbar.
                      mutate(tracker.id, (t) => void (t.value = result.total));
                    }}
                  >
                    🎲
                  </GhostButton>
                )}
              </>
            ) : (
              <>
                <span className="w-14 text-right font-mono text-lg font-bold tabular-nums">
                  {tracker.value}
                  {tracker.max !== undefined && (
                    <span className="text-xs font-normal text-slate-500">/{tracker.max}</span>
                  )}
                </span>
                {tracker.kind === "counter" && (
                  <>
                    <GhostButton
                      onClick={() => mutate(tracker.id, (t) => void (t.value = t.value - 1))}
                    >
                      −
                    </GhostButton>
                    <GhostButton
                      onClick={() =>
                        mutate(tracker.id, (t) => {
                          t.value = t.max !== undefined ? Math.min(t.max, t.value + 1) : t.value + 1;
                        })
                      }
                    >
                      +
                    </GhostButton>
                  </>
                )}
              </>
            )}

            </div>

            {/* Bearbeiten-Knöpfe in eigener Zeile — der Name soll nicht abgeschnitten werden. */}
            {editing && (
              <div className="mt-1.5 flex justify-end">
                <TrackerEditor
                  tracker={tracker}
                  character={character}
                  save={save}
                  onDeleted={undo.offer}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <UndoBar pending={undo.pending} onUndo={undo.undo} onDismiss={undo.dismiss} />

      {suggestions.length > 0 && (
        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/40 p-2">
          <p className="mb-1.5 text-xs text-slate-400">{S.trackers.suggestHint}</p>
          <ul className="space-y-1.5">
            {suggestions.map((suggestion) => (
              <li key={suggestion.key} className="flex items-center gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    {suggestion.name}{" "}
                    <span className="font-mono text-slate-400">{suggestion.max}×</span>
                  </div>
                  <div className="truncate text-xs text-slate-500">{suggestion.note}</div>
                </div>
                <GhostButton
                  onClick={() =>
                    save((c) =>
                      void c.trackers.push({
                        id: crypto.randomUUID(),
                        name: suggestion.name,
                        kind: "counter",
                        value: suggestion.max,
                        max: suggestion.max,
                        note: suggestion.note,
                        suggestedFrom: suggestion.key,
                      }),
                    )
                  }
                >
                  + {S.trackers.suggestAdd}
                </GhostButton>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-2">
        <GhostButton onClick={addTracker}>+ {S.trackers.add}</GhostButton>
        {trackers.length === 0 && (
          <p className="mt-1.5 text-xs text-slate-500">{S.trackers.hint}</p>
        )}
      </div>
    </Card>
  );
}

function TrackerEditor({
  tracker,
  save,
  onDeleted,
}: {
  tracker: Tracker;
  character: Character;
  save: TabProps["save"];
  onDeleted: (label: string, restore: () => void) => void;
}) {
  const cycleKind = () => {
    const order: Tracker["kind"][] = ["counter", "value", "roll"];
    const next = order[(order.indexOf(tracker.kind) + 1) % order.length]!;
    save((c) => {
      const target = c.trackers.find((t) => t.id === tracker.id);
      if (target) target.kind = next;
    });
  };

  return (
    <div className="flex shrink-0 gap-1">
      <GhostButton onClick={cycleKind}>{S.trackers.kinds[tracker.kind]?.[0] ?? "?"}</GhostButton>
      <GhostButton
        onClick={() => {
          const name = prompt(S.trackers.name, tracker.name);
          if (name === null) return;
          const max = prompt(S.trackers.max, tracker.max?.toString() ?? "");
          const formula =
            tracker.kind === "roll"
              ? prompt(S.trackers.formula, tracker.formula ?? "")
              : tracker.formula ?? null;
          save((c) => {
            const target = c.trackers.find((t) => t.id === tracker.id);
            if (!target) return;
            if (name.trim()) target.name = name.trim();
            const parsedMax = max === null || max.trim() === "" ? undefined : Number(max);
            target.max = parsedMax !== undefined && Number.isFinite(parsedMax) ? parsedMax : undefined;
            target.formula = formula && formula.trim() !== "" ? formula.trim() : undefined;
          });
        }}
      >
        ✎
      </GhostButton>
      <GhostButton
        danger
        onClick={() => {
          const snapshot = structuredClone(tracker);
          save((c) => void (c.trackers = c.trackers.filter((t) => t.id !== tracker.id)));
          onDeleted(tracker.name, () =>
            save((c) => {
              if (!c.trackers.some((t) => t.id === snapshot.id)) c.trackers.push(snapshot);
            }),
          );
        }}
      >
        ✕
      </GhostButton>
    </div>
  );
}
