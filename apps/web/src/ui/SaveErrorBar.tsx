import { useEffect } from "react";
import { S } from "../strings.js";
import { useSaveErrorStore } from "../lib/saveError.js";

/**
 * „Nicht gespeichert" — sichtbar, mit einem Weg zurück.
 *
 * Sie hängt im Layout und ist damit auf JEDER Seite: ein Schreibvorgang kann von
 * überall kommen (Bogen, Startseite, Kompendium, Stufenaufstieg), und eine Meldung,
 * die nur der Bogen zeigt, fehlt genau dort, wo man sie zuerst braucht.
 *
 * Position: OBEN am Handy, nicht unten. Zwei Gründe, und keiner ist Geschmack.
 * Erstens sitzen unten schon drei Bänder (Rücknahme, Abgleich-Marke, neue Fassung)
 * plus die Reiterleiste des Bogens — ein viertes wäre ein Stapel, und das
 * Wichtigste stünde zufällig irgendwo darin. Zweitens ist das hier eine WARNUNG und
 * kein Hinweis: sie darf im Weg sein.
 *
 * Und damit gilt die fünfte Falle in ihrer üblichen Form: der Abstand rechnet die
 * Hauptnavigation ein, die am Handy oben steht und ab `md` NICHT mehr (dort ist sie
 * die Seitenleiste links). Wer das vergisst, lässt das Band auf dem iPad 3,5rem vom
 * Rand weg schweben.
 *
 * Die Farbe ist `rose` — die Warnfarbe dieser App, nicht die Bedienfarbe Amber und
 * nicht `red` (das ist Gefahr, also Löschen). Elfte Falle: eine Farbe, die alles
 * bedeutet, bedeutet nichts.
 */
export function SaveErrorBar() {
  const failure = useSaveErrorStore((s) => s.failure);
  const busy = useSaveErrorStore((s) => s.busy);
  const fixed = useSaveErrorStore((s) => s.fixed);
  const retry = useSaveErrorStore((s) => s.retry);
  const dismiss = useSaveErrorStore((s) => s.dismiss);

  /*
    „Gespeichert." verschwindet von allein. Die FEHLERmeldung nie — die bleibt, bis
    er sie wegtippt oder der zweite Versuch klappt. Ein Fehler, der nach vier
    Sekunden weg ist, ist ein Fehler, den er verpasst hat, wenn er gerade würfelt.
  */
  useEffect(() => {
    if (!fixed) return;
    const timer = setTimeout(dismiss, 2500);
    return () => clearTimeout(timer);
  }, [fixed, dismiss]);

  if (fixed) {
    return (
      <div
        role="status"
        className="fixed inset-x-3 top-[calc(4rem+env(safe-area-inset-top))] z-40 rounded-lg border border-emerald-700 bg-emerald-950 px-3 py-2 text-xs text-emerald-100 shadow-lg shadow-black/50 md:inset-x-auto md:right-4 md:top-4 md:max-w-md"
      >
        {S.saveError.fixed}
      </div>
    );
  }

  if (failure === null) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-3 top-[calc(4rem+env(safe-area-inset-top))] z-40 rounded-lg border border-rose-700 bg-rose-950 px-3 py-2 shadow-lg shadow-black/50 md:inset-x-auto md:right-4 md:top-4 md:max-w-md"
    >
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <strong className="block text-xs font-semibold text-rose-100">
            {S.saveError.title(failure.what)}
          </strong>
          <span className="mt-0.5 block text-[11px] leading-snug text-rose-200/90">
            {failure.why}
          </span>
        </span>
        <button
          onClick={dismiss}
          aria-label={S.saveError.dismiss}
          className="shrink-0 px-1 text-rose-400/80 hover:text-rose-100"
        >
          ✕
        </button>
      </div>
      <div className="mt-1.5">
        <button
          onClick={() => void retry()}
          disabled={busy}
          className="rounded border border-rose-500 px-2 py-1 text-xs font-semibold text-rose-100 hover:bg-rose-900/60 disabled:opacity-60"
        >
          {busy ? S.saveError.busy : S.saveError.retry}
        </button>
      </div>
    </div>
  );
}
