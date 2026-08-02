import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  applyRest,
  planRest,
  snapshotForRest,
  undoRest,
  type Character,
  type DerivedSheet,
  type RestPlan,
  type RestScope,
  type RestUndo,
} from "@codex35/core";
import { S } from "../strings.js";
import { CharacterRepo } from "../db/repo.js";
import { buildCharacterExport, shareOrDownload } from "../lib/transfer.js";
import { useAllEntities, useHouseRules } from "../lib/hooks.js";
import { BottomSheet, GhostButton } from "./bits.js";
import { CampaignPicker } from "./CampaignPicker.js";
import { campaignLook } from "./campaignColors.js";

/**
 * Alles, was man mit einem Charakter TUN kann, an einer Stelle — und das
 * Löschen bewusst weit weg vom Daumen.
 *
 * Der Weg zum Löschen ist absichtlich lang: Sheet öffnen → Gefahrenzone
 * aufklappen → Löschen wählen → den Namen abtippen. Ein Fehlgriff kostet
 * sonst einen Bogen, den zwei Jahre Spielzeit gefüllt haben — und über den
 * Geräte-Abgleich wäre er auf dem iPad gleich mit weg.
 */
/**
 * Der Bestätigungscode fürs Löschen.
 *
 * Eine Stelle, weil er im Hinweis, im Platzhalter, in der Vorlese-Beschriftung UND
 * im Vergleich vorkommt. Vier Kopien laufen irgendwann auseinander, und dann steht
 * im Text eine Zahl, die der Knopf nicht annimmt.
 */
const DELETE_CODE = "1337";

export function CharacterActionsSheet(props: {
  character: Character;
  open: boolean;
  onClose: () => void;
  /** Wird nach dem Löschen gerufen (z.B. um von der Bogenseite wegzugehen). */
  onDeleted?: () => void;
  /**
   * Der abgeleitete Bogen — nur vom Bogen selbst hereingegeben, nicht aus der
   * Charakterliste.
   *
   * Zwei Gründe. Erstens rechnet die Rast mit lebenden Zahlen (die wirkliche
   * Grenze eines Zählers steht nicht am Zähler), und die stehen nur hier. Zweitens
   * soll man keinen Bogen rasten können, den man gar nicht ansieht — in der Liste
   * fehlt der Bogen, also fehlt die Rast. Und geholt wird er NICHT hier drin: die
   * Liste würde ihn dann je Zeile aufziehen.
   */
  sheet?: DerivedSheet | undefined;
}) {
  const navigate = useNavigate();
  const entities = useAllEntities();
  const houseRules = useHouseRules();
  const [dangerOpen, setDangerOpen] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState<string | null>(null);
  /*
    Die Rast hat drei Zustände, und das ist der ganze Punkt: „zu" → „gefragt, mit
    Zahlen" → „gemacht, mit Rücknahme". Der Mond hatte nur einen.
  */
  const [restPlan, setRestPlan] = useState<RestPlan | null>(null);
  const [restUndo, setRestUndo] = useState<RestUndo | null>(null);
  const [restDone, setRestDone] = useState<RestPlan | null>(null);
  const [campaignOpen, setCampaignOpen] = useState(false);

  const character = props.character;
  const isDraft = character.draftOf !== undefined;

  const close = () => {
    setRestPlan(null);
    setRestDone(null);
    setRestUndo(null);
    // Beim Schließen alles wieder zusammenklappen: der nächste Aufruf soll
    // nicht mit aufgeklappter Gefahrenzone beginnen.
    setDangerOpen(false);
    setDeleteArmed(false);
    setCampaignOpen(false);
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

  /*
    Bestätigt wird mit einem festen Code, nicht mit dem Namen — Philipps
    Entscheidung: „Das Name abtippen zum löschen finde ich übertrieben."

    Was dabei verloren geht, ist nicht der Schutz vor dem Löschen an sich (die
    Gefahrenzone und der zweite Schritt bleiben), sondern der Schutz davor, den
    FALSCHEN Bogen zu löschen: einen Namen kann man nur abtippen, wenn man ihn
    gelesen hat, „1337" tippt man beim dritten Mal blind. Deshalb steht der Name
    jetzt groß und rot über der Abfrage — gesehen werden muss er weiterhin, nur
    nicht mehr getippt.
  */
  const codeMatches = typed.trim() === DELETE_CODE;

  /*
    Ausgeführt wird GENAU der Plan, der in der Rückfrage stand — nicht ein neu
    gerechneter. Sonst könnte zwischen Lesen und Tippen etwas dazwischenkommen
    (ein Abgleich vom iPad), und dann passiert etwas anderes als angesagt.
  */
  const askRest = (scope: RestScope) => {
    const plan = planRest(character, props.sheet!, scope);
    /*
      Nichts aufzufüllen: dann sagt sie das, statt eine Rückfrage zu stellen, deren
      Antwort nichts ändert.

      ABER mit Grund, wenn es einen gibt. Vorher stand hier immer „alle Plätze sind
      frei und die Zähler voll" — auch dann, wenn ein Zähler bei 2 von 3 stand und
      bloß nicht mitrastet. Das war eine falsche Auskunft, und sie fiel erst im
      gebauten Bogen auf.
    */
    if (plan.nothingToDo) {
      setNote(
        plan.skipped.length === 0
          ? S.rest.nothing
          : S.rest.nothingSkipped(
              plan.skipped.map(
                (line) =>
                  `${line.name}: ${S.rest.skippedReasons[line.reason] ?? line.reason}`,
              ),
            ),
      );
    } else setRestPlan(plan);
  };

  const doRest = async (plan: RestPlan) => {
    let undo: RestUndo | null = null;
    await CharacterRepo.mutate(character.id, (c) => {
      undo = snapshotForRest(c, plan);
      applyRest(c, plan);
    });
    setRestUndo(undo);
    setRestDone(plan);
    setRestPlan(null);
    setNote(null);
  };

  const undoTheRest = async () => {
    const undo = restUndo;
    if (undo === null) return;
    await CharacterRepo.mutate(character.id, (c) => void undoRest(c, undo));
    setRestDone(null);
    setRestUndo(null);
    setNote(S.rest.undone);
  };

  return (
    <BottomSheet open={props.open} onClose={close} title={character.name}>
      <div className="space-y-2">
        {/*
          Die Rast. Sein Auftrag, wörtlich: „Rasten soll irgendwo anders zentral
          sein nicht ein Button den man versehentlich drueckt ohne zu wissen was
          passiert ist."

          Also: an EINER Stelle, für alle Zauberklassen und Zähler zusammen, mit
          den echten Zahlen VORHER und einer Rücknahme danach. Sie steht oben, weil
          sie der häufigste Handgriff in diesem Blatt ist — Kopieren und Teilen
          sind es nicht.
        */}
        {props.sheet !== undefined && restDone === null && restPlan === null && (
          <>
            <ActionRow
              icon="😴"
              label={S.rest.action}
              hint={S.rest.hint}
              onClick={() => askRest("full")}
            />
            {/*
              Die kurze Pause. Sein Wort: „Ja, ohne Zauberplätze." Im Regelwerk gibt
              es sie so nicht — dort füllen sich Fähigkeiten pro Tag erst nach acht
              Stunden. Hausregel seines Tisches, und die gewinnt.

              Dieselbe Rückfrage, derselbe Ablauf: nur der Umfang unterscheidet
              sich, und das steht im Plan. Zwei getrennte Abläufe wären zwei
              Stellen, die auseinanderlaufen können.
            */}
            <ActionRow
              icon="☕"
              label={S.rest.shortAction}
              hint={S.rest.shortHint}
              onClick={() => askRest("short")}
            />
          </>
        )}
        {restPlan !== null && <RestConfirm plan={restPlan} onCancel={() => setRestPlan(null)} onConfirm={() => void doRest(restPlan)} />}
        {restDone !== null && (
          <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 p-3">
            <p className="text-sm font-medium text-emerald-200">{S.rest.doneTitle}</p>
            <RestLines plan={restDone} />
            <div className="mt-2">
              <GhostButton onClick={() => void undoTheRest()}>{S.rest.undo}</GhostButton>
            </div>
          </div>
        )}
        {/*
          Die Kampagne. Von der Startseite aus ist das die erste Zeile im Blatt (die
          Rast erscheint dort nicht, weil der abgeleitete Bogen fehlt) — und genau so
          wollte er es: Karte antippen, ⋯, Kampagne eintragen, ohne den Bogen zu
          öffnen. Aufklappen statt einer eigenen Seite, damit die Farbreihe im selben
          Blick liegt wie die Karte, die sie färbt.
        */}
        {campaignOpen ? (
          <div className="rounded-lg border border-slate-700 p-3">
            <CampaignPicker
              value={character.campaign}
              ownId={character.id}
              onChange={(next) => {
                void CharacterRepo.mutate(character.id, (c) => {
                  if (next === undefined) delete c.campaign;
                  else c.campaign = next;
                }).catch((error: unknown) => {
                  console.error(`Kampagne an ${character.name} fehlgeschlagen:`, error);
                });
              }}
            />
            <div className="mt-2">
              <GhostButton onClick={() => setCampaignOpen(false)}>{S.actions.done}</GhostButton>
            </div>
          </div>
        ) : (
          <ActionRow
            icon={
              character.campaign === undefined
                ? "🏷️"
                : /* Der Punkt in der Farbe der Kampagne: er sieht schon in der Zeile,
                     was eingetragen ist, ohne sie aufzuklappen. */
                  undefined
            }
            dot={
              character.campaign === undefined
                ? undefined
                : campaignLook(character.campaign.color).dot
            }
            label={S.campaign.label}
            hint={character.campaign?.name ?? S.campaign.none}
            onClick={() => setCampaignOpen(true)}
          />
        )}

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
                  {/* Der Name so groß, dass man ihn nicht übersehen kann: er ist
                      die einzige Stelle, an der noch auffällt, wenn man im falschen
                      Bogen steht. */}
                  <p className="text-sm text-slate-300">
                    Wirklich <strong className="text-red-300">{character.name}</strong> löschen?
                  </p>
                  <p className="text-xs text-slate-400">
                    Tippe <strong>{DELETE_CODE}</strong> zum Bestätigen.
                  </p>
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    /* Ziffernblock direkt auf dem Handy — der Code ist eine Zahl. */
                    inputMode="numeric"
                    placeholder={DELETE_CODE}
                    aria-label={`${DELETE_CODE} tippen, um ${character.name} zu löschen`}
                    className="w-full rounded-lg border border-red-800 bg-slate-950 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void doDelete()}
                      disabled={!codeMatches}
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

/**
 * Was die Rast ändern wird — mit Zahlen, nicht mit „füllt alles auf".
 *
 * Das ist der ganze Unterschied zum Mond: er tat es einfach. Hier steht vorher
 * da, welche Klasse wie viele Plätze zurückbekommt und welcher Zähler von wo nach
 * wo geht. Und was in Ruhe bleibt, steht auch da — ein Zähler, der stillschweigend
 * nicht mitrastet, ist schlimmer als einer, der es begründet.
 */
function RestLines(props: { plan: RestPlan }) {
  const { plan } = props;
  return (
    <>
      <ul className="mt-1 space-y-0.5 text-xs leading-snug text-slate-300">
        {plan.slots.map((line) => (
          <li key={line.classId}>{S.rest.slotLine(line.className, line.freed)}</li>
        ))}
        {plan.trackers.map((line) => (
          <li key={line.id}>{S.rest.trackerLine(line.name, line.from, line.to)}</li>
        ))}
      </ul>
      {plan.skipped.length > 0 && (
        <>
          <p className="mt-1.5 text-[11px] uppercase tracking-wide text-slate-500">
            {S.rest.skippedTitle}
          </p>
          <ul className="space-y-0.5 text-[11px] leading-snug text-slate-500">
            {plan.skipped.map((line) => (
              <li key={line.name}>
                {line.name} — {S.rest.skippedReasons[line.reason] ?? line.reason}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function RestConfirm(props: { plan: RestPlan; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="rounded-lg border border-amber-800/60 bg-amber-950/20 p-3">
      <p className="text-sm font-medium text-amber-200">
        {props.plan.scope === "short" ? `${S.rest.shortAction} — ${S.rest.confirmTitle}` : S.rest.confirmTitle}
      </p>
      <RestLines plan={props.plan} />
      {/*
        Bei der kurzen Pause muss dastehen, was NICHT passiert. Sonst tippt er sie
        an, die Plätze sind noch verbraucht, und das sieht wie ein Fehler aus.
      */}
      {props.plan.scope === "short" && (
        <p className="mt-1 text-[11px] leading-snug text-slate-400">{S.rest.slotsUntouched}</p>
      )}
      {/* Die zwei offenen Regelfragen benennen, statt sie zu erfinden. */}
      <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{S.rest.hpNote}</p>
      <div className="mt-2 flex items-center gap-2">
        <GhostButton onClick={props.onConfirm}>{S.rest.confirm}</GhostButton>
        <GhostButton onClick={props.onCancel}>{S.rest.cancel}</GhostButton>
      </div>
    </div>
  );
}

function ActionRow(props: {
  icon?: string | undefined;
  /**
   * Ein farbiger Punkt anstelle des Symbols — für die Kampagnenzeile, die ihre
   * eigene Farbe zeigt. Tailwind-Klasse, kein Farbwert: gebaut werden Klassen hier
   * nie zur Laufzeit (siehe `campaignColors.ts`).
   */
  dot?: string | undefined;
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
      {props.dot === undefined ? (
        <span className="text-lg leading-none">{props.icon}</span>
      ) : (
        <span className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${props.dot}`} />
      )}
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
