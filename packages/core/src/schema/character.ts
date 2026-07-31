import { z } from "zod";
import { abilitySchema, bonusTypeSchema, statPathSchema } from "./common.js";
import { effectSchema, entitySchema } from "./entities.js";
import { campaignColorSchema } from "./campaign.js";

export const CURRENT_SCHEMA_VERSION = 1;
export const CURRENT_EXPORT_FORMAT_VERSION = 1;

/**
 * Hausregeln — flach, als Parameter in die Engine gereicht.
 * Toggles werden on demand ergänzt, nichts auf Verdacht.
 */
export const houseRulesSchema = z.object({
  /** UA: BAB/Saves als Brüche über Klassen summiert, einmal gerundet. */
  fractionalBabAndSaves: z.boolean().default(false),
  /** RAW: volle TP auf Stufe 1. */
  maxHpFirstLevel: z.boolean().default(true),
  /** RAW-Regel, die kaum ein Tisch spielt — Default aus. Warn-only. */
  multiclassXpPenalty: z.boolean().default(false),
  deathAt: z.enum(["minus10", "negCon"]).default("minus10"),
  pointBuyBudget: z.number().int().optional(),
  /**
   * Traglast komplett ignorieren („wir spielen ohne Gewicht"): keine
   * Bewegungsreduktion, kein Max-GE und kein Rüstungsmalus AUS DER LAST.
   * Die Rüstung selbst wirkt unverändert weiter.
   */
  ignoreEncumbrance: z.boolean().default(false),
});
export type HouseRules = z.infer<typeof houseRulesSchema>;
export const DEFAULT_HOUSE_RULES: HouseRules = houseRulesSchema.parse({});

/**
 * WO ein Gegenstand getragen wird — nicht bloß OB.
 *
 * Vorher stand hier ein `equipped: boolean`, und das war zu wenig für zwei
 * Dinge, die am Tisch dauernd vorkommen: ein Schild gehört in die Schildhand,
 * und ein Langschwert in beiden Händen macht bei Power Attack den doppelten
 * Schaden. Beides ist aus einem Ja/Nein nicht ableitbar.
 *
 * `worn` heißt „angelegt, ohne festen Platz" — Ring, Amulett, Umhang. Es ist
 * gleichzeitig das Ziel für Altbestand: ein alter `equipped: true`-Eintrag wird
 * dazu, weil das Schema allein nicht wissen kann, ob dahinter eine Rüstung oder
 * ein Dolch stand. Mechanisch ändert das nichts (angelegt bleibt angelegt), und
 * die genaue Hand kann man mit einem Tap nachtragen.
 */
export const EQUIP_SLOTS = ["none", "armor", "mainHand", "offHand", "bothHands", "worn"] as const;
export const equipSlotSchema = z.enum(EQUIP_SLOTS);
export type EquipSlot = z.infer<typeof equipSlotSchema>;

/**
 * Eine Zeile im Gepäck.
 *
 * Das `preprocess` ist die Altbestands-Schleuse: Charaktere in der Datenbank,
 * in Exportdateien und in Gists tragen noch `equipped: true|false`. Übersetzt
 * wird an EINER Stelle — dem Schema, durch das ohnehin jede Zeile läuft, bevor
 * die App sie sieht. Zwei Felder gleichzeitig zu führen wäre die Alternative
 * gewesen, und genau daraus entstehen die Widersprüche, die diese App schon
 * einmal teuer bezahlt hat (angelegt laut einem Feld, nicht angelegt laut dem
 * anderen).
 */
export const inventoryItemSchema = z.preprocess(
  (raw) => {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return raw;
    const row = raw as Record<string, unknown>;
    if (row["slot"] !== undefined) return row;
    return { ...row, slot: row["equipped"] === true ? "worn" : "none" };
  },
  z.object({
    /** Instanz-ID (ein Charakter kann zwei Langschwerter tragen). */
    id: z.string(),
    /** Kompendium-Referenz; fehlt bei komplett freien Zeilen. */
    itemId: z.string().optional(),
    customName: z.string().optional(),
    qty: z.number().int().default(1),
    slot: equipSlotSchema.default("none"),
    weightLbOverride: z.number().optional(),
    /** z.B. das +1 des individuellen Schwertes. */
    extraEffects: z.array(effectSchema).default([]),
    notes: z.string().optional(),
  }),
);
export type InventoryItem = z.infer<typeof inventoryItemSchema>;

/** Angelegt = irgendwo getragen. Die eine Stelle, die das entscheidet. */
export function isEquipped(item: { slot: EquipSlot }): boolean {
  return item.slot !== "none";
}

/**
 * Charakter speichert nur ROHE Entscheidungen — nichts Abgeleitetes.
 * Alles Berechnete kommt aus deriveSheet().
 */
export const characterSchema = z.object({
  id: z.string(),
  schemaVersion: z.number().int().default(CURRENT_SCHEMA_VERSION),
  rev: z.number().int().default(1),
  updatedAt: z.string().default(""),
  deletedAt: z.string().optional(),

  name: z.string(),
  playerName: z.string().optional(),

  /**
   * Zu welcher Kampagne der Bogen gehört — Name plus Farbe.
   *
   * Der Anlass: „jede Kampagne soll dann auch irgendwie optisch anders dargestellt
   * werden […] man trägt den Kampagnennamen ein und sucht sich eine Farbe aus, die
   * dann diese Kampagne trägt." Auf der Startseite ist damit auf einen Blick klar,
   * welcher Bogen zu welchem Tisch gehört.
   *
   * Die Farbe steht am CHARAKTER und nicht in den Einstellungen, obwohl sie
   * eigentlich der Kampagne gehört. Zwei Gründe: sie reist so mit dem Bogen aufs
   * iPad (Einstellungen werden nicht abgeglichen), und sie überlebt das Teilen. Die
   * Oberfläche behandelt die Kampagne trotzdem als EINE Sache — wer die Farbe
   * ändert, ändert sie für alle Bögen dieser Kampagne (`charactersToRecolor`).
   *
   * KEIN Aufbau: der Fingerabdruck der Spielleiter-Aufträge lässt das Feld
   * ausdrücklich weg (`group/orders.ts`). Eine Rettungskopie, weil jemand eine
   * Farbe gewählt hat, wäre genau der Fehler, den das Porträt schon einmal
   * verursacht hat.
   */
  campaign: z
    .object({
      name: z.string(),
      color: campaignColorSchema.default("slate"),
    })
    .optional(),

  /**
   * ENTWURF: ID des Charakters, aus dem dieser hier kopiert wurde. Gesetzt =
   * Probelauf („was ändert sich, wenn ich Stufe 8 als Kleriker nehme").
   *
   * Ein Entwurf ist ansonsten ein vollwertiger Charakter — eigene ID, geht
   * durch dieselbe Engine, wird mitsynchronisiert. Nur die Oberfläche behandelt
   * ihn anders: eigener Abschnitt, vergleichbar mit dem Original,
   * übernehmbar (schreibt auf die Original-ID) und leicht verwerfbar.
   */
  draftOf: z.string().optional(),
  /** Data-URL (Porträts der Gruppe sind PNGs). */
  portrait: z.string().optional(),
  alignment: z.string().optional(),
  deity: z.string().optional(),

  abilities: z.object({
    method: z.enum(["rolled", "pointbuy"]).default("rolled"),
    base: z.object({
      str: z.number().int(),
      dex: z.number().int(),
      con: z.number().int(),
      int: z.number().int(),
      wis: z.number().int(),
      cha: z.number().int(),
    }),
    /** Attributssteigerung je 4. Charakterstufe (Index 0 = Stufe 4). */
    levelUps: z.array(abilitySchema.nullable()).default([]),
  }),

  raceId: z.string(),

  /** Geordnete Stufen-Liste = Multiclass-Timeline. */
  levels: z
    .array(
      z.object({
        classId: z.string(),
        hpRoll: z.union([z.number().int(), z.literal("max"), z.literal("avg")]),
      }),
    )
    .default([]),

  /**
   * Flach; Klassen-/Cross-Class-Bewertung übernimmt validate (warn-only).
   * Schlüssel ist die Fertigkeits-ID oder `id#teilgebiet` bei Teilgebieten
   * (siehe `skillSubtypes`).
   */
  skillRanks: z.record(z.string(), z.number()).default({}),

  /**
   * Angelegte Teilgebiete — „Knowledge (arcana)", „Craft (weaponsmithing)".
   * Eigener Eintrag statt bloßer Rang-Schlüssel, damit ein Teilgebiet auch mit
   * 0 Rängen im Bogen stehen bleibt.
   */
  skillSubtypes: z
    .array(z.object({ skillId: z.string(), subtype: z.string() }))
    .default([]),

  feats: z
    .array(
      z.object({
        featId: z.string(),
        /** „Weapon Focus (Langschwert)". */
        choice: z.string().optional(),
        /**
         * Gegenstands-ID, auf die sich `choice` bezieht. Nur damit wirken
         * Effekte mit `scope: "chosenItem"` verlässlich — der Auswahltext
         * allein kann in jeder Sprache und Schreibweise stehen („Kurzschwert"
         * für `srd:item:sword-short`).
         */
        choiceRef: z.string().optional(),
        /**
         * EIGENE Modifikatoren an diesem Talent — das, was Fight Club unter
         * „Modifiers" anbietet.
         *
         * Warum am Charakter und nicht am Kompendium-Eintrag: 300 der 327
         * SRD-Talente bringen gar keine Wirkung mit, weil ihr Regeltext Prosa ist
         * („du darfst einmal pro Runde …"). Was hier eingetragen wird, ist die
         * Entscheidung DIESES Charakters — bei Hausregeln mit eigenen Zahlen ist
         * das der Normalfall. Ein Eintrag am Kompendium würde für alle Charaktere
         * gelten und wäre eine Hausregel; das ist eine andere Sache und bekommt
         * später einen eigenen Weg (Kompendium-Editor).
         *
         * Genau dieselbe Bauform gibt es schon bei `inventory[].extraEffects`
         * (das +1 des individuellen Schwertes). Zwei Wege für dieselbe Sache
         * wären ein Fehler.
         */
        extraEffects: z.array(effectSchema).default([]),
      }),
    )
    .default([]),

  inventory: z.array(inventoryItemSchema).default([]),

  money: z
    .object({
      pp: z.number().int().default(0),
      gp: z.number().int().default(0),
      sp: z.number().int().default(0),
      cp: z.number().int().default(0),
    })
    .default({ pp: 0, gp: 0, sp: 0, cp: 0 }),

  /**
   * Gewählte Domänen — die Kennung der Domänen-Zauberliste, je Klasse.
   *
   * AUFBAU, nicht Spielzustand: eine Domäne wählt man einmal auf Stufe 1 und
   * behält sie ein Charakterleben lang. Deshalb steht sie NICHT in `spellState`
   * neben „vorbereitet" und „verbraucht" — sonst gehörte sie beim Gruppen-Regal
   * dem Spieler, und der Spielleiter könnte sie nicht setzen.
   *
   * Je Klasse und nicht global, weil ein Kleriker/Magier zwei Zauberblöcke hat
   * und die Domänen zum Kleriker gehören.
   */
  domains: z
    .array(z.object({ classId: z.string(), spellListId: z.string() }))
    .default([]),

  /** Je Klassen-ID. */
  spellState: z
    .record(
      z.string(),
      z.object({
        known: z.array(z.string()).default([]),
        prepared: z
          .array(z.object({ spellId: z.string(), slotLevel: z.number().int() }))
          .default([]),
        /**
         * Index = Zaubergrad. Sparse-Array-Löcher werden beim Serialisieren zu
         * null (JSON) — beim Parsen tolerant auf 0 normalisieren, damit alte
         * Exporte immer importierbar bleiben.
         */
        usedSlots: z.array(z.preprocess((v) => v ?? 0, z.number().int())).default([]),
      }),
    )
    .default({}),

  hp: z
    .object({
      damage: z.number().int().default(0),
      nonlethal: z.number().int().default(0),
      temp: z.number().int().default(0),
      overrideMax: z.number().int().optional(),
    })
    .default({ damage: 0, nonlethal: 0, temp: 0 }),

  xp: z.number().int().default(0),

  /** Referenzen auf condition-Entities. */
  conditionIds: z.array(z.string()).default([]),

  /** Aktive Toggles; Key = `${entityId}#${effectIndex}` (z.B. Rage an). */
  toggledEffectKeys: z.array(z.string()).default([]),

  /**
   * Kampfoptionen: was man von Runde zu Runde WÄHLT. Steht hier und nicht als
   * Effekt an einem Talent, weil Power Attack und Kampfgeschick eine wählbare
   * HÖHE haben — feste Effekt-Zahlen können das nicht ausdrücken. Die Regeln
   * dazu stehen in engine/combatOptions.ts.
   */
  combatOptions: z
    .object({
      /** Wie viel vom Angriff auf den Nahkampfschaden umgelegt wird. 0 = aus. */
      powerAttack: z.number().int().default(0),
      /** Wie viel vom Angriff auf die RK umgelegt wird (max. 5). 0 = aus. */
      combatExpertise: z.number().int().default(0),
      /** −4 Angriff, +2 RK. */
      fightingDefensively: z.boolean().default(false),
      /** +4 RK, kein Angriff in dieser Runde. */
      totalDefense: z.boolean().default(false),
      /**
       * Dodge AN/AUS — ein Schalter, kein Textfeld.
       *
       * Vorher hing der Bonus daran, ob ein Gegnername eingetippt war. Das ist
       * die falsche Bedingung: der +1 gilt gegen genau einen Gegner, den man am
       * Tisch ansagt — den Namen aufzuschreiben ist optional, das Ansagen nicht.
       * Und ein Bonus, den man nur durch Tippen bekommt, wird im Kampf vergessen.
       */
      dodgeActive: z.boolean().default(false),
      /** Gegen wen — reiner Merkzettel. Ob Dodge gilt, sagt `dodgeActive`. */
      dodgeTarget: z.string().default(""),
      /**
       * „Ich greife diese Runde mit BEIDEN Waffen an."
       *
       * Eine Eingabe und keine Folge, obwohl es verlockend ist, sie aus den
       * Händen abzuleiten: man kann Kurzschwert und Dolch in den Händen halten
       * und trotzdem nur einmal mit dem Kurzschwert zuschlagen — dann gilt kein
       * Malus. Was die Hände tragen, gehört zum AUFBAU; ob man beide benutzt, ist
       * eine Entscheidung dieser Runde, wie defensiv kämpfen und der
       * Dodge-Schalter.
       *
       * Die HÖHE der Mali steht bewusst nicht hier: die ist eine Folge daraus, ob
       * die Waffe in der zweiten Hand leicht ist und ob das Talent vorhanden ist.
       */
      twoWeaponFighting: z.boolean().default(false),
    })
    .default({
      powerAttack: 0,
      combatExpertise: 0,
      fightingDefensively: false,
      totalDefense: false,
      dodgeActive: false,
      dodgeTarget: "",
      twoWeaponFighting: false,
    }),

  /** DER Notausgang — Provenienz „manuell". Macht Homebrew ab Tag 1 spielbar. */
  miscModifiers: z
    .array(
      z.object({
        id: z.string(),
        target: statPathSchema,
        bonusType: bonusTypeSchema.default("untyped"),
        value: z.number(),
        note: z.string().default(""),
      }),
    )
    .default([]),

  /**
   * Freie Zähler für Hausregel-Mechaniken (Action Points, Turn Undead,
   * Schicksalspunkte …) — die App kennt deren Regeln nicht, führt sie aber
   * sichtbar am Bogen mit.
   */
  trackers: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        /** `counter` = hoch/runter, `value` = fester Wert, `roll` = Würfelformel. */
        kind: z.enum(["counter", "value", "roll"]).default("counter"),
        value: z.number().default(0),
        /** Obergrenze für Zähler (leer = unbegrenzt). */
        max: z.number().optional(),
        /** Würfelausdruck für kind „roll", z.B. „1d6+2". */
        formula: z.string().optional(),
        note: z.string().optional(),
        /**
         * Schlüssel des Vorschlags, aus dem dieser Zähler entstand. Nur dafür da,
         * denselben Vorschlag nicht zweimal anzubieten — auch nach Umbenennen.
         */
        suggestedFrom: z.string().optional(),
        /**
         * Hat die Obergrenze jemand VON HAND gesetzt?
         *
         * Ohne diese Unterscheidung war `max` eine Momentaufnahme vom Anlegen —
         * und damit falsch, sobald sich etwas ändert. Genau daran ist Extra
         * Turning gescheitert: die Engine rechnet die vier zusätzlichen Versuche
         * korrekt dazu, aber der Zähler „Untote vertreiben" behielt den Wert, den
         * er beim Anlegen hatte, und der Vorschlag wurde nicht mehr angeboten,
         * weil es den Zähler ja schon gab.
         *
         * Jetzt gilt: ein Zähler aus einem Vorschlag folgt dem Vorschlag. Erst
         * wenn man die Grenze selbst anfasst, gewinnt der eigene Wert — und dann
         * steht das auch so in den Daten, statt nur im Kopf.
         */
        maxManual: z.boolean().default(false),
      }),
    )
    .default([]),

  /** Benannte, aufklappbare Notiz-Abschnitte (Gottheit, Familie, Hausregeln …). */
  noteSections: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        body: z.string().default(""),
      }),
    )
    .default([]),

  languages: z.string().optional(),
  /** Altes Freitextfeld — bleibt für vorhandene Bögen und schnelle Kritzeleien. */
  notes: z.string().default(""),
  x: z.record(z.string(), z.unknown()).optional(),
});
export type Character = z.infer<typeof characterSchema>;
export type CombatOptions = Character["combatOptions"];

/**
 * Export-Envelope. Referenziertes Homebrew wird immer eingebettet, SRD nie
 * (stabile Slugs lösen beim Empfänger auf). Kanonisch sortiert serialisieren!
 */
export const exportEnvelopeSchema = z.object({
  formatVersion: z.number().int(),
  exportedAt: z.string(),
  /** Herkunftsmarke. Freier String, damit ältere Exporte („codex35",
   * der Name vor der Umbenennung) weiter importierbar bleiben. */
  app: z.string().default("chardex35"),
  characters: z.array(characterSchema).default([]),
  homebrewEntities: z.array(entitySchema).default([]),
  houseRules: houseRulesSchema.optional(),
});
export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>;

/** Stabil key-sortiertes JSON — diffbare Exporte, deterministische Packs. */
export function canonicalJson(value: unknown, indent = 2): string {
  return JSON.stringify(sortKeys(value), null, indent);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}
