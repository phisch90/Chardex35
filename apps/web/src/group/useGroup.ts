import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { shelfSchema, type GroupSettings } from "@codex35/core";
import { db } from "../db/db.js";
import {
  GROUP_SETTINGS_KEY,
  parseGroupSettings,
  SHELF_CACHE_PREFIX,
  type CachedShelf,
} from "./groupStore.js";

/** Die Gruppen-Einstellungen dieses Geräts. */
export function useGroupSettings(): GroupSettings {
  const row = useLiveQuery(() => db.settings.get(GROUP_SETTINGS_KEY), []);
  return useMemo(() => parseGroupSettings(row?.value), [row]);
}

/**
 * Die zuletzt abgeholten Regale.
 *
 * Kommen aus dem Speicher und nicht vom Netz: am Spieltisch ist das Netz das
 * Erste, was fehlt. Was einmal abgeholt wurde, bleibt lesbar — genau wie der
 * eigene Bogen.
 *
 * Auch hier werden die Inhalte durchs SCHEMA geschickt und nicht direkt verwendet.
 * Im Speicher liegt rohes JSON: `structuredClone` beim Ablegen macht daraus keine
 * geparsten Werte, und Standardwerte aus dem Schema fehlten dann. Das ist die
 * Fehlerfamilie dieses Projekts — ein abgeleiteter Wert, der gespeichert wurde.
 */
export function useCachedShelves(): CachedShelf[] | undefined {
  const rows = useLiveQuery(
    () => db.settings.where("key").startsWith(SHELF_CACHE_PREFIX).toArray(),
    [],
  );
  return useMemo(() => {
    if (rows === undefined) return undefined;
    const out: CachedShelf[] = [];
    for (const row of rows) {
      const value = row.value as Partial<CachedShelf> | undefined;
      if (value === undefined || typeof value.gistId !== "string") continue;
      const parsed = shelfSchema.safeParse(value.shelf);
      if (!parsed.success) continue;
      out.push({
        gistId: value.gistId,
        fetchedAt: typeof value.fetchedAt === "string" ? value.fetchedAt : "",
        serverUpdatedAt: typeof value.serverUpdatedAt === "string" ? value.serverUpdatedAt : "",
        shelf: parsed.data,
      });
    }
    return out.sort((a, b) => a.shelf.owner.localeCompare(b.shelf.owner));
  }, [rows]);
}
