import { useRef } from "react";
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
  /**
   * Langer Druck — seine Wahl auf die Frage, wie die zweite Hand erreichbar bleibt,
   * seit der Haende-Kasten weg ist.
   *
   * Der kurze Tipp legt an und verdraengt (der haeufige Fall: wechseln); der lange
   * Druck oeffnet die Plaetze einzeln. Ohne ihn koennte man einen Dolch nicht mehr
   * ausdruecklich in die Schildhand legen — und genau das hatte er sich einmal
   * ausdruecklich gewuenscht.
   */
  onLongPress?: () => void;
  disabled?: boolean;
}) {
  const active = props.slot !== "none";
  const mark = S.sheet.equipMark[props.slot] ?? "?";
  /*
    Der Timer, und daneben die Merkung, dass er ausgeloest HAT.

    Ohne die zweite Haelfte kommt nach dem langen Druck noch der Klick hinterher — die
    Marke wuerde also erst das Menue oeffnen und dann noch anlegen. Das ist die Sorte
    Nebenwirkung, die man am Tisch erst drei Runden spaeter bemerkt.
  */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const stop = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  return (
    <button
      type="button"
      onClick={() => {
        if (fired.current) {
          fired.current = false;
          return;
        }
        props.onClick?.();
      }}
      onPointerDown={() => {
        if (props.onLongPress === undefined) return;
        fired.current = false;
        stop();
        // 500 ms: lang genug, dass ein Tippen es nicht ausloest, kurz genug fuers Warten.
        timer.current = setTimeout(() => {
          fired.current = true;
          props.onLongPress?.();
        }, 500);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      /* Ohne das oeffnet iOS beim Halten das Auswahl-Menue ueber unserem. */
      onContextMenu={(e) => e.preventDefault()}
      style={props.onLongPress === undefined ? undefined : { touchAction: "manipulation" }}
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
