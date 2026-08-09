import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ABILITIES,
  ABILITY_BASE_SOURCE,
  abilityAdviceFor,
  pointBuyCost,
  pointBuyState,
  suggestPointBuy,
  adviceFor,
  characterSchema,
  classCategory,
  conflictingEquipIds,
  cycleEquipSlot,
  deriveSheet,
  displayName,
  isWeaponEntity,
  maxRanks,
  openBuildWork,
  proficiencyFor,
  resolveCompendium,
  starterKit,
  weaponSuggestions,
  skillPointCost,
  stepRank,
  suggestTrackers,
  type Ability,
  type AbilityBlock,
  type Advice,
  type Character,
  type DerivedSheet,
  type Entity,
  type EquipSlot,
  type SkillLine,
  type SpellcastingBlock,
} from "@codex35/core";
import { S } from "../strings.js";
import { IconInline } from "../ui/icons.js";
import { CharacterRepo } from "../db/repo.js";
import { reportSaveFailure } from "../lib/saveError.js";
import { useAllEntities, useCompendium, useHouseRules } from "../lib/hooks.js";
import {
  Card,
  Chip,
  GhostButton,
  NumberStepper,
  PrimaryButton,
  SearchInput,
  SectionTitle,
  fmtMod,
} from "../ui/bits.js";
import { EquipMark } from "../ui/EquipMark.js";
import { itemSummary } from "../ui/itemSummary.js";
import { ItemPicker } from "../ui/ItemPicker.js";
import { FeatPicker } from "../ui/FeatPicker.js";
import { AdviceCard } from "../ui/AdviceCard.js";
import { SubtypePicker } from "../ui/SubtypePicker.js";
import { DomainPicker } from "../ui/DomainPicker.js";
import { SpellPicker } from "../ui/SpellPicker.js";
import { SkillAdviceLine, SkillMark, suggestionWhy } from "../ui/SkillAdvice.js";
import { CampaignPicker, type CampaignValue } from "../ui/CampaignPicker.js";
import { DraftSummary } from "../ui/DraftSummary.js";
import { OpenWorkConfirm } from "../ui/OpenWorkConfirm.js";
import { FeatText } from "../ui/FeatText.js";
import { ClassInfo, RaceInfo, classDetailLine, raceDetailLine } from "../ui/RaceClassInfo.js";
import { PickTiles } from "../ui/PickTiles.js";
import { raceIconName } from "../ui/raceIcon.js";
import { accentOfClass } from "../ui/classAccents.js";

interface Draft {
  name: string;
  playerName: string;
  /** Kampagne und Farbe — schon beim Anlegen, seine Entscheidung. */
  campaign: CampaignValue | undefined;
  raceId: string | null;
  base: Record<Ability, number>;
  classId: string | null;
  skillRanks: Record<string, number>;
  skillSubtypes: { skillId: string; subtype: string }[];
  /*
    Die WAHL gehört zum Talent und wird beim Auswählen getroffen — „Weapon Focus"
    ohne Waffe ist ein Eintrag, der nichts tut. `choiceRef` ist die Kennung des
    Waffentyps, `choice` der Name für die Anzeige.
  */
  featIds: { featId: string; choice?: string; choiceRef?: string }[];
  inventory: { id: string; itemId: string; qty: number; slot: EquipSlot }[];
  /** Gewählte Zauber je Klasse — nur für Klassen, die sich festlegen MÜSSEN. */
  known: string[];
  /**
   * Gewählte Domänen (Kennungen der Zauberlisten).
   *
   * Die WAHL der Domäne ist eine Eingabe und steht am Charakter; der PLATZ je
   * Zaubergrad ist eine Folge und wird gerechnet. Deshalb steht hier nur die
   * Kennung — nichts von den neun Zaubern, die daran hängen.
   */
  domains: string[];
  /**
   * Welche Zähler-Vorschläge NICHT mitkommen sollen (Schlüssel des Vorschlags).
   *
   * Abgewählte statt gewählte, weil die Vorschläge angehakt SIND (seine
   * Entscheidung) — und weil die Liste sich ändert, sobald Klasse oder Attribute
   * sich ändern. Eine Liste der Gewählten wäre nach jedem Klassenwechsel veraltet.
   */
  trackersOff: string[];
  /** Eigene Zähler, schon beim Anlegen. */
  ownTrackers: { name: string; max: number | null }[];
}

const INITIAL: Draft = {
  name: "",
  playerName: "",
  campaign: undefined,
  raceId: null,
  base: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  classId: null,
  skillRanks: {},
  skillSubtypes: [],
  featIds: [],
  inventory: [],
  known: [],
  domains: [],
  trackersOff: [],
  ownTrackers: [],
};

/** Entwurf → valider Charakter (Stufe 1, TP max) für Live-Ableitung + Anlage. */
function draftToCharacter(
  draft: Draft,
  /**
   * Die Zähler. Sie hängen am ABGELEITETEN Bogen (die Vorschläge rechnen mit Stufe und
   * Attributen), und der entsteht aus genau dieser Funktion — sie können also nicht von
   * innen kommen. Beim Live-Ableiten während des Assistenten bleiben sie leer; erst beim
   * Anlegen werden sie mitgegeben.
   */
  trackers: ReturnType<typeof trackersFromDraft> = [],
): Character {
  return characterSchema.parse({
    id: "draft",
    name: draft.name || "Unbenannt",
    playerName: draft.playerName || undefined,
    campaign: draft.campaign,
    raceId: draft.raceId ?? "",
    abilities: { base: draft.base },
    levels: draft.classId ? [{ classId: draft.classId, hpRoll: "max" }] : [],
    skillRanks: draft.skillRanks,
    skillSubtypes: draft.skillSubtypes,
    /*
      Jede Wahl trägt ihre Herkunft — sein Auftrag: „die Talente [sollen] die Info
      zeigen woher sie kommen … in welchem Level ich sie dazu genommen hab." Im
      Assistenten ist das immer Stufe 1.
    */
    feats: draft.featIds.map((entry) => ({ ...entry, origin: { level: 1 } })),
    inventory: draft.inventory,
    /*
      Gewählte Zauber gehören zur Klasse, nicht an den Charakter global: ein
      Kleriker/Magier hat zwei Zauberblöcke. Im Assistenten gibt es genau eine Klasse,
      also genau einen Eintrag.
    */
    spellState:
      draft.classId !== null && draft.known.length > 0
        ? { [draft.classId]: { known: draft.known, prepared: [], usedSlots: [] } }
        : {},
    /*
      Domänen gehören NEBEN `spellState`, nicht hinein: sie sind Aufbau, nicht
      Spielzustand. Beim Gruppen-Regal gehört der Spielzustand dem Spieler, der
      Aufbau dem Spielleiter — eine Domäne im Spielzustand könnte der SL nicht
      setzen. (Dieselbe Trennung wie am Bogen, `character.domains`.)
    */
    domains:
      draft.classId === null
        ? []
        : draft.domains.map((spellListId) => ({ classId: draft.classId!, spellListId })),
    trackers,
  });
}

/**
 * Welche Zähler kommen mit?
 *
 * Die Vorschläge sind angehakt (seine Entscheidung), also entstehen sie HIER aus dem
 * abgeleiteten Bogen und nicht aus einer Liste, die beim Anhaken eingefroren wurde.
 * Genau daran ist Extra Turning schon einmal gescheitert: ein Zähler mit
 * abgeschriebenem Maximum veraltet beim nächsten Talent. Deshalb trägt jeder aus einem
 * Vorschlag entstandene Zähler nur `suggestedFrom` — die Zahl holt sich die Anzeige
 * jedes Mal frisch (`effectiveTrackerMax`).
 *
 * Zwei Dinge standen hier trotzdem falsch, und beide fielen erst auf, als die
 * Aktionspunkte durch DIESEN Weg liefen:
 *
 * 1. `max: suggestion.max` wurde mitgeschrieben — genau das, was der Absatz darüber
 *    verspricht NICHT zu tun. Es fiel nicht auf, weil `maxManual` dabei ungesetzt blieb
 *    und `effectiveTrackerMax` dann sowieso den Vorschlag gewinnen lässt. Eine
 *    Momentaufnahme, die niemand liest, ist trotzdem eine Momentaufnahme.
 * 2. `value: 0` — ein im Assistenten angelegter Bogen startete mit LEEREN Zählern
 *    („Untote vertreiben 0/3"), während derselbe Zähler am Bogen voll beginnt. Eine
 *    neue Figur hat ihre Tagesfähigkeiten noch nicht verbraucht.
 */
function trackersFromDraft(draft: Draft, sheet: DerivedSheet | undefined) {
  const fromSuggestions = (sheet === undefined ? [] : suggestTrackers(sheet))
    .filter((suggestion) => !draft.trackersOff.includes(suggestion.key))
    .map((suggestion, i) => ({
      id: `s${i}-${suggestion.key}`,
      name: suggestion.name,
      kind: "counter" as const,
      value: suggestion.max,
      maxManual: false,
      suggestedFrom: suggestion.key,
      // Die Bedingung ist am Zähler eine Eingabe — ohne sie fiele er auf „kurze
      // Pause" zurück, und die Aktionspunkte füllten sich zu früh.
      ...(suggestion.refill === undefined ? {} : { refill: [...suggestion.refill] }),
    }));
  const own = draft.ownTrackers.map((tracker, i) => ({
    id: `o${i}-${tracker.name}`,
    name: tracker.name,
    kind: "counter" as const,
    value: 0,
    ...(tracker.max === null ? {} : { max: tracker.max, maxManual: true }),
  }));
  return [...fromSuggestions, ...own];
}

/**
 * Die Schritte als SCHLÜSSEL, nicht als Zahlen.
 *
 * Die Reihenfolge ist Volk → KLASSE → Attribute, und das ist seine Entscheidung:
 * „weil dann kann man ein bisschen schauen, wenn man würfelt, dass man die Attribute
 * der Rasse und Klasse anpasst."
 *
 * Warum Schlüssel und nicht mehr `0…6`: der Zauberschritt gibt es nur für Klassen, die
 * sich festlegen MÜSSEN (Barde, Hexenmeister, Magier). Ein Kämpfer soll keinen leeren
 * Schirm durchklicken. Mit Zahlen hieße „Schritt weglassen", dass alle folgenden Indizes
 * verrutschen — und genau daran ist in diesem Projekt schon einmal etwas kaputtgegangen
 * (die Liste, die nach dem getippten Wert statt nach der Stelle geschlüsselt war).
 * Ein Schlüssel bleibt derselbe, egal wer vor ihm fehlt.
 */
const STEP_ORDER = [
  "race",
  "klass",
  "abilities",
  "skills",
  "feats",
  "domains",
  "spells",
  "gear",
  "trackers",
  "done",
] as const;
type StepKey = (typeof STEP_ORDER)[number];

/**
 * Was ein Schritt ERZWINGT, bevor es weitergehen darf.
 *
 * Beantwortet zwei Fragen aus EINER Quelle: ob „Weiter" gehen darf, und ob ein Reiter
 * oben antippbar ist. Zwei getrennte Regeln würden auseinanderlaufen — dann führt ein
 * Reiter in einen Schritt, aus dem „Weiter" nicht herauskommt.
 */
const GATES: { step: StepKey; ok: (draft: Draft) => boolean }[] = [
  { step: "race", ok: (d) => d.raceId !== null },
  { step: "klass", ok: (d) => d.classId !== null },
];

/**
 * Muss diese Klasse sich auf Zauber festlegen?
 *
 * Seine Entscheidung, gefragt und beantwortet: „nur wer wählen MUSS". Barde und
 * Hexenmeister kennen nur, was sie gewählt haben; der Magier kann nur vorbereiten, was
 * in seinem Buch steht. Kleriker und Druide kennen ihre ganze Liste — die wählen nichts
 * aus, die BEREITEN VOR, und das gehört an den Bogen, nicht ins Anlegen.
 */
function mustPickSpells(block: SpellcastingBlock | undefined): boolean {
  if (block === undefined) return false;
  return block.model === "spontaneous" || block.usesSpellbook;
}

export function CharacterWizardPage() {
  const navigate = useNavigate();
  const entities = useAllEntities();
  const compendium = useCompendium();
  const houseRules = useHouseRules();
  const [step, setStep] = useState<StepKey>("race");
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [showNpcClasses, setShowNpcClasses] = useState(false);
  /* Die Rückfrage am Ende — sie erscheint erst auf Tap, nicht als Dauerband. */
  const [askOpen, setAskOpen] = useState(false);

  const sheet = useMemo(() => {
    if (!compendium || !draft.raceId || !draft.classId) return undefined;
    return deriveSheet(draftToCharacter(draft), compendium, houseRules);
  }, [compendium, draft, houseRules]);

  if (!entities || !compendium) return <p className="text-slate-400">{S.misc.loading}</p>;

  const races = entities.filter((e) => e.kind === "race" && !e.deletedAt);
  /*
    NPC-Klassen tragen in den Packs auch das Tag `base` (sie sind so gebaut) —
    aber wer einen Charakter anlegt, will keinen Commoner zwischen Kleriker und
    Druide. Sie stehen hinter einem Schalter.
  */
  const classes = entities
    .filter((e) => e.kind === "class" && !e.deletedAt)
    .filter((e) => e.source === "homebrew" || e.tags.includes("base"))
    .filter((e) => showNpcClasses || classCategory(e) !== "npc")
    .sort((a, b) => a.name.localeCompare(b.name));

  /** Darf „Weiter" (bzw. „Anlegen") aus DIESEM Schritt heraus? */
  const canNext = () => {
    if (step === "done") return draft.name.trim().length > 0;
    return GATES.filter((g) => g.step === step).every((g) => g.ok(draft));
  };

  /**
   * Ist dieser Reiter antippbar?
   *
   * Vorher stand hier `i < step` — man kam nur zurück, nie vorwärts. Er hat es genau
   * erkannt: „man kann oben auf die einzelnen Reiter klicken, aber immer nur auf die,
   * die davor waren, also um zurückzukommen, nicht um weiterzukommen."
   *
   * Neue Regel: erreichbar, wenn alle Sperren DAVOR erfüllt sind. Wer Volk und Klasse
   * gewählt hat, springt also frei. Zurück geht immer — was man schon gesehen hat,
   * kann man wieder ansehen. „Davor" heißt in der SICHTBAREN Reihenfolge: fehlt der
   * Zauberschritt, darf seine Sperre auch nicht plötzlich für die Ausrüstung gelten.
   */
  const reachable = (key: StepKey) => {
    const target = steps.indexOf(key);
    if (target <= steps.indexOf(step)) return true;
    return GATES.filter((g) => steps.indexOf(g.step) < target).every((g) => g.ok(draft));
  };

  /**
   * Der Kontostand des Schritts — steht in der haftenden Leiste.
   *
   * Sein Einwand: „nicht immer nur ganz oben steht, wie viel Slots übrig sind, sondern
   * dass auch unten direkt schon gemeldet wird, ach Du kannst keins mehr nehmen."
   * Genau dort, wo der Daumen ohnehin liegt.
   */
  const budget = (): { text: string; warn: boolean } | null => {
    if (sheet === undefined) return null;
    if (step === "skills") {
      const left = sheet.skillPoints.available - sheet.skillPoints.spent;
      return left < 0
        ? { text: S.wizard.tooMany(-left), warn: true }
        : { text: `${S.wizard.pointsLeft}: ${left}`, warn: false };
    }
    if (step === "feats") {
      const left = sheet.featSlots.available - sheet.featSlots.used;
      if (left < 0) return { text: S.wizard.tooMany(-left), warn: true };
      return left === 0
        ? { text: S.wizard.noSlotsLeft, warn: false }
        : { text: `${S.wizard.slotsLeft}: ${left}`, warn: false };
    }
    return null;
  };

  const create = async () => {
    const data = draftToCharacter(draft, trackersFromDraft(draft, sheet));
    const { id: _drop, ...rest } = data;
    /*
      Der Assistent ist die längste Eingabe der App. Schlägt das Anlegen fehl,
      blieb er bisher einfach im letzten Schritt stehen — ohne ein Wort, und mit
      der Vermutung, der Knopf sei kaputt. Der Entwurf bleibt dabei erhalten, ein
      zweiter Versuch kostet also nur einen Tap.
    */
    const write = () => CharacterRepo.create(rest);
    let created: Character;
    try {
      created = await write();
    } catch (error: unknown) {
      reportSaveFailure(rest.name, error, write);
      return;
    }
    void navigate({ to: "/charaktere/$charId", params: { charId: created.id } });
  };


  const chosenRace = draft.raceId === null ? undefined : compendium.get(draft.raceId);
  const chosenClass = draft.classId === null ? undefined : compendium.get(draft.classId);
  /*
    Volk und Klasse dauerhaft im Kopf — sein Wunsch: „bei der Charaktererstellung, dass
    ganz oben immer auch steht, welches Volk und welche Klasse gewählt worden ist
    bisher." Vorher stand dort nur „Neuer Charakter", und im Talentschritt wusste man
    nicht mehr, für wen man gerade wählt.
  */
  const who = [chosenRace, chosenClass]
    .filter((e): e is NonNullable<typeof e> => e !== undefined)
    .map((e) => displayName(e))
    .join(" ");

  /*
    Die Empfehlung ist eine FOLGE aus Volk und Klasse — gerechnet, nie gespeichert.

    KEIN `useMemo`: hier unten steht der Aufruf hinter dem frühen `return` für das noch
    ladende Kompendium, und ein Hook hinter einer Bedingung wirft, sobald die Bedingung
    umschlägt. Die Rechnung ist ein Kartenzugriff und eine Schleife über sechs Attribute —
    dafür braucht es kein Memo.
  */
  const advice = adviceFor(chosenClass, chosenRace);

  /*
    Der Stand des Punktekaufs — `null`, solange in den Einstellungen kein Budget steht.
    Dann zählt die App nichts und sagt nichts (seine Entscheidung: „aus, bis ich es
    setze"), und jede Stelle unten prüft genau diese EINE Zahl.

    Gerechnet wird auf `draft.base`, also den Werten VOR den Volks-Modifikatoren: gekauft
    wird vor dem Volk, und ein Zwerg zahlt für seine +2 CON keine Punkte. Auch das ist
    kein Memo — sechs Tabellenzugriffe, und der Aufruf steht hinter demselben frühen
    `return` wie die Empfehlung darüber.
  */
  const punkte = pointBuyState(draft.base, houseRules.pointBuyBudget);

  /*
    Welche Schritte gibt es für DIESE Klasse? Der Zauberschritt fällt weg, wenn die Klasse
    sich nicht festlegen muss — ein Kämpfer klickt keinen leeren Schirm durch. Zähler gibt
    es dagegen immer: einen eigenen darf man auch als Kämpfer anlegen.
  */
  const spellBlock = sheet?.spellcasting[0];
  const needsSpells = mustPickSpells(spellBlock);
  /*
    Der Domänenschritt erscheint nur, wo die Klasse Domänen HAT — beim Kleriker
    zwei, sonst keine. Dieselbe Regel wie beim Zauberschritt, und aus demselben
    Grund über SCHLÜSSEL statt Zahlen: ein weggelassener Schritt darf die
    Nummerierung der folgenden nicht verrutschen lassen.
  */
  const domainPick = spellBlock?.domainPick ?? 0;
  const steps: StepKey[] = STEP_ORDER.filter(
    (key) => (key !== "spells" || needsSpells) && (key !== "domains" || domainPick > 0),
  );
  const stepIndex = steps.indexOf(step);
  const goto = (delta: number) => {
    const next = steps[stepIndex + delta];
    if (next !== undefined) setStep(next);
  };
  const isLast = stepIndex === steps.length - 1;

  /*
    Was beim Anlegen noch offen ist — Punkte, Talent-Slots, Domänen. Nicht das
    Tagesgeschäft: Zauber bereitet man morgens vor, nicht beim Anlegen
    (`openBuildWork`).
  */
  const openBuild = sheet === undefined ? [] : openBuildWork(sheet);

  /**
   * Auf welchen SCHRITT eine offene Sache zeigt.
   *
   * Nicht einfach `issue.tab`: die Domänen tragen den Reiter „spells“, weil sie am
   * Bogen dort stehen — im Assistenten haben sie aber ihren eigenen Schritt. Wer
   * hier den Reiter nimmt, landet in der Zauberauswahl und sucht dort die Domänen.
   */
  const stepOfIssue = (issue: (typeof openBuild)[number]): StepKey | undefined => {
    if (issue.code.startsWith("domains-")) return "domains";
    const byTab: Partial<Record<string, StepKey>> = {
      skills: "skills",
      feats: "feats",
      spells: "spells",
      inventory: "gear",
      stats: "abilities",
    };
    const key = issue.tab === undefined ? undefined : byTab[issue.tab];
    return key !== undefined && steps.includes(key) ? key : undefined;
  };

  const finish = () => {
    if (openBuild.length > 0) {
      setAskOpen(true);
      return;
    }
    void create();
  };

  /** „Zurück und nachtragen“ — zur ERSTEN offenen Stelle, in Schritt-Reihenfolge. */
  const backToOpen = () => {
    const target = openBuild
      .map(stepOfIssue)
      .filter((key): key is StepKey => key !== undefined)
      .sort((a, b) => steps.indexOf(a) - steps.indexOf(b))[0];
    setAskOpen(false);
    if (target !== undefined) setStep(target);
  };

  const stepBudget = budget();

  /*
    Zurück und Weiter — EINMAL beschrieben, an zwei Orten gezeigt.

    Sein Bild vom iPad, rot eingekreist: „Bitte weiter und zurück anders darstellen. So
    hab ich den Balken immer im Weg." Gefragt und entschieden: je Gerät getrennt. Am
    Handy unten, wo der Daumen liegt; ab `md` oben im Kopf, denn dort gibt es die untere
    Reiterleiste gar nicht (`ui/Layout.tsx:75` ist `md:hidden`) und ein Balken am unteren
    Rand hätte nichts, woran er sich anlehnt.

    Dasselbe Element-Objekt wird in beiden Hüllen gerendert — React macht daraus zwei
    Instanzen, aber `canNext()` und `finish()` stehen nur einmal da. Zwei Abschriften
    wären zwei Stellen, an denen eine Sperre vergessen werden kann.

    Der Kontostand geht in BEIDE: die Karten der Schritte schreiben nur das nackte
    „Slots übrig: -1" (`SkillStep`, `FeatStep`), die guten Sätze („Keine Talent-Slots
    mehr frei", „1 zu viel gewählt") kommen aus `budget()` hier.
  */
  const navButtons = (
    <>
      {stepBudget !== null && (
        <p
          className={`text-xs font-semibold ${
            stepBudget.warn ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {stepBudget.text}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <GhostButton
          onClick={() => (step === "race" ? void navigate({ to: "/" }) : goto(-1))}
        >
          {S.actions.back}
        </GhostButton>
        {!isLast ? (
          <PrimaryButton disabled={!canNext()} onClick={() => goto(1)}>
            {S.actions.next}
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled={!canNext()} onClick={() => void finish()}>
            {S.actions.create}
          </PrimaryButton>
        )}
      </div>
    </>
  );

  return (
    /*
      `pb-20` hält am Handy den Platz für die feste Knopfleiste frei (siehe unten) — ab
      `md` steht sie im Kopf, dort braucht es nichts. Genauso löst der Bogen es
      (`pages/sheet/index.tsx:163`: `pb-14 md:pb-0`).
    */
    <div className="space-y-3 pb-20 md:pb-0">
      {/*
        Der Kopf: Titel, Volk+Klasse, die sieben Schritt-Marken — und ab `md` die
        Knopfzeile rechts in der Titelzeile. NICHT in die Marken-Zeile: die sieben Marken
        brauchen bei `max-w-3xl` schon rund 630 von 736px, die Knöpfe würden umbrechen.

        Ab `md` haftet der ganze Block oben. Am Handy bleibt er, wie er war (er scrollt
        mit) — dort steht die Knopfzeile unten.
      */}
      <div className="space-y-2 md:sticky md:top-0 md:z-20 md:-mx-4 md:border-b md:border-slate-800 md:bg-slate-950 md:px-4 md:pb-2 md:pt-3">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h1 className="flex flex-wrap items-baseline gap-x-2 text-xl font-bold">
            {S.wizard.title}
            {who !== "" && <span className="text-sm font-medium text-amber-300">{who}</span>}
          </h1>
          <div className="ml-auto hidden items-center gap-3 md:flex">{navButtons}</div>
        </div>
        {/*
          Die Marken kommen aus den SICHTBAREN Schritten, und die Nummer ist die Stelle in
          dieser Liste — nicht der Index einer festen Tabelle. Fehlt der Zauberschritt,
          heißt der nächste trotzdem „6.", nicht „7.".
        */}
        <div className="flex flex-wrap gap-1">
          {steps.map((key, i) => {
            const open = reachable(key);
            return (
              <Chip
                key={key}
                active={key === step}
                {...(open ? { onClick: () => setStep(key) } : {})}
                {...(open ? {} : { title: S.wizard.needRaceAndClass })}
                dimmed={!open}
              >
                {i + 1}. {S.wizard.stepName[key]}
              </Chip>
            );
          })}
        </div>
      </div>

      {step === "race" && (
        <PickTiles
          items={races}
          selectedId={draft.raceId}
          onSelect={(id) => setDraft({ ...draft, raceId: id })}
          icon={(race) => raceIconName(race.id)}
          info={(race) => <RaceInfo race={race} compendium={compendium} />}
          detail={raceDetailLine}
        />
      )}

      {/*
        Die Empfehlung steht ÜBER den Feldern, nicht darunter: sie soll gelesen werden,
        bevor getippt wird. Ohne Klasse gibt es keine — dann fehlt die Karte einfach.
      */}
      {step === "abilities" && advice !== undefined && (
        <AdviceCard advice={advice} who={who} />
      )}

      {step === "abilities" && (
        <Card>
          {/*
            Der Punktekauf. Er erscheint NUR, wenn in den Einstellungen ein Budget
            steht — ohne Budget zählt die App nichts und sagt nichts (seine
            Entscheidung: „aus, bis ich es setze").

            Die Summe steht ÜBER den Feldern, wie die Empfehlung: sie soll gelesen
            werden, bevor getippt wird. Und sie nennt beide Richtungen — „3 zu viel"
            und „2 übrig" —, weil das Liegenbleiben genauso ein offener Punkt ist wie
            das Überziehen. Genau daran ist `validate.ts` jahrelang vorbeigelaufen.
          */}
          {punkte !== null && (
            <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-semibold tabular-nums">
                  {S.wizard.abilityPointsUsed(punkte.spent, punkte.budget)}
                </span>
                <span
                  className={`text-xs font-medium ${
                    punkte.left === 0
                      ? "text-emerald-300"
                      : punkte.left < 0
                        ? "text-rose-300"
                        : "text-amber-300"
                  }`}
                >
                  {punkte.left === 0
                    ? S.wizard.abilityPointsFits
                    : punkte.left < 0
                      ? S.wizard.abilityPointsOver(-punkte.left)
                      : S.wizard.abilityPointsLeft(punkte.left)}
                </span>
              </div>
            </div>
          )}
          <div className="mb-3 flex flex-wrap gap-2">
            <Chip
              onClick={() =>
                setDraft({
                  ...draft,
                  base: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
                })
              }
            >
              {S.wizard.standardArray}
            </Chip>
            <Chip
              onClick={() => {
                // 4W6, niedrigster fällt — je Attribut.
                const rollScore = () => {
                  const dice = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6));
                  dice.sort((a, b) => a - b);
                  return dice[1]! + dice[2]! + dice[3]!;
                };
                setDraft({
                  ...draft,
                  base: {
                    str: rollScore(),
                    dex: rollScore(),
                    con: rollScore(),
                    int: rollScore(),
                    wis: rollScore(),
                    cha: rollScore(),
                  },
                });
              }}
            >
              <IconInline name="dice" size={14} />
              {S.wizard.rollAll}
            </Chip>
            {/*
              Verteilen — nur mit Budget, sonst gibt es nichts zu verteilen. Die
              Reihenfolge kommt aus derselben Empfehlung wie die Sterne an den Feldern
              (`suggestPointBuy` liest `advice`), damit Stern und Knopf nicht
              verschiedene Dinge raten.
            */}
            {punkte !== null && (
              <Chip
                onClick={() =>
                  setDraft({ ...draft, base: suggestPointBuy(punkte.budget, advice) })
                }
              >
                {S.wizard.abilityPointsSpread}
              </Chip>
            )}
          </div>
          {/*
            Der Hinweis steht am KNOPF und nicht oben im Punkte-Kasten. Dort stand er
            zuerst — und erklärte damit scheinbar die Summe, während der Knopf, um den es
            geht, darunter liegt. Gefunden hat das der Blick auf das Bild: ein Satz neben
            der falschen Sache ist schlimmer als keiner.
          */}
          {punkte !== null && (
            <p className="-mt-1 mb-3 text-[11px] leading-snug text-slate-500">
              {S.wizard.abilityPointsSpreadHint}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ABILITIES.map((ability) => {
              const hint = advice === undefined ? undefined : abilityAdviceFor(advice, ability);
              return (
                <label key={ability} className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-baseline gap-x-1.5 text-xs uppercase text-slate-400">
                    {S.abilityNames[ability]} ({S.abilities[ability]})
                    {/*
                      Die Marke am Feld. Sie steht nur an Attributen, die laut Empfehlung
                      zählen — an alle sechs geschrieben wäre sie keine Auskunft mehr.
                    */}
                    {hint !== undefined && (
                      <span className="normal-case text-amber-300">
                        ★ {S.advice.matters}
                        {hint.min !== undefined && `, ${S.advice.fromValue(hint.min)}`}
                      </span>
                    )}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={draft.base[ability]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        base: { ...draft.base, [ability]: e.target.valueAsNumber || 10 },
                      })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-lg font-semibold"
                  />
                  {sheet && (
                    <AbilityResult
                      block={sheet.abilities[ability]}
                      {...(hint?.min !== undefined ? { min: hint.min } : {})}
                    />
                  )}
                  {/* Was dieser Wert kostet. Ohne Budget steht hier nichts. */}
                  {punkte !== null && (
                    <span className="text-[11px] tabular-nums text-slate-500">
                      {S.wizard.abilityPointsCost(pointBuyCost(draft.base[ability]))}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Würfelt wie gewohnt am Tisch und tragt die Werte ein — Volks-Modifikatoren rechnet die
            App selbst dazu.
          </p>
        </Card>
      )}

      {step === "klass" && (
        <>
          <Chip active={showNpcClasses} onClick={() => setShowNpcClasses(!showNpcClasses)}>
            {S.wizard.showNpcClasses}
          </Chip>
          <PickTiles
            items={classes}
            selectedId={draft.classId}
            onSelect={(id) => setDraft({ ...draft, classId: id })}
            icon={(cls) => accentOfClass(cls.id) ?? "characters"}
            info={(cls) => <ClassInfo klass={cls} compendium={compendium} nextLevelInClass={1} />}
            detail={classDetailLine}
          />
        </>
      )}

      {step === "skills" && (
        <SkillStep
          draft={draft}
          setDraft={setDraft}
          advice={advice}
          klass={chosenClass}
          lines={sheet?.skills}
          sheetPoints={sheet?.skillPoints}
          compendium={compendium}
        />
      )}

      {step === "feats" && (
        <FeatStep
          draft={draft}
          setDraft={setDraft}
          compendium={compendium}
          sheet={sheet}
          slots={sheet?.featSlots}
        />
      )}

      {/*
        Zauber schon beim Anlegen — sein Wunsch: „Beim Barden zum Beispiel hatte ich dir
        gesagt, dass ich Zauber für Level 1 schon beim Erstellen auswählen will."

        Nur für Klassen, die sich festlegen MÜSSEN (seine Entscheidung: „nur wer wählen
        muss"). Der Auswähler ist derselbe wie im Stufenaufstieg.
      */}
      {/*
        Die Domänen. Eigener Schritt, seine Entscheidung — und er steht VOR den
        Zaubern, weil die Domäne bestimmt, welche Zauber überhaupt dazukommen.

        Am Kleriker fehlten sie bisher beim Anlegen ganz: der frische Bogen kam mit
        „0 von 2 Domänen gewählt" auf die Welt und man musste es im Zauber-Reiter
        nachtragen.
      */}
      {step === "domains" && spellBlock !== undefined && domainPick > 0 && (
        <Card className="space-y-2">
          <SectionTitle>{S.spells.domainStepTitle(spellBlock.className)}</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-400">{S.spells.domainStepHint}</p>
          <DomainPicker
            compendium={compendium}
            picked={draft.domains}
            pick={domainPick}
            onAdd={(id) =>
              setDraft({
                ...draft,
                // Doppelte abweisen: zwei Mal War brächte zwei Mal dieselben neun
                // Zauber und einen Platz, den es nicht gibt.
                domains: draft.domains.includes(id) ? draft.domains : [...draft.domains, id],
              })
            }
            onRemove={(id) =>
              setDraft({ ...draft, domains: draft.domains.filter((x) => x !== id) })
            }
          />
        </Card>
      )}

      {step === "spells" && spellBlock !== undefined && (
        <Card className="space-y-2">
          <SectionTitle>
            {S.wizard.spellsFor(spellBlock.className)}
            <span className="ml-2 normal-case text-slate-500">
              {spellBlock.usesSpellbook ? S.wizard.spellbookHint : S.wizard.knownHint}
            </span>
          </SectionTitle>
          <SpellPicker
            compendium={compendium}
            block={spellBlock}
            alreadyKnown={[]}
            picked={draft.known}
            onPick={(id) => setDraft({ ...draft, known: [...draft.known, id] })}
            onDrop={(id) => setDraft({ ...draft, known: draft.known.filter((x) => x !== id) })}
          />
        </Card>
      )}

      {step === "gear" && <GearStep draft={draft} setDraft={setDraft} entities={entities} />}

      {/*
        Zähler schon beim Anlegen — sein Wunsch: „Ah und die Zähler. Vorschläge bitte
        automatisch schon beim Erstellen einbauen und da die Möglichkeit für eigene
        anbieten." Gefragt und entschieden: die Vorschläge sind ANGEHAKT und kommen mit;
        abhaken kann man sie.
      */}
      {step === "trackers" && (
        <TrackerStep draft={draft} setDraft={setDraft} sheet={sheet} />
      )}

      {step === "done" && (
        <Card className="space-y-3">
          <label className="block">
            <span className="text-xs uppercase text-slate-400">{S.wizard.name}</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase text-slate-400">{S.wizard.playerName}</span>
            <input
              value={draft.playerName}
              onChange={(e) => setDraft({ ...draft, playerName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
            />
          </label>
          {/*
            Die Kampagne schon hier, nicht erst am fertigen Bogen — sonst legt er
            einen Charakter an, landet in der Liste und muss ihn nochmal aufmachen,
            nur um zu sagen, wohin er gehört. `ownId` fehlt: der Bogen existiert
            noch nicht, also gibt es auch keinen eigenen zu überspringen.
          */}
          <CampaignPicker
            value={draft.campaign}
            onChange={(next) => setDraft({ ...draft, campaign: next })}
          />
        </Card>
      )}

      {/*
        Der ganze Bogen, bevor er entsteht. Vorher stand hier eine Zeile
        („TP 10 · RK 10 · Initiative +0"), und sein Urteil war: „Find ich nicht so
        schön. Könnte man noch mal so 'n kompletten Bogen machen."
      */}
      {step === "done" && sheet !== undefined && (
        <DraftSummary sheet={sheet} compendium={compendium} hideIssues={askOpen} />
      )}

      {/*
        Die Rückfrage. Sie steht am ENDE der Seite, direkt über der Knopfleiste — dort
        landet der Blick, wenn „Anlegen" nicht sofort anlegt. Ein Dialog wäre falsch:
        er verdeckt die Liste, um deren Inhalt es gerade geht.
      */}
      {askOpen && openBuild.length > 0 && (
        <OpenWorkConfirm
          open={openBuild}
          hint={S.open.confirmHint}
          onConfirm={() => void create()}
          onBack={backToOpen}
          onCancel={() => setAskOpen(false)}
        />
      )}

      {/*
        Die haftende Leiste am Handy — und NUR am Handy (`md:hidden`).

        Vorher stand die Knopfzeile als letztes Kind im Fluss und scrollte mit. Im
        Talentschritt sind das über hundert Zeilen, an denen er vorbeimusste, wörtlich:
        „Da muss ich jetzt ganz runterscrollen, bis ich auch weiterklicken kann.
        Supernervig."

        Drei Dinge daran waren dann falsch, alle vom iPad-Bild belegt:

        1. Der Abstand rechnete die untere Reiterleiste ein — die es ab `md` nicht gibt
           (`ui/Layout.tsx:75` ist `md:hidden`). Die Leiste schwebte dort 64px über dem
           Rand und schnitt als Band durch die Liste. Deshalb jetzt `md:hidden`.
        2. `4rem` waren 8px zu viel: die Reiterleiste ist genau
           `3.5rem + env(safe-area-inset-bottom)` hoch. Durch den Spalt blieb Liste
           sichtbar. Dieselbe Rechnung wie die Reiterzeile des Bogens
           (`pages/sheet/index.tsx`).
        3. `bg-slate-950/95` + `backdrop-blur` ließen Text durchscheinen — es sah kaputt
           aus, nicht wie eine Leiste. Jetzt voll deckend.

        Und `sticky` war überhaupt das falsche Werkzeug: es rechnet gegen den
        INHALTSRAND des Scroll-Containers, und `main` hielt unten schon Platz frei.
        Gemessen lag die Leiste deshalb bei 724 statt 788 — 64px Liste blieben darunter
        sichtbar. Also `fixed` wie die Reiterzeile des Bogens, und den Platz dafür
        reserviert `pb-20` an der Wurzel dieser Seite — auch das genau wie der Bogen (dort
        `pb-14`), sonst verschwindet die letzte Karte hinter der Leiste.

        Seit die Hauptnavigation OBEN sitzt (sein Auftrag), sitzt diese Leiste auf
        `bottom-0` und trägt das Polster für den unteren Geräte-Rand selbst — vorher hat
        das die Navigation darunter getan. Punkt 1 von oben gilt unverändert weiter: was
        eine Höhe aus der Hülle einrechnet, muss sie zurückstellen, wenn die Hülle sie
        nicht mehr hat.
      */}
      <div className="fixed inset-x-0 bottom-0 z-30 space-y-1.5 border-t border-slate-800 bg-slate-950 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-4 md:hidden">
        {navButtons}
      </div>
    </div>
  );
}

/**
 * Was unter dem Eingabefeld eines Attributs steht.
 *
 * Vorher stand dort „final 15 (+2)". Seine Frage: **„Was hat es mit ‚final' auf sich?"**
 * Zwei Mängel auf einmal — das Wort ist englisch in einer deutschen Oberfläche (nur
 * REGELKÜRZEL bleiben englisch, DEX statt GE), und es sagt nicht, WOHER die Änderung
 * kommt. Bei seinem Halb-Ork verschieben sich drei von sechs Werten ohne ein Wort dazu.
 *
 * Die Quellen kommen aus den Beiträgen des abgeleiteten Werts, NICHT aus einer eigenen
 * Volks-Rechnung: so steht hier von allein auch ein Stufenanstieg oder ein Gegenstand,
 * sobald er mitwirkt. Eine zweite „Volks-Modifikator"-Rechnung wäre der abgeleitete Wert,
 * der gespeichert wurde — die Fehlerfamilie dieses Projekts, nur im Anzeigecode.
 */
function AbilityResult({ block, min }: { block: AbilityBlock; min?: number }) {
  const sources = block.score.contributions.filter(
    (c) => c.source !== ABILITY_BASE_SOURCE && c.value !== 0,
  );
  /*
    Verglichen wird der ENDWERT, nicht die getippte Zahl. Bei seinem Halb-Ork ist das der
    Unterschied zwischen 13 und 15 — ein Hinweis „unter 14" neben einer 15 wäre schlicht
    falsch. Gesperrt wird nichts: warnen statt sperren.
  */
  const below = min !== undefined && block.score.total < min;
  return (
    <span className="text-xs text-slate-400">
      {S.wizard.abilityResult(block.score.total, fmtMod(block.mod))}
      {sources.length > 0 && (
        <span className="ml-1.5 text-slate-500">
          {sources
            .map((c) => `${c.source} ${fmtMod(c.value)}${c.applied ? "" : " (wirkt nicht)"}`)
            .join(" · ")}
        </span>
      )}
      {below && <span className="ml-1.5 text-amber-400">⚠ {S.advice.below(min)}</span>}
    </span>
  );
}

/**
 * Fertigkeitsschritt auf den abgeleiteten Zeilen — nur so tauchen Teilgebiete
 * („Knowledge (arcana)") überhaupt auf und lassen sich mit Rängen belegen.
 */
function SkillStep(props: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  /** Was die Klasse ausmacht — dieselbe Auskunft wie im Stufenaufstieg. */
  advice: Advice | undefined;
  klass: Entity | undefined;
  lines: SkillLine[] | undefined;
  sheetPoints: { available: number; spent: number } | undefined;
  compendium: Map<string, Entity>;
}) {
  const { draft, setDraft } = props;
  const left = props.sheetPoints ? props.sheetPoints.available - props.sheetPoints.spent : 0;

  const setRanks = (key: string, ranks: number) => {
    const skillRanks = { ...draft.skillRanks };
    if (ranks <= 0) delete skillRanks[key];
    else skillRanks[key] = ranks;
    setDraft({ ...draft, skillRanks });
  };

  /*
    Hier stand `prompt()`: der Browser-Dialog zählte die zehn möglichen Teilgebiete auf und
    stellte ein leeres Feld zum ABSCHREIBEN daneben. Sein Urteil: „unprofessionell". Jetzt
    öffnet ein Auswähler, in dem jedes Teilgebiet ein Knopf ist.
  */
  const [subtypeFor, setSubtypeFor] = useState<string | null>(null);

  const addSubtype = (skillId: string, subtype: string) => {
    if (draft.skillSubtypes.some((s) => s.skillId === skillId && s.subtype === subtype)) return;
    setDraft({ ...draft, skillSubtypes: [...draft.skillSubtypes, { skillId, subtype }] });
  };

  if (!props.lines) return <p className="text-slate-400">{S.misc.loading}</p>;

  return (
    <Card>
      <div className={`mb-2 text-sm font-semibold ${left < 0 ? "text-red-400" : "text-emerald-400"}`}>
        {S.wizard.pointsLeft}: {left}
      </div>
      <SkillAdviceLine advice={props.advice} klass={props.klass} compendium={props.compendium} />
      <ul className="divide-y divide-slate-800">
        {props.lines.map((skill) => {
          const isClass = skill.isClassSkill;
          const ranks = draft.skillRanks[skill.key] ?? 0;
          const max = maxRanks(1, isClass);
          // 3.5: ganze Ränge, klassenfremd 2 Punkte je Rang (keine halben
          // Ränge zum halben Preis — das war 3.0). Die Schrittweite kommt aus
          // `stepRank` im Kern, damit dieselbe Regel nicht in drei Ansichten
          // dreimal dasteht und in einer davon anders lautet.
          const cost = skillPointCost(isClass);
          const isSubtypeAnchor = skill.subtyped && skill.subtype === undefined;
          return (
            <li key={skill.key} className="flex items-center justify-between gap-2 py-1.5 text-sm">
              <span className={isClass ? "" : "text-slate-400"}>
                {skill.name}
                {isClass && <span className="ml-1 text-[11px] text-amber-400">✧</span>}
                <SkillMark why={suggestionWhy(props.advice, skill)} />
                {!isSubtypeAnchor && (
                  <span className="ml-1 text-xs text-slate-500">
                    {S.sheet.maxRanks} {max}
                    {cost > 1 && <span className="ml-1 text-slate-600">· 2 Pkt/Rang</span>}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                {isSubtypeAnchor && (
                  <GhostButton onClick={() => setSubtypeFor(skill.skillId)}>
                    + {S.sheet.subtype}
                  </GhostButton>
                )}
                {!isSubtypeAnchor && (
                  <>
                    <GhostButton
                      onClick={() => setRanks(skill.key, stepRank(ranks, -1))}
                      disabled={ranks <= 0}
                    >
                      −
                    </GhostButton>
                    <span className="w-8 text-center font-mono">{ranks}</span>
                    <GhostButton
                      onClick={() => setRanks(skill.key, stepRank(ranks, 1))}
                      disabled={ranks >= max || left < cost}
                    >
                      +
                    </GhostButton>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {subtypeFor !== null && (
        <SubtypePicker
          skill={props.compendium.get(subtypeFor)}
          taken={draft.skillSubtypes.filter((s) => s.skillId === subtypeFor).map((s) => s.subtype)}
          onPick={(subtype) => addSubtype(subtypeFor, subtype)}
          onClose={() => setSubtypeFor(null)}
        />
      )}
    </Card>
  );
}

/**
 * Zähler schon beim Anlegen.
 *
 * Sein Wunsch, wörtlich: „Ah und die Zähler. Vorschläge bitte automatisch schon beim
 * Erstellen einbauen und da die Möglichkeit für eigene anbieten. Später natürlich auch
 * noch möglich." Das „später" gab es schon (am Bogen) — hier fehlte es.
 *
 * Gefragt und entschieden: die Vorschläge sind ANGEHAKT. Wer sie nicht will, hakt sie ab;
 * gespeichert wird deshalb die Liste der ABGEWÄHLTEN. Andersherum wäre die Auswahl nach
 * jedem Klassenwechsel veraltet — die Vorschläge hängen an Klasse, Stufe und Attributen.
 */
function TrackerStep(props: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  sheet: DerivedSheet | undefined;
}) {
  const { draft, setDraft } = props;
  const [name, setName] = useState("");
  const [max, setMax] = useState(0);
  const suggestions = props.sheet === undefined ? [] : suggestTrackers(props.sheet);

  const toggle = (key: string) => {
    const off = draft.trackersOff.includes(key)
      ? draft.trackersOff.filter((k) => k !== key)
      : [...draft.trackersOff, key];
    setDraft({ ...draft, trackersOff: off });
  };

  const addOwn = () => {
    const trimmed = name.trim();
    if (trimmed === "") return;
    setDraft({
      ...draft,
      ownTrackers: [...draft.ownTrackers, { name: trimmed, max: max > 0 ? max : null }],
    });
    setName("");
    setMax(0);
  };

  return (
    <Card className="space-y-3">
      <SectionTitle>{S.wizard.trackersTitle}</SectionTitle>

      {suggestions.length === 0 ? (
        <p className="text-xs text-slate-500">{S.wizard.trackersNone}</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-800">
            {suggestions.map((suggestion) => {
              const on = !draft.trackersOff.includes(suggestion.key);
              return (
                <li key={suggestion.key} className="flex items-start gap-2 py-2">
                  {/*
                    Ein echtes Kästchen, kein Chip: hier geht es um „kommt mit oder nicht",
                    und das ist eine Mehrfachauswahl. Chips lesen sich wie ein Filter.
                  */}
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(suggestion.key)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500"
                    aria-label={suggestion.name}
                  />
                  <span className="min-w-0">
                    <span className={on ? "font-medium" : "text-slate-500"}>{suggestion.name}</span>
                    <span className="ml-1.5 text-xs text-amber-300 tabular-nums">
                      {suggestion.max}×
                    </span>
                    <span className="block text-xs leading-snug text-slate-500">
                      {suggestion.note}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] leading-snug text-slate-500">{S.wizard.trackersHint}</p>
        </>
      )}

      {draft.ownTrackers.length > 0 && (
        <ul className="divide-y divide-slate-800">
          {draft.ownTrackers.map((tracker, i) => (
            <li key={`${tracker.name}-${i}`} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span>
                {tracker.name}
                <span className="ml-1.5 text-xs text-amber-300 tabular-nums">
                  {tracker.max === null ? "offen" : `${tracker.max}×`}
                </span>
              </span>
              <GhostButton
                onClick={() =>
                  setDraft({
                    ...draft,
                    ownTrackers: draft.ownTrackers.filter((_, index) => index !== i),
                  })
                }
              >
                {S.actions.remove}
              </GhostButton>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-lg border border-slate-700/60 p-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {S.wizard.trackersOwn}
        </div>
        <label className="block text-xs text-slate-400">
          {S.wizard.trackersOwnName}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addOwn();
            }}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base"
          />
        </label>
        <NumberStepper
          label={S.wizard.trackersOwnMax}
          value={max}
          onChange={setMax}
          min={0}
          max={99}
        />
        <div className="flex justify-end">
          <PrimaryButton disabled={name.trim() === ""} onClick={addOwn}>
            {S.wizard.trackersAdd}
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
}

/**
 * Talente im Assistenten.
 *
 * Hier stand dieselbe magere Liste wie an den zwei anderen Auswahlstellen: Name,
 * Erklärung, `slice(0, 60)`, keine Voraussetzung. Genau darüber seine Kritik — „Es
 * muss klar sein, welche Vorraussetzungen die Talente haben." Der gemeinsame
 * `FeatPicker` kann das und wird hier einfach mitbenutzt.
 *
 * Das ENTFERNEN bleibt hier: was gewählt ist, steht oben als Liste zum Wegnehmen.
 * Der Picker bietet nur an — jede der drei Stellen hat eigene Regeln fürs Entfernen
 * (im Bogen zum Beispiel mit Rückfrage), und die gehören nicht in den Blätterer.
 */
function FeatStep(props: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  compendium: Map<string, Entity>;
  sheet: DerivedSheet | undefined;
  slots: { available: number; used: number } | undefined;
}) {
  const { draft, setDraft } = props;
  const left = props.slots ? props.slots.available - props.slots.used : 0;

  return (
    <Card className="space-y-2">
      <div className={`text-sm font-semibold ${left < 0 ? "text-red-400" : "text-emerald-400"}`}>
        {S.wizard.slotsLeft}: {left}
      </div>

      {draft.featIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {draft.featIds.map((entry) => {
            const feat = props.compendium.get(entry.featId);
            return (
              <Chip
                key={entry.featId}
                active
                onClick={() =>
                  setDraft({
                    ...draft,
                    featIds: draft.featIds.filter((f) => f.featId !== entry.featId),
                  })
                }
              >
                {feat ? displayName(feat) : entry.featId}
                {entry.choice ? ` (${entry.choice})` : ""} ✕
              </Chip>
            );
          })}
        </div>
      )}

      <FeatPicker
        compendium={props.compendium}
        sheet={props.sheet}
        chosen={draft.featIds.map((f) => f.featId)}
        /*
          Auch im Assistenten kommt die Waffenfrage MIT der Wahl. Angeboten wird, was
          im Entwurf schon im Gepäck liegt — der Ausrüstungsschritt kommt später, also
          ist die Liste oft leer, und dann blättert man die vollständige durch.
        */
        ownWeapons={draft.inventory
          .map((row) => {
            const item = row.itemId ? props.compendium.get(row.itemId) : undefined;
            return isWeaponEntity(item) && item !== undefined
              ? { id: item.id, name: displayName(item) }
              : null;
          })
          .filter((entry): entry is { id: string; name: string } => entry !== null)}
        onPick={(feat, choice) =>
          setDraft({
            ...draft,
            featIds: [
              ...draft.featIds,
              { featId: feat.id, ...(choice ? { choiceRef: choice.choiceRef, choice: choice.choice } : {}) },
            ],
          })
        }
      />
    </Card>
  );
}

/**
 * Ausrüstung im Assistenten.
 *
 * Hier stand die ALTE Suche: `filter(name.includes(query)).slice(0, 40)`. Die ist
 * an genau dem gescheitert, was Philipp gemeldet hat — „armor" liefert darunter
 * keine einzige Rüstung, weil die zwölf echten „Banded mail", „Full plate" und
 * „Chain shirt" heißen. Der Blätterer aus dem Bogen kann das (Gruppen mit Anzahl,
 * Untergruppen, deutsche Suchwörter) und wird hier einfach mitbenutzt, damit es
 * nicht zwei Wege gibt, einen Gegenstand in ein Inventar zu bekommen.
 *
 * OHNE `startGroup`: erst wollte ich bei „Ausrüstung & Werkzeug" aufschlagen,
 * weil man bei der Erschaffung Seil und Fackeln kauft. Im gebauten Bogen war das
 * falsch — man steckt dann IN der Gruppe, und „Rüstung & Schilde" ist gar nicht zu
 * sehen. Genau das war seine Beschwerde. Also dieselbe Ansicht wie im Bogen: alle
 * zwölf Gruppen mit Anzahl, ein Tap in jede.
 */
function GearStep(props: { draft: Draft; setDraft: (d: Draft) => void; entities: Entity[] }) {
  const { draft, setDraft } = props;
  const compendium = useMemo(() => resolveCompendium(props.entities), [props.entities]);

  /*
    Was er FÜHREN darf, und was zu seinem Aufbau passt — beides eine FOLGE aus
    Klasse, Volk und Talenten, nichts davon gespeichert.
  */
  const proficiency = useMemo(
    () => proficiencyFor(draft.classId === null ? [] : [draft.classId], draft.raceId ?? undefined),
    [draft.classId, draft.raceId],
  );
  const suggestions = useMemo(() => {
    const hits = weaponSuggestions(draft.featIds, draft.raceId ?? undefined, compendium);
    return new Map(hits.map((h) => [h.itemId, h.why]));
  }, [draft.featIds, draft.raceId, compendium]);

  const klass = draft.classId === null ? undefined : compendium.get(draft.classId);
  const kit = starterKit(draft.classId);
  const inInventory = new Set(draft.inventory.map((row) => row.itemId));
  /*
    Nur was noch NICHT im Gepäck liegt. Ein Knopf, der den Rucksack zum zweiten Mal
    einpackt, ist schlimmer als kein Knopf — und „Übernehmen" soll man auch nach dem
    ersten Tap noch drücken können, ohne Schaden anzurichten.
  */
  const missing = kit.filter((entry) => !inInventory.has(entry.itemId));
  const takeKit = () =>
    setDraft({
      ...draft,
      inventory: [
        ...draft.inventory,
        ...missing.map((entry) => ({
          id: crypto.randomUUID(),
          itemId: entry.itemId,
          qty: entry.qty,
          slot: "none" as EquipSlot,
        })),
      ],
    });

  return (
    <Card className="space-y-2">
      {/*
        Der Vorschlag steht OBEN und ist ein Angebot, kein Zwang: seine Antwort
        war „alle drei" — Übung markieren, Aufbau vorschlagen UND ein Paket zum
        Übernehmen. Jede Zeile lässt sich danach einzeln wieder wegnehmen.
      */}
      {kit.length > 0 && klass !== undefined && (
        <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 px-2.5 py-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs font-semibold text-emerald-200">
              {S.items.kitTitle(displayName(klass))}
            </span>
            {missing.length > 0 ? (
              <GhostButton onClick={takeKit}>{S.items.kitTake}</GhostButton>
            ) : (
              <span className="text-[11px] text-emerald-400/80">{S.items.kitAlready}</span>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">{S.items.kitHint}</p>
          <ul className="mt-1 flex flex-wrap gap-1">
            {kit.map((entry) => {
              const entity = compendium.get(entry.itemId);
              const have = inInventory.has(entry.itemId);
              return (
                <li
                  key={entry.itemId}
                  className={`rounded px-1.5 py-0.5 text-[11px] ${
                    have ? "bg-emerald-900/50 text-emerald-200" : "bg-slate-800/70 text-slate-400"
                  }`}
                >
                  {entity === undefined ? entry.itemId : displayName(entity)}
                  {entry.qty > 1 ? ` ×${entry.qty}` : ""}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {draft.inventory.length > 0 && (
        <ul className="divide-y divide-slate-800">
          {draft.inventory.map((row) => {
            const entity = props.entities.find((e) => e.id === row.itemId);
            return (
              <li key={row.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                <span>
                  {entity ? displayName(entity) : row.itemId}
                  {row.qty > 1 ? ` ×${row.qty}` : ""}
                </span>
                <span className="flex items-center gap-2">
                  {/*
                    Dieselbe Marke wie im Bogen. Vorher stand hier ein eigener
                    Chip mit einem Ja/Nein — man konnte im Assistenten zwei
                    Rüstungen anlegen, und die wanderten so in den Charakter.
                  */}
                  <EquipMark
                    slot={row.slot}
                    onClick={() => {
                      const target = cycleEquipSlot(
                        entity?.kind === "item" ? entity : undefined,
                        draft.inventory.map((r) => ({ id: r.id, slot: r.slot })),
                        row.id,
                      );
                      const verdrängt =
                        target === "none"
                          ? []
                          : conflictingEquipIds(
                              draft.inventory.map((r) => ({ id: r.id, slot: r.slot })),
                              row.id,
                              target,
                            );
                      setDraft({
                        ...draft,
                        inventory: draft.inventory.map((r) =>
                          r.id === row.id
                            ? { ...r, slot: target }
                            : verdrängt.includes(r.id)
                              ? { ...r, slot: "none" as EquipSlot }
                              : r,
                        ),
                      });
                    }}
                  />
                  <GhostButton
                    danger
                    onClick={() =>
                      setDraft({ ...draft, inventory: draft.inventory.filter((r) => r.id !== row.id) })
                    }
                  >
                    ✕
                  </GhostButton>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <ItemPicker
        compendium={compendium}
        proficiency={proficiency}
        suggestions={suggestions}
        onPick={(item) =>
          setDraft({
            ...draft,
            inventory: [
              ...draft.inventory,
              { id: crypto.randomUUID(), itemId: item.id, qty: 1, slot: "none" },
            ],
          })
        }
      />
    </Card>
  );
}
