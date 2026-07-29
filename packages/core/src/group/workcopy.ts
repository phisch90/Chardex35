import { z } from "zod";
import { characterSchema, type Character } from "../schema/character.js";
import { buildFingerprint } from "./orders.js";
import { shelfOrderSchema, type ShelfOrder } from "./shelf.js";

/**
 * Wie der Spielleiter einen fremden Bogen bearbeitet, ohne Schreibrechte darauf.
 *
 * Er bekommt eine ARBEITSKOPIE in seiner eigenen Datenbank. Damit bearbeitet er
 * sie mit demselben Bogen wie seine eigenen Figuren — Stufenaufstieg, Ausrüstung,
 * Talente, alles was er kennt. Erst wenn er fertig ist, wird daraus ein Auftrag.
 *
 * Warum nicht direkt im fremden Bogen: den gibt es hier gar nicht zum Schreiben.
 * Und warum keine zweite, abgespeckte Bearbeitungsmaske: die wäre eine zweite
 * Wahrheit über dieselben Regeln, und die erste ist schon gebaut.
 *
 * Die Markierung steckt in `x` — dem Feld, das das Charakter-Schema für genau
 * solche Fälle offen hält. Sie muss AM Charakter hängen und nicht in den
 * Einstellungen: über den Geräte-Abgleich wandert die Arbeitskopie auf das iPad,
 * und dort muss weiterhin erkennbar sein, für wen sie gedacht ist.
 */

export const ORDER_MARKER_KEY = "orderFor";

export const orderMarkerSchema = z.object({
  /** Regal des Spielers. */
  gistId: z.string(),
  /** Kennung des Bogens DORT — nicht die der Arbeitskopie. */
  characterId: z.string(),
  /** Anzeigename des Spielers, für die Beschriftung. */
  owner: z.string().default(""),
  baseRev: z.number().int(),
  baseFingerprint: z.string(),
});
export type OrderMarker = z.infer<typeof orderMarkerSchema>;

/**
 * Kennung der Arbeitskopie. Aus Regal und Bogen zusammengesetzt, damit ein
 * zweites „bearbeiten" dieselbe Kopie trifft statt eine weitere anzulegen — sonst
 * sammelt sich nach drei Spielabenden ein Stapel halbfertiger Fassungen.
 */
export function workCopyId(gistId: string, characterId: string): string {
  return `order--${gistId}--${characterId}`;
}

export function makeWorkCopy(
  foreign: Character,
  context: { gistId: string; owner: string; now: string },
): Character {
  const marker: OrderMarker = {
    gistId: context.gistId,
    characterId: foreign.id,
    owner: context.owner,
    baseRev: foreign.rev,
    baseFingerprint: buildFingerprint(foreign),
  };
  return characterSchema.parse({
    ...foreign,
    id: workCopyId(context.gistId, foreign.id),
    rev: 1,
    updatedAt: context.now,
    // Kein Entwurf: ein Entwurf gehört zu einem eigenen Bogen und wird verglichen.
    // Das hier gehört jemand anderem.
    draftOf: undefined,
    x: { ...(foreign.x ?? {}), [ORDER_MARKER_KEY]: marker },
  });
}

/** Ist das eine Arbeitskopie für einen fremden Bogen? */
export function readOrderMarker(character: Character): OrderMarker | undefined {
  const raw = character.x?.[ORDER_MARKER_KEY];
  if (raw === undefined) return undefined;
  const parsed = orderMarkerSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

/**
 * Aus der Arbeitskopie einen Auftrag machen.
 *
 * Ausgangsstand kommt aus der MARKIERUNG, nicht aus dem Regal: bearbeitet wurde
 * der Stand von damals, und nur dazu passt der Fingerabdruck. Hat der Spieler
 * inzwischen selbst gebaut, ist das genau der Fall, für den die Rettungskopie da
 * ist — und nicht einer, den man durch Nachladen wegdefiniert.
 */
export function orderFromWorkCopy(
  copy: Character,
  marker: OrderMarker,
  meta: { id: string; issuedBy: string; note?: string | undefined; now: string },
): ShelfOrder {
  return shelfOrderSchema.parse({
    id: meta.id,
    characterId: marker.characterId,
    baseRev: marker.baseRev,
    baseFingerprint: marker.baseFingerprint,
    issuedAt: meta.now,
    issuedBy: meta.issuedBy,
    note: meta.note ?? "",
    character: workCopyToCharacter(copy, marker),
  });
}

/**
 * Der Bogen, wie er im Auftrag stehen soll: ohne die Markierung und unter der
 * Kennung des Spielers.
 *
 * Die Markierung darf nicht mitreisen. Sonst käme beim Spieler ein Bogen an, der
 * behauptet, eine Arbeitskopie für jemand anderen zu sein — und beim nächsten
 * Veröffentlichen würde er als solche wieder auftauchen.
 */
export function workCopyToCharacter(copy: Character, marker: OrderMarker): Character {
  const rest = { ...(copy.x ?? {}) };
  delete rest[ORDER_MARKER_KEY];
  return characterSchema.parse({
    ...copy,
    id: marker.characterId,
    ...(Object.keys(rest).length === 0 ? { x: undefined } : { x: rest }),
  });
}
