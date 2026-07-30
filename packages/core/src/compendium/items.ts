import type { Entity, ItemEntity } from "../schema/entities.js";

/**
 * Gegenstände zum BLÄTTERN ordnen — weil man sie nicht finden kann.
 *
 * Der Anlass ist Philipps Satz: „wenn ich den englischen Begriff nicht genau
 * kenne finde ich nichts. […] Ich finde in der Liste nämlich keine Rüstungen."
 * Die Suche war nicht kaputt, sie kann dieses Kompendium prinzipiell nicht
 * erschließen — nachgezählt an den Packs:
 *
 *   von 85 Tränken haben        0 das Wort „potion" im Namen (der Trank heißt „Aid")
 *   von 734 Schriftrollen       0 das Wort „scroll"
 *   von 81 Zauberstäben         0 das Wort „wand"
 *   von 34 Stäben               0 das Wort „staff"
 *   von 61 Zeptern              1 das Wort „rod"
 *
 * Und „armor" liefert unter den ersten Treffern keine einzige Rüstung, weil die
 * zwölf echten „Banded mail", „Full plate", „Chain shirt" heißen. Wer die Art
 * nicht schon kennt, kommt über den Namen nicht hin. Also über die Art.
 *
 * Hier stehen nur STABILE SCHLÜSSEL, keine deutschen Texte: die Beschriftung
 * gehört in die Oberfläche (`apps/web/src/strings.ts`), damit die Regel und ihre
 * Übersetzung nicht aneinander kleben.
 */

/**
 * Die Gruppen, in der Reihenfolge, in der sie am Tisch gebraucht werden — nicht
 * alphabetisch. Waffen und Rüstung zuerst, weil man die im Kampf sucht.
 */
export const ITEM_GROUPS = [
  "weapon",
  "armor",
  "gear",
  "potion",
  "scroll",
  "wands",
  "ring",
  "wondrous",
  "magicGear",
  "specialAbility",
  "cursed",
  "artifact",
  "other",
] as const;
export type ItemGroup = (typeof ITEM_GROUPS)[number];

/**
 * Zu welcher Gruppe gehört der Gegenstand?
 *
 * Die Reihenfolge der Prüfungen ist die Regel, nicht Zufall: die MARKEN schlagen
 * die Kategorie. Ein „Flaming" trägt `category: "magic"`, ist aber keine
 * Ausrüstung, sondern eine Waffeneigenschaft — es gehört unter die 103 anderen
 * Eigenschaften und nicht zwischen die Zauberringe. Dasselbe bei Artefakten und
 * Verfluchtem, die ebenfalls unter „magic" liegen.
 *
 * Zusammengelegt wird, was am Tisch zusammen gesucht wird: Rüstung und Schilde
 * (18 Zeilen, ein Bildschirm), Ausrüstung und Werkzeug, und die drei
 * Zauberstab-Arten. Aufgeteilt wird erst eine Ebene tiefer.
 */
export function itemGroupOf(entity: ItemEntity): ItemGroup {
  const tags = new Set(entity.tags);
  if (tags.has("special-ability")) return "specialAbility";
  if (tags.has("artifact")) return "artifact";
  if (tags.has("cursed")) return "cursed";
  switch (entity.data.category) {
    case "weapon":
      return "weapon";
    case "armor":
    case "shield":
      return "armor";
    case "gear":
    case "tool":
      return "gear";
    case "wand":
    case "staff":
    case "rod":
      return "wands";
    case "potion":
      return "potion";
    case "scroll":
      return "scroll";
    case "ring":
      return "ring";
    case "wondrous":
      return "wondrous";
    case "magic":
      return "magicGear";
    default:
      /*
        Rückfall auf die DATEN. `category` ist das Finde-Feld und hat den
        Standardwert „other" — ein Gegenstand, der aus einem älteren Stand oder
        aus einem fremden Weg kommt und ihn nie gesetzt bekam, läge damit in der
        Restgruppe, obwohl er einwandfrei rechnet: eine eigene Waffe mit
        Schadenswürfel wäre nicht bei den Waffen zu finden.

        Die Engine entscheidet an genau diesen beiden Feldern (equipment.ts:
        `itemKind`), und dieselbe Reihenfolge gilt hier: `armor` vor `weapon`.
      */
      if (entity.data.armor !== undefined) return "armor";
      if (entity.data.weapon !== undefined) return "weapon";
      return "other";
  }
}

/**
 * Die Untergruppe innerhalb einer Gruppe — `undefined`, wo es keine gibt.
 *
 * Nur aus Daten, die schon in den Packs stehen. Das ist Absicht: die
 * Untergruppen aus dem SRD-Rohbestand nachzuziehen hieße, die 1866 Packdateien
 * neu zu erzeugen, und dabei kann eine Kennung wandern. Wandert eine, verliert
 * JEDER bestehende Bogen den Gegenstand — er stünde als „—" im Gepäck, ohne RK
 * und ohne Angriffszeile. Dieses Risiko ist für eine feinere Sortierung zu groß.
 */
export function itemSubgroupOf(entity: ItemEntity): string | undefined {
  const group = itemGroupOf(entity);
  if (group === "armor") return entity.data.armor?.kind;
  if (group === "weapon") return entity.data.weapon?.category;
  if (group === "wands") return entity.data.category;
  return undefined;
}

/** Episch = Stufe 21+. Standardmäßig ausgeblendet, aber MIT Anzahl. */
export function isEpicItem(entity: ItemEntity): boolean {
  return entity.tags.includes("epic");
}

export interface ScrollInfo {
  /** Zaubergrad, wie er für diese Tradition gilt. */
  grade: number;
  tradition: "arcane" | "divine";
  spellId: string;
}

/**
 * Reihenfolge, in der die Zauberliste einer Tradition befragt wird.
 *
 * Ein Zauber kann auf mehreren Listen in verschiedenen Graden stehen (Cure Light
 * Wounds ist Cleric 1 und Bard 1). Eine feste Reihenfolge macht die Antwort
 * vorhersagbar; „der niedrigste Grad irgendwo" wäre eine Zahl, die sich beim
 * nächsten Pack still verschieben kann.
 */
const TRADITION_LISTS = {
  arcane: ["sorcerer-wizard", "bard", "assassin"],
  divine: ["cleric", "druid", "paladin", "ranger", "adept"],
} as const;

/**
 * Grad und Tradition einer Schriftrolle — beides GERECHNET, nichts gespeichert.
 *
 * Ohne das sind die 734 Schriftrollen eine unbenutzbare Wand: sie heißen wie ihr
 * Zauber, tragen den Grad nicht im Namen und machen 39 % des ganzen Kompendiums
 * aus. Mit Grad und Tradition wird daraus „göttlich, Grad 1: 41 Stück" — und für
 * einen Kleriker auf Stufe 7 sind nur die göttlichen bis Grad 4 interessant.
 *
 * Der Weg führt über die Kennung zum Zauber: `srd:item:alarm-scroll-divine` →
 * `srd:spell:alarm`. Die Reihenfolge beim Abschneiden ist wichtig — erst die
 * angehängte Zahl (Preis-Unterscheider bei Namenskollisionen), dann das
 * `-scroll-…`; umgekehrt bleiben acht Rollen unauflösbar.
 *
 * Sechs Sammeleinträge („Detect Chaos/Evil/Good/Law") haben keinen einzelnen
 * Zauber und geben `undefined` zurück. Die bekommen in der Anzeige eine eigene,
 * BENANNTE Restgruppe — verschwiegen wird nichts.
 */
export function scrollInfo(
  entity: ItemEntity,
  compendium: Map<string, Entity>,
): ScrollInfo | undefined {
  if (entity.data.category !== "scroll") return undefined;
  const tags = new Set(entity.tags);
  const tradition = tags.has("arcane") ? "arcane" : tags.has("divine") ? "divine" : undefined;
  if (tradition === undefined) return undefined;

  const spellId = entity.id
    .replace(/-\d+$/, "")
    .replace(/-scroll(-(arcane|divine))?$/, "")
    .replace(/^srd:item:/, "srd:spell:");
  const spell = compendium.get(spellId);
  if (spell?.kind !== "spell" || spell.deletedAt !== undefined) return undefined;

  for (const list of TRADITION_LISTS[tradition]) {
    const grade = spell.data.levels[list];
    if (grade !== undefined) return { grade, tradition, spellId };
  }
  return undefined;
}

/**
 * Der Zauber hinter einem Trank oder Zauberstab — für die Zeile „wirkt Cure
 * Light Wounds". Dieselbe Namensgleichheit wie bei den Schriftrollen.
 */
export function itemSpellOf(
  entity: ItemEntity,
  compendium: Map<string, Entity>,
): string | undefined {
  const spellId = entity.id.replace(/-\d+$/, "").replace(/^srd:item:/, "srd:spell:");
  const spell = compendium.get(spellId);
  return spell?.kind === "spell" && spell.deletedAt === undefined ? spellId : undefined;
}

/** Alle Gegenstände des Kompendiums, nach Gruppe. Einmal bauen, oft lesen. */
export function groupItems(compendium: Map<string, Entity>): Map<ItemGroup, ItemEntity[]> {
  const out = new Map<ItemGroup, ItemEntity[]>();
  for (const group of ITEM_GROUPS) out.set(group, []);
  for (const [id, entity] of compendium) {
    if (entity.kind !== "item" || entity.deletedAt !== undefined) continue;
    // Overrides liegen unter eigener UND Ziel-Kennung in der Map.
    if (id !== entity.id) continue;
    out.get(itemGroupOf(entity))!.push(entity);
  }
  for (const list of out.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
