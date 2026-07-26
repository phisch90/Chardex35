import { useEffect, useRef, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db.js";
import {
  getSyncStatus,
  primeSyncStatus,
  subscribeSyncStatus,
  syncNow,
  type SyncStatus,
} from "./sync.js";
import { SYNC_SETTINGS_KEY, isSyncConfigured, parseSyncSettings } from "./syncSettings.js";

/** Nach der letzten Änderung so lange warten, bevor hochgeschrieben wird. */
const PUSH_DELAY_MS = 4000;

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus);
}

/**
 * Fingerabdruck des lokalen Bestands: Anzahl, Summe aller rev und der jüngste
 * Zeitstempel. Ändert sich genau dann, wenn irgendein Dokument geschrieben
 * wurde — billiger und zuverlässiger, als an jeder Schreibstelle einen Haken
 * einzubauen.
 */
function useLocalFingerprint(): string | undefined {
  return useLiveQuery(async () => {
    const [characters, entities] = await Promise.all([
      db.characters.toArray(),
      db.entities.where("source").equals("homebrew").toArray(),
    ]);
    let revs = 0;
    let latest = "";
    for (const doc of [...characters, ...entities]) {
      revs += doc.rev;
      if (doc.updatedAt > latest) latest = doc.updatedAt;
    }
    return `${characters.length}/${entities.length}/${revs}/${latest}`;
  }, []);
}

/**
 * Hält den Abgleich am Laufen, ohne eigene Oberfläche:
 *
 *  - beim Start einmal (dann steht auf dem iPad der letzte Stand da)
 *  - wenn die App wieder in den Vordergrund kommt oder das Netz zurückkehrt
 *  - gedrosselt nach jeder lokalen Änderung
 *
 * Fehler landen nur im Status (die Einstellungen zeigen sie an) — ein
 * fehlgeschlagener Abgleich darf niemals eine Spielsession unterbrechen.
 */
export function SyncGate() {
  const settingsRow = useLiveQuery(() => db.settings.get(SYNC_SETTINGS_KEY), []);
  const fingerprint = useLocalFingerprint();

  const settings = settingsRow === undefined ? null : parseSyncSettings(settingsRow.value);
  const active = settings !== null && isSyncConfigured(settings) && settings.auto;

  /** Immer der aktuellste Fingerabdruck — ohne veraltete Closure. */
  const latest = useRef<string | undefined>(undefined);
  latest.current = fingerprint;
  /** Stand, der zuletzt abgeglichen wurde. */
  const synced = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void primeSyncStatus();
  }, [settingsRow]);

  const run = useRef(() => {
    // Offline gar nicht erst versuchen: am Spieltisch ist kein Netz der
    // Normalfall, und ein rotes Fähnchen wäre dort nur Lärm. Der
    // „online"-Horcher holt das nach.
    if (navigator.onLine === false) return;
    void syncNow()
      .then(() => {
        synced.current = latest.current ?? null;
      })
      .catch(() => undefined);
  }).current;

  // Start, Rückkehr in den Vordergrund, Netz wieder da.
  useEffect(() => {
    if (!active) return;
    run();
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", run);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", run);
    };
  }, [active, run]);

  // Gedrosselt nach lokalen Änderungen. Der erste bekannte Stand setzt nur die
  // Grundlinie — für ihn läuft schon der Abgleich beim Start.
  useEffect(() => {
    if (!active || fingerprint === undefined) return;
    if (synced.current === null) {
      synced.current = fingerprint;
      return;
    }
    if (synced.current === fingerprint) return;

    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(run, PUSH_DELAY_MS);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [active, fingerprint, run]);

  return null;
}
