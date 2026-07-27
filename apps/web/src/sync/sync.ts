import {
  CURRENT_EXPORT_FORMAT_VERSION,
  CURRENT_SCHEMA_VERSION,
  canonicalJson,
  characterSchema,
  conflictCopiesNeeded,
  conflictCopyName,
  entitySchema,
  mergeDocSets,
  type Character,
  type Entity,
  type SyncConflict,
} from "@codex35/core";
import { db } from "../db/db.js";
import {
  hydrateCharacterRow,
  hydrateEntityRow,
  migrateAndParseCharacter,
  migrateAndParseEntity,
} from "../db/repo.js";
import {
  CHAR_PREFIX,
  HOMEBREW_PREFIX,
  MAX_DOC_BYTES,
  META_FILE,
  SyncError,
  findOrCreateSyncGist,
  readGistStamp,
  readSyncGist,
  syncFileName,
  writeSyncGist,
} from "./gist.js";
import { SyncSettingsRepo, isSyncConfigured, type SyncSettings } from "./syncSettings.js";

export interface SyncReport {
  at: string;
  /** Dokumente, die von der Gegenseite übernommen wurden. */
  pulled: number;
  /** Dokumente, die hochgeschrieben wurden. */
  pushed: number;
  /** Namen der Charaktere/Einträge, bei denen eine Konfliktkopie entstand. */
  conflicts: string[];
  /** Dateien in der Ablage, die nicht gelesen werden konnten. */
  skipped: string[];
  /** Dokumente, die zu groß für die Ablage sind (fast immer ein Porträt). */
  tooBig: string[];
}

export type SyncState = "off" | "idle" | "syncing" | "error";

export interface SyncStatus {
  state: SyncState;
  lastSyncAt: string;
  message: string;
  lastReport: SyncReport | null;
}

/**
 * Der Gegenstand hat sich geändert, während wir gemischt haben — der Abgleich
 * beginnt von vorn, statt fremde Änderungen zu überschreiben.
 */
class RemoteMovedError extends Error {}

// ---------------------------------------------------------------------------
// Status: winziger Store, damit Einstellungen und Kopfzeile dasselbe sehen
// ---------------------------------------------------------------------------

let status: SyncStatus = { state: "off", lastSyncAt: "", message: "", lastReport: null };
const listeners = new Set<() => void>();

export function getSyncStatus(): SyncStatus {
  return status;
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch };
  for (const listener of listeners) listener();
}

/**
 * Aus den Einstellungen vorbelegen. Läuft auch, wenn sich an den Einstellungen
 * etwas ändert — und darf deshalb einen laufenden Abgleich oder eine
 * Fehlermeldung NICHT übermalen, sonst verschwindet der Fehler beim nächsten
 * Umschalten eines Hakens.
 */
export async function primeSyncStatus(): Promise<void> {
  const cfg = await SyncSettingsRepo.get();
  if (!isSyncConfigured(cfg)) {
    setStatus({ state: "off", lastSyncAt: "", message: "", lastReport: null });
    return;
  }
  if (status.state === "syncing" || status.state === "error") {
    setStatus({ lastSyncAt: cfg.lastSyncAt });
    return;
  }
  setStatus({ state: "idle", lastSyncAt: cfg.lastSyncAt, message: "" });
}

// ---------------------------------------------------------------------------
// Abgleich
// ---------------------------------------------------------------------------

let inFlight: Promise<SyncReport> | null = null;

/**
 * Ein Abgleich zur Zeit. Wer während eines laufenden Abgleichs fragt, bekommt
 * dessen Ergebnis — der Planer prüft danach erneut, ob sich inzwischen etwas
 * geändert hat, damit keine Änderung liegen bleibt.
 */
export function syncNow(): Promise<SyncReport> {
  if (inFlight) return inFlight;
  const run = runSync().finally(() => {
    inFlight = null;
  });
  inFlight = run;
  return run;
}

export function isSyncing(): boolean {
  return inFlight !== null;
}

async function runSync(): Promise<SyncReport> {
  const cfg = await SyncSettingsRepo.get();
  if (!isSyncConfigured(cfg)) {
    setStatus({ state: "off", message: "" });
    throw new SyncError("Der Abgleich ist auf diesem Gerät nicht eingerichtet.");
  }

  setStatus({ state: "syncing", message: "" });
  try {
    let report: SyncReport | null = null;
    for (let attempt = 0; attempt < 2 && report === null; attempt++) {
      try {
        report = await runOnce(cfg);
      } catch (error) {
        if (error instanceof RemoteMovedError && attempt === 0) continue;
        throw error;
      }
    }
    if (report === null) throw new SyncError("Die Ablage änderte sich zu schnell. Bitte erneut versuchen.", true);

    await SyncSettingsRepo.patch({ lastSyncAt: report.at });
    setStatus({ state: "idle", lastSyncAt: report.at, message: "", lastReport: report });
    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus({ state: "error", message });
    throw error;
  }
}

async function runOnce(cfg: SyncSettings): Promise<SyncReport> {
  const skipped: string[] = [];
  const snapshot = await readSyncGist(cfg.token, cfg.gistId);
  for (const name of snapshot.truncated) {
    skipped.push(`${name} (zu groß, von GitHub abgeschnitten)`);
  }

  const remoteChars: Character[] = [];
  const remoteEntities: Entity[] = [];
  for (const [name, content] of Object.entries(snapshot.files)) {
    const isChar = name.startsWith(CHAR_PREFIX);
    const isHomebrew = name.startsWith(HOMEBREW_PREFIX);
    if (!isChar && !isHomebrew) continue;
    try {
      const raw: unknown = JSON.parse(content);
      if (isChar) {
        remoteChars.push(migrateAndParseCharacter(raw));
      } else {
        const entity = migrateAndParseEntity(raw);
        // SRD kommt nie über den Abgleich — Slugs lösen lokal auf.
        if (entity.source === "homebrew") remoteEntities.push(entity);
      }
    } catch {
      // Eine kaputte Datei darf nicht den ganzen Abgleich blockieren.
      skipped.push(name);
    }
  }

  // Tombstones MÜSSEN mit — sonst kommt ein gelöschter Charakter vom anderen
  // Gerät bei jedem Abgleich zurück.
  //
  // Und BEIDE Seiten gehen vor dem Vergleich durchs Schema. Das ist keine
  // Kosmetik, sondern die Lehre aus einem echten Datenschaden: die Gegenseite
  // wurde beim Lesen immer geparst (oben migrateAndParse…), die eigene Zeile kam
  // roh aus IndexedDB. Fehlt in dieser Zeile ein Feld, das das Schema inzwischen
  // mit einem Standardwert füllt, sind beide Seiten bei GLEICHER rev inhaltlich
  // verschieden — Konflikt. Und weil die Ursache beim nächsten Abgleich
  // unverändert dasteht: wieder Konflikt. Aus einem Hike Greatbush wurden so
  // sieben, eine Kopie pro Abgleich.
  const localChars = (await db.characters.toArray()).map(hydrateCharacterRow);
  const localEntities = (await db.entities.where("source").equals("homebrew").toArray()).map(
    hydrateEntityRow,
  );

  const chars = mergeDocSets(localChars, remoteChars);
  const entities = mergeDocSets(localEntities, remoteEntities);

  const now = new Date();
  // Zweite Sicherung gegen dieselbe Klasse von Fehler: eine Kopie entsteht nur,
  // wenn ihr Inhalt nicht sowieso schon im Bestand liegt (siehe core).
  const charCopies = conflictCopiesNeeded(chars.conflicts, chars.merged).map((c) =>
    copyCharacter(c, cfg, now),
  );
  const entityCopies = conflictCopiesNeeded(entities.conflicts, entities.merged).map((c) =>
    copyEntity(c, cfg, now),
  );
  const conflicts = [...charCopies, ...entityCopies].map((doc) => doc.name);

  // 1. Lokal schreiben. Konfliktkopien gehören auf BEIDE Seiten, damit sie
  //    nicht beim nächsten Abgleich als „nur hier vorhanden" wieder auffallen.
  const charWrites = [...chars.toLocal, ...charCopies];
  const entityWrites = [...entities.toLocal, ...entityCopies];
  if (charWrites.length > 0 || entityWrites.length > 0) {
    await db.transaction("rw", db.characters, db.entities, async () => {
      for (const doc of charWrites) await db.characters.put(doc);
      for (const doc of entityWrites) await db.entities.put(doc);
    });
  }

  // 2. Hochschreiben.
  const tooBig: string[] = [];
  const patch: Record<string, string | null> = {};
  for (const doc of [...chars.toRemote, ...charCopies]) {
    addToPatch(patch, tooBig, CHAR_PREFIX, doc.id, doc.name, doc);
  }
  for (const doc of [...entities.toRemote, ...entityCopies]) {
    addToPatch(patch, tooBig, HOMEBREW_PREFIX, doc.id, doc.name, doc);
  }

  const pushed = Object.keys(patch).length;
  if (pushed > 0) {
    patch[META_FILE] = canonicalJson({
      app: "chardex35",
      formatVersion: CURRENT_EXPORT_FORMAT_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastWriteAt: now.toISOString(),
      lastWriteBy: cfg.deviceName,
    });

    // Wächter: hat jemand zwischen unserem Lesen und diesem Schreiben etwas
    // geändert, fangen wir neu an. Das Restrisiko (Schreiben genau zwischen
    // Prüfung und PATCH) ist bei einem Nutzer mit zwei Geräten vernachlässigbar
    // — die Gist-API kennt kein bedingtes Schreiben.
    const stampNow = await readGistStamp(cfg.token, cfg.gistId);
    if (stampNow !== snapshot.serverUpdatedAt) throw new RemoteMovedError();

    await writeSyncGist(cfg.token, cfg.gistId, patch);
  }

  return {
    at: new Date().toISOString(),
    pulled: chars.toLocal.length + entities.toLocal.length,
    pushed,
    conflicts,
    skipped,
    tooBig,
  };
}

function addToPatch(
  patch: Record<string, string | null>,
  tooBig: string[],
  prefix: string,
  id: string,
  name: string,
  doc: unknown,
): void {
  const json = canonicalJson(doc);
  if (new TextEncoder().encode(json).length > MAX_DOC_BYTES) {
    tooBig.push(name);
    return;
  }
  patch[syncFileName(prefix, id)] = json;
}

/**
 * Konfliktkopie: derselbe Stand unter neuer ID und sprechendem Namen. Bei
 * gleichem Stand auf beiden Seiten gewinnt einer — der andere darf nicht
 * einfach verschwinden, sonst ist am Spieltisch Arbeit weg.
 */
function copyCharacter(
  conflict: SyncConflict<Character>,
  cfg: SyncSettings,
  now: Date,
): Character {
  const raw: Record<string, unknown> = { ...conflict.loser };
  delete raw.deletedAt;
  return characterSchema.parse({
    ...raw,
    id: crypto.randomUUID(),
    rev: 1,
    updatedAt: now.toISOString(),
    name: copyName(conflict, cfg, now),
  });
}

function copyEntity(conflict: SyncConflict<Entity>, cfg: SyncSettings, now: Date): Entity {
  const raw: Record<string, unknown> = { ...conflict.loser };
  delete raw.deletedAt;
  // `overrides` fällt weg: eine Kopie soll nichts verdecken, sie soll nur
  // sichtbar im Kompendium liegen, bis er sie angesehen hat.
  delete raw.overrides;
  return entitySchema.parse({
    ...raw,
    id: crypto.randomUUID(),
    rev: 1,
    updatedAt: now.toISOString(),
    name: copyName(conflict, cfg, now),
  });
}

/**
 * `conflictCopyName` schneidet ein vorhandenes Anhängsel ab, bevor es das neue
 * anhängt — sonst hieße die Kopie einer Kopie „Hike (Konflikt hier, …) (Konflikt
 * anderes Gerät, …)". Dieselbe Funktion erkennt die Kopie später wieder.
 */
function copyName(conflict: SyncConflict<{ name: string }>, cfg: SyncSettings, now: Date): string {
  const from = conflict.loserSide === "local" ? cfg.deviceName || "hier" : "anderes Gerät";
  return conflictCopyName(conflict.loser.name, from, now.toISOString().slice(0, 10));
}

// ---------------------------------------------------------------------------
// Einrichten
// ---------------------------------------------------------------------------

/**
 * Token prüfen, Ablage finden oder anlegen, sofort einmal abgleichen. Bewusst
 * ein Schritt: nach „Verbinden" ist der Bogen entweder da oder es steht ein
 * verständlicher Fehler.
 */
export async function connectSync(token: string, deviceName: string): Promise<SyncReport> {
  const trimmed = token.trim();
  if (trimmed === "") throw new SyncError("Bitte ein Token einfügen.");
  const gistId = await findOrCreateSyncGist(trimmed);
  await SyncSettingsRepo.set({
    provider: "gist",
    token: trimmed,
    gistId,
    auto: true,
    lastSyncAt: "",
    deviceName: deviceName.trim(),
  });
  setStatus({ state: "idle", lastSyncAt: "", message: "", lastReport: null });
  return await syncNow();
}

export async function disconnectSync(): Promise<void> {
  await SyncSettingsRepo.disconnect();
  setStatus({ state: "off", lastSyncAt: "", message: "", lastReport: null });
}
