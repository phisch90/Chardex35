import { characterSchema, type Character, type HouseRules } from "../schema/character.js";
import type { Entity } from "../schema/entities.js";
import { collectHomebrewClosure } from "../sync/refs.js";
import { buildFingerprint } from "./orders.js";
import {
  SHELF_FORMAT_VERSION,
  shelfSchema,
  type Shelf,
  type ShelfOrder,
  type ShelfSubscription,
} from "./shelf.js";

/**
 * Ein Regal zusammenstellen und wieder auseinandernehmen.
 *
 * Die eine Regel, die hier durchgehalten wird: ES GEHT NUR HINEIN, WAS
 * AUSDRÜCKLICH FREIGEGEBEN IST. Kein „alles, was da ist" — Philipps eigenes
 * Regelwerk stammt aus seinen gekauften Büchern, und was davon in der Gruppe
 * landet, entscheidet er Charakter für Charakter, nicht die App.
 */

export interface BuildShelfInput {
  owner: string;
  gamemaster: boolean;
  /** Alle Bögen auf diesem Gerät. */
  characters: Character[];
  /** Welche davon freigegeben sind. */
  sharedCharacterIds: string[];
  /** Die ganze eigene Sammlung — es reist nur mit, was gebraucht wird. */
  homebrewEntities: Entity[];
  houseRules?: HouseRules | undefined;
  orders?: ShelfOrder[] | undefined;
  now: string;
}

export function buildShelf(input: BuildShelfInput): Shelf {
  const shared = new Set(input.sharedCharacterIds);
  const characters = input.characters.filter(
    (character) =>
      shared.has(character.id) &&
      character.deletedAt === undefined &&
      // Entwürfe sind Probeläufe. Sie in der Gruppe zu zeigen würde nur die Frage
      // auslösen, welcher der beiden Bögen jetzt gilt.
      character.draftOf === undefined,
  );

  /*
    Nur das gebrauchte Regelwerk — und zwar über denselben Sammler, den der
    Datei-Export benutzt (`collectHomebrewClosure`). Der nimmt auch mit, was
    einen verwiesenen Eintrag ÜBERSCHREIBT: ohne das schiene beim Mitleser der
    SRD-Eintrag durch, und dieselbe Figur hätte bei ihm andere Zahlen.

    Ein fremder Bogen ohne seine eigenen Klassen und Talente zeigt fast nichts an
    — mit der ganzen Sammlung stünde aber mehr im Regal, als freigegeben wurde.
  */
  const byId = new Map<string, Entity>();
  for (const character of characters) {
    for (const entity of collectHomebrewClosure(character, input.homebrewEntities)) {
      if (entity.deletedAt === undefined) byId.set(entity.id, entity);
    }
  }
  const homebrewEntities = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));

  return shelfSchema.parse({
    app: "chardex35",
    kind: "gruppe",
    formatVersion: SHELF_FORMAT_VERSION,
    owner: input.owner,
    updatedAt: input.now,
    gamemaster: input.gamemaster,
    characters,
    homebrewEntities,
    ...(input.houseRules === undefined ? {} : { houseRules: input.houseRules }),
    orders: input.orders ?? [],
  });
}

export class ShelfFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShelfFormatError";
  }
}

/**
 * Ein gelesenes Regal prüfen.
 *
 * Fremde Daten werden IMMER durchs Schema geschickt, nie direkt verwendet — das
 * ist dieselbe Regel wie beim Geräte-Abgleich, und sie hat dort schon einen Fehler
 * verhindert: ungeparste Zeilen sahen anders aus als geparste und lösten bei jedem
 * Abgleich einen Konflikt aus.
 */
export function parseShelf(raw: unknown): Shelf {
  if (typeof raw !== "object" || raw === null) {
    throw new ShelfFormatError("Das Regal ist leer oder unlesbar.");
  }
  const kind = (raw as Record<string, unknown>)["kind"];
  if (kind !== undefined && kind !== "gruppe") {
    throw new ShelfFormatError(
      `Das ist kein Gruppen-Regal (steht als „${String(kind)}" darin). Hast du versehentlich die Kennung des Geräte-Abgleichs eingetragen?`,
    );
  }
  const version = (raw as Record<string, unknown>)["formatVersion"];
  if (typeof version === "number" && version > SHELF_FORMAT_VERSION) {
    throw new ShelfFormatError(
      `Dieses Regal ist neuer als deine App (Format ${version}, ich kenne ${SHELF_FORMAT_VERSION}). Aktualisiere die App, sonst würde ich Teile stillschweigend übergehen.`,
    );
  }
  const parsed = shelfSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ShelfFormatError(`Das Regal passt nicht zum Format: ${parsed.error.issues[0]?.message ?? "unbekannt"}`);
  }
  return parsed.data;
}

/**
 * Einen Auftrag ausstellen: „ich habe deinen Bogen bearbeitet."
 *
 * `base` ist der Stand, von dem aus bearbeitet wurde — also der Bogen, wie er aus
 * dem Regal des Spielers kam. Daraus entsteht der Fingerabdruck, an dem die
 * Gegenseite erkennt, ob sie nebenher selbst gebaut hat.
 */
export function issueOrder(input: {
  id: string;
  edited: Character;
  base: Character;
  issuedBy: string;
  note?: string | undefined;
  now: string;
}): ShelfOrder {
  return {
    id: input.id,
    characterId: input.base.id,
    baseRev: input.base.rev,
    baseFingerprint: buildFingerprint(input.base),
    issuedAt: input.now,
    issuedBy: input.issuedBy,
    note: input.note ?? "",
    character: characterSchema.parse({ ...input.edited, id: input.base.id }),
  };
}

/**
 * Welche Aufträge aus einem Regal gelten für mich und sind noch offen?
 *
 * Beide Bedingungen müssen zutreffen: das Regal sagt von sich, es gehöre dem
 * Spielleiter, UND ich habe diesem Abo Aufträge erlaubt. Eine Angabe macht der
 * Besitzer, die andere ich. Nur eine von beiden wäre keine Zustimmung.
 */
export function pendingOrders(shelf: Shelf, subscription: ShelfSubscription): ShelfOrder[] {
  if (!shelf.gamemaster || !subscription.acceptOrders) return [];
  const done = new Set(subscription.appliedOrderIds);
  return shelf.orders.filter((order) => !done.has(order.id));
}
