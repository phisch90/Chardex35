import { useEffect, useRef, useState } from "react";
import type { Character } from "@codex35/core";
import { buildCharacterExport, shareOrDownload } from "../lib/transfer.js";
import { useAllEntities, useHouseRules } from "../lib/hooks.js";
import { Icon } from "./icons.js";

/**
 * Einen Bogen ohne jede Einrichtung auf ein anderes Gerät bringen: teilen
 * (AirDrop, „In Dateien speichern") und drüben in den Einstellungen
 * importieren. Der Geräte-Abgleich ist der bequeme Weg, dieser hier der, der
 * immer funktioniert — auch ohne Netz und ohne Konto.
 *
 * Der Export wird SYNCHRON aus dem gebaut, was schon im Speicher liegt. Auf
 * iOS verlangt `navigator.share()` den Fingertipp als Auslöser; läge davor
 * eine Datenbankabfrage, könnte Safari das Teilen-Blatt verweigern.
 */
export function ShareCharacterButton(props: {
  character: Character;
  variant?: "inline" | "overlay";
}) {
  const entities = useAllEntities();
  const houseRules = useHouseRules();
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const share = () => {
    setNote(null);
    let built: { json: string; filename: string };
    try {
      built = buildCharacterExport(props.character, entities ?? [], houseRules);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
      return;
    }
    // Kein await vor dem Teilen — siehe oben.
    void shareOrDownload(built.json, built.filename, props.character.name)
      .then((outcome) => {
        if (outcome === "downloaded") setNote(`Gespeichert als ${built.filename}`);
        else if (outcome === "shared") setNote("Geteilt.");
      })
      .catch((error: unknown) => {
        setNote(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(() => setNote(null), 6000);
      });
  };

  const overlay = props.variant === "overlay";
  return (
    <>
      <button
        onClick={share}
        disabled={entities === undefined}
        aria-label="Charakter teilen"
        title="Charakter teilen"
        className={
          overlay
            ? "absolute right-12 top-2 rounded-lg bg-slate-950/60 px-2.5 py-1.5 text-slate-200 backdrop-blur disabled:opacity-40"
            : "rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 enabled:hover:bg-slate-800 disabled:opacity-40"
        }
      >
        <Icon name="share" size={18} />
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
