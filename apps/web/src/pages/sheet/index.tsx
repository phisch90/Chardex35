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
import { useEditModeStore } from "../../lib/editMode.js";
import { BreakdownSheet } from "../../ui/Breakdown.js";
import { HpPad } from "../../ui/HpPad.js";
import { Chip, GhostButton, OpenDot, d20Roll, fmtMod } from "../../ui/bits.js";
import { SwipeTabs } from "../../ui/SwipeTabs.js";
import { OrderBanner } from "../../group/OrderBanner.js";
import { IdentityCard } from "./Identity.js";
import { ShareCharacterButton } from "../../ui/ShareCharacter.js";
import { CharacterActionsSheet } from "../../ui/CharacterActions.js";
import { IssueCard } from "../../ui/IssueCard.js";
import { useAccentAttribute } from "../../ui/classAccents.js";
import { Icon, IconInline, type IconName } from "../../ui/icons.js";
import { ClassMark } from "../../ui/ClassMark.js";
import { CombatTab, SkillsTab, StatsTab } from "./tabs-core.js";
import { FeatsTab, InventoryTab, NotesTab } from "./tabs-more.js";
import { SpellsTab } from "./SpellsTab.js";
import {
  BLATT_BREITE,
  LEISTE_VERSATZ,
  useBreiterSchirm,
} from "../../ui/layoutMetrics.js";

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

const TAB2_MEMORY = "codex35.sheet.tab2.";

/**
 * Was rechts steht — mit DREI Zuständen, und der dritte ist der Grund für diese Runde.
 *
 * Sein Befund zum fertigen iPad-Bogen: „Bitte mache 2 Reiter auf ein Bild. Sonst ist ein
 * Reiter zuuuuu breit." Er hat recht — eine einzelne Spalte über 1100 px ist keine
 * lesbare Zeile mehr. Zwei Ansichten sind also der NORMALFALL und nicht etwas, das man
 * erst aufschlägt.
 *
 * Damit er sie trotzdem zumachen kann, reicht „ein Reiter oder nichts" nicht: `null`
 * hieße sonst gleichzeitig „noch nie entschieden" und „ausdrücklich zu", und der
 * Schließen-Knopf wäre wirkungslos. Deshalb `"zu"` als eigener gespeicherter Wert und
 * `undefined` für „noch nichts gewählt".
 */
const TAB2_CLOSED = "zu";

function rememberedTab2(charId: string): TabKey | typeof TAB2_CLOSED | undefined {
  try {
    const stored = sessionStorage.getItem(TAB2_MEMORY + charId);
    if (stored === TAB2_CLOSED) return TAB2_CLOSED;
    if (stored !== null && stored in S.sheet.tabs) return stored as TabKey;
  } catch {
    // siehe rememberedTab
  }
  return undefined;
}

export function CharacterSheetPage() {
  const { charId } = useParams({ strict: false }) as { charId: string };
  const navigate = useNavigate();
  const character = useCharacter(charId);
  const sheet = useSheet(character);
  const compendium = useCompendium();
  const [tab, setTab] = useState<TabKey>(() => rememberedTab(charId));
  /*
    Die ZWEITE Ansicht. `null` heißt „nur eine" — das ist der Normalfall und der einzige
    unter 1024 px.

    Gemerkt wie der erste Reiter, je Bogen und nur für diese Sitzung: womit er heute
    Abend spielt, ist kein Zustand seiner Figur.
  */
  const [tab2, setTab2] = useState<TabKey | typeof TAB2_CLOSED | undefined>(() =>
    rememberedTab2(charId),
  );
  /*
    Und dieser Hook steht HIER und nicht unten bei seiner Verwendung — die zehnte Falle
    dieses Projekts, und sie ist mir damit zum dritten Mal passiert: unter den Zeilen
    steht `if (character === undefined) return …`. Solange der Bogen lud, lief der Hook
    nicht; sobald er da war, lief er, und React zählte einen Hook mehr als beim Durchlauf
    davor — Fehler 310, die halbe Seite weiß.

    Gemeldet hat es wieder nur der Lauf im gebauten Bogen: ein Hook hinter einer Bedingung
    ist gültiges TypeScript, und `pnpm test` rendert diese Seite nicht.
  */
  const breit = useBreiterSchirm();
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
  const setEditModeActive = useEditModeStore((s) => s.set);
  const { diceEnabled, classAccent } = useAppSettings();

  /*
    Die Klassenfarbe ans <html>, solange DIESER Bogen offen ist — draußen färbt die
    Kampagne (Startseite), drinnen die Klasse. Der Effekt selbst wohnt in
    `useAccentAttribute` (classAccents.ts), weil die Übersichts-Seite dieselbe Farbe
    trägt: sie zeigt denselben Charakter.
  */
  useAccentAttribute(character);

  /*
    Merken, welcher Bogen offen ist — dafür ist der Knopf „Zurück zu …" in den
    Einstellungen da. Der Hook steht VOR den frühen `return`s und rechnet mit dem noch
    nicht geladenen Charakter (zehnte Falle: ein Hook hinter einer Bedingung ist kein
    Hook — „Minified React error #310").
  */
  useEffect(() => {
    if (character) rememberSheet(character.id);
  }, [character]);

  /*
    Der Bearbeiten-Modus in den Store, damit die HÜLLE ihre Hauptnavigation ausblenden kann
    (`ui/Layout.tsx`). Zurückgesetzt wird im Aufräumen und nicht in einem Klick: ein Klick
    kann übersprungen werden (Zurück-Wischen, Adresszeile, ein Link im ⋯-Blatt), das
    Aufräumen nicht. Bliebe er stehen, wäre die Navigation auf der Startseite weg — ein
    Zustand, aus dem man nicht mehr herausfindet.

    Der Hook steht VOR den frühen `return`s: ein Hook hinter einer Bedingung ist kein Hook
    (zehnte Falle, „Minified React error #310").
  */
  useEffect(() => {
    setEditModeActive(editMode);
    return () => setEditModeActive(false);
  }, [editMode]);

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

  /*
    Die zweite Ansicht steht nur da, wenn BEIDES stimmt: er hat sie aufgeschlagen UND es
    ist wirklich Platz. Die Breite wird GEMESSEN (`useBreiterSchirm`) und nicht aus der
    Einstellung geschlossen — wer im Querformat zwei Ansichten öffnet und dann dreht,
    hat die Einstellung noch, den Platz nicht. Ohne diese zweite Hälfte bliebe im
    Hochformat das Wischen abgeschaltet, während nur eine Ansicht dasteht, und der Grund
    wäre nirgends zu sehen. Dieselbe Regel wie bei der Reiterleiste: wer ein Hüllenmaß
    einrechnet, muss prüfen, ob die Hülle in dieser Breite dieselbe ist.
  */
  /*
    Ohne eigene Wahl steht rechts der NÄCHSTE Reiter — gerechnet und nicht gespeichert.
    Das ist seit seinem Befund der Normalfall: „Bitte mache 2 Reiter auf ein Bild. Sonst
    ist ein Reiter zuuuuu breit."

    Der Nebennutzen: wechselt er links auf genau den Reiter, der rechts steht, rutscht der
    Standard von allein weiter. Zweimal derselbe Inhalt kann so gar nicht entstehen.
  */
  const rechts: TabKey | null =
    tab2 === TAB2_CLOSED
      ? null
      : tab2 !== undefined && tabs.includes(tab2)
        ? tab2
        : (tabs.find((t) => t !== active) ?? null);
  const geteilt = breit && rechts !== null;

  const merkeTab2 = (key: TabKey | null) => {
    /*
      `null` heißt hier „zumachen", und das wird als eigener Wert GESPEICHERT: ohne ihn
      wäre es vom Anfangszustand nicht zu unterscheiden, und der Schließen-Knopf ginge
      beim nächsten Rendern wieder auf.
    */
    const wert = key ?? TAB2_CLOSED;
    setTab2(wert);
    try {
      sessionStorage.setItem(TAB2_MEMORY + character.id, wert);
    } catch {
      // siehe rememberedTab
    }
  };

  /*
    Rechts denselben Reiter zu wählen, der schon links steht, TAUSCHT die beiden.

    Die Alternative wäre, es zu verbieten oder zu warnen — aber zweimal derselbe Inhalt
    nebeneinander ist kein Zustand, den jemand meint, und eine gesperrte Kachel in einer
    Reihe aus sieben sieht nach einem Fehler aus. Tauschen hat keinen toten Zustand:
    jeder Tipp führt zu etwas Sinnvollem.
  */
  const goTab2 = (key: TabKey) => {
    if (key === active) {
      if (rechts !== null) goTab(rechts);
      merkeTab2(active);
      return;
    }
    merkeTab2(key);
  };

  /**
   * Wieder aufschlagen heisst zurück zum STANDARD und nicht zu einem festen Reiter: so
   * folgt die rechte Spalte wieder dem linken Wechsel, statt stehenzubleiben.
   */
  const oeffneZweite = () => {
    setTab2(undefined);
    try {
      sessionStorage.removeItem(TAB2_MEMORY + character.id);
    } catch {
      // siehe rememberedTab
    }
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
    /*
      Extra Platz unten, damit die Reiter-Leiste nichts überdeckt — und ab `md` nur dann,
      wenn es die Leiste dort überhaupt GIBT. Sie steht dort seit dieser Runde im
      Bearbeiten-Modus; ein Polster für eine Leiste, die es nicht gibt, ist die fünfte
      Falle, ein fehlendes für eine, die es gibt, deren Kehrseite.
    */
    <div className={`relative space-y-3 pb-14 ${editMode ? "" : "md:pb-0"}`}>
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
      {/*
        Porträt bildschirmbreit mit Name darüber — der Bogen soll nach dem Charakter
        aussehen, nicht nach einer Tabelle.

        WIRKLICH bis an den Rand, sein Wort dazu: „Gerne bis an den Rand." Vorher waren
        es 373 von 390 px, und die 17 fehlenden sind nachgerechnet und nicht geraten:
        `-mx-3` hebt nur das Polster der Karte auf (0,75rem), darunter liegen noch die
        Einrückung des Blatts und sein Rahmen — `.blatt` in `styles.css` steht auf
        `width: calc(100% - 0.8rem)` plus `border: 2px`, also 0,4rem + 2px je Seite.
        Zusammen 0,75rem + 0,4rem + 2px.

        Der Rahmen der KARTE steckt nicht mit drin, und das ist der Fund der Messung:
        meine erste Fassung zog ihn mit ab und machte das Bild 394 statt 390 px breit —
        vier Pixel zu viel, links und rechts je zwei aus dem Bild heraus. Eine gerechnete
        Marge ist eine Behauptung, bis sie gemessen ist.

        Die Rundung oben fällt dafür weg (`rounded-t-none` an der Karte wäre falsch — die
        Karte behält sie, das BILD deckt sie ab): ein Bild, das an den Rand läuft, hat
        oben keine Ecken mehr. Geprüft wird die Breite im gebauten Bogen, weil eine
        gerechnete Marge in einer anderen Breite anders ausfallen kann.
      */}
      {character.portrait && (
        <div className="-mx-[calc(0.75rem+0.4rem+2px)] -mt-3 relative h-40 overflow-hidden sm:h-52">
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

      {/*
        Auf Desktop bleiben die Reiter oben; mobil sitzen sie unten am Daumen.

        IM BEARBEITEN-MODUS ist diese Reihe weg — dort trägt die rote Leiste unten die
        Reiter, in JEDER Breite (seine Wahl: „Rote Leiste TRÄGT die Reiter"). Stünden
        beide da, gäbe es zwei Reiterleisten für dieselbe Frage, und die obere wäre
        genau die „Kopfleiste", die verschwinden sollte.
      */}
      <div className={`relative flex-wrap gap-1 ${editMode ? "hidden" : "hidden md:flex"}`}>
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
        {/*
          Nur dort, wo zwei Ansichten wirklich passen — `lg` ist dieselbe Grenze wie in
          `BLATT_BREITE` und in `useBreiterSchirm`. Ein Knopf, der im Hochformat nichts
          bewirkt, wäre ein Versprechen ohne Weg.
        */}
        {/* `GhostButton` trägt sein `aria-label` selbst aus `title` — der Platz kommt
            deshalb vom Kasten darum und nicht vom Knopf. */}
        <span className="ml-auto hidden lg:block">
          <GhostButton
            title={geteilt ? S.sheet.splitClose : S.sheet.splitOpen}
            onClick={() => (geteilt ? merkeTab2(null) : oeffneZweite())}
          >
            ⧉ {geteilt ? S.sheet.splitClose : S.sheet.splitOpen}
          </GhostButton>
        </span>
      </div>

      {/*
        Der Bearbeiten-Modus gilt für den ganzen Bogen und bleibt beim Reiterwechsel an,
        damit man Ränge, Talente und Ausrüstung in einem Durchgang nachträgt.

        HIER steht dazu nichts mehr. Der Streifen saß oben über dem Inhalt; sein Auftrag
        war: „dann möchte ich bitte, dass Kopf- und Fußleisten verschwinden und dafür die
        Warnung, dass ich im Bearbeitungsmodus bin, klar erkennbar … rötlich am unteren
        Bildrand." Die Warnung IST jetzt die Reiterleiste unten — sie wird rot und trägt
        „Bearbeiten beenden" links neben den Reitern.

        Damit gewinnt der Inhalt oben eine Zeile, und die Warnung steht dort, wo der Daumen
        ohnehin liegt. Eingeschaltet wird weiter nur im ⋯-Blatt.
      */}

      {/* Umbenennen gehört an den Anfang: was man ändern will, sieht man dabei —
          und mit Porträt liegt der Name im Bild, wo ein Eingabefeld nichts zu
          suchen hat. */}
      {editMode && <IdentityCard character={character} save={save} />}

      {/*
        Die Hinweise des AKTIVEN Reiters — einmal hier statt siebenmal in den
        Reitern. Der Punkt an der Reiterleiste führt hierher, also steht die Karte
        oben und nicht unten; und ein achter Reiter kann sie nicht vergessen.
      */}
      {/*
        Der Inhalt EINES Reiters. Herausgezogen, weil es ihn seit der zweiten Ansicht
        zweimal gibt — stünde die Liste zweimal da, würde ein achter Reiter beim nächsten
        Mal in genau einer der beiden vergessen.
      */}
      {(() => {
        const koerper = (key: TabKey) => (
          <>
            {/*
              Die Hinweise gehören zu IHRER Ansicht. Vorher stand die Karte einmal oben
              für den aktiven Reiter; nebeneinander wäre das die Hälfte der Wahrheit —
              der Punkt an einem Reiter führte dann zu einer Karte, die von der anderen
              Spalte redet.
            */}
            <IssueCard sheet={sheet} tab={key} save={save} />
            {key === "stats" && <StatsTab {...tabProps} />}
            {key === "combat" && <CombatTab {...tabProps} />}
            {key === "skills" && <SkillsTab {...tabProps} />}
            {key === "spells" && hasSpells && <SpellsTab {...tabProps} />}
            {key === "inventory" && <InventoryTab {...tabProps} />}
            {key === "feats" && <FeatsTab {...tabProps} />}
            {key === "notes" && <NotesTab {...tabProps} />}
          </>
        );

        /*
          EINE Ansicht: alles wie bisher, samt Wischen zwischen den Reitern.

          Im geteilten Zustand ist das Wischen AUS — bei zwei Spalten ist nicht mehr
          eindeutig, welche der beiden eine Wischbewegung meint, und ein Reiterwechsel,
          den man nicht gemeint hat, ist schlimmer als kein Wischen. Am Handy und im
          Hochformat bleibt es unverändert, weil es dort gar keine zweite Spalte gibt.
        */
        if (!geteilt || rechts === null) {
          return (
            <SwipeTabs
              onPrev={before === undefined ? undefined : () => goTab(before)}
              onNext={after === undefined ? undefined : () => goTab(after)}
            >
              {koerper(active)}
            </SwipeTabs>
          );
        }

        return (
          <div className="grid grid-cols-2 gap-4" data-geteilt="ja">
            <div className="min-w-0">{koerper(active)}</div>
            {/*
              Die rechte Spalte trägt ihre eigene Reiterreihe. Ohne sie müsste man
              erraten, welcher Tipp welche Spalte meint — und ein zweiter Zustand ohne
              eigenes Bedienelement ist die Familie „etwas weiß es, und etwas anderes
              kann es nicht".
            */}
            <div className="min-w-0">
              {/*
                NUR die Zeichen, kein `flex-wrap`. Mit den Kurznamen brach die Reihe bei
                sieben Reitern in eine zweite Zeile um, „Notiz" stand allein darin und
                schob das ✕ mit — eine Zeile, die nur aus der Spaltenbreite entsteht, ist
                genau sein Einwand an den Wertekacheln. Gefunden hat das der BLICK aufs
                Bild; alle 40 Prüfungen waren dabei grün, sie lesen ja nur den Text.

                Der Name hängt als `title` daran — dieselbe Entscheidung wie an der
                Symbolleiste links, und aus demselben Grund: ein abgeschnittenes Wort ist
                schlimmer als gar keines.
              */}
              {/*
                Seine Antwort auf das eingekreiste Bild („Mach das schöner"): die Zeichen
                OHNE Kästchen. Vorher trug jeder der sieben Reiter seinen eigenen Rahmen,
                und das waren sieben Kästen für eine Nebensache — neben der großen
                Chip-Reihe der Hauptspalte sah es nach einem zweiten System aus.

                Jetzt trägt nur der AKTIVE eine Fläche; die anderen sind nackte Zeichen,
                die beim Darüberfahren aufhellen. Die Trennlinie ist mit weg: sie zog eine
                dritte waagerechte Ebene ein, obwohl die Karte darunter schon einen Rahmen
                hat.

                **Und das ✕ ist weg.** Dasselbe Schließen stand zweimal auf einem Schirm —
                hier und oben als „Zweite Ansicht schließen". Eine Sache, ein Knopf; das
                ist die Doppelung, die diese App überall vermeidet, und im Bild war sie das
                Auffälligste.

                Das Ziel bleibt groß genug für einen Daumen (h-9 w-9 = 36 px), auch ohne
                Rahmen — ein Zeichen, das man nicht trifft, ist kein Bedienelement.
              */}
              {/*
                Die SCHIENE. Sieben nackte Zeichen erfüllen zwar seinen Wunsch („ohne
                Kästchen"), aber allein wären sie kein erkennbares Bedienelement mehr —
                und „ein Knopf, den man nicht als Knopf erkennt, ist keiner" steht als
                seine eigene Regel in CLAUDE.md. Ein gemeinsamer, sehr leiser Kasten sagt
                „hier ist eine Auswahl", ohne dass jedes Zeichen einen Rahmen braucht.

                `w-fit`, damit die Schiene nur so breit ist wie ihre Zeichen: über die
                ganze Spalte gezogen wäre sie wieder ein Band.
              */}
              <div className="mb-2 flex w-fit items-center gap-0.5 rounded-xl bg-slate-900/70 p-1">
                {tabs.map((key) => (
                  <button
                    key={key}
                    type="button"
                    title={S.sheet.tabs[key]}
                    aria-label={S.sheet.tabs[key]}
                    aria-pressed={rechts === key}
                    onClick={() => goTab2(key)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      rechts === key
                        ? "bg-amber-600/20 text-amber-300"
                        : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                    }`}
                  >
                    <IconInline name={TAB_ICONS[key]} size={18} />
                  </button>
                ))}
              </div>
              {koerper(rechts)}
            </div>
          </div>
        );
      })()}

      {/*
        Mobile Reiter-Leiste: ganz unten, in Daumenreichweite. Icons + Kurzlabel, damit
        alle sieben Reiter nebeneinander passen.

        Sie saß über der Hauptnavigation und rechnete deren Höhe ein. Seit die Navigation
        oben sitzt (sein Auftrag), ist unten Platz — und der Abstand von 3,5rem wäre jetzt
        ein Band, das über dem Rand schwebt. Dafür braucht sie das Polster für den unteren
        Geräte-Rand, das vorher die Navigation getragen hat.
      */}
      {/*
        Im BEARBEITEN-Modus wird dieselbe Leiste rot und trägt links den Ausgang — seine
        Wahl auf die Frage, wie man dann noch die Seite wechselt: „Rote Leiste TRÄGT die
        Reiter." Damit bleibt der Wechsel dort, wo der Daumen ihn kennt, der Modus ist
        dauerhaft sichtbar (er wollte ihn „klar erkennbar … rötlich am unteren Bildrand"),
        und man bleibt beim Wechseln im Modus.

        `rose` und nicht `red`: rot ist in diesem Bogen die GEFAHRENfarbe (Löschen), und
        eine Warnung, die wie ein Löschknopf aussieht, ist die elfte Falle in neuer Gestalt.
        Rosé ist seit dieser Runde die Farbe für „hier ist etwas offen" — und das ist der
        Bearbeiten-Modus: ein Zustand, der auf sein Ende wartet.

        **Und das `md:hidden` gilt nur AUSSERHALB des Modus.** Gewöhnlich ist diese Leiste
        die Handy-Fassung der Reiter und ab `md` überflüssig — im Bearbeiten-Modus ist sie
        die WARNUNG und der einzige Ausgang, und beides darf nicht an einer Bildschirmbreite
        hängen. Sein Wort „Leiste mit Hover Effekt" sagt es selbst: ein Daumen fährt nicht
        darüber, gemeint ist also gerade die große Fassung. Ab `md` rückt sie hinter die
        Symbolleiste (`LEISTE_VERSATZ`), damit sie nichts überdeckt, was daneben steht.
      */}
      <nav
        className={`fixed inset-x-0 bottom-0 z-30 flex border-t pb-[env(safe-area-inset-bottom)] backdrop-blur ${
          editMode
            ? `border-rose-700 bg-rose-950/95 ${LEISTE_VERSATZ}`
            : "border-slate-800 bg-slate-900/95 md:hidden"
        }`}
      >
        {/*
          Die Knöpfe laufen bis zur Blattbreite und dann mittig — dieselbe wie das Blatt
          darüber. Am Handy ändert das nichts (dort ist der Bildschirm schmaler); ab `md`
          stünden sieben Reiter sonst über die ganze Breite verteilt und hätten mit dem
          Bogen darüber nichts mehr zu tun.
        */}
        <div className={`flex ${BLATT_BREITE}`}>
        {editMode && (
          /*
            Der Ausgang ganz links, vor den Reitern: er ist der einzige Knopf hier, der
            etwas ÄNDERT, und beim Nachtragen tippt man ihn zuletzt. `hover` für die Maus,
            `active` für den Daumen — am Handy gibt es kein Darüberfahren, also muss der
            Druck selbst antworten.
          */
          <button
            type="button"
            onClick={() => setEditMode(false)}
            className="flex shrink-0 flex-col items-center justify-center gap-0.5 border-r border-rose-800 px-2.5 py-1.5 text-[9px] font-semibold leading-none text-rose-200 hover:bg-rose-900/60 active:bg-rose-900"
          >
            <span className="text-base leading-none">✎</span>
            {S.sheet.editStopShort}
          </button>
        )}
        {tabs.map((key) => (
          <button
            key={key}
            onClick={() => goTab(key)}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[9px] font-medium leading-none ${
              active === key
                ? editMode
                  ? "text-rose-100"
                  : "text-amber-400"
                : editMode
                  ? "text-rose-300/70"
                  : "text-slate-400"
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
            {active === key && (
              <span
                className={`mt-0.5 h-0.5 w-6 rounded-full ${editMode ? "bg-rose-200" : "bg-amber-400"}`}
              />
            )}
          </button>
        ))}
        </div>
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
        editMode={editMode}
        onToggleEdit={() => setEditMode(!editMode)}
      />
    </div>
  );
}

export function statText(value: StatValue): string {
  return fmtMod(value.total);
}
