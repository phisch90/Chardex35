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
    // Der Abzweigpunkt gehört zu DIESER Verbindung. Bleibt er stehen und man
    // verbindet sich mit einer anderen Ablage, hielte die Erkennung fremde
    // Dokumente für schon abgeglichen.
    await SyncBaseRepo.clear();
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

// ---------------------------------------------------------------------------
// Der gemeinsame Abzweigpunkt je Dokument
// ---------------------------------------------------------------------------

/**
 * Was DIESES Gerät beim letzten erfolgreichen Abgleich gesehen hat: Dokument-ID →
 * `rev`.
 *
 * Liegt bei den Einstellungen und NICHT am Dokument. Am Dokument würde die Angabe
 * über den Abgleich mitreisen, und auf dem anderen Gerät bedeutet sie etwas anderes
 * — es wäre wieder ein abgeleiteter Wert, der gespeichert wurde, die Fehlerfamilie
 * dieses Projekts.
 *
 * Ohne diese Angabe lässt sich „beide haben gearbeitet" grundsätzlich nicht von
 * „nur einer hat gearbeitet" unterscheiden: eine einzelne `rev` sagt, wie oft
 * gespeichert wurde, nicht wovon aus.
 */
export const SYNC_BASE_KEY = "syncBase";

export const SyncBaseRepo = {
  async get(): Promise<Map<string, number>> {
    const row = await db.settings.get(SYNC_BASE_KEY);
    const out = new Map<string, number>();
    if (typeof row?.value !== "object" || row.value === null) return out;
    for (const [id, rev] of Object.entries(row.value as Record<string, unknown>)) {
      if (typeof rev === "number" && Number.isFinite(rev)) out.set(id, rev);
    }
    return out;
  },

  /**
   * Wird NUR nach einem vollständig durchgelaufenen Abgleich geschrieben.
   *
   * Zu früh gespeichert würde ein abgebrochener Lauf behaupten, man sei sich einig
   * gewesen — und der nächste Lauf hielte eine echte Divergenz für einseitige
   * Arbeit. Dann wäre der Fehler zurück, den das hier behebt.
   */
  async set(base: Map<string, number>): Promise<void> {
    await db.settings.put({ key: SYNC_BASE_KEY, value: Object.fromEntries(base) });
  },

  /** Beim Trennen der Verbindung mit weg — sonst gilt ein fremder Punkt weiter. */
  async clear(): Promise<void> {
    await db.settings.delete(SYNC_BASE_KEY);
  },
};
