import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { entitySchema, resolveCompendium, type Entity, type ItemEntity } from "../schema/entities.js";
import { buildDeity, deityOf, warDomainGrant, warFocusStatus } from "../compendium/deity.js";
import { proficiencyFor, proficiencyOf } from "../compendium/proficiency.js";
import { deriveSheet } from "./index.js";

/*
  KOPFNOTIZ: keine deutschen Anfuehrungszeichen in dieser Datei.

  Was die War-Domaene GEWAEHRT, kostet nichts.

  Der Anlass ist ein echter Fehler, und zwar an genau der Stelle, an der die App
  selbst zum Eintragen auffordert: der Knopf im Zauber-Reiter legt eine
  Talentzeile an, `featSlots.used` zaehlt stumpf jede Zeile, und aus "6 von 6"
  wurde "7 von 6" samt Ruege. Ein Knopf, der etwas verspricht und danach ruegt,
  ist die Fehlerfamilie dieses Projekts in Reinform.

  Gemessen wird gegen die ECHTEN Packs: die Zahl haengt an der Kaempfer-Tabelle
  (Bonustalente auf Stufe 1 und 2), am Menschen-Bonustalent und an
  baseFeatSlots — mit erfundenen Kennungen waere nichts davon bewiesen.
*/

const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const manifestPath = join(packsDir, "manifest.json");
const packsAvailable = existsSync(manifestPath);

function loadEntities(): Entity[] {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: string[] };
  const entities: Entity[] = [];
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    for (const item of JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[]) {
      entities.push(entitySchema.parse(item));
    }
  }
  return entities;
}

const WAR = "srd:spelllist:domain-war";
const HEALING = "srd:spelllist:domain-healing";
const CLERIC = "srd:class:cleric";
const FIGHTER = "srd:class:fighter";
const HALBERD = "srd:item:halberd";

/*
  Eine Gottheit mit Lieblingswaffe — Homebrew, weil die App keine Goetter
  mitliefert (deren Namen stehen nicht im freien SRD). Genau so legt sein Tisch
  seine an; der Name hier ist ein Platzhalter und keine Product Identity.
*/
const kriegsgott = buildDeity({
  id: "hb:deity:kriegsgott-probe",
  name: "Kriegsgott (Probe)",
  domainIds: [WAR, "srd:spelllist:domain-good"],
  favoredWeaponId: HALBERD,
  favoredWeaponName: "Halbarte",
});
/** Dieselbe Gottheit OHNE Lieblingswaffe: dann gibt es nichts zu gewaehren. */
const namenlos = buildDeity({
  id: "hb:deity:ohne-waffe",
  name: "Ohne Lieblingswaffe (Probe)",
  domainIds: [WAR],
});

/** Sein Bogen, auf das Noetige zusammengezogen: Mensch, Kaempfer 3 / Kleriker 4. */
function hike(patch: Record<string, unknown> = {}): Character {
  return characterSchema.parse({
    id: "war-grant-1",
    name: "Hike (Probe)",
    raceId: "srd:race:human",
    abilities: { base: { str: 16, dex: 13, con: 14, int: 10, wis: 14, cha: 14 } },
    levels: [
      ...Array.from({ length: 3 }, () => ({ classId: FIGHTER, hpRoll: "avg" as const })),
      ...Array.from({ length: 4 }, () => ({ classId: CLERIC, hpRoll: "avg" as const })),
    ],
    deityRef: kriegsgott.id,
    deity: kriegsgott.name,
    domains: [
      { classId: CLERIC, spellListId: HEALING },
      { classId: CLERIC, spellListId: WAR },
    ],
    /* Seine sechs echten Talente aus dem Fight-Club-Bogen. */
    feats: [
      { featId: "srd:feat:dodge" },
      { featId: "srd:feat:extra-turning" },
      { featId: "srd:feat:improved-initiative" },
      { featId: "srd:feat:power-attack" },
      { featId: "srd:feat:weapon-focus", choiceRef: "srd:item:sword-short", choice: "Kurzschwert" },
      { featId: "srd:feat:weapon-focus", choiceRef: "srd:item:greatsword", choice: "Zweihaender" },
    ],
    ...patch,
  });
}

describe.skipIf(!packsAvailable)("Was die War-Domaene gewaehrt", () => {
  const compendium = packsAvailable
    ? resolveCompendium([...loadEntities(), kriegsgott, namenlos])
    : new Map<string, Entity>();
  const slots = (c: Character) => deriveSheet(c, compendium).featSlots;
  const codes = (c: Character) =>
    deriveSheet(c, compendium)
      .issues.filter((i) => i.code.startsWith("feat-slots"))
      .map((i) => i.code);

  it("die Bedingung steht an EINER Stelle und braucht kein Kompendium", () => {
    const deity = deityOf(hike(), compendium);
    expect(warDomainGrant(deity, [{ spellListId: WAR }])?.weaponId).toBe(HALBERD);
    // Ohne War-Domaene, ohne Gottheit, ohne Lieblingswaffe: jeweils nichts.
    expect(warDomainGrant(deity, [{ spellListId: HEALING }])).toBeNull();
    expect(warDomainGrant(null, [{ spellListId: WAR }])).toBeNull();
    expect(warDomainGrant(deityOf(hike({ deityRef: namenlos.id }), compendium), [{ spellListId: WAR }])).toBeNull();
  });

  it("Mensch, Kaempfer 3 / Kleriker 4: 6 Plaetze aus den Regeln — plus der geschenkte", () => {
    /*
      6 = 3 (aus Stufe 7: 1 + floor(7/3)) + 1 (Mensch) + 2 (Kaempfer-Bonustalent
      auf Stufe 1 und 2). Die Gegenprobe ohne War-Domaene haelt die 6 fest — sonst
      wuerde dieser Test die geschenkte 7 auch dann fuer richtig halten, wenn die
      Grundrechnung falsch waere.
    */
    const ohneWar = hike({ domains: [{ classId: CLERIC, spellListId: HEALING }] });
    expect(slots(ohneWar)).toMatchObject({ available: 6, used: 6 });
    expect(codes(ohneWar)).toEqual([]);

    expect(slots(hike()).available).toBe(7);
  });

  it("der geschenkte Platz steht da, BEVOR das Talent eingetragen ist", () => {
    /*
      Sonst haengt die Zahl am Eintragen, und der freie Focus waere unsichtbar.
      "1 Slot ist noch frei" ist hier die Wahrheit: seine Gottheit schenkt ihm einen.
    */
    expect(slots(hike())).toMatchObject({ available: 7, used: 6 });
    expect(codes(hike())).toEqual(["feat-slots-open"]);
  });

  it("nach dem Eintragen: 7 von 7 und KEINE Ruege — das war der Fehler", () => {
    const mitHalbarte = hike({
      feats: [
        ...hike().feats,
        {
          featId: "srd:feat:weapon-focus",
          choiceRef: HALBERD,
          choice: "Halbarte",
          origin: { source: `War Domain (${kriegsgott.name})` },
        },
      ],
    });
    expect(slots(mitHalbarte)).toMatchObject({ available: 7, used: 7 });
    expect(codes(mitHalbarte)).toEqual([]);
  });

  it("der Hinweis am Bogen und der Platz kommen aus derselben Bedingung", () => {
    /*
      Zwei Leser, eine Wahrheit: stuende die Bedingung zweimal, waere irgendwann
      der Platz da und der Hinweis weg (oder umgekehrt).
    */
    const status = warFocusStatus(hike(), compendium);
    expect(status.applies).toBe(true);
    expect(status.granted).toBe(false);
    expect(slots(hike()).available).toBe(7);

    const ohneWar = hike({ domains: [{ classId: CLERIC, spellListId: HEALING }] });
    expect(warFocusStatus(ohneWar, compendium).applies).toBe(false);
    expect(slots(ohneWar).available).toBe(6);
  });

  it("die zweite Haelfte desselben Satzes: die Uebung mit der Lieblingswaffe", () => {
    /*
      Wortlaut der Granted Power: "Free Martial Weapon Proficiency with deity's
      favored weapon (if necessary) and Weapon Focus with the deity's favored
      weapon." Fuer seinen Kaempfer/Kleriker trifft das "if necessary" nicht zu
      (martialisch ist schon geuebt) — fuer einen REINEN Kleriker ist es der
      Unterschied zwischen minus 4 und keinem Malus.
    */
    const halbarte = compendium.get(HALBERD) as ItemEntity;
    const grant = warDomainGrant(deityOf(hike(), compendium), hike().domains);
    expect(grant).not.toBeNull();
    const gewaehrt = grant === null ? [] : [grant.weaponId];

    const reinerKleriker = proficiencyFor([CLERIC], "srd:race:human");
    expect(proficiencyOf(halbarte, reinerKleriker).kind).toBe("untrained");
    expect(proficiencyOf(halbarte, proficiencyFor([CLERIC], "srd:race:human", gewaehrt)).kind).toBe("ok");

    // Und beim Kaempfer aendert es nichts — es war schon in Ordnung.
    const mitKaempfer = proficiencyFor([FIGHTER, CLERIC], "srd:race:human");
    expect(proficiencyOf(halbarte, mitKaempfer).kind).toBe("ok");
    expect(proficiencyOf(halbarte, proficiencyFor([FIGHTER, CLERIC], "srd:race:human", gewaehrt)).kind).toBe("ok");
  });

  it("eine gewaehrte Waffe wird unter dem NACKTEN Schluessel abgelegt", () => {
    /*
      Die Falle, die diese Runde gekostet hat: die Tabellen fuehren "longsword",
      `proficiencyOf` streift beim Vergleich "srd:item:" ab — wer die volle
      Kennung ablegt, legt etwas ab, das niemand findet, und die Uebung greift
      still nicht.
    */
    expect(proficiencyFor([CLERIC], undefined, [HALBERD]).weapons.extraIds).toContain("halberd");
    expect(proficiencyFor([CLERIC], undefined, [HALBERD]).weapons.extraIds).not.toContain(HALBERD);
  });
});
