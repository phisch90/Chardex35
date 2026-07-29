import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  displayName,
  readOrderMarker,
  redundantConflictCopies,
  stripConflictSuffix,
  type Character,
} from "@codex35/core";
import { S } from "../strings.js";
import { useCharacters, useCompendium, useSheet } from "../lib/hooks.js";
import { CharacterRepo } from "../db/repo.js";
import { importEnvelope, type ImportResult } from "../lib/transfer.js";
import { Card, GhostButton } from "../ui/bits.js";
import { VersionBadge } from "../ui/VersionBadge.js";
import { CharacterActionsSheet, DiscardDraftButton } from "../ui/CharacterActions.js";
import { useCachedShelves } from "../group/useGroup.js";

export function CharacterListPage() {
  const characters = useCharacters();

  // Entwürfe stehen unten in ihrem eigenen Abschnitt — die Liste soll nach
  // den echten Figuren aussehen, nicht nach einer Werkbank.
  const { real, drafts, workCopies } = useMemo(() => {
    const all = characters ?? [];
    const byId = new Map(all.map((c) => [c.id, c]));
    /*
      Arbeitskopien fremder Bögen stehen NICHT zwischen den eigenen Figuren. Sie
      liegen in derselben Tabelle (nur so lassen sie sich mit dem gewohnten Bogen
      bearbeiten und wandern über den Geräte-Abgleich aufs iPad), aber in der Liste
      wären sie an dieser Stelle eine Falle: man tippt seinen Charakter an und
      landet im fremden.
    */
    const isWorkCopy = (c: Character) => readOrderMarker(c) !== undefined;
    const own = all.filter((c) => !isWorkCopy(c));
    return {
      real: own.filter((c) => c.draftOf === undefined || !byId.has(c.draftOf)),
      drafts: own.filter((c) => c.draftOf !== undefined && byId.has(c.draftOf)),
      workCopies: all.filter(isWorkCopy),
    };
  }, [characters]);

  return (
    <div className="space-y-3">
      {/* Version zwischen Titel und Knopf — dort sieht er sie jedes Mal, ohne
          dafür in die Einstellungen zu müssen. */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="shrink-0 text-xl font-bold">{S.nav.characters}</h1>
        <VersionBadge compact />
        <Link
          to="/charaktere/neu"
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
        >
          + {S.wizard.title}
        </Link>
      </div>

      <ImportBar />

      <ConflictCleanupCard characters={characters ?? []} />

      {characters === undefined && <p className="text-slate-400">{S.misc.loading}</p>}
      {characters?.length === 0 && (
        <p className="py-10 text-center text-slate-400">{S.misc.noCharacters}</p>
      )}

      {real.map((character) => (
        <CharacterRow key={character.id} character={character} />
      ))}

      {drafts.length > 0 && (
        <div className="pt-2">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Entwürfe ({drafts.length})
          </h2>
          {drafts.map((draft) => (
            <DraftRow
              key={draft.id}
              draft={draft}
              origin={(characters ?? []).find((c) => c.id === draft.draftOf)}
            />
          ))}
        </div>
      )}

      {workCopies.length > 0 && (
        <div className="pt-2">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-300/80">
            {S.group.editForeign} ({workCopies.length})
          </h2>
          <ul className="divide-y divide-slate-800 rounded-xl border border-violet-900/60 bg-violet-950/20">
            {workCopies.map((copy) => {
              const marker = readOrderMarker(copy)!;
              return (
                <li key={copy.id}>
                  <Link
                    to="/charaktere/$charId"
                    params={{ charId: copy.id }}
                    className="flex items-baseline justify-between gap-2 px-3 py-2.5 hover:bg-violet-900/20"
                  >
                    <span className="min-w-0 truncate text-sm font-medium">{copy.name}</span>
                    <span className="shrink-0 text-xs text-violet-300/80">
                      {marker.owner === "" ? S.group.unknownOwner : marker.owner}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Die Bögen der anderen — unten, hinter den eigenen und den Entwürfen.
          Man öffnet diese Liste, um SEINEN Charakter zu spielen; die der anderen
          schaut man nachschlagend an. */}
      <GroupSection />
    </div>
  );
}

/**
 * Was in der Gruppe liegt.
 *
 * Zeigt nur, was schon abgeholt ist — es wird hier NICHT nachgeladen. Am
 * Spieltisch ist das Netz das Erste, was fehlt, und eine Liste, die beim Öffnen
 * hängt, ist schlimmer als eine, die von gestern ist. Abgeholt wird in den
 * Einstellungen auf Knopfdruck.
 */
function GroupSection() {
  const shelves = useCachedShelves();
  const withCharacters = (shelves ?? []).filter((entry) => entry.shelf.characters.length > 0);
  if (withCharacters.length === 0) return null;

  return (
    <div className="pt-2">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
        {S.group.otherSheets}
      </h2>
      {withCharacters.map((entry) => (
        <div key={entry.gistId} className="mb-2">
          <div className="mb-1 flex items-baseline gap-1.5 text-xs text-slate-500">
            <span className="font-medium text-slate-400">
              {entry.shelf.owner === "" ? S.group.unknownOwner : entry.shelf.owner}
            </span>
            {entry.shelf.gamemaster && (
              <span className="rounded bg-violet-900/60 px-1.5 py-0.5 text-[10px] text-violet-300">
                SL
              </span>
            )}
          </div>
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/50">
            {entry.shelf.characters.map((character) => (
              <li key={character.id}>
                <Link
                  to="/gruppe/$gistId/$charId"
                  params={{ gistId: entry.gistId, charId: character.id }}
                  className="flex items-baseline justify-between gap-2 px-3 py-2.5 hover:bg-slate-800/60"
                >
                  <span className="min-w-0 truncate text-sm font-medium">{character.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {S.sheet.level} {character.levels.length}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import direkt auf der Liste — dort, wo man einen Charakter erwartet
// ---------------------------------------------------------------------------

function ImportBar() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    setResult(null);
    try {
      const raw: unknown = JSON.parse(await file.text());
      setResult(await importEnvelope(raw));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <label className="cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800">
          📥 Charakter-Datei (JSON)
          <input
            type="file"
            /* iOS blendet Dateien aus, wenn nur der MIME-Typ steht. */
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
              e.target.value = "";
            }}
          />
        </label>
        <Link
          to="/import"
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
        >
          📂 {S.import.title}
        </Link>
      </div>
      {result && (
        <p className="text-center text-xs text-emerald-400">
          {result.charactersAdded + result.charactersUpdated} Charakter(e) übernommen
          {result.charactersSkipped > 0 && `, ${result.charactersSkipped} übersprungen (nicht neuer)`}
          .
        </p>
      )}
      {error && <p className="text-center text-xs text-red-400">Import fehlgeschlagen: {error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aufräumen nach der Konfliktkopien-Lawine
// ---------------------------------------------------------------------------

/**
 * Ein Fehler im Abgleich hat aus einem Charakter eine Reihe gleicher Kopien
 * gemacht (behoben — beide Seiten gehen jetzt vor dem Vergleich durchs Schema).
 * Was bereits entstanden ist, liegt aber in der Datenbank und muss von Hand weg.
 * Dieses Angebot erscheint nur, wenn es wirklich etwas wegzuräumen gibt, und
 * ausschließlich für Kopien, deren Inhalt nachweislich schon anderswo liegt.
 */
function ConflictCleanupCard({ characters }: { characters: Character[] }) {
  const redundant = useMemo(() => redundantConflictCopies(characters), [characters]);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState(0);

  if (redundant.length === 0) {
    return removed === 0 ? null : (
      <p className="text-center text-xs text-emerald-400">{S.cleanup.done(removed)}</p>
    );
  }

  const cleanUp = async () => {
    setBusy(true);
    try {
      for (const copy of redundant) await CharacterRepo.remove(copy);
      setRemoved((count) => count + redundant.length);
    } finally {
      setBusy(false);
      setArmed(false);
    }
  };

  const kept = stripConflictSuffix(redundant[0]?.name ?? "");

  return (
    <Card className="border-amber-700 bg-amber-950/30">
      <p className="text-sm font-semibold text-amber-200">{S.cleanup.title(redundant.length)}</p>
      <p className="mt-1 text-xs leading-relaxed text-amber-100/80">{S.cleanup.why(kept)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {armed ? (
          <button
            onClick={() => void cleanUp()}
            disabled={busy}
            className="rounded-lg border border-red-500 bg-red-900/70 px-3 py-1.5 text-sm font-semibold text-red-100"
          >
            {busy ? "räume auf …" : S.cleanup.confirm(redundant.length)}
          </button>
        ) : (
          <GhostButton onClick={() => setArmed(true)}>{S.cleanup.action(redundant.length)}</GhostButton>
        )}
        {armed && !busy && <GhostButton onClick={() => setArmed(false)}>{S.actions.cancel}</GhostButton>}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Zeilen
// ---------------------------------------------------------------------------

function useRowSummary(character: Character) {
  const compendium = useCompendium();
  const sheet = useSheet(character);
  const race = compendium?.get(character.raceId);
  const classSummary = new Map<string, number>();
  for (const level of character.levels) {
    classSummary.set(level.classId, (classSummary.get(level.classId) ?? 0) + 1);
  }
  const classText = [...classSummary.entries()]
    .map(([classId, count]) => {
      const cls = compendium?.get(classId);
      return `${cls ? displayName(cls) : classId} ${count}`;
    })
    .join(" / ");
  return { sheet, raceText: race ? displayName(race) : "", classText };
}

function CharacterRow({ character }: { character: Character }) {
  const { sheet, raceText, classText } = useRowSummary(character);
  const [actionsOpen, setActionsOpen] = useState(false);

  const hpColor =
    sheet === undefined
      ? "text-slate-400"
      : sheet.hp.current <= sheet.hp.max / 4
        ? "text-red-400"
        : sheet.hp.current <= sheet.hp.max / 2
          ? "text-amber-400"
          : "text-emerald-400";

  return (
    <>
      {/* Karte ist KEIN Link mehr: der Aktionsknopf darf nicht in einem Link
          liegen, sonst öffnet jeder Tap darauf auch den Bogen. */}
      <Card className="mb-2 flex items-center gap-3 transition-colors hover:border-amber-600/50">
        <Link
          to="/charaktere/$charId"
          params={{ charId: character.id }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {character.portrait ? (
            <img src={character.portrait} alt="" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-800 text-2xl">
              🛡️
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold">{character.name}</div>
            <div className="truncate text-sm text-slate-400">
              {raceText} {classText && `· ${classText}`}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-amber-300">
              {S.sheet.level} {character.levels.length}
            </div>
            {sheet && (
              <div className={`mt-1 text-xs font-semibold tabular-nums ${hpColor}`}>
                {S.sheet.hp} {sheet.hp.current}/{sheet.hp.max}
              </div>
            )}
          </div>
        </Link>
        <button
          onClick={() => setActionsOpen(true)}
          aria-label={`${character.name}: Aktionen`}
          className="shrink-0 rounded-lg px-2 py-3 text-lg text-slate-400 hover:bg-slate-800"
        >
          ⋯
        </button>
      </Card>
      <CharacterActionsSheet
        character={character}
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
      />
    </>
  );
}

function DraftRow({ draft, origin }: { draft: Character; origin: Character | undefined }) {
  const { classText } = useRowSummary(draft);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const apply = async () => {
    setBusy(true);
    try {
      const merged = await CharacterRepo.applyDraft(draft);
      setNote(merged ? null : "Das Original ist nicht mehr da — mach den Entwurf eigenständig.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-2 border-dashed">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            🧪 {draft.name}
          </div>
          <div className="truncate text-xs text-slate-400">
            {classText}
            {origin && ` · Entwurf von ${origin.name}`}
          </div>
        </div>
        <Link
          to="/charaktere/$charId"
          params={{ charId: draft.id }}
          className="shrink-0 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
        >
          Öffnen
        </Link>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Link
          to="/charaktere/$charId/vergleich"
          params={{ charId: draft.id }}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-500"
        >
          Vergleichen
        </Link>
        <GhostButton onClick={() => void apply()} disabled={busy || origin === undefined}>
          Übernehmen
        </GhostButton>
        <GhostButton onClick={() => void CharacterRepo.promoteDraft(draft)}>
          Eigenständig
        </GhostButton>
        <DiscardDraftButton draft={draft} />
      </div>
      {note !== null && <p className="mt-1 text-xs text-amber-400">{note}</p>}
    </Card>
  );
}
