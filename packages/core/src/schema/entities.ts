import { z } from "zod";
import {
  abilitySchema,
  bonusTypeSchema,
  localizedSchema,
  sizeSchema,
  statPathSchema,
} from "./common.js";

/**
 * Effect — das eine mechanische Vokabular. Feats, Rassen-Traits, Klassenfeatures,
 * Items, Conditions und manuelle Modifikatoren emittieren alle dieselbe Form.
 * Phase 1–2: `value` ist eine Zahl. String-Formeln kommen in Phase 3 (geschlossener
 * AST, beim Speichern geparst); die Engine ignoriert Strings bis dahin mit Warnung.
 */
export const effectSchema = z.object({
  target: statPathSchema,
  bonusType: bonusTypeSchema.default("untyped"),
  value: z.union([z.number(), z.string()]),
  /** Freitext („nur gegen Riesen") — wird angezeigt, nie ausgewertet. */
  condition: z.string().optional(),
  activation: z.enum(["passive", "equipped", "toggle"]).default("passive"),
  /**
   * `chosenItem`: gilt nur für den Gegenstand, den die Talent-Auswahl nennt
   * („Weapon Focus (Kurzschwert)" → +1 nur mit dem Kurzschwert). Der Charakter
   * verweist dafür in `feats[].choiceRef` auf die Gegenstands-ID; ohne Verweis
   * zählt der Auswahltext gegen den Waffennamen.
   *
   * Ohne Angabe gilt der Effekt immer — deshalb optional und nicht mit Default:
   * so bleiben die vielen bestehenden Effekt-Literale unverändert.
   */
  scope: z.literal("chosenItem").optional(),
});
export type Effect = z.infer<typeof effectSchema>;

export const prerequisiteSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("minAbility"), ability: abilitySchema, value: z.number().int() }),
  z.object({ type: z.literal("minBab"), value: z.number().int() }),
  z.object({ type: z.literal("hasFeat"), featId: z.string() }),
  z.object({ type: z.literal("minSkillRanks"), skillId: z.string(), ranks: z.number() }),
  z.object({ type: z.literal("minCasterLevel"), value: z.number().int() }),
  z.object({ type: z.literal("classLevel"), classId: z.string(), level: z.number().int() }),
  /** Nur Anzeige + pauschale Warnung — nie maschinell geprüft. */
  z.object({ type: z.literal("custom"), text: z.string() }),
]);
export type Prerequisite = z.infer<typeof prerequisiteSchema>;

export const ENTITY_KINDS = [
  "race",
  "class",
  "feat",
  "skill",
  "spell",
  "item",
  "monster",
  "condition",
  "spelllist",
  /*
    Gottheiten sind HOMEBREW-ONLY: die Namen der D&D-Goetter (Pelor, Heironeous,
    St. Cuthbert ...) sind Product Identity von Wizards und stehen NICHT im freien
    SRD — die App liefert deshalb keine einzige mit, nur das Fach. Sein Tisch traegt
    seine eigenen ein (private Nutzung seiner Buecher, liegt nur in seiner Datenbank
    und seinen Sicherungen, nie im Repo).
  */
  "deity",
] as const;
export const entityKindSchema = z.enum(ENTITY_KINDS);
export type EntityKind = z.infer<typeof entityKindSchema>;

/** Gemeinsamer Envelope aller Kompendium-Einträge. */
const entityBase = z.object({
  /** SRD: stabiler Slug (`srd:class:wizard`), Homebrew: UUID. */
  id: z.string(),
  name: z.string(),
  source: z.enum(["srd", "homebrew"]),
  /** Provenienz: geklont von diesem Eintrag („Klon von Power Attack"). */
  basedOn: z.string().optional(),
  /** Stand (rev) des Originals zum Klon-Zeitpunkt — für „Vorlage hat sich geändert". */
  basedOnRev: z.number().int().optional(),
  /** SHADOWING: verdeckt den Ziel-Eintrag überall; Löschen revertiert sauber. */
  overrides: z.string().optional(),
  localized: localizedSchema.optional(),
  /** Organisation/Filter für importierte Pakete, z.B. "complete-arcane-privat". */
  sourcePack: z.string().optional(),
  schemaVersion: z.number().int().default(1),
  rev: z.number().int().default(1),
  updatedAt: z.string().default(""),
  /** Tombstone — gelöschte Homebrew-Einträge bleiben als Leiche (Sync-Seam). */
  deletedAt: z.string().optional(),
  tags: z.array(z.string()).default([]),
  /** Markdown. SRD: englischer Regeltext. */
  description: z.string().optional(),
  effects: z.array(effectSchema).default([]),
  /** Extension-Bag: unbekannte Felder neuerer Schema-Versionen überleben hier. */
  x: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Kind-spezifische Datenblöcke
// ---------------------------------------------------------------------------

export const classLevelRowSchema = z.object({
  /** Absolute Werte aus der Klassentabelle — nie Formeln. */
  bab: z.number().int(),
  fort: z.number().int(),
  ref: z.number().int(),
  will: z.number().int(),
  features: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        effects: z.array(effectSchema).default([]),
      }),
    )
    .default([]),
  /** Index = Zaubergrad; null = „—", 0 = nur Bonus-Slots. */
  spellsPerDay: z.array(z.number().int().nullable()).optional(),
  spellsKnown: z.array(z.number().int().nullable()).optional(),
  /** Vom Generator gesetzt (good/average/poor) — Basis für fractional-Hausregel. */
  template: z
    .object({
      bab: z.enum(["good", "average", "poor"]).optional(),
      fort: z.enum(["good", "poor"]).optional(),
      ref: z.enum(["good", "poor"]).optional(),
      will: z.enum(["good", "poor"]).optional(),
    })
    .optional(),
});
export type ClassLevelRow = z.infer<typeof classLevelRowSchema>;

export const classDataSchema = z.object({
  hitDie: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12)]),
  skillPointsPerLevel: z.number().int(),
  classSkillIds: z.array(z.string()).default([]),
  /** 20 Basis, 10 Prestige, beliebig für Homebrew. */
  maxLevel: z.number().int().default(20),
  /** Prestige-Einstiegsvoraussetzungen — warn-only, wie alles. */
  requirements: z.array(prerequisiteSchema).default([]),
  /** Index 0 = Stufe 1. */
  levels: z.array(classLevelRowSchema).min(1),
  spellcasting: z
    .object({
      model: z.enum(["prepared", "spontaneous"]),
      ability: z.enum(["int", "wis", "cha"]),
      spellListId: z.string(),
      bonusSlots: z.boolean().default(true),
      armorFailure: z.boolean().default(false),
      /**
       * Nur Magier und Assassine führen ein Zauberbuch und können ausschließlich
       * daraus vorbereiten. Kleriker, Druiden, Paladine und Waldläufer kennen
       * ihre gesamte Klassenliste.
       */
      spellbook: z.boolean().default(false),
      /**
       * Domänen — beim Kleriker zwei, sonst gar keine.
       *
       * Ein MERKMAL DER KLASSE, keine Zahl in jeder Zeile der Stufentabelle.
       * Der Domänenplatz gilt auf jedem Zaubergrad ab 1, immer genau einer; als
       * „+1" in 20 Tabellenzeilen geschrieben stünde dieselbe Aussage
       * zwanzigmal da und wäre zwanzigmal einzeln falsch zu machen. Die
       * Stufentabelle im SRD schreibt „3+1" aus demselben Grund nur als
       * Fußnote.
       *
       * `pick` = wie viele Domänen gewählt werden, `bonusSlot` = ob je Grad ein
       * Platz dazukommt. Beides getrennt, weil es Klassen gibt, die Domänen
       * bekommen, ohne dafür einen Platz zu erhalten.
       */
      domains: z
        .object({
          pick: z.number().int().default(2),
          bonusSlot: z.boolean().default(true),
        })
        .optional(),
    })
    .optional(),
  /** Freitext: Waffen-/Rüstungsvertrautheit. */
  proficiencies: z.string().optional(),
});
export type ClassData = z.infer<typeof classDataSchema>;

export const raceDataSchema = z.object({
  size: sizeSchema,
  speedFt: z.number().int(),
  abilityMods: z.partialRecord(abilitySchema, z.number().int()).default({}),
  favoredClassId: z.string().default("any"),
  traits: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        effects: z.array(effectSchema).default([]),
      }),
    )
    .default([]),
  /** Level Adjustment (LA) — fließt in ECL-Anzeige, warn-only. */
  la: z.number().int().default(0),
  bonusLanguages: z.string().optional(),
});
export type RaceData = z.infer<typeof raceDataSchema>;

export const featDataSchema = z.object({
  prerequisites: z.array(prerequisiteSchema).default([]),
  /** z.B. "General", "Item Creation", "Metamagic", "Fighter". */
  featType: z.string().default("General"),
  /** Mehrfach wählbar (Toughness, Skill Focus …). */
  stackable: z.boolean().default(false),
  /** Verlangt eine Auswahl („Weapon Focus (Langschwert)"). */
  requiresChoice: z.boolean().default(false),
  benefit: z.string().optional(),
  normalText: z.string().optional(),
  specialText: z.string().optional(),
  /**
   * „Vier zusätzliche Versuche pro Tag" — welche Tages-Mechanik das Talent
   * aufwertet und um wie viel. Als DATEN, nicht als Sonderfall im Code: damit
   * zählt ein Homebrew-Talent genauso mit wie Extra Turning.
   *
   * `mechanic` ist der Schlüssel des Zähler-Vorschlags (engine/trackers.ts),
   * z.B. „turn-undead" oder „bardic-music". `perInstance` gilt je Eintrag des
   * Talents am Charakter — Extra Turning ist mehrfach nehmbar und stapelt.
   */
  extraUses: z
    .array(
      z.object({
        mechanic: z.string(),
        perInstance: z.number().int(),
      }),
    )
    .default([]),
});
export type FeatData = z.infer<typeof featDataSchema>;

export const skillDataSchema = z.object({
  keyAbility: abilitySchema.nullable(),
  trainedOnly: z.boolean().default(false),
  acpApplies: z.boolean().default(false),
  /** Schwimmen: doppelter Rüstungsmalus. */
  acpDouble: z.boolean().default(false),
  /**
   * Fertigkeiten mit Teilgebieten (Knowledge, Craft, Perform, Profession):
   * jedes Teilgebiet ist regeltechnisch eine eigene Fertigkeit mit eigenen
   * Rängen. Der Charakter führt sie in `skillSubtypes`, die Ränge liegen unter
   * dem zusammengesetzten Schlüssel `skillId#teilgebiet`.
   */
  subtyped: z.boolean().default(false),
  /** Vorschläge fürs Anlegen — bei Craft/Profession offen, nicht abschließend. */
  subtypeSuggestions: z.array(z.string()).default([]),
  /** Synergie ist Daten — Homebrew-Skills nehmen automatisch teil. */
  synergies: z
    .array(
      z.object({
        toSkillId: z.string(),
        bonus: z.number().int().default(2),
        condition: z.string().optional(),
        /** Nur dieses Teilgebiet gibt die Synergie (z.B. Knowledge (arcana)). */
        fromSubtype: z.string().optional(),
        /** Nur dieses Teilgebiet des Ziels bekommt sie. */
        toSubtype: z.string().optional(),
      }),
    )
    .default([]),
});
export type SkillData = z.infer<typeof skillDataSchema>;

export const spellDataSchema = z.object({
  school: z.string().default(""),
  subschool: z.string().optional(),
  descriptors: z.array(z.string()).default([]),
  /** Grad je Liste, Key = Listen-Slug („sorcerer-wizard", „druid", Domänenname …). */
  levels: z.record(z.string(), z.number().int()).default({}),
  components: z.string().optional(),
  castingTime: z.string().optional(),
  range: z.string().optional(),
  target: z.string().optional(),
  area: z.string().optional(),
  effect: z.string().optional(),
  duration: z.string().optional(),
  savingThrow: z.string().optional(),
  spellResistance: z.string().optional(),
  materialText: z.string().optional(),
  focusText: z.string().optional(),
  xpCost: z.string().optional(),
  /** Kurzzeile fürs Kompendium/Zauberkarten (SRD "short description"). */
  summary: z.string().optional(),
});
export type SpellData = z.infer<typeof spellDataSchema>;

export const weaponDataSchema = z.object({
  /** Schaden für mittelgroße Wielder, z.B. "1d8". */
  damage: z.string(),
  critRange: z.string().default("20"),
  critMult: z.string().default("x2"),
  /** B/P/S — Freitext ("slashing", "piercing and slashing"). */
  damageType: z.string().optional(),
  category: z.enum(["simple", "martial", "exotic", "natural"]).default("simple"),
  handedness: z.enum(["light", "one", "two", "ranged"]).default("one"),
  rangeIncrementFt: z.number().int().optional(),
  reachFt: z.number().int().optional(),
  /**
   * Wie der Stärkemodifikator auf den SCHADEN wirkt. Nur bei Fernkampfwaffen
   * gesetzt — im Nahkampf gilt immer der ganze Bonus (bei zweihändiger Führung
   * das Anderthalbfache).
   *
   * Drei Fälle, alle drei wörtlich in den SRD-Texten unserer eigenen Packs:
   *
   *  - `full` — Wurfwaffen und die SCHLEUDER. Bei `srd:item:sling` steht es
   *    ausdrücklich: „Your Strength modifier applies to damage rolls when you use
   *    a sling, just as it does for thrown weapons."
   *  - `penaltyOnly` — Bögen. Bei `srd:item:longbow`: „If you have a penalty for
   *    low Strength, apply it to damage rolls when you use a longbow. If you have
   *    a bonus for high Strength, you can apply it … but not a regular longbow."
   *    Ein MALUS zählt also, ein Bonus nicht.
   *  - `none` — Armbrüste. Die Sehne spannt das Gerät, nicht der Arm.
   *
   * Ohne Angabe: Fernkampf `none`, Nahkampf voller Bonus. Das war vorher die
   * einzige Regel — und damit machte ein Wurfspeer bei STR 18 denselben Schaden
   * wie bei STR 8.
   */
  strDamage: z.enum(["none", "penaltyOnly", "full"]).optional(),
});

export const armorDataSchema = z.object({
  kind: z.enum(["light", "medium", "heavy", "shield"]),
  acBonus: z.number().int(),
  /** null = unbegrenzt. */
  maxDex: z.number().int().nullable().default(null),
  /** Nicht-positiv, z.B. -2. */
  acp: z.number().int().default(0),
  /** Arcane Spell Failure in Prozent. */
  asf: z.number().int().default(0),
});

export const itemDataSchema = z.object({
  costGp: z.number().optional(),
  weightLb: z.number().optional(),
  category: z
    .enum(["weapon", "armor", "shield", "gear", "tool", "magic", "wondrous", "potion", "scroll", "wand", "ring", "rod", "staff", "other"])
    .default("other"),
  weapon: weaponDataSchema.optional(),
  armor: armorDataSchema.optional(),
  /** Aura/CL etc. für magische Items — Freitext v1. */
  magicText: z.string().optional(),
});
export type ItemData = z.infer<typeof itemDataSchema>;

/** Phase 4 — bewusst locker (Strings), bis der Tracker kommt. */
export const monsterDataSchema = z.object({
  sizeType: z.string().optional(),
  hitDice: z.string().optional(),
  initiative: z.string().optional(),
  speed: z.string().optional(),
  armorClass: z.string().optional(),
  baseAttackGrapple: z.string().optional(),
  attack: z.string().optional(),
  fullAttack: z.string().optional(),
  spaceReach: z.string().optional(),
  specialAttacks: z.string().optional(),
  specialQualities: z.string().optional(),
  saves: z.string().optional(),
  abilities: z.string().optional(),
  skills: z.string().optional(),
  feats: z.string().optional(),
  environment: z.string().optional(),
  organization: z.string().optional(),
  challengeRating: z.string().optional(),
  treasure: z.string().optional(),
  alignment: z.string().optional(),
  advancement: z.string().optional(),
  levelAdjustment: z.string().optional(),
});
export type MonsterData = z.infer<typeof monsterDataSchema>;

export const conditionDataSchema = z.object({
  /** Kurzfassung für Chips im Bogen/Tracker. */
  summary: z.string().optional(),
});

export const spellListDataSchema = z.object({
  /** spellId → Grad in dieser Liste. */
  spells: z.record(z.string(), z.number().int()).default({}),
});
export type SpellListData = z.infer<typeof spellListDataSchema>;

// ---------------------------------------------------------------------------
// Discriminated Union
// ---------------------------------------------------------------------------

export const raceEntitySchema = entityBase.extend({ kind: z.literal("race"), data: raceDataSchema });
export const classEntitySchema = entityBase.extend({ kind: z.literal("class"), data: classDataSchema });
export const featEntitySchema = entityBase.extend({ kind: z.literal("feat"), data: featDataSchema });
export const skillEntitySchema = entityBase.extend({ kind: z.literal("skill"), data: skillDataSchema });
export const spellEntitySchema = entityBase.extend({ kind: z.literal("spell"), data: spellDataSchema });
export const itemEntitySchema = entityBase.extend({ kind: z.literal("item"), data: itemDataSchema });
export const monsterEntitySchema = entityBase.extend({ kind: z.literal("monster"), data: monsterDataSchema });
export const conditionEntitySchema = entityBase.extend({ kind: z.literal("condition"), data: conditionDataSchema });
export const spellListEntitySchema = entityBase.extend({ kind: z.literal("spelllist"), data: spellListDataSchema });

/**
 * Eine Gottheit — das, was ein Kleriker fuer seine Domaenenwahl braucht.
 *
 * `domainIds` zeigen auf die Domaenen-Zauberlisten (`srd:spelllist:domain-*`),
 * nicht auf Namen: die 32 Domaenen sind SRD und stabil verweisbar. Die
 * Lieblingswaffe ist ein GEGENSTANDS-Verweis plus Anzeigename (dasselbe Paar wie
 * `choice`/`choiceRef` am Talent) — die War-Domaene gewaehrt Weapon Focus mit
 * genau dieser Waffe, und dafuer muss die Kennung stimmen, nicht der Text.
 */
export const deityDataSchema = z.object({
  domainIds: z.array(z.string()).default([]),
  favoredWeaponId: z.string().optional(),
  favoredWeaponName: z.string().optional(),
  alignment: z.string().optional(),
});

export const deityEntitySchema = entityBase.extend({ kind: z.literal("deity"), data: deityDataSchema });

export const entitySchema = z.discriminatedUnion("kind", [
  raceEntitySchema,
  classEntitySchema,
  featEntitySchema,
  skillEntitySchema,
  spellEntitySchema,
  itemEntitySchema,
  monsterEntitySchema,
  conditionEntitySchema,
  spellListEntitySchema,
  deityEntitySchema,
]);

export type Entity = z.infer<typeof entitySchema>;

/**
 * Was man dem Schema HINEINGIBT — mit allen Feldern, die einen Default haben,
 * als optional. Wichtig für alles, was Entities baut (Konverter, ETL): dort ist
 * `Entity` der falsche Typ. `Entity` ist das Ergebnis NACH dem Parsen und
 * verlangt deshalb Felder, die das Schema selbst einsetzt. Wer gegen `Entity`
 * baut, muss diese Defaults von Hand wiederholen — und genau dabei laufen sie
 * auseinander.
 */
export type EntityInput = z.input<typeof entitySchema>;
export type RaceEntity = z.infer<typeof raceEntitySchema>;
export type ClassEntity = z.infer<typeof classEntitySchema>;
export type FeatEntity = z.infer<typeof featEntitySchema>;
export type SkillEntity = z.infer<typeof skillEntitySchema>;
export type SpellEntity = z.infer<typeof spellEntitySchema>;
export type ItemEntity = z.infer<typeof itemEntitySchema>;
export type MonsterEntity = z.infer<typeof monsterEntitySchema>;
export type ConditionEntity = z.infer<typeof conditionEntitySchema>;
export type DeityEntity = z.infer<typeof deityEntitySchema>;
export type SpellListEntity = z.infer<typeof spellListEntitySchema>;

/** Anzeigename mit deutschem Overlay, falls vorhanden. */
export function displayName(entity: Pick<Entity, "name" | "localized">): string {
  return entity.localized?.de?.name ?? entity.name;
}

export type ClassCategory = "base" | "npc" | "prestige";

/**
 * Basis-, NPC- oder Prestigeklasse.
 *
 * Die Unterscheidung steckt in den Tags der Packs, und dort tragen die
 * NPC-Klassen BEIDES: `base` und `npc`. Das ist inhaltlich richtig — Adept,
 * Aristocrat, Commoner, Expert und Warrior sind wie Basisklassen gebaut, 20
 * Stufen, keine Einstiegsvoraussetzungen. Für die Anzeige zählt aber `npc`,
 * sonst steht der Commoner zwischen Kleriker und Druide und man wählt ihn im
 * Vorbeiscrollen aus.
 *
 * Homebrew ohne Tags gilt als Basisklasse: wer eine eigene Klasse baut, meint
 * fast immer eine spielbare.
 */
export function classCategory(entity: Pick<Entity, "tags">): ClassCategory {
  if (entity.tags.includes("npc")) return "npc";
  if (entity.tags.includes("prestige")) return "prestige";
  return "base";
}

/** Epische Prestigeklasse — Einstieg erst jenseits Stufe 20. */
export function isEpicClass(entity: Pick<Entity, "tags">): boolean {
  return entity.tags.includes("epic");
}

/**
 * Schlüssel für `skillRanks`. Teilgebiete hängen mit `#` an der Fertigkeits-ID,
 * damit „Knowledge (arcana)" und „Knowledge (religion)" getrennte Ränge haben.
 */
export function skillKey(skillId: string, subtype?: string | undefined): string {
  return subtype === undefined || subtype === "" ? skillId : `${skillId}#${subtype}`;
}

/** Gegenstück zu `skillKey`. IDs enthalten selbst kein `#`. */
export function parseSkillKey(key: string): { skillId: string; subtype?: string } {
  const hash = key.indexOf("#");
  if (hash < 0) return { skillId: key };
  return { skillId: key.slice(0, hash), subtype: key.slice(hash + 1) };
}

/** „Knowledge (arcana)" — Anzeigename inklusive Teilgebiet. */
export function skillDisplayName(
  entity: Pick<Entity, "name" | "localized">,
  subtype?: string | undefined,
): string {
  const base = displayName(entity);
  return subtype === undefined || subtype === "" ? base : `${base} (${subtype})`;
}

/**
 * Baut die aufgelöste Kompendium-Map: Tombstones raus, Homebrew-`overrides`
 * verdecken ihr Ziel unter der ZIEL-ID. Charaktere, die `srd:feat:power-attack`
 * referenzieren, bekommen so still die Hausregel-Version.
 */
export function resolveCompendium(entities: readonly Entity[]): Map<string, Entity> {
  const map = new Map<string, Entity>();
  for (const e of entities) {
    if (e.deletedAt) continue;
    if (!map.has(e.id)) map.set(e.id, e);
  }
  for (const e of entities) {
    if (e.deletedAt || !e.overrides) continue;
    map.set(e.overrides, e);
  }
  return map;
}
