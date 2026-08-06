import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import type { Character, DerivedSheet, StatValue } from "@codex35/core";
import {
  applyHpChange,
  displayName,
  readOrderMarker,
  tabsWithIssues,
} from "@codex35/core";
import { S } from "../../strings.js";
import { CharacterRepo } from "../../db/repo.js";
import { useAppSettings, useCharacter, useCompendium, useSheet } from "../../lib/hooks.js";
import { useDiceStore } from "../../lib/diceStore.js";
import { rememberSheet } from "../../lib/lastSheet.js";
import { reportSaveFailure } from "../../lib/saveError.js";
import { BreakdownSheet } from "../../ui/Breakdown.js";
import { HpPad } from "../../ui/HpPad.js";
import { Chip, GhostButton, OpenDot, d20Roll, fmtMod } from "../../ui/bits.js";
import { SwipeTabs } from "../../ui/SwipeTabs.js";
import { OrderBanner } from "../../group/OrderBanner.js";
import { IdentityCard } from "./Identity.js";
import { ShareCharacterButton } from "../../ui/ShareCharacter.js";
import { CharacterActionsSheet } from "../../ui/CharacterActions.js";
import { IssueCard } from "../../ui/IssueCard.js";
import { accentKeyOf } from "../../ui/classAccents.js";
import { Icon, IconInline, type IconName } from "../../ui/icons.js";
import { ClassMark } from "../../ui/ClassMark.js";
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

/*
  Eigene Zeichen statt Emoji (sein Auftrag). Der Schlüssel ist derselbe wie der Reiter, also
  braucht es hier keine Zuordnungstabelle mehr — `IconName` deckt die sieben ab, und der
  Typ hält das fest: wer einen Reiter dazunimmt, muss ein Zeichen dazuzeichnen.

  Warum das mehr ist als Geschmack: ein Emoji trägt die Farbe seiner Schriftart, ein Strich
  in `currentColor` trägt die des Reiters. Der aktive Reiter färbt sein Zeichen jetzt mit —
  beim Druiden grün, beim Paladin königsblau — und der Warnpunkt liegt auf einer Fläche,
  deren Farbe wir kennen (elfte Falle in CLAUDE.md).
*/
const TAB_ICONS: Record<TabKey, IconName> = {
  stats: "stats",
  combat: "combat",
  skills: "skills",
  spells: "spells",
  inventory: "inventory",
  feats: "feats",
  notes: "notes",
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
  const { diceEnabled, classAccent } = useAppSettings();

  /*
    Die Klassenfarbe ans <html>, solange DIESER Bogen offen ist — und beim Verlassen wieder
    weg. Draußen färbt die Kampagne (Startseite), drinnen die Klasse: außen sieht man, zu
    welcher Gruppe eine Figur zählt, innen, wer sie ist.

    Der Hook steht VOR den drei frühen `return`s und rechnet selbst mit dem noch nicht
    geladenen Charakter. Ein Hook hinter einer Bedingung ist kein Hook — genau daran ist der
    Stufenaufstieg schon einmal mit „Minified React error #310" auf halb weiß gelaufen.

    Vorrang: was am Bogen steht (`character.accent`, seine Wahl), sonst die Klasse mit den
    meisten Stufen. Kennt die App die Klasse nicht (NPC, Prestige, selbstgebaut), bleibt
    Amber stehen.
  */
  useEffect(() => {
    /*
      Nebenbei merken, welcher Bogen offen ist — dafür ist der Knopf „Zurück zu …" in den
      Einstellungen da. Der Hook läuft genau dann, wenn ein Bogen offen ist, und steht vor
      allen frühen `return`s; ein zweiter Hook wäre eine zweite Stelle, die es vergessen
      kann.
    */
    if (character) rememberSheet(character.id);
    const root = document.documentElement;
    // Die Rangfolge (eigene Wahl vor Klasse) steht in `accentKeyOf` — EINMAL, weil sie
    // auch der Porträt-Platzhalter der Startseite braucht.
    /*
      Der Hauptschalter aus den Einstellungen kommt VOR der Rangfolge: ist er aus, wird das
      Attribut gar nicht gesetzt, und damit fallen Rahmenfarbe, Anstrich und Kartentönung
      alle zusammen weg. Genau EINE Stelle entscheidet das — sonst müsste jede der drei
      Schichten den Schalter selbst kennen.
    */
    const key =
      !classAccent || character === undefined || character === null
        ? undefined
        : accentKeyOf(character);
    if (key === undefined) root.removeAttribute("data-accent");
    else root.setAttribute("data-accent", key);
    return () => root.removeAttribute("data-accent");
  }, [character, classAccent]);

  if (character === undefined) return <p className="text-slate-400">{S.misc.loading}</p>;
  if (character === null) return <p className="text-slate-400">Charakter nicht gefunden.</p>;
  if (!sheet) return <p className="text-slate-400">{S.misc.loading}</p>;

  /*
    Mutiert immer den frischen DB-Stand (nicht den Render-Stand) — schnelle
    Doppel-Taps gehen sonst verloren.

    Das `catch` ist nachgerüstet, und es hat einen Anlass: hier stand ein nacktes
    `void`. Als der Domänen-Fehler zuschlug (die Mutation warf, die Transaktion
    brach ab), verschluckte genau dieses `void` die Ursache — sichtbar blieb nur,
    dass ein Tap nichts tat.

    Und die Konsole war die halbe Antwort: sein Wort dazu stand als offener Punkt
    da, „auf dem Handy schaut da niemand hinein". Jetzt geht es zusätzlich in die
    Leiste, MIT einem zweiten Versuch — und der ist derselbe Aufruf, nicht bloß ein
    Knopf. Dass er beliebig oft laufen darf, liegt an `mutate`: es arbeitet auf dem
    frischen Datenbankstand und nicht auf dem von damals.
  */
  const save: TabProps["save"] = (mutate) => {
    const write = () => CharacterRepo.mutate(character.id, mutate);
    void write().catch((error: unknown) => {
      reportSaveFailure(character.name, error, write);
    });
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

  /*
    Welche Reiter einen Punkt tragen. Eine FOLGE aus den Warnungen des Bogens —
    gerechnet, nie gespeichert, und aus derselben Funktion, aus der auch die Karte
    ihre Zeilen nimmt. Zwei Zählungen liefen sonst auseinander, und dann steht ein
    Punkt an einem Reiter, auf dem nichts steht.
  */
  const issueTabs = tabsWithIssues(sheet);

  // Gelöscht wird nur über das Aktions-Sheet: Gefahrenzone aufklappen,
  // Löschen wählen, Namen abtippen. Ein einzelner Fehlgriff darf keinen Bogen
  // kosten — über den Geräte-Abgleich wäre er sonst auch auf dem iPad weg.
  const afterDelete = () => void navigate({ to: "/" });

  return (
    // Extra Platz unten, damit die mobile Reiter-Leiste nichts überdeckt.
    <div className="relative space-y-3 pb-14 md:pb-0">
      {/*
        Das WASSERZEICHEN — sein Auftrag: „evtl. ein passendes Symbol welches wie ein
        Wasserzeichen an manchen Stellen vorkommt."

        Es liegt hinter dem GANZEN Bogen und nicht im Kopf. Zuerst stand es dort, und das
        ging zweimal schief: bei 132 px saß es mitten unter dem Teilen- und dem ⋯-Knopf,
        und weiter hinausgeschoben schnitt der nur 60 px hohe Kopf davon einen waagerechten
        Streifen heraus — vom Schädel des Barbaren blieben die Zähne übrig. Ein
        Wasserzeichen braucht HÖHE, und die hat erst der Bogen selbst.

        Und die FALLE, die mich hier eine Teststrecke gekostet hat: zuerst stand am
        Wurzelkasten `isolate` und am Zeichen `-z-10`, damit es unter den Karten liegt. Ein
        `isolation: isolate` macht aber einen neuen STAPELKONTEXT — und damit galt das
        `z-50` der Blätter des Bogens (⋯-Menü, Würfelblatt, TP-Feld) nur noch INNERHALB
        dieses Kastens. Gegen die Hauptnavigation (`z-40`, aber im Wurzelkontext) verloren
        sie, und die Lösch-Strecke lief in einen Timeout, weil die untere Leiste den Klick
        abfing. Ein Dialog, der hinter der Navigation liegt, ist kein Dialog.

        Ohne `isolate` regelt die Zeichenreihenfolge das von allein: das Zeichen steht als
        erstes Kind, und alles, was DANACH kommt und `relative` trägt, zeichnet darüber.
        Deshalb hat `Card` ein `relative` bekommen — eine Klasse, die nichts verschiebt.

        `pointer-events-none` bleibt: sonst fängt das Zeichen Taps ab, die dem Bogen gehören.
      */}
      <ClassMark
        character={character}
        size={220}
        /*
          Das SYMBOL bleibt auch mit abgeschalteter Klassenfarbe — abgeschaltet ist die
          Farbe, nicht das Zeichen. Ohne den Schalter wäre es sonst golden (ohne
          `data-accent` ist `amber` wieder das echte Amber), und das wäre genau die Farbe,
          die er nicht mehr sehen wollte.
        */
        className={`pointer-events-none absolute -right-6 top-6 ${
          classAccent ? "text-amber-400/15" : "text-slate-500/15"
        }`}
      />
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
          <span className="font-semibold">
            <IconInline name="draft" /> Entwurf
          </span>
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

      <header className="relative flex items-start gap-3">
        <div className="relative min-w-0 flex-1">
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
              <IconInline name="levelUp" size={13} />
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
          {/*
            Wo die TP stehen — Martins Sterbe-Regel, sichtbar OHNE Tap, weil der Balken
            der einzige Ort ist, an dem eine negative Zahl auftaucht. Er sieht anders aus
            als die Zustands-Marken darunter und hat kein `onClick`: er ist gerechnet,
            nicht umschaltbar. Sonst tippt man darauf und erwartet, dass „sterbend" geht.
          */}
          {sheet.hp.state !== "ok" && (
            <p
              className={`mt-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium leading-snug ${
                sheet.hp.state === "dead"
                  ? "border-slate-600 bg-slate-800 text-slate-200"
                  : "border-rose-700/70 bg-rose-950/50 text-rose-200"
              }`}
            >
              {S.dying.line(sheet.hp.state, sheet.hp.deadAt, sheet.hp.saveZoneDownTo)}
            </p>
          )}
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
      <div className="relative hidden flex-wrap gap-1 md:flex">
        {tabs.map((key) => (
          <Chip key={key} active={active === key} onClick={() => goTab(key)}>
            {/*
              Dasselbe Zeichen wie unten am Handy, nur kleiner und vor dem ganzen Wort.
              Hier stand vorher nichts: unten trugen die Reiter ein Emoji, oben nur Text —
              und damit sahen dieselben sieben Reiter auf dem iPad anders aus als auf dem
              iPhone. Seit die Zeichen aus dem Quelltext kommen, kostet die Angleichung
              nichts.
            */}
            <IconInline name={TAB_ICONS[key]} size={14} />
            {S.sheet.tabs[key]}
            {/*
              Der Punkt. Seine Wahl: „Ein Punkt am betroffenen Reiter" — man sieht,
              WO etwas offen ist, ohne einen Text zu lesen. Die Zahl steht im
              Vorlese-Text, damit sie nicht verloren ist.
            */}
            {issueTabs.has(key) && (
              <OpenDot
                label={S.open.tabDot(issueTabs.get(key) ?? 0)}
                className="ml-1 align-middle"
                ring={false}
              />
            )}
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

      {/*
        Die Hinweise des AKTIVEN Reiters — einmal hier statt siebenmal in den
        Reitern. Der Punkt an der Reiterleiste führt hierher, also steht die Karte
        oben und nicht unten; und ein achter Reiter kann sie nicht vergessen.
      */}
      <IssueCard sheet={sheet} tab={active} save={save} />

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
        Mobile Reiter-Leiste: ganz unten, in Daumenreichweite. Icons + Kurzlabel, damit
        alle sieben Reiter nebeneinander passen.

        Sie saß über der Hauptnavigation und rechnete deren Höhe ein. Seit die Navigation
        oben sitzt (sein Auftrag), ist unten Platz — und der Abstand von 3,5rem wäre jetzt
        ein Band, das über dem Rand schwebt. Dafür braucht sie das Polster für den unteren
        Geräte-Rand, das vorher die Navigation getragen hat.
      */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-800 bg-slate-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {tabs.map((key) => (
          <button
            key={key}
            onClick={() => goTab(key)}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[9px] font-medium leading-none ${
              active === key ? "text-amber-400" : "text-slate-400"
            }`}
            {...(issueTabs.has(key)
              ? { "aria-label": `${S.sheet.tabs[key]}: ${S.open.tabDot(issueTabs.get(key) ?? 0)}` }
              : {})}
          >
            <Icon name={TAB_ICONS[key]} size={19} />
            {/*
              Am Handy sitzt der Punkt AM SYMBOL und nicht hinter dem Wort: die
              Kurzform („Ausr.", „Fert.") füllt die Zelle schon aus, und ein Zeichen
              mehr würde umbrechen. `absolute`, damit die Zeile ihre Höhe behält —
              sonst rutschte die ganze Leiste, sobald ein Punkt auftaucht.

              Genau hier war er zu leise: er saß auf einem Emoji, dessen Farbe die
              Schriftart des Geräts bestimmte (ein gelber Punkt auf gelben Funken).
              Das Zeichen ist jetzt ein Strich in unserer Farbe — der Ring bleibt
              aber: der Strich trägt die KLASSENFARBE, und die wechselt je Bogen.
              Ein fester Kontrast wäre also weiter nur geraten.
            */}
            {issueTabs.has(key) && <OpenDot className="absolute right-[22%] top-1" />}
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
        dying={{
          state: sheet.hp.state,
          text: S.dying.line(sheet.hp.state, sheet.hp.deadAt, sheet.hp.saveZoneDownTo),
          stabilized: character.hp.stabilized,
          onToggleStabilized: () =>
            save((c) => void (c.hp.stabilized = !c.hp.stabilized)),
        }}
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
                roll(d20Roll(mod), `${character.name}: ${breakdown.title}`);
                setBreakdown(null);
              }
            : undefined
        }
      />

      <CharacterActionsSheet
        character={character}
        /*
          Der abgeleitete Bogen wird hier hereingegeben und nicht im Blatt geholt:
          dasselbe Blatt hängt auch an der Charakterliste, und dort würde es je
          Zeile eine Kompendiums-Abfrage aufziehen. Nebenbei ist es die Weiche für
          die Rast — ohne Bogen keine Rast, denn einen Bogen zu rasten, den man
          nicht ansieht, will niemand.
        */
        sheet={sheet}
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
