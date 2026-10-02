/**
 * Was die App über die geführte Ausrüstung WEISS — und bis zu dieser Runde nicht sagte.
 *
 * Sein Befund: „Ich habe beim Kampf keinen Überblick was ich eigentlich equipped hab und
 * was meine waffe kann." Drei der vier Angaben lagen längst in den Daten und hatten am
 * Angriff keinen Leser — die schlichteste Form der dritten Fehlerfamilie dieses Projekts
 * („etwas weiß es, und etwas anderes kann es nicht"):
 *
 *   `equipped`          war auf drei Stellen verstreut (die Marke an der Angriffszeile,
 *                       `armorCost.pieces`, `twoWeaponPossible`) und nirgends im Ganzen
 *   `rangeIncrementFt`  stand seit dem ersten ETL-Lauf in den Packs, gelesen hat sie
 *                       allein die Gepäckliste
 *   `weaponSummary`     die deutsche Erklärung aus `compendium/itemGerman.ts`
 *   `proficient`        die Übung wurde ausschließlich im Ausrüstungs-Reiter geprüft
 *
 * Der Test steht hier und nicht nur in der Teststrecke, weil zwei davon REGELN sind: ob
 * ein Kleriker mit einem Langschwert geübt ist, und was eine leere Hand bedeutet.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { withGermanItemNames } from "../compendium/itemGerman.js";
import { deriveSheet } from "./index.js";

const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const manifestPath = join(packsDir, "manifest.json");
const packsAvailable = existsSync(manifestPath);

function loadCompendium(): Map<string, Entity> {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: string[] };
  const entities: Entity[] = [];
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    for (const item of JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[]) {
      entities.push(entitySchema.parse(item));
    }
  }
  /*
    MIT der deutschen Überlagerung — so sieht das Kompendium in der App aus (`db/seed.ts`
    legt sie beim Einrichten darüber). Ohne sie wäre `weaponSummary` hier immer leer, und
    der Test bewiese genau das Gegenteil von dem, was am Tisch passiert.
  */
  return resolveCompendium(withGermanItemNames(entities));
}

const C = (raw: unknown): Character => characterSchema.parse(raw);

describe.skipIf(!packsAvailable)("Was geführt wird, und was die Waffe kann", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();

  const kleriker = (inventory: unknown[]) =>
    deriveSheet(
      C({
        id: "eq-1",
        name: "Waffenprobe",
        raceId: "srd:race:human",
        abilities: { base: { str: 14, dex: 12, con: 12, int: 10, wis: 15, cha: 12 } },
        levels: Array.from({ length: 3 }, () => ({ classId: "srd:class:cleric", hpRoll: "max" })),
        inventory,
      }),
      compendium,
    );

  const voll = () =>
    kleriker([
      { id: "i1", itemId: "srd:item:mace-heavy", qty: 1, slot: "mainHand" },
      { id: "i2", itemId: "srd:item:shield-light-wooden", qty: 1, slot: "offHand" },
      { id: "i3", itemId: "srd:item:leather", qty: 1, slot: "armor" },
      { id: "i4", itemId: "srd:item:longsword", qty: 1, slot: "none" },
      { id: "i5", itemId: "srd:item:shortbow", qty: 1, slot: "none" },
      /*
        Munition. Sie liegt hier, weil sie in den Packdaten `data.weapon` traegt und
        damit eine Angriffszeile bekommt — der Fall, an dem die Übungsfrage sich gar
        nicht stellt.
      */
      { id: "i6", itemId: "srd:item:arrows-20", qty: 1, slot: "none" },
    ]);

  it("`equipped` nennt jede Hand und die Rüstung", () => {
    const e = voll().equipped;
    expect(e.mainHand).toContain("Streitkolben");
    expect(e.offHand).toContain("Holzschild");
    expect(e.armor).toContain("Leder");
    expect(e.bothHands).toBeNull();
  });

  it("und eine leere Hand ist `null` — nicht ein fehlender Eintrag", () => {
    /*
      Das ist die halbe Auskunft, um die es geht: am Tisch ist die Frage, ob noch eine
      Hand frei ist. Ein weggelassenes Feld könnte die Anzeige nicht von „weiß ich nicht"
      unterscheiden, und genau daraus entstünde eine Karte, die schweigt.
    */
    const e = kleriker([]).equipped;
    expect(e).toEqual({ mainHand: null, offHand: null, bothHands: null, armor: null });
  });

  it("ein Zweihänder belegt `bothHands` und lässt die Einzelhände leer", () => {
    const e = kleriker([
      { id: "i1", itemId: "srd:item:greatsword", qty: 1, slot: "bothHands" },
    ]).equipped;
    expect(e.bothHands).toContain("Zweihänder");
    expect(e.mainHand).toBeNull();
    expect(e.offHand).toBeNull();
  });

  const zeile = (sheet: ReturnType<typeof kleriker>, teil: string) => {
    const line = sheet.attacks.find((a) => a.label.includes(teil));
    if (!line) throw new Error(`Angriffszeile ${teil} fehlt — ${sheet.attacks.map((a) => a.label).join(", ")}`);
    return line;
  };

  it("die Reichweite steht an der Fernwaffe — und an keiner Nahkampfwaffe", () => {
    const sheet = voll();
    expect(zeile(sheet, "Kurzbogen").rangeIncrementFt).toBe(60);
    // Die Gegenprobe: ohne sie wäre eine Zahl an JEDER Waffe auch grün.
    expect(zeile(sheet, "Streitkolben").rangeIncrementFt).toBeUndefined();
  });

  it("die Übung wird GEMELDET — in beide Richtungen", () => {
    /*
      Ein Kleriker ist mit einfachen Waffen geübt (Streitkolben) und mit martialischen
      nicht (Langschwert, Kurzbogen). Beide Richtungen, sonst wäre eine Marke, die an
      JEDER Waffe steht, genauso grün.
    */
    const sheet = voll();
    expect(zeile(sheet, "Streitkolben").proficient).toBe(true);
    expect(zeile(sheet, "Langschwert").proficient).toBe(false);
    expect(zeile(sheet, "Kurzbogen").proficient).toBe(false);
  });

  it("und GERECHNET: ohne Übung vier weniger auf den Angriff", () => {
    /*
      Hier stand eine Runde lang das Gegenteil, und zwar mit Absicht: `gemeldet, nicht
      GERECHNET — der Angriffswert bleibt derselbe`. Der Malus verschiebt Zahlen an
      BESTEHENDEN Bögen, also war er eine Regelentscheidung für seinen Tisch und keine
      Programmierentscheidung. Gefragt und beantwortet, wörtlich: `Ja -4 zählt.`

      Verglichen werden zwei Waffen mit demselben Grundwert: Streitkolben (geübt) und
      Langschwert (nicht geübt) sind beide einhändig, STR +2, BAB +2. Die DIFFERENZ ist
      die Zusage — eine feste Zahl wäre auch dann grün, wenn irgendwo anders vier
      verlorengingen.
    */
    const sheet = voll();
    const geuebt = zeile(sheet, "Streitkolben").attack.total;
    expect(zeile(sheet, "Langschwert").attack.total).toBe(geuebt - 4);
    expect(zeile(sheet, "Kurzbogen").attack.contributions.map((c) => c.source)).toContain(
      "Nicht geübt",
    );
  });

  it("der Schaden bleibt unberührt — der Malus steht nur auf dem Angriff", () => {
    /*
      Die Gegenprobe, und sie ist die Hälfte, die man vergisst. Das Regelwerk legt den
      Malus auf den ANGRIFFSWURF; würde er auch im Schaden landen, sähe die Zahl
      plausibel aus und wäre falsch.
    */
    const sheet = voll();
    expect(zeile(sheet, "Langschwert").damageBonus.total).toBe(
      zeile(sheet, "Streitkolben").damageBonus.total,
    );
    expect(zeile(sheet, "Langschwert").damageText).toBe("1d8+2");
  });

  it("Munition ist keine Übungsfrage — kein Feld, kein Malus", () => {
    /*
      Der Fall, den die erste Fassung verschluckt hätte. Pfeile tragen in den Packdaten
      `data.weapon` (mit `damage: —`) und bekommen damit eine Angriffszeile; `kind ===
      "ok"` war dort `false`, also stand an einem Bündel Pfeile `nicht geübt` — und mit
      dem Malus wären daraus still vier Punkte geworden.

      Geprüft wird BEIDES: das Feld fehlt, und der Angriffswert trägt den Beitrag nicht.
      Das Feld allein zu prüfen wäre die halbe Wahrheit — genau daran hängt der Malus
      aber nicht, sondern an derselben Auskunft eine Zeile höher.
    */
    const sheet = voll();
    const pfeile = zeile(sheet, "Pfeile (20)");
    expect(pfeile.proficient).toBeUndefined();
    expect(pfeile.attack.contributions.map((c) => c.source)).not.toContain("Nicht geübt");
  });

  it("der Regeltext kommt mit — deutsch UND englisch", () => {
    /*
      Zwei Felder und kein zusammengesetzter Satz: die deutsche Erklärung ist seine
      Vorgabe für Ausrüstung („immer auf deutsch im Namen und Erklärung"), der englische
      SRD-Text trägt die Einzelheiten. Die Engine baut daraus keinen Satz — sonst stünden
      Regeltexte an zwei Orten.
    */
    const bogen = zeile(voll(), "Kurzbogen");
    expect(bogen.weaponSummary).toBeTypeOf("string");
    expect(bogen.weaponSummary).not.toBe("");
    expect(bogen.weaponRules).toBeTypeOf("string");
  });

  it("die zwei Sammelzeilen tragen nichts davon", () => {
    /*
      Nahkampf und Fernkampf sind keine Waffe: eine Übungs-Marke dort wäre eine Aussage
      über nichts, und eine Reichweite erst recht.
    */
    const sheet = voll();
    for (const key of ["melee", "ranged"]) {
      const line = sheet.attacks.find((a) => a.key === key)!;
      expect(line.proficient, key).toBeUndefined();
      expect(line.rangeIncrementFt, key).toBeUndefined();
      expect(line.weaponSummary, key).toBeUndefined();
    }
  });
});
