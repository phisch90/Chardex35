import { useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import type { Character, DerivedSheet, StatValue } from "@codex35/core";
import { applyHpChange, displayName, readOrderMarker } from "@codex35/core";
import { S } from "../../strings.js";
import { CharacterRepo } from "../../db/repo.js";
import { useAppSettings, useCharacter, useCompendium, useSheet } from "../../lib/hooks.js";
import { useDiceStore } from "../../lib/diceStore.js";
import { BreakdownSheet } from "../../ui/Breakdown.js";
import { HpPad } from "../../ui/HpPad.js";
import { Chip, GhostButton, fmtMod } from "../../ui/bits.js";
import { SwipeTabs } from "../../ui/SwipeTabs.js";
import { OrderBanner } from "../../group/OrderBanner.js";
import { IdentityCard } from "./Identity.js";
import { ShareCharacterButton } from "../../ui/ShareCharacter.js";
import { CharacterActionsSheet } from "../../ui/CharacterActions.js";
import { CombatTab, SkillsTab, StatsTab } from "./tabs-core.js";
import { FeatsTab, InventoryTab, NotesTab } from "./tabs-more.js";
import { SpellsTab } from "./SpellsTab.js";

export interface TabProps {
  character: Character;
  sheet: DerivedSheet;
  /**
   * EIN Bearbeiten-Schalter für den ganzen Bogen (im Kopf, bleibt beim
   * Reiter-Wechsel an). Vorher hatte jeder Reiter seinen eigenen — man musste
   * ihn an vier Stellen suchen und wieder ausschalten.
   *
   * Aus = die Ansicht zum Spielen: würfeln, zählen, wirken. An = Ränge, Talente,
   * Ausrüstung und Zähler ändern und löschen.
   */
  editMode: boolean;
  /** Mutiert eine Kopie und persistiert (rev++, liveQuery aktualisiert die UI). */
  save: (mutate: (c: Character) => void) => void;
  openBreakdown: (
    title: string,
    value: StatValue,
    opts?: { rollable?: boolean; absolute?: boolean; note?: string },
  ) => void;
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

/**
 * Welcher Reiter war zuletzt offen?
 *
 * Der Anlass ist derselbe wie beim Zurück-Knopf: aus dem Zauber-Reiter einen
 * Spruch antippen, lesen, zurück — und der Bogen fing wieder bei den Werten an.
 * Der Weg zurück ist erst dann wirklich zurück, wenn man da landet, wo man war.
 *
 * Je Charakter, weil man mit zwei Bögen unterschiedliche Dinge tut, und in der
 * Sitzung statt dauerhaft: nach dem Öffnen der App will man den Charakter sehen,
 * nicht die Notizen von vorgestern.
 */
const TAB_MEMORY = "codex35.sheet.tab.";

function rememberedTab(charId: string): TabKey {
  try {
    const stored = sessionStorage.getItem(TAB_MEMORY + charId);
    if (stored !== null && stored in S.sheet.tabs) return stored as TabKey;
  } catch {
    // Privater Modus kann sessionStorage sperren — dann eben ohne Gedächtnis.
  }
  return "stats";
}

export function CharacterSheetPage() {
  const { charId } = useParams({ strict: false }) as { charId: string };
  const navigate = useNavigate();
  const character = useCharacter(charId);
  const sheet = useSheet(character);
  const compendium = useCompendium();
  const [tab, setTab] = useState<TabKey>(() => rememberedTab(charId));
  const [editMode, setEditMode] = useState(false);
  const [hpPadOpen, setHpPadOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<{
    title: string;
    value: StatValue;
    rollable: boolean;
    absolute: boolean;
    note?: string | undefined;
  } | null>(null);
  const roll = useDiceStore((s) => s.roll);
  const { diceEnabled } = useAppSettings();

  if (character === undefined) return <p className="text-slate-400">{S.misc.loading}</p>;
  if (character === null) return <p className="text-slate-400">Charakter nicht gefunden.</p>;
  if (!sheet) return <p className="text-slate-400">{S.misc.loading}</p>;

  // Mutiert immer den frischen DB-Stand (nicht den Render-Stand) — schnelle
  // Doppel-Taps gehen sonst verloren.
  const save: TabProps["save"] = (mutate) => {
    void CharacterRepo.mutate(character.id, mutate);
  };

  const openBreakdown: TabProps["openBreakdown"] = (title, value, opts) =>
    setBreakdown({
      title,
      value,
      rollable: opts?.rollable ?? true,
      absolute: opts?.absolute ?? false,
      note: opts?.note,
    });

  const tabProps: TabProps = { character, sheet, editMode, save, openBreakdown };
  const hpRatio = sheet.hp.max > 0 ? sheet.hp.current / sheet.hp.max : 0;
  const orderMarker = readOrderMarker(character);
  const hasSpells = sheet.spellcasting.length > 0;
  const tabs = (Object.keys(S.sheet.tabs) as TabKey[]).filter((t) => t !== "spells" || hasSpells);
  /*
    Der gemerkte Reiter kann es nicht mehr geben — „Zauber" bleibt gespeichert,
    auch wenn der Charakter inzwischen keine Zauber hat (oder der Bogen noch lädt).
    Ohne diese Prüfung stünde die Seite leer da: kein Reiter passt, also rendert
    keiner.
  */
  const active: TabKey = tabs.includes(tab) ? tab : "stats";

  const goTab = (key: TabKey) => {
    setTab(key);
    try {
      sessionStorage.setItem(TAB_MEMORY + character.id, key);
    } catch {
      // siehe rememberedTab
    }
    // Oben anfangen. Vom Ende der Ausrüstungsliste in den Kampf-Reiter zu
    // wischen und dort unterhalb des Inhalts zu landen, sah nach einer leeren
    // Seite aus.
    document.querySelector("main")?.scrollTo({ top: 0 });
  };

  const at = tabs.indexOf(active);
  const before = tabs[at - 1];
  const after = tabs[at + 1];

  // Gelöscht wird nur über das Aktions-Sheet: Gefahrenzone aufklappen,
  // Löschen wählen, Namen abtippen. Ein einzelner Fehlgriff darf keinen Bogen
  // kosten — über den Geräte-Abgleich wäre er sonst auch auf dem iPad weg.
  const afterDelete = () => void navigate({ to: "/" });

  return (
    // Extra Platz unten, damit die mobile Reiter-Leiste nichts überdeckt.
    <div className="space-y-3 pb-14 md:pb-0">
      {/*
        Eine Arbeitskopie für einen fremden Bogen muss sich genauso verraten wie
        ein Entwurf — sonst trägt man eine Stufe ein und hält es für den eigenen
        Charakter. Derselbe Platz, dieselbe Form, andere Farbe.
      */}
      {orderMarker !== undefined && <OrderBanner character={character} marker={orderMarker} />}

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
              {character.playerName !== undefined && character.playerName !== "" && (
                <span className="text-slate-400"> · {character.playerName}</span>
              )}
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
              {/* Wer die Figur spielt, stand bisher nirgends am Bogen — nur im
                  Erstellungs-Assistenten. In der Gruppe ist das die Angabe, an der
                  man einen fremden Bogen zuordnet. */}
              {character.playerName !== undefined && character.playerName !== "" && (
                <p className="truncate text-xs text-slate-500">{character.playerName}</p>
              )}
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
          <Chip key={key} active={active === key} onClick={() => goTab(key)}>
            {S.sheet.tabs[key]}
          </Chip>
        ))}
      </div>

      {/*
        DER Bearbeiten-Schalter für den ganzen Bogen — immer an derselben Stelle,
        egal welcher Reiter. Er bleibt beim Wechseln an, damit man Ränge, Talente
        und Ausrüstung in einem Durchgang nachtragen kann, und der Streifen sagt
        deutlich, dass er noch an ist.
      */}
      <div
        className={`flex items-center gap-2 rounded-lg px-2 py-1 ${
          editMode ? "border border-amber-800/60 bg-amber-950/30" : ""
        }`}
      >
        <span className="min-w-0 flex-1 truncate text-xs text-amber-300/90">
          {editMode ? S.sheet.editModeOn : ""}
        </span>
        <Chip active={editMode} onClick={() => setEditMode(!editMode)}>
          ✎ {editMode ? S.actions.done : S.actions.edit}
        </Chip>
      </div>

      {/* Umbenennen gehört an den Anfang: was man ändern will, sieht man dabei —
          und mit Porträt liegt der Name im Bild, wo ein Eingabefeld nichts zu
          suchen hat. */}
      {editMode && <IdentityCard character={character} save={save} />}

      <SwipeTabs
        onPrev={before === undefined ? undefined : () => goTab(before)}
        onNext={after === undefined ? undefined : () => goTab(after)}
      >
        {active === "stats" && <StatsTab {...tabProps} />}
        {active === "combat" && <CombatTab {...tabProps} />}
        {active === "skills" && <SkillsTab {...tabProps} />}
        {active === "spells" && hasSpells && <SpellsTab {...tabProps} />}
        {active === "inventory" && <InventoryTab {...tabProps} />}
        {active === "feats" && <FeatsTab {...tabProps} />}
        {active === "notes" && <NotesTab {...tabProps} />}
      </SwipeTabs>

      {/*
        Mobile Reiter-Leiste: direkt über der Hauptnavigation, in Daumenreichweite.
        Icons + Kurzlabel, damit alle sieben Reiter nebeneinander passen.
      */}
      <nav className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex border-t border-slate-800 bg-slate-900/95 backdrop-blur md:hidden">
        {tabs.map((key) => (
          <button
            key={key}
            onClick={() => goTab(key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[9px] font-medium leading-none ${
              active === key ? "text-amber-400" : "text-slate-400"
            }`}
          >
            <span className="text-base leading-none">{TAB_ICONS[key]}</span>
            {S.sheet.tabsShort[key]}
            {active === key && <span className="mt-0.5 h-0.5 w-6 rounded-full bg-amber-400" />}
          </button>
        ))}
      </nav>

      <HpPad
        open={hpPadOpen}
        onClose={() => setHpPadOpen(false)}
        // Die 3.5-Regeln dazu (temporäre TP fangen Schaden zuerst ab) stehen in
        // applyHpChange, damit sie getestet sind und nicht in der UI hängen.
        onApply={(mode, amount) => save((c) => void (c.hp = applyHpChange(c.hp, mode, amount)))}
        hp={{
          current: sheet.hp.current,
          max: sheet.hp.max,
          damage: character.hp.damage,
          temp: character.hp.temp,
          nonlethal: character.hp.nonlethal,
        }}
        computedMax={sheet.hp.computedMax}
        overrideMax={character.hp.overrideMax}
        onSetMax={(value) =>
          save((c) => {
            if (value === null) delete c.hp.overrideMax;
            else c.hp.overrideMax = value;
          })
        }
      />

      <BreakdownSheet
        open={breakdown !== null}
        onClose={() => setBreakdown(null)}
        title={breakdown?.title ?? ""}
        value={breakdown?.value ?? null}
        absolute={breakdown?.absolute ?? false}
        note={breakdown?.note}
        /*
          Die Einstellung „Würfeln in der App" gilt AUCH hier. Sie wurde an den
          Würfel-Knöpfen am Bogen und am Würfel-Reiter beachtet, aber nicht in
          dieser Aufschlüsselung — beim Antippen eines Rettungswurfs stand der
          Knopf trotzdem da. Eine Einstellung, die an einer Stelle nicht gilt,
          ist keine Einstellung.
        */
        onRoll={
          diceEnabled && breakdown?.rollable
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
