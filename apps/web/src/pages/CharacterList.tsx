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
import { IconInline } from "../ui/icons.js";
import { ClassMark } from "../ui/ClassMark.js";
import { useCharacters, useCompendium, useHouseRules } from "../lib/hooks.js";
import { CharacterRepo } from "../db/repo.js";
import { importEnvelope, type ImportResult } from "../lib/transfer.js";
import { Card, GhostButton, OPEN_MARK } from "../ui/bits.js";
import { campaignLook } from "../ui/campaignColors.js";
import { cardTier, type CardTier } from "../ui/cardTier.js";
import { CharacterActionsSheet, DiscardDraftButton } from "../ui/CharacterActions.js";
import { BulkDeleteBar } from "../ui/BulkDelete.js";
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

  /*
    Aufräumen — sein Auftrag: „Mach mal die Char Liste sauber." Der Modus ist AUS, bis
    er ihn einschaltet: eine Liste, in der ein Tap etwas ankreuzt statt den Bogen zu
    öffnen, wäre am Tisch die falsche Antwort auf den häufigsten Handgriff.

    Die Auswahl steht als Menge von KENNUNGEN und nicht als Charaktere: die Liste kommt
    live aus der Datenbank, und ein festgehaltenes Objekt wäre nach dem ersten Löschen
    ein Stand von vorhin.
  */
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleted, setDeleted] = useState(0);
  const toggle = (id: string) =>
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // Eine einzige Gruppe beschriftet sich nicht selbst — „Ohne Kampagne" über der
  // einzigen Liste wäre Lärm. `cardTier` rechnet mit derselben Regel.
  const withHeadings = groups.length > 1;

  return (
    <div className="space-y-3">
      {/*
        Sein Auftrag: „Bogen Version löschen." Die Marke mit dem Commit („✓ 748c1e4") stand
        hier zwischen Titel und Knopf und ist weg.

        Die AUSFÜHRLICHE Marke in den Einstellungen bleibt — und zwar mit Absicht: sie ist
        die einzige ehrliche Auskunft darüber, ob SEIN GERÄT den neuen Stand hat. Ein
        grüner Deploy-Lauf sagt nur, dass er auf dem Server liegt; monatelang stand in
        meinen Meldungen „läuft jetzt live", während seine Web-App unverändert weiterlief.
        Wer diese Marke ganz entfernt, nimmt genau die Anzeige weg, die das gemerkt hat.
      */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="shrink-0 text-xl font-bold">{S.nav.characters}</h1>
        <div className="flex shrink-0 items-center gap-2">
          {/*
            Der Auswahl-Schalter steht erst ab ZWEI Bögen da: bei einem gibt es nichts
            auszuwählen, und ein Knopf ohne Wirkung ist der Anfang eines Fehlerberichts.
          */}
          {real.length > 1 && (
            <GhostButton
              onClick={() => {
                setSelectMode(!selectMode);
                setSelected(new Set());
                setDeleted(0);
              }}
            >
              {selectMode ? S.bulk.done : S.bulk.select}
            </GhostButton>
          )}
          <Link
            to="/charaktere/neu"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
          >
            + {S.wizard.title}
          </Link>
        </div>
      </div>
      {deleted > 0 && !selectMode && (
        <p className="text-center text-xs text-emerald-400">{S.bulk.result(deleted)}</p>
      )}

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
              selectMode={selectMode}
              checked={selected.has(character.id)}
              onToggle={() => toggle(character.id)}
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

      {/*
        Die Leiste liegt fest am unteren Rand — deshalb braucht der Inhalt darüber
        Platz, solange sie da ist. Ein Polster für eine Leiste, die es gerade nicht
        gibt, ist die fünfte Falle; eines zu wenig verdeckt die letzte Karte.
      */}
      {selectMode && (
        <>
          <div className="h-16" />
          <BulkDeleteBar
            characters={real}
            selected={selected}
            onSelectAll={() => setSelected(new Set(real.map((c) => c.id)))}
            onClear={() => setSelected(new Set())}
            onDone={(count) => {
              setDeleted(count);
              setSelected(new Set());
              if (count > 0) setSelectMode(false);
            }}
          />
        </>
      )}
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
  /*
    Aufräum-Modus: dann kreuzt ein Tap an, statt den Bogen zu öffnen. Der Link wird
    dafür wirklich zu einem Knopf und nicht bloß überlagert — ein `<a>`, das man mit
    `preventDefault` festhält, navigiert am Handy trotzdem, sobald jemand lange
    drückt und „Öffnen" wählt.
  */
  selectMode: boolean;
  checked: boolean;
  onToggle: () => void;
  /** Fehlt bei Bögen ohne Kampagne — dann bleibt die Karte grau wie bisher. */
  look?: { card: string } | undefined;
}) {
  const { character, tier } = props;
  const { raceText, classText } = useRowSummary(character);
  const open = useOpenWork(character);

  /*
    Der INHALT ist in beiden Zuständen derselbe — nur die Hülle wechselt: sonst
    stünden Porträt, Name und Marken zweimal im Quelltext und wären beim nächsten
    Umbau zwei Wahrheiten.
  */
  const inhalt = (
    <>
      {character.portrait ? (
            <img
              src={character.portrait}
              alt=""
              className={`${tier.portrait} shrink-0 rounded-lg object-cover`}
            />
          ) : (
<div
              className={`${tier.portrait} flex shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400`}
            >
              {/*
                Ohne Porträt steht hier das KLASSENSYMBOL — beim Druiden ein Blatt, beim
                Barbaren ein Schädel. Vorher war es für alle derselbe Schild, und damit
                sahen zehn Karten gleich aus.

                Die Farbe ist bewusst gedämpft und NICHT die Klassenfarbe: auf der
                Startseite färbt die KAMPAGNE, und ein buntes Symbol je Karte würde mit der
                Gruppenfarbe streiten. Das Symbol sagt die Klasse, die Farbe die Gruppe.

                `fallback` fängt die Klassen ohne Thema (NPC, Prestige, selbstgebaut) —
                dort steht wie bisher der Schild.
              */}
              <ClassMark character={character} size={tier.markPx} fallback="characters" />
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
    </>
  );

  return (
    /*
      Karte ist KEIN Link: der Aktionsknopf darf nicht in einem Link liegen, sonst
      öffnet jeder Tap darauf auch den Bogen.

      `tone` und `padding` statt `className`: eine Klasse, die hinten angehängt wird,
      gewinnt nicht — Tailwind entscheidet nach der Reihenfolge im Stylesheet, und dort
      steht `slate` hinter allen Buntfarben. Die Kampagnenfarbe war so unsichtbar,
      obwohl sie am Element stand.
    */
    <Card
      {...(props.selectMode && props.checked
        ? { tone: "border-red-600 bg-red-950/30" }
        : props.look === undefined
          ? {}
          : { tone: props.look.card })}
      padding={tier.padding}
      className={`${tier.gap} flex items-center gap-3 transition-colors ${
        props.selectMode ? "" : "hover:border-amber-600/50"
      }`}
    >
      {props.selectMode ? (
        <>
          {/*
            Im Aufräum-Modus ist die GANZE Karte der Schalter — ein Kästchen von 20px
            wäre am Tisch mit dem Daumen das falsche Ziel. Das Kästchen selbst steht
            trotzdem da: es sagt, dass hier angekreuzt und nicht geöffnet wird.
          */}
          <button
            type="button"
            onClick={props.onToggle}
            aria-pressed={props.checked}
            aria-label={`${character.name} auswählen`}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span
              aria-hidden
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                props.checked
                  ? "border-red-500 bg-red-700 text-white"
                  : "border-slate-600 text-transparent"
              }`}
            >
              ✓
            </span>
            {inhalt}
          </button>
        </>
      ) : (
        <>
          <Link
            to="/charaktere/$charId"
            params={{ charId: character.id }}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            {inhalt}
          </Link>
          <button
            onClick={props.onOpenActions}
            aria-label={`${character.name}: Aktionen`}
            className={`${tier.action} shrink-0 rounded-lg text-slate-400 hover:bg-slate-800`}
          >
            ⋯
          </button>
        </>
      )}
    </Card>
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
