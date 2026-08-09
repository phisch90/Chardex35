import { useEffect, useRef, useState } from "react";

/**
 * „X wurde gelöscht — Rückgängig".
 *
 * Sein Einwand war doppelt: ein Tap auf ✕ löschte sofort, UND man sah hinterher
 * nicht, was weg war. Eine Rückfrage allein löst nur die erste Hälfte; deshalb
 * nennt die Meldung den Namen und nimmt die Löschung auf Wunsch zurück.
 *
 * Der Zustand liegt bewusst hier und nicht im Charakter: eine zurückgenommene
 * Löschung soll keine rev-Erhöhung und keinen Sync-Anstoß hinterlassen, wenn
 * sie nie wirksam war.
 */
export function useUndo<T>() {
  const [pending, setPending] = useState<{
    label: string;
    restore: () => void;
    verb?: string | undefined;
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  /**
   * Nach dem Löschen aufrufen: Name für die Meldung + wie man es zurückholt.
   *
   * `verb` nur, wenn es KEIN Löschen war — die Spellcraft-Buchung meldete sonst
   * „Spellcraft-Probe verbucht gelöscht": zwei Verben, von denen das zweite lügt.
   * Der Standard bleibt „gelöscht", weil das der Fall ist, für den die Leiste
   * gebaut wurde.
   */
  const offer = (label: string, restore: () => void, verb?: string) => {
    if (timer.current !== null) clearTimeout(timer.current);
    setPending({ label, restore, verb });
    timer.current = setTimeout(() => setPending(null), 12000);
  };

  const undo = () => {
    if (!pending) return;
    pending.restore();
    setPending(null);
    if (timer.current !== null) clearTimeout(timer.current);
  };

  const dismiss = () => setPending(null);

  return { pending, offer, undo, dismiss } as const;
}

export function UndoBar(props: {
  pending: { label: string; verb?: string | undefined } | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  if (!props.pending) return null;
  return (
    /*
      Fest über der Reiter-Leiste, nicht oben in der Karte: gelöscht wird mitten
      in einer langen Liste, und eine Meldung, zu der man erst hochscrollen muss,
      beantwortet die Frage „was war das gerade?“ nicht.
    */
    <div
      role="status"
      // 3,5rem für die Reiter-Leiste, sonst deckt die Meldung genau die Reiter ab, die man
      // als Nächstes braucht. Vorher 7rem — die zweite Hälfte war die Hauptnavigation, und
      // die sitzt jetzt oben (sein Auftrag). Ein Abstand für etwas, das dort nicht mehr
      // ist, lässt die Meldung schweben.
      className="fixed inset-x-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2 rounded-lg border border-amber-700 bg-amber-950 px-3 py-2 text-xs text-amber-100 shadow-lg shadow-black/50 md:inset-x-auto md:bottom-4 md:right-4 md:max-w-md"
    >
      <span className="min-w-0 flex-1">
        <strong className="font-semibold">{props.pending.label}</strong>{" "}
        {props.pending.verb ?? "gelöscht"}
      </span>
      <button
        onClick={props.onUndo}
        className="shrink-0 rounded border border-amber-600 px-2 py-1 font-semibold text-amber-200 hover:bg-amber-900/50"
      >
        Rückgängig
      </button>
      <button
        onClick={props.onDismiss}
        aria-label="Meldung schließen"
        className="shrink-0 px-1 text-amber-400/70 hover:text-amber-200"
      >
        ✕
      </button>
    </div>
  );
}
