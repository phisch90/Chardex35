import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { applyOrder, buildFingerprint } from "./orders.js";
import { shelfOrderSchema, type ShelfOrder } from "./shelf.js";

/**
 * Die Trennung, die hier geprüft wird: der Spielleiter besitzt den AUFBAU, der
 * Spieler besitzt den SPIELZUSTAND.
 *
 * Ohne sie wäre die ganze Funktion unbrauchbar — der Spielleiter trägt morgens die
 * neue Stufe ein, und der Bogen des Spielers steht abends wieder auf voll.
 */

const CONTEXT = { now: "2026-07-29T20:00:00.000Z", day: "2026-07-29", from: "Philipp" };

function character(patch: Record<string, unknown> = {}): Character {
  return characterSchema.parse({
    id: "hike",
    name: "Hike Greatbush",
    raceId: "srd:race:human",
    abilities: { base: { str: 15, dex: 13, con: 12, int: 8, wis: 11, cha: 10 } },
    levels: [
      { classId: "srd:class:fighter", hpRoll: "avg" },
      { classId: "srd:class:cleric", hpRoll: "avg" },
    ],
    rev: 4,
    updatedAt: "2026-07-28T10:00:00.000Z",
    ...patch,
  });
}

function order(edited: Character, base: Character, patch: Partial<ShelfOrder> = {}): ShelfOrder {
  return shelfOrderSchema.parse({
    id: "auftrag-1",
    characterId: base.id,
    baseRev: base.rev,
    baseFingerprint: buildFingerprint(base),
    issuedAt: "2026-07-29T09:00:00.000Z",
    issuedBy: "Philipp",
    character: edited,
    ...patch,
  });
}

/** Der Spielleiter hebt die Stufe — der typische Auftrag. */
const stufe3 = (from: Character) =>
  character({
    ...from,
    levels: [...from.levels, { classId: "srd:class:cleric", hpRoll: "avg" }],
    rev: from.rev,
  });

describe("buildFingerprint", () => {
  it(`ändert sich NICHT, wenn nur gespielt wurde`, () => {
    /*
      Das ist der ganze Zweck: Schaden, verbrauchte Zauberplätze und Zählerstände
      dürfen keine Rettungskopie auslösen. Sonst bekäme man nach jedem Spielabend
      eine Kopie geschenkt.
    */
    const ruhig = character();
    const gespielt = character({
      hp: { damage: 26, nonlethal: 4, temp: 5 },
      conditionIds: ["srd:condition:shaken"],
      combatOptions: { powerAttack: 3, dodgeActive: true, dodgeTarget: "Oger" },
      notes: "Der Wirt schuldet uns noch 12 gp.",
      trackers: [{ id: "t1", name: "Untote vertreiben", kind: "counter", value: 2 }],
      spellState: { "srd:class:cleric": { known: ["srd:spell:bless"], usedSlots: [0, 2] } },
    });
    const alsFrisch = character({
      trackers: [{ id: "t1", name: "Untote vertreiben", kind: "counter", value: 7 }],
      spellState: { "srd:class:cleric": { known: ["srd:spell:bless"], usedSlots: [] } },
    });
    expect(buildFingerprint(gespielt)).toBe(buildFingerprint(alsFrisch));
    // Der ruhige Bogen hat weder Zähler noch Zauber — der muss sich unterscheiden.
    expect(buildFingerprint(ruhig)).not.toBe(buildFingerprint(alsFrisch));
  });

  it(`ändert sich, sobald am Bogen gebaut wird`, () => {
    const vorher = character();
    expect(buildFingerprint(stufe3(vorher))).not.toBe(buildFingerprint(vorher));
    expect(buildFingerprint(character({ money: { pp: 0, gp: 500, sp: 0, cp: 0 } }))).not.toBe(
      buildFingerprint(vorher),
    );
    expect(buildFingerprint(character({ hp: { damage: 0, nonlethal: 0, temp: 0, overrideMax: 70 } }))).not.toBe(
      buildFingerprint(vorher),
    );
  });

  it(`zählt die rev und den Zeitstempel nicht mit — das ist Buchhaltung`, () => {
    expect(buildFingerprint(character({ rev: 4 }))).toBe(buildFingerprint(character({ rev: 99 })));
  });
});

describe("applyOrder — Spielzustand bleibt beim Spieler", () => {
  it(`hebt die Stufe und lässt den Schaden des Abends stehen`, () => {
    const base = character();
    const lokal = character({ rev: 6, hp: { damage: 26, nonlethal: 0, temp: 0 } });
    const result = applyOrder(order(stufe3(base), base), lokal, CONTEXT);

    expect(result.outcome).toBe("angewendet");
    if (result.outcome !== "angewendet") return;
    expect(result.next.levels).toHaveLength(3);
    expect(result.next.hp.damage).toBe(26);
  });

  it(`nimmt neue bekannte Zauber, behält verbrauchte Plätze und Vorbereitetes`, () => {
    const base = character({
      spellState: { "srd:class:cleric": { known: ["srd:spell:bless"], usedSlots: [] } },
    });
    const bearbeitet = character({
      ...base,
      spellState: {
        "srd:class:cleric": { known: ["srd:spell:bless", "srd:spell:cure-light-wounds"], usedSlots: [] },
      },
      rev: base.rev,
    });
    const lokal = character({
      ...base,
      rev: 9,
      spellState: {
        "srd:class:cleric": {
          known: ["srd:spell:bless"],
          prepared: [{ spellId: "srd:spell:bless", slotLevel: 1 }],
          usedSlots: [1, 2],
        },
      },
    });
    const result = applyOrder(order(bearbeitet, base), lokal, CONTEXT);

    expect(result.outcome).toBe("angewendet");
    if (result.outcome !== "angewendet") return;
    const state = result.next.spellState["srd:class:cleric"];
    expect(state?.known).toEqual(["srd:spell:bless", "srd:spell:cure-light-wounds"]);
    expect(state?.usedSlots).toEqual([1, 2]);
    expect(state?.prepared).toEqual([{ spellId: "srd:spell:bless", slotLevel: 1 }]);
  });

  it(`behält Zählerstände und lässt einen NEUEN Zähler voll ankommen`, () => {
    /*
      „Du hast Stufe 8 und damit Untote vertreiben" — mit Stand 0 anzukommen wäre
      falsch, denn benutzt hat es noch niemand.
    */
    const base = character({
      trackers: [{ id: "t1", name: "Aktionspunkte", kind: "counter", value: 5, max: 5 }],
    });
    const bearbeitet = character({
      ...base,
      trackers: [
        { id: "t1", name: "Aktionspunkte", kind: "counter", value: 5, max: 5 },
        { id: "t2", name: "Untote vertreiben", kind: "counter", value: 7, max: 7 },
      ],
      rev: base.rev,
    });
    const lokal = character({
      ...base,
      rev: 7,
      trackers: [{ id: "t1", name: "Aktionspunkte", kind: "counter", value: 1, max: 5 }],
    });
    const result = applyOrder(order(bearbeitet, base), lokal, CONTEXT);

    expect(result.outcome).toBe("angewendet");
    if (result.outcome !== "angewendet") return;
    expect(result.next.trackers.map((t) => [t.name, t.value])).toEqual([
      ["Aktionspunkte", 1],
      ["Untote vertreiben", 7],
    ]);
  });

  it(`lässt die Notizen des Spielers in Ruhe`, () => {
    // Was der Spielleiter mitteilen will, steht im Auftrag (`note`) — nicht im
    // Notizfeld eines fremden Bogens.
    const base = character({ notes: "alt" });
    const bearbeitet = character({ ...base, notes: "vom Spielleiter überschrieben", rev: base.rev });
    const lokal = character({ ...base, rev: 5, notes: "Der Wirt schuldet uns 12 gp." });
    const result = applyOrder(order(stufe3(bearbeitet), base), lokal, CONTEXT);

    expect(result.outcome).toBe("angewendet");
    if (result.outcome !== "angewendet") return;
    expect(result.next.notes).toBe("Der Wirt schuldet uns 12 gp.");
  });

  it(`übernimmt ein Maximum vom Spielleiter, ein Bild nur wenn eines dabei ist`, () => {
    const base = character();
    const bearbeitet = character({
      ...base,
      hp: { damage: 0, nonlethal: 0, temp: 0, overrideMax: 70 },
      rev: base.rev,
    });
    const lokal = character({ ...base, rev: 5, portrait: "data:image/png;base64,AAAA" });
    const result = applyOrder(order(bearbeitet, base), lokal, CONTEXT);

    expect(result.outcome).toBe("angewendet");
    if (result.outcome !== "angewendet") return;
    expect(result.next.hp.overrideMax).toBe(70);
    expect(result.next.portrait).toBe("data:image/png;base64,AAAA");
  });
});

describe("applyOrder — nichts geht verloren", () => {
  it(`legt eine Rettungskopie an, wenn der Spieler SELBST gebaut hat`, () => {
    const base = character();
    // Der Spieler hat sich etwas gekauft — das ist Aufbau, nicht Spielzustand.
    const lokal = character({ rev: 6, money: { pp: 0, gp: 480, sp: 0, cp: 0 } });
    const result = applyOrder(order(stufe3(base), base), lokal, CONTEXT);

    expect(result.outcome).toBe("angewendet-mit-kopie");
    if (result.outcome !== "angewendet-mit-kopie") return;
    // Der Spielleiter gewinnt …
    expect(result.next.levels).toHaveLength(3);
    // … aber der Stand des Spielers liegt danach als eigener Bogen daneben.
    expect(result.rescue.money.gp).toBe(480);
    expect(result.rescue.name).toBe("Hike Greatbush (Konflikt Philipp, 2026-07-29)");
    expect(result.rescue.id).not.toBe(lokal.id);
  });

  it(`legt KEINE Kopie an, wenn der Spieler nur gespielt hat`, () => {
    const base = character();
    const lokal = character({
      rev: 12,
      hp: { damage: 26, nonlethal: 0, temp: 0 },
      conditionIds: ["srd:condition:shaken"],
    });
    expect(applyOrder(order(stufe3(base), base), lokal, CONTEXT).outcome).toBe("angewendet");
  });

  it(`ohne Fingerabdruck im Auftrag lieber keine Kopie als eine falsche`, () => {
    // Aufträge aus einer älteren Fassung tragen ihn nicht. Dann ist unbekannt, ob
    // der Spieler gebaut hat — und eine Kopie bei jedem Auftrag wäre nur Lärm.
    const base = character();
    const lokal = character({ rev: 6, money: { pp: 0, gp: 480, sp: 0, cp: 0 } });
    const ohne = order(stufe3(base), base, { baseFingerprint: "" });
    expect(applyOrder(ohne, lokal, CONTEXT).outcome).toBe("angewendet");
  });
});

describe("applyOrder — Grenzen", () => {
  it(`tut nichts, wenn der Auftrag am Aufbau nichts ändert`, () => {
    /*
      Wichtig gegen ein Aufschaukeln: würde hier eine neue rev entstehen, würden
      sich zwei Geräte bei jedem Abgleich gegenseitig hochzählen.
    */
    const base = character();
    const lokal = character({ rev: 8, hp: { damage: 10, nonlethal: 0, temp: 0 } });
    expect(applyOrder(order(base, base), lokal, CONTEXT).outcome).toBe("nichts-zu-tun");
  });

  it(`geht einen Auftrag für einen fremden Bogen nicht an`, () => {
    const base = character();
    expect(applyOrder(order(stufe3(base), base), undefined, CONTEXT).outcome).toBe("unbekannt");
  });

  it(`lehnt es ab, einen Bogen aus der Ferne zu löschen`, () => {
    const base = character();
    const gelöscht = character({ ...base, deletedAt: "2026-07-29T09:00:00.000Z", rev: base.rev });
    const result = applyOrder(order(gelöscht, base), character({ rev: 5 }), CONTEXT);
    expect(result.outcome).toBe("abgelehnt");
    if (result.outcome !== "abgelehnt") return;
    expect(result.reason).toContain("löschen");
  });

  it(`holt einen hier gelöschten Bogen nicht zurück`, () => {
    const base = character();
    const lokal = character({ rev: 5, deletedAt: "2026-07-28T20:00:00.000Z" });
    expect(applyOrder(order(stufe3(base), base), lokal, CONTEXT).outcome).toBe("abgelehnt");
  });

  it(`zählt die rev über BEIDE Seiten hoch, damit der Abgleich sie weiterträgt`, () => {
    const base = character();
    const bearbeitet = character({ ...stufe3(base), rev: 20 });
    const lokal = character({ rev: 6 });
    const result = applyOrder(order(bearbeitet, base), lokal, CONTEXT);
    if (result.outcome !== "angewendet") throw new Error(result.outcome);
    expect(result.next.rev).toBe(21);
    expect(result.next.id).toBe("hike");
    expect(result.next.updatedAt).toBe(CONTEXT.now);
  });
});
