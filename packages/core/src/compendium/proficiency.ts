import type { Entity, ItemEntity } from "../schema/entities.js";

/**
 * Was der Charakter FÜHREN darf — und was zu ihm passt.
 *
 * Aus seiner Sprachnachricht zur Ausrüstung: die Auswahl zeigt 78 Waffen, 18
 * Rüstungen und 186 Ausrüstungsstücke, und nichts davon sagt, ob sein Kleriker
 * damit überhaupt umgehen kann. Wer ohne Übung angreift, hat −4 — das steht im
 * Regelwerk, aber nirgends in der Liste.
 *
 * Warum eine HANDTABELLE und keine Auswertung des Packs: die Vertrautheit steht
 * dort als PROSA. Wörtlich beim Barden: „A bard is proficient with all simple
 * weapons, plus the longsword, rapier, sap, short sword, shortbow, and whip."
 * Die Kategorie („alle einfachen") ist rechenbar, weil sie am Gegenstand steht
 * (`weapon.category`) — die namentlichen Zusätze sind es nicht. Ein Parser
 * darüber wäre dieselbe Falle wie bei den Klassenmerkmalen: er trifft
 * neunzig Prozent und schweigt beim Rest.
 *
 * WARNEN STATT SPERREN, wie überall hier: wählbar bleibt alles. Die App sagt nur
 * dazu, was es kostet. Der DM hat Recht, nicht die App.
 */

// ===========================================================================
//  Was eine Klasse (und ein Volk) hergibt
// ===========================================================================

export interface WeaponProficiency {
  /** Alle einfachen Waffen. */
  simple: boolean;
  /** Alle Kriegswaffen. */
  martial: boolean;
  /** Zusätzlich namentlich — über die Kategorie hinaus. */
  extraIds: readonly string[];
}

export interface ArmorProficiency {
  light: boolean;
  medium: boolean;
  heavy: boolean;
  shields: boolean;
  /** Turmschild ist eigens genannt: fast keine Klasse darf ihn. */
  towerShield: boolean;
  /**
   * Nur DIESE Rüstungen, auch wenn die Stärke stimmt — der Druide trägt kein
   * Metall. Leer heißt: keine Einschränkung über die Stärke hinaus.
   */
  onlyArmorIds: readonly string[];
  /** Dasselbe für Schilde: der Druide nur hölzerne. */
  onlyShieldIds: readonly string[];
}

export interface Proficiency {
  weapons: WeaponProficiency;
  armor: ArmorProficiency;
  /** Woher es kommt — „Cleric", „Dwarf". Für den Satz an der Zeile. */
  sources: readonly string[];
}

const NO_WEAPONS: WeaponProficiency = { simple: false, martial: false, extraIds: [] };
const NO_ARMOR: ArmorProficiency = {
  light: false,
  medium: false,
  heavy: false,
  shields: false,
  towerShield: false,
  onlyArmorIds: [],
  onlyShieldIds: [],
};

/** Der leere Stand — für Klassen, die die App nicht kennt (Homebrew, Prestige). */
export const EMPTY_PROFICIENCY: Proficiency = {
  weapons: NO_WEAPONS,
  armor: NO_ARMOR,
  sources: [],
};

/*
  Die 11 Spielerklassen, abgeschrieben aus dem Prosatext im Pack. Jede Zeile ist
  nachprüfbar: der Text steht in `class.data.proficiencies`, und der Test hält
  fest, dass jede genannte Kennung im Gegenstands-Pack existiert.
*/
const CLASS_PROFICIENCY: Record<string, Proficiency> = {
  "srd:class:barbarian": {
    weapons: { simple: true, martial: true, extraIds: [] },
    armor: { ...NO_ARMOR, light: true, medium: true, shields: true },
    sources: ["Barbarian"],
  },
  "srd:class:bard": {
    weapons: {
      simple: true,
      martial: false,
      extraIds: ["longsword", "rapier", "sap", "sword-short", "shortbow", "whip"],
    },
    armor: { ...NO_ARMOR, light: true, shields: true },
    sources: ["Bard"],
  },
  "srd:class:cleric": {
    weapons: { simple: true, martial: false, extraIds: [] },
    armor: { ...NO_ARMOR, light: true, medium: true, heavy: true, shields: true },
    sources: ["Cleric"],
  },
  "srd:class:druid": {
    weapons: {
      simple: false,
      martial: false,
      extraIds: [
        "club",
        "dagger",
        "dart",
        "quarterstaff",
        "scimitar",
        "sickle",
        "shortspear",
        "sling",
        "spear",
      ],
    },
    armor: {
      ...NO_ARMOR,
      light: true,
      medium: true,
      shields: true,
      // Kein Metall — nur gepolstert, Leder, Fell. Und nur hölzerne Schilde.
      onlyArmorIds: ["padded", "leather", "hide"],
      onlyShieldIds: ["shield-light-wooden", "shield-heavy-wooden", "buckler"],
    },
    sources: ["Druid"],
  },
  "srd:class:fighter": {
    weapons: { simple: true, martial: true, extraIds: [] },
    armor: {
      ...NO_ARMOR,
      light: true,
      medium: true,
      heavy: true,
      shields: true,
      // Die EINZIGE Klasse mit dem Turmschild.
      towerShield: true,
    },
    sources: ["Fighter"],
  },
  "srd:class:monk": {
    weapons: {
      simple: false,
      martial: false,
      extraIds: [
        "club",
        "crossbow-light",
        "crossbow-heavy",
        "dagger",
        "handaxe",
        "javelin",
        "kama",
        "nunchaku",
        "quarterstaff",
        "sai",
        "shuriken-5",
        "siangham",
        "sling",
      ],
    },
    // Keine Rüstung, kein Schild — und mit Rüstung fällt der RK-Bonus des Mönchs weg.
    armor: NO_ARMOR,
    sources: ["Monk"],
  },
  "srd:class:paladin": {
    weapons: { simple: true, martial: true, extraIds: [] },
    armor: { ...NO_ARMOR, light: true, medium: true, heavy: true, shields: true },
    sources: ["Paladin"],
  },
  "srd:class:ranger": {
    weapons: { simple: true, martial: true, extraIds: [] },
    armor: { ...NO_ARMOR, light: true, shields: true },
    sources: ["Ranger"],
  },
  "srd:class:rogue": {
    weapons: {
      simple: true,
      martial: false,
      extraIds: ["crossbow-hand", "rapier", "sap", "shortbow", "sword-short"],
    },
    // Leichte Rüstung, aber KEIN Schild.
    armor: { ...NO_ARMOR, light: true },
    sources: ["Rogue"],
  },
  "srd:class:sorcerer": {
    weapons: { simple: true, martial: false, extraIds: [] },
    armor: NO_ARMOR,
    sources: ["Sorcerer"],
  },
  "srd:class:wizard": {
    weapons: {
      simple: false,
      martial: false,
      extraIds: ["club", "dagger", "crossbow-heavy", "crossbow-light", "quarterstaff"],
    },
    armor: NO_ARMOR,
    sources: ["Wizard"],
  },
};

/*
  Völker. Nur die drei, die im SRD eine echte Waffen-VERTRAUTHEIT geben — der
  Halbling steht bewusst NICHT hier: „+1 racial bonus on attack rolls with thrown
  weapons and slings" ist ein Bonus, keine Vertrautheit, und würde hier zur
  falschen Auskunft.
*/
const RACE_WEAPONS: Record<string, { ids: readonly string[]; source: string }> = {
  // „may treat dwarven waraxes and urgroshes as martial weapons rather than exotic"
  "srd:race:dwarf": { ids: ["waraxe-dwarven", "urgrosh-dwarven"], source: "Dwarf" },
  // „receive the Martial Weapon Proficiency feats for the longsword, rapier, …"
  "srd:race:elf": {
    ids: ["longsword", "rapier", "longbow", "longbow-composite", "shortbow", "shortbow-composite"],
    source: "Elf",
  },
  "srd:race:gnome": { ids: ["hammer-gnome-hooked"], source: "Gnome" },
};

/** Der Stand einer Klasse — `undefined`, wenn die App sie nicht kennt. */
export function classProficiency(classId: string): Proficiency | undefined {
  return CLASS_PROFICIENCY[classId];
}

// ===========================================================================
//  Zusammenlegen
// ===========================================================================

/**
 * Alle Klassen und das Volk zu EINEM Stand — Vertrautheit summiert sich.
 *
 * Ein Kleriker/Kämpfer darf, was jede der beiden Klassen darf. Das ist die Regel
 * und gleichzeitig die einzig sinnvolle Anzeige: eine Waffe, die er führen kann,
 * darf nicht als „ohne Übung" markiert sein, nur weil eine seiner Klassen sie
 * nicht hergibt.
 *
 * Bei den EINSCHRÄNKUNGEN gilt das Umgekehrte: sie verschwinden, sobald EINE
 * Klasse ohne sie auskommt. Ein Druide/Kämpfer trägt Metall — das Verbot hängt
 * an der Druidenklasse, nicht am Charakter (er verliert dann Druidenzauber, und
 * das ist eine Regel für den Tisch, keine für die Liste).
 */
export function proficiencyFor(
  classIds: readonly string[],
  raceId: string | undefined,
  /**
   * Waffen, die aus einer ANDEREN Quelle geübt sind — heute genau eine: die
   * Lieblingswaffe der Gottheit, wenn die War-Domäne gewählt ist. Ihr Granted
   * Power lautet wörtlich „Free Martial Weapon Proficiency with deity's favored
   * weapon (if necessary) and Weapon Focus …" — das sind ZWEI Hälften desselben
   * Satzes, und die andere sitzt im Talentplatz (`derive.ts`).
   *
   * Für einen Kämpfer/Kleriker ändert das nichts (martialische Waffen sind schon
   * geübt, das „if necessary" trifft ihn nicht). Für einen REINEN Kleriker ist es
   * der Unterschied zwischen −4 und keinem Malus — und genau dessen Bogen hätte
   * sonst „Weapon Focus geschenkt" gesagt und daneben „ohne Übung" gezeigt.
   */
  grantedWeaponIds: readonly string[] = [],
): Proficiency {
  const known = classIds.map((id) => classProficiency(id)).filter((p): p is Proficiency => p !== undefined);

  const extraIds = new Set<string>();
  const sources: string[] = [];
  let simple = false;
  let martial = false;
  let light = false;
  let medium = false;
  let heavy = false;
  let shields = false;
  let towerShield = false;
  /** Nur wenn ALLE bekannten Klassen dieselbe Einschränkung tragen, bleibt sie. */
  const armorLimits: readonly (readonly string[])[] = known
    .map((p) => p.armor.onlyArmorIds)
    .filter((l) => l.length > 0);
  const shieldLimits: readonly (readonly string[])[] = known
    .map((p) => p.armor.onlyShieldIds)
    .filter((l) => l.length > 0);

  for (const p of known) {
    simple ||= p.weapons.simple;
    martial ||= p.weapons.martial;
    for (const id of p.weapons.extraIds) extraIds.add(id);
    light ||= p.armor.light;
    medium ||= p.armor.medium;
    heavy ||= p.armor.heavy;
    shields ||= p.armor.shields;
    towerShield ||= p.armor.towerShield;
    for (const s of p.sources) sources.push(s);
  }

  const race = raceId === undefined ? undefined : RACE_WEAPONS[raceId];
  if (race !== undefined) {
    for (const id of race.ids) extraIds.add(id);
    sources.push(race.source);
  }

  if (grantedWeaponIds.length > 0) {
    // Durch `itemKey`, nicht rohe Kennung: die Tabellen hier führen nackte
    // Schlüssel („longsword"), und `proficiencyOf` streift beim Vergleich dasselbe
    // Präfix ab. Meine erste Fassung legte `srd:item:halberd` ab, und die Übung
    // griff still nicht — gefunden hat es nur die Messung am reinen Kleriker.
    for (const id of grantedWeaponIds) extraIds.add(itemKey(id));
    sources.push("War-Domäne (Lieblingswaffe der Gottheit)");
  }

  return {
    weapons: { simple, martial, extraIds: [...extraIds].sort() },
    armor: {
      light,
      medium,
      heavy,
      shields,
      towerShield,
      // Eine Einschränkung greift nur, wenn sie von JEDER Klasse kommt.
      onlyArmorIds: armorLimits.length === known.length && armorLimits.length > 0 ? armorLimits[0]! : [],
      onlyShieldIds:
        shieldLimits.length === known.length && shieldLimits.length > 0 ? shieldLimits[0]! : [],
    },
    sources,
  };
}

// ===========================================================================
//  Die eine Frage an der Zeile
// ===========================================================================

export type ProficiencyVerdict =
  /** Darf er führen/tragen. */
  | { kind: "ok" }
  /** Darf er nicht — mit dem Grund und dem Preis. */
  | { kind: "untrained"; reason: "weapon" | "armor" | "shield" | "material" }
  /** Keine Frage: Ausrüstung, Trank, Schriftrolle. */
  | { kind: "notApplicable" };

/**
 * Darf dieser Charakter mit diesem Stück umgehen?
 *
 * Gibt `notApplicable` zurück, wo die Frage keinen Sinn hat — sonst stünde an
 * jedem Rucksack „ohne Übung", und die Marke wäre nach drei Zeilen unsichtbar.
 */
/**
 * Der Schlüssel, unter dem die Tabellen dieser Datei eine Waffe führen.
 *
 * Nackt und nicht die volle Kennung („longsword", nicht „srd:item:longsword"),
 * weil die Tabellen von Hand geschrieben sind. Steht als Funktion und nicht
 * zweimal inline: die Ableitung muss an der EINEN Stelle, die einträgt
 * (`proficiencyFor`), und an der, die vergleicht (`proficiencyOf`), dieselbe sein
 * — sonst legt die eine ab, was die andere nie findet. Genau das ist mir bei der
 * Lieblingswaffe der War-Domäne passiert. Eigene Gegenstände (`hb:item:…`)
 * behalten ihr Präfix, und das ist richtig: sie stehen in keiner Tabelle.
 */
function itemKey(id: string): string {
  return id.replace(/^srd:item:/, "");
}

export function proficiencyOf(entity: ItemEntity, prof: Proficiency): ProficiencyVerdict {
  const key = itemKey(entity.id);
  const weapon = entity.data.weapon;
  const armor = entity.data.armor;

  if (armor !== undefined) {
    if (armor.kind === "shield") {
      const tower = key === "shield-tower";
      if (tower ? !prof.armor.towerShield : !prof.armor.shields) {
        return { kind: "untrained", reason: "shield" };
      }
      if (prof.armor.onlyShieldIds.length > 0 && !prof.armor.onlyShieldIds.includes(key)) {
        return { kind: "untrained", reason: "material" };
      }
      return { kind: "ok" };
    }
    const allowed =
      (armor.kind === "light" && prof.armor.light) ||
      (armor.kind === "medium" && prof.armor.medium) ||
      (armor.kind === "heavy" && prof.armor.heavy);
    if (!allowed) return { kind: "untrained", reason: "armor" };
    if (prof.armor.onlyArmorIds.length > 0 && !prof.armor.onlyArmorIds.includes(key)) {
      return { kind: "untrained", reason: "material" };
    }
    return { kind: "ok" };
  }

  if (weapon !== undefined) {
    /*
      Munition und der waffenlose Schlag sind keine Übungsfrage. Munition trägt
      im Pack `damage: "—"`, und beim waffenlosen Schlag entscheidet ein Talent,
      nicht die Vertrautheit.
    */
    if (weapon.damage === "—" || key === "unarmed-strike") return { kind: "notApplicable" };
    if (prof.weapons.extraIds.includes(key)) return { kind: "ok" };
    if (weapon.category === "simple" && prof.weapons.simple) return { kind: "ok" };
    if (weapon.category === "martial" && prof.weapons.martial) return { kind: "ok" };
    return { kind: "untrained", reason: "weapon" };
  }

  return { kind: "notApplicable" };
}

// ===========================================================================
//  Was zum Aufbau PASST
// ===========================================================================

/**
 * Talente, deren Wahl auf eine Waffe zeigt.
 *
 * „Weapon Focus (Longsword)" ist ein Hinweis, den die App hat und nicht nutzt:
 * wer das Talent nimmt, will genau diese Waffe. Der gespeicherte `choice` ist
 * Freitext (er kann „Longsword" oder „Langschwert" heißen) — deshalb wird er
 * gegen BEIDE Namen abgeglichen, wie beim Fight-Club-Import.
 */
const WEAPON_CHOICE_FEATS = new Set([
  "srd:feat:weapon-focus",
  "srd:feat:greater-weapon-focus",
  "srd:feat:weapon-specialization",
  "srd:feat:greater-weapon-specialization",
  "srd:feat:improved-critical",
  "srd:feat:exotic-weapon-proficiency",
  "srd:feat:martial-weapon-proficiency",
  "srd:feat:simple-weapon-proficiency",
  "srd:feat:weapon-finesse",
]);

function normalizeName(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface WeaponSuggestion {
  itemId: string;
  /** Warum — deutsch, für die Marke an der Zeile. */
  why: string;
}

/**
 * Welche Gegenstände passen zum Aufbau?
 *
 * Zwei Quellen, beide aus dem, was schon am Charakter steht:
 *
 *   ein Talent zeigt auf eine Waffe   → genau die vorschlagen
 *   das Volk gibt eine Waffe dazu     → die auch, sie ist sonst exotisch
 *
 * Absichtlich KEINE Meinung über „gute" Waffen: welcher Zweihänder besser ist,
 * entscheidet sein Tisch. Vorgeschlagen wird nur, was aus seinen eigenen
 * Entscheidungen folgt.
 */
export function weaponSuggestions(
  feats: readonly { featId: string; choice?: string | undefined }[],
  raceId: string | undefined,
  compendium: Map<string, Entity>,
): WeaponSuggestion[] {
  const out = new Map<string, string>();

  for (const feat of feats) {
    if (!WEAPON_CHOICE_FEATS.has(feat.featId)) continue;
    const choice = feat.choice?.trim();
    if (choice === undefined || choice === "") continue;
    const needle = normalizeName(choice);
    if (needle === "") continue;

    for (const [id, entity] of compendium) {
      if (entity.kind !== "item" || entity.deletedAt !== undefined) continue;
      if (id !== entity.id || entity.data.weapon === undefined) continue;
      const german = entity.localized?.de?.name;
      const names = [entity.name, ...(german === undefined ? [] : [german])].map(normalizeName);
      if (!names.includes(needle)) continue;
      const featName = compendium.get(feat.featId);
      const label = featName === undefined ? feat.featId : featName.name;
      if (!out.has(id)) out.set(id, `passt zu ${label}`);
    }
  }

  const race = raceId === undefined ? undefined : RACE_WEAPONS[raceId];
  if (race !== undefined) {
    for (const key of race.ids) {
      const id = `srd:item:${key}`;
      if (compendium.has(id) && !out.has(id)) out.set(id, `${race.source} darf sie führen`);
    }
  }

  return [...out].map(([itemId, why]) => ({ itemId, why })).sort((a, b) => a.itemId.localeCompare(b.itemId));
}

// ===========================================================================
//  Startausrüstung
// ===========================================================================

export interface KitEntry {
  itemId: string;
  qty: number;
}

/*
  Was jeder mitnimmt — einmal beschrieben statt elfmal abgeschrieben. Kein
  Regelzwang: die SRD-Startpakete sind Vorschläge, und dieser hier ist der
  gemeinsame Kern daraus.
*/
const TRAVEL: readonly [string, number][] = [
  ["backpack-empty", 1],
  ["bedroll", 1],
  ["rations-trail-per-day", 4],
  ["waterskin", 1],
  ["flint-and-steel", 1],
  ["torch", 3],
  ["rope-hempen-50-ft", 1],
];

function kit(...items: readonly [string, number][]): KitEntry[] {
  return [...items, ...TRAVEL].map(([itemId, qty]) => ({ itemId: `srd:item:${itemId}`, qty }));
}

/*
  Ein Vorschlag je Klasse — Waffe, Rüstung, Schild und das Werkzeug, ohne das die
  Klasse nicht arbeiten kann (Zauberbuch, heiliges Symbol, Diebeswerkzeug).

  Alles ist EINZELN abwählbar. Ein Paket, das man nur ganz oder nicht nehmen
  kann, wäre für einen Charakter, den er sich ausdenkt, wertlos.
*/
const STARTER_KITS: Record<string, KitEntry[]> = {
  "srd:class:barbarian": kit(["greataxe", 1], ["hide", 1], ["javelin", 2], ["explorer-s-outfit", 1]),
  "srd:class:bard": kit(
    ["rapier", 1],
    ["studded-leather", 1],
    ["shortbow", 1],
    ["arrows-20", 1],
    ["musical-instrument-common", 1],
    ["entertainer-s-outfit", 1],
  ),
  "srd:class:cleric": kit(
    ["mace-heavy", 1],
    ["chainmail", 1],
    ["shield-heavy-wooden", 1],
    ["holy-symbol-wooden", 1],
    ["cleric-s-vestments", 1],
  ),
  "srd:class:druid": kit(
    ["scimitar", 1],
    ["hide", 1],
    ["shield-heavy-wooden", 1],
    ["holly-and-mistletoe", 1],
    ["explorer-s-outfit", 1],
  ),
  "srd:class:fighter": kit(
    ["longsword", 1],
    ["scale-mail", 1],
    ["shield-heavy-steel", 1],
    ["javelin", 2],
    ["explorer-s-outfit", 1],
  ),
  "srd:class:monk": kit(["quarterstaff", 1], ["sling", 1], ["bullets-sling-10", 1], ["monk-s-outfit", 1]),
  "srd:class:paladin": kit(
    ["longsword", 1],
    ["scale-mail", 1],
    ["shield-heavy-steel", 1],
    ["holy-symbol-wooden", 1],
    ["explorer-s-outfit", 1],
  ),
  "srd:class:ranger": kit(
    ["longsword", 1],
    ["studded-leather", 1],
    ["longbow", 1],
    ["arrows-20", 1],
    ["explorer-s-outfit", 1],
  ),
  "srd:class:rogue": kit(
    ["sword-short", 1],
    ["leather", 1],
    ["crossbow-light", 1],
    ["bolts-crossbow-10", 1],
    ["thieves-tools", 1],
    ["explorer-s-outfit", 1],
  ),
  "srd:class:sorcerer": kit(
    ["dagger", 1],
    ["crossbow-light", 1],
    ["bolts-crossbow-10", 1],
    ["spell-component-pouch", 1],
    ["explorer-s-outfit", 1],
  ),
  "srd:class:wizard": kit(
    ["quarterstaff", 1],
    ["crossbow-light", 1],
    ["bolts-crossbow-10", 1],
    ["spellbook-wizard-s-blank", 1],
    ["spell-component-pouch", 1],
    ["scholar-s-outfit", 1],
  ),
};

/** Der Vorschlag für diese Klasse — leer, wo die App keinen hat. */
export function starterKit(classId: string | null | undefined): KitEntry[] {
  if (classId === null || classId === undefined) return [];
  return STARTER_KITS[classId] ?? [];
}

/** Für den Test: alle Kennungen, die irgendeine Tabelle hier nennt. */
export function proficiencyItemKeys(): string[] {
  const keys = new Set<string>();
  for (const prof of Object.values(CLASS_PROFICIENCY)) {
    for (const id of prof.weapons.extraIds) keys.add(id);
    for (const id of prof.armor.onlyArmorIds) keys.add(id);
    for (const id of prof.armor.onlyShieldIds) keys.add(id);
  }
  for (const race of Object.values(RACE_WEAPONS)) for (const id of race.ids) keys.add(id);
  for (const entries of Object.values(STARTER_KITS)) {
    for (const entry of entries) keys.add(entry.itemId.replace(/^srd:item:/, ""));
  }
  return [...keys].sort();
}

/** Für den Test: die Klassen und Völker, für die es eine Handtabelle gibt. */
export const PROFICIENCY_CLASS_IDS = Object.keys(CLASS_PROFICIENCY);
export const PROFICIENCY_RACE_IDS = Object.keys(RACE_WEAPONS);
export const STARTER_KIT_CLASS_IDS = Object.keys(STARTER_KITS);
export const WEAPON_CHOICE_FEAT_IDS = [...WEAPON_CHOICE_FEATS];
