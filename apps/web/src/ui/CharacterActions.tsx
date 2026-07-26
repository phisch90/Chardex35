import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Character } from "@codex35/core";
import { CharacterRepo } from "../db/repo.js";
import { buildCharacterExport, shareOrDownload } from "../lib/transfer.js";
import { useAllEntities, useHouseRules } from "../lib/hooks.js";
import { BottomSheet, GhostButton } from "./bits.js";

/**
 * Alles, was man mit einem Charakter TUN kann, an einer Stelle — und das
 * Löschen bewusst weit weg vom Daumen.
 *
 * Der Weg zum Löschen ist absichtlich lang: Sheet öffnen → Gefahrenzone
 * aufklappen → Löschen wählen → den Namen abtippen. Ein Fehlgriff kostet
 * sonst einen Bogen, den zwei Jahre Spielzeit gefüllt haben — und über den
 * Geräte-Abgleich wäre er auf dem iPad gleich mit weg.
 */
export function CharacterActionsSheet(props: {
  character: Character;
  open: boolean;
  onClose: () => void;
  /** Wird nach dem Löschen gerufen (z.B. um von der Bogenseite wegzugehen). */
  onDeleted?: () => void;
}) {
  const navigate = useNavigate();
  const entities = useAllEntities();
  const houseRules = useHouseRules();
  const [dangerOpen, setDangerOpen] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const character = props.character;
  const isDraft = character.draftOf !== undefined;

  const close = () => {
    // Beim Schließen alles wieder zusammenklappen: der nächste Aufruf soll
    // nicht mit aufgeklappter Gefahrenzone beginnen.
    setDangerOpen(false);
    setDeleteArmed(false);
    setTyped("");
    setNote(null);
    props.onClose();
  };

  const share = () => {
    setNote(null);
    const built = buildCharacterExport(character, entities ?? [], houseRules);
    void shareOrDownload(built.json, built.filename, character.name)
      .then((outcome) => setNote(outcome === "downloaded" ? `Gespeichert als ${built.filename}` : null))
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : String(error)));
  };

  const makeDraft = async () => {
    const draft = await CharacterRepo.duplicate(character, {
      asDraft: true,
      name: `${character.name} (Entwurf)`,
    });
    close();
    await navigate({ to: "/charaktere/$charId", params: { charId: draft.id } });
  };

  const makeCopy = async () => {
    const copy = await CharacterRepo.duplicate(character, { asDraft: false });
    close();
    await navigate({ to: "/charaktere/$charId", params: { charId: copy.id } });
  };

  const doDelete = async () => {
    await CharacterRepo.remove(character);
    close();
    props.onDeleted?.();
  };

  const nameMatches = typed.trim().toLowerCase() === character.name.trim().toLowerCase();

  return (
    <BottomSheet open={props.open} onClose={close} title={character.name}>
      <div className="space-y-2">
        {!isDraft && (
          <ActionRow
            icon="🧪"
            label="Entwurf zum Ausprobieren"
            hint="Kopie, die weiß, wovon sie stammt — zum Vergleichen und späteren Übernehmen."
            onClick={() => void makeDraft()}
          />
        )}
        <ActionRow
          icon="📄"
          label="Eigenständige Kopie"
          hint="Neue Figur auf gleicher Grundlage, ohne Verbindung zum Original."
          onClick={() => void makeCopy()}
        />
        <ActionRow
          icon="📤"
          label="Teilen / sichern"
          hint="Als JSON — AirDrop aufs iPad, in Dateien speichern, weitergeben."
          onClick={share}
          disabled={entities === undefined}
        />
        {note !== null && <p className="px-1 text-[11px] text-slate-400">{note}</p>}

        {/* Gefahrenzone: erste der drei Hürden. */}
        <div className="mt-3 rounded-lg border border-slate-800">
          <button
            onClick={() => setDangerOpen(!dangerOpen)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs uppercase tracking-widest text-slate-500"
          >
            Gefahrenzone
            <span>{dangerOpen ? "▾" : "▸"}</span>
          </button>

          {dangerOpen && (
            <div className="space-y-2 border-t border-slate-800 p-3">
              {!deleteArmed ? (
                <>
                  <p className="text-xs text-slate-400">
                    Löschen entfernt den Charakter auf <strong>allen</strong> Geräten, sobald
                    abgeglichen wurde. Es gibt keinen Papierkorb.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <GhostButton onClick={share} disabled={entities === undefined}>
                      Vorher sichern
                    </GhostButton>
                    <GhostButton danger onClick={() => setDeleteArmed(true)}>
                      Charakter löschen …
                    </GhostButton>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-300">
                    Tippe <strong>{character.name}</strong> ab, um das Löschen zu bestätigen.
                  </p>
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={character.name}
                    className="w-full rounded-lg border border-red-800 bg-slate-950 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void doDelete()}
                      disabled={!nameMatches}
                      className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white enabled:hover:bg-red-600 disabled:opacity-40"
                    >
                      Endgültig löschen
                    </button>
                    <GhostButton
                      onClick={() => {
                        setDeleteArmed(false);
                        setTyped("");
                      }}
                    >
                      Abbrechen
                    </GhostButton>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

function ActionRow(props: {
  icon: string;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      className="flex w-full items-start gap-3 rounded-lg border border-slate-700 p-3 text-left enabled:hover:bg-slate-800 disabled:opacity-40"
    >
      <span className="text-lg leading-none">{props.icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{props.label}</span>
        <span className="block text-xs text-slate-500">{props.hint}</span>
      </span>
    </button>
  );
}

/**
 * Entwürfe sind Wegwerfware — hier ist EIN Rückfragen genug. Die Asymmetrie ist
 * gewollt: der echte Bogen ist schwer zu löschen, der Probelauf leicht.
 */
export function DiscardDraftButton(props: { draft: Character; onDiscarded?: () => void }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <GhostButton danger onClick={() => setArmed(true)}>
        Verwerfen
      </GhostButton>
    );
  }
  return (
    <span className="inline-flex gap-1">
      <button
        onClick={() => {
          void CharacterRepo.remove(props.draft).then(() => props.onDiscarded?.());
        }}
        className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
      >
        wirklich?
      </button>
      <GhostButton onClick={() => setArmed(false)}>nein</GhostButton>
    </span>
  );
}
