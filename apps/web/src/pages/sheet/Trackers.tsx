import {
  effectiveTrackerMax,
  parseDice,
  refillOf,
  resetToOf,
  rollDice,
  suggestTrackers,
  trackerMaxNote,
  TRACKER_REFILL_KINDS,
  type Character,
  type TrackerRefillKind,
} from "@codex35/core";
import { S } from "../../strings.js";
import { cryptoRng } from "../../lib/rng.js";
import { useAppSettings } from "../../lib/hooks.js";
import { useDiceStore } from "../../lib/diceStore.js";
import { Card, Chip, GhostButton, SectionTitle } from "../../ui/bits.js";
import { UndoBar, useUndo } from "../../ui/UndoBar.js";
import { ConfirmDeleteButton } from "../../ui/ConfirmDelete.js";
import type { TabProps } from "./index.js";

type Tracker = Character["trackers"][number];

/**
 * Freie Zähler für Hausregel-Mechaniken (Aktionspunkte, Untote vertreiben …).
 * Die App wertet nichts davon aus — sie führt nur Buch, so wie es am Tisch
 * gebraucht wird.
 */
export function TrackersCard({ character, sheet, editMode, save }: TabProps) {
  const { diceEnabled } = useAppSettings();
  const roll = useDiceStore((s) => s.roll);
  const undo = useUndo();
  const trackers = character.trackers;

  // Was aus Klassen und Stufe folgt, muss niemand abtippen. Schon vorhandene
  // Vorschläge fallen raus — auch wenn der Zähler umbenannt wurde.
  const taken = new Set(trackers.map((t) => t.suggestedFrom ?? `name:${t.name.toLowerCase()}`));
  const suggestions = suggestTrackers(sheet).filter(
    (s) => !taken.has(s.key) && !taken.has(`name:${s.name.toLowerCase()}`),
  );

  /**
   * Die Grenze, die WIRKLICH gilt — aus dem Vorschlag, wenn der Zähler daraus
   * entstanden ist und niemand die Grenze angefasst hat.
   */
  const maxOf = (tracker: Tracker) => effectiveTrackerMax(tracker, sheet);

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
        maxManual: false,
      }),
    );
  };

  return (
    <Card>
      <SectionTitle>{S.trackers.title}</SectionTitle>

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
                    („3 + CHA-Modifikator …“) statt der nackten Art. */}
                {trackerMaxNote(tracker, sheet) ?? tracker.note ?? S.trackers.kinds[tracker.kind]}
                {tracker.kind === "roll" && tracker.formula ? ` · ${tracker.formula}` : ""}
                {maxOf(tracker) !== undefined ? ` · max. ${maxOf(tracker)}` : ""}
                {/*
                  Ob er bei der Rast mitkommt — und zwar IMMER dastehend, nicht nur
                  im Bearbeiten-Modus. Ein Zähler, der stillschweigend nicht
                  mitrastet, ist genau das, was ihn an „Aktionspunkte" gestört hat.
                  Nur bei echten Zählern: ein fester Wert und ein Würfelwurf füllen
                  sich ohnehin nicht.
                */}
                {tracker.kind === "counter" && ` · ${refillSentence(tracker)}`}
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
                  {maxOf(tracker) !== undefined && (
                    <span className="text-xs font-normal text-slate-500">/{maxOf(tracker)}</span>
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
                          const grenze = maxOf(tracker);
                          t.value = grenze !== undefined ? Math.min(grenze, t.value + 1) : t.value + 1;
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
            {/*
              Die Bedingungen als KNOPFREIHE, in eigener Zeile über den
              Editor-Knöpfen. Vorher war es ein ⟳, das drei Zustände durchtippte —
              ab drei rät man, welcher als nächstes kommt, und mehrere zugleich
              („lange Rast ODER Stufenaufstieg") gehen damit gar nicht.
            */}
            {editMode && tracker.kind === "counter" && (
              <RefillRow tracker={tracker} save={save} />
            )}

            {editMode && (
              <div className="mt-1.5 flex justify-end">
                <TrackerEditor
                  tracker={tracker}
                  character={character}
                  sheet={sheet}
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
                        // Kein `max` mitschreiben: der Zähler folgt dem
                        // Vorschlag, damit Stufenaufstiege und Talente wie Extra
                        // Turning weiterhin greifen.
                        maxManual: false,
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

/**
 * Wann füllt sich dieser Zähler, und worauf zurück?
 *
 * Geschrieben wird IMMER die ganze Menge, auch wenn sie derselben entspricht, die
 * `refillOf` ohnehin geraten hätte: ab dem ersten Tap ist es seine Entscheidung und
 * keine Ableitung mehr, und sie soll auch dann stehen bleiben, wenn der Zähler
 * später seinen Vorschlag verliert.
 */
function RefillRow({
  tracker,
  save,
}: {
  tracker: Tracker;
  save: TabProps["save"];
}) {
  const active = refillOf(tracker);
  const toggle = (kind: TrackerRefillKind) => {
    const next = new Set(active);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    /*
      „Lange Rast" abwählen, während „Kurze Pause" an ist, wäre ein Zustand, den es
      nicht gibt (`refillOf` folgert ihn ohnehin zurück). Dann geht die kurze Pause
      mit — sonst tippt er auf einen Knopf, und es passiert nichts.
    */
    if (kind === "long" && !next.has("long")) next.delete("short");
    save((c) => {
      const target = c.trackers.find((t) => t.id === tracker.id);
      if (target) target.refill = TRACKER_REFILL_KINDS.filter((k) => next.has(k));
    });
  };

  const to = resetToOf(tracker);
  const setTo = (value: "max" | "zero") =>
    save((c) => {
      const target = c.trackers.find((t) => t.id === tracker.id);
      if (target) target.resetTo = value;
    });

  return (
    <div className="mt-1.5 space-y-1 rounded-lg border border-slate-800 bg-slate-900/40 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {S.trackers.refillTitle}
        </span>
        {TRACKER_REFILL_KINDS.map((kind) => (
          <Chip key={kind} active={active.has(kind)} onClick={() => toggle(kind)}>
            {S.trackers.refillKinds[kind] ?? kind}
          </Chip>
        ))}
      </div>
      {active.has("short") && (
        <p className="text-[10px] leading-snug text-slate-500">{S.trackers.refillShortImplies}</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {S.trackers.resetToTitle}
        </span>
        <Chip active={to === "max"} onClick={() => setTo("max")}>
          {S.trackers.resetToKinds["max"]}
        </Chip>
        <Chip active={to === "zero"} onClick={() => setTo("zero")}>
          {S.trackers.resetToKinds["zero"]}
        </Chip>
      </div>
      <p className="text-[10px] leading-snug text-slate-500">{S.trackers.resetToHint}</p>
    </div>
  );
}

/** Der Satz unter dem Namen: was gilt, im Klartext statt als Zeichen. */
function refillSentence(tracker: Tracker): string {
  const active = refillOf(tracker);
  if (active.size === 0) return S.trackers.refillNone;
  return S.trackers.refillLine(
    TRACKER_REFILL_KINDS.filter((kind) => active.has(kind)).map(
      (kind) => S.trackers.refillKinds[kind] ?? kind,
    ),
  );
}

function TrackerEditor({
  tracker,
  sheet,
  save,
  onDeleted,
}: {
  tracker: Tracker;
  character: Character;
  sheet: TabProps["sheet"];
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
          const max = prompt(S.trackers.max, effectiveTrackerMax(tracker, sheet)?.toString() ?? "");
          const formula =
            tracker.kind === "roll"
              ? prompt(S.trackers.formula, tracker.formula ?? "")
              : tracker.formula ?? null;
          save((c) => {
            const target = c.trackers.find((t) => t.id === tracker.id);
            if (!target) return;
            if (name.trim()) target.name = name.trim();
            /*
              Von Hand gesetzt heißt von Hand gesetzt: ab jetzt gewinnt der eigene
              Wert und der Zähler folgt dem Vorschlag nicht mehr. Leer geräumt
              bedeutet umgekehrt „wieder dem Vorschlag folgen".
            */
            const parsedMax = max === null || max.trim() === "" ? undefined : Number(max);
            const gültig = parsedMax !== undefined && Number.isFinite(parsedMax);
            target.max = gültig ? parsedMax : undefined;
            const ausVorschlag = suggestTrackers(sheet).find(
              (v) => v.key === tracker.suggestedFrom,
            )?.max;
            target.maxManual = gültig && parsedMax !== ausVorschlag;
            target.formula = formula && formula.trim() !== "" ? formula.trim() : undefined;
          });
        }}
      >
        ✎
      </GhostButton>
      <ConfirmDeleteButton
        label={tracker.name}
        onConfirm={() => {
          const snapshot = structuredClone(tracker);
          save((c) => void (c.trackers = c.trackers.filter((t) => t.id !== tracker.id)));
          onDeleted(tracker.name, () =>
            save((c) => {
              if (!c.trackers.some((t) => t.id === snapshot.id)) c.trackers.push(snapshot);
            }),
          );
        }}
      />
    </div>
  );
}
