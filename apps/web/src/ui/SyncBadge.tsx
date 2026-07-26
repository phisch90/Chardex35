import { Link } from "@tanstack/react-router";
import { useSyncStatus } from "../sync/SyncGate.js";

/**
 * Kleiner Hinweis am Rand, nur wenn es etwas zu sagen gibt: „gleicht ab" und
 * Fehler. Im Normalfall (fertig, alles gleich) bleibt der Bildschirm ruhig —
 * ein Sync, der ständig auf sich aufmerksam macht, ist ein schlechter Sync.
 */
export function SyncBadge() {
  const status = useSyncStatus();
  if (status.state === "off" || status.state === "idle") return null;

  const syncing = status.state === "syncing";
  return (
    <Link
      to="/einstellungen"
      className={`fixed right-3 z-40 bottom-[calc(4rem+env(safe-area-inset-bottom))] flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] shadow-lg backdrop-blur md:bottom-3 ${
        syncing
          ? "border-slate-600 bg-slate-900/90 text-slate-300"
          : "border-red-700 bg-red-950/90 text-red-200"
      }`}
    >
      <span className={syncing ? "animate-spin" : ""}>{syncing ? "⟳" : "⚠"}</span>
      {syncing ? "gleicht ab …" : "Abgleich fehlgeschlagen"}
    </Link>
  );
}
