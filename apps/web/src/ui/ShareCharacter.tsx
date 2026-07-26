import { useState } from "react";
import { buildCharacterExport, shareOrDownload } from "../lib/transfer.js";

/**
 * Einen Bogen ohne jede Einrichtung auf ein anderes Gerät bringen: teilen
 * (AirDrop, „In Dateien speichern") und drüben in den Einstellungen
 * importieren. Der Geräte-Abgleich ist der bequeme Weg, dieser hier der, der
 * immer funktioniert — auch ohne Netz und ohne Konto.
 */
export function ShareCharacterButton(props: {
  characterId: string;
  characterName: string;
  variant?: "inline" | "overlay";
}) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    setNote(null);
    try {
      const built = await buildCharacterExport(props.characterId);
      if (!built) {
        setNote("Charakter nicht gefunden.");
        return;
      }
      const outcome = await shareOrDownload(built.json, built.filename, props.characterName);
      if (outcome === "downloaded") setNote(`Gespeichert als ${built.filename}`);
      else if (outcome === "shared") setNote("Geteilt.");
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
      setTimeout(() => setNote(null), 6000);
    }
  };

  const overlay = props.variant === "overlay";
  return (
    <>
      <button
        onClick={() => void share()}
        disabled={busy}
        aria-label="Charakter teilen"
        title="Charakter teilen"
        className={
          overlay
            ? "absolute right-12 top-2 rounded-lg bg-slate-950/60 px-2.5 py-1.5 text-slate-200 backdrop-blur disabled:opacity-40"
            : "rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 enabled:hover:bg-slate-800 disabled:opacity-40"
        }
      >
        📤
      </button>
      {note !== null && (
        <p
          className={
            overlay
              ? "absolute inset-x-2 top-12 rounded bg-slate-950/80 px-2 py-1 text-[11px] text-slate-200 backdrop-blur"
              : "text-[11px] text-slate-400"
          }
          role="status"
        >
          {note}
        </p>
      )}
    </>
  );
}
