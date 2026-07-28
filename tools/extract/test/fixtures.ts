/**
 * Prüfdaten: echte SRD-Einträge in Buchform, samt Soll-Ergebnis.
 *
 * Bewusst SRD und nicht Buchinhalt — der Text ist frei, und ich habe ein
 * belastbares Soll: dieselben Einträge liegen als geprüfte Entities in
 * packs/srd, ich kann also nachrechnen, ob der Konverter dasselbe herausholt.
 */
import type { Block } from "./makePdf.js";

export const FEAT_BLOCKS: Block[] = [
  { heading: "Power Attack [General]" },
  { label: "Prerequisite:", text: "Str 13." },
  {
    label: "Benefit:",
    text:
      "On your action, before making attack rolls for a round, you may choose to subtract a number from all melee attack rolls and add the same number to all melee damage rolls. This number may not exceed your base attack bonus. The penalty on attacks and bonus on damage apply until your next turn.",
  },
  {
    label: "Special:",
    text:
      "If you attack with a two-handed weapon, or with a one-handed weapon wielded in two hands, instead add twice the number subtracted from your attack rolls. A fighter may select Power Attack as one of his fighter bonus feats.",
  },

  { heading: "Cleave [General]" },
  { label: "Prerequisites:", text: "Str 13, Power Attack." },
  {
    label: "Benefit:",
    text:
      "If you deal a creature enough damage to make it drop, you get an immediate, extra melee attack against another creature within reach. You may use this ability once per round.",
  },

  { heading: "Improved Two-Weapon Fighting [General]" },
  { label: "Prerequisites:", text: "Dex 17, Two-Weapon Fighting, base attack bonus +6." },
  {
    label: "Benefit:",
    text:
      "In addition to the standard single extra attack you get with an off-hand weapon, you get a second attack with it, albeit at a -5 penalty.",
  },
  { label: "Normal:", text: "Without this feat, you can only get a single extra attack with an off-hand weapon." },

  { heading: "Stealthy [General]" },
  {
    label: "Benefit:",
    text: "You get a +2 bonus on all Hide checks and Move Silently checks.",
  },

  { heading: "Extra Turning [General]" },
  { label: "Prerequisite:", text: "Ability to turn or rebuke creatures." },
  {
    label: "Benefit:",
    text:
      "Each time you take this feat, you can use your ability to turn or rebuke creatures four more times per day than normal.",
  },
  {
    label: "Special:",
    text: "You can gain Extra Turning multiple times. Its effects stack.",
  },
];

/** Was aus FEAT_BLOCKS herauskommen MUSS. */
export const FEAT_EXPECTED = [
  {
    name: "Power Attack",
    featType: "General",
    prerequisites: [{ type: "minAbility", ability: "str", value: 13 }],
    benefitStartsWith: "On your action, before making attack rolls",
    hasSpecial: true,
  },
  {
    name: "Cleave",
    featType: "General",
    prerequisites: [
      { type: "minAbility", ability: "str", value: 13 },
      { type: "hasFeat", featId: "srd:feat:power-attack" },
    ],
    benefitStartsWith: "If you deal a creature enough damage",
    hasSpecial: false,
  },
  {
    name: "Improved Two-Weapon Fighting",
    featType: "General",
    prerequisites: [
      { type: "minAbility", ability: "dex", value: 17 },
      { type: "hasFeat", featId: "srd:feat:two-weapon-fighting" },
      { type: "minBab", value: 6 },
    ],
    benefitStartsWith: "In addition to the standard single extra attack",
    hasSpecial: false,
  },
  {
    name: "Stealthy",
    featType: "General",
    prerequisites: [],
    benefitStartsWith: "You get a +2 bonus on all Hide checks",
    hasSpecial: false,
  },
  {
    name: "Extra Turning",
    featType: "General",
    // „Ability to turn or rebuke creatures" ist keine maschinelle Bedingung —
    // muss als custom durchkommen und nicht verschwinden.
    prerequisites: [{ type: "custom", text: "Ability to turn or rebuke creatures" }],
    benefitStartsWith: "Each time you take this feat",
    hasSpecial: true,
  },
] as const;

export const SPELL_BLOCKS: Block[] = [
  { heading: "Fireball" },
  { label: "", text: "Evocation [Fire]" },
  { label: "Level:", text: "Sor/Wiz 3" },
  { label: "Components:", text: "V, S, M" },
  { label: "Casting Time:", text: "1 standard action" },
  { label: "Range:", text: "Long (400 ft. + 40 ft./level)" },
  { label: "Area:", text: "20-ft.-radius spread" },
  { label: "Duration:", text: "Instantaneous" },
  { label: "Saving Throw:", text: "Reflex half" },
  { label: "Spell Resistance:", text: "Yes" },
  {
    text:
      "A fireball spell is an explosion of flame that detonates with a low roar and deals 1d6 points of fire damage per caster level (maximum 10d6) to every creature within the area.",
  },

  { heading: "Cure Light Wounds" },
  { label: "", text: "Conjuration (Healing)" },
  { label: "Level:", text: "Brd 1, Clr 1, Drd 1, Pal 1, Rgr 2" },
  { label: "Components:", text: "V, S" },
  { label: "Casting Time:", text: "1 standard action" },
  { label: "Range:", text: "Touch" },
  { label: "Target:", text: "Creature touched" },
  { label: "Duration:", text: "Instantaneous" },
  { label: "Saving Throw:", text: "Will half (harmless)" },
  { label: "Spell Resistance:", text: "Yes (harmless)" },
  {
    text:
      "When laying your hand upon a living creature, you channel positive energy that cures 1d8 points of damage +1 point per caster level (maximum +5).",
  },

  { heading: "Mage Armor" },
  { label: "", text: "Conjuration (Creation) [Force]" },
  { label: "Level:", text: "Sor/Wiz 1" },
  { label: "Components:", text: "V, S, F" },
  { label: "Casting Time:", text: "1 standard action" },
  { label: "Range:", text: "Touch" },
  { label: "Target:", text: "Creature touched" },
  { label: "Duration:", text: "1 hour/level (D)" },
  { label: "Saving Throw:", text: "Will negates (harmless)" },
  { label: "Spell Resistance:", text: "No" },
  {
    text:
      "An invisible but tangible field of force surrounds the subject of a mage armor spell, providing a +4 armor bonus to AC.",
  },
];

export const SPELL_EXPECTED = [
  {
    name: "Fireball",
    school: "Evocation",
    descriptors: ["Fire"],
    levels: { "sor/wiz": 3 },
    range: "Long (400 ft. + 40 ft./level)",
    area: "20-ft.-radius spread",
    savingThrow: "Reflex half",
    spellResistance: "Yes",
  },
  {
    name: "Cure Light Wounds",
    school: "Conjuration",
    subschool: "Healing",
    descriptors: [],
    levels: { brd: 1, clr: 1, drd: 1, pal: 1, rgr: 2 },
    range: "Touch",
    target: "Creature touched",
    savingThrow: "Will half (harmless)",
    spellResistance: "Yes (harmless)",
  },
  {
    name: "Mage Armor",
    school: "Conjuration",
    subschool: "Creation",
    descriptors: ["Force"],
    levels: { "sor/wiz": 1 },
    range: "Touch",
    duration: "1 hour/level (D)",
    savingThrow: "Will negates (harmless)",
    spellResistance: "No",
  },
] as const;

/**
 * Der Assassine als Buchseite: erst der Text, dann die Stufentabelle über die
 * ganze Seitenbreite. Die Spalte „Special" ist absichtlich so schmal, dass
 * mindestens eine Zeile umbricht — im Buch ist das der Normalfall, und eine
 * Tabelle, in der jede Zelle einzeilig ist, prüft die Fortsetzungszeilen nicht.
 */
export const CLASS_BLOCKS: Block[] = [
  { heading: "Assassin" },
  { label: "Hit Die:", text: "d6." },
  { text: "Requirements" },
  {
    text: "To qualify to become an assassin, a character must fulfill all the following criteria.",
  },
  { label: "Alignment:", text: "Any evil." },
  { label: "Skills:", text: "Disguise 4 ranks, Hide 8 ranks, Move Silently 8 ranks." },
  {
    label: "Special:",
    text: "The character must kill someone for no other reason than to join the assassins.",
  },
  { text: "Class Skills" },
  {
    text:
      "The assassin's class skills (and the key ability for each skill) are Balance (Dex), " +
      "Bluff (Cha), Climb (Str), Craft (Int), Decipher Script (Int), Diplomacy (Cha), " +
      "Disable Device (Int), Disguise (Cha), Escape Artist (Dex), Forgery (Int), " +
      "Gather Information (Cha), Hide (Dex), Intimidate (Cha), Jump (Str), Listen (Wis), " +
      "Move Silently (Dex), Open Lock (Dex), Search (Int), Sense Motive (Wis), " +
      "Sleight of Hand (Dex), Spot (Wis), Swim (Str), Tumble (Dex), Use Magic Device (Cha), " +
      "and Use Rope (Dex).",
  },
  { label: "Skill Points at Each Level:", text: "4 + Int modifier." },
  {
    table: {
      columns: [0, 40, 78, 110, 142, 176, 340, 368, 396, 424],
      header: [
        ["", "Base", "", "", "", "", "Spells per Day"],
        ["Class", "Attack", "Fort", "Ref", "Will"],
        ["Level", "Bonus", "Save", "Save", "Save", "Special", "1st", "2nd", "3rd", "4th"],
      ],
      rows: [
        ["1st", "+0", "+0", "+2", "+0", "Sneak attack +1d6, death attack, poison use, spells", "0", "—", "—", "—"],
        ["2nd", "+1", "+0", "+3", "+0", "+1 save against poison, uncanny dodge", "1", "—", "—", "—"],
        ["3rd", "+2", "+1", "+3", "+1", "Sneak attack +2d6", "2", "0", "—", "—"],
        ["4th", "+3", "+1", "+4", "+1", "+2 save against poison", "3", "1", "—", "—"],
        ["5th", "+3", "+1", "+4", "+1", "Improved uncanny dodge, sneak attack +3d6", "3", "2", "0", "—"],
        ["6th", "+4", "+2", "+5", "+2", "+3 save against poison", "3", "3", "1", "—"],
        ["7th", "+5", "+2", "+5", "+2", "Sneak attack +4d6", "3", "3", "2", "0"],
        ["8th", "+6", "+2", "+6", "+2", "+4 save against poison, hide in plain sight", "3", "3", "3", "1"],
        ["9th", "+6", "+3", "+6", "+3", "Sneak attack +5d6", "3", "3", "3", "2"],
        ["10th", "+7", "+3", "+7", "+3", "+5 save against poison", "3", "3", "3", "3"],
      ],
    },
  },
  { text: "Class Features" },
  { text: "All of the following are Class Features of the assassin prestige class." },
  {
    label: "Weapon and Armor Proficiency:",
    text:
      "Assassins are proficient with the crossbow (hand, light, or heavy), dagger (any type), " +
      "dart, rapier, sap, shortbow (normal and composite), and short sword. Assassins are " +
      "proficient with light armor but not with shields.",
  },
  {
    label: "Spells:",
    text:
      "An assassin casts arcane spells drawn from the assassin spell list. She can cast any " +
      "spell she has prepared. To learn or cast a spell, an assassin must have an Intelligence " +
      "score of at least 10 + the spell's level.",
  },
  {
    label: "Sneak Attack:",
    text:
      "This is exactly like the rogue ability of the same name. The extra damage dealt " +
      "increases by +1d6 every other level.",
  },
];
