import type { Entity, FeatEntity } from "../schema/entities.js";

/**
 * WORAUF wirkt dieses Talent?
 *
 * Sein Wunsch war ein Filter „nach Bonus". Der Befund dazu verschiebt die Sache:
 * von 327 Talenten tragen nur 27 einen maschinenlesbaren `effect`. Ein Filter
 * darauf hätte 300 Talente versteckt — schlechter als gar keiner.
 *
 * Also eine Handtabelle, seine Entscheidung. Sie steht hier und nicht in den
 * Packs, aus demselben Grund wie bei den deutschen Namen: die Packs neu zu
 * erzeugen heißt, dass eine Kennung wandern kann, und dann verliert jeder Bogen
 * sein Talent.
 *
 * Die Kategorien sind nicht frei erfunden, sondern die Werte, die er am Bogen
 * ansieht: Angriff, Schaden, RK, Rettungswürfe, Fertigkeiten, Zauber, TP,
 * Initiative, Bewegung, Handlungen — dazu Übung, Herstellen und Besonderes.
 * „Was verbessert meine RK?" muss eine Antwort haben, „was ist metamagisch?"
 * beantwortet schon der Art-Filter.
 */

export const FEAT_BONUS_KINDS = [
  "attack",
  "damage",
  "ac",
  "save",
  "skill",
  "spell",
  "hp",
  "initiative",
  "speed",
  "action",
  "proficiency",
  "craft",
  "special",
] as const;
export type FeatBonusKind = (typeof FEAT_BONUS_KINDS)[number];

/*
  Die 175 nicht-epischen Talente. Ein Talent kann mehreres treffen — Power Attack
  kostet Angriff und gibt Schaden, steht also unter beidem. Das ist Absicht: wer
  „mehr Schaden" sucht, soll es finden, und wer die Angriffsspalte durchgeht auch.

  Sortiert wie im Pack, damit sich die Liste gegen `git diff` lesen lässt.
*/
const BONUS: Record<string, readonly FeatBonusKind[]> = {
  "ability-focus": ["special"],
  acrobatic: ["skill"],
  agile: ["skill"],
  alertness: ["skill"],
  "animal-affinity": ["skill"],
  "antipsionic-magic": ["special"],
  "armor-proficiency-heavy": ["proficiency"],
  "armor-proficiency-light": ["proficiency"],
  "armor-proficiency-medium": ["proficiency"],
  athletic: ["skill"],
  "augment-summoning": ["spell", "special"],
  autonomous: ["skill"],
  "awesome-blow": ["action", "special"],
  "blind-fight": ["attack", "special"],
  "blindsight-5-ft-radius": ["special"],
  "brew-potion": ["craft"],
  "chaotic-mind": ["special"],
  cleave: ["action"],
  "cloak-dance": ["skill"],
  "closed-mind": ["save", "special"],
  "combat-casting": ["skill", "spell"],
  "combat-expertise": ["ac", "attack"],
  "combat-reflexes": ["action", "attack"],
  "craft-cognizance-crystal": ["craft"],
  "craft-construct": ["craft"],
  "craft-dorje": ["craft"],
  "craft-magic-arms-and-armor": ["craft"],
  "craft-psicrown": ["craft"],
  "craft-psionic-arms-and-armor": ["craft"],
  "craft-psionic-construct": ["craft"],
  "craft-rod": ["craft"],
  "craft-staff": ["craft"],
  "craft-universal-item": ["craft"],
  "craft-wand": ["craft"],
  "craft-wondrous-item": ["craft"],
  "deadly-precision": ["damage"],
  deceitful: ["skill"],
  "deflect-arrows": ["ac", "special"],
  "deft-hands": ["skill"],
  diehard: ["hp", "special"],
  diligent: ["skill"],
  "disguise-spell": ["spell", "skill"],
  "divine-might": ["damage", "special"],
  "divine-vengeance": ["damage", "special"],
  dodge: ["ac"],
  "empower-spell": ["spell"],
  "empower-spell-like-ability": ["spell", "special"],
  endurance: ["save", "skill"],
  "energy-substitution": ["spell"],
  "enlarge-spell": ["spell"],
  "eschew-materials": ["spell"],
  "exotic-weapon-proficiency": ["proficiency"],
  "extend-spell": ["spell"],
  "extra-music": ["special"],
  "extra-turning": ["special"],
  "eyes-in-the-back-of-your-head": ["ac", "special"],
  "far-shot": ["attack", "special"],
  "fleet-of-foot": ["speed", "action"],
  "flyby-attack": ["action", "special"],
  "force-of-will": ["save"],
  "forge-ring": ["craft"],
  "great-cleave": ["action"],
  "great-fortitude": ["save"],
  "greater-manyshot": ["attack", "action"],
  "greater-multiweapon-fighting": ["attack", "action"],
  "greater-spell-focus": ["spell"],
  "greater-spell-penetration": ["spell"],
  "greater-two-weapon-fighting": ["attack", "action"],
  "greater-weapon-focus": ["attack"],
  "greater-weapon-specialization": ["damage"],
  "heighten-spell": ["spell"],
  "hold-the-line": ["action", "special"],
  "hostile-mind": ["special"],
  hover: ["special"],
  "imprint-stone": ["craft"],
  "improved-bull-rush": ["attack", "special"],
  "improved-counterspell": ["spell"],
  "improved-critical": ["damage"],
  "improved-disarm": ["attack", "special"],
  "improved-familiar": ["special"],
  "improved-feint": ["action", "skill"],
  "improved-flyby-attack": ["action", "special"],
  "improved-grapple": ["attack", "special"],
  "improved-initiative": ["initiative"],
  "improved-multiattack": ["attack"],
  "improved-multiweapon-fighting": ["attack", "action"],
  "improved-natural-armor": ["ac"],
  "improved-natural-attack": ["damage"],
  "improved-overrun": ["attack", "special"],
  "improved-precise-shot": ["attack"],
  "improved-shield-bash": ["ac", "attack"],
  "improved-sunder": ["attack", "special"],
  "improved-trip": ["attack", "action"],
  "improved-turning": ["special"],
  "improved-two-weapon-fighting": ["attack", "action"],
  "improved-unarmed-strike": ["attack", "damage"],
  investigator: ["skill"],
  "iron-will": ["save"],
  "jack-of-all-trades": ["skill"],
  "knock-down": ["action", "special"],
  leadership: ["special"],
  "lightning-reflexes": ["save"],
  "magical-aptitude": ["skill"],
  manyshot: ["attack", "action"],
  "martial-weapon-proficiency": ["proficiency"],
  "maximize-spell": ["spell"],
  "mental-resistance": ["save", "special"],
  "mind-over-body": ["hp", "special"],
  mobility: ["ac"],
  "mounted-archery": ["attack"],
  "mounted-combat": ["ac", "special"],
  multiattack: ["attack"],
  "multiweapon-fighting": ["attack", "action"],
  "natural-spell": ["spell", "special"],
  negotiator: ["skill"],
  "nimble-fingers": ["skill"],
  "open-minded": ["skill"],
  "persistent-spell": ["spell"],
  persuasive: ["skill"],
  "plant-control": ["special"],
  "plant-defiance": ["special"],
  "point-blank-shot": ["attack", "damage"],
  "power-attack": ["attack", "damage"],
  "power-critical": ["damage"],
  "precise-shot": ["attack"],
  "psionic-affinity": ["special"],
  "psionic-hole": ["special"],
  "quick-draw": ["action"],
  "quicken-spell": ["spell", "action"],
  "quicken-spell-like-ability": ["spell", "action"],
  "rapid-metabolism": ["hp", "special"],
  "rapid-reload": ["action"],
  "rapid-shot": ["attack", "action"],
  "reach-spell": ["spell"],
  "reckless-offense": ["ac", "attack"],
  "repeat-spell": ["spell"],
  "ride-by-attack": ["action", "special"],
  run: ["speed", "skill"],
  "sacred-spell": ["spell"],
  "scribe-scroll": ["craft"],
  "scribe-tattoo": ["craft"],
  "self-sufficient": ["skill"],
  "sharp-shooting": ["attack"],
  "shield-proficiency": ["proficiency"],
  "shot-on-the-run": ["action"],
  "sidestep-charge": ["ac", "special"],
  "silent-spell": ["spell"],
  "simple-weapon-proficiency": ["proficiency"],
  "skill-focus": ["skill"],
  snatch: ["attack", "special"],
  "snatch-arrows": ["ac", "special"],
  "spell-focus": ["spell"],
  "spell-mastery": ["spell"],
  "spell-penetration": ["spell"],
  "spirited-charge": ["damage", "special"],
  "spring-attack": ["action"],
  "stand-still": ["action", "special"],
  stealthy: ["skill"],
  "still-spell": ["spell"],
  "stunning-fist": ["attack", "special"],
  "subdual-substitution": ["spell"],
  "superior-expertise": ["ac", "attack"],
  toughness: ["hp"],
  "tower-shield-proficiency": ["proficiency"],
  track: ["skill"],
  trample: ["action", "special"],
  "two-weapon-defense": ["ac"],
  "two-weapon-fighting": ["attack", "action"],
  "weapon-finesse": ["attack"],
  "weapon-focus": ["attack"],
  "weapon-specialization": ["damage"],
  "whirlwind-attack": ["action"],
  "widen-spell": ["spell"],
  "wild-talent": ["special"],
  wingover: ["special"],
};

/*
  Epische Talente (152 Stück) sind fast immer die Steigerung eines gewöhnlichen:
  „Epic Toughness" ist Toughness, „Epic Fortitude" ist Great Fortitude. Wo der
  Name das hergibt, erbt das epische Talent die Kategorien seines Vorbilds — das
  ist eine RECHNUNG aus dem Namen, keine zweite Handtabelle, und sie hat den
  Vorteil, dass sie nicht auseinanderlaufen kann.

  Wo der Name nichts hergibt, bleibt das Talent OHNE Kategorie und der Test zählt
  es. Es ist im Blätterer ohnehin ausgeblendet (Stufe 21+).
*/
const EPIC_ALIAS: Record<string, string> = {
  "epic-toughness": "toughness",
  "epic-fortitude": "great-fortitude",
  "epic-reflexes": "lightning-reflexes",
  "epic-will": "iron-will",
  "epic-prowess": "weapon-focus",
  "epic-weapon-focus": "weapon-focus",
  "epic-weapon-specialization": "weapon-specialization",
  "epic-skill-focus": "skill-focus",
  "epic-speed": "fleet-of-foot",
  "epic-dodge": "dodge",
  "epic-endurance": "endurance",
  "epic-leadership": "leadership",
  "epic-spell-focus": "spell-focus",
  "epic-spell-penetration": "spell-penetration",
  "epic-inspiration": "extra-music",
  "improved-combat-casting": "combat-casting",
  "improved-heighten-spell": "heighten-spell",
  "improved-manyshot": "manyshot",
  "improved-spell-capacity": "spell",
  "improved-whirlwind-attack": "whirlwind-attack",
  "intensify-spell": "spell",
  "multispell": "spell",
  "permanent-emanation": "spell",
  "spell-stowaway": "spell",
  "spontaneous-spell": "spell",
  "tenacious-magic": "spell",
  "great-strength": "damage",
  "great-dexterity": "ac",
  "great-constitution": "hp",
  "great-intelligence": "skill",
  "great-wisdom": "spell",
  "great-charisma": "spell",
  "damage-reduction": "ac",
  "energy-resistance": "save",
  "fast-healing": "hp",
  "penetrate-damage-reduction": "damage",
  "overwhelming-critical": "damage",
  "devastating-critical": "damage",
  "dire-charge": "action",
  "blinding-speed": "action",
  "distant-shot": "attack",
  "storm-of-throws": "action",
  "swarm-of-arrows": "action",
  "uncanny-accuracy": "attack",
  "legendary-commander": "special",
  "perfect-health": "save",
  "self-concealment": "ac",
  "superior-initiative": "initiative",
};

/*
  Die Umwege im Alias, die nicht auf ein Talent zeigen, sondern direkt auf eine
  Kategorie („improved-spell-capacity" → „spell"). Das ist bewusst erlaubt: manche
  epischen Talente haben kein gewöhnliches Vorbild, aber eine offensichtliche
  Wirkung.
*/
const KIND_NAMES = new Set<string>(FEAT_BONUS_KINDS);

/**
 * Worauf wirkt dieses Talent? Leere Liste heißt: die App weiß es nicht.
 *
 * Eine leere Liste ist eine ehrliche Antwort und kein Grund, das Talent aus der
 * Liste zu nehmen — im Blätterer erscheint es weiter, nur nicht unter einem
 * Wirkungs-Filter.
 */
export function featBonusKinds(entity: Pick<Entity, "id">): readonly FeatBonusKind[] {
  const key = entity.id.replace(/^srd:feat:/, "");
  const direct = BONUS[key];
  if (direct !== undefined) return direct;

  const alias = EPIC_ALIAS[key];
  if (alias === undefined) return [];
  if (KIND_NAMES.has(alias)) return [alias as FeatBonusKind];
  return BONUS[alias] ?? [];
}

/** Hat dieses Talent überhaupt eine bekannte Wirkung? */
export function hasFeatBonus(entity: Pick<Entity, "id">): boolean {
  return featBonusKinds(entity).length > 0;
}

/**
 * Talente OHNE bekannte Wirkung — die ehrliche Zählung.
 *
 * Der Test hält fest, dass darunter kein einziges NICHT-episches Talent ist:
 * alles, was an einem Bogen der Stufen 1–20 vorkommt, hat eine Wirkung.
 */
export function featsWithoutBonus(entities: readonly Entity[]): string[] {
  const out: string[] = [];
  for (const entity of entities) {
    if (entity.kind !== "feat" || entity.deletedAt !== undefined) continue;
    if (!entity.id.startsWith("srd:feat:")) continue;
    if (!hasFeatBonus(entity)) out.push(entity.id);
  }
  return out.sort();
}

/** Für den Test: alle Schlüssel, die die Tabellen nennen. */
export function featBonusKeys(): string[] {
  return [...new Set([...Object.keys(BONUS), ...Object.keys(EPIC_ALIAS)])].sort();
}

/** Für den Test: die Alias-Ziele, die auf ein anderes TALENT zeigen. */
export function featBonusAliasTargets(): string[] {
  return [...new Set(Object.values(EPIC_ALIAS).filter((v) => !KIND_NAMES.has(v)))].sort();
}

/** Ein Talent trägt eine Wirkung — für den Filter im Blätterer. */
export function featMatchesKind(entity: FeatEntity, kind: FeatBonusKind): boolean {
  return featBonusKinds(entity).includes(kind);
}
