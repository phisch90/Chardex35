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

// ---------------------------------------------------------------------------
// Konfliktkopien: Beschriftung und Bremse
// ---------------------------------------------------------------------------

/** Anhängsel einer Konfliktkopie — eine Stelle, damit Erzeugen und Erkennen nie auseinanderlaufen. */
const CONFLICT_SUFFIX = /\s*\(Konflikt [^)]*\)\s*$/u;

/** „Hike (Konflikt iPhone, 2026-07-27)" → „Hike". Mehrfach angehängt: alle weg. */
export function stripConflictSuffix(name: string): string {
  let out = name;
  while (CONFLICT_SUFFIX.test(out)) out = out.replace(CONFLICT_SUFFIX, "");
  const trimmed = out.trim();
  return trimmed === "" ? name.trim() : trimmed;
}

/**
 * Name einer Konfliktkopie. Erst das alte Anhängsel abschneiden: sonst heißt die
 * Kopie einer Kopie „Hike (Konflikt hier, …) (Konflikt hier, …)" und ist in der
 * Liste nicht mehr zu lesen.
 */
export function conflictCopyName(name: string, from: string, day: string): string {
  return `${stripConflictSuffix(name)} (Konflikt ${from}, ${day})`;
}

/**
 * Fingerabdruck des INHALTS: ohne Sync-Buchhaltung, ohne id und ohne das
 * Konflikt-Anhängsel am Namen. Beantwortet die Frage „habe ich diesen Stand
 * schon irgendwo im Bestand?" — und zwar auch dann, wenn er als Kopie unter
 * neuer id und mit Anhängsel dort liegt.
 *
 * Der Name selbst zählt mit (nur ohne Anhängsel): eine Umbenennung IST eine
 * Änderung, die man nicht wegwerfen darf.
 */
export function contentFingerprint(doc: object): string {
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === "id" || key === "rev" || key === "updatedAt" || key === "deletedAt") continue;
    rest[key] = key === "name" && typeof value === "string" ? stripConflictSuffix(value) : value;
  }
  return canonicalJson(rest, 0);
}

/**
 * Welche Konflikte brauchen wirklich eine Kopie?
 *
 * Eine Kopie ist dafür da, den Stand des Verlierers zu RETTEN. Liegt genau
 * dieser Stand schon als eigenes Dokument im Bestand, gibt es nichts zu retten
 * — dann wäre die Kopie nur eine weitere Zeile in der Charakterliste.
 *
 * Diese Bremse ist aus Schaden gebaut. Eine Konfliktursache, die bei JEDEM
 * Abgleich erneut zuschlägt, erzeugte vorher pro Abgleich eine weitere Kopie:
 * aus einem Charakter wurden binnen Minuten sieben. Die Ursache ist behoben
 * (beide Seiten werden vor dem Vergleich durchs Schema geschickt) — aber eine
 * Kopiervorlage, die sich selbst vervielfältigt, darf gar nicht möglich sein,
 * egal aus welchem Grund ein Konflikt wiederkehrt.
 *
 * Tombstones fallen ebenfalls heraus: aus einer Löschung eine „gerettete"
 * Kopie zu machen wäre genau die Wiederauferstehung, die niemand will.
 */
export function conflictCopiesNeeded<T extends SyncDoc>(
  conflicts: SyncConflict<T>[],
  existing: T[],
): SyncConflict<T>[] {
  const known = new Set(
    existing.filter((doc) => doc.deletedAt === undefined).map((doc) => contentFingerprint(doc)),
  );
  const out: SyncConflict<T>[] = [];
  for (const conflict of conflicts) {
    if (conflict.loser.deletedAt !== undefined) continue;
    const print = contentFingerprint(conflict.loser);
    if (known.has(print)) continue;
    known.add(print); // zwei gleiche Verlierer in EINEM Lauf ergeben eine Kopie
    out.push(conflict);
  }
  return out;
}

/**
 * Konfliktkopien, die niemand braucht: solche, deren Inhalt schon unter einem
 * anderen Dokument im Bestand liegt.
 *
 * Zum Aufräumen dessen, was die Lawine hinterlassen hat — und bewusst
 * vorsichtig:
 *
 *  - Nur Dokumente MIT Konflikt-Anhängsel kommen überhaupt in Frage. Alles, was
 *    von Hand angelegt oder importiert wurde, bleibt unangetastet, selbst wenn
 *    es doppelt aussieht: ob zwei gleich aussehende Figuren dasselbe sind, weiß
 *    nur der Mensch davor.
 *  - Eine Kopie mit EINZIGARTIGEM Inhalt bleibt. Genau für sie gibt es
 *    Konfliktkopien überhaupt.
 *  - Gibt es zu einem Inhalt nur Kopien und kein Original, bleibt eine übrig.
 */
export function redundantConflictCopies<T extends SyncDoc & { name: string }>(docs: T[]): T[] {
  const alive = docs.filter((doc) => doc.deletedAt === undefined);
  const groups = new Map<string, T[]>();
  for (const doc of alive) {
    const print = contentFingerprint(doc);
    const group = groups.get(print);
    if (group) group.push(doc);
    else groups.set(print, [doc]);
  }

  const out: T[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const isCopy = (doc: T) => stripConflictSuffix(doc.name) !== doc.name;
    const original = group.find((doc) => !isCopy(doc));
    // Ohne Original bleibt die Kopie mit der kleinsten id — irgendeine muss
    // bleiben, und die Wahl muss auf beiden Geräten dieselbe sein.
    const keep = original ?? [...group].sort((a, b) => a.id.localeCompare(b.id))[0];
    for (const doc of group) {
      if (doc.id !== keep?.id && isCopy(doc)) out.push(doc);
    }
  }
  return out;
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
