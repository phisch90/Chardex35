import { useState, type ReactNode } from "react";
import { ABILITIES, iterativeAttacks, stepRank } from "@codex35/core";
import { Link } from "@tanstack/react-router";
import { S } from "../../strings.js";
import { Icon, IconInline } from "../../ui/icons.js";
import { Card, Chip, GhostButton, SectionTitle, StatButton, d20Roll, fmtMod } from "../../ui/bits.js";
import { useDiceStore } from "../../lib/diceStore.js";
import { useAppSettings, useCompendium, useHouseRules } from "../../lib/hooks.js";
import { SubtypePicker } from "../../ui/SubtypePicker.js";
import { TrackersCard } from "./Trackers.js";
import { CombatOptionsCard } from "./CombatOptions.js";
import type { TabProps } from "./index.js";

/**
 * Eine Gruppe der Übersicht: kleine Überschrift, darunter genau DREI Kacheln.
 *
 * Sein Einwand nach der ersten Fassung: „die Kacheln aber bitte noch etwas klarer
 * differenzieren, zum Beispiel die zusammen und nicht alles mehr oder weniger
 * durcheinander." Vorher lagen alle zwölf in einem Raster — die Reihen ergaben sich aus
 * der Spaltenzahl, nicht aus der Bedeutung, und bei drei Spalten sah es aus wie eine
 * Zahlenwand.
 *
 * Dass jede Gruppe DREI trägt, ist kein Zufall, sondern der Grund für die Zuordnung des
 * Ringkampfs: 12 Werte auf 4 Gruppen à 3 gehen genau auf, und bei 390 px sind drei
 * Kacheln je Reihe die Grenze, ab der die Beschriftung („FERNKAMPF") noch lesbar bleibt.
 * Eine Gruppe mit vier Werten hätte 3 + 1 ergeben — also wieder eine Reihe, die nichts
 * bedeutet.
 */
function GlanceGroup(props: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {props.title}
      </div>
      <div className="grid grid-cols-3 gap-2">{props.children}</div>
    </div>
  );
}

/**
 * „Auf einen Blick" — alle Zahlen, nach denen am Tisch gefragt wird, in EINER Karte.
 *
 * Sein Auftrag: „Auf der Seite Werte würde ich gerne komplett alle Werte stehen haben.
 * Natürlich nicht die Skills, aber auf jeden Fall auch die Angriffswerte,
 * Verteidigungswerte et cetera. Dass man einfach auf einen Blick hat, wenn der DM
 * fragt, wie hoch der Rüstungswert ist, dass man das sofort sehen kann."
 *
 * Deshalb steht sie ganz OBEN und nicht unter den Attributen: „sofort" heißt ohne
 * Scrollen. Und deshalb sind die Rettungswürfe hier drin und haben keine eigene Karte
 * mehr — zweimal dieselbe Zahl auf einem Schirm ist die Doppelung, die diese App sonst
 * überall vermeidet.
 *
 * Was NICHT hier steht: die HP. Sie stehen im Kopf JEDES Reiters, größer und mit dem
 * Knopf zum Ändern; eine zweite HP-Zeile zwei Zentimeter darunter wäre genau diese
 * Doppelung. Und die Fertigkeiten nicht — sein ausdrückliches Wort.
 *
 * Gerechnet wird hier nichts: jede Kachel liest einen fertigen Wert aus `sheet` und
 * gibt beim Antippen dieselbe Aufschlüsselung wie im Kampf-Reiter.
 */
function GlanceCard({ sheet, openBreakdown }: Pick<TabProps, "sheet" | "openBreakdown">) {
  const attackLine = (mode: "melee" | "ranged") => sheet.attacks.find((a) => a.key === mode);
  return (
    <Card>
      <SectionTitle>{S.sheet.glance}</SectionTitle>
      <div className="space-y-2.5">
        <GlanceGroup title={S.sheet.glanceGroups.defense}>
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
        </GlanceGroup>

        <GlanceGroup title={S.sheet.glanceGroups.saves}>
        {(["fort", "ref", "will"] as const).map((save_) => (
          <StatButton
            key={save_}
            label={S.saves[save_] ?? save_}
            value={fmtMod(sheet.saves[save_].total)}
            onClick={() => openBreakdown(`${S.saves[save_]}-Save`, sheet.saves[save_])}
          />
        ))}
        </GlanceGroup>

        <GlanceGroup title={S.sheet.glanceGroups.attack}>
        {/* Der BAB ist eine reine Zahl ohne Beiträge — also kein Knopf, der nichts zeigt. */}
        <StatButton label={S.sheet.bab} value={fmtMod(sheet.bab)} />
        {(["melee", "ranged"] as const).map((mode) => {
          const line = attackLine(mode);
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
        </GlanceGroup>

        {/*
          Initiative, Bewegung und Ringkampf zusammen: was man im Kampf tut, das kein
          Angriff und keine Verteidigung ist. Der Ringkampf steht hier und nicht bei
          „Angriff", weil vier Werte dort eine Reihe 3 + 1 ergeben hätten — und eine
          Reihe, die nur aus der Spaltenzahl entsteht, war genau sein Einwand.
        */}
        <GlanceGroup title={S.sheet.glanceGroups.moves}>
        <StatButton
          label={S.sheet.init}
          value={fmtMod(sheet.init.total)}
          onClick={() => openBreakdown(S.sheet.init, sheet.init)}
        />
        {/*
          „30 ft" und nicht „30": genau so steht die Bewegung im Kampf-Reiter, und
          dieselbe Zahl darf auf zwei Reitern nicht zwei Schreibweisen haben. Gefunden
          hat das der Blick auf das Bild, keine Prüfung.
        */}
        <StatButton
          label={S.sheet.speed}
          value={`${sheet.speedFt.total} ft`}
          onClick={() =>
            openBreakdown(S.sheet.speed, sheet.speedFt, {
              rollable: false,
              absolute: true,
              note: "Fuß pro Runde",
            })
          }
        />
        <StatButton
          label={S.sheet.grapple}
          value={fmtMod(sheet.grapple.total)}
          onClick={() => openBreakdown(S.sheet.grapple, sheet.grapple)}
        />
        </GlanceGroup>
      </div>
    </Card>
  );
}

export function StatsTab(props: TabProps) {
  const { character, sheet, save } = props;
  return (
    <div className="space-y-3">
      <GlanceCard sheet={sheet} openBreakdown={props.openBreakdown} />

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

      {/*
        Die eigene Rettungswürfe-Karte ist WEG: ihre drei Zahlen stehen jetzt in „Auf
        einen Blick" ganz oben. Zweimal dieselbe Zahl auf einem Schirm wäre die
        Doppelung, die diese App sonst überall vermeidet — und beim Suchen hätte man
        nie gewusst, welche der beiden die aktuelle ist.
      */}

      {/*
        Zähler: hier nur die mit Kategorie „Allgemein" (Aktionspunkte, Heldenpunkte).
        Sein Befund: „die Zähler gehören nicht auf die Werte Seite … Turn Undead ist ja
        was für die Kampf Seite. Actionpoint dann wieder nicht."
      */}
      <TrackersCard {...props} category="general" />

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
            <IconInline name="levelUp" /> {S.actions.levelUp}
          </Link>
        </div>
      </Card>

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
        {/* Nah-/Fernkampf als Gesamtwert — der BAB allein sagt am Tisch zu wenig. */}
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
        {/*
          Die volle Attacke EINMAL deutlich, über der Liste und ohne Tap. Sein Auftrag:
          „das mit dem zweifachen Angriff deutlicher aufnehmen sobald der Char einen BAB 6
          erreicht." Klein an jeder Waffe stand es schon — nur eben klein, an jeder Waffe,
          und damit nirgends.

          Die Zahl ist eine FOLGE aus dem BAB und wird gerechnet, nicht gespeichert. Die
          Farbe ist die Bedeutungsfarbe für „das ist in Ordnung/neu" und nicht die
          Bedienfarbe: hier ist nichts zu drücken (elfte Falle).
        */}
        {iterativeAttacks(sheet.bab).length > 1 && (
          <p className="mb-2 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-2 py-1.5 text-xs leading-snug text-emerald-200">
            {S.sheet.fullAttack(
              iterativeAttacks(sheet.bab).length,
              fmtMod(sheet.bab),
              iterativeAttacks(sheet.bab).map(fmtMod),
            )}
          </p>
        )}
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
                        ? { note: S.sheet.iterativeHint(attack.bonuses.map(fmtMod), fmtMod(sheet.bab)) }
                        : {}),
                    })
                  }
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="truncate text-sm font-semibold">{attack.label}</span>
                    {/*
                      Welche Waffe liegt WIRKLICH in der Hand? Angriffszeilen gibt
                      es für alles, was man trägt (auch aus dem Rucksack — man
                      zieht die Waffe eben). Der Platz entscheidet über den
                      Schaden, also muss er hier stehen.
                    */}
                    {attack.slot !== undefined && attack.slot !== "none" && (
                      <span className="shrink-0 rounded border border-amber-700/60 px-1 text-[10px] font-semibold text-amber-400">
                        {S.sheet.equipMark[attack.slot]}
                      </span>
                    )}
                    {attack.slot === "none" && (
                      <span className="shrink-0 text-[10px] text-slate-500">{S.sheet.stowed}</span>
                    )}
                  </div>
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
                        {S.sheet.iterativeShort(attack.bonuses.length, fmtMod(sheet.bab))}
                      </span>
                      <span className="hidden sm:inline">
                        {S.sheet.iterativeHint(attack.bonuses.map(fmtMod), fmtMod(sheet.bab))}
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
                        roll(d20Roll(mod), attack.label);
                      }}
                    >
                      <Icon name="dice" size={17} />
                    </GhostButton>
                    {attack.damageText !== "—" && (
                      <GhostButton
                        onClick={() => roll(attack.damageText, `${attack.label} — ${S.sheet.damage2}`)}
                      >
                        <Icon name="combat" size={17} />
                      </GhostButton>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/*
        Die Kampf-Zähler: Untote vertreiben, Raserei, Böses niederstrecken. Sie stehen
        NACH den Angriffen und vor der Traglast — im Kampf greift man zuerst zur
        Angriffszeile und dann zu dem, was man einmal pro Tag darf.
      */}
      <TrackersCard {...props} category="combat" />

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
  const [subtypeFor, setSubtypeFor] = useState<string | null>(null);

  const visible = sheet.skills.filter((skill) => {
    // Grundzeilen von Teilgebiets-Fertigkeiten bleiben zum Anlegen sichtbar.
    if (editMode && skill.subtyped && skill.subtype === undefined) return true;
    if (filter === "trained") return skill.ranks > 0;
    if (filter === "class") return skill.isClassSkill;
    return true;
  });

  /** Teilgebiet anlegen — Vorschläge aus dem SRD, eigene jederzeit möglich. */
  /*
    Kein `prompt()` mehr — der Auswähler ist derselbe wie im Assistenten und im
    Stufenaufstieg. Sein Urteil zum Abtippen: „unprofessionell", und er hatte recht.
  */
  const addSubtype = (skillId: string, trimmed: string) => {
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
                  onClick={() => setSubtypeFor(skill.skillId)}
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
                      {/*
                        GANZE Ränge, in beide Richtungen — hier stand als einzige der drei
                        Stellen noch `isClassSkill ? 1 : 0.5`. Klassenfremd ist nicht der
                        RANG halb, sondern der PREIS doppelt: 2 Punkte je Rang
                        (`skillPointCost`, die Engine rechnet in `derive.ts` genauso).
                        Die Schrittweite steht in `stepRank` im Kern, damit die Regel nicht
                        wieder in einer Ansicht überlebt und in der nächsten fehlt.
                      */}
                      <GhostButton
                        onClick={() =>
                          save((c) => {
                            const next = stepRank(c.skillRanks[skill.key] ?? 0, -1);
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
                            c.skillRanks[skill.key] = stepRank(c.skillRanks[skill.key] ?? 0, 1);
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
                      roll(d20Roll(skill.total.total), `${character.name}: ${skill.name}`)
                    }
                  >
                    <Icon name="dice" size={17} />
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
      {subtypeFor !== null && (
        <SubtypePicker
          skill={compendium?.get(subtypeFor)}
          taken={character.skillSubtypes
            .filter((entry) => entry.skillId === subtypeFor)
            .map((entry) => entry.subtype)}
          onPick={(subtype) => addSubtype(subtypeFor, subtype)}
          onClose={() => setSubtypeFor(null)}
        />
      )}
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
