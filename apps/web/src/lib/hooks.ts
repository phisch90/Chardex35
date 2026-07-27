import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  DEFAULT_HOUSE_RULES,
  deriveSheet,
  houseRulesSchema,
  resolveCompendium,
  type Character,
  type DerivedSheet,
  type Entity,
  type HouseRules,
} from "@codex35/core";
import { db } from "../db/db.js";
import { hydrateEntities } from "../db/hydrateEntities.js";
import { hydrateCharacterRow } from "../db/repo.js";
import { APP_SETTINGS_KEY, parseAppSettings, type AppSettings } from "../db/appSettings.js";

export function useAllEntities(): Entity[] | undefined {
  // hydrateEntities: alte Zeilen bekommen die Standardwerte neu ergänzter
  // Schema-Felder — sonst stürzt die Engine beim ersten Start nach einem
  // Update ab, solange das neue Kompendium noch im Hintergrund lädt.
  return useLiveQuery(async () => hydrateEntities(await db.entities.toArray()), []);
}

/** Aufgelöste Kompendium-Map (Shadowing angewendet). */
export function useCompendium(): Map<string, Entity> | undefined {
  const entities = useAllEntities();
  return useMemo(() => (entities ? resolveCompendium(entities) : undefined), [entities]);
}

export function useCharacters(): Character[] | undefined {
  // hydrateCharacterRow: dieselbe Aufbereitung wie im Abgleich und im Export —
  // drei Wege, die verschiedene Fassungen derselben Zeile sehen, waren die
  // Ursache der Konfliktkopien-Lawine.
  return useLiveQuery(
    async () =>
      (await db.characters.toArray())
        .filter((c) => !c.deletedAt)
        .map(hydrateCharacterRow)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
}

export function useCharacter(id: string): Character | undefined | null {
  return useLiveQuery(async () => {
    const character = await db.characters.get(id);
    return character && !character.deletedAt ? hydrateCharacterRow(character) : null;
  }, [id]);
}

export function useHouseRules(): HouseRules {
  const row = useLiveQuery(() => db.settings.get("houseRules"), []);
  return useMemo(() => {
    if (!row) return DEFAULT_HOUSE_RULES;
    const parsed = houseRulesSchema.safeParse(row.value);
    return parsed.success ? parsed.data : DEFAULT_HOUSE_RULES;
  }, [row]);
}

/** Geräte-Einstellungen (Anzeige), unabhängig von den Hausregeln. */
export function useAppSettings(): AppSettings {
  const row = useLiveQuery(() => db.settings.get(APP_SETTINGS_KEY), []);
  return useMemo(() => parseAppSettings(row?.value), [row]);
}

/** Der abgeleitete Bogen — nie State, immer berechnet. */
export function useSheet(character: Character | undefined | null): DerivedSheet | undefined {
  const compendium = useCompendium();
  const houseRules = useHouseRules();
  return useMemo(
    () => (character && compendium ? deriveSheet(character, compendium, houseRules) : undefined),
    [character, compendium, houseRules],
  );
}
