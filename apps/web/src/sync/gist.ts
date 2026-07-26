/**
 * Transport für den Geräte-Abgleich: ein PRIVATER GitHub-Gist als Ablage.
 *
 * Warum Gist und kein eigener Server: die App ist bewusst backend-frei und
 * läuft als statische Seite auf GitHub Pages. Ein Gist gehört dem Nutzer, ist
 * privat, kostet nichts, hat eine CORS-freigegebene API und braucht keinen
 * OAuth-Tanz mit Weiterleitungs-URLs — ein Token einmal einfügen genügt.
 *
 * Ein Dokument = eine Datei. Das hält jede Datei klein (die 1-MB-Grenze, ab
 * der die API Inhalte abschneidet, ist damit praktisch unerreichbar) und macht
 * den Abgleich diffbar, wenn man mal von Hand hineinschaut.
 */

const API = "https://api.github.com";

/** Erkennungsmerkmal beim Wiederfinden eines bereits angelegten Sync-Gists. */
export const GIST_MARKER = "chardex35-sync";
export const GIST_DESCRIPTION = `${GIST_MARKER} — Charakter-Abgleich (privat, von der App verwaltet)`;
export const META_FILE = "_chardex35.json";
export const CHAR_PREFIX = "char--";
export const HOMEBREW_PREFIX = "hb--";

/** Über dieser Größe schneidet die Gist-API Dateiinhalte ab. */
const TRUNCATION_LIMIT = 1_000_000;
/** Vorwarnschwelle, damit ein Riesen-Porträt nicht erst am Server auffällt. */
export const MAX_DOC_BYTES = 900_000;

export class SyncError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable = false) {
    super(message);
    this.name = "SyncError";
    this.retryable = retryable;
  }
}

interface GistFile {
  filename?: string;
  content?: string;
  truncated?: boolean;
  size?: number;
}

interface GistResponse {
  id?: string;
  description?: string | null;
  updated_at?: string;
  files?: Record<string, GistFile | null>;
  html_url?: string;
}

async function request(token: string, path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
    });
  } catch {
    // fetch wirft nur bei Netz-/CORS-Problemen — kein HTTP-Status vorhanden.
    throw new SyncError("Keine Verbindung zu GitHub. Offline?", true);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new SyncError(describeHttpError(response, body), response.status >= 500);
  }
  return await response.json();
}

async function requestList(token: string, path: string): Promise<GistResponse[]> {
  const body = await request(token, path);
  return Array.isArray(body) ? (body as GistResponse[]) : [];
}

/** Ein einzelner Gist — die API liefert hier ein Objekt, keine Liste. */
async function requestOne(token: string, path: string, init?: RequestInit): Promise<GistResponse> {
  return (await request(token, path, init)) as GistResponse;
}

function describeHttpError(response: Response, body: string): string {
  switch (response.status) {
    case 401:
      return "Token abgelehnt (401). Ist es abgelaufen oder widerrufen?";
    case 403:
      return response.headers.get("x-ratelimit-remaining") === "0"
        ? "GitHub-Limit erreicht. In einer Stunde geht es wieder."
        : `Token darf keine Gists lesen/schreiben (403). Berechtigung „Gists“ fehlt.`;
    case 404:
      return "Die Sync-Ablage ist nicht auffindbar (404). Gelöscht? Dann neu verbinden.";
    case 422:
      return `GitHub hat die Daten abgelehnt (422). ${body.slice(0, 200)}`;
    default:
      return `GitHub antwortet ${response.status}. ${body.slice(0, 200)}`;
  }
}

export interface RemoteSnapshot {
  gistId: string;
  /** Server-Zeitstempel — Wächter gegen das Überschreiben fremder Schreibvorgänge. */
  serverUpdatedAt: string;
  /** Dateiname → Inhalt. */
  files: Record<string, string>;
  /** Dateien, deren Inhalt die API abgeschnitten hat (zu groß). */
  truncated: string[];
}

/**
 * Sucht den bereits vorhandenen Sync-Gist des Kontos und legt ihn sonst an.
 * Damit reicht auf dem zweiten Gerät dasselbe Token — keine ID abtippen.
 */
export async function findOrCreateSyncGist(token: string): Promise<string> {
  for (const page of [1, 2, 3]) {
    const list = await requestList(token, `/gists?per_page=100&page=${page}`);
    const hit = list.find((g) => (g.description ?? "").startsWith(GIST_MARKER));
    if (hit?.id !== undefined) return hit.id;
    if (list.length < 100) break;
  }

  const created = await requestOne(token, "/gists", {
    method: "POST",
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: { [META_FILE]: { content: `{\n  "app": "chardex35"\n}\n` } },
    }),
  });
  if (created.id === undefined) throw new SyncError("GitHub hat keine Gist-ID zurückgegeben.");
  return created.id;
}

export async function readSyncGist(token: string, gistId: string): Promise<RemoteSnapshot> {
  const gist = await requestOne(token, `/gists/${gistId}`);
  const files: Record<string, string> = {};
  const truncated: string[] = [];
  for (const [name, file] of Object.entries(gist.files ?? {})) {
    if (!file) continue;
    if (file.truncated === true || (file.size ?? 0) >= TRUNCATION_LIMIT) {
      truncated.push(name);
      continue;
    }
    files[name] = file.content ?? "";
  }
  return {
    gistId,
    serverUpdatedAt: gist.updated_at ?? "",
    files,
    truncated,
  };
}

/** Nur den Server-Zeitstempel holen — billiger Vorher-Nachher-Vergleich. */
export async function readGistStamp(token: string, gistId: string): Promise<string> {
  const gist = await requestOne(token, `/gists/${gistId}`);
  return gist.updated_at ?? "";
}

/**
 * Schreibt geänderte Dateien. `null` als Inhalt löscht eine Datei.
 * Liefert den neuen Server-Zeitstempel.
 */
export async function writeSyncGist(
  token: string,
  gistId: string,
  patch: Record<string, string | null>,
): Promise<string> {
  const files: Record<string, { content: string } | null> = {};
  for (const [name, content] of Object.entries(patch)) {
    files[name] = content === null ? null : { content };
  }
  const updated = await requestOne(token, `/gists/${gistId}`, {
    method: "PATCH",
    body: JSON.stringify({ files }),
  });
  return updated.updated_at ?? "";
}

export function gistUrl(gistId: string): string {
  return `https://gist.github.com/${gistId}`;
}

/**
 * Dateiname aus einer Dokument-ID. IDs enthalten Doppelpunkte
 * (`hb:item:templer-schwert`) und UUIDs; beides wird auf harmlose Zeichen
 * reduziert. Der angehängte Hash der VOLLEN ID verhindert, dass zwei
 * verschiedene IDs nach dem Säubern auf derselben Datei landen.
 */
export function syncFileName(prefix: string, id: string): string {
  const safe = id.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 60);
  return `${prefix}${safe}-${hash32(id)}.json`;
}

/** FNV-1a, 32 Bit — kurz, stabil, ohne Abhängigkeit. */
function hash32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
