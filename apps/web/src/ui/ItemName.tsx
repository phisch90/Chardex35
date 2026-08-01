import { useState } from "react";
import { displayName, type Entity } from "@codex35/core";
import { S } from "../strings.js";

/**
 * Der Name eines Gegenstands: deutsch, mit dem englischen Original klein daneben.
 *
 * Sein Wort dazu: „Bitte alle Ausrüstungsgegenstände immer auf deutsch im Namen
 * und Erklärung. Englischen og namen klein daneben."
 *
 * Das Original steht mit, weil es gebraucht wird — seine Bücher, die
 * Gruppen-Excel und Fight Club sagen „Longsword". Wer am Tisch nachschlägt oder
 * mit dem DM redet, braucht beides. Es steht nur da, wo es sich UNTERSCHEIDET:
 * bei „Kama" oder „Rapier" wäre „Kama (Kama)" nur Lärm.
 *
 * Bei einem eigenen Namen („Torbens Klinge") steht das Original NICHT dabei —
 * dann ist der Bezug zum Regelwerkseintrag ohnehin gelöst, und die Zeile würde
 * behaupten, „Torbens Klinge" heiße auf Englisch „Longsword".
 */
export function ItemName({
  entity,
  customName,
  className,
}: {
  entity: Entity | undefined;
  /** Eigener Name der Zeile — schlägt den Kompendium-Namen. */
  customName?: string | undefined;
  className?: string;
}) {
  if (entity === undefined) return <span className={className}>{customName ?? "—"}</span>;
  const german = displayName(entity);
  const original = entity.name;
  const showOriginal = customName === undefined && original !== german;
  return (
    <span className={className}>
      {customName ?? german}
      {showOriginal && (
        <span className="ml-1.5 text-[10px] font-normal text-slate-500">{original}</span>
      )}
    </span>
  );
}

/**
 * Die Erklärung zu einem Gegenstand — deutsch, wenn es eine gibt.
 *
 * Gebaut wie `FeatText`, aus demselben Grund: der deutsche Satz ist gleich zu
 * sehen, der englische Regeltext (bei magischen Gegenständen oft ein halber
 * Bildschirm) steckt hinter einem Tipp. Fehlt der deutsche Satz, steht der
 * englische Text da UND dass die Übersetzung noch fehlt — kein stiller Rest.
 */
export function ItemText({ entity }: { entity: Entity | undefined }) {
  const [showEnglish, setShowEnglish] = useState(false);
  if (entity === undefined || entity.kind !== "item") return null;

  const german = entity.localized?.de?.summary;
  const english = entity.description;
  const hasEnglish = english !== undefined && english.trim() !== "";

  if (german === undefined) {
    if (!hasEnglish) return null;
    return (
      <div className="mt-1">
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{english}</p>
        <p className="mt-0.5 text-[10px] text-slate-600">{S.items.onlyEnglish}</p>
      </div>
    );
  }

  return (
    <div className="mt-1">
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{german}</p>
      {hasEnglish && (
        <>
          <button
            onClick={() => setShowEnglish(!showEnglish)}
            className="mt-0.5 text-[10px] text-slate-500 underline decoration-dotted hover:text-amber-400"
          >
            {showEnglish ? S.items.hideOriginal : S.items.showOriginal}
          </button>
          {showEnglish && (
            <p className="mt-1 whitespace-pre-wrap border-l-2 border-slate-700 pl-2 text-[11px] leading-relaxed text-slate-500">
              {english}
            </p>
          )}
        </>
      )}
    </div>
  );
}
