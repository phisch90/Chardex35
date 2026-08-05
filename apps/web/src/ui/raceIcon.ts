import type { IconName } from "./icons.js";

/**
 * Welches Kopf-Zeichen zu einem Volk gehört.
 *
 * Sein Auftrag war „ein Piktogramm des Kopfes (wie bei BG3) der jeweiligen Rasse" — und
 * die Frage danach ist, wo die Zuordnung steht. Antwort: NIRGENDS. Der Name des Zeichens
 * IST die Kennung aus den Packs in Binnenschreibweise:
 *
 *     srd:race:half-orc  →  halfOrc
 *     srd:race:dwarf     →  dwarf
 *
 * Dieselbe Regel wie bei den Reitern des Bogens und bei den Klassenzeichen (deren Namen
 * die Schlüssel der Themen sind, `ui/classAccents.ts`): eine Tabelle, die man führen muss,
 * ist eine Tabelle, die man vergisst. Kommt ein achtes Volk in die Packs, meldet der Test
 * das fehlende Zeichen — und nicht die App durch ein leeres Kästchen.
 *
 * Der Unterschied zu den Klassen ist der RÜCKFALL. Eine unbekannte Klasse bekommt kein
 * Thema (`accentOfClass` gibt `undefined`), weil eine falsche Farbe schlimmer wäre als
 * keine. Eine Kachel dagegen MUSS etwas zeigen, sonst klafft ein Loch im Raster — also
 * das neutrale `characters`. Ein selbstgebautes Volk ist damit erkennbar „ein Volk", nur
 * eben keines mit eigenem Gesicht.
 */
export const RACE_ICONS: readonly IconName[] = [
  "human",
  "dwarf",
  "elf",
  "gnome",
  "halfElf",
  "halfOrc",
  "halfling",
];

/** Was eine Kachel zeigt, deren Volk die App nicht kennt. */
export const RACE_ICON_FALLBACK: IconName = "characters";

/**
 * `srd:race:half-orc` → `halfOrc`. Gerechnet aus dem letzten Abschnitt der Kennung,
 * damit auch ein Volk aus einem anderen Pack (`meinbuch:race:elf`) sein Gesicht bekommt:
 * ein Elf bleibt ein Elf, ganz egal, aus welcher Datei er kommt.
 */
export function raceIconName(raceId: string | undefined): IconName {
  if (raceId === undefined) return RACE_ICON_FALLBACK;
  const slug = raceId.slice(raceId.lastIndexOf(":") + 1);
  const camel = slug
    .split("-")
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
  return RACE_ICONS.includes(camel as IconName) ? (camel as IconName) : RACE_ICON_FALLBACK;
}
