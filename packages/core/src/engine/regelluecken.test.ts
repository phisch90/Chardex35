import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { FIGHTER_BONUS_COUNT, fighterBonusVerdict } from "../compendium/fighterBonus.js";
import { assignFeatOrigins, featFitsSlot, type FeatSlotSource } from "./featSlots.js";
import { requiredFeatsOf } from "./prereqs.js";
import { maxCastableSpellLevel } from "./tables.js";
import { deriveSheet } from "./index.js";

/*
  KOPFNOTIZ: keine deutschen Anfuehrungszeichen in dieser Datei.

  Zwei Luecken, beide aus derselben Familie: die App WEISS es, und sagt nichts.

  1. Sie zeigte Zauberplaetze fuer Grade, die das Attribut gar nicht zulaesst
     (SRD: 10 + Zaubergrad). Bei WIS 11 sind das alle ab Grad 2.
  2. Der Knopf "Herkunft zuordnen" legte Extra Turning auf einen Kaempfer-Bonusplatz —
     und das Talent steht nicht auf der Liste des Kaempfers.

  Gemessen wird gegen die ECHTEN Packs und gegen SEINEN Aufbau (Mensch, Kaempfer 3 /
  Kleriker 4). Mit erfundenen Kennungen waere nichts davon bewiesen.
*/

const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const manifestPath = join(packsDir, "manifest.json");
const packsAvailable = existsSync(manifestPath);

function loadEntities(): Entity[] {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: string[] };
  const out: Entity[] = [];
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    for (const item of JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[]) {
      out.push(entitySchema.parse(item));
    }
  }
  return out;
}

const FIGHTER = "srd:class:fighter";
const CLERIC = "srd:class:cleric";

/** Sein Bogen, auf das Noetige zusammengezogen. WIS bleibt frei — daran haengt Teil 1. */
function hike(wis: number): Character {
  return characterSchema.parse({
    id: "luecken-1",
    name: "Hike (Probe)",
    raceId: "srd:race:human",
    abilities: { base: { str: 15, dex: 13, con: 12, int: 10, wis, cha: 10 } },
    levels: [
      ...Array.from({ length: 3 }, () => ({ classId: FIGHTER, hpRoll: "avg" as const })),
      ...Array.from({ length: 4 }, () => ({ classId: CLERIC, hpRoll: "avg" as const })),
    ],
    domains: [
      { classId: CLERIC, spellListId: "srd:spelllist:domain-healing" },
      { classId: CLERIC, spellListId: "srd:spelllist:domain-good" },
    ],
    feats: [
      { featId: "srd:feat:dodge" },
      { featId: "srd:feat:extra-turning" },
      { featId: "srd:feat:improved-initiative" },
      { featId: "srd:feat:power-attack" },
      { featId: "srd:feat:weapon-focus", choiceRef: "srd:item:sword-short", choice: "Kurzschwert" },
      { featId: "srd:feat:weapon-focus", choiceRef: "srd:item:greatsword", choice: "Zweihaender" },
    ],
  });
}

describe("Die Regel 10 + Zaubergrad", () => {
  it("rechnet mit dem WERT, nicht mit dem Modifikator", () => {
    /*
      Die Falle, die diese Regel kostet: WIS 11 und WIS 12 geben beide Modifikator +0.
      Wer den Modifikator nimmt, riegelt vier Grade zu frueh ab.
    */
    expect(maxCastableSpellLevel(11)).toBe(1);
    expect(maxCastableSpellLevel(12)).toBe(2);
    expect(maxCastableSpellLevel(19)).toBe(9);
    // Und die Enden: unter 10 geht gar nichts, ueber Grad 9 gibt es nichts.
    expect(maxCastableSpellLevel(9)).toBe(-1);
    expect(maxCastableSpellLevel(30)).toBe(9);
  });
});

describe.skipIf(!packsAvailable)("Was das Attribut zulaesst", () => {
  const compendium = resolveCompendium(loadEntities());
  const codes = (c: Character) => deriveSheet(c, compendium).issues.map((i) => i.code);

  it("WIS 11: die Grad-2-Plaetze stehen da, aber er darf sie nicht wirken", () => {
    const sheet = deriveSheet(hike(11), compendium);
    const block = sheet.spellcasting[0]!;
    expect(block.abilityScore).toBe(11);
    expect(block.maxCastableLevel).toBe(1);
    // Die Plaetze BLEIBEN — gewarnt statt gesperrt.
    expect(block.slots[2]?.total).toBeGreaterThan(0);
    expect(codes(hike(11))).toContain("spell-ability-too-low");
  });

  it("WIS 12: ein Punkt mehr, und die Warnung ist weg", () => {
    /*
      Die Gegenprobe, ohne die der Test auch dann gruen waere, wenn die Warnung immer
      dastuende.
    */
    expect(deriveSheet(hike(12), compendium).spellcasting[0]?.maxCastableLevel).toBe(2);
    expect(codes(hike(12))).not.toContain("spell-ability-too-low");
  });

  it("und der Riegel haengt wirklich am WERT und nicht am Modifikator", () => {
    /*
      Der Beweis dafuer braucht ein Paar mit GLEICHEM Modifikator: WIS 12 und WIS 13
      geben beide +1, erlauben aber Grad 2 bzw. Grad 3. Haette ich den Modifikator
      genommen, waeren beide gleich — und der Fehler faellt erst am Tisch auf.
    */
    const zwoelf = deriveSheet(hike(12), compendium).spellcasting[0]!;
    const dreizehn = deriveSheet(hike(13), compendium).spellcasting[0]!;
    expect(zwoelf.abilityMod).toBe(dreizehn.abilityMod);
    expect(zwoelf.maxCastableLevel).toBe(2);
    expect(dreizehn.maxCastableLevel).toBe(3);
  });
});

describe("Die Bonustalent-Liste des Kaempfers", () => {
  it("kennt die Talente, um die es geht", () => {
    // Ein Test, der nichts messen konnte und gruen meldet, ist schlimmer als kein Test.
    expect(FIGHTER_BONUS_COUNT).toBeGreaterThan(40);
    expect(fighterBonusVerdict("srd:feat:power-attack").kind).toBe("ok");
    expect(fighterBonusVerdict("srd:feat:dodge").kind).toBe("ok");
    expect(fighterBonusVerdict("srd:feat:weapon-focus").kind).toBe("ok");
    expect(fighterBonusVerdict("srd:feat:cleave").kind).toBe("ok");
    // Und der Fall, um den es geht:
    expect(fighterBonusVerdict("srd:feat:extra-turning").kind).toBe("no");
    expect(fighterBonusVerdict("srd:feat:iron-will").kind).toBe("no");
  });

  it("ueber ein Talent aus seinen Buechern sagt sie NICHTS", () => {
    /*
      Kein "nein" fuer etwas, das die Liste nicht kennen kann — das waere eine
      erfundene Regel. Dieselbe Entscheidung wie bei der Gottheit ohne Eintrag.
    */
    expect(fighterBonusVerdict("hb:feat:eigenes").kind).toBe("unknown");
  });
});

describe("Die Herkunft haelt sich an die Regeln", () => {
  const stufe1: FeatSlotSource = { kind: "level", label: "Stufe 1", origin: { level: 1 }, charLevel: 1 };
  const stufe6: FeatSlotSource = { kind: "level", label: "Stufe 6", origin: { level: 6 }, charLevel: 6 };
  const human: FeatSlotSource = { kind: "race", label: "Human", origin: { source: "Human" }, charLevel: 1 };
  const fighter1: FeatSlotSource = {
    kind: "class",
    label: "Fighter 1",
    origin: { source: "Fighter 1" },
    charLevel: 1,
    classId: FIGHTER,
  };
  const plaetze = [stufe1, stufe6, human, fighter1];

  it("Extra Turning darf nicht auf einen Kaempfer-Bonusplatz", () => {
    const problem = featFitsSlot("srd:feat:extra-turning", fighter1, [], plaetze, () => []);
    expect(problem).not.toBeNull();
    expect(problem?.reason).toMatch(/Bonustalent-Liste/i);
    // Auf einen Stufenplatz dagegen schon — dort sagt die Liste nichts.
    expect(featFitsSlot("srd:feat:extra-turning", stufe6, [], plaetze, () => [])).toBeNull();
  });

  it("und der Zuordnen-Knopf legt es deshalb NICHT mehr dorthin", () => {
    /*
      Der eigentliche Fund dieser Runde. Vorher verteilte die Funktion stumpf der Reihe
      nach und traf damit Fighter 1.
    */
    const vorschlag = assignFeatOrigins(
      [
        { featId: "srd:feat:power-attack", origin: undefined },
        { featId: "srd:feat:extra-turning", origin: undefined },
      ],
      plaetze,
    );
    expect(vorschlag[0]).toEqual({ level: 1 });
    expect(vorschlag[1]).not.toEqual({ source: "Fighter 1" });
    expect(vorschlag[1]).toEqual({ level: 6 });
  });

  it("ein Talent kann nicht vor dem sitzen, das es voraussetzt", () => {
    /*
      Cleave setzt Power Attack voraus. Steht Power Attack auf Stufe 6, kann Cleave
      nicht auf Stufe 1 gestanden haben — gerechnet wird ueber die CHARAKTERSTUFE der
      Plaetze und nicht ueber ihre Position in der Liste.
    */
    const belegung = [{ featId: "srd:feat:power-attack", origin: { level: 6 } }];
    const benoetigt = (id: string) => (id === "srd:feat:cleave" ? ["srd:feat:power-attack"] : []);
    expect(featFitsSlot("srd:feat:cleave", stufe1, belegung, plaetze, benoetigt)).not.toBeNull();
    expect(featFitsSlot("srd:feat:cleave", stufe6, belegung, plaetze, benoetigt)).toBeNull();
  });

  it("ohne eingetragenen Vorgaenger wird nichts behauptet", () => {
    /*
      Traegt Power Attack noch gar keine Herkunft, weiss die App die Reihenfolge nicht —
      dann sagt sie auch nichts. Eine Pruefung, die raet, meldet am falschen Ort.
    */
    const benoetigt = (id: string) => (id === "srd:feat:cleave" ? ["srd:feat:power-attack"] : []);
    expect(featFitsSlot("srd:feat:cleave", stufe1, [], plaetze, benoetigt)).toBeNull();
  });
});

describe.skipIf(!packsAvailable)("Die Voraussetzungen kommen aus den echten Packs", () => {
  const compendium = resolveCompendium(loadEntities());

  it("Cleave braucht Power Attack — gelesen, nicht behauptet", () => {
    const benoetigt = requiredFeatsOf(compendium);
    expect(benoetigt("srd:feat:cleave")).toContain("srd:feat:power-attack");
    expect(benoetigt("srd:feat:great-cleave")).toContain("srd:feat:cleave");
    // Und ein Talent ohne Talent-Voraussetzung gibt eine leere Liste, keine Ausrede.
    expect(benoetigt("srd:feat:improved-initiative")).toEqual([]);
  });

  it("an seinem Bogen meldet die App die falsche Herkunft", () => {
    const mitFalscher = characterSchema.parse({
      ...hike(12),
      feats: hike(12).feats.map((f) =>
        f.featId === "srd:feat:extra-turning" ? { ...f, origin: { source: "Fighter 1" } } : f,
      ),
    });
    const codes = deriveSheet(mitFalscher, compendium).issues.map((i) => i.code);
    expect(codes).toContain("feat-origin-mismatch");

    // Gegenprobe: auf Stufe 6 ist dasselbe Talent in Ordnung.
    const richtig = characterSchema.parse({
      ...hike(12),
      feats: hike(12).feats.map((f) =>
        f.featId === "srd:feat:extra-turning" ? { ...f, origin: { level: 6 } } : f,
      ),
    });
    expect(deriveSheet(richtig, compendium).issues.map((i) => i.code)).not.toContain(
      "feat-origin-mismatch",
    );
  });
});
