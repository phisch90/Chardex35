import { canonicalJson } from "../schema/character.js";

/**
 * Zusammenführen zweier Bestände OHNE Server. Jedes Dokument trägt `rev` und
 * `updatedAt`, Löschungen sind Tombstones (`deletedAt`) — damit lässt sich der
 * Abgleich rein aus den Dokumenten selbst entscheiden, es braucht keine
 * Änderungshistorie und keine Uhr, die beide Geräte teilen.
 *
 * Reihenfolge der Regeln:
 *   1. gleicher Inhalt  → die höhere rev gewinnt (Buchhaltung konvergiert)
 *   2. höhere rev        → gewinnt
 *   3. rev gleich, Inhalt verschieden → KONFLIKT: die neuere `updatedAt`
 *      gewinnt, aber der Verlierer wird herausgegeben, damit der Aufrufer ihn
 *      sichern kann. Stillschweigend Arbeit wegwerfen darf ein Sync nicht.
 */
export interface SyncDoc {
  id: string;
  rev: number;
  updatedAt: string;
  deletedAt?: string | undefined;
}

export interface SyncConflict<T> {
  id: string;
  winner: T;
  loser: T;
  /** Von welcher Seite der Verlierer stammt — für eine sprechende Beschriftung. */
  loserSide: "local" | "remote";
}

export interface MergeOutcome<T> {
  /** Der zusammengeführte Gesamtbestand. */
  merged: T[];
  /** Muss lokal geschrieben werden (die Gegenseite war neuer). */
  toLocal: T[];
  /** Muss zur Gegenseite (wir waren neuer). */
  toRemote: T[];
  /** Gleiche rev, verschiedener Inhalt — hier wäre sonst etwas verloren. */
  conflicts: SyncConflict<T>[];
}

/** Inhaltsvergleich ohne die Sync-Buchhaltung: rev und updatedAt zählen nicht. */
function sameContent<T extends SyncDoc>(a: T, b: T): boolean {
  const strip = ({ rev: _rev, updatedAt: _updatedAt, ...rest }: T) => rest;
  return canonicalJson(strip(a), 0) === canonicalJson(strip(b), 0);
}

/** Leeres `updatedAt` (Default im Schema) gilt als „ganz alt". */
function newer(a: SyncDoc, b: SyncDoc): boolean {
  return a.updatedAt > b.updatedAt;
}

export function mergeDocSets<T extends SyncDoc>(local: T[], remote: T[]): MergeOutcome<T> {
  const localById = new Map(local.map((d) => [d.id, d]));
  const remoteById = new Map(remote.map((d) => [d.id, d]));
  const out: MergeOutcome<T> = { merged: [], toLocal: [], toRemote: [], conflicts: [] };

  // Sortierte Vereinigung: gleiche Eingaben → gleiche Ausgabe, egal in welcher
  // Reihenfolge die Datenbank ihre Zeilen liefert.
  for (const id of [...new Set([...localById.keys(), ...remoteById.keys()])].sort()) {
    const l = localById.get(id);
    const r = remoteById.get(id);

    if (l && !r) {
      out.merged.push(l);
      out.toRemote.push(l);
      continue;
    }
    if (r && !l) {
      out.merged.push(r);
      out.toLocal.push(r);
      continue;
    }
    if (!l || !r) continue;

    if (sameContent(l, r)) {
      if (l.rev === r.rev) {
        out.merged.push(l);
      } else if (l.rev > r.rev) {
        out.merged.push(l);
        out.toRemote.push(l);
      } else {
        out.merged.push(r);
        out.toLocal.push(r);
      }
      continue;
    }

    if (l.rev > r.rev) {
      out.merged.push(l);
      out.toRemote.push(l);
      continue;
    }
    if (r.rev > l.rev) {
      out.merged.push(r);
      out.toLocal.push(r);
      continue;
    }

    // Beide Seiten haben denselben Stand unterschiedlich weitergeschrieben.
    // Der Gewinner bekommt rev+1, damit der nächste Abgleich nicht wieder auf
    // Gleichstand läuft, und geht deshalb an BEIDE Seiten.
    // Die Gegenseite muss STRIKT neuer sein, um zu gewinnen — bei gleichem
    // Zeitstempel behält das Gerät, an dem man gerade sitzt, seinen Stand.
    const winnerIsLocal = !newer(r, l);
    const winnerSource = winnerIsLocal ? l : r;
    const loser = winnerIsLocal ? r : l;
    const winner: T = { ...winnerSource, rev: Math.max(l.rev, r.rev) + 1 };
    out.merged.push(winner);
    out.toLocal.push(winner);
    out.toRemote.push(winner);
    out.conflicts.push({ id, winner, loser, loserSide: winnerIsLocal ? "remote" : "local" });
  }

  return out;
}
