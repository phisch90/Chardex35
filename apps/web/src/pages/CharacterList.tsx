import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  deriveSheet,
  displayName,
  groupByCampaign,
  openWork,
  readOrderMarker,
  redundantConflictCopies,
  stripConflictSuffix,
  type Character,
} from "@codex35/core";
import { S } from "../strings.js";
import { Icon, IconInline } from "../ui/icons.js";
import { useCharacters, useCompendium, useHouseRules } from "../lib/hooks.js";
import { CharacterRepo } from "../db/repo.js";
import { importEnvelope, type ImportResult } from "../lib/transfer.js";
import { Card, GhostButton, OPEN_MARK } from "../ui/bits.js";
import { campaignLook } from "../ui/campaignColors.js";
import { cardTier, type CardTier } from "../ui/cardTier.js";
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

  /*
    Nach Kampagne gruppieren — seine Entscheidung („nach Kampagne gruppieren"), und
    zwar bevor die Kartengröße bestimmt wird: jede Überschrift kostet Platz, den die
    Karten dann nicht mehr haben. Beides aus derselben Quelle zu rechnen ist der
    Grund, warum `groupByCampaign` im Kern steht und nicht hier.
  */
  const groups = useMemo(() => groupByCampaign(real), [real]);
  const tier = cardTier(real.length, groups.length);
  /*
    Welcher Bogen sein Aktions-Blatt offen hat — als KENNUNG, nicht als Objekt. Der
    Charakter selbst kommt frisch aus der Liste, sonst zeigte das Blatt einen Stand
    von vor der letzten Änderung (die Kampagne, die man gerade darin eingetragen hat).
  */
  const [openFor, setOpenFor] = useState<string | null>(null);
  const openCharacter = openFor === null ? undefined : real.find((c) => c.id === openFor);
  // Eine einzige Gruppe beschriftet sich nicht selbst — „Ohne Kampagne" über der
  // einzigen Liste wäre Lärm. `cardTier` rechnet mit derselben Regel.
  const withHeadings = groups.length > 1;

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

      {/*
        Der `key` ist die POSITION des Abschnitts, nicht sein Name — und das ist aus
        Schaden gelernt. Vorher stand hier `key={group.campaign?.name ?? "ohne"}`,
        also der Wert, den er im Kampagnenfeld gerade TIPPT. Jeder Buchstabe machte
        daraus einen anderen Schlüssel („N", „Na", „Nac"), für React also ein anderes
        Element: der ganze Abschnitt wurde abgeräumt und neu gebaut. Damit starb das
        Eingabefeld nach dem ersten Zeichen.

        Die Karten darin tragen `key={character.id}`, werden also innerhalb des
        Abschnitts weiter richtig zugeordnet — die Position als Schlüssel ist hier
        genau richtig, weil ein Abschnitt eine Position IST und keine Identität hat.
      */}
      {groups.map((group, index) => (
        <div key={index}>
          {withHeadings && (
            <h2
              className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest ${
                group.campaign === undefined
                  ? "text-slate-500"
                  : campaignLook(group.campaign.color).heading
              }`}
            >
              {group.campaign !== undefined && (
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${campaignLook(group.campaign.color).dot}`}
                />
              )}
              {group.campaign?.name ?? S.campaign.none}
            </h2>
          )}
          {group.characters.map((character) => (
            <CharacterRow
              key={character.id}
              character={character}
              tier={tier}
              onOpenActions={() => setOpenFor(character.id)}
              {...(group.campaign === undefined ? {} : { look: campaignLook(group.campaign.color) })}
            />
          ))}
        </div>
      ))}

      {/*
        Das Aktions-Blatt liegt auf SEITENebene, nicht in der Kartenzeile.

        Ein Dialog in einem Listeneintrag stirbt mit jeder Umsortierung der Liste —
        und genau das ist passiert: das Kampagnenfeld darin nahm nur einen Buchstaben,
        weil das Tippen die Abschnitte umbaute. Hier oben ist es von der Liste
        entkoppelt, und es gibt garantiert nur eine Instanz statt einer je Bogen.
      */}
      {openCharacter !== undefined && (
        <CharacterActionsSheet
          character={openCharacter}
          open
          onClose={() => setOpenFor(null)}
        />
      )}

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
          <IconInline name="import" /> Charakter-Datei (JSON)
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
          <IconInline name="import" /> {S.import.title}
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
    <Card tone="border-amber-700 bg-amber-950/30">
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

/**
 * Rasse und Klassen als Text.
 *
 * Holt AUSDRÜCKLICH keinen abgeleiteten Bogen. Solange hier die TP standen, zog
 * jede Zeile eine vollständige Ableitung samt Kompendium — bei sechs Charakteren
 * waren das 18 Abfragen über 3046 Einträge, und man sah es: Name und Stufe standen
 * sofort da, die Unterzeile rückte nach. Die TP sind weg (er wollte sie hier nicht),
 * und damit auch der Grund für die Ableitung.
 */
/**
 * Was an diesem Bogen noch offen ist — für die Marke auf der Karte.
 *
 * Die Karte rechnete bisher bewusst KEINEN Bogen aus („nur noch die Stufe — sie
 * kommt aus `character.levels`"). Vor dem Einbauen gemessen: `deriveSheet` braucht
 * 0,67 ms je Bogen, zehn Bögen also 6,7 ms. Das ist kein Grund, die Regel ein
 * zweites Mal in der Liste nachzubauen — und ein zweiter Nachbau wäre die
 * eigentliche Gefahr, nicht die Rechenzeit.
 */
function useOpenWork(character: Character) {
  const compendium = useCompendium();
  const houseRules = useHouseRules();
  return useMemo(() => {
    if (!compendium) return [];
    return openWork(deriveSheet(character, compendium, houseRules)).map((i) => i.message);
  }, [character, compendium, houseRules]);
}

function useRowSummary(character: Character) {
  const compendium = useCompendium();
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
  return { raceText: race ? displayName(race) : "", classText };
}

/**
 * Eine Charakterkarte.
 *
 * Was darauf steht, hat er Zeile für Zeile vorgegeben: „den Namen des Charakters und
 * daneben etwas anders geschrieben […] den Namen des Spielers, darunter die Rasse und
 * die Klassen. Stufe sieben daneben ist auch in Ordnung, Trefferpunkte müssen wir
 * dort nicht anzeigen."
 *
 * Der Kampagnenname steht NICHT auf der Karte, obwohl er ihn hier haben wollte —
 * er steht in der Überschrift des Abschnitts, unter der die Karte liegt. Zweimal
 * dasselbe Wort auf 390px Breite ist Verschwendung; die Karte trägt die FARBE der
 * Kampagne, und das war der eigentliche Wunsch („dass halt dieser ganze Reiter […]
 * in einer anderen Farbe dargestellt werden").
 */
function CharacterRow(props: {
  character: Character;
  tier: CardTier;
  /** Öffnet das Aktions-Blatt — das liegt auf Seitenebene, nicht hier. */
  onOpenActions: () => void;
  /** Fehlt bei Bögen ohne Kampagne — dann bleibt die Karte grau wie bisher. */
  look?: { card: string } | undefined;
}) {
  const { character, tier } = props;
  const { raceText, classText } = useRowSummary(character);
  const open = useOpenWork(character);

  return (
    <>
      {/* Karte ist KEIN Link: der Aktionsknopf darf nicht in einem Link liegen,
          sonst öffnet jeder Tap darauf auch den Bogen. */}
      {/*
        `tone` und `padding` statt `className`: eine Klasse, die hinten angehängt
        wird, gewinnt nicht — Tailwind entscheidet nach der Reihenfolge im
        Stylesheet, und dort steht `slate` hinter allen Buntfarben. Die
        Kampagnenfarbe war so unsichtbar, obwohl sie am Element stand.
      */}
      <Card
        {...(props.look === undefined ? {} : { tone: props.look.card })}
        padding={tier.padding}
        className={`${tier.gap} flex items-center gap-3 transition-colors hover:border-amber-600/50`}
      >
        <Link
          to="/charaktere/$charId"
          params={{ charId: character.id }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {character.portrait ? (
            <img
              src={character.portrait}
              alt=""
              className={`${tier.portrait} shrink-0 rounded-lg object-cover`}
            />
          ) : (
            <div
              className={`${tier.portrait} flex shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-500`}
            >
              <Icon name="characters" size={tier.markPx} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {/*
              Name und Spielername in EINER Zeile, aber deutlich verschieden gesetzt
              („etwas anders formatiert"): fett gegen normal, hell gegen gedämpft.
              `items-baseline`, damit die beiden trotz verschiedener Größe auf einer
              Linie sitzen. Beim Umbruch geht der Spielername als erstes verloren —
              deshalb `truncate` am Namen und `shrink-0` nicht am Spieler.
            */}
            <div className="flex min-w-0 items-baseline gap-1.5">
              <span className={`${tier.name} truncate font-semibold`}>{character.name}</span>
              {character.playerName !== undefined && (
                <span className={`${tier.sub} min-w-0 truncate font-normal text-slate-500`}>
                  {character.playerName}
                </span>
              )}
            </div>
            <div className={`${tier.sub} truncate text-slate-400`}>
              {raceText} {classText && `· ${classText}`}
            </div>
          </div>
          {/*
            Die Marke „3 offen" — seine Wahl: „damit du es schon in der Liste
            siehst", ohne den Bogen zu öffnen. Nützlich nach dem Stufenaufstieg von
            drei Bögen. Was genau offen ist, steht im Titel; auf der Karte wäre es
            zu viel Text für 390px.
          */}
          <div className={`${tier.gap} flex shrink-0 flex-col items-end gap-1`}>
            {open.length > 0 && (
              <span
                title={S.open.markTitle(open)}
                aria-label={S.open.markTitle(open)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${OPEN_MARK}`}
              >
                {S.open.mark(open.length)}
              </span>
            )}
            {/* Nur noch die Stufe — sie kommt aus `character.levels`, nicht aus einer
                Ableitung, und steht deshalb sofort da. */}
            <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-xs font-semibold text-amber-300">
              {S.sheet.level} {character.levels.length}
            </span>
          </div>
        </Link>
        <button
          onClick={props.onOpenActions}
          aria-label={`${character.name}: Aktionen`}
          className={`${tier.action} shrink-0 rounded-lg text-slate-400 hover:bg-slate-800`}
        >
          ⋯
        </button>
      </Card>
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
            <IconInline name="draft" /> {draft.name}
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
