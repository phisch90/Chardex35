import { useState } from "react";
import {
  effectiveTrackerMax,
  parseDice,
  refillOf,
  resetToOf,
  rollDice,
  suggestTrackers,
  trackerMaxNote,
  categoryOf,
  TRACKER_CATEGORIES,
  TRACKER_REFILL_KINDS,
  type Character,
  type TrackerCategory,
  type TrackerRefillKind,
} from "@codex35/core";
import { S } from "../../strings.js";
import { Icon } from "../../ui/icons.js";
import { cryptoRng } from "../../lib/rng.js";
import { useAppSettings } from "../../lib/hooks.js";
import { useDiceStore } from "../../lib/diceStore.js";
import { Card, Chip, GhostButton, SectionTitle, inputClass } from "../../ui/bits.js";
import { UndoBar, useUndo } from "../../ui/UndoBar.js";
import { ConfirmDeleteButton } from "../../ui/ConfirmDelete.js";
import type { TabProps } from "./index.js";

type Tracker = Character["trackers"][number];

/**
 * Was das Formular anfasst — nicht mehr.
 *
 * `value`, `id` und `suggestedFrom` stehen bewusst NICHT drin: der Stand eines Zählers ist
 * Spielzustand und gehört an die ±-Knöpfe am Tisch, die Kennung gehört der App, und die
 * Herkunft ist eine Tatsache und keine Einstellung. Ein Formular, das alles anfassen darf,
 * lädt dazu ein, genau das kaputtzumachen.
 */
type TrackerDraft = Pick<Tracker, "name" | "kind"> &
  Partial<Pick<Tracker, "max" | "maxManual" | "formula" | "refill" | "resetTo" | "category">>;

/**
 * Freie Zähler für Hausregel-Mechaniken (Aktionspunkte, Untote vertreiben …).
 * Die App wertet nichts davon aus — sie führt nur Buch, so wie es am Tisch
 * gebraucht wird.
 */
export function TrackersCard({
  character,
  sheet,
  editMode,
  save,
  category,
}: Pick<TabProps, "character" | "sheet" | "editMode" | "save"> & {
  category: TrackerCategory;
}) {
  const { diceEnabled } = useAppSettings();
  const roll = useDiceStore((s) => s.roll);
  const undo = useUndo();
  /*
    Nur die Zähler DIESES Bereichs. Sein Befund war, dass alle auf der Werte-Seite
    standen: „Turn Undead ist ja was für die Kampf Seite. Actionpoint dann wieder
    nicht."
  */
  const trackers = character.trackers.filter((t) => categoryOf(t) === category);

  /*
    Was aus Klassen und Stufe folgt, muss niemand abtippen. Schon vorhandene
    Vorschläge fallen raus — auch wenn der Zähler umbenannt wurde.

    `taken` liest ALLE Zähler und nicht nur die dieses Bereichs: sonst würde ein
    Zähler, der im Kampf liegt, auf der Werte-Seite erneut vorgeschlagen — und man
    hätte ihn zweimal. Angeboten wird der Vorschlag dagegen nur in SEINEM Bereich.
  */
  const taken = new Set(
    character.trackers.map((t) => t.suggestedFrom ?? `name:${t.name.toLowerCase()}`),
  );
  const suggestions = suggestTrackers(sheet).filter(
    (s) =>
      (s.category ?? "general") === category &&
      !taken.has(s.key) &&
      !taken.has(`name:${s.name.toLowerCase()}`),
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

  /*
    Ein neuer Zähler entsteht mit ALLEN Optionen sichtbar — sein Auftrag: „bitte sofort
    haben, sobald ich ihn anlege, nicht einfach nur den Namen anlegen … Wer das nicht weiß,
    findet das niemals."

    Vorher war es ein `prompt()` für den Namen, und alles andere lag hinter einem ✎ am
    fertigen Zähler. `null` heißt „kein Formular offen"; ein Entwurf ist nötig, weil der
    Zähler noch nicht existiert und es nichts zum Durchschreiben gibt.

    Der Bereich ist vorbelegt mit DIESEM Reiter: ein neuer Zähler gehört dorthin, wo er
    entsteht — sonst legt man ihn im Kampf an und findet ihn bei den Werten wieder.
  */
  const [draft, setDraft] = useState<TrackerDraft | null>(null);
  const startDraft = () =>
    setDraft({ name: "", kind: "counter", category, maxManual: false });
  const commitDraft = () => {
    if (draft === null) return;
    const name = draft.name.trim();
    if (name === "") return;
    save((c) =>
      void c.trackers.push({
        ...draft,
        name,
        id: crypto.randomUUID(),
        /*
          `maxManual` ist im Zähler PFLICHT (das Schema hat dafür ein `.default`), im
          Entwurf aber nicht — also hier ausdrücklich. Genau diese Lücke hat `tsc`
          gefunden und kein Test: ein fehlender Standardwert am Literal ist die erste
          Fehlerfamilie dieses Projekts.
        */
        maxManual: draft.maxManual ?? false,
        /*
          Ein neuer Zähler startet VOLL, wenn er ein Maximum hat: eine neue Figur hat ihre
          Tagesfähigkeiten noch nicht verbraucht. Genau das war beim Assistenten schon
          einmal falsch („Untote vertreiben 0 von 3" an einem frischen Kleriker).
        */
        value: draft.kind === "counter" && draft.max !== undefined ? draft.max : 0,
      }),
    );
    setDraft(null);
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
                    <Icon name="dice" size={17} />
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
            {/*
              Der Optionen-Kasten für JEDE Art, nicht mehr nur für echte Zähler: die Art
              selbst steht darin, und wer einen festen Wert in einen Zähler umstellen will,
              muss den Kasten sehen können. Vorher lag der Umschalter oben in der Zeile als
              Knopf mit einem Buchstaben.
            */}
            {editMode && (
              <TrackerFields
                value={tracker}
                liveMax={maxOf(tracker)}
                suggestionMax={
                  suggestTrackers(sheet).find((v) => v.key === tracker.suggestedFrom)?.max
                }
                onChange={(patch) =>
                  mutate(tracker.id, (t) => {
                    // Durchschreiben, nicht zwischenspeichern (zweite Falle in CLAUDE.md).
                    Object.assign(t, patch);
                  })
                }
              />
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
                        /*
                          Die Bedingung dagegen SCHON — sie ist am Zähler eine
                          Eingabe, und ohne sie fiele er auf „kurze Pause" zurück.
                          Bei den Aktionspunkten wäre das die falsche Antwort auf
                          Martins Regel („Reset bei Stufenaufstieg").
                        */
                        ...(suggestion.refill === undefined
                          ? {}
                          : { refill: [...suggestion.refill] }),
                        // Und der Bereich, aus demselben Grund: der Vorschlag weiß,
                        // wohin sein Zähler gehört.
                        category: suggestion.category ?? "general",
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
        {draft === null ? (
          <GhostButton onClick={startDraft}>+ {S.trackers.add}</GhostButton>
        ) : (
          <div>
            <TrackerFields value={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} />
            <div className="mt-2 flex gap-2">
              {/*
                „Anlegen" bleibt gesperrt, solange kein Name dasteht — ein Zähler ohne Namen
                ist am Tisch nicht zu unterscheiden. Gesperrt und nicht stillschweigend
                wirkungslos: ein Knopf, der nichts tut, verspricht etwas.
              */}
              <GhostButton onClick={commitDraft} disabled={draft.name.trim() === ""}>
                {S.actions.create}
              </GhostButton>
              <GhostButton onClick={() => setDraft(null)}>{S.actions.cancel}</GhostButton>
            </div>
          </div>
        )}
        {/*
          Der Satz sagt, was in DIESEN Bereich gehört — er wirbt für den Knopf darüber und
          ist erledigt, sobald das Formular offen ist. Stehen bleibt er dort nicht bloß
          überflüssig: er rutscht unter „Anlegen / Abbrechen" und liest sich wie deren
          Erklärung. Genau das war beim Verteilen-Knopf im Punktekauf schon einmal der
          Fund, den nur der BLICK gebracht hat — ein Satz neben der falschen Sache ist
          schlimmer als keiner.
        */}
        {trackers.length === 0 && draft === null && (
          <p className="mt-1.5 text-xs text-slate-500">{S.trackers.hint[category]}</p>
        )}
      </div>
    </Card>
  );
}

/**
 * ALLE Optionen eines Zählers an einer Stelle — beim Anlegen und beim Bearbeiten dieselben.
 *
 * Sein Auftrag, wörtlich: „Wenn ich einen neuen Zähler anlege, dann möchte ich bitte ganz
 * klar direkt dort nicht nur über den einzelnen Buchstaben, also erst mal möchte ich die
 * kompletten Optionen, die ich dann bei dem Zähler habe, also wann er sich wieder auffüllt
 * et cetera et cetera, bitte sofort haben, sobald ich ihn anlege, nicht einfach nur den
 * Namen anlegen. Jetzt aktuell muss ich dann immer erst über Bearbeiten gehen und dann den
 * Zähler bearbeiten. Wer das nicht weiß, findet das niemals."
 *
 * Vorher war es dreierlei an drei Orten: ein `prompt()` für den Namen beim Anlegen, ein
 * Knopf mit EINEM BUCHSTABEN für die Art, und drei weitere `prompt()`-Dialoge hinter einem
 * ✎. Zusammen also ein Weg, den man kennen musste — und die App wusste ihn, ohne ihn zu
 * zeigen. Das ist die Fehlerfamilie „etwas weiß es, und etwas anderes kann es nicht", nur
 * in ihrer Bedienform.
 *
 * **Ein Bauteil für beide Fälle**, weil sonst die Hälfte der Felder beim Anlegen fehlt und
 * beim Bearbeiten eine andere Hälfte — genau der Zustand, aus dem er kommt. Der Unterschied
 * steckt nur im `onChange`:
 *
 * - **Bearbeiten:** jedes Feld schreibt SOFORT durch (`onChange` → `save`). Ein Feld, das
 *   seinen Wert in eine eigene Kopie zieht und erst beim Verlassen speichert, verliert
 *   Tippen — das steht als zweite Falle in CLAUDE.md.
 * - **Anlegen:** der Zähler existiert noch nicht, also führt der Aufrufer einen Entwurf im
 *   State und legt am Ende EINMAL an.
 */
function TrackerFields({
  value,
  onChange,
  /** Die wirkliche Grenze aus dem Vorschlag — nur beim Bearbeiten bekannt. */
  liveMax,
  suggestionMax,
}: {
  value: TrackerDraft;
  onChange: (patch: Partial<TrackerDraft>) => void;
  liveMax?: number | undefined;
  suggestionMax?: number | undefined;
}) {
  const active = refillOf(value);
  const toggleRefill = (kind: TrackerRefillKind) => {
    const next = new Set(active);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    /*
      „Lange Rast" abwählen, während „Kurze Pause" an ist, wäre ein Zustand, den es nicht
      gibt (`refillOf` folgert ihn ohnehin zurück). Dann geht die kurze Pause mit — sonst
      tippt er auf einen Knopf, und es passiert nichts.
    */
    if (kind === "long" && !next.has("long")) next.delete("short");
    onChange({ refill: TRACKER_REFILL_KINDS.filter((k) => next.has(k)) });
  };

  return (
    <div className="mt-1.5 space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-2">
      {/* Der Name als FELD und nicht als Dialog — durchschreibend, siehe oben. */}
      <label className="block">
        <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-slate-500">
          {S.trackers.name}
        </span>
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={S.trackers.namePlaceholder}
          className={inputClass}
        />
      </label>

      {/*
        Die ART als drei Knöpfe mit ihren ganzen Namen. Vorher ein Knopf, der durchschaltete
        und dabei „Z" zeigte — sein „komischer ZFW Button".
      */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {S.trackers.kindTitle}
        </span>
        {(["counter", "value", "roll"] as const).map((kind) => (
          <Chip key={kind} active={value.kind === kind} onClick={() => onChange({ kind })}>
            {S.trackers.kinds[kind] ?? kind}
          </Chip>
        ))}
      </div>
      <p className="text-[10px] leading-snug text-slate-500">
        {S.trackers.kindHints[value.kind] ?? ""}
      </p>

      {/* Das Maximum nur beim echten Zähler: ein fester Wert und ein Wurf haben keins. */}
      {value.kind === "counter" && (
        <label className="block">
          <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-slate-500">
            {S.trackers.max}
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={value.max ?? ""}
            placeholder={liveMax !== undefined ? String(liveMax) : S.trackers.maxFree}
            onChange={(e) => {
              const zahl = e.target.value.trim() === "" ? undefined : Number(e.target.value);
              const gültig = zahl !== undefined && Number.isFinite(zahl);
              /*
                Von Hand gesetzt heißt von Hand gesetzt: ab jetzt gewinnt der eigene Wert
                und der Zähler folgt dem Vorschlag nicht mehr. Leer geräumt bedeutet
                umgekehrt „wieder dem Vorschlag folgen" — deshalb wird `maxManual` hier
                mitgeschrieben und nicht geraten.
              */
              onChange({
                max: gültig ? zahl : undefined,
                maxManual: gültig && zahl !== suggestionMax,
              });
            }}
            className={inputClass}
          />
        </label>
      )}

      {/* Die Formel nur beim Wurf. */}
      {value.kind === "roll" && (
        <label className="block">
          <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-slate-500">
            {S.trackers.formula}
          </span>
          <input
            type="text"
            value={value.formula ?? ""}
            placeholder="1d6+2"
            onChange={(e) =>
              onChange({ formula: e.target.value.trim() === "" ? undefined : e.target.value })
            }
            className={inputClass}
          />
        </label>
      )}

      {/*
        Auffüllen und Richtung ebenfalls nur beim Zähler — ein fester Wert füllt sich
        nicht, und ein Würfelwurf hat nichts, was zurückgehen könnte.
      */}
      {value.kind === "counter" && (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              {S.trackers.refillTitle}
            </span>
            {TRACKER_REFILL_KINDS.map((kind) => (
              <Chip key={kind} active={active.has(kind)} onClick={() => toggleRefill(kind)}>
                {S.trackers.refillKinds[kind] ?? kind}
              </Chip>
            ))}
          </div>
          {active.has("short") && (
            <p className="text-[10px] leading-snug text-slate-500">
              {S.trackers.refillShortImplies}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              {S.trackers.resetToTitle}
            </span>
            <Chip active={resetToOf(value) === "max"} onClick={() => onChange({ resetTo: "max" })}>
              {S.trackers.resetToKinds["max"]}
            </Chip>
            <Chip
              active={resetToOf(value) === "zero"}
              onClick={() => onChange({ resetTo: "zero" })}
            >
              {S.trackers.resetToKinds["zero"]}
            </Chip>
          </div>
          <p className="text-[10px] leading-snug text-slate-500">{S.trackers.resetToHint}</p>
        </>
      )}

      {/* WO er steht — für jede Art, denn auch ein fester Wert gehört irgendwohin. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {S.trackers.categoryTitle}
        </span>
        {TRACKER_CATEGORIES.map((kind) => (
          <Chip
            key={kind}
            active={categoryOf(value) === kind}
            onClick={() => onChange({ category: kind })}
          >
            {S.trackers.categories[kind] ?? kind}
          </Chip>
        ))}
      </div>
      <p className="text-[10px] leading-snug text-slate-500">{S.trackers.categoryHint}</p>
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
  /*
    Hier standen zwei Dinge, die beide weg mussten — sein Wort dazu: „diese komische ZFW
    Button, das soll ausgeschrieben sein, dass son son Buttons nebeneinander sein und nicht
    einer mit am einen Buchstaben nur der dann wechselt, sondern das soll halt einfach
    komplett in den Optionen klar sein."

    1. Ein Knopf, der die ART durchschaltete und dabei nur DEREN ERSTEN BUCHSTABEN zeigte
       („Z" · „F" · „W"). Dasselbe Muster wie die ⟳-Schleife bei den Rast-Bedingungen, die
       aus demselben Grund schon einmal ersetzt wurde: bei drei Werten rät man, welcher als
       nächstes kommt.
    2. Ein ✎, das drei `prompt()`-Dialoge hintereinander aufmachte — die siebte Falle
       wörtlich: „ein `prompt()` ist keine Auswahl". Und ein Weg, den man kennen muss:
       „Wer das nicht weiß, findet das niemals."

    Beides steht jetzt ausgeschrieben im Optionen-Kasten unter dem Zähler
    (`TrackerFields`). Übrig bleibt hier das Löschen.
  */
  return (
    <div className="flex shrink-0 gap-1">
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
