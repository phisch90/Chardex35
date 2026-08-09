import { useState } from "react";
import type { Character } from "@codex35/core";
import { S } from "../strings.js";
import { BottomSheet, GhostButton } from "./bits.js";
import { CharacterRepo } from "../db/repo.js";
import { buildExport, shareOrDownload } from "../lib/transfer.js";
import { reportSaveFailure } from "../lib/saveError.js";
import { forgetSheet } from "../lib/lastSheet.js";

/**
 * Mehrere Bögen auf einmal wegräumen.
 *
 * Sein Auftrag: „Mach mal die Char Liste sauber. Schmeiß alle außer Hike raus." Von
 * hier aus geht das nicht — die Bögen liegen ausschließlich im Speicher SEINES Geräts
 * (lokal-first, kein Server, seine Entscheidung). Gebaut ist deshalb der Weg, nicht
 * die Tat: ankreuzen, sichern, löschen.
 *
 * Vier Entscheidungen sind eine Notiz wert:
 *
 * - **Auswahl statt „alle außer diesem".** Ein Knopf, der alles bis auf einen Bogen
 *   nimmt, ist bei einem Fehlgriff der teuerste der ganzen App — und er sähe genauso
 *   aus wie einer, der das Richtige tut. Angekreuzt wird, was WEG soll.
 * - **Die Rückfrage nennt jeden Namen.** Dieselbe Regel wie beim einzelnen Löschen:
 *   was der getippte Code dort geleistet hat, war nie der Schutz vor dem Löschen,
 *   sondern der davor, den FALSCHEN Bogen zu erwischen — und den trägt der Name.
 * - **„Abbrechen" steht VOR dem roten Knopf.** Sonst läge der zweite Tipp eines
 *   Doppeltipps genau auf „löschen".
 * - **Die Sicherung ist der Rückweg**, weil es keinen anderen gibt: ein Charakter
 *   kennt weder Rücknahme noch Papierkorb. Scheitert sie, wird NICHT gelöscht — eine
 *   Sicherung, die man für geschrieben hält, ist gefährlicher als keine.
 */
export function BulkDeleteBar(props: {
  /** Alle wählbaren Bögen — daraus kommt auch die Gesamtzahl in der Leiste. */
  characters: Character[];
  selected: Set<string>;
  onSelectAll: () => void;
  onClear: () => void;
  /** Nach dem Löschen: Auswahlmodus verlassen. */
  onDone: (deleted: number) => void;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<"offen" | "geschrieben" | "fehler">("offen");

  const picked = props.characters.filter((character) => props.selected.has(character.id));

  const sichern = async () => {
    try {
      const json = await buildExport();
      const stamp = new Date().toISOString().slice(0, 10);
      await shareOrDownload(json, `chardex35-sicherung-${stamp}.json`, S.settings.exportAll);
      setBackup("geschrieben");
    } catch {
      setBackup("fehler");
    }
  };

  const loeschen = async () => {
    setBusy(true);
    let done = 0;
    try {
      for (const character of picked) {
        /*
          Jede Schreibstelle übergibt ihren Aufruf als Funktion, damit das Band unter
          der Hauptnavigation einen ECHTEN zweiten Versuch anbieten kann. Und der Lauf
          bricht beim ersten Fehler ab: sonst räumt er weiter, während oben steht, dass
          etwas schiefging.
        */
        const write = () => CharacterRepo.remove(character);
        try {
          await write();
        } catch (error: unknown) {
          reportSaveFailure(character.name, error, write);
          break;
        }
        // Sonst zeigte der Knopf „Zurück zu …" in den Einstellungen ins Leere.
        forgetSheet(character.id);
        done++;
      }
    } finally {
      setBusy(false);
      setAsking(false);
      props.onDone(done);
    }
  };

  return (
    <>
      {/*
        Fest am unteren Rand. Die Hauptnavigation sitzt seit seinem Auftrag OBEN, und die
        Startseite hat unten nichts — also `bottom-0` ohne Abzug, aber mit dem Polster für
        die Home-Anzeige. Ein Wert zu viel wäre genau das Band, das über dem Rand schwebt.
      */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:left-52">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 text-xs text-slate-400">
            {picked.length === 0 ? S.bulk.none : S.bulk.count(picked.length, props.characters.length)}
          </span>
          <GhostButton onClick={props.onSelectAll}>{S.bulk.all}</GhostButton>
          <GhostButton onClick={props.onClear} disabled={picked.length === 0}>
            {S.bulk.clear}
          </GhostButton>
          <button
            type="button"
            disabled={picked.length === 0}
            onClick={() => {
              setBackup("offen");
              setAsking(true);
            }}
            className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40 enabled:hover:bg-red-600"
          >
            {S.bulk.delete(picked.length)}
          </button>
        </div>
      </div>

      <BottomSheet
        open={asking}
        onClose={() => setAsking(false)}
        title={S.bulk.confirmTitle(picked.length)}
      >
        {/*
          Jeder Name einzeln. Bei einer langen Liste scrollt der Kasten, statt die
          Knöpfe aus dem Bild zu schieben — sonst bestätigt man etwas, dessen Umfang
          man nicht gesehen hat.
        */}
        <ul className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-sm">
          {picked.map((character) => (
            <li key={character.id} className="truncate py-0.5">
              {character.name}
            </li>
          ))}
        </ul>

        <p className="mt-2 text-xs leading-relaxed text-amber-200">{S.bulk.noUndo}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {backup === "geschrieben" ? (
            <span className="text-sm text-emerald-400">{S.bulk.backupDone}</span>
          ) : (
            <GhostButton onClick={() => void sichern()}>{S.bulk.backup}</GhostButton>
          )}
        </div>
        {backup === "fehler" && (
          <p className="mt-1 text-xs text-red-400">{S.bulk.backupFailed}</p>
        )}

        {/*
          Abbrechen VOR dem roten Knopf — sonst lägen die zwei Stufen übereinander und
          der zweite Tipp eines Doppeltipps träfe sofort „löschen".
        */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <GhostButton onClick={() => setAsking(false)} disabled={busy}>
            {S.actions.cancel}
          </GhostButton>
          <button
            type="button"
            disabled={busy}
            onClick={() => void loeschen()}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 enabled:hover:bg-red-600"
          >
            {busy ? S.bulk.busy : S.bulk.confirmDelete(picked.length)}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
