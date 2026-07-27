import { describe, expect, it } from "vitest";
import { mergeDocSets, type SyncDoc } from "./merge.js";

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
