import { db } from "./db.js";

/**
 * Reine Geräte-Einstellungen (was die App ANZEIGT) — im Unterschied zu den
 * Hausregeln, die die Berechnung verändern und mit exportiert werden.
 */
/**
 * Das Material: Untergrund, Karten, Linien, Schrift.
 *
 * Vier Papiere, alle vier abgenommen:
 *
 *   codex           das kalte Blaugrau vom Anfang
 *   nachtbogen      dunkles Papier, Tabak und Leder
 *   kopierterBogen  hell und kühl, wie eine Fotokopie des echten Bogens
 *   kladde          cremefarbenes Schulheft, blauschwarze Tinte
 *
 * Die zwei hellen standen hier lange NICHT, weil sie noch nicht gebaut waren — eine
 * Auswahl, die nichts ändert, ist schlimmer als keine Auswahl. Jetzt ändern sie etwas:
 * Papierfarbe, Schrift, Linien und Kästen (`styles.css`, Abschnitt D).
 */
export const MATERIALS = ["codex", "nachtbogen", "kopierterBogen", "kladde"] as const;
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
