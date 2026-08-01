import type { DerivedIssue } from "@codex35/core";
import { S } from "../strings.js";
import { Card, GhostButton, PrimaryButton, SectionTitle } from "./bits.js";

/**
 * „Da ist noch was offen" — die Rückfrage, bevor der Assistent bzw. der
 * Stufenaufstieg abschließt.
 *
 * Seine Wahl war „Warnen und einmal nachfragen": es SPERRT nichts, aber man drückt
 * nicht versehentlich vorbei. Das passt zum Grundsatz dieses Projekts — warnen
 * statt sperren, der DM hat Recht —, und der Satz darunter sagt genau das.
 *
 * Gezeigt wird nur der AUFBAU (`openBuildWork`), nicht das Tagesgeschäft. Sonst
 * bekäme jeder neue Zauberer die Rückfrage („23 Zauberplätze nicht belegt"), und
 * eine Rückfrage, die immer kommt, klickt man blind weg.
 */
export function OpenWorkConfirm(props: {
  open: readonly DerivedIssue[];
  /** Der Satz unter der Liste — beim Anlegen und beim Aufstieg verschieden. */
  hint: string;
  onConfirm: () => void;
  /** Springt zurück zur ersten offenen Stelle. Fehlt, wenn es nichts anzuspringen gibt. */
  onBack?: (() => void) | undefined;
  onCancel: () => void;
}) {
  return (
    <Card tone="border-amber-700 bg-amber-950/30">
      <SectionTitle>{S.open.confirmTitle}</SectionTitle>
      <ul className="list-inside list-disc space-y-0.5 text-xs leading-snug text-amber-200">
        {props.open.map((issue, i) => (
          <li key={i}>{issue.message}</li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{props.hint}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {/*
          Nachtragen steht ZUERST, weil es das ist, was er in dem Moment
          wahrscheinlich will — die Rückfrage kommt ja, weil etwas fehlt.
        */}
        {props.onBack !== undefined && (
          <PrimaryButton onClick={props.onBack}>{S.open.confirmBack}</PrimaryButton>
        )}
        <GhostButton onClick={props.onConfirm}>{S.open.confirmYes}</GhostButton>
        <GhostButton onClick={props.onCancel}>{S.actions.cancel}</GhostButton>
      </div>
    </Card>
  );
}
