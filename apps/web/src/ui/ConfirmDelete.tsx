import { useEffect, useRef, useState } from "react";
import { GhostButton } from "./bits.js";

/**
 * Löschen in zwei Schritten: ✕ fragt, der zweite Tap löscht.
 *
 * Sein Einwand war klar — „bei der Ausrüstung darf man nicht direkt irgendwas
 * raus löschen können, das muss man wirklich bestätigen". Zusammen mit dem
 * Bearbeiten-Modus und der Rückgängig-Meldung braucht ein Fehlgriff also drei
 * Dinge: Modus an, zweimal tippen, Meldung ignorieren.
 *
 * Kein Dialog: am Tisch will niemand ein Modal wegklicken, und die Frage steht
 * genau dort, wo der Finger schon ist.
 */
export function ConfirmDeleteButton(props: {
  /** Name für den Tooltip — „Greatsword entfernen". */
  label: string;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  // Die Frage verfällt von selbst. Sonst bleibt eine Zeile scharf gestellt und
  // der nächste Tap – Minuten später, anderes Thema – löscht.
  const arm = () => {
    setArmed(true);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setArmed(false), 5000);
  };

  if (!armed) {
    return (
      <GhostButton danger title={`${props.label} entfernen`} onClick={arm}>
        ✕
      </GhostButton>
    );
  }

  return (
    <button
      onClick={() => {
        setArmed(false);
        if (timer.current !== null) clearTimeout(timer.current);
        props.onConfirm();
      }}
      title={`${props.label} wirklich entfernen`}
      className="shrink-0 rounded-lg border border-red-500 bg-red-900/70 px-2 py-1 text-xs font-semibold text-red-100"
    >
      wirklich?
    </button>
  );
}
