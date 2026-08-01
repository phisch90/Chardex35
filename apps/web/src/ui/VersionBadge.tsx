import { S } from "../strings.js";
import { RUNNING, compareVersions, versionLabel } from "../lib/version.js";
import { useUpdateStore } from "../lib/updateStore.js";

/**
 * Die Versionsanzeige. Sie sagt nicht nur, WAS läuft, sondern auch, ob es der
 * veröffentlichte Stand ist — sonst müsste er die Nummer jedes Mal mit einer
 * Chat-Nachricht vergleichen.
 *
 * Drei Zustände, und der erste ist wichtig: solange keine Antwort vom Server
 * vorliegt (offline — am Spieltisch der Normalfall), steht nur die Nummer da.
 * Ein Häkchen ohne Prüfung wäre eine Lüge.
 *
 * Zwei Dinge haben sich geändert, beide wegen „Es kommt kein Update":
 *
 * 1. Sie FRAGT nicht mehr selbst. Die Prüfung hängt jetzt an der Leiste im Layout
 *    und läuft damit auf jeder Seite (`useVersionWatch`) — vorher lief sie nur hier,
 *    also nur auf der Startseite und in den Einstellungen. Wer am Spieltisch auf
 *    einem Bogen saß, bei dem prüfte niemand.
 * 2. Ihr Knopf lädt nicht mehr neu. Der Service Worker beantwortet jede Navigation
 *    aus dem Cache (`NavigationRoute` auf die einbetonierte `index.html`); ein
 *    Neuladen brachte genau die alte App zurück. Der Knopf konnte nie halten, was
 *    die Marke daneben versprach. Jetzt geht er die Leiter in `lib/swUpdate.ts`.
 *
 * `compact` für die Kopfzeile der Charakterliste: dort ist neben Titel und
 * „+ Neuer Charakter" nur Platz für die Nummer selbst — mit Datum daneben bricht
 * der Knopf auf zwei Zeilen. Das Datum steht in den Einstellungen.
 */
export function VersionBadge({ compact = false }: { compact?: boolean } = {}) {
  const deployed = useUpdateStore((s) => s.deployed);
  const busy = useUpdateStore((s) => s.busy);
  const apply = useUpdateStore((s) => s.apply);
  const state = compareVersions(RUNNING, deployed);

  if (state.kind === "veraltet") {
    return (
      <button
        onClick={() => void apply()}
        disabled={busy}
        title={`Läuft: ${versionLabel(state.running)} — auf dem Server: ${versionLabel(state.deployed)}`}
        className="shrink-0 rounded-full border border-amber-500 bg-amber-600/20 px-2 py-0.5 text-[11px] font-medium text-amber-200 disabled:opacity-60"
      >
        {busy ? S.update.busy : compact ? S.version.outdatedShort : S.version.outdated}
      </button>
    );
  }

  return (
    <span
      title={state.kind === "aktuell" ? S.version.currentHint : S.version.unknownHint}
      className="shrink-0 text-[11px] tabular-nums text-slate-500"
    >
      {state.kind === "aktuell" ? "✓ " : ""}
      {compact ? state.running.commit : versionLabel(state.running)}
    </span>
  );
}
