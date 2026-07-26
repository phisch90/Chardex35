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
const characterMigrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};
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
   */
  async mutate(id: string, fn: (c: Character) => void): Promise<void> {
    await db.transaction("rw", db.characters, async () => {
      const current = await db.characters.get(id);
      if (!current || current.deletedAt) return;
      const copy = structuredClone(current);
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

  async saveHomebrew(entity: Entity): Promise<Entity> {
    if (entity.source !== "homebrew") throw new Error("SRD-Einträge sind unveränderlich — nutze Überschreiben.");
    const next = { ...entity, rev: entity.rev + 1, updatedAt: now() };
    await db.entities.put(next);
    return next;
  },

  async remove(entity: Entity): Promise<void> {
    if (entity.source !== "homebrew") throw new Error("SRD-Einträge können nicht gelöscht werden.");
    await db.entities.put({ ...entity, deletedAt: now(), rev: entity.rev + 1, updatedAt: now() });
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
