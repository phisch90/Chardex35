import { COMBAT_EXPERTISE_MAX } from "@codex35/core";
import { S } from "../../strings.js";
import { Card, Chip, GhostButton, SectionTitle } from "../../ui/bits.js";
import type { TabProps } from "./index.js";

/**
 * Kampfoptionen — was man von Runde zu Runde wählt.
 *
 * Angeboten wird nur, was der Charakter kann: ohne das Talent Power Attack
 * erscheint der Regler nicht. Ein Schalter für etwas, das die Figur nicht darf,
 * ist kein Angebot, sondern eine Falle.
 *
 * Defensiv kämpfen und totale Verteidigung braucht jeder — die stehen immer da.
 */
export function CombatOptionsCard({ character, sheet, save }: TabProps) {
  const options = character.combatOptions;
  const featIds = new Set(sheet.featIds);
  const has = (id: string) => featIds.has(id);

  const set = (patch: Partial<typeof options>) =>
    save((c) => void Object.assign(c.combatOptions, patch));

  const anyActive =
    options.powerAttack > 0 ||
    options.combatExpertise > 0 ||
    options.fightingDefensively ||
    options.totalDefense ||
    options.dodgeTarget.trim() !== "";

  return (
    <Card className={anyActive ? "border-amber-700/70" : ""}>
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>{S.combat.title}</SectionTitle>
        {anyActive && (
          <GhostButton
            onClick={() =>
              set({
                powerAttack: 0,
                combatExpertise: 0,
                fightingDefensively: false,
                totalDefense: false,
                dodgeTarget: "",
              })
            }
          >
            {S.combat.reset}
          </GhostButton>
        )}
      </div>
      <p className="mb-2 text-xs text-slate-500">{S.combat.hint}</p>

      <div className="space-y-2">
        {has("srd:feat:power-attack") && (
          <Stepper
            label={S.combat.powerAttack}
            hint={S.combat.powerAttackHint(sheet.bab)}
            value={options.powerAttack}
            max={sheet.bab}
            onChange={(v) => set({ powerAttack: v })}
          />
        )}
        {has("srd:feat:combat-expertise") && (
          <Stepper
            label={S.combat.combatExpertise}
            hint={S.combat.combatExpertiseHint(Math.min(COMBAT_EXPERTISE_MAX, sheet.bab))}
            value={options.combatExpertise}
            max={Math.min(COMBAT_EXPERTISE_MAX, sheet.bab)}
            onChange={(v) => set({ combatExpertise: v })}
          />
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Chip
            active={options.fightingDefensively && !options.totalDefense}
            onClick={() =>
              set({ fightingDefensively: !options.fightingDefensively, totalDefense: false })
            }
          >
            {S.combat.fightingDefensively}
          </Chip>
          <Chip
            active={options.totalDefense}
            onClick={() => set({ totalDefense: !options.totalDefense, fightingDefensively: false })}
          >
            {S.combat.totalDefense}
          </Chip>
        </div>

        {has("srd:feat:dodge") && (
          <label className="block pt-1">
            <span className="text-xs text-slate-400">{S.combat.dodgeTarget}</span>
            <input
              value={options.dodgeTarget}
              onChange={(e) => set({ dodgeTarget: e.target.value })}
              placeholder={S.combat.dodgePlaceholder}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
            />
          </label>
        )}
      </div>
    </Card>
  );
}

/**
 * Zahl mit −/+ statt Tastatur: am Tisch wird das mit einer Hand bedient, und
 * eine Bildschirmtastatur für „4" ist ein Ärgernis. Die Obergrenze steht daneben,
 * gesperrt wird nicht — wer sie überschreiten will, bekommt eine Warnung am
 * Bogen (die Regel dazu steht in der Engine).
 */
function Stepper(props: {
  label: string;
  hint: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <div className="text-sm">{props.label}</div>
        <div className="text-[11px] text-slate-500">{props.hint}</div>
      </div>
      <GhostButton disabled={props.value <= 0} onClick={() => props.onChange(props.value - 1)}>
        −
      </GhostButton>
      <span
        className={`w-8 text-center font-mono text-lg ${
          props.value > 0 ? "text-amber-300" : "text-slate-500"
        }`}
      >
        {props.value}
      </span>
      <GhostButton onClick={() => props.onChange(props.value + 1)}>+</GhostButton>
    </div>
  );
}
