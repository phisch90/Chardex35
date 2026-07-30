import { itemGroupOf, type ItemEntity, type ItemGroup } from "@codex35/core";
import { S } from "../strings.js";

/**
 * Suchen, das auch findet, was man nicht genau weiß.
 *
 * Drei Regeln, alle aus echten Fehlschlägen an den echten Namen:
 *
 * 1. WORTDREHER UND KOMMAS. Das Pack schreibt „Sword, short"; er tippt
 *    „shortsword" oder „wooden heavy shield". Beides fand vorher nichts. Der
 *    Schlüssel enthält deshalb die Wörter in Original- UND Umkehrreihenfolge,
 *    dazu die Form ohne Leerzeichen.
 * 2. GRUPPENNAMEN SIND TREFFER. Von 85 Tränken hat KEINER das Wort „potion" im
 *    Namen — der Trank heißt „Aid". „trank" oder „potion" kann deshalb nur über
 *    die Gruppe funktionieren, nie über den Namen.
 * 3. DEUTSCHE SUCHWÖRTER. „rüstung" hat im ganzen Kompendium null Treffer. Die
 *    NAMEN bleiben englisch (SRD), aber der WEG dorthin darf deutsch sein.
 */

/** Kleinschreibung, Umlaute aufgelöst, Satzzeichen zu Leerzeichen. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Der Suchschlüssel eines Gegenstands: alle Formen, unter denen er gefunden
 * werden soll, in einer Zeichenkette.
 */
export function searchKeyOf(entity: ItemEntity): string {
  const plain = normalize(entity.name);
  const words = plain.split(" ").filter((w) => w !== "");
  const reversed = [...words].reverse();
  /*
    Vier Formen, und alle vier braucht es. „shortsword" fiel durch, solange die
    umgedrehte Form nur MIT Leerzeichen im Schlüssel stand: „Sword, short" ergibt
    „short sword", aber getippt wird zusammengeschrieben.
  */
  const forms = new Set<string>([
    plain,
    words.join(""),
    reversed.join(" "),
    reversed.join(""),
  ]);
  const german = entity.localized?.de?.name;
  if (german !== undefined) forms.add(normalize(german));
  return [...forms].join(" | ");
}

export interface ItemSearchIndexEntry {
  entity: ItemEntity;
  group: ItemGroup;
  key: string;
}

export function buildItemSearchIndex(items: ItemEntity[]): ItemSearchIndexEntry[] {
  return items.map((entity) => ({
    entity,
    group: itemGroupOf(entity),
    key: searchKeyOf(entity),
  }));
}

/**
 * Trifft die Eingabe eine GRUPPE? Dann ist das das erste Ergebnis — sonst ist
 * „trank" eine Suche ohne Treffer, obwohl es 85 Tränke gibt.
 */
export function groupForQuery(query: string): ItemGroup | undefined {
  const q = normalize(query);
  if (q === "") return undefined;
  // Genauer Treffer zuerst, dann ein Wortanfang. „rüst" soll reichen.
  const table = S.items.synonyms;
  if (table[q] !== undefined) return table[q] as ItemGroup;
  const hits = new Set(
    Object.entries(table)
      .filter(([word]) => normalize(word).startsWith(q) && q.length >= 3)
      .map(([, group]) => group),
  );
  return hits.size === 1 ? ([...hits][0] as ItemGroup) : undefined;
}

/** Namenstreffer, nach Gruppe sortiert — jede Gruppe behält ihre Zahl. */
export function searchItems(
  index: ItemSearchIndexEntry[],
  query: string,
): { group: ItemGroup; items: ItemEntity[] }[] {
  const q = normalize(query);
  if (q === "") return [];
  const byGroup = new Map<ItemGroup, ItemEntity[]>();
  for (const entry of index) {
    if (!entry.key.includes(q)) continue;
    const list = byGroup.get(entry.group) ?? [];
    list.push(entry.entity);
    byGroup.set(entry.group, list);
  }
  return [...byGroup]
    .map(([group, items]) => ({
      group,
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.items.length - a.items.length);
}
