import {
  DEFAULT_GROUP_SETTINGS,
  groupSettingsSchema,
  type GroupSettings,
  type Shelf,
} from "@codex35/core";
import { db } from "../db/db.js";

/**
 * Wo die Gruppen-Einstellungen liegen: in denselben Einstellungen wie alles
 * andere, also NUR auf diesem Gerät.
 *
 * Das Kennwort des eigenen Regals steht mit darin. Es wird — wie der
 * GitHub-Token — bewusst NICHT mitexportiert: `buildExport()` nimmt Charaktere,
 * Homebrew und Hausregeln, Einstellungen fasst es nicht an. Eine Export-Datei,
 * die man verschickt, verrät also weder Token noch Kennwort.
 */
export const GROUP_SETTINGS_KEY = "groupSettings";

export function parseGroupSettings(value: unknown): GroupSettings {
  const parsed = groupSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_GROUP_SETTINGS;
}

export async function loadGroupSettings(): Promise<GroupSettings> {
  const row = await db.settings.get(GROUP_SETTINGS_KEY);
  return parseGroupSettings(row?.value);
}

/**
 * Ändert die Einstellungen unter EINEM Schloss.
 *
 * Warum nicht lesen, ändern, schreiben: das Abholen mehrerer Regale läuft
 * nebeneinander, und jedes will danach seinen Zeitstempel und seine angewendeten
 * Aufträge festhalten. Ohne Transaktion gewinnt der Letzte und die Arbeit der
 * anderen ist weg — derselbe Fehler, den CharacterRepo.mutate für Bögen vermeidet.
 */
export async function mutateGroupSettings(
  change: (settings: GroupSettings) => void,
): Promise<GroupSettings> {
  return await db.transaction("rw", db.settings, async () => {
    const row = await db.settings.get(GROUP_SETTINGS_KEY);
    const settings = parseGroupSettings(row?.value);
    change(settings);
    const clean = groupSettingsSchema.parse(settings);
    await db.settings.put({ key: GROUP_SETTINGS_KEY, value: clean });
    return clean;
  });
}

/**
 * Was von einem abgeholten Regal im Speicher bleibt.
 *
 * Fremde Bögen landen ABSICHTLICH nicht in `db.characters`. Dort liegen die
 * eigenen, und der Geräte-Abgleich schiebt alles von dort in den eigenen Gist —
 * fremde Bögen würden also in Philipps Ablage wandern und ihm beim nächsten
 * Abgleich als eigene Charaktere erscheinen. Sie gehören in ein eigenes Fach.
 */
export const SHELF_CACHE_PREFIX = "shelfCache:";

export interface CachedShelf {
  gistId: string;
  fetchedAt: string;
  serverUpdatedAt: string;
  shelf: Shelf;
}

export async function cacheShelf(entry: CachedShelf): Promise<void> {
  await db.settings.put({ key: SHELF_CACHE_PREFIX + entry.gistId, value: entry });
}

export async function forgetShelf(gistId: string): Promise<void> {
  await db.settings.delete(SHELF_CACHE_PREFIX + gistId);
}
