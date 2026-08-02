import { issuesForTab, muteIssue, unmuteIssue, type Character, type DerivedIssue, type DerivedSheet, type IssueTab } from "@codex35/core";
import { S } from "../strings.js";
import { Card, GhostButton, OPEN_CARD, SectionTitle } from "./bits.js";

/**
 * Die Hinweise EINES Reiters — oben, wo der Punkt an der Reiterleiste hinführt.
 *
 * Vorher stand eine Sammelkarte ganz unten im Werte-Reiter, und zwei Reiter
 * teilten sie per `filter` nach Kennung auf. Wer sie nicht suchte, sah sie nicht,
 * und der dritte verortete Hinweis wäre in keiner der beiden gelandet. Jetzt trägt
 * jede Warnung ihren Reiter (`DerivedIssue.tab`), und diese Karte steht auf jedem.
 *
 * „Passt so" ist die zweite Hälfte davon. Ein Hinweis, der nicht verstummen kann,
 * wird zur Tapete: wer einen Talent-Slot absichtlich aufspart, will nicht bei jedem
 * Blick auf den Bogen daran erinnert werden. Die Menge merkt sich mit — kommt ein
 * zweiter Slot dazu, meldet sich die App wieder (siehe `muteIssue`).
 */
export function IssueCard(props: {
  sheet: DerivedSheet;
  tab: IssueTab;
  save: (mutate: (c: Character) => void) => void;
}) {
  const open = issuesForTab(props.sheet, props.tab);
  const muted = issuesForTab(props.sheet, props.tab, { muted: true });
  if (open.length === 0 && muted.length === 0) return null;

  const mute = (issue: DerivedIssue) =>
    props.save((c) => void (c.mutedWarnings = muteIssue(c.mutedWarnings, issue)));
  const unmute = (issue: DerivedIssue) =>
    props.save((c) => void (c.mutedWarnings = unmuteIssue(c.mutedWarnings, issue)));

  return (
    /* Dieselbe Farbe wie der Punkt, der hierher führt — sonst zeigt ein rosé Punkt
       auf eine amber Karte, und man sucht weiter. */
    <Card tone={OPEN_CARD}>
      {open.length > 0 && (
        <>
          <SectionTitle>{S.misc.issues}</SectionTitle>
          <ul className="space-y-1.5">
            {open.map((issue, i) => (
              <li key={i} className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 text-xs leading-snug text-rose-200">
                  {issue.message}
                </span>
                {/*
                  Nur abstellbar, was auch Absicht sein KANN. „Voraussetzung nicht
                  erfüllt" trägt keinen Schlüssel — das ist ein Fehler im Aufbau, und
                  ihn wegzutippen hieße, ihn zu vergessen.
                */}
                {issue.muteKey !== undefined && (
                  <GhostButton onClick={() => mute(issue)} title={S.open.muteHint}>
                    {S.open.mute}
                  </GhostButton>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {/*
        Der Rückweg. Ohne ihn wäre „passt so" endgültig — und ein Schalter ohne
        Rückweg ist in dieser App dasselbe wie Löschen.
      */}
      {muted.length > 0 && (
        <div className={open.length > 0 ? "mt-2 border-t border-slate-800 pt-2" : ""}>
          <p className="text-[11px] text-slate-500">{S.open.mutedCount(muted.length)}</p>
          <ul className="mt-1 space-y-1">
            {muted.map((issue, i) => (
              <li key={i} className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 text-[11px] leading-snug text-slate-500">
                  {issue.message}
                </span>
                <GhostButton onClick={() => unmute(issue)}>{S.open.unmute}</GhostButton>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
