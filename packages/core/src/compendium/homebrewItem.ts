import { itemEntitySchema, type ItemEntity } from "../schema/entities.js";

/**
 * Eigene Gegenstände — die EINE Stelle, an der ein Eigenbau-Gegenstand entsteht.
 *
 * Der Anlass, wörtlich: „außerdem möchte ich wie bei FC3 eigene erstellen können
 * und dann diesen Gegenständen auch ggf Effekte und Boni hinzufügen können. Die
 * dann auch wirklich rechnen. Ich finde in der Liste nämlich keine Rüstungen."
 *
 * Der Blätterer für die Regelwerks-Gegenstände ist gebaut; was fehlte, waren
 * EIGENE mit echten Werten. Eine freie Inventarzeile kann das nicht sein: sie
 * trägt nur Name, Gewicht und Boni. Rüstungsbonus, DEX-Grenze, Fertigkeits-Malus,
 * Schadenswürfel und kritischer Bereich sind Eigenschaften des GEGENSTANDS, nicht
 * des Exemplars — zwei Kurzschwerter im Rucksack dürfen nicht zwei Kopien von
 * „1d6" mit sich führen. Deshalb entsteht hier eine echte Entity, und die
 * Inventarzeile zeigt mit `itemId` darauf.
 *
 * Drei Dinge, die hier absichtlich so und nicht anders sind:
 *
 *  1. **Durch das Schema, nicht als Literal.** `buildHomebrewWeapon` im
 *     Fight-Club-Import baute jahrelang ein Objektliteral vom Typ `Entity` und
 *     schrieb `schemaVersion`, `rev`, `tags`, `critRange`, `critMult`,
 *     `category` und `handedness` von Hand hin. Genau die Bauform steht in
 *     CLAUDE.md als Fehlerfamilie: kommt ein Feld mit Standardwert ins Schema
 *     (zuletzt `weapon.strDamage`), fehlt es in solchen Literalen still. Hier
 *     geht alles durch `itemEntitySchema.parse` — die Standardwerte kommen aus
 *     dem Schema, für immer.
 *
 *  2. **Die Kennung kommt von draußen.** Kein Slug aus dem Namen. Das war Fund 3
 *     des Prüfberichts: zwei „Dolch" aus zwei Bögen wurden EIN Eintrag, und der
 *     Halbling bekam die 1d4 des Menschen. Wer hier baut, zieht eine Zufalls-
 *     kennung (`newHomebrewItemId` in der App). Niemals eine `srd:`-Kennung: das
 *     Neuseeding der Packs schreibt per bulkPut über jede Zeile mit dieser id,
 *     unabhängig von der Quelle — der eigene Gegenstand wäre beim nächsten
 *     Pack-Update weg.
 *
 *  3. **`data.category` ist eine Folge, keine Eingabe.** Die Engine liest sie
 *     nie; sie entscheidet allein, in welcher Gruppe der Blätterer den
 *     Gegenstand zeigt. Sie fällt also aus der Art heraus und wird nicht
 *     nebenher mitgeführt.
 *
 * Was NICHT hierher gehört: das +1 EINES Exemplars. Dieselbe Waffe kann als
 * Meisterarbeit angelegt und als einfaches Stück im Gepäck liegen — dafür sind
 * die `extraEffects` der Inventarzeile da.
 */

/** Die Art bestimmt, welche Werte es überhaupt gibt. */
export const HOMEBREW_ITEM_KINDS = ["weapon", "armor", "shield", "gear"] as const;
export type HomebrewItemKind = (typeof HOMEBREW_ITEM_KINDS)[number];

/*
  Überall `?: T | undefined` statt `?: T`: mit `exactOptionalPropertyTypes` sind
  das zwei verschiedene Dinge, und die Werte kommen aus einer bestehenden Entity
  (`homebrewFromTemplate` schreibt sie durch), wo optionale Felder wirklich
  `undefined` tragen können.
*/
export interface HomebrewWeaponInput {
  /** Nur der Würfel, ohne Attributsbonus: „1d8". Den Bonus rechnet die Engine. */
  damage: string;
  /** Als Bereich schreiben: „19-20". Eine einzelne „20" ist der Normalfall. */
  critRange?: string | undefined;
  critMult?: string | undefined;
  damageType?: string | undefined;
  category?: "simple" | "martial" | "exotic" | "natural" | undefined;
  handedness?: "light" | "one" | "two" | "ranged" | undefined;
  rangeIncrementFt?: number | undefined;
  reachFt?: number | undefined;
  strDamage?: "none" | "penaltyOnly" | "full" | undefined;
}

export interface HomebrewArmorInput {
  kind: "light" | "medium" | "heavy" | "shield";
  acBonus: number;
  /** null = keine Grenze. */
  maxDex?: number | null | undefined;
  /** Nicht-positiv, z.B. -2. */
  acp?: number | undefined;
  asf?: number | undefined;
}

export interface HomebrewItemInput {
  /** Muss von draußen kommen — siehe Punkt 2 im Kopfkommentar. */
  id: string;
  name: string;
  kind: HomebrewItemKind;
  description?: string | undefined;
  costGp?: number | undefined;
  weightLb?: number | undefined;
  /** Vorlage, von der abgeschrieben wurde — hält Weapon Focus am Leben. */
  basedOn?: string | undefined;
  tags?: string[] | undefined;
  weapon?: HomebrewWeaponInput | undefined;
  armor?: HomebrewArmorInput | undefined;
}

/**
 * Welche Gruppe im Blätterer — Folge der Art, nicht gespeicherte Eingabe.
 *
 * `armor` und `shield` zeigen im Blätterer auf dieselbe Gruppe („Rüstung &
 * Schilde"), die Unterscheidung wirkt erst in der Untergruppe.
 */
function categoryOf(kind: HomebrewItemKind): "weapon" | "armor" | "shield" | "gear" {
  return kind;
}

/**
 * Baut die Entity. Wirft, wenn das Schema die Werte nicht annimmt — der Aufrufer
 * prüft vorher, was er dem Benutzer erklären kann.
 *
 * `previous` ist der bestehende Eintrag beim ÄNDERN. Ohne ihn würde jedes
 * Speichern die Hülle zurücksetzen: die Marken `["import", "waffe"]` einer
 * importierten Waffe wären weg, `effects`, `localized`, `sourcePack` und der
 * Erweiterungsbeutel `x` ebenso — und `rev` fiele auf 1 zurück, womit der
 * Abgleich die Änderung für älter hielte als den Stand auf dem anderen Gerät.
 *
 * Die rev zählt hier ABSICHTLICH nicht hoch: das tut `saveHomebrew` im Repo,
 * genau wie beim Bogen. Ein Erzeuger, der nebenher die rev anfasst, wäre eine
 * zweite Stelle, die es tut.
 */
export function buildHomebrewItem(
  input: HomebrewItemInput,
  previous?: ItemEntity,
): ItemEntity {
  /*
    Nie im SRD-Namensraum. Das Neuseeding der Packs löscht nur `source === "srd"`,
    schreibt danach aber per bulkPut über JEDE Zeile mit derselben Kennung —
    unabhängig von der Quelle. Ein eigener Gegenstand namens `srd:item:full-plate`
    wäre beim nächsten Pack-Update lautlos verschwunden, mitsamt der RK, die an
    ihm hängt.
  */
  if (input.id.startsWith("srd:")) {
    throw new Error(`Eigene Gegenstände dürfen keine SRD-Kennung tragen: ${input.id}`);
  }
  /*
    Waffe ohne Waffenwerte oder Rüstung ohne Rüstungswerte wäre ein Gegenstand,
    der aussieht wie eine Waffe und keine Angriffszeile erzeugt — die Engine
    entscheidet allein an `data.weapon` bzw. `data.armor`, nicht an der Kategorie
    (engine/equipment.ts). Lieber hier hart als still wirkungslos.
  */
  if (input.kind === "weapon" && input.weapon === undefined) {
    throw new Error("Eine Waffe braucht Waffenwerte (mindestens den Schadenswürfel).");
  }
  if ((input.kind === "armor" || input.kind === "shield") && input.armor === undefined) {
    throw new Error("Rüstung und Schild brauchen einen Rüstungswert.");
  }

  const tags = input.tags ?? previous?.tags;
  return itemEntitySchema.parse({
    id: input.id,
    kind: "item",
    name: input.name,
    source: "homebrew",
    ...(previous === undefined
      ? {}
      : {
          schemaVersion: previous.schemaVersion,
          rev: previous.rev,
          updatedAt: previous.updatedAt,
          effects: previous.effects,
          ...(previous.localized === undefined ? {} : { localized: previous.localized }),
          ...(previous.sourcePack === undefined ? {} : { sourcePack: previous.sourcePack }),
          ...(previous.overrides === undefined ? {} : { overrides: previous.overrides }),
          ...(previous.x === undefined ? {} : { x: previous.x }),
        }),
    ...(input.basedOn === undefined ? {} : { basedOn: input.basedOn }),
    ...(input.description === undefined || input.description === ""
      ? {}
      : { description: input.description }),
    ...(tags === undefined ? {} : { tags }),
    data: {
      category: categoryOf(input.kind),
      ...(input.costGp === undefined ? {} : { costGp: input.costGp }),
      ...(input.weightLb === undefined ? {} : { weightLb: input.weightLb }),
      ...(input.weapon === undefined ? {} : { weapon: input.weapon }),
      ...(input.armor === undefined ? {} : { armor: input.armor }),
    },
  });
}

/**
 * Aus einer Vorlage abschreiben.
 *
 * Der Nutzen ist nicht die gesparte Tipparbeit, sondern `basedOn`: eine
 * Eigenbau-Variante gilt damit als derselbe Waffen-TYP wie ihre Vorlage, und
 * Weapon Focus (Longsword) wirkt weiter auf das „Templer Schwert" (derive.ts
 * vergleicht `feat.choiceRef` gegen `entity.id` UND `entity.basedOn`). Ohne das
 * verliert der Klon +1 auf den Angriff, bei Specialization zusätzlich +2 Schaden
 * — und niemand würde erraten, warum.
 *
 * `basedOnRev` wird ABSICHTLICH nicht gesetzt: es hat im ganzen Programm keinen
 * Leser. Eine gespeicherte Zahl ohne Leser ist genau die Fehlerfamilie dieses
 * Projekts; sie gehört zusammen mit dem „Vorlage hat sich geändert"-Hinweis
 * gebaut, nicht vorher.
 */
export function homebrewFromTemplate(
  template: ItemEntity,
  id: string,
  name?: string,
): HomebrewItemInput {
  const armor = template.data.armor;
  const weapon = template.data.weapon;
  const kind: HomebrewItemKind =
    armor !== undefined
      ? armor.kind === "shield"
        ? "shield"
        : "armor"
      : weapon !== undefined
        ? "weapon"
        : "gear";
  return {
    id,
    name: name ?? template.name,
    kind,
    basedOn: template.id,
    ...(template.data.costGp === undefined ? {} : { costGp: template.data.costGp }),
    ...(template.data.weightLb === undefined ? {} : { weightLb: template.data.weightLb }),
    ...(weapon === undefined ? {} : { weapon: { ...weapon } }),
    ...(armor === undefined ? {} : { armor: { ...armor } }),
  };
}
