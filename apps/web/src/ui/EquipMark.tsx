import type { EquipSlot } from "@codex35/core";
import { S } from "../strings.js";

/**
 * Die runde Marke links vom Gegenstand: A, 1H, OH, 2H, E — oder leer.
 *
 * Warum eine Marke und kein Knopf mit „Anlegen"/„Ablegen": aus dem Wort geht nur
 * hervor, OB etwas angelegt ist, nicht WO. Genau das braucht man aber, sobald
 * zwei Waffen und ein Schild im Spiel sind — und der Platz entscheidet über
 * Werte (Schild in der Schildhand, Langschwert beidhändig für den doppelten
 * Power-Attack-Schaden). In einer Spalte übereinander ist der Zustand des ganzen
 * Gepäcks außerdem mit einem Blick lesbar, statt Zeile für Zeile gelesen.
 */
export function EquipMark(props: {
  slot: EquipSlot;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const active = props.slot !== "none";
  const mark = S.sheet.equipMark[props.slot] ?? "?";
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled === true || props.onClick === undefined}
      aria-label={`${S.sheet.equipSlot[props.slot] ?? props.slot} — ${S.sheet.equipHint}`}
      title={S.sheet.equipSlot[props.slot] ?? props.slot}
      className={[
        // 44 px Tastfläche: am Tisch wird das mit einer Hand bedient.
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums transition-colors",
        active
          ? "border-amber-500/70 bg-amber-500/10 text-amber-300"
          : "border-slate-700 text-slate-600",
        props.onClick === undefined ? "" : "active:bg-amber-500/20",
      ].join(" ")}
    >
      {active ? mark : ""}
    </button>
  );
}
