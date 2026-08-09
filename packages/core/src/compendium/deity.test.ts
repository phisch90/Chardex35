import { describe, expect, it } from "vitest";
import { buildDeity, deityOf, domainsOutsideDeity, warFocusStatus, WAR_DOMAIN_ID } from "./deity.js";
import { entitySchema, type Entity } from "../schema/entities.js";
import { characterSchema, type Character } from "../schema/character.js";

/* KOPFNOTIZ: keine deutschen Anfuehrungszeichen in dieser Datei. */

const kord = buildDeity({
  name: "Kriegsgott (Probe)",
  domainIds: [WAR_DOMAIN_ID, "srd:spelllist:domain-strength"],
  favoredWeaponId: "srd:item:longsword",
  favoredWeaponName: "Langschwert",
});

const longsword = entitySchema.parse({
  id: "srd:item:longsword",
  kind: "item",
  name: "Longsword",
  source: "srd",
  data: { weight: 4, weapon: { damage: "1d8", handedness: "one" } },
});

const eigenesSchwert = entitySchema.parse({
  id: "hb:item:templerschwert",
  kind: "item",
  name: "Templerschwert",
  source: "homebrew",
  basedOn: "srd:item:longsword",
  data: { weight: 4, weapon: { damage: "1d8", handedness: "one" } },
});

const comp = new Map<string, Entity>([
  [kord.id, kord],
  [longsword.id, longsword],
  [eigenesSchwert.id, eigenesSchwert],
]);

function char(patch: Record<string, unknown>): Character {
  return characterSchema.parse({
    id: "c1",
    name: "Probe",
    raceId: "srd:race:human",
    levels: [{ classId: "srd:class:cleric", hpRoll: "avg" }],
    abilities: { base: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 } },
    ...patch,
  });
}

describe("Gottheiten", () => {
  it("buildDeity geht durchs Schema und ist homebrew", () => {
    expect(kord.kind).toBe("deity");
    expect(kord.source).toBe("homebrew");
    expect(kord.id.startsWith("hb:deity:")).toBe(true);
  });

  it("deityOf loest nur echte, nicht geloeschte Gottheiten auf", () => {
    expect(deityOf(char({ deityRef: kord.id }), comp)?.name).toBe(kord.name);
    expect(deityOf(char({}), comp)).toBeUndefined();
    expect(deityOf(char({ deityRef: "srd:item:longsword" }), comp)).toBeUndefined();
  });

  it("domainsOutsideDeity meldet nur Fremdes — und ohne Gottheit nichts", () => {
    const mitFremder = char({
      deityRef: kord.id,
      domains: [
        { classId: "srd:class:cleric", spellListId: WAR_DOMAIN_ID },
        { classId: "srd:class:cleric", spellListId: "srd:spelllist:domain-healing" },
      ],
    });
    expect(domainsOutsideDeity(mitFremder, comp)).toEqual(["srd:spelllist:domain-healing"]);
    // Ohne Verweis gibt es nichts zu pruefen — kein Raten ueber den Namen.
    expect(domainsOutsideDeity(char({ deity: "Kord" }), comp)).toEqual([]);
  });

  it("warFocusStatus: gilt nur mit War-Domaene UND Gottheit mit Lieblingswaffe", () => {
    expect(warFocusStatus(char({}), comp).applies).toBe(false);
    expect(warFocusStatus(char({ deityRef: kord.id }), comp).applies).toBe(false);
    const beides = char({
      deityRef: kord.id,
      domains: [{ classId: "srd:class:cleric", spellListId: WAR_DOMAIN_ID }],
    });
    const status = warFocusStatus(beides, comp);
    expect(status.applies).toBe(true);
    expect(status.granted).toBe(false);
    expect(status.weaponName).toBe("Langschwert");
  });

  it("granted erkennt die Waffe an der Kennung — auch ueber basedOn", () => {
    const basis = {
      deityRef: kord.id,
      domains: [{ classId: "srd:class:cleric", spellListId: WAR_DOMAIN_ID }],
    };
    const direkt = char({
      ...basis,
      feats: [{ featId: "srd:feat:weapon-focus", choiceRef: "srd:item:longsword" }],
    });
    expect(warFocusStatus(direkt, comp).granted).toBe(true);
    // Die eigene Variante desselben Typs zaehlt mit — wie in derive.ts.
    const variante = char({
      ...basis,
      feats: [{ featId: "srd:feat:weapon-focus", choiceRef: "hb:item:templerschwert" }],
    });
    expect(warFocusStatus(variante, comp).granted).toBe(true);
    // Ein Weapon Focus auf die FALSCHE Waffe zaehlt nicht.
    const falsch = char({
      ...basis,
      feats: [{ featId: "srd:feat:weapon-focus", choiceRef: "srd:item:dagger" }],
    });
    expect(warFocusStatus(falsch, comp).granted).toBe(false);
  });

  it("die Herkunft am Talent ist optional — alte Boegen parsen unveraendert", () => {
    const alt = char({ feats: [{ featId: "srd:feat:dodge" }] });
    expect(alt.feats[0]!.origin).toBeUndefined();
    const neu = char({
      feats: [{ featId: "srd:feat:dodge", origin: { level: 3 } }],
    });
    expect(neu.feats[0]!.origin).toEqual({ level: 3 });
  });
});
