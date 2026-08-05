import { COMBAT_EXPERTISE_MAX } from "@codex35/core";
import { S } from "../../strings.js";
import { Card, Chip, GhostButton, NumberStepper, SectionTitle } from "../../ui/bits.js";
import { useHouseRules } from "../../lib/hooks.js";
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
  /*
    Die Hausregel gehört in den HINWEIS und nicht nur in die Rechnung: stand dort „mit
    leichter Waffe gar nicht", während die Engine den Schaden gab, widersprach der
    Erklärtext der Zahl daneben — und man sucht den Fehler dann in der Zahl.
  */
  const houseRules = useHouseRules();
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
          <NumberStepper
            label={S.combat.powerAttack}
            hint={S.combat.powerAttackHint(sheet.bab, houseRules.powerAttackLightWeapons)}
            value={options.powerAttack}
            max={sheet.bab}
            onChange={(v) => set({ powerAttack: v })}
          />
        )}
        {has("srd:feat:combat-expertise") && (
          <NumberStepper
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
