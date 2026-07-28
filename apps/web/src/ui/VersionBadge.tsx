import { useEffect, useState } from "react";
import { S } from "../strings.js";
import {
  RUNNING,
  compareVersions,
  fetchDeployedVersion,
  versionLabel,
  type VersionState,
} from "../lib/version.js";

/**
 * Die Versionsanzeige. Sie sagt nicht nur, WAS läuft, sondern auch, ob es der
 * veröffentlichte Stand ist — sonst müsste er die Nummer jedes Mal mit einer
 * Chat-Nachricht vergleichen.
 *
 * Drei Zustände, und der erste ist wichtig: solange keine Antwort vom Server
 * vorliegt (offline — am Spieltisch der Normalfall), steht nur die Nummer da.
 * Ein Häkchen ohne Prüfung wäre eine Lüge.
 *
 * `compact` für die Kopfzeile der Charakterliste: dort ist neben Titel und
 * „+ Neuer Charakter" nur Platz für die Nummer selbst — mit Datum daneben bricht
 * der Knopf auf zwei Zeilen. Das Datum steht in den Einstellungen.
 */
export function VersionBadge({ compact = false }: { compact?: boolean } = {}) {
  const [state, setState] = useState<VersionState>({ kind: "unbekannt", running: RUNNING });

  useEffect(() => {
    let alive = true;
    const check = () => {
      void fetchDeployedVersion().then((deployed) => {
        if (alive) setState(compareVersions(RUNNING, deployed));
      });
    };
    check();
    // Bei Rückkehr in den Vordergrund erneut — dann merkt er ein Update, ohne
    // die App zu schließen.
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (state.kind === "veraltet") {
    return (
      <button
        onClick={() => window.location.reload()}
        title={`Läuft: ${versionLabel(state.running)} — auf dem Server: ${versionLabel(state.deployed)}`}
        className="shrink-0 rounded-full border border-amber-500 bg-amber-600/20 px-2 py-0.5 text-[11px] font-medium text-amber-200"
      >
        {compact ? S.version.outdatedShort : S.version.outdated}
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
