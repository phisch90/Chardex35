import { useState } from "react";
import { COMBAT_EXPERTISE_MAX } from "@codex35/core";
import { S } from "../../strings.js";
import { Card, Chip, GhostButton, NumberStepper, SectionTitle } from "../../ui/bits.js";
import { RuleHint } from "../../ui/RuleHint.js";
import { useHouseRules } from "../../lib/hooks.js";
import type { TabProps } from "./index.js";

/** Der zugeklappte Zustand gehört dem GERÄT, nicht der Figur — wie der Zaubergrad. */
const FOLD_KEY = "codex35.combat.optionsOpen.";

function rememberedOpen(charId: string): boolean {
  try {
    return sessionStorage.getItem(FOLD_KEY + charId) === "1";
  } catch {
    // Privater Modus, gesperrte Website-Daten: dann eben zu. Ein Lesefehler
    // darf den Kasten nicht kosten.
    return false;
  }
}

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
    Der Hook steht GANZ OBEN und nicht bei seiner Verwendung — die zehnte Falle dieses
    Projekts, und sie ist mir damit schon dreimal passiert. Hier gibt es zwar keinen
    frühen `return`, aber die Regel gilt ohne Ausnahme: ein Hook steht vor dem ersten
    `return`, oder es ist keiner.
  */
  const [offen, setOffen] = useState(() => rememberedOpen(character.id));
  const setzeOffen = (wert: boolean) => {
    setOffen(wert);
    try {
      if (wert) sessionStorage.setItem(FOLD_KEY + character.id, "1");
      else sessionStorage.removeItem(FOLD_KEY + character.id);
    } catch {
      // Gemerkt wird es dann nicht — der Kasten klappt trotzdem auf.
    }
  };
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

  /*
    Was gerade AN ist — als Liste und nicht als `boolean`, und das ist der Kern dieser
    Runde. Vorher gab es `anyActive` nur als Ja/Nein für den amber Rahmen; seit der
    Kasten zuklappt, muss dieselbe Frage auch den SATZ im Kopf tragen.

    Beides aus EINER Quelle: stünde die Bedingung zweimal, wäre irgendwann der Rahmen
    amber und die Zeile sagte „keine Option aktiv". Genau diese Sorte Widerspruch hat
    dieses Projekt schon mehrfach bezahlt.
  */
  const activeLabels: string[] = [];
  if (options.powerAttack > 0) activeLabels.push(S.combat.optionsPowerAttack(options.powerAttack));
  if (options.combatExpertise > 0)
    activeLabels.push(S.combat.optionsExpertise(options.combatExpertise));
  if (options.fightingDefensively) activeLabels.push(S.combat.optionsDefensive);
  if (options.totalDefense) activeLabels.push(S.combat.optionsTotalDefense);
  if (options.dodgeActive) activeLabels.push(S.combat.optionsDodge);
  if (options.twoWeaponFighting) activeLabels.push(S.combat.optionsTwoWeapon);
  const anyActive = activeLabels.length > 0;

  return (
    <Card className={anyActive ? "border-amber-700/70" : ""}>
      <div className="flex items-center justify-between gap-2">
        {/*
          Die Überschrift IST der Schalter — kein zweites Bedienelement daneben, dieselbe
          Entscheidung wie beim amber Streifen des Bearbeiten-Modus. Das ▸ sagt, dass hier
          etwas aufgeht: ein Knopf, den man nicht als Knopf erkennt, ist keiner.
        */}
        <button
          type="button"
          aria-expanded={offen}
          aria-label={offen ? S.combat.optionsClose : S.combat.optionsOpen}
          onClick={() => setzeOffen(!offen)}
          /*
            `-my-1 py-1` macht das Ziel groesser, ohne etwas zu verschieben: die
            Ueberschrift ist mit `text-xs` nur rund 28 px hoch, und am Tisch wird mit dem
            Daumen getippt.
          */
          className="-my-1 flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
        >
          {/*
            Das `mb-2` ist kein Schmuck, sondern die Ausrichtung: `SectionTitle` traegt es
            selbst, und ohne dasselbe Mass am Zeichen zentriert `items-center` die zwei
            verschieden hohen Kaesten — das Dreieck sass sichtbar tiefer als das Wort.
            Gefunden hat das der BLICK aufs Bild; alle 79 Pruefungen waren dabei gruen.
          */}
          <span className="mb-2 text-xs text-slate-500">{offen ? "▾" : "▸"}</span>
          <SectionTitle>{S.combat.title}</SectionTitle>
        </button>
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

      {/*
        Zugeklappt trägt diese Zeile den ganzen Zustand. Sie steht in der Bedienfarbe,
        wenn etwas an ist — hier ist das richtig und nicht die elfte Falle: es IST ein
        Zustand, den man bedient hat, und der amber Rahmen des Kastens sagt dasselbe.

        Offen steht sie nicht: dort sagen es die Regler und die aktiven Chips selbst,
        und dieselbe Auskunft zweimal auf einem Schirm ist die Doppelung, die diese App
        überall vermeidet.
      */}
      {!offen && (
        <p className={`text-xs ${anyActive ? "text-amber-300" : "text-slate-500"}`}>
          {anyActive ? activeLabels.join(" · ") : S.combat.optionsNone}
        </p>
      )}

      {offen && (
      <>
      <p className="mb-2 text-xs text-slate-500">{S.combat.hint}</p>

      <div className="space-y-2">
        {has("srd:feat:power-attack") && (
          <div>
            <NumberStepper
              label={S.combat.powerAttack}
              hint={
                <RuleHint label={S.combat.powerAttack}>
                  {S.combat.powerAttackHint(sheet.bab, houseRules.powerAttackLightWeapons)}
                </RuleHint>
              }
              value={options.powerAttack}
              max={sheet.bab}
              onChange={(v) => set({ powerAttack: v })}
            />
            {/*
              Und darunter der ZUSTAND — sein Auftrag: „ob es mit der geführten waffe
              anwendbar ist."

              Er steht als gewöhnlicher Absatz und nicht in einem `RuleHint`: eine
              Erklärung kann man auswendig können, diese Auskunft nicht. Sie hängt an dem,
              was gerade in der Hand liegt, und wechselt mit jedem Waffenwechsel. Genau
              dieses Schweigen hat ihn einmal einen Rechenfehler suchen lassen, den es
              nicht gab.

              Gerechnet wird nichts: `powerAttackWeapons` kommt fertig aus der Engine.
            */}
            <div className="mt-1 text-[11px] leading-snug text-slate-400">
              {sheet.powerAttackWeapons.length === 0 ? (
                S.combat.powerAttackNoWeapon
              ) : (
                <>
                  <span className="text-slate-500">{S.combat.powerAttackWeaponsTitle} </span>
                  {sheet.powerAttackWeapons.map((w) => (
                    <span
                      key={w.label}
                      /*
                        Bringt sie nichts, ist die Zeile rosé — dieselbe Farbe wie „hier ist
                        noch etwas offen" und ausdrücklich NICHT Amber. Amber ist in diesem
                        Bogen die Bedienfarbe, und eine Warnung in der Farbe jedes Knopfes
                        ist keine Warnung (elfte Falle).
                      */
                      className={`mr-2 inline-block ${w.factor === 0 ? "text-rose-300" : ""}`}
                    >
                      {S.combat.powerAttackWeapon(w.label, w.factor, w.byHouseRule)}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
        {has("srd:feat:combat-expertise") && (
          <NumberStepper
            label={S.combat.combatExpertise}
            hint={
              <RuleHint label={S.combat.combatExpertise}>
                {S.combat.combatExpertiseHint(Math.min(COMBAT_EXPERTISE_MAX, sheet.bab))}
              </RuleHint>
            }
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
            <RuleHint label={S.combat.twoWeapon}>{S.combat.twoWeaponHint}</RuleHint>
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
      </>
      )}
    </Card>
  );
}
