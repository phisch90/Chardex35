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

/** Ist der gespeicherte Wert ein Thema, das es gibt? */
export function isAccentKey(value: unknown): value is AccentKey {
  return typeof value === "string" && (ACCENT_KEYS as readonly string[]).includes(value);
}
