import type { Entity, Prerequisite } from "../schema/entities.js";

/**
 * Aus den Klassendaten das herauslesen, was man beim Wählen wissen will —
 * einmal als Überblick über die ganze Klasse und einmal als „was bringt genau
 * diese eine Stufe".
 *
 * Alles ABGELEITET, nichts von Hand gepflegt: die Tabellen liegen ohnehin im
 * Pack, und eine handgeschriebene Zusammenfassung wäre spätestens beim nächsten
 * Datenlauf falsch.
 */

export type SaveKey = "fort" | "ref" | "will";
export const SAVE_KEYS: readonly SaveKey[] = ["fort", "ref", "will"];

export interface ClassSummary {
  hitDie: number;
  skillPointsPerLevel: number;
  /** „voll", „3/4" oder „1/2" — aus der Tabelle abgelesen, nicht geraten. */
  babProgression: "full" | "threeQuarter" | "half";
  goodSaves: SaveKey[];
  maxLevel: number;
  classSkillIds: string[];
  /** Prestigeklasse = Einstiegsvoraussetzungen vorhanden oder maxLevel < 20. */
  isPrestige: boolean;
  requirements: Prerequisite[];
  proficiencies: string | undefined;
  spellcasting:
    | {
        model: "prepared" | "spontaneous";
        ability: "int" | "wis" | "cha";
        /** Erste Klassenstufe mit Zaubern. */
        firstLevel: number;
        /** Höchster Zaubergrad auf der Höchststufe. */
        maxSpellLevel: number;
        usesSpellbook: boolean;
      }
    | undefined;
}

function classData(entity: Entity) {
  return entity.kind === "class" ? entity.data : null;
}

export function classSummary(entity: Entity): ClassSummary | null {
  const data = classData(entity);
  if (!data) return null;
  const rows = data.levels;
  const top = rows[rows.length - 1];
  const first = rows[0];
  if (!top || !first) return null;

  // Aus der Tabelle ablesen statt dem template zu vertrauen: bei Homebrew ist
  // template oft leer, die Zahlen sind aber immer da.
  const babPerLevel = top.bab / rows.length;
  const babProgression =
    babPerLevel > 0.9 ? "full" : babPerLevel > 0.6 ? "threeQuarter" : "half";

  const goodSaves = SAVE_KEYS.filter((key) => {
    const template = top.template?.[key];
    if (template !== undefined) return template === "good";
    // Ohne template: gute Progression startet bei 2 auf Stufe 1.
    return first[key] >= 2;
  });

  let spellcasting: ClassSummary["spellcasting"];
  if (data.spellcasting) {
    const firstLevel = rows.findIndex((row) =>
      (row.spellsPerDay ?? []).some((count) => count !== null && count > 0),
    );
    const perDay = top.spellsPerDay ?? [];
    let maxSpellLevel = 0;
    for (let i = 0; i < perDay.length; i++) {
      const count = perDay[i];
      if (count !== null && count !== undefined) maxSpellLevel = i;
    }
    spellcasting = {
      model: data.spellcasting.model,
      ability: data.spellcasting.ability,
      firstLevel: firstLevel < 0 ? 1 : firstLevel + 1,
      maxSpellLevel,
      usesSpellbook: data.spellcasting.spellbook,
    };
  }

  return {
    hitDie: data.hitDie,
    skillPointsPerLevel: data.skillPointsPerLevel,
    babProgression,
    goodSaves,
    maxLevel: data.maxLevel,
    classSkillIds: data.classSkillIds,
    isPrestige: data.requirements.length > 0 || data.maxLevel < 20,
    requirements: data.requirements,
    proficiencies: data.proficiencies,
    spellcasting,
  };
}

export interface ClassLevelGain {
  /** Die Stufe IN DIESER KLASSE, die genommen wird (1-basiert). */
  level: number;
  hitDie: number;
  babDelta: number;
  saveDeltas: Record<SaveKey, number>;
  features: { name: string; description: string | undefined }[];
  /** Zaubergrade, die auf dieser Stufe erstmals verfügbar werden. */
  newSpellLevels: number[];
  /** Zauber pro Tag nach dieser Stufe (Index = Grad), falls die Klasse zaubert. */
  slots: (number | null)[] | undefined;
  /** Bekannte Zauber nach dieser Stufe (spontane Wirker). */
  known: (number | null)[] | undefined;
}

/**
 * Was die `level`-te Stufe DIESER Klasse bringt — die Differenz zur Stufe
 * davor. Genau die Frage beim Aufstieg: „was habe ich davon, wenn ich noch
 * eine Stufe Kleriker nehme?"
 */
export function classLevelGain(entity: Entity, level: number): ClassLevelGain | null {
  const data = classData(entity);
  if (!data) return null;
  const row = data.levels[level - 1];
  if (!row) return null;
  const previous = level >= 2 ? data.levels[level - 2] : undefined;

  const saveDeltas = {
    fort: row.fort - (previous?.fort ?? 0),
    ref: row.ref - (previous?.ref ?? 0),
    will: row.will - (previous?.will ?? 0),
  };

  const newSpellLevels: number[] = [];
  const perDay = row.spellsPerDay;
  if (perDay) {
    const before = previous?.spellsPerDay ?? [];
    for (let grade = 0; grade < perDay.length; grade++) {
      const now = perDay[grade];
      const then = before[grade];
      const available = now !== null && now !== undefined && now > 0;
      const wasAvailable = then !== null && then !== undefined && then > 0;
      if (available && !wasAvailable) newSpellLevels.push(grade);
    }
  }

  return {
    level,
    hitDie: data.hitDie,
    babDelta: row.bab - (previous?.bab ?? 0),
    saveDeltas,
    features: row.features.map((f) => ({ name: f.name, description: f.description })),
    newSpellLevels,
    slots: row.spellsPerDay,
    known: row.spellsKnown,
  };
}

// ---------------------------------------------------------------------------
// Rassen
// ---------------------------------------------------------------------------

export interface RaceSummary {
  abilityMods: { ability: string; value: number }[];
  size: string;
  speedFt: number;
  favoredClassId: string;
  /** Stufenanpassung — 0 bei allen Standardrassen. */
  levelAdjustment: number;
  traits: { name: string; description: string | undefined }[];
  bonusLanguages: string | undefined;
}

export function raceSummary(entity: Entity): RaceSummary | null {
  if (entity.kind !== "race") return null;
  const data = entity.data;
  const abilityMods = Object.entries(data.abilityMods ?? {})
    .filter((pair): pair is [string, number] => typeof pair[1] === "number" && pair[1] !== 0)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([ability, value]) => ({ ability, value }));

  return {
    abilityMods,
    size: data.size,
    speedFt: data.speedFt,
    favoredClassId: data.favoredClassId,
    levelAdjustment: data.la ?? 0,
    traits: data.traits.map((t) => ({ name: t.name, description: t.description })),
    bonusLanguages: data.bonusLanguages,
  };
}
