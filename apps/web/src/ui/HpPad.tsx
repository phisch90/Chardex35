import { useState } from "react";
import { parseDice, rollDice } from "@codex35/core";
import { S } from "../strings.js";
import { cryptoRng } from "../lib/rng.js";
import { BottomSheet } from "./bits.js";

/**
 * Eingabefeld für TP-Änderungen nach dem Vorbild von Fight Club: Ziffernblock
 * mit Würfeltasten, danach ein Griff zu Heilen / Temporär / Schaden.
 * Würfelausdrücke werden vor dem Anwenden ausgewertet („2d6+3" → 11).
 */
export function HpPad(props: {
  open: boolean;
  onClose: () => void;
  onApply: (mode: "heal" | "temp" | "damage", amount: number, source: string) => void;
}) {
  const [input, setInput] = useState("");

  const append = (text: string) => setInput((prev) => prev + text);
  const clear = () => setInput("");
  const backspace = () => setInput((prev) => prev.slice(0, -1));

  /** Ergebnis der Eingabe: Zahl direkt, Würfelausdruck wird gerollt. */
  const evaluate = (): { amount: number; label: string } | null => {
    const text = input.trim();
    if (text === "") return null;
    const plain = Number(text);
    if (Number.isFinite(plain)) return { amount: Math.abs(Math.round(plain)), label: text };
    const expr = parseDice(text);
    if (!expr) return null;
    const result = rollDice(expr, cryptoRng);
    const rolled = result.rolls.flatMap((r) => r.values).join(", ");
    return { amount: Math.abs(result.total), label: `${text} = ${result.total} [${rolled}]` };
  };

  const apply = (mode: "heal" | "temp" | "damage") => {
    const result = evaluate();
    if (!result) return;
    props.onApply(mode, result.amount, result.label);
    clear();
    props.onClose();
  };

  const preview = evaluate();
  const valid = preview !== null;

  // Ziffernblock wie am Telefon; Korrekturtasten stehen daneben in eigener Spalte.
  const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "+", "0", "-"];

  return (
    <BottomSheet open={props.open} onClose={props.onClose} title={S.hpPad.title}>
      <div className="mb-2 min-h-12 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-right">
        <div className="font-mono text-xl">{input || "0"}</div>
        {input && !valid && <div className="text-xs text-red-400">{S.dice.invalid}</div>}
      </div>

      {/* Würfeltasten: Schaden am Tisch kommt selten als glatte Zahl. */}
      <div className="mb-2 grid grid-cols-6 gap-1">
        {["d4", "d6", "d8", "d10", "d12", "d20"].map((die) => (
          <button
            key={die}
            onClick={() => append(input === "" || /[+\-d]$/.test(input) ? `1${die}` : die)}
            className="rounded-lg border border-slate-600 bg-slate-800/60 py-2 font-mono text-xs active:bg-slate-700"
          >
            {die}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        <div className="grid flex-1 grid-cols-3 gap-1">
          {KEYS.map((key) => (
            <button
              key={key}
              onClick={() => append(key)}
              className="rounded-lg border border-slate-700 bg-slate-800 py-3 text-lg font-semibold active:bg-slate-700"
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex w-16 flex-col gap-1">
          <button
            onClick={backspace}
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800/60 active:bg-slate-700"
          >
            ⌫
          </button>
          <button
            onClick={clear}
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800/60 text-xs active:bg-slate-700"
          >
            C
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          disabled={!valid}
          onClick={() => apply("heal")}
          className="rounded-lg bg-emerald-700 py-3 font-semibold text-white disabled:opacity-30"
        >
          {S.hpPad.heal}
        </button>
        <button
          disabled={!valid}
          onClick={() => apply("temp")}
          className="rounded-lg bg-sky-700 py-3 font-semibold text-white disabled:opacity-30"
        >
          {S.hpPad.temp}
        </button>
        <button
          disabled={!valid}
          onClick={() => apply("damage")}
          className="rounded-lg bg-red-800 py-3 font-semibold text-white disabled:opacity-30"
        >
          {S.hpPad.damage}
        </button>
      </div>
      {preview && preview.label !== input && (
        <p className="mt-2 text-center text-xs text-slate-400">{preview.label}</p>
      )}
    </BottomSheet>
  );
}
