import { useState } from "react";
import { ABILITIES } from "@codex35/core";
import { Link } from "@tanstack/react-router";
import { S } from "../../strings.js";
import { Card, Chip, GhostButton, SectionTitle, StatButton, fmtMod } from "../../ui/bits.js";
import { useDiceStore } from "../../lib/diceStore.js";
import { useAppSettings, useCompendium, useHouseRules } from "../../lib/hooks.js";
import { TrackersCard } from "./Trackers.js";
import { CombatOptionsCard } from "./CombatOptions.js";
import type { TabProps } from "./index.js";

export function StatsTab(props: TabProps) {
  const { character, sheet, save } = props;
  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle>Attribute</SectionTitle>
        {/*
          Antippbar nur, wenn es etwas zu zeigen gibt.

          Erst hatte jede Kachel einen Tap, der bloß denselben Wert nochmal
          zeigte — weg damit, das war seine Ansage. Aber sobald ein Bonus aus
          einem Talent, einem Gegenstand oder einem Effekt dazukommt, MUSS man
          das sehen können: die Kachel bekommt dann einen Punkt und wird
          antippbar. Ein Knopf, der auf Tap nichts tut, verspricht etwas, das
          nicht kommt — und ein Bonus, den nichts anzeigt, fehlt am Tisch.
        */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ABILITIES.map((ability) => {
            const block = sheet.abilities[ability];
            // Mehr als der Grundwert? Dann steckt etwas dahinter.
            const hasExtra = block.score.contributions.length > 1;
            return (
              <StatButton
                key={ability}
                big
                label={`${S.abilities[ability] ?? ability}${hasExtra ? " •" : ""}`}
                value={fmtMod(block.mod)}
                sub={`${block.score.total}`}
                {...(hasExtra
                  ? {
                      onClick: () =>
                        props.openBreakdown(S.abilityNames[ability] ?? ability, block.score, {
                          rollable: false,
                          absolute: true,
                          note: S.sheet.abilityHasBonus,
                        }),
                    }
                  : {})}
              />
            );
          })}
        </div>
        {ABILITIES.some((a) => sheet.abilities[a].score.contributions.length > 1) && (
          <p className="mt-1 text-[10px] text-slate-500">{S.sheet.abilityDotHint}</p>
        )}
      </Card>

      <Card>
        <SectionTitle>Rettungswürfe</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {(["fort", "ref", "will"] as const).map((save_) => (
            <StatButton
              key={save_}
              big
              label={S.saves[save_] ?? save_}
              value={fmtMod(sheet.saves[save_].total)}
              onClick={() => props.openBreakdown(`${S.saves[save_]}-Save`, sheet.saves[save_])}
            />
          ))}
        </div>
      </Card>

      <TrackersCard {...props} />

      <Card>
        <SectionTitle>{S.sheet.xp}</SectionTitle>
        <div className="flex items-center gap-3 text-sm">
          <NumberField
            label={S.sheet.xp}
            value={character.xp}
            onChange={(v) => save((c) => void (c.xp = Math.max(0, v)))}
          />
          <span className="text-slate-400">
            {sheet.xp.nextLevelAt !== null
              ? `${S.sheet.nextLevel}: ${sheet.xp.nextLevelAt.toLocaleString("de-DE")}`
              : "max. Stufe"}
          </span>
          <Link
            to="/charaktere/$charId/stufenaufstieg"
            params={{ charId: character.id }}
            className="ml-auto rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800"
          >
            ⬆ {S.actions.levelUp}
          </Link>
        </div>
      </Card>

      {sheet.issues.length > 0 && (
        <Card className="border-amber-800/60">
          <SectionTitle>{S.misc.issues}</SectionTitle>
          <ul className="list-inside list-disc space-y-1 text-xs text-amber-300">
            {sheet.issues.map((issue, i) => (
              <li key={i}>{issue.message}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export function CombatTab(props: TabProps) {
  const { sheet, openBreakdown } = props;
  const roll = useDiceStore((s) => s.roll);
  const { diceEnabled } = useAppSettings();
  const { ignoreEncumbrance } = useHouseRules();
  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle>{S.sheet.ac}</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <StatButton
            big
            label={S.sheet.ac}
            value={`${sheet.ac.total.total}`}
            onClick={() =>
              openBreakdown(S.sheet.ac, sheet.ac.total, { rollable: false, absolute: true })
            }
          />
          <StatButton
            label={S.sheet.touch}
            value={`${sheet.ac.touch.total}`}
            onClick={() =>
              openBreakdown(S.sheet.touch, sheet.ac.touch, {
                rollable: false,
                absolute: true,
                note: S.sheet.touchHint,
              })
            }
          />
          <StatButton
            label={S.sheet.flatFooted}
            value={`${sheet.ac.flatFooted.total}`}
            onClick={() =>
              openBreakdown(S.sheet.flatFooted, sheet.ac.flatFooted, {
                rollable: false,
                absolute: true,
                note: S.sheet.flatFootedHint,
              })
            }
          />
        </div>

        {/*
          Sein Einwand: „das sind ja zwei einzelne Sachen, ich kann ja das Schild
          ablegen". Genau — also steht die RK nicht mehr nur als Summe da. Die
          Bestandteile kommen aus derselben Aufschlüsselung, die der Tap zeigt;
          hier sind sie sichtbar, ohne dass man tippen muss.
        */}
        <ul className="mt-2 space-y-0.5 text-xs">
          {sheet.ac.total.contributions
            .filter((c) => c.value !== 0)
            .map((c, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2">
                <span className={c.applied ? "text-slate-400" : "text-slate-600 line-through"}>
                  {c.source}
                </span>
                <span className={`shrink-0 tabular-nums ${c.applied ? "text-slate-300" : "text-slate-600"}`}>
                  {fmtMod(c.value)}
                </span>
              </li>
            ))}
        </ul>
      </Card>

      <CombatOptionsCard {...props} />

      <Card>
        <div className="grid grid-cols-4 gap-2">
          <StatButton
            label={S.sheet.init}
            value={fmtMod(sheet.init.total)}
            onClick={() => openBreakdown(S.sheet.init, sheet.init)}
          />
          <StatButton label={S.sheet.bab} value={fmtMod(sheet.bab)} />
          <StatButton
            label={S.sheet.grapple}
            value={fmtMod(sheet.grapple.total)}
            onClick={() => openBreakdown(S.sheet.grapple, sheet.grapple)}
          />
          <StatButton
            label={S.sheet.speed}
            value={`${sheet.speedFt.total} ft`
            }
            onClick={() =>
              openBreakdown(S.sheet.speed, sheet.speedFt, {
                rollable: false,
                absolute: true,
                note: "Fuß pro Runde",
              })
            }
          />
        </div>
        {/* Nah-/Fernkampf als Gesamtwert — GAB allein sagt am Tisch zu wenig. */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["melee", "ranged"] as const).map((mode) => {
            const line = sheet.attacks.find((a) => a.key === mode);
            if (!line) return null;
            return (
              <StatButton
                key={mode}
                label={S.sheet[mode]}
                value={fmtMod(line.attack.total)}
                onClick={() => openBreakdown(line.label, line.attack, { rollable: false })}
              />
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle>{S.sheet.attacks}</SectionTitle>
        <ul className="space-y-2">
          {sheet.attacks.map((attack) => (
            <li key={attack.key} className="rounded-lg bg-slate-800/60 p-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() =>
                    openBreakdown(attack.label, attack.attack, {
                      rollable: false,
                      // Beim Antippen die Angriffsfolge erklären — das ist der Weg
                      // auf dem Handy, wo der ganze Satz nicht in die Zeile passt.
                      ...(attack.bonuses.length > 1
                        ? { note: S.sheet.iterativeHint(attack.bonuses.map(fmtMod)) }
                        : {}),
                    })
                  }
                >
                  <div className="truncate text-sm font-semibold">{attack.label}</div>
                  <div className="text-xs text-slate-400">
                    {attack.bonuses.map(fmtMod).join(" / ")}
                    {attack.damageText !== "—" && (
                      <>
                        {" · "}
                        {S.sheet.damage2} {attack.damageText} · {S.sheet.critical} {attack.critical}
                      </>
                    )}
                  </div>
                  {attack.bonuses.length > 1 && (
                    <div className="text-[10px] leading-snug text-slate-500">
                      <span className="sm:hidden">
                        {S.sheet.iterativeShort(attack.bonuses.length)}
                      </span>
                      <span className="hidden sm:inline">
                        {S.sheet.iterativeHint(attack.bonuses.map(fmtMod))}
                      </span>
                    </div>
                  )}
                  {attack.notes.map((note, i) => (
                    <div key={i} className="text-[10px] text-slate-500">
                      {note}
                    </div>
                  ))}
                </button>
                {diceEnabled && (
                  <>
                    <GhostButton
                      onClick={() => {
                        const mod = attack.bonuses[0] ?? 0;
                        roll(`1d20${mod >= 0 ? "+" : ""}${mod}`, attack.label);
                      }}
                    >
                      🎲
                    </GhostButton>
                    {attack.damageText !== "—" && (
                      <GhostButton
                        onClick={() => roll(attack.damageText, `${attack.label} — ${S.sheet.damage2}`)}
                      >
                        ⚔️
                      </GhostButton>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {!ignoreEncumbrance && (
      <Card>
        <SectionTitle>Traglast</SectionTitle>
        <p className="text-sm">
          {sheet.encumbrance.loadLb} lb —{" "}
          <span
            className={
              sheet.encumbrance.level === "light"
                ? "text-emerald-400"
                : sheet.encumbrance.level === "overloaded"
                  ? "text-red-400"
                  : "text-amber-400"
            }
          >
            {S.sheet.encumbrance[sheet.encumbrance.level]}
          </span>
        </p>
        <p className="text-xs text-slate-400">
          leicht ≤ {sheet.encumbrance.lightMaxLb} · mittel ≤ {sheet.encumbrance.mediumMaxLb} · schwer ≤{" "}
          {sheet.encumbrance.heavyMaxLb}
        </p>
      </Card>
      )}
    </div>
  );
}

/** Sichtfilter der Fertigkeitsliste — 36 Zeilen sind am Tisch zu viele. */
type SkillFilter = "all" | "trained" | "class";

export function SkillsTab({ character, sheet, editMode, save, openBreakdown }: TabProps) {
  const roll = useDiceStore((s) => s.roll);
  const { diceEnabled } = useAppSettings();
  const compendium = useCompendium();
  const [filter, setFilter] = useState<SkillFilter>("all");

  const visible = sheet.skills.filter((skill) => {
    // Grundzeilen von Teilgebiets-Fertigkeiten bleiben zum Anlegen sichtbar.
    if (editMode && skill.subtyped && skill.subtype === undefined) return true;
    if (filter === "trained") return skill.ranks > 0;
    if (filter === "class") return skill.isClassSkill;
    return true;
  });

  /** Teilgebiet anlegen — Vorschläge aus dem SRD, eigene jederzeit möglich. */
  const addSubtype = (skillId: string) => {
    const entity = compendium?.get(skillId);
    const suggestions =
      entity?.kind === "skill" ? entity.data.subtypeSuggestions.join(", ") : "";
    const subtype = prompt(
      suggestions === "" ? S.sheet.subtypePrompt : `${S.sheet.subtypePrompt}\n\n${suggestions}`,
    );
    const trimmed = subtype?.trim();
    if (!trimmed) return;
    save((c) => {
      if (c.skillSubtypes.some((s) => s.skillId === skillId && s.subtype === trimmed)) return;
      c.skillSubtypes.push({ skillId, subtype: trimmed });
    });
  };

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <span className="mr-auto text-xs text-slate-500">
          Punkte: {sheet.skillPoints.spent}/{sheet.skillPoints.available}
        </span>
        {(["all", "trained", "class"] as const).map((key) => (
          <Chip key={key} active={filter === key} onClick={() => setFilter(key)}>
            {S.sheet.skillFilter[key]}
          </Chip>
        ))}
      </div>
      <ul className="divide-y divide-slate-800">
        {visible.map((skill) => {
          const overMax = skill.ranks > skill.maxRanks;
          const isSubtypeAnchor = skill.subtyped && skill.subtype === undefined;
          return (
            <li key={skill.key} className="flex items-center gap-2 py-1.5 text-sm">
              <span className="w-10 shrink-0 text-right font-mono font-semibold">
                {skill.usable ? fmtMod(skill.total.total) : "—"}
              </span>
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => openBreakdown(skill.name, skill.total)}
              >
                <span className={skill.usable ? "" : "text-slate-500"}>
                  {skill.name}
                  {skill.ranks > 0 && (
                    <span className={`ml-1 text-xs ${overMax ? "text-red-400" : "text-slate-400"}`}>
                      ({skill.ranks}
                      {overMax && `/${skill.maxRanks}`})
                    </span>
                  )}
                  {skill.isClassSkill && <span className="ml-1 text-[11px] text-amber-400">✧</span>}
                  {skill.ranks === 0 && skill.usable && !isSubtypeAnchor && (
                    <span className="ml-1 text-[10px] text-slate-600">U</span>
                  )}
                </span>
              </button>
              {/* Auch ohne Bearbeiten-Modus sichtbar — sonst findet niemand,
                  dass „Craft" erst durch ein Teilgebiet spielbar wird. */}
              {isSubtypeAnchor && (
                <GhostButton
                  onClick={() => addSubtype(skill.skillId)}
                  title={S.sheet.addSubtype}
                >
                  {editMode ? `+ ${S.sheet.subtype}` : "＋"}
                </GhostButton>
              )}
              {editMode ? (
                <>
                  {skill.subtype !== undefined && (
                    <GhostButton
                      danger
                      onClick={() =>
                        save((c) => {
                          c.skillSubtypes = c.skillSubtypes.filter(
                            (s) => !(s.skillId === skill.skillId && s.subtype === skill.subtype),
                          );
                          delete c.skillRanks[skill.key];
                        })
                      }
                    >
                      ✕
                    </GhostButton>
                  )}
                  {!isSubtypeAnchor && (
                    <>
                      <GhostButton
                        onClick={() =>
                          save((c) => {
                            const current = c.skillRanks[skill.key] ?? 0;
                            const next = current - (skill.isClassSkill ? 1 : 0.5);
                            if (next <= 0) delete c.skillRanks[skill.key];
                            else c.skillRanks[skill.key] = next;
                          })
                        }
                      >
                        −
                      </GhostButton>
                      <GhostButton
                        onClick={() =>
                          save((c) => {
                            const current = c.skillRanks[skill.key] ?? 0;
                            c.skillRanks[skill.key] = current + (skill.isClassSkill ? 1 : 0.5);
                          })
                        }
                      >
                        +
                      </GhostButton>
                    </>
                  )}
                </>
              ) : (
                diceEnabled && (
                  <GhostButton
                    disabled={!skill.usable}
                    onClick={() =>
                      roll(
                        `1d20${skill.total.total >= 0 ? "+" : ""}${skill.total.total}`,
                        `${character.name}: ${skill.name}`,
                      )
                    }
                  >
                    🎲
                  </GhostButton>
                )
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-slate-500">
        ✧ = {S.sheet.classSkill} · U = untrainiert benutzbar · (n) = Ränge · klassenfremde Ränge
        kosten 2 Punkte je Rang
      </p>
    </Card>
  );
}

function NumberField(props: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase text-slate-400">{props.label}</span>
      <input
        type="number"
        value={props.value}
        onChange={(e) => props.onChange(e.target.valueAsNumber || 0)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5"
      />
    </label>
  );
}
