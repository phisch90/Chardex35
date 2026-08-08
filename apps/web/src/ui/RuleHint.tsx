import { useState } from "react";
import { useAppSettings } from "../lib/hooks.js";

/**
 * Eine Regel-ERKLÄRUNG — und zwar die einzige Stelle, die entscheidet, ob sie ohne Tap
 * dasteht.
 *
 * Sein Auftrag: „Kurzbeschreibungen optional machen. Ich würde es für mich zum Beispiel
 * deaktivieren, denn ich kenne die Fähigkeiten meines Charakters … Alle Beschreibungen
 * sollen aber über antippen und ausklappen weiterhin nachlesbar sein."
 *
 * **Warum ein Bauteil und nicht ein `if` je Stelle:** sonst steht die Frage „darf das
 * hier weg?" an jeder Stelle noch einmal, und beim nächsten neuen Text vergisst man sie.
 * Genau so ist in diesem Projekt schon einmal eine Regel in drei Ansichten gewandert und
 * stand am Ende in keiner richtig.
 *
 * **Was hier NICHT hineingehört: ein Zustand.** „Vom Angriff auf den Schaden, höchstens
 * 6" ist eine Erklärung — sie sagt, wie die Regel funktioniert, und wer sie kennt,
 * braucht sie nicht. „Gilt für dein Kurzschwert" ist ein Zustand: er sagt, was an DIESEM
 * Bogen gerade wahr ist, und den kann man nicht auswendig können. Dasselbe für
 * Bedienhinweise („Gilt für diese Runde") — wer die versteckt, macht aus jedem Knopf ein
 * Rätsel. Beide bleiben deshalb gewöhnliche Absätze und laufen nicht durch dieses
 * Bauteil.
 *
 * Ist der Schalter aus, bleibt ein ▸ mit dem Namen der Sache stehen — dieselbe Sprache
 * wie „Infos ▸" an den Kacheln und wie die Talentzeilen. Ein Text ganz ohne Weg dorthin
 * wäre nicht ausgeblendet, sondern gelöscht.
 */
export function RuleHint(props: {
  /** Der Erklärtext selbst. */
  children: string;
  /**
   * Wofür die Erklärung gilt — steht am ▸, wenn sie zugeklappt ist.
   *
   * Verpflichtend, obwohl ein schlichtes „Erklärung ▸" bequemer wäre: bei vier
   * Kampfoptionen untereinander stünde sonst viermal dasselbe Wort, und man müsste raten,
   * welches ▸ zu welcher Zeile gehört.
   */
  label: string;
  className?: string;
}) {
  const { ruleHints } = useAppSettings();
  const [open, setOpen] = useState(false);
  const stil = `text-[11px] leading-snug text-slate-500 ${props.className ?? ""}`;

  if (ruleHints) return <p className={stil}>{props.children}</p>;
  if (open) {
    return (
      <button type="button" onClick={() => setOpen(false)} className={`${stil} text-left`}>
        <span aria-hidden="true">▾ </span>
        {props.children}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      /*
        `min-h-6` und volle Trefferfläche: das ▸ ist am Tisch ein Daumenziel und keine
        Fußnote. Ohne die Mindesthöhe wäre es 11 px hoch — dieselbe Falle wie beim
        Anfasser zum Ziehen, der mit 26×22 px zu klein war.
      */
      className={`${stil} flex min-h-6 items-center text-left`}
      aria-label={`Erklärung zu ${props.label} zeigen`}
    >
      <span aria-hidden="true">▸ </span>
      <span className="ml-1">{props.label}</span>
    </button>
  );
}
