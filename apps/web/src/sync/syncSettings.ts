import { db } from "../db/db.js";

/**
 * Zugangsdaten und Zustand des Geräte-Abgleichs. Liegen in IndexedDB neben den
 * übrigen Einstellungen und damit NUR auf diesem Gerät.
 *
 * Das Token wird bewusst NICHT mitexportiert: `buildExport()` nimmt Charaktere,
 * Homebrew und Hausregeln — Einstellungen fasst es nicht an. Eine Export-Datei,
 * die man verschickt, kann also kein GitHub-Token enthalten.
 */
export interface SyncSettings {
  /** „none" = nicht eingerichtet. */
  provider: "none" | "gist";
  token: string;
  gistId: string;
  /** Von allein abgleichen (Start, Fokus, nach Änderungen). */
  auto: boolean;
  /** ISO-Zeitstempel des letzten erfolgreichen Abgleichs. */
  lastSyncAt: string;
  /**
   * Gerätename, taucht im Namen von Konfliktkopien auf („Hike (Konflikt vom
   * iPad)"). Frei benennbar, reine Lesehilfe.
   */
  deviceName: string;
}

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  provider: "none",
  token: "",
  gistId: "",
  auto: true,
  lastSyncAt: "",
  deviceName: "",
};

export const SYNC_SETTINGS_KEY = "syncSettings";

export function parseSyncSettings(value: unknown): SyncSettings {
  if (typeof value !== "object" || value === null) return DEFAULT_SYNC_SETTINGS;
  const raw = value as Partial<Record<keyof SyncSettings, unknown>>;
  const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
  return {
    provider: raw.provider === "gist" ? "gist" : "none",
    token: str(raw.token, ""),
    gistId: str(raw.gistId, ""),
    auto: typeof raw.auto === "boolean" ? raw.auto : true,
    lastSyncAt: str(raw.lastSyncAt, ""),
    deviceName: str(raw.deviceName, ""),
  };
}

export function isSyncConfigured(settings: SyncSettings): boolean {
  return settings.provider === "gist" && settings.token !== "" && settings.gistId !== "";
}

export const SyncSettingsRepo = {
  async get(): Promise<SyncSettings> {
    const row = await db.settings.get(SYNC_SETTINGS_KEY);
    return parseSyncSettings(row?.value);
  },
  async set(settings: SyncSettings): Promise<void> {
    await db.settings.put({ key: SYNC_SETTINGS_KEY, value: settings });
  },
  async patch(patch: Partial<SyncSettings>): Promise<SyncSettings> {
    const next = { ...(await SyncSettingsRepo.get()), ...patch };
    await SyncSettingsRepo.set(next);
    return next;
  },
  /** Verbindung lösen: Token weg, Charaktere bleiben. */
  async disconnect(): Promise<void> {
    await SyncSettingsRepo.set({ ...DEFAULT_SYNC_SETTINGS });
  },
};

/**
 * Gerätevorschlag aus dem User-Agent — „iPad", „iPhone", „Mac", „Windows".
 * Nur ein Startwert für das Eingabefeld, nichts hängt daran.
 */
export function guessDeviceName(userAgent: string): string {
  for (const [needle, label] of [
    ["iPad", "iPad"],
    ["iPhone", "iPhone"],
    ["Android", "Android"],
    ["Macintosh", "Mac"],
    ["Mac OS", "Mac"],
    ["Windows", "Windows"],
    ["Linux", "Linux"],
  ] as const) {
    if (userAgent.includes(needle)) return label;
  }
  return "Gerät";
}
