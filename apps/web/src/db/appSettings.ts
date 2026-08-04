import { db } from "./db.js";

/**
 * Reine Geräte-Einstellungen (was die App ANZEIGT) — im Unterschied zu den
 * Hausregeln, die die Berechnung verändern und mit exportiert werden.
 */
/**
 * Das Material: Untergrund, Karten, Linien, Schrift.
 *
 * „codex" ist das heutige kalte Blaugrau, „nachtbogen" das dunkle Papier. Die zwei hellen
 * Papiere (kopierter Bogen, Kladde) sind angenommen, aber noch nicht gebaut — sie kommen
 * je eine Runde, damit er jedes einzeln am Tisch ansehen kann. Bis dahin steht hier
 * absichtlich kein Schlüssel dafür: eine Auswahl, die nichts ändert, ist schlimmer als
 * keine Auswahl.
 */
export const MATERIALS = ["codex", "nachtbogen"] as const;
export type Material = (typeof MATERIALS)[number];

export interface AppSettings {
  /** Würfelfunktion komplett aus: keine 🎲-Knöpfe, kein Würfel-Tab. */
  diceEnabled: boolean;
  /**
   * Wann zuletzt exportiert wurde (ISO, "" = nie). Nur dafür da, den
   * Sicherungs-Zustand anzeigen zu können — siehe backupStatus in core.
   */
  lastExportAt: string;
  /**
   * Welches Papier. Steht in den GERÄTE-Einstellungen und nicht am Charakter: dass er auf
   * dem iPad das dunkle Papier mag und am iPhone das graue, ist keine Eigenschaft seiner
   * Figuren. Dieselbe Trennung wie beim zugeklappten Zaubergrad.
   */
  material: Material;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  diceEnabled: true,
  lastExportAt: "",
  material: "codex",
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
    /*
      Unbekannter Wert → das heutige Aussehen. Auf seinem Gerät liegt das Feld noch gar
      nicht; und ein Papier, das es einmal gab und wieder verschwindet, darf die App nicht
      farblos zurücklassen.
    */
    material: (MATERIALS as readonly string[]).includes(raw.material as string)
      ? (raw.material as Material)
      : DEFAULT_APP_SETTINGS.material,
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
