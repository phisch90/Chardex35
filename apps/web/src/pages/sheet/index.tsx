import { useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import type { Character, DerivedSheet, StatValue } from "@codex35/core";
import { applyHpChange, displayName } from "@codex35/core";
import { S } from "../../strings.js";
import { CharacterRepo } from "../../db/repo.js";
import { useCharacter, useCompendium, useSheet } from "../../lib/hooks.js";
import { useDiceStore } from "../../lib/diceStore.js";
import { BreakdownSheet } from "../../ui/Breakdown.js";
import { HpPad } from "../../ui/HpPad.js";
import { Chip, GhostButton, fmtMod } from "../../ui/bits.js";
import { ShareCharacterButton } from "../../ui/ShareCharacter.js";
import { CharacterActionsSheet } from "../../ui/CharacterActions.js";
import { CombatTab, SkillsTab, StatsTab } from "./tabs-core.js";
import { FeatsTab, InventoryTab, NotesTab } from "./tabs-more.js";
import { SpellsTab } from "./SpellsTab.js";

export interface TabProps {
  character: Character;
  sheet: DerivedSheet;
  /** Mutiert eine Kopie und persistiert (rev++, liveQuery aktualisiert die UI). */
  save: (mutate: (c: Character) => void) => void;
  openBreakdown: (title: string, value: StatValue, rollable?: boolean) => void;
}

type TabKey = keyof typeof S.sheet.tabs;

const TAB_ICONS: Record<TabKey, string> = {
  stats: "📊",
  combat: "⚔️",
  skills: "🎯",
  spells: "✨",
  inventory: "🎒",
  feats: "⭐",
  notes: "📝",
};

export function CharacterSheetPage() {
  const { charId } = useParams({ strict: false }) as { charId: string };
  const navigate = useNavigate();
  const character = useCharacter(charId);
  const sheet = useSheet(character);
  const compendium = useCompendium();
  const [tab, setTab] = useState<TabKey>("stats");
  const [hpPadOpen, setHpPadOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<{
    title: string;
    value: StatValue;
    rollable: boolean;
  } | null>(null);
  const roll = useDiceStore((s) => s.roll);

  if (character === undefined) return <p className="text-slate-400">{S.misc.loading}</p>;
  if (character === null) return <p className="text-slate-400">Charakter nicht gefunden.</p>;
  if (!sheet) return <p className="text-slate-400">{S.misc.loading}</p>;

  // Mutiert immer den frischen DB-Stand (nicht den Render-Stand) — schnelle
  // Doppel-Taps gehen sonst verloren.
  const save: TabProps["save"] = (mutate) => {
    void CharacterRepo.mutate(character.id, mutate);
  };

  const openBreakdown: TabProps["openBreakdown"] = (title, value, rollable = true) =>
    setBreakdown({ title, value, rollable });

  const tabProps: TabProps = { character, sheet, save, openBreakdown };
  const hpRatio = sheet.hp.max > 0 ? sheet.hp.current / sheet.hp.max : 0;
  const hasSpells = sheet.spellcasting.length > 0;
  const tabs = (Object.keys(S.sheet.tabs) as TabKey[]).filter((t) => t !== "spells" || hasSpells);

  // Gelöscht wird nur über das Aktions-Sheet: Gefahrenzone aufklappen,
  // Löschen wählen, Namen abtippen. Ein einzelner Fehlgriff darf keinen Bogen
  // kosten — über den Geräte-Abgleich wäre er sonst auch auf dem iPad weg.
  const afterDelete = () => void navigate({ to: "/" });

  return (
    // Extra Platz unten, damit die mobile Reiter-Leiste nichts überdeckt.
    <div className="space-y-3 pb-14 md:pb-0">
      {/* Ein Entwurf muss sich sofort verraten, sonst baut man am Probelauf
          und hält ihn für den echten Bogen. */}
      {character.draftOf !== undefined && (
        <div className="-mx-3 -mt-3 flex flex-wrap items-center gap-2 border-b border-amber-800/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
          <span className="font-semibold">🧪 Entwurf</span>
          <span className="text-amber-300/80">Änderungen hier berühren das Original nicht.</span>
          <Link
            to="/charaktere/$charId/vergleich"
            params={{ charId: character.id }}
            className="ml-auto rounded-lg border border-amber-700 px-2 py-1 font-semibold hover:bg-amber-900/40"
          >
            Vergleichen
          </Link>
        </div>
      )}
      {/* Porträt bildschirmbreit mit Name darüber — der Bogen soll nach dem
          Charakter aussehen, nicht nach einer Tabelle. */}
      {character.portrait && (
        <div className="-mx-3 -mt-3 relative h-40 overflow-hidden sm:h-52">
          <img src={character.portrait} alt="" className="h-full w-full object-cover object-top" />
          <button
            onClick={() => setActionsOpen(true)}
            aria-label="Aktionen"
            className="absolute right-2 top-2 rounded-lg bg-slate-950/60 px-2.5 py-1.5 text-slate-200 backdrop-blur"
          >
            ⋯
          </button>
          <ShareCharacterButton character={character} variant="overlay" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent px-3 pb-2 pt-8">
            <h1 className="truncate text-2xl font-bold drop-shadow">{character.name}</h1>
            <p className="text-sm text-slate-300">
              {sheet.classLevels.map((c) => `${c.className} ${c.level}`).join(" / ")} ·{" "}
              {S.sheet.level} {sheet.totalLevel}
              {sheet.ecl !== sheet.totalLevel && ` (ECL ${sheet.ecl})`}
            </p>
          </div>
        </div>
      )}

      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {/* Ohne Porträt steht der Kopf hier; mit Porträt liegt er im Bild. */}
          {!character.portrait && (
            <>
              <h1 className="truncate text-xl font-bold">{character.name}</h1>
              <p className="text-sm text-slate-400">
                {sheet.classLevels.map((c) => `${c.className} ${c.level}`).join(" / ")} ·{" "}
                {S.sheet.level} {sheet.totalLevel}
                {sheet.ecl !== sheet.totalLevel && ` (ECL ${sheet.ecl})`}
              </p>
            </>
          )}
          {sheet.xp.nextLevelAt !== null && character.xp >= sheet.xp.nextLevelAt && (
            <Link
              to="/charaktere/$charId/stufenaufstieg"
              params={{ charId: character.id }}
              className="inline-block rounded-full bg-emerald-700/40 px-2 py-0.5 text-xs font-semibold text-emerald-300"
            >
              {S.levelUp.ready}
            </Link>
          )}
          {/* TP als Balken mit Ampelfarbe; der Rechner deckt jeden Betrag ab. */}
          <button
            onClick={() => setHpPadOpen(true)}
            className="mt-1.5 block w-full text-left"
            aria-label={S.hpPad.open}
          >
            <div className="relative h-7 overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
              <div
                className={`absolute inset-y-0 left-0 transition-[width] ${
                  hpRatio <= 0.25 ? "bg-red-800/70" : hpRatio <= 0.5 ? "bg-amber-700/60" : "bg-emerald-800/60"
                }`}
                style={{ width: `${Math.max(0, Math.min(100, hpRatio * 100))}%` }}
              />
              <div className="relative flex h-full items-center justify-between px-2 text-sm font-bold tabular-nums">
                <span>
                  {S.sheet.hp} {sheet.hp.current}/{sheet.hp.max}
                  {sheet.hp.temp > 0 && <span className="text-sky-300"> +{sheet.hp.temp}</span>}
                  {sheet.hp.nonlethal > 0 && (
                    <span className="text-amber-300"> ({sheet.hp.nonlethal} nichttödl.)</span>
                  )}
                </span>
                <span className="text-xs font-medium text-slate-300">± {S.hpPad.open}</span>
              </div>
            </div>
          </button>
          {/* Schnelltasten gehen durch dieselbe Regel wie der Rechner — sonst
              würden temporäre TP hier Schaden abfangen und dort nicht. */}
          <div className="mt-1 flex gap-1.5">
            <button
              onClick={() => save((c) => void (c.hp = applyHpChange(c.hp, "damage", 1)))}
              className="flex-1 rounded-lg border border-red-800 bg-red-950/60 py-1.5 text-sm font-semibold text-red-300 active:bg-red-900"
            >
              −1
            </button>
            <button
              onClick={() => save((c) => void (c.hp = applyHpChange(c.hp, "damage", 5)))}
              className="flex-1 rounded-lg border border-red-800 bg-red-950/60 py-1.5 text-sm font-semibold text-red-300 active:bg-red-900"
            >
              −5
            </button>
            <button
              onClick={() => save((c) => void (c.hp = applyHpChange(c.hp, "heal", 1)))}
              className="flex-1 rounded-lg border border-emerald-800 bg-emerald-950/60 py-1.5 text-sm font-semibold text-emerald-300 active:bg-emerald-900"
            >
              +1
            </button>
            <button
              onClick={() =>
                save((c) => {
                  c.hp.damage = 0;
                  c.hp.nonlethal = 0;
                })
              }
              className="flex-1 rounded-lg border border-emerald-800 bg-emerald-950/60 py-1.5 text-sm font-semibold text-emerald-300 active:bg-emerald-900"
            >
              voll
            </button>
          </div>
          {/* Aktive Zustände immer im Blick — Verwaltung im Notizen-Tab. */}
          {character.conditionIds.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {character.conditionIds.map((id) => {
                const condition = compendium?.get(id);
                return (
                  <span
                    key={id}
                    className="rounded-full border border-amber-700 bg-amber-950/60 px-2 py-0.5 text-[11px] font-medium text-amber-300"
                  >
                    {condition ? displayName(condition) : id}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {/* Mit Porträt sitzt der Löschknopf oben im Bild, nicht neben dem TP-Balken. */}
        {!character.portrait && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex gap-1">
              <ShareCharacterButton character={character} />
              <GhostButton onClick={() => setActionsOpen(true)} title="Aktionen">
                ⋯
              </GhostButton>
            </div>
          </div>
        )}
      </header>

      {/* Auf Desktop bleiben die Reiter oben; mobil sitzen sie unten am Daumen. */}
      <div className="hidden flex-wrap gap-1 md:flex">
        {tabs.map((key) => (
          <Chip key={key} active={tab === key} onClick={() => setTab(key)}>
            {S.sheet.tabs[key]}
          </Chip>
        ))}
      </div>

      {tab === "stats" && <StatsTab {...tabProps} />}
      {tab === "combat" && <CombatTab {...tabProps} />}
      {tab === "skills" && <SkillsTab {...tabProps} />}
      {tab === "spells" && hasSpells && <SpellsTab {...tabProps} />}
      {tab === "inventory" && <InventoryTab {...tabProps} />}
      {tab === "feats" && <FeatsTab {...tabProps} />}
      {tab === "notes" && <NotesTab {...tabProps} />}

      {/*
        Mobile Reiter-Leiste: direkt über der Hauptnavigation, in Daumenreichweite.
        Icons + Kurzlabel, damit alle sieben Reiter nebeneinander passen.
      */}
      <nav className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex border-t border-slate-800 bg-slate-900/95 backdrop-blur md:hidden">
        {tabs.map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[9px] font-medium leading-none ${
              tab === key ? "text-amber-400" : "text-slate-400"
            }`}
          >
            <span className="text-base leading-none">{TAB_ICONS[key]}</span>
            {S.sheet.tabsShort[key]}
            {tab === key && <span className="mt-0.5 h-0.5 w-6 rounded-full bg-amber-400" />}
          </button>
        ))}
      </nav>

      <HpPad
        open={hpPadOpen}
        onClose={() => setHpPadOpen(false)}
        // Die 3.5-Regeln dazu (temporäre TP fangen Schaden zuerst ab) stehen in
        // applyHpChange, damit sie getestet sind und nicht in der UI hängen.
        onApply={(mode, amount) => save((c) => void (c.hp = applyHpChange(c.hp, mode, amount)))}
      />

      <BreakdownSheet
        open={breakdown !== null}
        onClose={() => setBreakdown(null)}
        title={breakdown?.title ?? ""}
        value={breakdown?.value ?? null}
        onRoll={
          breakdown?.rollable
            ? () => {
                const mod = breakdown.value.total;
                roll(`1d20${mod >= 0 ? "+" : ""}${mod}`, `${character.name}: ${breakdown.title}`);
                setBreakdown(null);
              }
            : undefined
        }
      />

      <CharacterActionsSheet
        character={character}
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        onDeleted={afterDelete}
      />
    </div>
  );
}

export function statText(value: StatValue): string {
  return fmtMod(value.total);
}
