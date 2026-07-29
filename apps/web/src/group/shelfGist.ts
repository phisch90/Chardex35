import { parseShelf, type Shelf } from "@codex35/core";
import { SyncError } from "../sync/gist.js";
import { openEnvelope, sealText } from "./crypto.js";

/**
 * Transport für ein Regal: EIN Gist, EINE Datei, verschlüsselter Inhalt.
 *
 * Zwei Unterschiede zum Geräte-Abgleich, und beide sind der Grund für ein eigenes
 * Modul statt eines Schalters in gist.ts:
 *
 *  1. LESEN GEHT OHNE TOKEN. Ein Mitspieler, der nur zuschauen will, soll sich
 *     nichts bei GitHub anlegen müssen. Ein Gist ist per Kennung abrufbar, auch
 *     unangemeldet — genau das macht ihn zum brauchbaren Briefkasten.
 *  2. Eine einzige Datei statt einer je Dokument. Beim Geräte-Abgleich hält das
 *     die Dateien klein und diffbar; hier wäre es sinnlos, weil verschlüsselter
 *     Inhalt sich ohnehin nicht vergleichen lässt — und eine Datei bedeutet einen
 *     Abruf.
 */

const API = "https://api.github.com";

export const SHELF_MARKER = "chardex35-gruppe";
export const SHELF_DESCRIPTION = `${SHELF_MARKER} — Gruppen-Regal (Link + Kennwort, von der App verwaltet)`;
export const SHELF_FILE = "_regal.json";

/** Über dieser Größe schneidet die Gist-API Dateiinhalte ab. */
const TRUNCATION_LIMIT = 1_000_000;
/** Vorwarnschwelle — ein Riesen-Porträt soll nicht erst am Server auffallen. */
export const MAX_SHELF_BYTES = 900_000;

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
}

/**
 * Ein Abruf bei GitHub. Der Token ist OPTIONAL, und das ist der Kern:
 *
 *  - mit Token: 5000 Abrufe je Stunde
 *  - ohne Token: 60 je Stunde und Anschluss
 *
 * Deshalb wird der eigene Token auch beim Lesen FREMDER Regale mitgeschickt, wenn
 * einer da ist. Er gibt keine Rechte an fremden Ablagen — er hebt nur das Limit.
 * Wer keinen hat, kann trotzdem mitlesen, muss aber mit 60 Abrufen auskommen: das
 * reicht für „beim Öffnen und auf Knopfdruck", nicht für einen Wecker im
 * Hintergrund. Genau so ist die Oberfläche gebaut.
 */
async function request(token: string, path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token === "" ? {} : { Authorization: `Bearer ${token}` }),
        ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
    });
  } catch {
    throw new SyncError("Keine Verbindung zu GitHub. Offline?", true);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new SyncError(describeShelfError(response, body, token === ""), response.status >= 500);
  }
  return await response.json();
}

function describeShelfError(response: Response, body: string, anonymous: boolean): string {
  switch (response.status) {
    case 401:
      return "Token abgelehnt (401). Ist es abgelaufen oder widerrufen?";
    case 403:
      if (response.headers.get("x-ratelimit-remaining") !== "0") {
        return `Token darf keine Gists lesen/schreiben (403). Berechtigung „Gists" fehlt.`;
      }
      return anonymous
        ? "GitHub-Limit erreicht (60 Abrufe je Stunde ohne eigenen Zugang). In einer Stunde geht es wieder — oder du legst dir einen eigenen Zugang an, dann sind es 5000."
        : "GitHub-Limit erreicht. In einer Stunde geht es wieder.";
    case 404:
      return "Kein Regal unter dieser Kennung (404). Tippfehler im Link — oder der Besitzer hat es gelöscht.";
    case 422:
      return `GitHub hat die Daten abgelehnt (422). ${body.slice(0, 200)}`;
    default:
      return `GitHub antwortet ${response.status}. ${body.slice(0, 200)}`;
  }
}

/**
 * Aus einem geteilten Link die Kennung holen.
 *
 * Bewusst großzügig: Philipp wird Link, Kennung oder etwas dazwischen
 * weitergeben, je nachdem was WhatsApp aus der Adresse gemacht hat. Eine
 * Kennung ist bei GitHub hexadezimal — daran lässt sie sich aus jedem Text
 * herausziehen.
 */
export function shelfIdFromLink(text: string): string {
  const trimmed = text.trim();
  const hits = trimmed.match(/[0-9a-f]{20,40}/gi);
  if (hits && hits.length > 0) return hits[hits.length - 1]!.toLowerCase();
  // Kein Muster gefunden: vielleicht hat jemand eine kurze Kennung eingetippt.
  return /^[0-9a-z]+$/i.test(trimmed) ? trimmed.toLowerCase() : "";
}

export function shelfUrl(gistId: string): string {
  return `https://gist.github.com/${gistId}`;
}

/** Findet das eigene Regal am Erkennungsmerkmal — oder legt es an. */
export async function findOrCreateShelfGist(token: string): Promise<string> {
  for (const page of [1, 2, 3]) {
    const body = await request(token, `/gists?per_page=100&page=${page}`);
    const list = Array.isArray(body) ? (body as GistResponse[]) : [];
    const hit = list.find((gist) => (gist.description ?? "").startsWith(SHELF_MARKER));
    if (hit?.id !== undefined) return hit.id;
    if (list.length < 100) break;
  }
  const created = (await request(token, "/gists", {
    method: "POST",
    body: JSON.stringify({
      description: SHELF_DESCRIPTION,
      // „public: false" heißt bei Gists NICHT privat, sondern nur „nicht
      // auffindbar". Wer die Kennung hat, liest mit — deshalb ist der Inhalt
      // verschlüsselt und nicht bloß versteckt.
      public: false,
      files: { [SHELF_FILE]: { content: `{"v":1,"enc":"none","data":"{}"}` } },
    }),
  })) as GistResponse;
  if (created.id === undefined) throw new SyncError("GitHub hat keine Gist-ID zurückgegeben.");
  return created.id;
}

export interface ReadShelfResult {
  shelf: Shelf;
  /** Server-Zeitstempel — für „zuletzt gesehen" in der Liste. */
  serverUpdatedAt: string;
}

/**
 * Ein fremdes (oder eigenes) Regal lesen und öffnen.
 *
 * `token` darf leer sein. Er dient hier ausschließlich dem Abruf-Limit.
 */
export async function readShelf(
  gistId: string,
  passphrase: string,
  token = "",
): Promise<ReadShelfResult> {
  const gist = (await request(token, `/gists/${gistId}`)) as GistResponse;
  const file = gist.files?.[SHELF_FILE];
  if (!file) {
    throw new SyncError(
      `In dieser Ablage liegt kein Regal (die Datei „${SHELF_FILE}" fehlt). Ist das die Kennung des Geräte-Abgleichs?`,
    );
  }
  if (file.truncated === true || (file.size ?? 0) >= TRUNCATION_LIMIT) {
    throw new SyncError(
      "Das Regal ist zu groß, GitHub liefert es abgeschnitten. Der Besitzer sollte weniger freigeben oder die Porträts kleiner halten.",
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(file.content ?? "");
  } catch {
    throw new SyncError("Die Regal-Datei ist beschädigt (kein gültiges JSON).");
  }
  const plain = await openEnvelope(raw, passphrase);
  let inner: unknown;
  try {
    inner = JSON.parse(plain);
  } catch {
    throw new SyncError("Das Regal ließ sich öffnen, ist aber innen beschädigt.");
  }
  return { shelf: parseShelf(inner), serverUpdatedAt: gist.updated_at ?? "" };
}

/** Das eigene Regal schreiben. Braucht den eigenen Token. */
export async function writeShelf(
  token: string,
  gistId: string,
  shelf: Shelf,
  passphrase: string,
): Promise<string> {
  const envelope = await sealText(JSON.stringify(shelf), passphrase);
  const content = JSON.stringify(envelope);
  if (content.length > MAX_SHELF_BYTES) {
    throw new SyncError(
      `Das Regal ist mit ${Math.round(content.length / 1024)} KB zu groß für eine Gist-Datei. Gib weniger Bögen frei oder nimm die Porträts heraus — GitHub schneidet ab 1 MB ab, und abgeschnitten wäre es unlesbar.`,
    );
  }
  const written = (await request(token, `/gists/${gistId}`, {
    method: "PATCH",
    body: JSON.stringify({
      description: SHELF_DESCRIPTION,
      files: { [SHELF_FILE]: { content } },
    }),
  })) as GistResponse;
  return written.updated_at ?? "";
}
