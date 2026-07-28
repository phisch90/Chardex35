/**
 * Welche Version läuft hier — und ist sie die veröffentlichte?
 *
 * Der Anlass ist praktisch: auf dem iPhone ist einer PWA nicht anzusehen, welchen
 * Stand sie geladen hat. Der Service Worker meldet ein Update irgendwann, oft
 * verzögert und auf iOS unzuverlässig. Deshalb fragt die App direkt nach:
 * `version.json` liegt beim Build daneben, ist bewusst NICHT im Cache und sagt,
 * was auf dem Server steht.
 */

/** Zur Bauzeit eingesetzt (vite.config.ts → define). */
declare const __APP_COMMIT__: string;
declare const __APP_BUILT_AT__: string;

export interface AppVersion {
  commit: string;
  builtAt: string;
}

export const RUNNING: AppVersion = {
  commit: typeof __APP_COMMIT__ === "string" ? __APP_COMMIT__ : "dev",
  builtAt: typeof __APP_BUILT_AT__ === "string" ? __APP_BUILT_AT__ : "",
};

export type VersionState =
  /** Noch nicht nachgesehen oder kein Netz — dann wird nichts behauptet. */
  | { kind: "unbekannt"; running: AppVersion }
  | { kind: "aktuell"; running: AppVersion }
  | { kind: "veraltet"; running: AppVersion; deployed: AppVersion };

/**
 * Die veröffentlichte Version holen. `cache: "no-store"` allein genügt nicht —
 * der Service Worker sitzt davor. Deshalb liegt die Datei außerhalb des
 * Precache (siehe vite.config.ts) und bekommt zusätzlich einen frischen
 * Parameter, damit auch kein Zwischenspeicher antwortet.
 */
export async function fetchDeployedVersion(now = Date.now()): Promise<AppVersion | null> {
  try {
    const url = `${import.meta.env.BASE_URL}version.json?t=${now}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const raw: unknown = await response.json();
    if (typeof raw !== "object" || raw === null) return null;
    const { commit, builtAt } = raw as Partial<AppVersion>;
    if (typeof commit !== "string" || commit === "") return null;
    return { commit, builtAt: typeof builtAt === "string" ? builtAt : "" };
  } catch {
    // Offline ist der Normalfall am Spieltisch und kein Fehler.
    return null;
  }
}

/**
 * Vergleich. Bewusst nur auf Gleichheit des Commits: welcher von zwei Ständen der
 * neuere ist, kann die App nicht wissen — sie kennt keine Historie. „Nicht
 * gleich" heißt hier deshalb „es liegt etwas anderes auf dem Server", und das ist
 * genau die Auskunft, die zählt.
 */
export function compareVersions(
  running: AppVersion,
  deployed: AppVersion | null,
): VersionState {
  if (deployed === null) return { kind: "unbekannt", running };
  if (deployed.commit === running.commit) return { kind: "aktuell", running };
  return { kind: "veraltet", running, deployed };
}

/** „27.07.2026, 23:41" — zum Vorlesen und zum Vergleichen mit einer Nachricht. */
export function formatBuildTime(iso: string): string {
  if (iso === "") return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Kurzform für die Anzeige: „aedab90 · 27.07.2026, 23:41". */
export function versionLabel(version: AppVersion): string {
  const time = formatBuildTime(version.builtAt);
  return time === "" ? version.commit : `${version.commit} · ${time}`;
}
