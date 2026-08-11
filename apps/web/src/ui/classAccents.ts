import { useEffect } from "react";
import { accentClassIdOf, type Character } from "@codex35/core";
import { useAppSettings } from "../lib/hooks.js";

/**
 * Welche Klasse trägt welche Farbe — und wie die Farbe heißt.
 *
 * Sein Wunsch, wörtlich: „für jede Klasse ein eigenes Farbkonzept, ein eigenes Thema. Also
 * zum Druiden etwas Grünes, was son bisschen naturmäßig wirkt, beim Barden vielleicht etwas
 * Verspieltes, beim Paladin etwas sehr Edles, genauso beim Kleriker auch etwas edles,
 * frommes … Beim Barbaren soll es 'n bisschen wilder anmuten."
 *
 * Dieselbe Trennung wie bei den Kampagnenfarben (`campaignColors.ts`): hier steht die
 * ZUORDNUNG und der Name, das AUSSEHEN steht in `styles.css` unter `[data-accent="…"]`.
 * Der Kern soll nichts über Farben wissen, und die Oberfläche darf sie ändern, ohne dass
 * ein gespeicherter Bogen berührt wird.
 *
 * Und der Grund, warum hier Schlüssel und keine Farbwerte stehen: Tailwind 4 durchsucht den
 * QUELLTEXT. Ein zur Laufzeit gebautes `text-${farbe}-400` existiert in keiner Datei und
 * landet nie im Stylesheet. Die Themen schalten deshalb CSS-Variablen um, nicht Klassen —
 * die 39 Stellen mit `text-amber-400` wechseln von allein mit.
 *
 * NPC-Klassen (Adept, Aristokrat, Bürger, Experte, Krieger), Prestigeklassen und alles
 * Selbstgebaute stehen ABSICHTLICH nicht hier. Ohne Eintrag bleibt Amber stehen, und das ist
 * die ehrliche Antwort auf „diese Klasse kenne ich nicht".
 */

/** Die Schlüssel, die `styles.css` kennt. */
export const ACCENT_KEYS = [
  "wild",
  "verspielt",
  "fromm",
  "natur",
  "stahl",
  "ruhe",
  "edel",
  "faehrte",
  "schatten",
  "funke",
  "zeichen",
] as const;

export type AccentKey = (typeof ACCENT_KEYS)[number];

/** Wie ein Thema heißt, wenn er es am Bogen sieht oder auswählt. */
export const ACCENT_LABELS: Record<AccentKey, string> = {
  wild: "Wild",
  verspielt: "Verspielt",
  fromm: "Fromm",
  natur: "Natur",
  stahl: "Stahl",
  ruhe: "Ruhe",
  edel: "Edel",
  faehrte: "Fährte",
  schatten: "Schatten",
  funke: "Funke",
  zeichen: "Zeichen",
};

/** Woran man das Thema erkennt — steht beim Auswählen unter dem Namen. */
export const ACCENT_HINTS: Record<AccentKey, string> = {
  wild: "Rost und Ruß — Barbar",
  verspielt: "Türkis — Barde",
  fromm: "Silberblau — Kleriker",
  natur: "Moos — Druide",
  stahl: "Kaltes Blaugrau — Kämpfer",
  ruhe: "Safran — Mönch",
  edel: "Königsblau — Paladin",
  faehrte: "Gedecktes Oliv — Waldläufer",
  schatten: "Grünspan — Schurke",
  funke: "Magenta — Hexenmeister",
  zeichen: "Indigo — Magier",
};

/**
 * Klassen-Kennung → Thema. Jede Zeile ausgeschrieben, kein Ableiten aus dem Namen: eine
 * Klasse, die in den Packs anders heißt als erwartet, soll keinen falschen Ton bekommen,
 * sondern gar keinen.
 */
export const CLASS_ACCENTS: Record<string, AccentKey> = {
  "srd:class:barbarian": "wild",
  "srd:class:bard": "verspielt",
  "srd:class:cleric": "fromm",
  "srd:class:druid": "natur",
  "srd:class:fighter": "stahl",
  "srd:class:monk": "ruhe",
  "srd:class:paladin": "edel",
  "srd:class:ranger": "faehrte",
  "srd:class:rogue": "schatten",
  "srd:class:sorcerer": "funke",
  "srd:class:wizard": "zeichen",
};

/** Das Thema zu einer Klassen-Kennung, oder `undefined` für „kenne ich nicht". */
export function accentOfClass(classId: string | undefined): AccentKey | undefined {
  if (classId === undefined) return undefined;
  return CLASS_ACCENTS[classId];
}

/**
 * Das Thema DIESES Charakters — seine Wahl am Bogen, sonst die Klasse mit den meisten
 * Stufen, sonst `undefined` („diese Klasse kenne ich nicht").
 *
 * Stand vorher zweimal ausgeschrieben: im Effekt am Bogen und beim Porträt-Platzhalter der
 * Startseite. Zwei Stellen mit derselben Rangfolge sind zwei Gelegenheiten, sie
 * auseinanderlaufen zu lassen — und dann trägt der Bogen eine andere Farbe als sein
 * eigenes Symbol auf der Startseite.
 */
export function accentKeyOf(character: Character): AccentKey | undefined {
  if (isAccentKey(character.accent)) return character.accent;
  return accentOfClass(accentClassIdOf(character));
}

/** Ist der gespeicherte Wert ein Thema, das es gibt? */
export function isAccentKey(value: unknown): value is AccentKey {
  return typeof value === "string" && (ACCENT_KEYS as readonly string[]).includes(value);
}

/**
 * Die Klassenfarbe ans `<html>`, solange diese Seite offen ist — und beim Verlassen
 * wieder weg. Stand als Effekt im Bogen; seit die Übersicht dieselbe Farbe tragen
 * soll (sie zeigt denselben Charakter), wohnt er hier EINMAL. Zwei Kopien desselben
 * Effekts wären zwei Stellen, die den Hauptschalter (`classAccent`) vergessen können.
 *
 * Der Hauptschalter kommt VOR der Rangfolge: ist er aus, wird das Attribut gar nicht
 * gesetzt, und Rahmenfarbe, Anstrich und Kartentönung fallen zusammen weg. Der Hook
 * rechnet selbst mit dem noch nicht geladenen Charakter — ein Hook hinter einer
 * Bedingung ist kein Hook (zehnte Falle).
 */
export function useAccentAttribute(character: Character | null | undefined): void {
  const { classAccent } = useAppSettings();
  useEffect(() => {
    const root = document.documentElement;
    const key =
      !classAccent || character === undefined || character === null
        ? undefined
        : accentKeyOf(character);
    if (key === undefined) root.removeAttribute("data-accent");
    else root.setAttribute("data-accent", key);
    return () => root.removeAttribute("data-accent");
  }, [character, classAccent]);
}
