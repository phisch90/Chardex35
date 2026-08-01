import type { Character } from "../schema/character.js";
import type { DerivedIssue, DerivedSheet, IssueTab } from "./types.js";

/**
 * Was mit den Warnungen des Bogens passiert — an EINER Stelle.
 *
 * Vorher hat die Anzeige selbst gefiltert: `sheet.issues.filter((i) => i.code !==
 * "combat-option")` im Werte-Reiter und dasselbe mit `===` im Kampf-Reiter. Zwei
 * Filter, die nur zusammen vollständig sind — und beim dritten verorteten Hinweis
 * hätte man beide anfassen müssen, oder die Meldung wäre in keinem der beiden
 * gelandet. Genau die Art Lücke, in der eine Warnung still verschwindet.
 *
 * Jetzt trägt jede Warnung ihren Reiter (`DerivedIssue.tab`), und hier steht die
 * Zuordnung: `issuesForTab` gibt die eines Reiters, `openIssues` die sichtbaren
 * insgesamt, `tabsWithIssues` die Menge für den Punkt an der Reiterleiste.
 */

/** Der Reiter, auf dem eine Warnung ohne eigenen Ort landet. */
export const FALLBACK_ISSUE_TAB: IssueTab = "stats";

/** Sichtbar heißt: nicht mit „passt so" abgestellt. */
export function openIssues(sheet: Pick<DerivedSheet, "issues">): DerivedIssue[] {
  return sheet.issues.filter((i) => i.muted !== true);
}

/**
 * Die sichtbaren OHNE das Tagesgeschäft — für jede Ansicht, in der es noch kein
 * „heute" gibt: die Zusammenfassung im Assistenten und die des Stufenaufstiegs.
 *
 * Der Unterschied zu `openBuildWork`: hier bleiben auch die Warnungen drin, die
 * keine Menge haben („Voraussetzung nicht erfüllt", „Ränge über dem Maximum") —
 * die gehören in eine Zusammenfassung, nur eben nicht in die Rückfrage.
 */
export function buildIssues(sheet: Pick<DerivedSheet, "issues">): DerivedIssue[] {
  return openIssues(sheet).filter((i) => i.daily !== true);
}

/** Die abgestellten — für „wieder zeigen". Ohne sie wäre „passt so" endgültig. */
export function mutedIssues(sheet: Pick<DerivedSheet, "issues">): DerivedIssue[] {
  return sheet.issues.filter((i) => i.muted === true);
}

/**
 * Die Warnungen dieses Reiters. Ortlose Meldungen (fehlende Verweise, nicht
 * unterstützte Formeln) landen auf `FALLBACK_ISSUE_TAB` — sichtbar irgendwo ist
 * besser als sauber nirgends.
 */
export function issuesForTab(
  sheet: Pick<DerivedSheet, "issues">,
  tab: IssueTab,
  options: { muted?: boolean } = {},
): DerivedIssue[] {
  const want = options.muted === true;
  return sheet.issues.filter(
    (i) => (i.muted === true) === want && (i.tab ?? FALLBACK_ISSUE_TAB) === tab,
  );
}

/** Welche Reiter einen Punkt bekommen — und wie viele Hinweise dort liegen. */
export function tabsWithIssues(sheet: Pick<DerivedSheet, "issues">): Map<IssueTab, number> {
  const out = new Map<IssueTab, number>();
  for (const issue of openIssues(sheet)) {
    const tab = issue.tab ?? FALLBACK_ISSUE_TAB;
    out.set(tab, (out.get(tab) ?? 0) + 1);
  }
  return out;
}

/**
 * „Passt so" für diese Warnung setzen — die Menge kommt MIT.
 *
 * Ohne `upTo` wäre der Schalter blind: wer einen Talent-Slot aufspart und das
 * einmal sagt, bekäme beim nächsten Stufenaufstieg auch den zweiten nicht mehr
 * gemeldet. Reine Funktion auf dem Charakter — sie schreibt nicht, sie gibt das
 * neue Feld zurück.
 */
export function muteIssue(
  muted: Character["mutedWarnings"],
  issue: Pick<DerivedIssue, "muteKey" | "open">,
): Character["mutedWarnings"] {
  if (issue.muteKey === undefined) return muted;
  const key = issue.muteKey;
  const upTo = issue.open ?? 0;
  const rest = muted.filter((m) => m.key !== key);
  return [...rest, { key, upTo }];
}

/** Und zurück. */
export function unmuteIssue(
  muted: Character["mutedWarnings"],
  issue: Pick<DerivedIssue, "muteKey">,
): Character["mutedWarnings"] {
  if (issue.muteKey === undefined) return muted;
  return muted.filter((m) => m.key !== issue.muteKey);
}

/**
 * Was am Bogen noch offen ist — für die Marke auf der Startseite und die
 * Rückfrage am Ende des Assistenten.
 *
 * Nur die OFFENEN Töpfe (`open`), nicht jede Warnung: „Voraussetzung nicht
 * erfüllt" ist ein Fehler im Aufbau und keine vergessene Eingabe, und auf der
 * Startseite wäre die Unterscheidung nicht zu sehen.
 */
export function openWork(sheet: Pick<DerivedSheet, "issues">): DerivedIssue[] {
  return openIssues(sheet).filter((i) => (i.open ?? 0) > 0);
}

/**
 * Dasselbe ohne das, was zum TAG gehört — für die Rückfrage am Ende des
 * Assistenten und des Stufenaufstiegs.
 *
 * Ohne diese Trennung hätte jeder neue Zauberer eine Rückfrage bekommen („23
 * Zauberplätze nicht belegt"), und eine Rückfrage, die immer kommt, klickt man
 * blind weg. Am Bogen bleibt der Hinweis, dort ist er richtig.
 */
export function openBuildWork(sheet: Pick<DerivedSheet, "issues">): DerivedIssue[] {
  return openWork(sheet).filter((i) => i.daily !== true);
}
