import { Link } from "@tanstack/react-router";
import { useSyncStatus } from "../sync/SyncGate.js";

/**
 * Kleiner Hinweis am Rand, nur wenn es etwas zu sagen gibt: „gleicht ab" und
 * Fehler. Im Normalfall (fertig, alles gleich) bleibt der Bildschirm ruhig —
 * ein Sync, der ständig auf sich aufmerksam macht, ist ein schlechter Sync.
 *
 * Seit der Abgleich nur beim Start läuft (`sync/SyncGate.tsx`, `MID_SESSION_SYNC`),
 * erscheint die Marke praktisch nur dort — das „gleicht ab …" mitten im Kampf ist weg.
 * Dafür ändert sich die Bedeutung des roten Falls: es versucht es KEINER mehr von allein.
 * Deshalb steht jetzt dabei, was zu tun ist, statt nur dass etwas schiefging — eine
 * Meldung, die einen Zustand nennt und den Weg heraus verschweigt, ist in diesem Projekt
 * schon einmal teuer geworden.
 */
export function SyncBadge() {
  const status = useSyncStatus();
  if (status.state === "off" || status.state === "idle") return null;

  const syncing = status.state === "syncing";
  return (
    <Link
      to="/einstellungen"
      /*
        3,5rem für die Reiter-Leiste des Bogens — derselbe Wert wie bei `UndoBar.tsx`, und
        aus demselben Grund: liegt die Marke GENAU auf den Reitern, öffnet ein Tap auf
        „Talente" die Einstellungen, denn sie ist ein Link. Stand als offener Befund im
        Prüfbericht; aufgefallen ist es, weil der Lauf im gebauten Bogen an der Marke
        hängenblieb — sie fing den Klick ab. Und seit der Abgleich nur beim Start läuft,
        wird ein Fehler nicht mehr von allein überschrieben: die Marke steht dann die ganze
        Sitzung da.

        Vorher waren es 7rem: 3,5 für die Hauptnavigation plus 3,5 für die Reiter. Die
        Navigation sitzt jetzt OBEN (sein Auftrag), also fällt ihre Hälfte weg — sonst
        schwebte die Marke 56px zu hoch. `md:bottom-3` bleibt, weil die Reiterleiste ab md
        gar nicht unten sitzt (fünfte Falle in CLAUDE.md).
      */
      className={`fixed right-3 z-40 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] shadow-lg backdrop-blur md:bottom-3 ${
        syncing
          ? "border-slate-600 bg-slate-900/90 text-slate-300"
          : "border-red-700 bg-red-950/90 text-red-200"
      }`}
    >
      <span className={syncing ? "animate-spin" : ""}>{syncing ? "⟳" : "⚠"}</span>
      {syncing ? "gleicht ab …" : "Abgleich fehlgeschlagen — tippen"}
    </Link>
  );
}
