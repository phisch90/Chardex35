import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ABILITIES,
  adviceFor,
  classCategory,
  deriveSheet,
  displayName,
  isWeaponEntity,
  iterativeAttacks,
  maxRanks,
  applyTrackerLines,
  buildIssues,
  openBuildWork,
  planLevelUpRefill,
  skillPointCost,
  stepRank,
  type Ability,
  type Character,
} from "@codex35/core";
import { S } from "../strings.js";
import { IconInline } from "../ui/icons.js";
import { CharacterRepo } from "../db/repo.js";
import {
  useAllEntities,
  useCharacter,
  useCompendium,
  useHouseRules,
  useSheet,
} from "../lib/hooks.js";
import { reportSaveFailure } from "../lib/saveError.js";
import { Card, Chip, GhostButton, PrimaryButton, SectionTitle, fmtMod } from "../ui/bits.js";
import { OpenWorkConfirm } from "../ui/OpenWorkConfirm.js";
import { FeatPicker } from "../ui/FeatPicker.js";
import { ClassInfo, classDetailLine } from "../ui/RaceClassInfo.js";
import { PickTiles } from "../ui/PickTiles.js";
import { accentOfClass } from "../ui/classAccents.js";
import { SkillAdviceLine, SkillMark, suggestionWhy } from "../ui/SkillAdvice.js";
import { SubtypePicker } from "../ui/SubtypePicker.js";
import { SpellPicker } from "../ui/SpellPicker.js";

export function LevelUpPage() {
  const { charId } = useParams({ strict: false }) as { charId: string };
  const navigate = useNavigate();
  const character = useCharacter(charId);
  const compendium = useCompendium();
  const entities = useAllEntities();
  const houseRules = useHouseRules();
  const sheetBefore = useSheet(character);

  const [classId, setClassId] = useState<string | null>(null);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [showNpcClasses, setShowNpcClasses] = useState(false);
  const [abilityPick, setAbilityPick] = useState<Ability | null>(null);
  const [ranks, setRanks] = useState<Record<string, number> | null>(null);
  /** Beim Aufstieg neu angelegte Teilgebiete (z.B. erstes Knowledge (arcana)). */
  const [newSubtypes, setNewSubtypes] = useState<{ skillId: string; subtype: string }[]>([]);
  const [subtypeFor, setSubtypeFor] = useState<string | null>(null);
  /*
    Neu gewaehlte Talente — mit ihrer WAHL. Vorher lagen hier blosse Kennungen; seit
    die Waffe beim Auswaehlen feststeht ("das muss man einmal machen, wenn man das
    Talent auswaehlt"), muss der Aufstieg sie bis zum Speichern mittragen.
  */
  const [newFeats, setNewFeats] = useState<
    { featId: string; choice?: string; choiceRef?: string }[]
  >([]);
  /* Die Rückfrage am Ende — erst auf Tap, nicht als Dauerband. */
  const [askOpen, setAskOpen] = useState(false);
  const [newKnown, setNewKnown] = useState<string[]>([]);
  const [featQuery, setFeatQuery] = useState("");

  // Defaults, sobald der Charakter geladen ist.
  useEffect(() => {
    if (!character) return;
    setClassId((prev) => prev ?? character.levels[character.levels.length - 1]?.classId ?? null);
    setRanks((prev) => prev ?? { ...character.skillRanks });
  }, [character]);

  const newTotal = (character?.levels.length ?? 0) + 1;
  const needsAbility = newTotal % 4 === 0;

  const afterCharacter: Character | null = useMemo(() => {
    if (!character || !classId || ranks === null) return null;
    const copy = structuredClone(character);
    /*
      Martins Regel: „TP bei Levelup: volle Hit Die der Klasse (Krieger +10), kein Wurf."

      `"max"` kennt die Engine schon (`derive.ts`: bei „max" gilt der Würfel als
      Höchstwurf), es ist also kein neues Feld — und es steht an DIESER Stufe. Damit
      bleiben alle bisherigen Stufen unangetastet, so wie er es entschieden hat. Vorher
      stand hier „leer = Durchschnitt" mit einem Eingabefeld und einem Würfel daneben.
    */
    copy.levels.push({ classId, hpRoll: "max" });
    if (needsAbility) {
      const index = Math.floor(newTotal / 4) - 1;
      const ups = [...copy.abilities.levelUps];
      while (ups.length <= index) ups.push(null);
      ups[index] = abilityPick;
      copy.abilities.levelUps = ups;
    }
    copy.skillRanks = { ...ranks };
    copy.skillSubtypes = [...copy.skillSubtypes, ...newSubtypes];
    copy.feats = [...copy.feats, ...newFeats.map((entry) => ({ ...entry, extraEffects: [] }))];
    if (newKnown.length > 0) {
      const state = (copy.spellState[classId] ??= { known: [], prepared: [], usedSlots: [], favorites: [] });
      state.known = [...state.known, ...newKnown.filter((id) => !state.known.includes(id))];
    }
    return copy;
  }, [character, classId, ranks, needsAbility, newTotal, abilityPick, newFeats, newKnown, newSubtypes, compendium]);

  const sheetAfter = useMemo(
    () => (afterCharacter && compendium ? deriveSheet(afterCharacter, compendium, houseRules) : undefined),
    [afterCharacter, compendium, houseRules],
  );

  if (character === undefined || !compendium || !entities) {
    return <p className="text-slate-400">{S.misc.loading}</p>;
  }
  if (character === null) return <p className="text-slate-400">Charakter nicht gefunden.</p>;

  const chosenClass = classId ? compendium.get(classId) : undefined;
  const hitDie = chosenClass?.kind === "class" ? chosenClass.data.hitDie : null;
  /*
    Die Fertigkeits-Empfehlung hängt an der Klasse, in DIE aufgestiegen wird — beim
    Multiklassen ist das nicht die von Stufe 1. Das Volk bleibt hier außen vor: es
    kommentiert Attribute, und die verteilt der Aufstieg nur alle vier Stufen.
  */
  const advice = adviceFor(chosenClass, undefined);

  // Klassenwechsel setzt die Zauberauswahl zurück — sonst landen die Picks
  // der alten Klasse unsichtbar im spellState der neuen.
  const chooseClass = (id: string) => {
    if (id !== classId) setNewKnown([]);
    setClassId(id);
  };

  /*
    Die Klassen, in denen er schon Stufen hat — als ENTITÄTEN, weil eine Kachel ein
    Zeichen und eine Kleinzeile braucht. Eine Kennung ohne Eintrag im Kompendium (eine
    gelöschte eigene Klasse) fällt damit aus der Reihe; sie bleibt aber gewählt, wenn sie
    die letzte Stufe war, und die Karte darunter sagt dann ehrlich, dass sie den
    Trefferwürfel nicht kennt.
  */
  const existingClasses = [...new Set(character.levels.map((l) => l.classId))]
    .map((id) => compendium.get(id))
    .filter((cls): cls is NonNullable<typeof cls> => cls !== undefined);
  /*
    NPC-Klassen tragen in den Packs auch `base`. Beim Aufstieg gehören sie nicht
    zwischen die spielbaren — aber erreichbar müssen sie sein: einen Aristocrat 3
    fürs Gefolge legt man genauso in dieser App an.
  */
  const baseClasses = entities
    .filter((e) => e.kind === "class" && !e.deletedAt)
    .filter((e) => e.source === "homebrew" || e.tags.includes("base") || showAllClasses)
    .filter((e) => showNpcClasses || classCategory(e) !== "npc")
    .sort((a, b) => a.name.localeCompare(b.name));

  const skillLeft = sheetAfter ? sheetAfter.skillPoints.available - sheetAfter.skillPoints.spent : 0;
  const featSlotsLeft = sheetAfter ? sheetAfter.featSlots.available - sheetAfter.featSlots.used : 0;

  // Neue Zauber nur für spontane Caster der gewählten Klasse (Wizard pflegt
  // sein Zauberbuch jederzeit im Zauber-Tab).
  const castingAfter = sheetAfter?.spellcasting.find((b) => b.classId === classId);
  const isSpontaneous = castingAfter?.model === "spontaneous";
  const knownLimit = castingAfter?.spellsKnown
    ? castingAfter.spellsKnown.reduce<number>((sum, k) => sum + (k ?? 0), 0)
    : null;
  const knownCount = classId
    ? (character.spellState[classId]?.known.length ?? 0) + newKnown.length
    : 0;
  /*
    Die Zauberliste, die Grad-Grenze („Hexenmeister 4 darf genau EINEN Grad-2-Zauber
    kennen") und die Suche stehen jetzt im `SpellPicker` — hier standen sie als eigene
    Fassung, und der Assistent hätte eine dritte gebraucht.
  */

  /*
    Zähler, die beim Stufenaufstieg zurückgehen — gerechnet gegen den Bogen NACH dem
    Aufstieg, damit eine stufenabhängige Grenze schon die neue ist.

    Angesagt wird es in der Zusammenfassung, bevor er „Anwenden" drückt: was er
    gelesen hat, passiert danach. Dieselbe Trennung wie bei der Rast.

    KEIN `useMemo`: die Stelle liegt HINTER dem frühen `return` für den noch
    ladenden Charakter, und ein Hook hinter einer Bedingung wirft, sobald die
    Bedingung umschlägt — der Lauf im gebauten Bogen hat genau das gemeldet
    (React #310). Die Rechnung ist eine Schleife über die Zähler.
  */
  const levelUpTrackers =
    afterCharacter && sheetAfter ? planLevelUpRefill(afterCharacter, sheetAfter) : [];

  const save = async () => {
    if (!afterCharacter) return;
    const next = structuredClone(afterCharacter);
    applyTrackerLines(next, levelUpTrackers);
    /*
      Schlägt das Schreiben fehl, wird NICHT navigiert: sonst stünde er auf dem
      Bogen ohne die neue Stufe und hätte den ganzen Aufstieg noch einmal vor sich,
      ohne zu wissen warum. Der Aufstieg ist die längste Eingabe der App — hier
      wiegt ein verschluckter Fehler am schwersten.
    */
    const write = () => CharacterRepo.save(next);
    try {
      await write();
    } catch (error: unknown) {
      reportSaveFailure(next.name, error, write);
      return;
    }
    void navigate({ to: "/charaktere/$charId", params: { charId } });
  };

  /*
    Was nach dem Aufstieg offen bliebe — dieselbe Rückfrage wie im Assistenten, aus
    derselben Funktion. Der Aufstieg ist der Moment, in dem man etwas vergisst: neue
    Punkte, ein neues Talent, und dann noch der Trefferpunkt-Wurf.

    Ohne `daily`: die Zauberplätze sind nach dem Aufstieg natürlich leer, und das ist
    kein Versäumnis (`openBuildWork`).
  */
  const openBuild = sheetAfter === undefined ? [] : openBuildWork(sheetAfter);
  const apply = () => {
    if (openBuild.length > 0) {
      setAskOpen(true);
      return;
    }
    void save();
  };

  // Fertigkeitszeilen kommen aus der Ableitung — nur so sind Teilgebiete dabei.
  const skills = sheetAfter?.skills ?? sheetBefore?.skills ?? [];

  /* Kein `prompt()` mehr — derselbe Auswähler wie im Assistenten und am Bogen. */
  const addSubtype = (skillId: string, subtype: string) => {
    const exists =
      character.skillSubtypes.some((s) => s.skillId === skillId && s.subtype === subtype) ||
      newSubtypes.some((s) => s.skillId === skillId && s.subtype === subtype);
    if (exists) return;
    setNewSubtypes([...newSubtypes, { skillId, subtype }]);
  };

  /*
    Die Talentliste steckt jetzt im `FeatPicker` — samt Suche, Voraussetzungen,
    Abschnitten und dem Ausblenden schon gewählter Talente. Hier stand vorher eine
    eigene Fassung mit `slice(0, 40)`, die still 287 der 327 Talente wegließ.
  */

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">
        {S.levelUp.title} — {character.name}
      </h1>
      <p className="text-sm text-slate-400">
        {S.levelUp.newLevel}: {newTotal}
        {sheetBefore &&
          character.xp < (sheetBefore.xp.nextLevelAt ?? Infinity) &&
          sheetBefore.xp.nextLevelAt !== null && (
            <span className="ml-2 text-amber-400">
              (EP: {character.xp.toLocaleString("de-DE")} /{" "}
              {sheetBefore.xp.nextLevelAt.toLocaleString("de-DE")} — noch nicht erreicht, der DM
              entscheidet)
            </span>
          )}
      </p>

      <Card>
        <SectionTitle>{S.levelUp.chooseClass}</SectionTitle>
        {/*
          Dieselben Kacheln wie im Assistenten, und aus demselben Grund: es ist derselbe
          Handgriff („welche Klasse?"), und eine App, die eine Frage an zwei Stellen
          verschieden stellt, lässt einen zweimal nachdenken. Vorher stand hier eine
          Chip-Reihe und darunter ein Aufklapper mit einer schmalen Liste.

          `info` wird ABSICHTLICH nicht übergeben: die Faktentabelle der gewählten Klasse
          steht schon darunter und richtet sich nach `classId`. Zwei Infofelder auf einem
          Schirm wären zwei Wahrheiten — und Antippen kostet hier nichts, weil erst
          „Aufstieg übernehmen" etwas speichert.
        */}
        <PickTiles
          items={existingClasses}
          selectedId={classId}
          onSelect={chooseClass}
          icon={(cls) => accentOfClass(cls.id) ?? "characters"}
          detail={classDetailLine}
        />
        {/* Sobald eine Klasse gewählt ist: was bringt genau diese Stufe darin?
            Die Stufe IN DER KLASSE, nicht die Gesamtstufe — davon hängen
            Tabelle, Zaubergrade und Klassenfähigkeiten ab. */}
        {classId !== null && (
          <ClassInfo
            klass={compendium.get(classId)}
            compendium={compendium}
            nextLevelInClass={
              character.levels.filter((l) => l.classId === classId).length + 1
            }
          />
        )}

        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-slate-400">andere Klasse wählen…</summary>
          <div className="mt-1 mb-2 flex items-center gap-2">
            <Chip active={showAllClasses} onClick={() => setShowAllClasses(!showAllClasses)}>
              auch Prestigeklassen
            </Chip>
            <Chip active={showNpcClasses} onClick={() => setShowNpcClasses(!showNpcClasses)}>
              {S.wizard.showNpcClasses}
            </Chip>
          </div>
          <PickTiles
            items={baseClasses}
            selectedId={classId}
            onSelect={chooseClass}
            icon={(cls) => accentOfClass(cls.id) ?? "characters"}
            detail={classDetailLine}
          />
        </details>
      </Card>

      {/*
        Kein Würfelfeld mehr. Martins Regel: „TP bei Levelup: volle Hit Die der Klasse
        (Krieger +10), kein Wurf." Kein Wurf heißt kein Knopf — ein Eingabefeld daneben
        würde behaupten, es gäbe hier noch etwas zu entscheiden.

        Geschrieben wird `hpRoll: "max"` an die STUFE und nicht als Hausregel über alle
        Stufen: bestehende Bögen bleiben Zahl für Zahl, wie sie sind (seine Entscheidung
        auf die Rückfrage). Ein Schalter hätte jeden gespeicherten Wurf neu gedeutet.
      */}
      <Card>
        <SectionTitle>{S.levelUp.hpTitle}</SectionTitle>
        <p className="text-sm text-slate-200">
          {hitDie === null
            ? S.levelUp.hpNoClass
            : S.levelUp.hpFull(
                hitDie,
                sheetAfter && sheetBefore ? sheetAfter.hp.max - sheetBefore.hp.max : hitDie,
              )}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">{S.levelUp.hpFullWhy}</p>
      </Card>

      {needsAbility && (
        <Card>
          <SectionTitle>{S.levelUp.abilityIncrease}</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {ABILITIES.map((ability) => (
              <Chip
                key={ability}
                active={abilityPick === ability}
                onClick={() => setAbilityPick(abilityPick === ability ? null : ability)}
              >
                {S.abilityNames[ability]} +1
              </Chip>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle>{S.levelUp.skills}</SectionTitle>
        <div className={`mb-2 text-sm font-semibold ${skillLeft < 0 ? "text-red-400" : "text-emerald-400"}`}>
          {S.wizard.pointsLeft}: {skillLeft}
        </div>
        {/*
          Dieselbe Auskunft wie im Assistenten, sein Wunsch: Fertigkeits-Vorschläge „auch
          beim Stufenaufstieg". Die Empfehlung hängt an der Klasse, in DIE aufgestiegen
          wird — beim Multiklassen ist das nicht dieselbe wie auf Stufe 1.
        */}
        <SkillAdviceLine advice={advice} klass={chosenClass} compendium={compendium} />
        <ul className="max-h-80 divide-y divide-slate-800 overflow-y-auto">
          {skills.map((skill) => {
            const isClass = skill.isClassSkill;
            const current = ranks?.[skill.key] ?? 0;
            const max = maxRanks(newTotal, isClass);
            const isSubtypeAnchor = skill.subtyped && skill.subtype === undefined;
            /*
              3.5: ganze Ränge. Klassenfremd kostet ein Rang 2 Punkte (die Engine rechnet
              in derive.ts mit derselben Basis). Halbe Ränge für den halben Preis waren 3.0.

              Die Schrittweite kommt aus `stepRank` im Kern und nicht mehr als `step = 1`
              von hier: liegt auf dem Bogen schon ein halber Rang (Fight-Club-Import), führt
              der Knopf auf eine ganze Zahl statt von 2,5 auf 3,5 weiterzuzählen.
            */
            const cost = skillPointCost(isClass);
            const setSkill = (value: number) => {
              const next = { ...(ranks ?? {}) };
              if (value <= 0) delete next[skill.key];
              else next[skill.key] = value;
              setRanks(next);
            };
            return (
              <li key={skill.key} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                <span className={isClass ? "" : "text-slate-400"}>
                  {skill.name}
                  {isClass && <span className="ml-1 text-[11px] text-amber-400">✧</span>}
                  <SkillMark why={suggestionWhy(advice, skill)} />
                  {!isSubtypeAnchor && (
                    <span className="ml-1 text-xs text-slate-500">
                      {current}/{max}
                      {/* Klassenfremd kostet ein Rang 2 Punkte — das muss am
                          Knopf stehen, sonst wundert man sich über den Verbrauch. */}
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
                        disabled={current <= (character.skillRanks[skill.key] ?? 0)}
                        onClick={() => setSkill(stepRank(current, -1))}
                      >
                        −
                      </GhostButton>
                      <GhostButton
                        disabled={current >= max || skillLeft < cost}
                        onClick={() => setSkill(stepRank(current, 1))}
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
            skill={compendium.get(subtypeFor)}
            taken={[...character.skillSubtypes, ...newSubtypes]
              .filter((entry) => entry.skillId === subtypeFor)
              .map((entry) => entry.subtype)}
            onPick={(subtype) => addSubtype(subtypeFor, subtype)}
            onClose={() => setSubtypeFor(null)}
          />
        )}
      </Card>

      {(featSlotsLeft > 0 || newFeats.length > 0) && (
        <Card>
          <SectionTitle>
            {S.levelUp.feats} ({S.wizard.slotsLeft}: {featSlotsLeft})
          </SectionTitle>
          {newFeats.length > 0 && (
            <div className="mb-1 flex flex-wrap gap-1.5">
              {newFeats.map((entry) => {
                const feat = compendium.get(entry.featId);
                return (
                  <Chip
                    key={entry.featId}
                    active
                    onClick={() => setNewFeats(newFeats.filter((f) => f.featId !== entry.featId))}
                  >
                    {feat ? displayName(feat) : entry.featId}
                    {entry.choice ? ` (${entry.choice})` : ""} ✕
                  </Chip>
                );
              })}
            </div>
          )}
          {/*
            Derselbe Blätterer wie im Assistenten und im Talente-Reiter.

            Hier stand eine eigene Liste mit eigener Suche — die dritte Kopie
            derselben Sache, und wie die anderen zwei ohne ein Wort über die
            Voraussetzungen. Der Bogen, gegen den geprüft wird, ist der VOR dem
            Aufstieg: was er sich beim Aufstieg an BAB und Attributen dazuholt,
            zählt für die Voraussetzung eines Talents in derselben Stufe nicht.
            Das ist regeltechnisch die strengere Lesart; wo sein Tisch es anders
            spielt, hilft der Notausgang.
          */}
          <FeatPicker
            compendium={compendium}
            sheet={sheetBefore}
            chosen={[...(sheetBefore?.featIds ?? []), ...newFeats.map((f) => f.featId)]}
            /*
              Die Waffen, die der Bogen SCHON traegt — beim Aufstieg kauft man selten
              neu ein. Die vollstaendige Liste steht im Blatt darunter.
            */
            ownWeapons={character.inventory
              .map((row) => {
                const item = row.itemId ? compendium.get(row.itemId) : undefined;
                return isWeaponEntity(item) && item !== undefined
                  ? { id: item.id, name: row.customName ?? displayName(item) }
                  : null;
              })
              .filter((entry): entry is { id: string; name: string } => entry !== null)}
            onPick={(feat, choice) =>
              setNewFeats([
                ...newFeats,
                {
                  featId: feat.id,
                  ...(choice ? { choiceRef: choice.choiceRef, choice: choice.choice } : {}),
                },
              ])
            }
          />
        </Card>
      )}

      {/*
        Die Zauberliste stand hier als eigene Kopie mit eigener Suche — die zweite Fassung
        derselben Sache, und beim Assistenten wäre die dritte dazugekommen. Jetzt derselbe
        Auswähler wie dort: eine Liste, eine Grenze je Grad, ein Verhalten.
      */}
      {isSpontaneous && (
        <Card>
          <SectionTitle>
            {S.levelUp.newSpells}
            {knownLimit !== null && (
              <span className="ml-2 normal-case text-slate-500">
                ({S.spells.knownLimit(knownCount, String(knownLimit))})
              </span>
            )}
          </SectionTitle>
          <SpellPicker
            compendium={compendium}
            block={castingAfter}
            alreadyKnown={classId === null ? [] : (character.spellState[classId]?.known ?? [])}
            picked={newKnown}
            onPick={(id) => setNewKnown([...newKnown, id])}
            onDrop={(id) => setNewKnown(newKnown.filter((x) => x !== id))}
          />
        </Card>
      )}

      {sheetBefore && sheetAfter && (
        <Card>
          <SectionTitle>{S.levelUp.summary}</SectionTitle>
          <ul className="space-y-1 text-sm">
            <li>
              {S.levelUp.hpDelta}: {sheetBefore.hp.max} → <b>{sheetAfter.hp.max}</b>
            </li>
            <li>
              {S.sheet.bab}: {fmtMod(sheetBefore.bab)} → <b>{fmtMod(sheetAfter.bab)}</b>
            </li>
            {/*
              Kommt mit dieser Stufe ein ANGRIFF dazu, wird es hier angesagt — sein Auftrag:
              „Auch beim leveln sollte das erwähnt werden."

              Verglichen wird die ANZAHL vorher gegen nachher und nicht der BAB gegen 6.
              Damit stimmt es auch für die Grenzen +11 und +16, und bei 6 → 7 steht es
              nicht da. Ein Satz, der immer dasteht, wird nicht gelesen.
            */}
            {iterativeAttacks(sheetAfter.bab).length >
              iterativeAttacks(sheetBefore.bab).length && (
              <li className="rounded bg-emerald-950/40 px-1.5 py-1 text-emerald-200">
                {S.levelUp.moreAttacks(
                  iterativeAttacks(sheetAfter.bab).length,
                  fmtMod(sheetAfter.bab),
                )}
              </li>
            )}
            <li>
              Saves: {fmtMod(sheetBefore.saves.fort.total)}/{fmtMod(sheetBefore.saves.ref.total)}/
              {fmtMod(sheetBefore.saves.will.total)} →{" "}
              <b>
                {fmtMod(sheetAfter.saves.fort.total)}/{fmtMod(sheetAfter.saves.ref.total)}/
                {fmtMod(sheetAfter.saves.will.total)}
              </b>
            </li>
            {sheetAfter.spellcasting.map((block) => (
              <li key={block.classId}>
                {block.className}-{S.sheet.slots}:{" "}
                {block.slots
                  .filter((s) => s.total !== null)
                  .map((s) => s.total)
                  .join("/")}
              </li>
            ))}
          </ul>
          {/*
            Zähler, die der Aufstieg zurücksetzt — ANGESAGT, bevor er drückt. Ein
            Zähler, der sich stillschweigend ändert, ist genau das, was ihn an der
            Rast gestört hat.
          */}
          {levelUpTrackers.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-emerald-300">
              {levelUpTrackers.map((line) => (
                <li key={line.id}>
                  {S.levelUp.trackerLine(line.name, line.from, line.to)}
                </li>
              ))}
            </ul>
          )}

          {/*
            Nur die SICHTBAREN: was am Bogen mit „passt so" abgestellt wurde, darf
            hier nicht wieder auftauchen — sonst hätte der Schalter am Bogen keine
            Wirkung, sobald man aufsteigt. Und ohne das Tagesgeschäft: nach einem
            Aufstieg sind die neuen Zauberplätze natürlich leer, das ist kein
            Versäumnis (am Bogen steht es weiterhin).
          */}
          {buildIssues(sheetAfter).length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-rose-300">
              {buildIssues(sheetAfter).map((issue, i) => (
                <li key={i}>{issue.message}</li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/*
        Dieselbe Rückfrage wie im Assistenten. „Zurück und nachtragen" gibt es hier
        nicht: der Aufstieg ist EINE Seite — wer nachtragen will, scrollt hoch, und
        ein Knopf, der nichts anderes tut als das Kärtchen zu schließen, verspricht
        mehr als er hält.
      */}
      {askOpen && openBuild.length > 0 && (
        <OpenWorkConfirm
          open={openBuild}
          hint={S.open.confirmHintLevelUp}
          onConfirm={() => void save()}
          onCancel={() => setAskOpen(false)}
        />
      )}

      <div className="flex justify-between">
        <Link to="/charaktere/$charId" params={{ charId }}>
          <GhostButton>{S.actions.cancel}</GhostButton>
        </Link>
        <PrimaryButton disabled={!afterCharacter || !classId} onClick={apply}>
          <IconInline name="levelUp" /> {S.levelUp.apply}
        </PrimaryButton>
      </div>
    </div>
  );
}
