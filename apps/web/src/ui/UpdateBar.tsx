import { useState } from "react";
import { S } from "../strings.js";
import {
  updateBarVisible,
  updateState,
  useUpdateStore,
  useVersionWatch,
} from "../lib/updateStore.js";

/**
 * „Neue Fassung ist da" — die Leiste, die den Browser-Dialog ersetzt.
 *
 * Sein Satz war „Es kommt kein Update", und der Dialog war einer von zwei Gründen:
 * er ging auf seinem iPhone nie auf (siehe `lib/swUpdate.ts`). Ein Dialog wäre
 * ohnehin falsch — bei den Teilgebieten hat er dazu schon alles gesagt: „Find ich ja
 * irgendwie sehr unprofessionell."
 *
 * Diese Leiste hängt im Layout und ist damit auf JEDER Seite. Sie trägt deshalb auch
 * die Prüfung (`useVersionWatch`): vorher hing die in der Versionsmarke, und die
 * steht nur auf der Startseite und in den Einstellungen — wer am Spieltisch auf einem
 * Bogen saß, bei dem prüfte niemand.
 *
 * Position wie `UndoBar`: fest über der Reiter-Leiste, und ab `md` NICHT mehr deren
 * Höhe einrechnen — dort ist sie `md:hidden`, und wer ihre Höhe trotzdem abzieht,
 * lässt das Band 64px über dem Rand schweben. Fünfte Anzeige-Falle in CLAUDE.md,
 * belegt durch sein iPad-Bild.
 */
export function UpdateBar() {
  useVersionWatch();
  const swWaiting = useUpdateStore((s) => s.swWaiting);
  const deployed = useUpdateStore((s) => s.deployed);
  const dismissedFor = useUpdateStore((s) => s.dismissedFor);
  const busy = useUpdateStore((s) => s.busy);
  const dismiss = useUpdateStore((s) => s.dismiss);
  const apply = useUpdateStore((s) => s.apply);
  const [showHint, setShowHint] = useState(false);

  if (!updateBarVisible({ swWaiting, deployed, dismissedFor })) return null;
  const state = updateState({ swWaiting, deployed });

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 rounded-lg border border-emerald-700 bg-emerald-950 px-3 py-2 shadow-lg shadow-black/50 md:inset-x-auto md:bottom-4 md:right-4 md:max-w-md"
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-xs text-emerald-100">
          <strong className="font-semibold">
            {state.kind === "bereit" ? S.update.ready : S.update.onServer}
          </strong>
          {state.kind === "server" && (
            <span className="ml-1 tabular-nums text-emerald-400/70">{state.commit}</span>
          )}
        </span>
        <button
          onClick={() => void apply()}
          disabled={busy}
          className="shrink-0 rounded border border-emerald-500 px-2 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/60 disabled:opacity-60"
        >
          {busy ? S.update.busy : S.update.apply}
        </button>
        {/*
          Was passiert, wenn ich drücke? Nicht dauerhaft ausgeschrieben (die Leiste
          soll klein bleiben), aber erreichbar — im Notfall wird der Zwischenspeicher
          geleert, und das gehört dazugesagt, bevor er drückt.
        */}
        <button
          onClick={() => setShowHint(!showHint)}
          aria-expanded={showHint}
          aria-label="Was passiert dabei?"
          className="shrink-0 px-1 text-emerald-400/70 hover:text-emerald-200"
        >
          ?
        </button>
        <button
          onClick={dismiss}
          aria-label={S.update.dismiss}
          className="shrink-0 px-1 text-emerald-400/70 hover:text-emerald-200"
        >
          ✕
        </button>
      </div>
      {showHint && (
        <p className="mt-1.5 text-[11px] leading-snug text-emerald-200/80">{S.update.hint}</p>
      )}
    </div>
  );
}
