import { useState } from "react";
import type { Entity } from "@codex35/core";

/**
 * Die Erklärung zu einem Talent — deutsch, wenn vorhanden, und VOLLSTÄNDIG.
 *
 * Kein Abschneiden mit „…": eine halbe Regel ist am Spieltisch schlimmer als
 * keine. Lang ist der Text ohnehin nur beim englischen Originaltext, deshalb
 * ist der eingeklappt und der deutsche Kurztext gleich sichtbar.
 */
export function FeatText({ entity }: { entity: Entity | undefined }) {
  const [showEnglish, setShowEnglish] = useState(false);
  if (!entity || entity.kind !== "feat") return null;

  const german = entity.localized?.de?.summary;
  const english = [entity.data.benefit, entity.data.normalText, entity.data.specialText]
    .filter((part): part is string => part !== undefined && part.trim() !== "")
    .join("\n\n");
  const fallback = english === "" ? entity.description : english;

  if (german === undefined) {
    // Ohne deutschen Text: englischer Originaltext, und das ehrlich benannt.
    return (
      <div className="mt-1">
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{fallback}</p>
        <p className="mt-0.5 text-[10px] text-slate-600">nur englisch — deutsche Erklärung fehlt noch</p>
      </div>
    );
  }

  return (
    <div className="mt-1">
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{german}</p>
      {fallback !== undefined && fallback !== "" && (
        <>
          <button
            onClick={() => setShowEnglish(!showEnglish)}
            className="mt-0.5 text-[10px] text-slate-500 underline decoration-dotted hover:text-amber-400"
          >
            {showEnglish ? "Originaltext ausblenden" : "englischen Originaltext zeigen"}
          </button>
          {showEnglish && (
            <p className="mt-1 whitespace-pre-wrap border-l-2 border-slate-700 pl-2 text-[11px] leading-relaxed text-slate-500">
              {fallback}
            </p>
          )}
        </>
      )}
    </div>
  );
}
