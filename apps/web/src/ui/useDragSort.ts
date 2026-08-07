import { useRef, useState } from "react";

/**
 * Ziehen zum Umsortieren — mit einem ANFASSER, nicht mit der ganzen Zeile.
 *
 * Sein Wort dazu: „Umsortieren per Ziehen, gerne." Gebaut war es vorher mit ↑↓-Knöpfen,
 * und der Grund dafür gilt weiter und ist genau der Grund für den Anfasser: dieser Bogen
 * benutzt die Wischgeste schon zweimal — waagerecht zum Reiterwechsel und senkrecht zum
 * Scrollen im `main` mit `overflow-y-auto`. Wer die ganze ZEILE ziehbar macht, muss sich
 * gegen beides durchsetzen, und heraus kommt eine Liste, die manchmal scrollt, manchmal
 * den Reiter wechselt und manchmal sortiert.
 *
 * Der Anfasser trennt die Geste an der Wurzel: nur DORT steht `touch-action: none`, und
 * nur dort beginnt ein Zug. Überall sonst in der Zeile bleibt Scrollen und Wischen genau
 * wie vorher.
 *
 * Warum von Hand und ohne Bibliothek: Pointer Events können das, was hier gebraucht wird,
 * vollständig — ein `setPointerCapture` am Anfasser liefert alle Bewegungen auch dann,
 * wenn der Finger die Zeile verlässt, und `elementFromPoint` sagt, über welcher Zeile er
 * gerade steht. Eine Bibliothek wäre ein Paket mehr im Bündel für dieselbe Handvoll
 * Zeilen — und die App ist offline-first, jedes Kilobyte liegt auf seinem Handy.
 *
 * ## Die zwei Entscheidungen, die im Verhalten stecken
 *
 * **Vorschau lokal, Schreiben einmal am Ende.** Während des Zugs steht die Reihenfolge in
 * `preview` und nicht in der Datenbank: ein Zug über fünf Zeilen wären sonst fünf
 * Schreibvorgänge, fünf `rev`-Erhöhungen und fünf Abgleich-Einträge. Beim Loslassen wird
 * genau einmal geschrieben — und nur, wenn sich wirklich etwas geändert hat.
 *
 * **Nur unter Geschwistern.** Welche Zeilen infrage kommen, entscheidet der Aufrufer
 * (`ids`): im Gepäck sind das die Zeilen desselben Behälters. Ohne diese Grenze schiebt
 * ein Zug die Zeile aus ihrem Rucksack heraus, und das sieht wie ein Fehler aus.
 */
export interface DragSort {
  /** Die Reihenfolge, die die Liste RENDERN soll — während des Zugs die Vorschau. */
  order: string[];
  /** Die Kennung, die gerade am Finger hängt — für die Hervorhebung. */
  dragging: string | null;
  /** An den Anfasser hängen. Alles andere in der Zeile bleibt unberührt. */
  handleProps: (id: string) => {
    onPointerDown: (event: React.PointerEvent) => void;
    onPointerMove: (event: React.PointerEvent) => void;
    onPointerUp: (event: React.PointerEvent) => void;
    onPointerCancel: (event: React.PointerEvent) => void;
    style: { touchAction: "none" };
  };
}

/**
 * @param ids Die Kennungen in ihrer gespeicherten Reihenfolge (nur Geschwister).
 * @param onDrop Wird EINMAL beim Loslassen gerufen, mit der neuen Reihenfolge.
 * @param attr Das Datenattribut, an dem eine Zeile ihre Kennung trägt.
 */
export function useDragSort(
  ids: string[],
  onDrop: (order: string[]) => void,
  opts: {
    /** Das Datenattribut, an dem eine Zeile ihre Kennung trägt. */
    attr?: string;
    /**
     * Dürfen diese zwei Zeilen die Plätze tauschen?
     *
     * Der Hook bekommt ABSICHTLICH alle Kennungen der Liste und nicht eine je Gruppe:
     * Hooks dürfen nicht in einer Schleife stehen, und ein Gepäck mit drei Behältern
     * hätte vier Aufrufe gebraucht. Die Gruppengrenze steckt deshalb hier — im Gepäck
     * heißt sie „gleicher Behälter, und beide abgelegt".
     */
    canSwap?: (a: string, b: string) => boolean;
  } = {},
): DragSort {
  const attr = opts.attr ?? "data-drag-id";
  const [dragging, setDragging] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[] | null>(null);
  /*
    Die Reihenfolge liegt WÄHREND des Zugs auch in einem Ref, nicht nur im State: der
    nächste `pointermove` kommt, bevor React neu gerendert hat, und würde sonst auf einer
    veralteten Liste rechnen. Das Ergebnis wäre ein Zug, der bei schneller Bewegung
    Zeilen überspringt.
  */
  const live = useRef<string[]>([]);

  const handleProps = (id: string) => ({
    onPointerDown: (event: React.PointerEvent) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      live.current = [...ids];
      setPreview([...ids]);
      setDragging(id);
    },
    onPointerMove: (event: React.PointerEvent) => {
      if (dragging === null) return;
      /*
        Über welcher Zeile steht der Finger? Gefragt wird der Browser
        (`elementFromPoint`) und nicht eine gemerkte Liste von Rechtecken: die Zeilen
        ändern ihre Höhe während des Zugs (die Vorschau verschiebt sie), und gemerkte
        Rechtecke wären ab der ersten Bewegung falsch.

        `pointer-events: none` am gezogenen Element wäre der Trick, um sich selbst nicht
        zu treffen — er ist hier nicht nötig, weil ein Treffer auf die eigene Zeile
        ohnehin nichts verschiebt.
      */
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const row = under?.closest(`[${attr}]`);
      const overId = row?.getAttribute(attr);
      if (overId === null || overId === undefined || overId === dragging) return;
      if (opts.canSwap !== undefined && !opts.canSwap(dragging, overId)) return;

      const current = live.current;
      const from = current.indexOf(dragging);
      const to = current.indexOf(overId);
      if (from < 0 || to < 0 || from === to) return;

      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, dragging);
      live.current = next;
      setPreview(next);
    },
    onPointerUp: () => {
      if (dragging === null) return;
      const next = live.current;
      setDragging(null);
      setPreview(null);
      // Nur schreiben, wenn sich wirklich etwas geändert hat: ein Tap auf den Anfasser
      // ist kein Zug und darf keine Änderung am Bogen erzeugen.
      if (next.length === ids.length && next.some((value, index) => value !== ids[index])) {
        onDrop(next);
      }
    },
    onPointerCancel: () => {
      // Abgebrochen heißt abgebrochen: die Vorschau fällt weg, gespeichert wird nichts.
      setDragging(null);
      setPreview(null);
    },
    style: { touchAction: "none" as const },
  });

  return { order: preview ?? ids, dragging, handleProps };
}
