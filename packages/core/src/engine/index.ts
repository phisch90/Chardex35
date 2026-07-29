import type { Character, HouseRules } from "../schema/character.js";
import { DEFAULT_HOUSE_RULES } from "../schema/character.js";
import type { Entity } from "../schema/entities.js";
import { collectEffects } from "./effects.js";
import { deriveAbilities, deriveSheetValues } from "./derive.js";
import { resolve } from "./resolve.js";
import { buildTimeline } from "./timeline.js";
import type { DerivedSheet } from "./types.js";
import { validate } from "./validate.js";

/**
 * DIE Funktion der Engine: rohe Charakter-Entscheidungen + aufgelöstes
 * Kompendium + Hausregeln → kompletter abgeleiteter Bogen. Pur und
 * deterministisch; crasht nie an kaputten Referenzen (degradiert mit issues).
 *
 * `compendium` ist die bereits aufgelöste Map (Homebrew-Shadowing angewendet)
 * — siehe `resolveCompendium()` in schema/entities.
 */
export function deriveSheet(
  character: Character,
  compendium: Map<string, Entity>,
  houseRules: HouseRules = DEFAULT_HOUSE_RULES,
): DerivedSheet {
  const resolved = resolve(character, compendium);
  const timeline = buildTimeline(resolved, houseRules);
  const issues = [...resolved.issues];
  const effects = collectEffects(resolved, timeline, issues);
  const abilities = deriveAbilities(resolved, timeline, effects);
  const sheet = deriveSheetValues(resolved, timeline, effects, abilities, houseRules, issues);
  validate(resolved, timeline, sheet);
  return sheet;
}

export { effectKey } from "./internal.js";
export * from "./classinfo.js";
export * from "./diff.js";
export * from "./spells.js";
export * from "./tables.js";
export * from "./trackers.js";
export * from "./types.js";
export { stackContributions, withoutContributions } from "./stack.js";
export {
  allowedSlots,
  conflictingEquipIds,
  cycleEquipSlot,
  isNaturalOrUnarmed,
  itemKind,
  nextSlot,
  type EquipCandidate,
  type ItemKind,
} from "./equipment.js";
export {
  COMBAT_EXPERTISE_MAX,
  applyCombatOptions,
  canAttackThisRound,
  type CombatOptionContext,
  type CombatOptionOutcome,
} from "./combatOptions.js";
