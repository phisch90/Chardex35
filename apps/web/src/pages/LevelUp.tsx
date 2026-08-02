import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ABILITIES,
  adviceFor,
  classCategory,
  deriveSheet,
  displayName,
  maxRanks,
  applyTrackerLines,
  buildIssues,
  openBuildWork,
  planLevelUpRefill,
  skillPointCost,
  parseDice,
  rollDice,
  type Ability,
  type Character,
} from "@codex35/core";
import { S } from "../strings.js";
import { CharacterRepo } from "../db/repo.js";
import { cryptoRng } from "../lib/rng.js";
import {
  useAllEntities,
  useCharacter,
  useCompendium,
  useHouseRules,
  useSheet,
} from "../lib/hooks.js";
import { Card, Chip, GhostButton, PrimaryButton, SectionTitle, fmtMod } from "../ui/bits.js";
import { OpenWorkConfirm } from "../ui/OpenWorkConfirm.js";
import { FeatPicker } from "../ui/FeatPicker.js";
import { ClassInfo } from "../ui/RaceClassInfo.js";
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
  const [infoClassId, setInfoClassId] = useState<string | null>(null);
  const [hpRoll, setHpRoll] = useState<number | null>(null);
  const [abilityPick, setAbilityPick] = useState<Ability | null>(null);
  const [ranks, setRanks] = useState<Record<string, number> | null>(null);
  /** Beim Aufstieg neu angelegte Teilgebiete (z.B. erstes Knowledge (arcana)). */
  const [newSubtypes, setNewSubtypes] = useState<{ skillId: string; subtype: string }[]>([]);
  const [subtypeFor, setSubtypeFor] = useState<string | null>(null);
  const [newFeatIds, setNewFeatIds] = useState<string[]>([]);
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
    // TP-Wurf hart auf 1..TW klemmen und runden — getippte Dezimal-/Ausreißer-
    // Werte würden sonst das Schema (int) und damit den Export brechen.
    const cls = compendium?.get(classId);
    const die = cls?.kind === "class" ? cls.data.hitDie : 12;
    const clampedHp =
      hpRoll === null ? ("avg" as const) : Math.min(Math.max(1, Math.round(hpRoll)), die);
    copy.levels.push({ classId, hpRoll: clampedHp });
    if (needsAbility) {
      const index = Math.floor(newTotal / 4) - 1;
      const ups = [...copy.abilities.levelUps];
      while (ups.length <= index) ups.push(null);
      ups[index] = abilityPick;
      copy.abilities.levelUps = ups;
    }
    copy.skillRanks = { ...ranks };
    copy.skillSubtypes = [...copy.skillSubtypes, ...newSubtypes];
    copy.feats = [...copy.feats, ...newFeatIds.map((featId) => ({ featId, extraEffects: [] }))];
    if (newKnown.length > 0) {
      const state = (copy.spellState[classId] ??= { known: [], prepared: [], usedSlots: [] });
      state.known = [...state.known, ...newKnown.filter((id) => !state.known.includes(id))];
    }
    return copy;
  }, [character, classId, ranks, hpRoll, needsAbility, newTotal, abilityPick, newFeatIds, newKnown, newSubtypes, compendium]);

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

  const existingClassIds = [...new Set(character.levels.map((l) => l.classId))];
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

  const rollHp = () => {
    if (!hitDie) return;
    const expr = parseDice(`1d${hitDie}`);
    if (expr) setHpRoll(rollDice(expr, cryptoRng).total);
  };

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
    await CharacterRepo.save(next);
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
        <div className="flex flex-wrap gap-1.5">
          {existingClassIds.map((id) => {
            const cls = compendium.get(id);
            return (
              <Chip key={id} active={classId === id} onClick={() => chooseClass(id)}>
                {cls ? displayName(cls) : id}
              </Chip>
            );
          })}
        </div>
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
          <div className="mt-1 flex items-center gap-2">
            <Chip active={showAllClasses} onClick={() => setShowAllClasses(!showAllClasses)}>
              auch Prestigeklassen
            </Chip>
            <Chip active={showNpcClasses} onClick={() => setShowNpcClasses(!showNpcClasses)}>
              {S.wizard.showNpcClasses}
            </Chip>
          </div>
          <ul className="mt-1 max-h-60 divide-y divide-slate-800 overflow-y-auto">
            {baseClasses.map((cls) => (
              <li key={cls.id}>
                <button
                  onClick={() => chooseClass(cls.id)}
                  className={`w-full px-2 py-1.5 text-left text-sm hover:bg-slate-800 ${
                    classId === cls.id ? "text-amber-300" : ""
                  }`}
                >
                  {displayName(cls)}
                  {cls.kind === "class" && (
                    <span className="ml-1 text-xs text-slate-500">
                      W{cls.data.hitDie}
                      {cls.data.spellcasting ? " · Zauberer" : ""}
                    </span>
                  )}
                </button>
                <div className="px-2 pb-1">
                  <button
                    onClick={() => setInfoClassId(infoClassId === cls.id ? null : cls.id)}
                    className="text-[11px] text-slate-400 underline decoration-dotted hover:text-amber-300"
                  >
                    {infoClassId === cls.id ? "Infos ausblenden ▾" : "Infos ▸"}
                  </button>
                  {infoClassId === cls.id && (
                    <ClassInfo
                      klass={cls}
                      compendium={compendium}
                      nextLevelInClass={
                        character.levels.filter((l) => l.classId === cls.id).length + 1
                      }
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      </Card>

      <Card>
        <SectionTitle>
          {S.levelUp.hpRoll} {hitDie ? `(W${hitDie})` : ""}
        </SectionTitle>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={hitDie ?? 12}
            value={hpRoll ?? ""}
            onChange={(e) =>
              setHpRoll(Number.isNaN(e.target.valueAsNumber) ? null : Math.round(e.target.valueAsNumber))
            }
            className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-lg font-semibold"
          />
          <GhostButton onClick={rollHp} disabled={!hitDie}>
            🎲 {S.levelUp.rollHp}
          </GhostButton>
          <span className="text-xs text-slate-500">leer = Durchschnitt</span>
        </div>
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
            // 3.5: ganze Ränge. Klassenfremd kostet ein Rang 2 Punkte (die
            // Engine rechnet in derive.ts mit derselben Basis). Halbe Ränge für
            // den halben Preis waren 3.0 und sind hier bewusst weg.
            const step = 1;
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
                        onClick={() => setSkill(current - step)}
                      >
                        −
                      </GhostButton>
                      <GhostButton
                        disabled={current >= max || skillLeft < cost}
                        onClick={() => setSkill(current + step)}
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

      {(featSlotsLeft > 0 || newFeatIds.length > 0) && (
        <Card>
          <SectionTitle>
            {S.levelUp.feats} ({S.wizard.slotsLeft}: {featSlotsLeft})
          </SectionTitle>
          {newFeatIds.length > 0 && (
            <div className="mb-1 flex flex-wrap gap-1.5">
              {newFeatIds.map((id) => {
                const feat = compendium.get(id);
                return (
                  <Chip key={id} active onClick={() => setNewFeatIds(newFeatIds.filter((f) => f !== id))}>
                    {feat ? displayName(feat) : id} ✕
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
            Aufstieg: was er sich beim Aufstieg an GAB und Attributen dazuholt,
            zählt für die Voraussetzung eines Talents in derselben Stufe nicht.
            Das ist regeltechnisch die strengere Lesart; wo sein Tisch es anders
            spielt, hilft der Notausgang.
          */}
          <FeatPicker
            compendium={compendium}
            sheet={sheetBefore}
            chosen={[...(sheetBefore?.featIds ?? []), ...newFeatIds]}
            onPick={(feat) => setNewFeatIds([...newFeatIds, feat.id])}
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
            <ul className="mt-2 list-inside list-disc text-xs text-amber-400">
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
          ⬆ {S.levelUp.apply}
        </PrimaryButton>
      </div>
    </div>
  );
}
