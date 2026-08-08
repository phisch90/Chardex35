import { parseDice, rollDice, type AbilityGuide } from "@codex35/core";
import { S } from "../strings.js";
import { cryptoRng } from "../lib/rng.js";
import { useAppSettings } from "../lib/hooks.js";
import { useDiceStore } from "../lib/diceStore.js";
import { BottomSheet, GhostButton, PrimaryButton } from "./bits.js";
import { Icon } from "./icons.js";

/**
 * „Wirken" — die Fähigkeit Schritt für Schritt, mit den Zahlen DIESES Bogens.
 *
 * Sein Auftrag: „bei Turn undead hätte ich gerne einen Button der sagt ‚wirken' dann
 * öffnet sich eine infobox, die die Fähigkeit Schritt für Schritt durch geht. Ich glaub
 * Ziele auswählen, würfeln, schaden etc. ka. So dass ich das korrekt ausführe."
 *
 * Drei Entscheidungen stecken darin:
 *
 * **Die Regeln stehen im KERN** (`engine/abilityGuide.ts`), diese Datei zeigt nur an. Was
 * hier gerechnet würde, hätte keinen Test — und die Vertreibungsprobe ist genau die Sorte
 * Zahl, bei der ein Fehler am Tisch nicht auffällt, weil sie plausibel aussieht.
 *
 * **Gebucht wird am Ende, nicht beim Öffnen.** Gefragt und entschieden: „Ja, am Ende mit
 * Ansage." Wer nur nachlesen will, schließt das Blatt und hat nichts verbraucht — und der
 * Knopf sagt vorher, was er kostet. Dieselbe Trennung wie zwischen `planRest` und
 * `applyRest`: was er gelesen hat, passiert danach.
 *
 * **Die Würfel-Knöpfe erscheinen nur, wenn die Würfelfunktion an ist.** Sonst wäre es ein
 * Knopf, den seine eigene Einstellung abgeschaltet hat — und die Zahl steht ohnehin als
 * Ausdruck daneben, damit man sie am Tisch selbst werfen kann.
 */
export function AbilityGuideSheet(props: {
  guide: AbilityGuide;
  /** Wie viele Einsätze noch da sind — `undefined`, wenn der Zähler keine Grenze hat. */
  left: number;
  onClose: () => void;
  /** Bucht den Einsatz. Die Rücknahme hängt an der aufrufenden Stelle. */
  onSpend: () => void;
  characterName: string;
}) {
  const { diceEnabled } = useAppSettings();
  const roll = useDiceStore((s) => s.roll);

  return (
    <BottomSheet open onClose={props.onClose} title={props.guide.title}>
      <ol className="space-y-3">
        {props.guide.steps.map((step, i) => (
          <li key={step.title} className="border-l-2 border-slate-700 pl-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-trim-400">
              {/*
                Die Nummer steht DA, und zwar als Zahl und nicht als Aufzählungspunkt:
                „Schritt für Schritt" heißt, dass man am Tisch sagen kann, wo man ist.
              */}
              {i + 1}. {step.title}
            </div>
            <p className="mt-0.5 text-sm leading-snug text-slate-300">{step.text}</p>
            {step.roll !== undefined && (
              <div className="mt-1.5 flex items-center gap-2">
                <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-xs">
                  {step.roll}
                </span>
                {diceEnabled && parseDice(step.roll) !== null && (
                  <GhostButton
                    onClick={() => {
                      /*
                        Wirklich werfen und nicht bloß den Ausdruck zeigen. Genau hier ist
                        in diesem Projekt schon einmal ein toter Knopf entstanden: bei
                        einer krummen Zahl gab `parseDice` `null` zurück, und der Knopf tat
                        wortlos nichts. Deshalb steht die Prüfung auch in der Bedingung
                        darüber — kein Knopf ohne Wurf.
                      */
                      const expr = parseDice(step.roll!);
                      if (expr === null) return;
                      rollDice(expr, cryptoRng);
                      roll(step.roll!, `${props.characterName}: ${step.rollLabel ?? step.title}`);
                    }}
                  >
                    <Icon name="dice" size={16} />
                  </GhostButton>
                )}
                <span className="text-[11px] text-slate-500">{step.rollLabel}</span>
              </div>
            )}
          </li>
        ))}
      </ol>

      {/*
        Der letzte Schritt ist das Buchen — und er sagt die ZAHLEN vorher, genau wie die
        Rast. „Zieht 1 ab" allein wäre eine Ansage ohne Nachprüfbarkeit; „7 → 6" ist eine.
      */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
        <span className="text-xs text-slate-400">
          {props.left > 0
            ? S.trackers.guideSpendHint(props.guide.cost, props.left)
            : S.trackers.guideEmpty}
        </span>
        <div className="flex shrink-0 gap-2">
          <GhostButton onClick={props.onClose}>{S.actions.cancel}</GhostButton>
          <PrimaryButton onClick={props.onSpend} disabled={props.left <= 0}>
            {S.trackers.guideSpend}
          </PrimaryButton>
        </div>
      </div>
    </BottomSheet>
  );
}
