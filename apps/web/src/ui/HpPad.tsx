import { useState } from "react";
import { HP_PAD_OPERATORS, evaluateArithmetic, hpAmount, pressKey } from "@codex35/core";
import { S } from "../strings.js";
import { BottomSheet } from "./bits.js";

/**
 * Eingabefeld für TP-Änderungen nach dem Vorbild von Fight Club: ein echter
 * Taschenrechner mit `÷ × − +`, Klammern und Rückschritt, darunter der Griff zu
 * Heilen / Temporär / Schaden. Bewusst OHNE Würfel — gewürfelt wird am Tisch,
 * hier wird nur gerechnet („2(4+5)" → 18, „7÷2" → 3, „6−10" → 0).
 */

/** Der gerechnete Wert für die Vorschau — 7,5 statt 7,499999 und ohne Trenner. */
function formatExact(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const text = rounded.toLocaleString("de-DE", { maximumFractionDigits: 2, useGrouping: false });
  // „≈", wenn die Anzeige selbst schon rundet — sonst behauptet der Hinweis
  // einen exakten Wert, der keiner ist (13÷3 = 4,333333…).
  return rounded === value ? text : `≈${text}`;
}

export function HpPad(props: {
  open: boolean;
  onClose: () => void;
  onApply: (mode: "heal" | "temp" | "damage" | "nonlethal", amount: number) => void;
  /** Aktueller Stand, damit man beim Rechnen sieht, worauf es sich auswirkt. */
  hp: { current: number; max: number; damage: number; temp: number; nonlethal: number };
  /** Was die Engine aus Stufen, KO und Effekten errechnet. */
  computedMax: number;
  /** Gesetzt = fest eingetragenes Maximum, sonst wird gerechnet. */
  overrideMax: number | undefined;
  /** `null` gibt die Rechnung wieder frei. */
  onSetMax: (value: number | null) => void;
  /**
   * Der gerechnete Sterbe-Zustand samt seinem Satz — fehlt, wo es ihn nicht gibt
   * (Gruppenansicht, Vergleich). Der Text kommt von außen, damit die Regel nicht an
   * zwei Stellen in Worte gefasst wird.
   */
  dying?:
    | {
        state: string;
        text: string;
        stabilized: boolean;
        onToggleStabilized: () => void;
      }
    | undefined;
}) {
  const [input, setInput] = useState("");
  const [maxDraft, setMaxDraft] = useState<string | null>(null);

  const press = (key: string) => setInput((prev) => pressKey(prev, key));
  const canPress = (key: string) => pressKey(input, key) !== input;
  const clear = () => setInput("");
  const backspace = () => setInput((prev) => prev.slice(0, -1));

  /**
   * Beim Schließen leeren. Der Pad wird nie ausgehängt (BottomSheet gibt nur
   * `null` zurück), sonst hinge ein abgebrochenes „99" beim nächsten Öffnen als
   * Präfix am neuen Betrag — aus einer 3 würden 993 Schaden.
   */
  const close = () => {
    clear();
    setMaxDraft(null);
    props.onClose();
  };

  const result = evaluateArithmetic(input);
  const amount = result.ok ? hpAmount(result.value) : 0;
  /** Nur ein Betrag über 0 ändert etwas — sonst nicht anwendbar. */
  const applicable = result.ok && amount > 0;
  /** Nur zeigen, wenn gerechnet wurde — bei „12" wäre „= 12" nur Lärm. */
  const showResult = result.ok && String(result.value) !== input.trim();
  /**
   * Warum das Ergebnis vom gerechneten Wert abweicht. Der Vergleich läuft gegen
   * den TP-Betrag, nicht gegen `Number.isInteger`: `61÷7×7` ist als
   * Fließkommazahl 60.99999999999999 und trotzdem ein glatter Wert.
   */
  const note: "negative" | "rounded" | null = !result.ok
    ? null
    : result.value < 0
      ? "negative"
      : Math.abs(result.value - amount) > 1e-9
        ? "rounded"
        : null;

  const apply = (mode: "heal" | "temp" | "damage" | "nonlethal") => {
    if (!applicable) return;
    props.onApply(mode, amount);
    close();
  };

  const errorText = result.ok ? "" : (S.hpPad.errors[result.reason] ?? "");

  return (
    <BottomSheet open={props.open} onClose={close} title={S.hpPad.title}>
      {/*
        Anzeige als Feld, nicht als Knopf: ein Tap auf die größte Fläche im
        Sheet darf nicht die ganze Eingabe löschen. `aria-live` liest Ergebnis
        und Fehler vor — als Knopf mit aria-label war der Inhalt für
        Screenreader unsichtbar.
      */}
      {/*
        Der Stand steht im Rechner, nicht in einer eigenen Karte weiter unten:
        Schaden, temporäre und nichttödliche TP sowie das Maximum gehören an
        die EINE Stelle, an der man TP anfasst.
      */}
      <div className="mb-2 space-y-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs">
        <div className="flex items-baseline justify-between">
          <span className="text-slate-400">Stand</span>
          <span className="font-mono text-base font-bold text-slate-100">
            {props.hp.current}/{props.hp.max}
            {props.hp.temp > 0 && <span className="text-sky-300"> +{props.hp.temp}</span>}
          </span>
        </div>
        <div className="flex items-baseline justify-between text-slate-500">
          <span>
            Schaden {props.hp.damage}
            {props.hp.nonlethal > 0 && ` · nichttödlich ${props.hp.nonlethal}`}
          </span>
          {(props.hp.damage > 0 || props.hp.nonlethal > 0 || props.hp.temp > 0) && (
            <button
              onClick={() => {
                props.onApply("heal", props.hp.damage + props.hp.nonlethal);
                close();
              }}
              className="text-emerald-400 underline decoration-dotted"
            >
              alles heilen
            </button>
          )}
        </div>
        {/*
          Unter 0: der Zustand und die zwei Handgriffe, die die Regel dann hergibt.

          Sie stehen HIER, weil das die Stelle ist, an der der Schaden eingetippt wird —
          wer gerade „12" gedrückt hat und unter 0 landet, braucht sie im selben Blick.
          Automatisch kann die App das „1 TP pro Runde" nicht: sie weiß nicht, wann eine
          Runde vergeht. Also ein Knopf, der genau einen Schritt tut.
        */}
        {props.dying !== undefined && props.dying.state !== "ok" && (
          <div className="space-y-1.5 border-t border-slate-800 pt-1.5">
            <p className="leading-snug text-rose-200">{props.dying.text}</p>
            {props.dying.state !== "dead" && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={props.dying.onToggleStabilized}
                  className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${
                    props.dying.stabilized
                      ? "border-emerald-700 bg-emerald-950/50 text-emerald-200"
                      : "border-slate-600 text-slate-300"
                  }`}
                >
                  {props.dying.stabilized ? S.dying.stabilizedOn : S.dying.stabilizedOff}
                </button>
                {props.dying.state === "bleeding" && (
                  <button
                    onClick={() => props.onApply("damage", 1)}
                    className="rounded-lg border border-rose-700/70 px-2 py-1 text-[11px] font-medium text-rose-200"
                  >
                    {S.dying.roundOn}
                  </button>
                )}
              </div>
            )}
            <p className="text-[10px] leading-snug text-slate-500">{S.dying.stabilizedHint}</p>
          </div>
        )}
        <div className="flex items-center gap-2 border-t border-slate-800 pt-1.5">
          <span className="shrink-0 text-slate-400">Maximum</span>
          <input
            aria-label="Maximale Trefferpunkte"
            type="number"
            min={1}
            inputMode="numeric"
            value={maxDraft ?? String(props.hp.max)}
            onChange={(e) => setMaxDraft(e.target.value)}
            onBlur={() => {
              if (maxDraft === null) return;
              const parsed = Number.parseInt(maxDraft, 10);
              // Wer genau die gerechnete Zahl eintippt, will kein festes
              // Maximum — sonst friert der Wert beim nächsten Stufenaufstieg ein.
              if (Number.isFinite(parsed) && parsed > 0) {
                props.onSetMax(parsed === props.computedMax ? null : parsed);
              }
              setMaxDraft(null);
            }}
            className="w-20 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-right font-mono text-sm"
          />
          {props.overrideMax !== undefined && (
            <span className="text-[11px] text-amber-400/80">
              fest eingetragen — Stufenaufstiege ändern nichts
            </span>
          )}
        </div>
        {/* Eigene Zeile, sonst schneidet das Handy den Satz ab. Der berechnete
            Wert steht mit seiner ZAHL da — wer zurück will, sieht vorher, was
            er bekommt. Kein blinder Umschalter. */}
        {props.overrideMax !== undefined && props.overrideMax !== props.computedMax && (
          <button
            onClick={() => props.onSetMax(null)}
            className="block w-full text-left text-[11px] text-slate-500 underline decoration-dotted hover:text-amber-300"
          >
            nach Stufen &amp; KO wären es {props.computedMax} — darauf zurücksetzen
          </button>
        )}
      </div>

      <div className="mb-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
        <div className="flex items-end justify-between gap-2">
          <button
            onClick={clear}
            disabled={input === ""}
            className="shrink-0 rounded px-1 py-0.5 text-xs text-slate-500 underline decoration-dotted active:text-slate-300 disabled:invisible"
          >
            {S.hpPad.clear}
          </button>
          <div className="min-w-0 flex-1 truncate text-right font-mono text-2xl leading-tight">
            {input || "0"}
          </div>
        </div>
        <div className="min-h-4 text-right text-xs" aria-live="polite">
          {errorText !== "" ? (
            <span className="text-red-400">{errorText}</span>
          ) : showResult && result.ok ? (
            <span className="text-slate-400">
              = {amount}
              {note === "rounded" && (
                <span className="ml-1 text-slate-500">
                  ({S.hpPad.rounded(formatExact(result.value))})
                </span>
              )}
              {note === "negative" && (
                <span className="ml-1 text-slate-500">({S.hpPad.negative})</span>
              )}
            </span>
          ) : null}
        </div>
      </div>

      {/*
        Feste Höhen, damit beide Spalten unten bündig enden UND jede Taste über
        der Daumen-Grenze von 44px bleibt: 4 Ziffernreihen à 56px + 3×4px Lücke
        = 236px; davon gehen 44px Rückschritt und 4 Lücken ab, bleiben 44px je
        Operator. Mit `py-*` statt `h-*` rutschten die Operatoren auf 42px.
      */}
      <div className="flex gap-1">
        {/* Ziffern und Klammern wie am Telefon: 7-8-9 / 4-5-6 / 1-2-3 / 0-(-) */}
        <div className="grid flex-1 grid-cols-3 gap-1">
          {["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "(", ")"].map((key) => (
            <button
              key={key}
              onClick={() => press(key)}
              disabled={!canPress(key)}
              className="h-14 rounded-lg border border-slate-700 bg-slate-800 text-xl font-semibold active:bg-slate-700 disabled:opacity-30"
            >
              {key}
            </button>
          ))}
        </div>

        {/* Rechenspalte: Rückschritt oben, darunter ÷ × − + */}
        <div className="flex w-16 flex-col gap-1">
          <button
            onClick={backspace}
            disabled={input === ""}
            aria-label={S.hpPad.backspace}
            className="h-11 shrink-0 rounded-lg border border-red-800 bg-red-950/60 text-red-300 active:bg-red-900 disabled:opacity-40"
          >
            ⌫
          </button>
          {HP_PAD_OPERATORS.map((op) => (
            <button
              key={op}
              onClick={() => press(op)}
              disabled={!canPress(op)}
              className="min-h-11 flex-1 rounded-lg border border-amber-800/70 bg-amber-950/40 text-xl font-semibold text-amber-200 active:bg-amber-900/60 disabled:opacity-30"
            >
              {op}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <button
          disabled={!applicable}
          onClick={() => apply("heal")}
          className="rounded-lg bg-emerald-700 py-3 text-sm font-semibold text-white disabled:opacity-30"
        >
          {S.hpPad.heal}
        </button>
        <button
          disabled={!applicable}
          onClick={() => apply("temp")}
          className="rounded-lg bg-sky-700 py-3 text-sm font-semibold text-white disabled:opacity-30"
        >
          {S.hpPad.temp}
        </button>
        <button
          disabled={!applicable}
          onClick={() => apply("damage")}
          className="rounded-lg bg-red-800 py-3 text-sm font-semibold text-white disabled:opacity-30"
        >
          {S.hpPad.damage}
        </button>
        <button
          disabled={!applicable}
          onClick={() => apply("nonlethal")}
          className="rounded-lg bg-amber-800 py-3 text-sm font-semibold text-white disabled:opacity-30"
        >
          {S.hpPad.nonlethal}
        </button>
      </div>
    </BottomSheet>
  );
}
