import { useState } from "react";
import { displayName, type Entity } from "@codex35/core";
import { S } from "../strings.js";
import { BottomSheet, Chip, GhostButton, PrimaryButton } from "./bits.js";

/**
 * Ein Teilgebiet WÄHLEN, nicht abtippen.
 *
 * Sein Urteil, wörtlich: „Find ich ja irgendwie sehr unprofessionell, dass man da dann das
 * Ganze abtippen soll, was man auswählt, anstatt einfach ein Dropdown-Menü oder ein
 * Single-Choice-Menü macht." Vorher stand hier `prompt()` — der eingebaute Browser-Dialog,
 * der die zehn möglichen Teilgebiete AUFZÄHLT und dann ein leeres Feld zum Abschreiben
 * hinstellt. Auf dem Handy tippt man „architecture and engineering" von Hand ab.
 *
 * Jetzt: jedes bekannte Teilgebiet ein Knopf, ein Tipp genügt. Das Feld für ein eigenes
 * bleibt darunter, denn die SRD-Listen sind ausdrücklich nicht abschließend (Craft und
 * Profession schon gar nicht) und an seinem Tisch gibt es Hausgemachtes.
 *
 * Was schon vergeben ist, steht gedämpft und ohne Funktion da — sonst tippt man zweimal
 * auf „religion" und wundert sich, dass nichts passiert.
 */
export function SubtypePicker({
  skill,
  taken,
  onPick,
  onClose,
}: {
  /** Die Sammel-Fertigkeit („Knowledge"), aus der die Vorschläge kommen. */
  skill: Entity | undefined;
  /** Bereits angelegte Teilgebiete dieser Fertigkeit. */
  taken: string[];
  onPick: (subtype: string) => void;
  onClose: () => void;
}) {
  const [own, setOwn] = useState("");
  const suggestions = skill?.kind === "skill" ? skill.data.subtypeSuggestions : [];
  const name = skill === undefined ? "" : displayName(skill);

  const pick = (subtype: string) => {
    const trimmed = subtype.trim();
    if (trimmed === "" || taken.includes(trimmed)) return;
    onPick(trimmed);
    onClose();
  };

  return (
    <BottomSheet open onClose={onClose} title={S.sheet.subtypeFor(name)}>
      {suggestions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {suggestions.map((subtype) => {
            const already = taken.includes(subtype);
            return (
              <Chip
                key={subtype}
                dimmed={already}
                {...(already ? { title: S.sheet.subtypeTaken } : { onClick: () => pick(subtype) })}
              >
                {subtype}
              </Chip>
            );
          })}
        </div>
      )}
      <label className="block text-xs text-slate-400">
        {S.sheet.subtypeOwn}
        <input
          type="text"
          value={own}
          onChange={(e) => setOwn(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") pick(own);
          }}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100"
        />
      </label>
      <div className="mt-3 flex items-center justify-end gap-2">
        <GhostButton onClick={onClose}>{S.actions.cancel}</GhostButton>
        <PrimaryButton disabled={own.trim() === ""} onClick={() => pick(own)}>
          {S.actions.add}
        </PrimaryButton>
      </div>
    </BottomSheet>
  );
}
