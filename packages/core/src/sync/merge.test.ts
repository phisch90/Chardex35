import { describe, expect, it } from "vitest";
import {
  conflictCopiesNeeded,
  conflictCopyName,
  contentFingerprint,
  mergeDocSets,
  redundantConflictCopies,
  stripConflictSuffix,
  type SyncConflict,
  type SyncDoc,
} from "./merge.js";

interface Doc extends SyncDoc {
  name: string;
}

const doc = (id: string, rev: number, updatedAt: string, name: string, deletedAt?: string): Doc =>
  deletedAt === undefined
    ? { id, rev, updatedAt, name }
    : { id, rev, updatedAt, name, deletedAt };

describe("mergeDocSets", () => {
  it(`nimmt auf, was nur eine Seite hat, und schickt es zur anderen`, () => {
    const out = mergeDocSets([doc("a", 1, "2026-01-01", "A")], [doc("b", 1, "2026-01-01", "B")]);
    expect(out.merged.map((d) => d.id)).toEqual(["a", "b"]);
    expect(out.toRemote.map((d) => d.id)).toEqual(["a"]);
    expect(out.toLocal.map((d) => d.id)).toEqual(["b"]);
    expect(out.conflicts).toHaveLength(0);
  });

  /**
   * Der Wiederherstellungsfall: das Gerät ist leer (Speicher gelöscht, neues
   * Gerät, iOS hat den Web-App-Container mitgenommen), die Ablage hat alles.
   * Genau darauf verlässt sich „Token wieder eintragen und der Charakter ist
   * zurück" — deshalb steht es hier als Test und nicht nur in einer Zusage.
   */
  it(`holt bei leerem Gerät ALLES aus der Ablage zurück`, () => {
    const remote = [
      doc("hike", 7, "2026-07-27T10:00:00Z", "Hike Greatbush"),
      doc("hb-1", 2, "2026-07-27T10:00:00Z", "Templer Schwert"),
    ];
    const out = mergeDocSets([], remote);
    // Reihenfolge ist nach id sortiert (bewusst deterministisch), nicht nach Eingabe.
    expect(out.toLocal.map((d) => d.name).sort()).toEqual(["Hike Greatbush", "Templer Schwert"]);
    expect(out.toRemote).toHaveLength(0); // nichts kaputt-Überschreiben
    expect(out.conflicts).toHaveLength(0);
    // Und ein Tombstone in der Ablage bleibt ein Tombstone — kein Zombie.
    const tombstone = doc("weg", 3, "2026-07-27T10:00:00Z", "Weg", "2026-07-27T09:00:00Z");
    const withTombstone = mergeDocSets([], [tombstone]);
    expect(withTombstone.toLocal[0]?.deletedAt).toBeDefined();
  });

  it(`lässt die höhere rev gewinnen, egal auf welcher Seite`, () => {
    const older = doc("a", 3, "2026-01-01", "alt");
    const newer = doc("a", 4, "2026-01-02", "neu");

    const remoteWins = mergeDocSets([older], [newer]);
    expect(remoteWins.merged[0]?.name).toBe("neu");
    expect(remoteWins.toLocal).toHaveLength(1);
    expect(remoteWins.toRemote).toHaveLength(0);

    const localWins = mergeDocSets([newer], [older]);
    expect(localWins.merged[0]?.name).toBe("neu");
    expect(localWins.toRemote).toHaveLength(1);
    expect(localWins.toLocal).toHaveLength(0);
  });

  it(`schreibt gar nichts, wenn beide Seiten identisch sind`, () => {
    const same = doc("a", 7, "2026-01-01", "A");
    const out = mergeDocSets([same], [{ ...same }]);
    expect(out.toLocal).toHaveLength(0);
    expect(out.toRemote).toHaveLength(0);
    expect(out.conflicts).toHaveLength(0);
  });

  it(`gleicht die rev-Buchhaltung an, wenn der Inhalt gleich, die rev aber verschieden ist`, () => {
    const out = mergeDocSets([doc("a", 9, "2026-01-02", "A")], [doc("a", 4, "2026-01-01", "A")]);
    expect(out.merged[0]?.rev).toBe(9);
    expect(out.toRemote).toHaveLength(1);
    expect(out.toLocal).toHaveLength(0);
    expect(out.conflicts).toHaveLength(0);
  });

  it(`meldet einen Konflikt bei gleicher rev und verschiedenem Inhalt und verliert nichts`, () => {
    const mine = doc("a", 5, "2026-01-02T10:00:00Z", "Handy");
    const theirs = doc("a", 5, "2026-01-02T12:00:00Z", "iPad");
    const out = mergeDocSets([mine], [theirs]);

    expect(out.conflicts).toHaveLength(1);
    // Die neuere Änderung gewinnt …
    expect(out.conflicts[0]?.winner.name).toBe("iPad");
    // … der Verlierer wird herausgegeben, damit der Aufrufer ihn sichern kann.
    expect(out.conflicts[0]?.loser.name).toBe("Handy");
    // Gewinner-rev liegt über BEIDEN, sonst läuft der nächste Abgleich wieder
    // auf Gleichstand — und muss an beide Seiten.
    expect(out.merged[0]?.rev).toBe(6);
    expect(out.toLocal).toHaveLength(1);
    expect(out.toRemote).toHaveLength(1);
  });

  it(`behält bei gleichem Zeitstempel den lokalen Stand`, () => {
    const stamp = "2026-01-02T10:00:00Z";
    const out = mergeDocSets([doc("a", 5, stamp, "hier")], [doc("a", 5, stamp, "dort")]);
    expect(out.merged[0]?.name).toBe("hier");
    expect(out.conflicts[0]?.loser.name).toBe("dort");
  });

  it(`trägt Löschungen als Tombstone mit — eine Leiche mit höherer rev gewinnt`, () => {
    const alive = doc("a", 2, "2026-01-01", "A");
    const dead = doc("a", 3, "2026-01-02", "A", "2026-01-02T00:00:00Z");
    const out = mergeDocSets([alive], [dead]);
    expect(out.merged[0]?.deletedAt).toBe("2026-01-02T00:00:00Z");
    expect(out.toLocal).toHaveLength(1);
  });

  it(`lässt eine Wiederbelebung mit höherer rev die Leiche schlagen`, () => {
    const dead = doc("a", 3, "2026-01-02", "A", "2026-01-02T00:00:00Z");
    const revived = doc("a", 4, "2026-01-03", "A");
    const out = mergeDocSets([revived], [dead]);
    expect(out.merged[0]?.deletedAt).toBeUndefined();
    expect(out.toRemote).toHaveLength(1);
  });

  it(`hier gelöscht, dort weitergespielt: die Löschung gewinnt, der Spielstand bleibt als Verlierer erhalten`, () => {
    // Genau der Fall, in dem eine Konfliktkopie zählt: würde nur die Löschung
    // ankommen, wäre die Arbeit am anderen Gerät weg.
    const deleted = doc("a", 5, "2026-01-02T12:00:00Z", "A", "2026-01-02T12:00:00Z");
    const edited = doc("a", 5, "2026-01-02T10:00:00Z", "A weitergespielt");
    const out = mergeDocSets([deleted], [edited]);

    expect(out.merged[0]?.deletedAt).toBe("2026-01-02T12:00:00Z");
    expect(out.conflicts).toHaveLength(1);
    expect(out.conflicts[0]?.loser.deletedAt).toBeUndefined();
    expect(out.conflicts[0]?.loser.name).toBe("A weitergespielt");
    expect(out.conflicts[0]?.loserSide).toBe("remote");
  });

  it(`umgekehrt: ist die Änderung neuer, gibt es keinen Spielstand zu retten`, () => {
    const edited = doc("a", 5, "2026-01-02T12:00:00Z", "A weitergespielt");
    const deleted = doc("a", 5, "2026-01-02T10:00:00Z", "A", "2026-01-02T10:00:00Z");
    const out = mergeDocSets([edited], [deleted]);

    expect(out.merged[0]?.deletedAt).toBeUndefined();
    expect(out.conflicts).toHaveLength(1);
    // Der Verlierer IST die Leiche — daraus eine Kopie zu machen wäre Unsinn,
    // und genau danach filtert der Aufrufer.
    expect(out.conflicts[0]?.loser.deletedAt).toBe("2026-01-02T10:00:00Z");
  });

  it(`ist unabhängig von der Reihenfolge der Eingaben`, () => {
    const local = [doc("c", 1, "2026-01-01", "C"), doc("a", 2, "2026-01-02", "A")];
    const remote = [doc("b", 1, "2026-01-01", "B"), doc("a", 1, "2026-01-01", "A alt")];
    const forward = mergeDocSets(local, remote);
    const backward = mergeDocSets([...local].reverse(), [...remote].reverse());
    expect(JSON.stringify(forward)).toBe(JSON.stringify(backward));
    expect(forward.merged.map((d) => d.id)).toEqual(["a", "b", "c"]);
  });

  it(`konvergiert: zweiter Abgleich nach dem ersten schreibt nichts mehr`, () => {
    // Zwei Geräte, gemeinsame Gegenseite. Runde 1 löst den Konflikt, Runde 2
    // muss ruhig bleiben — sonst pingpongt der Sync endlos.
    const remote = [doc("a", 5, "2026-01-02T12:00:00Z", "iPad")];
    const local = [doc("a", 5, "2026-01-02T10:00:00Z", "Handy")];

    // Anwenden wie die App: jede Seite übernimmt nur ihre eigene Schreibliste.
    const apply = (set: Doc[], writes: Doc[]): Doc[] => [
      ...set.filter((d) => !writes.some((w) => w.id === d.id)),
      ...writes,
    ];

    const round1 = mergeDocSets(local, remote);
    const afterLocal = apply(local, round1.toLocal);
    const afterRemote = apply(remote, round1.toRemote);

    const round2 = mergeDocSets(afterLocal, afterRemote);
    expect(round2.toLocal).toHaveLength(0);
    expect(round2.toRemote).toHaveLength(0);
    expect(round2.conflicts).toHaveLength(0);
  });

  it(`bleibt auch nach einem zufälligen Änderungsreigen widerspruchsfrei`, () => {
    // Deterministischer Pseudo-Zufall: derselbe Ablauf bei jedem Lauf.
    let seed = 20260726;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    let deviceA: Doc[] = [];
    let deviceB: Doc[] = [];
    let remote: Doc[] = [];
    let clock = 0;
    const stamp = () => `2026-01-01T00:${String(++clock).padStart(4, "0")}Z`;

    const edit = (set: Doc[]): Doc[] => {
      const id = `id-${Math.floor(rnd() * 4)}`;
      const existing = set.find((d) => d.id === id);
      const next: Doc = existing
        ? { ...existing, rev: existing.rev + 1, updatedAt: stamp(), name: `v${existing.rev + 1}` }
        : doc(id, 1, stamp(), "v1");
      if (rnd() < 0.15) next.deletedAt = stamp();
      return [...set.filter((d) => d.id !== id), next];
    };

    for (let step = 0; step < 400; step++) {
      const roll = rnd();
      if (roll < 0.3) deviceA = edit(deviceA);
      else if (roll < 0.6) deviceB = edit(deviceB);
      else if (roll < 0.8) {
        const out = mergeDocSets(deviceA, remote);
        deviceA = out.merged;
        remote = out.merged;
      } else {
        const out = mergeDocSets(deviceB, remote);
        deviceB = out.merged;
        remote = out.merged;
      }
    }

    // Ausgleich bis Ruhe: höchstens wenige Runden, sonst konvergiert es nicht.
    let rounds = 0;
    for (; rounds < 10; rounds++) {
      const a = mergeDocSets(deviceA, remote);
      deviceA = a.merged;
      remote = a.merged;
      const b = mergeDocSets(deviceB, remote);
      deviceB = b.merged;
      remote = b.merged;
      const check = mergeDocSets(deviceA, deviceB);
      if (check.toLocal.length === 0 && check.toRemote.length === 0) break;
    }

    expect(rounds).toBeLessThan(10);
    expect(JSON.stringify(deviceA)).toBe(JSON.stringify(deviceB));
  });
});

// ---------------------------------------------------------------------------
// Konfliktkopien
// ---------------------------------------------------------------------------

describe("Beschriftung von Konfliktkopien", () => {
  it(`schneidet ein vorhandenes Anhängsel ab, statt es zu stapeln`, () => {
    expect(stripConflictSuffix("Hike Greatbush")).toBe("Hike Greatbush");
    expect(stripConflictSuffix("Hike Greatbush (Konflikt iPhone, 2026-07-27)")).toBe("Hike Greatbush");
    // Kopie einer Kopie einer Kopie — genau so sahen die Namen in seiner Liste aus.
    expect(
      stripConflictSuffix("Hike (Konflikt hier, 2026-07-27) (Konflikt anderes Gerät, 2026-07-27)"),
    ).toBe("Hike");
    expect(conflictCopyName("Hike (Konflikt hier, 2026-07-26)", "iPhone", "2026-07-27")).toBe(
      "Hike (Konflikt iPhone, 2026-07-27)",
    );
  });

  it(`lässt einen Namen stehen, der NUR aus einem Anhängsel besteht`, () => {
    // Sonst hieße die Kopie „ (Konflikt …)" und wäre in der Liste unsichtbar.
    expect(stripConflictSuffix("(Konflikt hier, 2026-07-27)")).toBe("(Konflikt hier, 2026-07-27)");
  });
});

describe("contentFingerprint", () => {
  it(`ignoriert Buchhaltung und id — dieselbe Arbeit ist dieselbe Arbeit`, () => {
    const a = doc("original", 5, "2026-07-27T10:00:00Z", "Hike");
    const b = doc("kopie", 1, "2026-07-27T12:00:00Z", "Hike");
    expect(contentFingerprint(a)).toBe(contentFingerprint(b));
  });

  it(`erkennt die Kopie am Anhängsel wieder`, () => {
    const loser = doc("a", 5, "2026-07-27T10:00:00Z", "Hike Greatbush");
    const copy = doc("b", 1, "2026-07-27T12:00:00Z", "Hike Greatbush (Konflikt iPhone, 2026-07-27)");
    expect(contentFingerprint(copy)).toBe(contentFingerprint(loser));
  });

  it(`hält eine echte Umbenennung für eine echte Änderung`, () => {
    const before = doc("a", 5, "2026-07-27T10:00:00Z", "Hike Greatbush");
    const renamed = doc("a", 5, "2026-07-27T10:00:00Z", "Hike der Priester");
    expect(contentFingerprint(renamed)).not.toBe(contentFingerprint(before));
  });
});

describe("conflictCopiesNeeded", () => {
  const conflict = (loser: Doc, winner: Doc): SyncConflict<Doc> => ({
    id: winner.id,
    winner,
    loser,
    loserSide: "remote",
  });

  it(`rettet einen Stand, den es sonst nirgends gibt`, () => {
    const winner = doc("a", 6, "2026-07-27T12:00:00Z", "iPad");
    const loser = doc("a", 5, "2026-07-27T10:00:00Z", "Handy");
    expect(conflictCopiesNeeded([conflict(loser, winner)], [winner])).toHaveLength(1);
  });

  it(`macht keine Kopie aus einer Löschung`, () => {
    const winner = doc("a", 6, "2026-07-27T12:00:00Z", "A");
    const dead = doc("a", 5, "2026-07-27T10:00:00Z", "A", "2026-07-27T10:00:00Z");
    expect(conflictCopiesNeeded([conflict(dead, winner)], [winner])).toHaveLength(0);
  });

  it(`macht aus zwei gleichen Verlierern in einem Lauf EINE Kopie`, () => {
    const w1 = doc("a", 6, "2026-07-27T12:00:00Z", "neu");
    const w2 = doc("b", 6, "2026-07-27T12:00:00Z", "neu");
    const l1 = doc("a", 5, "2026-07-27T10:00:00Z", "alt");
    const l2 = doc("b", 5, "2026-07-27T10:00:00Z", "alt");
    expect(conflictCopiesNeeded([conflict(l1, w1), conflict(l2, w2)], [w1, w2])).toHaveLength(1);
  });

  /**
   * DER Regressionstest. Nachbau des Fehlers, der aus einem Hike Greatbush
   * sieben gemacht hat:
   *
   * Die Gegenseite wurde beim Lesen immer durchs Schema geschickt, die eigene
   * Zeile kam ROH aus der Datenbank. Fehlt in der rohen Zeile ein Feld, das das
   * Schema inzwischen mit einem Standardwert füllt, sind beide Seiten bei
   * GLEICHER rev inhaltlich verschieden — also Konflikt, und weil die Ursache
   * beim nächsten Abgleich unverändert dasteht: wieder Konflikt. Bei Auto-Sync
   * (beim Öffnen, bei Rückkehr in den Vordergrund, nach jeder Änderung) sind
   * das binnen Minuten ein halbes Dutzend Kopien.
   *
   * Hier läuft genau diese Ursache zehn Runden lang weiter — und es darf
   * trotzdem bei EINER Kopie bleiben.
   */
  it(`vervielfältigt sich nicht, wenn dieselbe Ursache bei jedem Abgleich wiederkehrt`, () => {
    interface Row extends SyncDoc {
      name: string;
      trackers?: string[];
    }
    /** Die Gegenseite wird geparst: ein neues Schema-Feld bekommt seinen Standardwert. */
    const parse = (row: Row): Row => ({ ...row, trackers: row.trackers ?? [] });

    // Die lokale Zeile ist alt und kennt `trackers` nicht.
    let local: Row[] = [{ id: "hike", rev: 5, updatedAt: "2026-07-27T10:00:00Z", name: "Hike" }];
    let remote: Row[] = [{ id: "hike", rev: 5, updatedAt: "2026-07-27T10:00:00Z", name: "Hike" }];
    const copies: Row[] = [];

    for (let round = 0; round < 10; round++) {
      const out = mergeDocSets(local, remote.map(parse));
      const needed = conflictCopiesNeeded(out.conflicts, out.merged);
      for (const c of needed) {
        copies.push({ ...c.loser, id: `copy-${copies.length}`, rev: 1, name: `${c.loser.name} (Konflikt hier, 2026-07-27)` });
      }
      // Anwenden wie die App: lokal schreiben, hochschreiben, Kopien auf beide Seiten.
      local = [
        ...local.filter((d) => !out.toLocal.some((w) => w.id === d.id)),
        ...out.toLocal,
        ...copies.filter((c) => !local.some((d) => d.id === c.id)),
      ];
      remote = [
        ...remote.filter((d) => !out.toRemote.some((w) => w.id === d.id)),
        ...out.toRemote,
        ...copies.filter((c) => !remote.some((d) => d.id === c.id)),
      ];
    }

    expect(copies).toHaveLength(1);
    // Und die Liste bleibt bei zwei Zeilen: der Figur und der einen Kopie.
    expect(local.filter((d) => d.deletedAt === undefined)).toHaveLength(2);
  });
});

describe("redundantConflictCopies", () => {
  const copy = (id: string, name: string) =>
    doc(id, 1, "2026-07-27T12:00:00Z", `${name} (Konflikt iPhone, 2026-07-27)`);

  it(`räumt die Kopien weg, deren Inhalt schon beim Original liegt`, () => {
    // Die Lage in seiner Liste: ein Hike und fünf Kopien davon.
    const original = doc("hike", 9, "2026-07-27T10:00:00Z", "Hike Greatbush");
    const copies = [1, 2, 3, 4, 5].map((n) => copy(`c${n}`, "Hike Greatbush"));
    const redundant = redundantConflictCopies([original, ...copies]);
    expect(redundant.map((d) => d.id).sort()).toEqual(["c1", "c2", "c3", "c4", "c5"]);
  });

  it(`lässt eine Kopie mit eigenem Inhalt in Ruhe — dafür ist sie da`, () => {
    const original = doc("hike", 9, "2026-07-27T10:00:00Z", "Hike Greatbush");
    const rescued = copy("c1", "Hike der Priester"); // andere Arbeit, nicht dieselbe
    expect(redundantConflictCopies([original, rescued])).toHaveLength(0);
  });

  it(`lässt ohne Original eine Kopie übrig, und auf beiden Geräten dieselbe`, () => {
    const copies = [copy("c3", "Hike"), copy("c1", "Hike"), copy("c2", "Hike")];
    const redundant = redundantConflictCopies(copies);
    expect(redundant.map((d) => d.id).sort()).toEqual(["c2", "c3"]);
    // Andere Reihenfolge, gleiche Entscheidung — sonst löschen zwei Geräte
    // verschiedene Kopien und keine bleibt.
    expect(redundantConflictCopies([...copies].reverse()).map((d) => d.id).sort()).toEqual([
      "c2",
      "c3",
    ]);
  });

  it(`fasst Doppelte OHNE Anhängsel nicht an — die hat ein Mensch angelegt`, () => {
    const a = doc("a", 1, "2026-07-27T10:00:00Z", "Hike Greatbush");
    const b = doc("b", 1, "2026-07-27T11:00:00Z", "Hike Greatbush");
    expect(redundantConflictCopies([a, b])).toHaveLength(0);
  });

  it(`zählt Gelöschtes nicht mit`, () => {
    const original = doc("hike", 9, "2026-07-27T10:00:00Z", "Hike");
    const dead = doc("c1", 2, "2026-07-27T12:00:00Z", "Hike (Konflikt iPhone, 2026-07-27)", "2026-07-27T12:00:00Z");
    expect(redundantConflictCopies([original, dead])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Der gemeinsame Abzweigpunkt: „beide haben gearbeitet" erkennen
// ---------------------------------------------------------------------------

/**
 * Der schlimmste Fehler, den der Prüfbericht gefunden hat, und er war als Absicht
 * dokumentiert: ein Konflikt wurde nur bei GENAU gleicher rev erkannt. Zwei Geräte,
 * die beide gearbeitet haben, haben aber fast nie dieselbe Zahl.
 *
 * Philipp arbeitet auf iPhone UND iPad („1, beide") — das ist genau die Lage, für
 * die die Konfliktkopien gebaut wurden, und sie fiel durchs Raster.
 */
describe("mergeDocSets mit gemeinsamem Abzweigpunkt", () => {
  interface Doc extends SyncDoc {
    name: string;
    damage: number;
    feats: string[];
  }
  const doc = (patch: Partial<Doc> = {}): Doc => ({
    id: "hike",
    rev: 7,
    updatedAt: "2026-07-29T20:00:00.000Z",
    name: "Hike",
    damage: 0,
    feats: [],
    ...patch,
  });

  it(`erkennt den nachgestellten Datenverlust: 13 Schaden vs. Cleave`, () => {
    /*
      Beide bei rev 7 einig. iPhone trägt 13 Schaden ein (rev 8), das iPad ohne Netz
      Cleave (rev 9). Vorher: das iPad gewann, der Schaden war weg, keine Kopie,
      keine Warnung, im Bericht stand „1 geholt".
    */
    const iphone = doc({ rev: 8, updatedAt: "2026-07-29T20:30:00.000Z", damage: 13 });
    const ipad = doc({ rev: 9, updatedAt: "2026-07-29T21:00:00.000Z", feats: ["Cleave"] });
    const base = new Map([["hike", 7]]);

    const out = mergeDocSets([iphone], [ipad], base);

    expect(out.conflicts).toHaveLength(1);
    // Der neuere Stand gewinnt …
    expect(out.merged[0]?.feats).toEqual(["Cleave"]);
    // … und der Schaden vom iPhone ist gerettet, nicht weg.
    expect(out.conflicts[0]?.loser.damage).toBe(13);
    expect(out.conflicts[0]?.loserSide).toBe("local");
  });

  it(`rettet auch den NEUEREN Stand, wenn er die kleinere rev hat`, () => {
    // iPhone rev 10 um 20:30 gegen iPad rev 9 um 21:00 — vorher gewann das iPhone
    // wegen der höheren Zahl, und das Talent von vor einer halben Stunde fehlte.
    const iphone = doc({ rev: 10, updatedAt: "2026-07-29T20:30:00.000Z", damage: 13 });
    const ipad = doc({ rev: 9, updatedAt: "2026-07-29T21:00:00.000Z", feats: ["Cleave"] });
    const out = mergeDocSets([iphone], [ipad], new Map([["hike", 7]]));

    expect(out.conflicts).toHaveLength(1);
    expect(out.merged[0]?.feats).toEqual(["Cleave"]);
    expect(out.merged[0]?.rev).toBe(11);
  });

  it(`macht KEINEN Konflikt, wenn nur eine Seite gearbeitet hat`, () => {
    // Der Normalfall: iPad hat nur gelesen. Eine Kopie wäre hier reiner Lärm.
    const iphone = doc({ rev: 9, damage: 13 });
    const ipad = doc({ rev: 7 });
    const out = mergeDocSets([iphone], [ipad], new Map([["hike", 7]]));

    expect(out.conflicts).toEqual([]);
    expect(out.merged[0]?.damage).toBe(13);
    expect(out.toRemote).toHaveLength(1);
    expect(out.toLocal).toEqual([]);
  });

  it(`macht KEINEN Konflikt, wenn nur die Gegenseite gearbeitet hat`, () => {
    const out = mergeDocSets([doc({ rev: 7 })], [doc({ rev: 9, damage: 13 })], new Map([["hike", 7]]));
    expect(out.conflicts).toEqual([]);
    expect(out.toLocal).toHaveLength(1);
    expect(out.toRemote).toEqual([]);
  });

  it(`bleibt beim alten Verhalten, solange der Abzweigpunkt fehlt`, () => {
    /*
      Erster Abgleich nach dem Update: der Punkt ist für kein Dokument bekannt. Ohne
      diese Rückfallregel gäbe es beim ersten Lauf für JEDES abweichende Dokument
      eine Kopie — eine Lawine als Begrüßung.
    */
    const iphone = doc({ rev: 8, damage: 13 });
    const ipad = doc({ rev: 9, feats: ["Cleave"] });
    expect(mergeDocSets([iphone], [ipad]).conflicts).toEqual([]);
    expect(mergeDocSets([iphone], [ipad], new Map()).conflicts).toEqual([]);
  });

  it(`erkennt es weiterhin bei gleicher rev, auch ohne Abzweigpunkt`, () => {
    const out = mergeDocSets([doc({ damage: 13 })], [doc({ feats: ["Cleave"] })]);
    expect(out.conflicts).toHaveLength(1);
  });

  it(`schweigt, wenn beide über den Punkt hinaus sind, der INHALT aber gleich ist`, () => {
    // Dasselbe zweimal getippt ist kein Konflikt — nur Buchhaltung.
    const out = mergeDocSets(
      [doc({ rev: 8, damage: 13 })],
      [doc({ rev: 9, damage: 13 })],
      new Map([["hike", 7]]),
    );
    expect(out.conflicts).toEqual([]);
    expect(out.merged[0]?.rev).toBe(9);
  });

  it(`gibt den neuen gemeinsamen Stand zum Mitschreiben heraus`, () => {
    const out = mergeDocSets(
      [doc({ id: "a", rev: 8, damage: 13 }), doc({ id: "nur-hier", rev: 3 })],
      [doc({ id: "a", rev: 9, feats: ["Cleave"] }), doc({ id: "nur-dort", rev: 5 })],
      new Map([["a", 7]]),
    );
    // Für jedes Dokument im Ergebnis steht drin, worauf man sich geeinigt hat.
    expect(out.nextBase.get("a")).toBe(out.merged.find((d) => d.id === "a")?.rev);
    expect(out.nextBase.get("nur-hier")).toBe(3);
    expect(out.nextBase.get("nur-dort")).toBe(5);
    expect(out.nextBase.size).toBe(3);
  });

  it(`rettet den bearbeiteten Stand, wenn woanders gelöscht wurde`, () => {
    /*
      Auf dem iPad gelöscht, auf dem iPhone gleichzeitig 13 Schaden eingetragen.

      Die Löschung gewinnt (sie ist neuer), aber der bearbeitete Stand liegt danach
      als Kopie daneben. Das ist Absicht und keine Wiederauferstehung: die Löschung
      war eine Entscheidung, die Bearbeitung war auch eine, und der Abgleich
      verspricht, keine Arbeit wegzuwerfen. Wer die Kopie nicht will, löscht sie —
      dann ist es wieder eine Entscheidung und kein Verlust.

      (Ich hatte hier zuerst „keine Kopie" erwartet. Die Bremse gegen
      Wiederauferstehung greift, wenn der VERLIERER eine Löschung ist — hier ist er
      der Inhalt.)
    */
    const gelöscht = doc({
      rev: 9,
      deletedAt: "2026-07-29T21:00:00.000Z",
      updatedAt: "2026-07-29T21:00:00.000Z",
    });
    const bearbeitet = doc({ rev: 8, damage: 13, updatedAt: "2026-07-29T20:30:00.000Z" });
    const out = mergeDocSets([bearbeitet], [gelöscht], new Map([["hike", 7]]));

    expect(out.conflicts).toHaveLength(1);
    expect(out.merged[0]?.deletedAt).toBeDefined();
    const kopien = conflictCopiesNeeded(out.conflicts, out.merged);
    expect(kopien).toHaveLength(1);
    expect(kopien[0]?.loser.damage).toBe(13);
  });

  it(`macht aus einer Löschung KEINE Kopie, wenn sie verliert`, () => {
    // Andere Richtung: hier ist der Verlierer die Löschung. Eine „gerettete" Kopie
    // davon wäre genau die Wiederauferstehung, die niemand will.
    const gelöscht = doc({
      rev: 8,
      deletedAt: "2026-07-29T20:30:00.000Z",
      updatedAt: "2026-07-29T20:30:00.000Z",
    });
    const bearbeitet = doc({ rev: 9, damage: 13, updatedAt: "2026-07-29T21:00:00.000Z" });
    const out = mergeDocSets([gelöscht], [bearbeitet], new Map([["hike", 7]]));

    expect(out.conflicts).toHaveLength(1);
    expect(out.merged[0]?.deletedAt).toBeUndefined();
    expect(conflictCopiesNeeded(out.conflicts, out.merged)).toEqual([]);
  });
});

/**
 * Was die adversarische Gegenprüfung an meiner ersten Fassung gefunden hat.
 *
 * Alle drei Punkte hier waren echte Löcher: die Regel stimmte, aber drumherum konnte
 * der gemeinsame Stand höher stehen als das, was wirklich angekommen ist — und dann
 * galt wieder „höhere Zahl gewinnt", still.
 */
describe("Nachbesserungen aus der Gegenprüfung", () => {
  interface Doc extends SyncDoc {
    name: string;
    damage: number;
  }
  const doc = (patch: Partial<Doc> = {}): Doc => ({
    id: "hike",
    rev: 7,
    updatedAt: "2026-07-29T20:00:00.000Z",
    name: "Hike",
    damage: 0,
    ...patch,
  });

  it(`behandelt eine rev UNTER dem gemeinsamen Stand als Widerspruch`, () => {
    /*
      Zahlen wachsen — eine kleinere rev als der gemeinsame Stand kann es nicht geben.
      In der Gruppe passierte es doch: die Arbeitskopie setzte sich auf rev 1 zurück.
      Vorher hätte „die höhere gewinnt" den Unterschied nicht gesehen; jetzt ist es
      ein Konflikt, und der Stand bleibt erhalten.
    */
    const zurückgesetzt = doc({ rev: 2, damage: 13 });
    const gegenseite = doc({ rev: 6 });
    const out = mergeDocSets([zurückgesetzt], [gegenseite], new Map([["hike", 6]]));

    expect(out.conflicts).toHaveLength(1);
    expect(conflictCopiesNeeded(out.conflicts, out.merged)).toHaveLength(1);
  });

  it(`überlebt eine Klammer im Gerätenamen`, () => {
    /*
      „iPad (alt)" ergab ein Anhängsel, das das Erkennungs-Muster nicht mehr traf:
      die Anhängsel stapelten sich, und die Aufräum-Karte in der Liste erschien nie.
    */
    const name = conflictCopyName("Hike", "iPad (alt)", "2026-07-29");
    expect(name).toBe("Hike (Konflikt iPad alt, 2026-07-29)");
    // Entscheidend: als Kopie wiedererkennbar, also abschneidbar.
    expect(stripConflictSuffix(name)).toBe("Hike");
    // Und eine Kopie der Kopie stapelt nicht.
    expect(stripConflictSuffix(conflictCopyName(name, "iPhone", "2026-07-30"))).toBe("Hike");
  });

  it(`hält den Punkt zurück, wo nichts angekommen ist`, () => {
    /*
      Nachgestellt, was in sync.ts schiefging: ein Bogen über der Größengrenze fällt
      stumm aus dem Schreib-Auftrag. Sein Punkt darf NICHT weiterwandern, sonst gilt
      beim nächsten Lauf wieder „höhere Zahl gewinnt".

      Hier wird die Regel dahinter geprüft: nextBase kommt aus dem Ergebnis, und der
      Aufrufer muss die nicht angekommenen daraus entfernen. Was passiert, wenn er es
      NICHT tut, steht in der zweiten Hälfte — genau der Verlust.
    */
    const lokal = doc({ rev: 8, damage: 13 });
    const fern = doc({ rev: 7 });
    const erster = mergeDocSets([lokal], [fern], new Map([["hike", 7]]));
    expect(erster.nextBase.get("hike")).toBe(8);

    /*
      Wenn 8 gespeichert wird, ohne dass es ankam: die Gegenseite schreibt später auf
      9 (mit neuerem Zeitstempel, sie gewinnt also) …
    */
    const fernNeu = doc({ rev: 9, updatedAt: "2026-07-29T21:00:00.000Z", name: "Hike vom iPad" });
    const falsch = mergeDocSets([lokal], [fernNeu], new Map([["hike", 8]]));
    expect(falsch.conflicts).toEqual([]); // … und die 13 Schaden sind still weg.
    expect(falsch.merged[0]?.damage).toBe(0);

    // Bleibt der alte Punkt (7) stehen, wird es erkannt und der Stand gerettet.
    const richtig = mergeDocSets([lokal], [fernNeu], new Map([["hike", 7]]));
    expect(richtig.conflicts).toHaveLength(1);
    expect(richtig.conflicts[0]?.loser.damage).toBe(13);
    expect(richtig.conflicts[0]?.loserSide).toBe("local");
  });
});
