import { displayName, type Advice, type Entity, type SkillLine } from "@codex35/core";
import { S } from "../strings.js";

/**
 * Welche Fertigkeiten die Klasse ausmachen — an zwei Stellen dieselbe Auskunft.
 *
 * Sein Wunsch: Fertigkeits-Vorschläge im Assistenten UND „auch beim Stufenaufstieg". Also
 * liegt beides hier und nicht zweimal in den Seiten: `pages/CharacterWizard.tsx` und
 * `pages/LevelUp.tsx` rendern beide eine Liste aus `sheet.skills`, und zwei Abschriften
 * derselben Regel würden auseinanderlaufen.
 *
 * **Die Reihenfolge der Liste bleibt, wie sie ist.** Die empfohlenen Zeilen nach oben zu
 * sortieren hätte die Liste bei jedem Klassenwechsel umgeworfen — man sucht Fertigkeiten
 * alphabetisch, so wie auf dem Papierbogen.
 */

/** Trägt diese Zeile eine Empfehlung? `skill.skillId` ist die Kennung ohne Teilgebiet. */
export function isSuggested(advice: Advice | undefined, skill: SkillLine): boolean {
  return advice?.skills.some((s) => s.skillId === skill.skillId) ?? false;
}

/** Der Grund, falls es einen gibt — steht als Titel an der Marke. */
export function suggestionWhy(advice: Advice | undefined, skill: SkillLine): string | undefined {
  const hit = advice?.skills.find((s) => s.skillId === skill.skillId);
  if (hit === undefined) return undefined;
  return hit.subtypeHint === undefined
    ? hit.why
    : `${hit.why} — ${S.advice.subtypeHint(hit.subtypeHint)}`;
}

/**
 * Die Marke an einer empfohlenen Zeile — als WORT, nicht als Zeichen.
 *
 * Zuerst stand hier ein ✦. Neben dem ✧ für Klassenfertigkeiten wären das zwei Zeichen
 * nebeneinander, die beide erklärt werden müssten — und genau darüber hatte er sich beim
 * Zauber-Reiter schon beschwert („Legende für die Zeichen"). Ein Wort erklärt sich selbst.
 *
 * Der Grund hängt als `title` daran: am Rechner beim Zeigen lesbar, am Handy nicht — dort
 * stehen die Gründe in der Zeile über der Liste.
 */
export function SkillMark({ why }: { why: string | undefined }) {
  if (why === undefined) return null;
  return (
    <span className="ml-1.5 text-[11px] font-medium text-sky-300" title={why}>
      {S.advice.suggested}
    </span>
  );
}

/**
 * Die Zeile über der Liste: welche Fertigkeiten für diese Klasse zählen.
 *
 * Genannt werden die NAMEN aus dem Kompendium, nicht die Kennungen — „5 Ränge in
 * srd:skill:hide" liest am Tisch niemand (dieselbe Regel wie in `prereqs.ts`). Findet sich
 * eine Kennung nicht, fällt sie stillschweigend weg; das kann nur passieren, wenn ein Pack
 * fehlt, und dann ist eine halbe Liste besser als eine Fehlermeldung.
 */
export function SkillAdviceLine({
  advice,
  klass,
  compendium,
}: {
  advice: Advice | undefined;
  klass: Entity | undefined;
  compendium: ReadonlyMap<string, Entity>;
}) {
  if (advice === undefined || advice.skills.length === 0 || klass === undefined) return null;
  const named = advice.skills
    .map((s) => {
      const entity = compendium.get(s.skillId);
      if (entity === undefined) return undefined;
      return s.subtypeHint === undefined
        ? displayName(entity)
        : `${displayName(entity)} (${s.subtypeHint})`;
    })
    .filter((name): name is string => name !== undefined);
  if (named.length === 0) return null;

  return (
    <p className="mb-2 text-xs leading-snug text-sky-300">
      <span className="font-semibold">{S.advice.skillTitle(displayName(klass))}:</span>{" "}
      <span className="text-slate-300">{named.join(" · ")}</span>
    </p>
  );
}
