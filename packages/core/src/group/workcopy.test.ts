import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { applyOrder, buildFingerprint } from "./orders.js";
import { issueOrder } from "./build.js";
import { makeWorkCopy, readOrderMarker, workCopyId, workCopyToCharacter } from "./workcopy.js";

const NOW = "2026-07-29T20:00:00.000Z";

function character(patch: Record<string, unknown> = {}): Character {
  return characterSchema.parse({
    id: "hike",
    name: "Hike Greatbush",
    raceId: "srd:race:human",
    abilities: { base: { str: 15, dex: 13, con: 12, int: 8, wis: 11, cha: 10 } },
    levels: [{ classId: "srd:class:fighter", hpRoll: "avg" }],
    rev: 4,
    ...patch,
  });
}

describe("Arbeitskopie", () => {
  const fremd = character({ hp: { damage: 20, nonlethal: 0, temp: 0 } });
  const kopie = makeWorkCopy(fremd, { gistId: "g1", owner: "Jonas", now: NOW });

  it(`bekommt eine eigene Kennung und behält die des Spielers in der Markierung`, () => {
    expect(kopie.id).toBe(workCopyId("g1", "hike"));
    expect(kopie.id).not.toBe(fremd.id);
    expect(readOrderMarker(kopie)).toEqual({
      gistId: "g1",
      characterId: "hike",
      owner: "Jonas",
      baseRev: 4,
      baseFingerprint: buildFingerprint(fremd),
    });
  });

  it(`trifft beim zweiten Bearbeiten dieselbe Kopie`, () => {
    // Sonst sammelt sich nach drei Spielabenden ein Stapel halbfertiger Fassungen.
    const nochmal = makeWorkCopy(character({ rev: 9 }), { gistId: "g1", owner: "Jonas", now: NOW });
    expect(nochmal.id).toBe(kopie.id);
  });

  it(`ist kein Entwurf — ein Entwurf gehört zu einem EIGENEN Bogen`, () => {
    const mitEntwurf = makeWorkCopy(character({ draftOf: "irgendwas" }), {
      gistId: "g1",
      owner: "Jonas",
      now: NOW,
    });
    expect(mitEntwurf.draftOf).toBeUndefined();
  });

  it(`ist an einem eigenen Bogen nicht erkennbar`, () => {
    expect(readOrderMarker(character())).toBeUndefined();
    // Unsinn in `x` gilt als keine Markierung, nicht als halbe.
    expect(readOrderMarker(character({ x: { orderFor: { gistId: 7 } } }))).toBeUndefined();
  });
});

describe("Arbeitskopie → Auftrag → Spieler", () => {
  it(`schickt die Markierung NICHT mit`, () => {
    /*
      Sonst käme beim Spieler ein Bogen an, der behauptet, eine Arbeitskopie für
      jemand anderen zu sein — und beim nächsten Veröffentlichen tauchte er als
      solche wieder auf.
    */
    const fremd = character();
    const kopie = makeWorkCopy(fremd, { gistId: "g1", owner: "Jonas", now: NOW });
    const marker = readOrderMarker(kopie)!;
    const fertig = workCopyToCharacter(kopie, marker);
    expect(readOrderMarker(fertig)).toBeUndefined();
    expect(fertig.id).toBe("hike");
  });

  it(`geht die ganze Runde: bearbeiten, abschicken, ankommen`, () => {
    // Der Spieler hat nebenher gespielt (Schaden) — das darf nicht zurückfallen.
    const imRegal = character({ rev: 4 });
    const beimSpieler = character({ rev: 7, hp: { damage: 26, nonlethal: 0, temp: 0 } });

    const kopie = makeWorkCopy(imRegal, { gistId: "g1", owner: "Jonas", now: NOW });
    const marker = readOrderMarker(kopie)!;
    // Der Spielleiter hebt die Stufe.
    const bearbeitet = characterSchema.parse({
      ...kopie,
      levels: [...kopie.levels, { classId: "srd:class:fighter", hpRoll: "avg" }],
    });

    const auftrag = issueOrder({
      id: "a1",
      edited: workCopyToCharacter(bearbeitet, marker),
      base: imRegal,
      issuedBy: "Philipp",
      note: "Stufe 2",
      now: NOW,
    });

    const result = applyOrder(auftrag, beimSpieler, { now: NOW, day: "2026-07-29", from: "Philipp" });
    expect(result.outcome).toBe("angewendet");
    if (result.outcome !== "angewendet") return;
    expect(result.next.id).toBe("hike");
    expect(result.next.levels).toHaveLength(2);
    expect(result.next.hp.damage).toBe(26);
    expect(readOrderMarker(result.next)).toBeUndefined();
  });
});
