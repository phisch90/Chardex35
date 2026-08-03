import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_HOUSE_RULES,
  characterSchema,
  entitySchema,
  houseRulesSchema,
  type Character,
  type Entity,
  type HouseRules,
} from "@codex35/core";
import { db } from "./db.js";

/**
 * Migrations-Registry ab Tag 0: pure Funktionen je Ziel-schemaVersion.
 * Läuft lazy beim Laden und eager beim Import. v1 ist leer — aber verkabelt.
 */
/**
 * Wanderungen für gespeicherte Charaktere. Schlüssel = die Fassung, die dabei ENTSTEHT.
 *
 * **2 — die vorbereiteten Grad-0-Zauber wegräumen.** Seit Martins Hausregel („Grad-0-Zauber
 * müssen nicht vorbereitet werden") sind sie Reste einer Regel, die es nicht mehr gibt: auf
 * Hikes Bogen standen sie weiter als „Vorbereitet" und als „×2" da. Sein Auftrag: „solltest
 * Du das vorbereitet bei den Level null Zaubern löschen bei dem Charakter Hike."
 *
 * Es ist LÖSCHEN, deshalb hier und nicht nebenbei in der Anzeige: eine Wanderung läuft
 * genau einmal je Bogen, sie ist an der Fassungsnummer ablesbar, und sie fasst nur diese
 * eine Sorte Eintrag an. Was verloren geht, ist nichts, was noch etwas bedeutet — die
 * Plätze auf Grad 0 zählt der Bogen unverändert weiter, und welcher Zauber es wird,
 * entscheidet er beim Wirken.
 */
const characterMigrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  2: (raw) => {
    const spellState = raw.spellState;
    if (typeof spellState !== "object" || spellState === null) return raw;
    const next: Record<string, unknown> = {};
    for (const [classId, value] of Object.entries(spellState as Record<string, unknown>)) {
      if (typeof value !== "object" || value === null) {
        next[classId] = value;
        continue;
      }
      const state = value as Record<string, unknown>;
      const prepared = state.prepared;
      if (!Array.isArray(prepared)) {
        next[classId] = state;
        continue;
      }
      next[classId] = {
        ...state,
        prepared: prepared.filter(
          (p) =>
            typeof p !== "object" ||
            p === null ||
            (p as Record<string, unknown>).slotLevel !== 0,
        ),
      };
    }
    return { ...raw, spellState: next };
  },
};
const entityMigrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

function runMigrations(
  raw: Record<string, unknown>,
  registry: Record<number, (r: Record<string, unknown>) => Record<string, unknown>>,
): Record<string, unknown> {
  let doc = raw;
  let version = typeof doc.schemaVersion === "number" ? doc.schemaVersion : 1;
  while (version < CURRENT_SCHEMA_VERSION) {
    version += 1;
    const migrate = registry[version];
    if (migrate) doc = migrate(doc);
    doc = { ...doc, schemaVersion: version };
  }
  return doc;
}

export function migrateAndParseCharacter(raw: unknown): Character {
  return characterSchema.parse(runMigrations(raw as Record<string, unknown>, characterMigrations));
}

export function migrateAndParseEntity(raw: unknown): Entity {
  return entitySchema.parse(runMigrations(raw as Record<string, unknown>, entityMigrations));
}

/**
 * Eine gespeicherte Zeile auf den heutigen Schema-Stand bringen — die EINE
 * Stelle dafür, damit Anzeige, Export und Abgleich nie verschiedene Wahrheiten
 * über denselben Datensatz haben.
 *
 * Warum das wichtig genug für einen eigenen Namen ist: in der Datenbank steht
 * eine Zeile so, wie eine frühere App-Version sie geschrieben hat. Kommt im
 * Schema ein Feld dazu, fehlt es dort. Wer die rohe Zeile mit einer geparsten
 * vergleicht, findet einen Unterschied, der keiner ist — im Abgleich hat genau
 * das eine Lawine von Konfliktkopien ausgelöst.
 *
 * Bei einem echten Datenfehler nicht die App anhalten: Rohdaten durchlassen und
 * laut protokollieren.
 */
export function hydrateCharacterRow(raw: Character): Character {
  try {
    return migrateAndParseCharacter(raw);
  } catch (error) {
    console.error(`Charakter ${raw.id} passt nicht zum Schema, nutze Rohdaten:`, error);
    return raw;
  }
}

export function hydrateEntityRow(raw: Entity): Entity {
  try {
    return migrateAndParseEntity(raw);
  } catch (error) {
    console.error(`Eintrag ${raw.id} passt nicht zum Schema, nutze Rohdaten:`, error);
    return raw;
  }
}

const now = () => new Date().toISOString();

/** „Hike Greatbush (Entwurf)" → „Hike Greatbush". */
function stripDraftSuffix(name: string): string {
  const stripped = name.replace(/\s*\((Entwurf|Kopie)\)\s*$/u, "").trim();
  return stripped === "" ? name : stripped;
}

export const CharacterRepo = {
  async save(character: Character): Promise<Character> {
    const next = { ...character, rev: character.rev + 1, updatedAt: now() };
    await db.characters.put(next);
    return next;
  },

  async create(data: Omit<Character, "id" | "rev" | "updatedAt" | "schemaVersion">): Promise<Character> {
    const character = characterSchema.parse({
      ...data,
      id: crypto.randomUUID(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      rev: 1,
      updatedAt: now(),
    });
    await db.characters.put(character);
    return character;
  },

  /** Fertig gebauten Charakter übernehmen (Import) — ID bleibt erhalten. */
  async insert(character: Character): Promise<Character> {
    const next = { ...character, updatedAt: now() };
    await db.characters.put(next);
    return next;
  },

  /**
   * Mutation gegen den FRISCHEN DB-Stand in einer Transaktion — verhindert
   * Lost Updates bei schnellen Doppel-Taps (HP −1/−1, Slot-Pips), die sonst
   * beide denselben veralteten Render-Stand klonen würden.
   *
   * `hydrateCharacterRow` steht hier aus einem Grund, der einen echten Fehler
   * gekostet hat: Dexie gibt die ROHE gespeicherte Zeile zurück, getypt als
   * `Character` — und der Typ lügt. In der Datenbank steht die Zeile so, wie eine
   * frühere App-Version sie geschrieben hat. Ein Feld, das erst später ins Schema
   * kam, ist dort nicht `[]`, sondern gar nicht da; sein Standardwert entsteht
   * ausschließlich beim Parsen.
   *
   * Was daraus wurde: Philipps Kleriker war gespeichert, bevor es Domänen gab.
   * Die Anzeige las den geparsten Stand und zeigte brav „0 von 2 gewählt", aber
   * `c.domains.some(...)` traf hier auf `undefined`, warf, riss die Transaktion
   * mit und wurde von `void` verschluckt. Seine Beschreibung war genau richtig:
   * „lassen sich quasi auflisten aber nicht auswählen."
   *
   * Das ist Fall 1 der Fehlerfamilie dieses Projekts, wörtlich „rohe statt
   * geparster Datenbankzeilen" — und die Reparatur muss HIER stehen, nicht an den
   * einzelnen Feldern: `domains` war nur das erste, das auffiel. Jedes Feld mit
   * einem Standardwert im Schema (Geld, Zustände, Kampfoptionen, Zauberzustand,
   * Zähler …) ist über diesen Weg dieselbe Falle.
   */
  async mutate(id: string, fn: (c: Character) => void): Promise<void> {
    await db.transaction("rw", db.characters, async () => {
      const current = await db.characters.get(id);
      if (!current || current.deletedAt) return;
      // Geklont wird trotzdem: bei einem echten Datenfehler gibt
      // `hydrateCharacterRow` die Rohdaten zurück, und die dürfen nicht die
      // Zeile in der Datenbank sein, die wir gerade mutieren.
      const copy = hydrateCharacterRow(structuredClone(current));
      fn(copy);
      copy.rev = current.rev + 1;
      copy.updatedAt = now();
      await db.characters.put(copy);
    });
  },

  /**
   * Kopie mit neuer ID. Als Entwurf (`draftOf` zeigt aufs Original) ist das der
   * Probelauf: „was ändert sich, wenn ich Stufe 8 als Kleriker nehme" — man
   * probiert an der Kopie und lässt das Original in Ruhe.
   *
   * Die TP-Lage (Schaden, nichttödlich, temporär) wird bewusst zurückgesetzt:
   * ein Entwurf dient dem Vergleich der ABLEITUNG, und 26 Schaden aus dem
   * letzten Kampf würden den Vergleich nur verrauschen.
   */
  async duplicate(
    character: Character,
    options: { asDraft: boolean; name?: string },
  ): Promise<Character> {
    const raw: Record<string, unknown> = structuredClone(character) as Record<string, unknown>;
    delete raw.deletedAt;
    delete raw.draftOf;
    const copy = characterSchema.parse({
      ...raw,
      id: crypto.randomUUID(),
      rev: 1,
      updatedAt: now(),
      name: options.name ?? `${character.name} (Kopie)`,
      hp: { damage: 0, nonlethal: 0, temp: 0, ...(character.hp.overrideMax === undefined ? {} : { overrideMax: character.hp.overrideMax }) },
      ...(options.asDraft ? { draftOf: character.id } : {}),
    });
    await db.characters.put(copy);
    return copy;
  },

  /**
   * Entwurf übernehmen: sein Inhalt wird auf die ID des ORIGINALS geschrieben,
   * der Entwurf verschwindet. Über die Original-ID zu gehen ist der ganze
   * Punkt — der Abgleich sieht dann eine Änderung am bekannten Charakter und
   * nicht plötzlich einen zweiten.
   *
   * Die aktuelle TP-Lage des Originals bleibt: der Entwurf hat über Wochen
   * hinweg geplant, aber wie verwundet die Figur JETZT ist, weiß das Original.
   */
  async applyDraft(draft: Character): Promise<Character | null> {
    if (draft.draftOf === undefined) return null;
    let result: Character | null = null;
    await db.transaction("rw", db.characters, async () => {
      const original = await db.characters.get(draft.draftOf as string);
      if (!original || original.deletedAt) return;
      const raw: Record<string, unknown> = structuredClone(draft) as Record<string, unknown>;
      delete raw.draftOf;
      const merged = characterSchema.parse({
        ...raw,
        id: original.id,
        rev: original.rev + 1,
        updatedAt: now(),
        // „Hike (Entwurf)" darf nicht als echter Name hängen bleiben — das
        // Anhängsel fällt weg. Hat er den Entwurf dagegen bewusst umbenannt
        // („Hike der Priester"), war das eine Entscheidung und bleibt.
        name: stripDraftSuffix(draft.name),
        hp: original.hp,
      });
      await db.characters.put(merged);
      await db.characters.put({
        ...draft,
        deletedAt: now(),
        rev: draft.rev + 1,
        updatedAt: now(),
      });
      result = merged;
    });
    return result;
  },

  /** Aus einem Entwurf eine eigenständige Figur machen (Herkunft fällt weg). */
  async promoteDraft(draft: Character): Promise<void> {
    const raw: Record<string, unknown> = structuredClone(draft) as Record<string, unknown>;
    delete raw.draftOf;
    await db.characters.put(
      characterSchema.parse({ ...raw, rev: draft.rev + 1, updatedAt: now() }),
    );
  },

  /** Tombstone, nie physisch löschen (Sync-Seam). */
  async remove(character: Character): Promise<void> {
    await db.characters.put({ ...character, deletedAt: now(), rev: character.rev + 1, updatedAt: now() });
  },
};

export const CompendiumRepo = {
  /** Fertig gebauten Homebrew-Eintrag übernehmen (Import) — ID bleibt erhalten. */
  async insertHomebrew(entity: Entity): Promise<Entity> {
    if (entity.source !== "homebrew") throw new Error("Nur Homebrew-Einträge können importiert werden.");
    const next = { ...entity, updatedAt: now() };
    await db.entities.put(next);
    return next;
  },

  /**
   * Einen SELBST angelegten Eintrag anlegen — und vorher nachsehen.
   *
   * Der Unterschied zu `insertHomebrew` ist das Nachsehen. Dort schreibt ein
   * blindes `put` über eine bestehende Kennung, und weil der Import seine
   * Kennungen aus dem NAMEN baut, überschrieb ein zweiter Import mit einem
   * gleichnamigen Gegenstand rückwirkend die Werte des ersten Charakters. Der
   * Editor kann sich das nicht erlauben: er zieht eine Zufallskennung, und wenn
   * die belegt ist, ist etwas grundlegend falsch — dann wird nichts geschrieben.
   */
  async createHomebrew(entity: Entity): Promise<Entity> {
    if (entity.source !== "homebrew") throw new Error(`Eigene Einträge tragen die Quelle „homebrew".`);
    if ((await db.entities.get(entity.id)) !== undefined) {
      throw new Error(`Die Kennung ${entity.id} ist schon belegt.`);
    }
    const next = { ...entity, updatedAt: now() };
    await db.entities.put(next);
    return next;
  },

  async saveHomebrew(entity: Entity): Promise<Entity> {
    if (entity.source !== "homebrew") throw new Error("SRD-Einträge sind unveränderlich — nutze Überschreiben.");
    const next = { ...entity, rev: entity.rev + 1, updatedAt: now() };
    await db.entities.put(next);
    return next;
  },

  /**
   * Wie viele Bögen auf diesem Gerät tragen diesen Gegenstand?
   *
   * Für den Satz im Editor: eine Änderung am TYP gilt für jedes Exemplar auf
   * jedem Bogen. „Kurzschwert 1d6 → 1d8" verschiebt den Schaden überall, und das
   * muss dastehen, bevor er speichert. Die Zahl kann zu klein sein — fremde Bögen
   * liegen nicht auf diesem Gerät —, deshalb sagt der Text „auf diesem Gerät".
   */
  async countCharactersUsing(itemId: string): Promise<{ count: number; names: string[] }> {
    const names: string[] = [];
    for (const raw of await db.characters.toArray()) {
      // Auch hier die rohe Zeile erst auf den Schema-Stand bringen. `inventory`
      // gibt es seit v1, es wäre also heute harmlos — aber es ist dasselbe
      // Muster, das eben den Domänen-Fehler verursacht hat, und ein „heute
      // harmlos" veraltet mit dem nächsten Feld.
      const character = hydrateCharacterRow(raw);
      if (character.deletedAt !== undefined) continue;
      if (character.inventory.some((row) => row.itemId === itemId)) names.push(character.name);
    }
    return { count: names.length, names };
  },

  async remove(entity: Entity): Promise<void> {
    if (entity.source !== "homebrew") throw new Error("SRD-Einträge können nicht gelöscht werden.");
    await db.entities.put({ ...entity, deletedAt: now(), rev: entity.rev + 1, updatedAt: now() });
  },

  /**
   * Und zurück. Gelöscht heißt hier MARKIERT, nicht entfernt — ohne diesen Weg wäre
   * es faktisch endgültig gewesen, und selbstgebaute Gegenstände sind Arbeit, die
   * niemand sonst hat.
   *
   * `deletedAt` wird gelöscht und nicht auf `undefined` gesetzt: Dexie schreibt das
   * Objekt, wie es ist, und ein Feld mit dem Wert `undefined` überlebt den Weg durch
   * IndexedDB nicht verlässlich als „nicht da".
   */
  async restore(entity: Entity): Promise<void> {
    const next = { ...entity, rev: entity.rev + 1, updatedAt: now() };
    delete next.deletedAt;
    await db.entities.put(next);
  },
};

const HOUSE_RULES_KEY = "houseRules";

export const SettingsRepo = {
  async getHouseRules(): Promise<HouseRules> {
    const row = await db.settings.get(HOUSE_RULES_KEY);
    if (!row) return DEFAULT_HOUSE_RULES;
    const parsed = houseRulesSchema.safeParse(row.value);
    return parsed.success ? parsed.data : DEFAULT_HOUSE_RULES;
  },
  async setHouseRules(rules: HouseRules): Promise<void> {
    await db.settings.put({ key: HOUSE_RULES_KEY, value: rules });
  },
};
