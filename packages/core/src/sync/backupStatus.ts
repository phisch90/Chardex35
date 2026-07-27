/**
 * Wie gut stehen die Daten außerhalb dieses einen Browser-Speichers?
 *
 * Der Anlass ist ein echter Vorfall: auf iOS haben Safari und die
 * Startbildschirm-App GETRENNTE Speicher, und wer das Symbol vom
 * Startbildschirm löscht, nimmt die Daten der App mit. Die Charaktere lagen
 * noch in Safari — aber die App zeigte eine leere Liste, und nichts in der
 * Oberfläche hatte je gesagt, dass es nur diese eine Kopie gibt.
 *
 * Deshalb ist der Zustand jetzt sichtbar, statt bis zum Verlust unsichtbar zu
 * bleiben. Eine „automatische lokale Sicherung“ wäre hier übrigens wertlos
 * gewesen: sie hätte im selben Speicher gelegen, der verschwunden ist. Zählen
 * nur Kopien AUSSERHALB — der Gist-Abgleich oder eine exportierte Datei.
 */
export interface BackupInput {
  /** ISO-Zeitstempel „jetzt“ — als Parameter, damit die Regeln testbar sind. */
  now: string;
  characterCount: number;
  syncConnected: boolean;
  /** ISO-Zeitstempel oder "" für „nie“. */
  lastSyncAt: string;
  /** ISO-Zeitstempel oder "" für „nie“. */
  lastExportAt: string;
}

export interface BackupStatus {
  tone: "ok" | "hinweis" | "warnung";
  message: string;
  /** Tage seit der jüngsten Kopie außerhalb dieses Speichers; null = keine. */
  ageDays: number | null;
}

/** Ab hier gilt ein Abgleich als eingeschlafen. */
const SYNC_STALE_DAYS = 7;
/** Ab hier gilt eine exportierte Datei als zu alt, um sich darauf zu verlassen. */
const EXPORT_STALE_DAYS = 14;

function daysBetween(from: string, to: string): number | null {
  if (from === "") return null;
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}

function ago(days: number): string {
  if (days === 0) return "heute";
  if (days === 1) return "gestern";
  return `vor ${days} Tagen`;
}

export function backupStatus(input: BackupInput): BackupStatus {
  const syncAge = daysBetween(input.lastSyncAt, input.now);
  const exportAge = daysBetween(input.lastExportAt, input.now);
  const ageDays =
    syncAge === null ? exportAge : exportAge === null ? syncAge : Math.min(syncAge, exportAge);

  // Ohne Charaktere gibt es nichts zu verlieren — dann auch keine Mahnung.
  if (input.characterCount === 0) {
    return { tone: "ok", message: "Noch keine Charaktere zu sichern.", ageDays };
  }

  if (input.syncConnected && syncAge !== null && syncAge <= SYNC_STALE_DAYS) {
    return {
      tone: "ok",
      message: `Abgeglichen ${ago(syncAge)} — eine Kopie liegt in deinem privaten Gist.`,
      ageDays,
    };
  }

  if (input.syncConnected) {
    return {
      tone: "hinweis",
      message:
        syncAge === null
          ? "Der Abgleich ist eingerichtet, hat aber noch nie gelaufen. Öffne die App online oder tippe auf „Jetzt abgleichen“."
          : `Letzter Abgleich ${ago(syncAge)} — länger als ${SYNC_STALE_DAYS} Tage her.`,
      ageDays,
    };
  }

  if (exportAge === null) {
    return {
      tone: "warnung",
      message:
        "Deine Charaktere liegen NUR in diesem Browser-Speicher. Noch keine Sicherung — exportiere sie einmal oder richte den Geräte-Abgleich ein.",
      ageDays,
    };
  }

  if (exportAge > EXPORT_STALE_DAYS) {
    return {
      tone: "hinweis",
      message: `Letzte Sicherung ${ago(exportAge)}. Alles seitdem hängt an diesem einen Speicher.`,
      ageDays,
    };
  }

  return {
    tone: "ok",
    message: `Gesichert ${ago(exportAge)} — die Datei liegt bei dir.`,
    ageDays,
  };
}
