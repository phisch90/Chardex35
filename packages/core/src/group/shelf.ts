import { z } from "zod";
import { characterSchema, houseRulesSchema } from "../schema/character.js";
import { entitySchema } from "../schema/entities.js";

/**
 * Das REGAL — was eine Gruppe voneinander sieht.
 *
 * Der Aufbau folgt einer Entscheidung, die Philipp so getroffen hat: jeder Bogen
 * liegt beim jeweiligen Spieler. Jeder hat also sein eigenes Regal, schreibt nur
 * dort hinein, und liest die Regale der anderen. Damit kann niemand einen fremden
 * Bogen ändern — nicht weil die App es verbietet, sondern weil er den Schlüssel
 * dazu nicht hat. Das ist der Unterschied zwischen einer Absprache und einem
 * Schloss.
 *
 * Warum ein ZWEITES Regal neben dem Geräte-Abgleich und nicht derselbe Ablageort:
 * im Sync-Gist liegt alles — jeder Charakter, jeder Entwurf, jedes eigene
 * Regelwerk. Wer dessen Kennung bekommt, bekommt das ganze Paket. Das Regal
 * enthält nur, was ausdrücklich freigegeben wurde.
 *
 * Und weil GitHub eine Ablage nicht wirklich geheim halten kann — wer die Kennung
 * hat, kann lesen — wird der Inhalt mit einem Kennwort verschlüsselt (siehe
 * crypto.ts). Link plus Kennwort sind damit die Zugangsdaten, die Philipp
 * vergeben wollte.
 */

export const SHELF_FORMAT_VERSION = 1;

/**
 * Ein Auftrag: „ich habe deinen Bogen bearbeitet."
 *
 * Aufträge liegen im Regal des SPIELLEITERS, nicht im Regal des Spielers — er
 * kann dort ja nicht schreiben. Die App des Spielers holt sie sich ab. Damit
 * kann der Spielleiter faktisch jeden Charakter bearbeiten, ohne dass irgendwer
 * Schreibrechte auf einen fremden Bogen braucht.
 */
export const shelfOrderSchema = z.object({
  id: z.string(),
  /** Welcher Bogen gemeint ist. */
  characterId: z.string(),
  /**
   * Von welchem Stand aus bearbeitet wurde.
   *
   * Der Grund, warum das mitreist: liegt beim Spieler inzwischen eine höhere
   * `rev`, hat er selbst etwas am Bogen geändert. Dann wird nichts
   * stillschweigend überschrieben, sondern eine Rettungskopie angelegt — wie
   * beim Geräte-Abgleich.
   */
  baseRev: z.number().int(),
  /**
   * Fingerabdruck des AUFBAUS, von dem der Spielleiter ausging.
   *
   * Damit lässt sich unterscheiden, ob der Spieler nebenher nur gespielt (Schaden,
   * Zauberplätze) oder wirklich am Bogen gebaut hat. Nur im zweiten Fall braucht
   * es eine Rettungskopie. Leer = unbekannt, dann wird vorsichtshalber keine
   * angelegt (siehe applyOrder).
   */
  baseFingerprint: z.string().default(""),
  issuedAt: z.string(),
  /** Anzeigename dessen, der den Auftrag geschrieben hat — steht im Hinweis. */
  issuedBy: z.string().default(""),
  /** Ein Satz dazu, freiwillig: „Stufe 8, dazu der Ring aus der Gruft." */
  note: z.string().default(""),
  /** Der ganze Bogen, wie der Spielleiter ihn gespeichert hat. */
  character: characterSchema,
});
export type ShelfOrder = z.infer<typeof shelfOrderSchema>;

export const shelfSchema = z.object({
  app: z.string().default("chardex35"),
  kind: z.literal("gruppe").default("gruppe"),
  formatVersion: z.number().int().default(SHELF_FORMAT_VERSION),
  /** Anzeigename des Besitzers — steht an seinen Bögen in der Liste. */
  owner: z.string().default(""),
  /** Wann das Regal zuletzt geschrieben wurde. */
  updatedAt: z.string().default(""),
  /**
   * Ist das das Regal des Spielleiters? Nur von dort werden Aufträge
   * angenommen.
   *
   * Bewusst eine Angabe im Regal und nicht beim Abonnenten: dann steht an einer
   * Stelle, wer die Gruppe leitet, und niemand muss es bei jedem Abo neu
   * einstellen. Wer es fälscht, könnte fremde Bögen umschreiben — deshalb muss
   * die App beim Abonnieren fragen, ob dieses Regal Aufträge geben darf.
   */
  gamemaster: z.boolean().default(false),
  characters: z.array(characterSchema).default([]),
  /**
   * Eigenes Regelwerk, das die freigegebenen Bögen brauchen.
   *
   * Ohne das zeigt ein fremder Bogen bei Philipps Gruppe fast nichts an: seine
   * Charaktere hängen an eigenen Klassen, Talenten und Gegenständen. Es reist
   * deshalb mit — aber nur, was von den freigegebenen Bögen wirklich
   * gebraucht wird (siehe collectRefs), nicht die ganze Sammlung.
   */
  homebrewEntities: z.array(entitySchema).default([]),
  /** Damit die Zahlen beim Mitlesen dieselben sind wie beim Besitzer. */
  houseRules: houseRulesSchema.optional(),
  orders: z.array(shelfOrderSchema).default([]),
});
export type Shelf = z.infer<typeof shelfSchema>;

/** Ein Abo: das Regal einer anderen Person. */
export const shelfSubscriptionSchema = z.object({
  /** Kennung der Ablage (Gist-ID) — kommt aus dem geteilten Link. */
  gistId: z.string(),
  /** Kennwort, mit dem der Inhalt entschlüsselt wird. */
  passphrase: z.string().default(""),
  /** Wie die Person in der Liste heißen soll. Leer = Name aus dem Regal. */
  label: z.string().default(""),
  /**
   * Darf dieses Regal Aufträge geben, also meine Bögen ändern?
   *
   * Getrennt vom `gamemaster`-Merkmal IM Regal, und das ist Absicht: die eine
   * Angabe macht der Besitzer, diese hier macht man selbst. Erst wenn beide
   * zutreffen, greift ein Auftrag.
   */
  acceptOrders: z.boolean().default(false),
  lastReadAt: z.string().default(""),
  /** Schon angewendete Aufträge — sonst käme derselbe bei jedem Abgleich wieder. */
  appliedOrderIds: z.array(z.string()).default([]),
});
export type ShelfSubscription = z.infer<typeof shelfSubscriptionSchema>;

export const groupSettingsSchema = z.object({
  /** Anzeigename, unter dem die anderen meine Bögen sehen. */
  myName: z.string().default(""),
  /** Bin ich der Spielleiter dieser Gruppe? */
  iAmGamemaster: z.boolean().default(false),
  /** Mein eigenes Regal — leer, solange nichts freigegeben ist. */
  myGistId: z.string().default(""),
  /** Kennwort meines Regals. Gebe ich zusammen mit dem Link weiter. */
  myPassphrase: z.string().default(""),
  /** Welche meiner Bögen im Regal liegen. */
  sharedCharacterIds: z.array(z.string()).default([]),
  subscriptions: z.array(shelfSubscriptionSchema).default([]),
  /**
   * Aufträge, die ich als Spielleiter ausgestellt habe und die beim nächsten
   * Veröffentlichen mit ins Regal wandern.
   *
   * Sie stehen hier und nicht am Charakter: es sind Nachrichten an jemand anderen,
   * keine Eigenschaft einer Figur. Am Charakter würden sie zudem über den
   * Geräte-Abgleich mitreisen und auf dem iPad als Änderung erscheinen.
   */
  outgoingOrders: z.array(shelfOrderSchema).default([]),
});
export type GroupSettings = z.infer<typeof groupSettingsSchema>;

export const DEFAULT_GROUP_SETTINGS: GroupSettings = groupSettingsSchema.parse({});
