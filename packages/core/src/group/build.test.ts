import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { entitySchema, type Entity } from "../schema/entities.js";
import { buildShelf, issueOrder, parseShelf, pendingOrders, ShelfFormatError } from "./build.js";
import { shelfSubscriptionSchema, type Shelf } from "./shelf.js";

/**
 * Die Regel, die hier geprüft wird: ES GEHT NUR HINEIN, WAS FREIGEGEBEN IST.
 *
 * Das ist kein Feinschliff. Philipps eigenes Regelwerk stammt aus seinen gekauften
 * Büchern; was davon in eine Ablage wandert, die andere lesen können, entscheidet
 * er Bogen für Bogen — nicht die App mit einem „nimm einfach alles mit".
 */

const NOW = "2026-07-29T20:00:00.000Z";

function character(id: string, patch: Record<string, unknown> = {}): Character {
  return characterSchema.parse({
    id,
    name: id,
    raceId: "hb:race:mondelf",
    abilities: { base: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } },
    levels: [{ classId: "hb:class:templer", hpRoll: "avg" }],
    ...patch,
  });
}

const homebrew = (id: string, kind: Entity["kind"], patch: Record<string, unknown> = {}): Entity =>
  entitySchema.parse({
    id,
    kind,
    name: id,
    source: "homebrew",
    data:
      kind === "class"
        ? {
            hitDie: 8,
            skillPointsPerLevel: 2,
            classSkillIds: [],
            levels: [
              {
                bab: 1,
                fort: 2,
                ref: 0,
                will: 0,
                features: [],
                template: { bab: "good", fort: "good", ref: "poor", will: "poor" },
              },
            ],
          }
        : kind === "race"
          ? { size: "medium", speedFt: 30 }
          : {},
    ...patch,
  });

const SAMMLUNG: Entity[] = [
  homebrew("hb:race:mondelf", "race"),
  homebrew("hb:class:templer", "class"),
  homebrew("hb:item:templer-schwert", "item"),
  // Nirgends verwiesen — darf NICHT mitreisen.
  homebrew("hb:class:blutmagier", "class"),
];

describe("buildShelf", () => {
  const alle = [
    character("hike"),
    character("geheim"),
    character("probelauf", { draftOf: "hike" }),
    character("weg", { deletedAt: NOW }),
  ];

  it(`nimmt nur die freigegebenen Bögen`, () => {
    const shelf = buildShelf({
      owner: "Philipp",
      gamemaster: true,
      characters: alle,
      sharedCharacterIds: ["hike"],
      homebrewEntities: SAMMLUNG,
      now: NOW,
    });
    expect(shelf.characters.map((c) => c.id)).toEqual(["hike"]);
  });

  it(`lässt Entwürfe und Gelöschtes draußen, auch wenn sie freigegeben wären`, () => {
    // Ein Entwurf im Regal löst nur die Frage aus, welcher der beiden Bögen gilt.
    const shelf = buildShelf({
      owner: "Philipp",
      gamemaster: true,
      characters: alle,
      sharedCharacterIds: ["hike", "probelauf", "weg"],
      homebrewEntities: SAMMLUNG,
      now: NOW,
    });
    expect(shelf.characters.map((c) => c.id)).toEqual(["hike"]);
  });

  it(`nimmt vom eigenen Regelwerk NUR mit, was die Bögen brauchen`, () => {
    const shelf = buildShelf({
      owner: "Philipp",
      gamemaster: true,
      characters: [character("hike", { inventory: [{ id: "i1", itemId: "hb:item:templer-schwert", qty: 1 }] })],
      sharedCharacterIds: ["hike"],
      homebrewEntities: SAMMLUNG,
      now: NOW,
    });
    expect(shelf.homebrewEntities.map((e) => e.id)).toEqual([
      "hb:class:templer",
      "hb:item:templer-schwert",
      "hb:race:mondelf",
    ]);
    // Der Blutmagier steht in keinem freigegebenen Bogen — und bleibt zu Hause.
    expect(shelf.homebrewEntities.map((e) => e.id)).not.toContain("hb:class:blutmagier");
  });

  it(`ist bei nichts Freigegebenem leer, aber gültig`, () => {
    const shelf = buildShelf({
      owner: "Philipp",
      gamemaster: false,
      characters: alle,
      sharedCharacterIds: [],
      homebrewEntities: SAMMLUNG,
      now: NOW,
    });
    expect(shelf.characters).toEqual([]);
    expect(shelf.homebrewEntities).toEqual([]);
    expect(shelf.kind).toBe("gruppe");
  });
});

describe("parseShelf", () => {
  const gut = buildShelf({
    owner: "Philipp",
    gamemaster: true,
    characters: [character("hike")],
    sharedCharacterIds: ["hike"],
    homebrewEntities: SAMMLUNG,
    now: NOW,
  });

  it(`liest ein Regel wieder ein, das es selbst geschrieben hat`, () => {
    const wieder = parseShelf(JSON.parse(JSON.stringify(gut)));
    expect(wieder.characters.map((c) => c.id)).toEqual(["hike"]);
    expect(wieder.owner).toBe("Philipp");
  });

  it(`erkennt die verwechselte Kennung des Geräte-Abgleichs`, () => {
    // Der Fehler, der wirklich passiert: man trägt die ID des Sync-Gists ein.
    expect(() => parseShelf({ app: "chardex35", kind: "sync" })).toThrow(ShelfFormatError);
    try {
      parseShelf({ app: "chardex35", kind: "sync" });
    } catch (error) {
      expect((error as Error).message).toContain("Geräte-Abgleichs");
    }
  });

  it(`schweigt nicht über ein neueres Format`, () => {
    // Stillschweigend Teile zu übergehen wäre schlimmer als eine Fehlermeldung.
    expect(() => parseShelf({ ...gut, formatVersion: 99 })).toThrow(/neuer als deine App/);
  });

  it(`weist Unsinn ab statt ihn zu erraten`, () => {
    expect(() => parseShelf(null)).toThrow(ShelfFormatError);
    expect(() => parseShelf("hallo")).toThrow(ShelfFormatError);
  });
});

describe("issueOrder und pendingOrders", () => {
  const base = character("hike", { rev: 4 });
  const bearbeitet = character("hike", {
    rev: 4,
    levels: [
      { classId: "hb:class:templer", hpRoll: "avg" },
      { classId: "hb:class:templer", hpRoll: "avg" },
    ],
  });

  it(`hält fest, von welchem Stand aus bearbeitet wurde`, () => {
    const auftrag = issueOrder({
      id: "a1",
      edited: bearbeitet,
      base,
      issuedBy: "Philipp",
      note: "Stufe 2",
      now: NOW,
    });
    expect(auftrag.characterId).toBe("hike");
    expect(auftrag.baseRev).toBe(4);
    expect(auftrag.baseFingerprint).not.toBe("");
    expect(auftrag.character.levels).toHaveLength(2);
    expect(auftrag.note).toBe("Stufe 2");
  });

  it(`zwingt die Kennung des Bogens auf den Ausgangsbogen`, () => {
    // Sonst könnte ein verrutschter Bearbeitungs-Entwurf einen fremden Bogen treffen.
    const auftrag = issueOrder({
      id: "a1",
      edited: character("etwas-anderes"),
      base,
      issuedBy: "Philipp",
      now: NOW,
    });
    expect(auftrag.character.id).toBe("hike");
  });

  const mitAuftrag = (patch: Partial<Shelf> = {}): Shelf => ({
    ...buildShelf({
      owner: "Philipp",
      gamemaster: true,
      characters: [base],
      sharedCharacterIds: ["hike"],
      homebrewEntities: SAMMLUNG,
      now: NOW,
      orders: [issueOrder({ id: "a1", edited: bearbeitet, base, issuedBy: "Philipp", now: NOW })],
    }),
    ...patch,
  });

  const abo = (patch: Record<string, unknown> = {}) =>
    shelfSubscriptionSchema.parse({ gistId: "g1", acceptOrders: true, ...patch });

  it(`braucht BEIDE Zustimmungen: Regal sagt Spielleiter, ich erlaube Aufträge`, () => {
    expect(pendingOrders(mitAuftrag(), abo())).toHaveLength(1);
    // Nur seine Angabe reicht nicht …
    expect(pendingOrders(mitAuftrag(), abo({ acceptOrders: false }))).toHaveLength(0);
    // … und meine allein auch nicht.
    expect(pendingOrders(mitAuftrag({ gamemaster: false }), abo())).toHaveLength(0);
  });

  it(`gibt einen schon angewendeten Auftrag nicht wieder heraus`, () => {
    expect(pendingOrders(mitAuftrag(), abo({ appliedOrderIds: ["a1"] }))).toHaveLength(0);
  });
});
