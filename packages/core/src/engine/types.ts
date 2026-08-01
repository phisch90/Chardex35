import type { EquipSlot } from "../schema/character.js";
import type { Ability, BonusType, Size } from "../schema/common.js";

/** Ein Beitrag zu einem Wert — bleibt IMMER erhalten (Breakdown-UI). */
export interface Contribution {
  /** Anzeige-Label der Quelle: „Ring der Ablenkung", „Talent: Dodge", „manuell". */
  source: string;
  bonusType: BonusType;
  value: number;
  /** false = von einem höheren gleichtypigen Bonus überdeckt („wirkt nicht"). */
  applied: boolean;
  /** Situativ („nur gegen Riesen") — zählt nicht in den Total, wird angezeigt. */
  condition?: string | undefined;
}

export interface StatValue {
  total: number;
  contributions: Contribution[];
}

export interface AbilityBlock {
  base: number;
  score: StatValue;
  mod: number;
}

/**
 * Das Label des Grundbeitrags in `AbilityBlock.score.contributions` — der getippte Wert
 * selbst. Steht hier und nicht zweimal als Literal, damit die Anzeige („woher kommt die
 * Änderung?") und die Engine dasselbe Wort meinen: wer alles AUSSER dem Grundwert zeigen
 * will, muss ihn erkennen können.
 */
export const ABILITY_BASE_SOURCE = "Basiswert";

export interface AcBlock {
  total: StatValue;
  /** Ohne Rüstung, Schild und natürliche Rüstung — mit Aufschlüsselung. */
  touch: StatValue;
  /** Ohne DEX-Bonus und Ausweichen-Bonus — mit Aufschlüsselung. */
  flatFooted: StatValue;
}

export interface AttackLine {
  key: string;
  label: string;
  /** Iterative Angriffe: [+9, +4]. */
  bonuses: number[];
  attack: StatValue;
  /** „1d8+4" — Würfel + summierter Bonus. */
  damageText: string;
  damageBonus: StatValue;
  critical: string;
  notes: string[];
  /**
   * Wo die Waffe steckt — und ob überhaupt eine gemeint ist (`undefined` bei den
   * beiden Sammelzeilen Nahkampf/Fernkampf).
   *
   * Eine Angriffszeile hängt NICHT daran, ob die Waffe in der Hand liegt: auch
   * eine Waffe im Rucksack ist eine, mit der man angreifen kann — man zieht sie
   * eben. Fight Club listet ebenfalls alle Angriffe. Der Platz entscheidet über
   * den SCHADEN (beidhändig: STR ×1,5 und Power Attack doppelt) und wird am Bogen
   * angezeigt, damit man sieht, was gerade wirklich in der Hand ist.
   */
  slot?: EquipSlot;
}

export interface SkillLine {
  /** ID der Fertigkeits-Entity — bei Teilgebieten die der Grundfertigkeit. */
  skillId: string;
  /** Schlüssel in `character.skillRanks`: `skillId` oder `skillId#teilgebiet`. */
  key: string;
  /** Gesetzt bei Teilgebiets-Zeilen („arcana"). */
  subtype?: string;
  /** true, wenn die Fertigkeit Teilgebiete kennt (auch auf der Grundzeile). */
  subtyped: boolean;
  /** „Knowledge (arcana)" bzw. „Knowledge" auf der Grundzeile. */
  name: string;
  /** false bei trainedOnly ohne Ränge („—"). */
  usable: boolean;
  total: StatValue;
  ranks: number;
  keyAbility: Ability | null;
  isClassSkill: boolean;
  maxRanks: number;
}

export interface SlotInfo {
  level: number;
  /** null = „—" (Grad nicht verfügbar); 0 = nur Bonus-Slots. */
  base: number | null;
  bonus: number;
  /**
   * Domänenplatz dieses Grads: 1 beim Kleriker ab Grad 1, sonst 0.
   *
   * Steckt in `total` mit drin — der Platz ist ein Platz, und die Zählung
   * „wie viele Zauber Grad 1 kann ich heute wirken" darf nicht zwei Zahlen
   * brauchen. Getrennt ausgewiesen wird er, damit der Bogen ihn auch als
   * solchen zeigen kann; er darf nur einen Domänenzauber tragen.
   */
  domain: number;
  total: number | null;
  used: number;
}

/** Eine gewählte Domäne, für die Anzeige aufgelöst. */
export interface DomainLine {
  spellListId: string;
  /** „War Domain" bzw. die Kennung, falls das Kompendium sie nicht kennt. */
  name: string;
}

export interface SpellcastingBlock {
  classId: string;
  className: string;
  model: "prepared" | "spontaneous";
  ability: Ability;
  abilityMod: number;
  casterLevel: StatValue;
  /** DC = dcBase + Zaubergrad. */
  dcBase: number;
  slots: SlotInfo[];
  spellsKnown: (number | null)[] | undefined;
  spellListId: string;
  /** Klasse führt ein Zauberbuch (Magier, Assassine) und ist darauf begrenzt. */
  usesSpellbook: boolean;
  /** Wie viele Domänen die Klasse wählt. 0 = keine (alle außer Kleriker). */
  domainPick: number;
  /** Die gewählten Domänen dieser Klasse — leer, solange nichts gewählt ist. */
  domains: DomainLine[];
}

export interface EncumbranceBlock {
  loadLb: number;
  lightMaxLb: number;
  mediumMaxLb: number;
  heavyMaxLb: number;
  level: "light" | "medium" | "heavy" | "overloaded";
}

export interface FeatureLine {
  key: string;
  classId: string;
  className: string;
  level: number;
  name: string;
  description: string | undefined;
  /** Hat Toggle-Effekte (Rage an/aus). */
  toggleable: boolean;
  active: boolean;
}

/**
 * Der Reiter des Bogens, auf dem man etwas gegen die Warnung tun kann.
 *
 * Die Namen sind DIE der Oberfläche (`pages/sheet/index.tsx`). Das ist bewusst:
 * eine Warnung, die ihren Ort nicht kennt, landet in einer Sammelkarte, und wer
 * sie liest, muss selbst raten, wo er hin soll. Vorher war genau eine Warnung
 * verortet — die Kampfoptionen —, und zwar per `filter` in der Anzeige.
 */
export type IssueTab =
  | "stats"
  | "combat"
  | "skills"
  | "spells"
  | "inventory"
  | "feats"
  | "notes";

export interface DerivedIssue {
  severity: "error" | "warning";
  code: string;
  /** Deutsch, direkt anzeigbar. */
  message: string;
  /** Entity-/Skill-ID etc. für Deep-Links. */
  ref?: string | undefined;
  /** Wo man es beheben kann. Fehlt bei Meldungen über die Daten selbst. */
  tab?: IssueTab | undefined;
  /**
   * Schlüssel für „passt so". Fehlt = nicht abstellbar.
   *
   * Er darf KEINE Menge enthalten. Sonst gilt ein „passt so" für „6 Punkte offen"
   * nicht mehr, sobald es 5 sind — und die Warnung kommt zurück, ohne dass sich
   * etwas geändert hätte, was ihn interessiert.
   */
  muteKey?: string | undefined;
  /**
   * Wie viel offen ist. Ein „passt so" merkt sich diese Zahl und gilt nur bis zu
   * ihr: wer einen Talent-Slot absichtlich aufspart, wird nicht erinnert — wer beim
   * nächsten Stufenaufstieg einen zweiten liegen lässt, schon.
   */
  open?: number | undefined;
  /** Von diesem Bogen abgestellt. Steht in der Liste, wird aber nicht gezeigt. */
  muted?: boolean | undefined;
  /**
   * Geht es um HEUTE statt um den Aufbau?
   *
   * Genau eine Warnung ist so: unbelegte Zauberplätze. Am Bogen gehört sie hin —
   * „habe ich heute morgen alles vorbereitet?" ist eine echte Frage am Tisch. In
   * der Rückfrage am Ende des Assistenten wäre sie Unsinn: einen Kleriker der
   * Stufe 7 anzulegen heißt nicht, vorher 23 Zauber vorzubereiten.
   */
  daily?: boolean | undefined;
}

export interface DerivedSheet {
  abilities: Record<Ability, AbilityBlock>;
  size: Size;
  sizeModifier: number;
  totalLevel: number;
  /** Effektive Charakterstufe inkl. Level Adjustment. */
  ecl: number;
  classLevels: { classId: string; className: string; level: number }[];
  hp: {
    max: number;
    /** Aus Stufen, KO und Effekten gerechnet — unabhängig von `overrideMax`. */
    computedMax: number;
    current: number;
    nonlethal: number;
    temp: number;
  };
  ac: AcBlock;
  init: StatValue;
  speedFt: StatValue;
  bab: number;
  saves: Record<"fort" | "ref" | "will", StatValue>;
  grapple: StatValue;
  attacks: AttackLine[];
  skills: SkillLine[];
  skillPoints: { available: number; spent: number };
  featSlots: { available: number; used: number };
  /** Talent-IDs wie am Charakter eingetragen — Mehrfachnennungen inklusive. */
  featIds: string[];
  /**
   * Zusätzliche Einsätze pro Tag aus Talenten, Schlüssel wie in den
   * Zähler-Vorschlägen („turn-undead" → 4 durch Extra Turning).
   */
  extraUses: Record<string, number>;
  spellcasting: SpellcastingBlock[];
  encumbrance: EncumbranceBlock;
  /**
   * Liegt in JEDER Hand eine Nahkampfwaffe? Nur dann ist der
   * Zweiwaffenkampf-Schalter im Kampf-Reiter sinnvoll.
   *
   * Eine Folge, nie gespeichert — und sie gehört in die Engine und nicht in die
   * Oberfläche: dort müsste die Regel („Fernkampf zählt nicht, ein Zweihänder
   * sperrt, `worn` ist keine Hand") nachgebaut werden, und `AttackLine` trägt
   * keine Handhabung, mit der man das erraten könnte.
   */
  twoWeaponPossible: boolean;
  xp: { current: number; nextLevelAt: number | null };
  features: FeatureLine[];
  issues: DerivedIssue[];
}
