import { useState } from "react";
import { ABILITIES } from "@codex35/core";
import { Link } from "@tanstack/react-router";
import { S } from "../../strings.js";
import { Card, Chip, GhostButton, SectionTitle, StatButton, fmtMod } from "../../ui/bits.js";
import { useDiceStore } from "../../lib/diceStore.js";
import { useAppSettings, useCompendium, useHouseRules } from "../../lib/hooks.js";
import { TrackersCard } from "./Trackers.js";
import type { TabProps } from "./index.js";

export function StatsTab({ character, sheet, save, openBreakdown }: TabProps) {
  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle>Attribute</SectionTitle>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ABILITIES.map((ability) => {
            const block = sheet.abilities[ability];
            return (
              <StatButton
                key={ability}
                big
                label={S.abilities[ability] ?? ability}
                value={fmtMod(block.mod)}
                sub={`${block.score.total}`}
                onClick={() =>
                  openBreakdown(`${S.abilityNames[ability]}`, block.score, false)
                }
              />
            );
          })}
        </div>
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
              onClick={() => openBreakdown(`${S.saves[save_]}-Save`, sheet.saves[save_])}
            />
          ))}
        </div>
      </Card>

      <TrackersCard {...{ character, sheet, save, openBreakdown }} />

      <Card>
        <SectionTitle>{S.sheet.hp}</SectionTitle>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <NumberField
            label={S.sheet.damage}
            value={character.hp.damage}
            onChange={(v) => save((c) => void (c.hp.damage = Math.max(0, v)))}
          />
          <NumberField
            label={S.sheet.nonlethal}
            value={character.hp.nonlethal}
            onChange={(v) => save((c) => void (c.hp.nonlethal = Math.max(0, v)))}
          />
          <NumberField
            label={S.sheet.temp}
            value={character.hp.temp}
            onChange={(v) => save((c) => void (c.hp.temp = Math.max(0, v)))}
          />
        </div>
      </Card>

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

export function CombatTab({ sheet, openBreakdown }: TabProps) {
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
            onClick={() => openBreakdown(S.sheet.ac, sheet.ac.total, false)}
          />
          <StatButton label={S.sheet.touch} value={`${sheet.ac.touch}`} />
          <StatButton label={S.sheet.flatFooted} value={`${sheet.ac.flatFooted}`} />
        </div>
      </Card>

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
            onClick={() => openBreakdown(S.sheet.speed, sheet.speedFt, false)}
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
                onClick={() => openBreakdown(line.label, line.attack, false)}
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
                  onClick={() => openBreakdown(attack.label, attack.attack, false)}
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

export function SkillsTab({ character, sheet, save, openBreakdown }: TabProps) {
  const roll = useDiceStore((s) => s.roll);
  const { diceEnabled } = useAppSettings();
  const compendium = useCompendium();
  // Standardansicht ist zum WÜRFELN da — Ränge editieren nur im Bearbeiten-Modus.
  const [editMode, setEditMode] = useState(false);
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
        <Chip active={editMode} onClick={() => setEditMode(!editMode)}>
          ✎ {S.actions.edit}
        </Chip>
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
        kosten 2 Punkte (halbe Ränge)
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
