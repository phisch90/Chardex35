import { parseDice, rollDice, type SpellcraftCastPlan } from "@codex35/core";
import { S } from "../strings.js";
import { cryptoRng } from "../lib/rng.js";
import { useAppSettings } from "../lib/hooks.js";
import { useDiceStore } from "../lib/diceStore.js";
import { BottomSheet, GhostButton, PrimaryButton } from "./bits.js";
import { Icon } from "./icons.js";

/**
 * Zaubern über eine Spellcraft-Probe — Martins Hausregel, Schritt für Schritt
 * mit den Zahlen DIESES Bogens. Dieselbe Bauart wie die Wirken-Anleitungen
 * (`AbilityGuideSheet`): die Regeln stehen im KERN (`engine/spellcraftCasting.ts`),
 * diese Datei zeigt nur an.
 *
 * Gebucht wird am Ende, nie beim Öffnen — wer nur nachlesen will, schließt das
 * Blatt und hat nichts ermüdet. Und gebucht wird, WAS PASSIERT IST: die Ermüdung
 * steigt bei jeder Nutzung (Philipps Klärung), der Patzer kostet zusätzlich
 * Schaden. Zwei Knöpfe, beide mit den Zahlen vorher; die Rücknahme hängt an der
 * aufrufenden Stelle.
 */
export function SpellcraftCastSheet(props: {
  plan: SpellcraftCastPlan;
  characterName: string;
  onClose: () => void;
  /** Bucht die Ermüdung — und beim Patzer zusätzlich den Schaden. */
  onBook: (outcome: "normal" | "critFail") => void;
}) {
  const { plan } = props;
  const { diceEnabled } = useAppSettings();
  const roll = useDiceStore((s) => s.roll);

  return (
    <BottomSheet open onClose={props.onClose} title={S.spells.craft.title(plan.level)}>
      <p className="text-xs leading-snug text-slate-400">{S.spells.craft.intro}</p>

      <ol className="mt-3 space-y-3">
        <li className="border-l-2 border-slate-700 pl-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-trim-400">
            1. {S.spells.craft.checkTitle}
          </div>
          <p className="mt-0.5 text-sm leading-snug text-slate-300">
            {S.spells.craft.check(plan.dc, plan.exhaustion, plan.effectiveLevel)}
          </p>
          {/* Grad 0 rechnet als 1 — der Satz steht nur, wo er gilt. */}
          {plan.level === 0 && (
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
              {S.spells.craft.levelZero}
            </p>
          )}
          {plan.roll !== null ? (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-xs">
                {plan.roll}
              </span>
              {/*
                Wirklich werfen, nicht bloß zeigen — und der Knopf existiert nur, wenn
                `parseDice` den Ausdruck liest. Genau hier ist schon einmal ein toter
                Würfelknopf entstanden (halbe Ränge, „1d20+4.5").
              */}
              {diceEnabled && parseDice(plan.roll) !== null && (
                <GhostButton
                  onClick={() => {
                    const expr = parseDice(plan.roll!);
                    if (expr === null) return;
                    rollDice(expr, cryptoRng);
                    roll(plan.roll!, `${props.characterName}: Spellcraft (DC ${plan.dc})`);
                  }}
                >
                  <Icon name="dice" size={16} />
                </GhostButton>
              )}
              <span className="text-[11px] text-slate-500">Spellcraft</span>
            </div>
          ) : (
            /*
              Spellcraft ist nur geübt nutzbar. Warnen statt sperren — aber ein
              Würfelknopf ohne Fertigkeit wäre ein Versprechen ohne Zahl.
            */
            <p className="mt-1 text-[11px] leading-snug text-amber-400">
              {S.spells.craft.noSkill}
            </p>
          )}
        </li>

        <li className="border-l-2 border-slate-700 pl-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-trim-400">
            2. {S.spells.craft.outcomesTitle}
          </div>
          <ul className="mt-0.5 space-y-1 text-sm leading-snug text-slate-300">
            <li className="text-emerald-400">{S.spells.craft.success}</li>
            <li className="text-emerald-300">{S.spells.craft.crit(plan.critFrom)}</li>
            <li>{S.spells.craft.fail}</li>
            <li className="text-rose-300">{S.spells.craft.critFail(plan.critFailDamage)}</li>
          </ul>
        </li>

        <li className="border-l-2 border-slate-700 pl-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-trim-400">
            3. {S.spells.craft.bookTitle}
          </div>
          <p className="mt-0.5 text-sm leading-snug text-slate-300">
            {S.spells.craft.bookHint(plan.exhaustion, plan.exhaustionAfter)}
          </p>
        </li>
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 pt-3">
        <GhostButton onClick={props.onClose}>{S.actions.cancel}</GhostButton>
        {/*
          Der Patzer ist der GEDÄMPFTE Knopf und steht vor dem Haupt-Knopf: der
          häufige Fall (geschafft oder daneben — beides kostet nur Ermüdung) gehört
          auf den kräftigen. Beide nennen ihre Zahlen selbst.
        */}
        <GhostButton onClick={() => props.onBook("critFail")}>
          {S.spells.craft.bookCritFail(plan.critFailDamage)}
        </GhostButton>
        <PrimaryButton onClick={() => props.onBook("normal")}>
          {S.spells.craft.book(plan.exhaustion, plan.exhaustionAfter)}
        </PrimaryButton>
      </div>
    </BottomSheet>
  );
}
