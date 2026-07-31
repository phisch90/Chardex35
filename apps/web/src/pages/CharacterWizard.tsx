import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ABILITIES,
  characterSchema,
  classCategory,
  conflictingEquipIds,
  cycleEquipSlot,
  deriveSheet,
  displayName,
  maxRanks,
  resolveCompendium,
  skillPointCost,
  type Ability,
  type Character,
  type DerivedSheet,
  type Entity,
  type EquipSlot,
  type SkillLine,
} from "@codex35/core";
import { S } from "../strings.js";
import { CharacterRepo } from "../db/repo.js";
import { useAllEntities, useCompendium, useHouseRules } from "../lib/hooks.js";
import { Card, Chip, GhostButton, PrimaryButton, SearchInput, fmtMod } from "../ui/bits.js";
import { EquipMark } from "../ui/EquipMark.js";
import { itemSummary } from "../ui/itemSummary.js";
import { ItemPicker } from "../ui/ItemPicker.js";
import { FeatPicker } from "../ui/FeatPicker.js";
import { CampaignPicker, type CampaignValue } from "../ui/CampaignPicker.js";
import { DraftSummary } from "../ui/DraftSummary.js";
import { FeatText } from "../ui/FeatText.js";
import { ClassInfo, RaceInfo, classDetailLine, raceDetailLine } from "../ui/RaceClassInfo.js";

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
  featIds: { featId: string; choice?: string }[];
  inventory: { id: string; itemId: string; qty: number; slot: EquipSlot }[];
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
};

/** Entwurf → valider Charakter (Stufe 1, TP max) für Live-Ableitung + Anlage. */
function draftToCharacter(draft: Draft): Character {
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
    feats: draft.featIds,
    inventory: draft.inventory,
  });
}

/**
 * Die Schritte mit Namen statt Zahlen.
 *
 * Die Reihenfolge ist Volk → KLASSE → Attribute, und das ist seine Entscheidung:
 * „weil dann kann man ein bisschen schauen, wenn man würfelt, dass man die Attribute
 * der Rasse und Klasse anpasst." Vorher standen die Attribute vor der Klasse.
 *
 * Benannt, weil hier vorher `step === 2` stand und niemand ohne Nachzählen wusste,
 * welcher Schritt das ist — beim Tauschen genau die Stelle, an der man sich verrechnet.
 */
const STEP = {
  race: 0,
  klass: 1,
  abilities: 2,
  skills: 3,
  feats: 4,
  gear: 5,
  done: 6,
} as const;

/**
 * Was ein Schritt ERZWINGT, bevor es weitergehen darf.
 *
 * Diese Liste beantwortet zwei Fragen aus einer Quelle: ob „Weiter" gehen darf, und
 * ob ein Reiter oben antippbar ist. Zwei getrennte Regeln würden auseinanderlaufen —
 * dann führt ein Reiter in einen Schritt, aus dem „Weiter" nicht herauskommt.
 */
const GATES: { step: number; ok: (draft: Draft) => boolean }[] = [
  { step: STEP.race, ok: (d) => d.raceId !== null },
  { step: STEP.klass, ok: (d) => d.classId !== null },
];

export function CharacterWizardPage() {
  const navigate = useNavigate();
  const entities = useAllEntities();
  const compendium = useCompendium();
  const houseRules = useHouseRules();
  const [step, setStep] = useState<number>(STEP.race);
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [showNpcClasses, setShowNpcClasses] = useState(false);

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
    if (step === STEP.done) return draft.name.trim().length > 0;
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
   * kann man wieder ansehen.
   */
  const reachable = (i: number) =>
    i <= step || GATES.filter((g) => g.step < i).every((g) => g.ok(draft));

  /**
   * Der Kontostand des Schritts — steht in der haftenden Leiste.
   *
   * Sein Einwand: „nicht immer nur ganz oben steht, wie viel Slots übrig sind, sondern
   * dass auch unten direkt schon gemeldet wird, ach Du kannst keins mehr nehmen."
   * Genau dort, wo der Daumen ohnehin liegt.
   */
  const budget = (): { text: string; warn: boolean } | null => {
    if (sheet === undefined) return null;
    if (step === STEP.skills) {
      const left = sheet.skillPoints.available - sheet.skillPoints.spent;
      return left < 0
        ? { text: S.wizard.tooMany(-left), warn: true }
        : { text: `${S.wizard.pointsLeft}: ${left}`, warn: false };
    }
    if (step === STEP.feats) {
      const left = sheet.featSlots.available - sheet.featSlots.used;
      if (left < 0) return { text: S.wizard.tooMany(-left), warn: true };
      return left === 0
        ? { text: S.wizard.noSlotsLeft, warn: false }
        : { text: `${S.wizard.slotsLeft}: ${left}`, warn: false };
    }
    return null;
  };

  const finish = async () => {
    const data = draftToCharacter(draft);
    const { id: _drop, ...rest } = data;
    const created = await CharacterRepo.create(rest);
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

  const stepBudget = budget();

  return (
    <div className="space-y-3">
      <h1 className="flex flex-wrap items-baseline gap-x-2 text-xl font-bold">
        {S.wizard.title}
        {who !== "" && <span className="text-sm font-medium text-amber-300">{who}</span>}
      </h1>
      <div className="flex flex-wrap gap-1">
        {S.wizard.steps.map((label, i) => {
          const open = reachable(i);
          return (
            <Chip
              key={label}
              active={i === step}
              {...(open ? { onClick: () => setStep(i) } : {})}
              {...(open ? {} : { title: S.wizard.needRaceAndClass })}
              dimmed={!open}
            >
              {i + 1}. {label}
            </Chip>
          );
        })}
      </div>

      {step === STEP.race && (
        <PickList
          items={races}
          selectedId={draft.raceId}
          onSelect={(id) => setDraft({ ...draft, raceId: id })}
          info={(race) => <RaceInfo race={race} compendium={compendium} />}
          detail={raceDetailLine}
        />
      )}

      {step === STEP.abilities && (
        <Card>
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
              {S.wizard.rollAll}
            </Chip>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ABILITIES.map((ability) => (
              <label key={ability} className="flex flex-col gap-1">
                <span className="text-xs uppercase text-slate-400">
                  {S.abilityNames[ability]} ({S.abilities[ability]})
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
                  <span className="text-xs text-slate-400">
                    final {sheet.abilities[ability].score.total} ({fmtMod(sheet.abilities[ability].mod)})
                  </span>
                )}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Würfelt wie gewohnt am Tisch und tragt die Werte ein — Volks-Modifikatoren rechnet die
            App selbst dazu.
          </p>
        </Card>
      )}

      {step === STEP.klass && (
        <>
          <Chip active={showNpcClasses} onClick={() => setShowNpcClasses(!showNpcClasses)}>
            {S.wizard.showNpcClasses}
          </Chip>
          <PickList
            items={classes}
            selectedId={draft.classId}
            onSelect={(id) => setDraft({ ...draft, classId: id })}
            info={(cls) => <ClassInfo klass={cls} compendium={compendium} nextLevelInClass={1} />}
            detail={classDetailLine}
          />
        </>
      )}

      {step === STEP.skills && (
        <SkillStep
          draft={draft}
          setDraft={setDraft}
          lines={sheet?.skills}
          sheetPoints={sheet?.skillPoints}
          compendium={compendium}
        />
      )}

      {step === STEP.feats && (
        <FeatStep
          draft={draft}
          setDraft={setDraft}
          compendium={compendium}
          sheet={sheet}
          slots={sheet?.featSlots}
        />
      )}

      {step === STEP.gear && <GearStep draft={draft} setDraft={setDraft} entities={entities} />}

      {step === STEP.done && (
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
      {step === STEP.done && sheet !== undefined && (
        <DraftSummary sheet={sheet} compendium={compendium} />
      )}

      {/*
        Die haftende Leiste — der Kern dieser Runde.

        Vorher stand die Knopfzeile als letztes Kind im Fluss und scrollte mit. Im
        Talentschritt sind das über hundert Zeilen, an denen er vorbeimusste, wörtlich:
        „Da muss ich jetzt ganz runterscrollen, bis ich auch weiterklicken kann.
        Supernervig."

        Der Abstand nach unten ist DERSELBE Ausdruck wie das untere Polster von `main`
        (`ui/Layout.tsx`): der Scroll-Container reicht bis zum Bildschirmrand, und die
        feste Navigationsleiste liegt darüber. Mit `bottom-0` klebte die Leiste hinter
        der Navigation. Die negativen Ränder ziehen sie über die Seitenpolster hinweg,
        damit sie wie eine Leiste aussieht und nicht wie eine Karte.
      */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-3 border-t border-slate-800 bg-slate-950/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4">
        {stepBudget !== null && (
          <p
            className={`mb-1.5 text-xs font-semibold ${
              stepBudget.warn ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {stepBudget.text}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <GhostButton
            onClick={() => (step === STEP.race ? void navigate({ to: "/" }) : setStep(step - 1))}
          >
            {S.actions.back}
          </GhostButton>
          {step < STEP.done ? (
            <PrimaryButton disabled={!canNext()} onClick={() => setStep(step + 1)}>
              {S.actions.next}
            </PrimaryButton>
          ) : (
            <PrimaryButton disabled={!canNext()} onClick={() => void finish()}>
              {S.actions.create}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Auswahlliste mit Infofeld. Das Feld klappt beim Auswählen von allein auf —
 * man soll die Werte sehen, sobald man sich festlegt — und lässt sich für jeden
 * anderen Eintrag zum Nachlesen aufziehen, BEVOR man sich festlegt.
 */
function PickList(props: {
  items: Entity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  detail: (entity: Entity) => string;
  info?: (entity: Entity) => ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ul className="space-y-2">
      {props.items.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">{S.compendium.empty}</p>
      )}
      {props.items.map((entity) => {
        const open = openId === entity.id;
        return (
          <li key={entity.id}>
            <div
              className={`rounded-xl border ${
                props.selectedId === entity.id
                  ? "border-amber-500 bg-amber-600/10"
                  : "border-slate-700 bg-slate-900/60"
              }`}
            >
              <button
                onClick={() => {
                  props.onSelect(entity.id);
                  setOpenId(entity.id);
                }}
                className="w-full p-3 text-left"
              >
                <div className="font-semibold">{displayName(entity)}</div>
                <div className="text-xs text-slate-400">{props.detail(entity)}</div>
              </button>
              {props.info && (
                <div className="px-3 pb-2">
                  <button
                    onClick={() => setOpenId(open ? null : entity.id)}
                    className="text-[11px] text-slate-400 underline decoration-dotted hover:text-amber-300"
                  >
                    {open ? "Infos ausblenden ▾" : "Infos ▸"}
                  </button>
                  {open && props.info(entity)}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Fertigkeitsschritt auf den abgeleiteten Zeilen — nur so tauchen Teilgebiete
 * („Knowledge (arcana)") überhaupt auf und lassen sich mit Rängen belegen.
 */
function SkillStep(props: {
  draft: Draft;
  setDraft: (d: Draft) => void;
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

  const addSubtype = (skillId: string) => {
    const entity = props.compendium.get(skillId);
    const suggestions = entity?.kind === "skill" ? entity.data.subtypeSuggestions.join(", ") : "";
    const value = prompt(
      suggestions === "" ? S.sheet.subtypePrompt : `${S.sheet.subtypePrompt}\n\n${suggestions}`,
    );
    const subtype = value?.trim();
    if (!subtype) return;
    if (draft.skillSubtypes.some((s) => s.skillId === skillId && s.subtype === subtype)) return;
    setDraft({ ...draft, skillSubtypes: [...draft.skillSubtypes, { skillId, subtype }] });
  };

  if (!props.lines) return <p className="text-slate-400">{S.misc.loading}</p>;

  return (
    <Card>
      <div className={`mb-2 text-sm font-semibold ${left < 0 ? "text-red-400" : "text-emerald-400"}`}>
        {S.wizard.pointsLeft}: {left}
      </div>
      <ul className="divide-y divide-slate-800">
        {props.lines.map((skill) => {
          const isClass = skill.isClassSkill;
          const ranks = draft.skillRanks[skill.key] ?? 0;
          const max = maxRanks(1, isClass);
          // 3.5: ganze Ränge, klassenfremd 2 Punkte je Rang (keine halben
          // Ränge zum halben Preis — das war 3.0).
          const cost = skillPointCost(isClass);
          const isSubtypeAnchor = skill.subtyped && skill.subtype === undefined;
          return (
            <li key={skill.key} className="flex items-center justify-between gap-2 py-1.5 text-sm">
              <span className={isClass ? "" : "text-slate-400"}>
                {skill.name}
                {isClass && <span className="ml-1 text-[11px] text-amber-400">✧</span>}
                {!isSubtypeAnchor && (
                  <span className="ml-1 text-xs text-slate-500">
                    {S.sheet.maxRanks} {max}
                    {cost > 1 && <span className="ml-1 text-slate-600">· 2 Pkt/Rang</span>}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                {isSubtypeAnchor && (
                  <GhostButton onClick={() => addSubtype(skill.skillId)}>+ {S.sheet.subtype}</GhostButton>
                )}
                {!isSubtypeAnchor && (
                  <>
                    <GhostButton
                      onClick={() => setRanks(skill.key, ranks - 1)}
                      disabled={ranks <= 0}
                    >
                      −
                    </GhostButton>
                    <span className="w-8 text-center font-mono">{ranks}</span>
                    <GhostButton
                      onClick={() => setRanks(skill.key, ranks + 1)}
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
                {feat ? displayName(feat) : entry.featId} ✕
              </Chip>
            );
          })}
        </div>
      )}

      <FeatPicker
        compendium={props.compendium}
        sheet={props.sheet}
        chosen={draft.featIds.map((f) => f.featId)}
        onPick={(feat) => setDraft({ ...draft, featIds: [...draft.featIds, { featId: feat.id }] })}
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

  return (
    <Card className="space-y-2">
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
