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
    options.dodgeActive ||
    options.twoWeaponFighting;

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
                dodgeActive: false,
                dodgeTarget: "",
                twoWeaponFighting: false,
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

        {/*
          Zweiwaffenkampf. Der Schalter erscheint, sobald in jeder Hand eine
          Nahkampfwaffe liegt — ob das der Fall ist, entscheidet die Engine
          (`twoWeaponPossible`) und nicht diese Datei: die Regel dahinter kennt
          drei Ausnahmen (Fernkampf zählt nicht, ein Zweihänder sperrt, der
          Rucksack ist keine Hand), und die hier nachzubauen wäre eine zweite
          Wahrheit.

          Steht er trotzdem an, obwohl die Hände nicht passen, bleibt die Zeile
          sichtbar — sonst könnte man einen angeschalteten Malus nicht mehr
          ausschalten. Die Engine warnt dazu.
        */}
        {(sheet.twoWeaponPossible || options.twoWeaponFighting) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Chip
              active={options.twoWeaponFighting}
              onClick={() => set({ twoWeaponFighting: !options.twoWeaponFighting })}
            >
              {S.combat.twoWeapon}
            </Chip>
            <span className="text-[11px] text-slate-500">{S.combat.twoWeaponHint}</span>
          </div>
        )}

        {/*
          Dodge als SCHALTER, und zwar in derselben Reihe wie die anderen
          Kampfoptionen — nicht als Textfeld weiter unten. Vorher entstand der
          Bonus nur, wenn man einen Gegnernamen eintippte; im Kampf tippt niemand,
          und damit war das Talent praktisch aus. Der Name bleibt möglich, ist aber
          freiwillig und erscheint erst, wenn der Schalter an ist.
        */}
        {has("srd:feat:dodge") && (
          <>
            <div className="flex flex-wrap gap-2 pt-1">
              <Chip active={options.dodgeActive} onClick={() => set({ dodgeActive: !options.dodgeActive })}>
                {S.combat.dodge}
              </Chip>
            </div>
            {options.dodgeActive && (
              <label className="block">
                <span className="text-xs text-slate-400">{S.combat.dodgeTarget}</span>
                <input
                  value={options.dodgeTarget}
                  onChange={(e) => set({ dodgeTarget: e.target.value })}
                  placeholder={S.combat.dodgePlaceholder}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
                />
              </label>
            )}
          </>
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
      {/*
        Bei der Obergrenze ist Schluss. Die Engine wendet einen höheren Wert
        weiterhin an und warnt (Importe und ältere Stände können ihn mitbringen) —
        aber ANBIETEN darf die Oberfläche ihn nicht. Ungebremst kam man hier auf
        „Nahkampf −89, Schaden 2d6+204".
      */}
      <GhostButton
        disabled={props.value >= props.max}
        onClick={() => props.onChange(props.value + 1)}
      >
        +
      </GhostButton>
    </div>
  );
}
