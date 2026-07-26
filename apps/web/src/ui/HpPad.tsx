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
  onApply: (mode: "heal" | "temp" | "damage", amount: number) => void;
}) {
  const [input, setInput] = useState("");

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

  const apply = (mode: "heal" | "temp" | "damage") => {
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

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          disabled={!applicable}
          onClick={() => apply("heal")}
          className="rounded-lg bg-emerald-700 py-3 font-semibold text-white disabled:opacity-30"
        >
          {S.hpPad.heal}
        </button>
        <button
          disabled={!applicable}
          onClick={() => apply("temp")}
          className="rounded-lg bg-sky-700 py-3 font-semibold text-white disabled:opacity-30"
        >
          {S.hpPad.temp}
        </button>
        <button
          disabled={!applicable}
          onClick={() => apply("damage")}
          className="rounded-lg bg-red-800 py-3 font-semibold text-white disabled:opacity-30"
        >
          {S.hpPad.damage}
        </button>
      </div>
    </BottomSheet>
  );
}
