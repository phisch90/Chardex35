import { db } from "./db.js";

/**
 * Reine Geräte-Einstellungen (was die App ANZEIGT) — im Unterschied zu den
 * Hausregeln, die die Berechnung verändern und mit exportiert werden.
 */
export interface AppSettings {
  /** Würfelfunktion komplett aus: keine 🎲-Knöpfe, kein Würfel-Tab. */
  diceEnabled: boolean;
  /**
   * Wann zuletzt exportiert wurde (ISO, "" = nie). Nur dafür da, den
   * Sicherungs-Zustand anzeigen zu können — siehe backupStatus in core.
   */
  lastExportAt: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  diceEnabled: true,
  lastExportAt: "",
};

export const APP_SETTINGS_KEY = "appSettings";

export function parseAppSettings(value: unknown): AppSettings {
  if (typeof value !== "object" || value === null) return DEFAULT_APP_SETTINGS;
  const raw = value as Partial<Record<keyof AppSettings, unknown>>;
  return {
    diceEnabled:
      typeof raw.diceEnabled === "boolean" ? raw.diceEnabled : DEFAULT_APP_SETTINGS.diceEnabled,
    lastExportAt:
      typeof raw.lastExportAt === "string" ? raw.lastExportAt : DEFAULT_APP_SETTINGS.lastExportAt,
  };
}

export const AppSettingsRepo = {
  async get(): Promise<AppSettings> {
    const row = await db.settings.get(APP_SETTINGS_KEY);
    return parseAppSettings(row?.value);
  },
  async set(settings: AppSettings): Promise<void> {
    await db.settings.put({ key: APP_SETTINGS_KEY, value: settings });
  },
  /** Nach einem Export aufrufen — die Anzeige lebt von diesem Zeitstempel. */
  async markExported(): Promise<void> {
    const current = await this.get();
    await this.set({ ...current, lastExportAt: new Date().toISOString() });
  },
};
