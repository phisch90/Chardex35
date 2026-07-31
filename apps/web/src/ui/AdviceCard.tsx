import { ADVICE_ABILITY_LABEL, type Advice } from "@codex35/core";
import { S } from "../strings.js";
import { Card } from "./bits.js";

/**
 * Was für diese Volk-Klasse-Kombination zählt — der Kasten über den Attributsfeldern.
 *
 * Sein Wunsch, wörtlich: „eine Empfehlung für diese Kombination, welche Attribute wichtig
 * sind, idealerweise mit einem guten Mindestwert." Vorher standen dort sechs nackte
 * Felder; wer nicht weiß, dass ein Kleriker von WIS lebt, tippt seine gewürfelten Zahlen
 * irgendwohin.
 *
 * Die Farbe kommt über `tone`, NICHT als angehängte Klasse: Tailwind entscheidet bei
 * gleicher Spezifität nach der Reihenfolge im Stylesheet, und dort steht `slate` hinter
 * allen Buntfarben — ein angehängtes `bg-sky-950/40` bliebe wirkungslos (dritte
 * Anzeige-Falle in `CLAUDE.md`).
 *
 * Jede Zahl trägt ihren Grund. „WIS ab 14" allein ist eine Behauptung; „ab 14 gibt es
 * Bonus-Zauberplätze" kann er nachschlagen und mit seinem DM besprechen.
 */
export function AdviceCard({ advice, who }: { advice: Advice; who: string }) {
  if (advice.abilities.length === 0) return null;
  return (
    <Card tone="border-sky-800/60 bg-sky-950/30" className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
        {S.advice.abilityTitle(who)}
      </p>
      <ol className="space-y-1 text-sm">
        {advice.abilities.map((entry, i) => (
          <li key={entry.ability} className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-slate-500 tabular-nums">{i + 1}.</span>
            <span className="font-semibold text-slate-100">
              {ADVICE_ABILITY_LABEL[entry.ability]}
            </span>
            <span className="text-slate-300">{entry.why}</span>
            {entry.min !== undefined && (
              <span className="text-xs text-amber-300">
                {S.advice.fromValue(entry.min)}
                {entry.minWhy !== undefined && (
                  <span className="text-slate-500"> — {entry.minWhy}</span>
                )}
              </span>
            )}
          </li>
        ))}
      </ol>
      {advice.raceNote !== undefined && (
        <p className="text-xs leading-snug text-slate-400">{advice.raceNote}</p>
      )}
      <p className="text-[11px] leading-snug text-slate-500">{S.advice.disclaimer}</p>
    </Card>
  );
}
