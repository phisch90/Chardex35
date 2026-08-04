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

/**
 * Gleicht die App auch WÄHREND einer Sitzung ab? Nein — seine Entscheidung.
 *
 * Wörtlich: „Abgleich bitte nur nach dem Start der App. Mitten drin ist Quatsch denn ich
 * spiele ja nicht auf 2 Geräten gleichzeitig. Deaktiviere die Funktion. Nicht löschen!"
 *
 * Deshalb steht der Code für die zwei Auslöser mittendrin weiter hier und hängt nur an
 * dieser Zahl: die Rückkehr in den Vordergrund und das gedrosselte Hochschreiben nach jeder
 * Änderung. Auf `true` gesetzt, ist das alte Verhalten zurück, ohne dass jemand etwas
 * nachbaut.
 *
 * Was BLEIBT, und warum es nicht „mittendrin" ist:
 *
 *  - Der Abgleich beim Start. Das ist genau der, den er behalten will.
 *  - Der „online"-Horcher — aber nur, SOLANGE der Start-Abgleich noch nicht einmal
 *    durchgelaufen ist. Am Spieltisch ist kein Netz der Normalfall, der Start-Abgleich
 *    fällt dort also aus; kommt das Netz später, wird er nachgeholt. Das vollendet den
 *    Start, es ist kein zweiter Lauf. Danach schweigt er bis zum nächsten Start.
 *
 * Und die Kehrseite, die dazugehört: eine installierte Web-App auf dem iPhone wird aus dem
 * HINTERGRUND geholt und selten wirklich neu geladen — genau die Beobachtung, die schon beim
 * „Es kommt kein Update" dahinterstand. Ohne den Vordergrund-Horcher kann zwischen zwei
 * echten Starts also viel Zeit liegen. Der Knopf „Jetzt abgleichen" in den Einstellungen ist
 * dafür der Weg, und der Kleintext am Schalter sagt es jetzt auch.
 */
const MID_SESSION_SYNC = false;

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus);
}

/**
 * Fingerabdruck des lokalen Bestands: Anzahl, Summe aller rev und der jüngste
 * Zeitstempel. Ändert sich genau dann, wenn irgendein Dokument geschrieben
 * wurde — billiger und zuverlässiger, als an jeder Schreibstelle einen Haken
 * einzubauen.
 *
 * „Billiger" stimmt nur im Vergleich zu Haken an jeder Schreibstelle: die Abfrage liest
 * bei JEDEM Schreibvorgang ALLE Charaktere aus der Datenbank, samt Porträt. Solange der
 * Abgleich nach Änderungen lief, hat das etwas gekauft. Jetzt tut es das nicht mehr
 * (`MID_SESSION_SYNC`), also läuft die Abfrage auch nicht mehr — sonst wäre sie genau das,
 * was dieses Projekt an anderer Stelle „Kosten ohne Grund" nennt: bei jedem TP-Tipp die
 * ganze Datenbank lesen, damit niemand das Ergebnis ansieht.
 *
 * Der Hook BLEIBT und wird unbedingt gerufen — ein Hook hinter einer Bedingung ist kein
 * Hook (zehnte Falle in CLAUDE.md). Übersprungen wird nur die Arbeit darin.
 */
function useLocalFingerprint(): string | undefined {
  return useLiveQuery(async () => {
    if (!MID_SESSION_SYNC) return undefined;
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
 *  - und, falls der Start offline war, sobald das Netz zurückkehrt
 *
 * Mehr nicht — während einer Sitzung wird nicht abgeglichen (`MID_SESSION_SYNC`).
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

  /**
   * Ist der Abgleich beim Start einmal WIRKLICH durchgelaufen?
   *
   * Nicht dasselbe wie „wurde versucht": offline bricht `run` sofort ab. Genau daran hängt,
   * ob der „online"-Horcher noch etwas nachzuholen hat oder ob er bis zum nächsten Start
   * schweigt.
   */
  const startDone = useRef(false);

  const run = useRef(() => {
    // Offline gar nicht erst versuchen: am Spieltisch ist kein Netz der
    // Normalfall, und ein rotes Fähnchen wäre dort nur Lärm. Der
    // „online"-Horcher holt das nach.
    if (navigator.onLine === false) return;
    void syncNow()
      .then(() => {
        startDone.current = true;
        synced.current = latest.current ?? null;
      })
      .catch(() => undefined);
  }).current;

  // Start — und das Nachholen, falls er offline ausfiel.
  useEffect(() => {
    if (!active) return;
    run();

    /*
      Nur nachholen, nicht wiederholen: hat der Start-Abgleich schon geklappt, tut ein
      „online" nichts mehr. Ohne diese Abfrage wäre der Horcher ein Abgleich mittendrin —
      am Spieltisch fällt das Netz gern mehrmals aus und wieder ein.
    */
    const onOnline = () => {
      if (startDone.current) return;
      run();
    };
    window.addEventListener("online", onOnline);

    /*
      Rückkehr in den Vordergrund: AUS (seine Entscheidung, siehe `MID_SESSION_SYNC`).
      Der Horcher steht weiter hier, damit die Zeile wieder wirkt, sobald der Schalter
      umgelegt wird.
    */
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    if (MID_SESSION_SYNC) document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("online", onOnline);
      if (MID_SESSION_SYNC) document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, run]);

  // Gedrosselt nach lokalen Änderungen — AUS (seine Entscheidung). Der erste bekannte
  // Stand setzt nur die Grundlinie; für ihn läuft schon der Abgleich beim Start.
  useEffect(() => {
    if (!MID_SESSION_SYNC) return;
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
