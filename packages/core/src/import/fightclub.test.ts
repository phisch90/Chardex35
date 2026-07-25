import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { deriveSheet } from "../engine/index.js";
import { importFightClubXml, parseFightClubXml, parseRaceClass } from "./fightclub.js";

/**
 * Struktur-identischer Nachbau eines echten Fight-Club-3.5-Exports
 * (Human Fighter 3/Cleric 4, deutsche Waffennamen im Homebrew-Stil).
 */
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<characters version="3">
	<pc>
		<name>Import Testfall</name>
		<raceClass>Human Fighter 3/Cleric 4</raceClass>
		<size>M</size>
		<cr>7</cr>
		<init>1</init>
		<ac>16</ac><touch>12</touch><flat>14</flat>
		<hp>36/62 (7 HD)</hp>
		<fort>8</fort><ref>3</ref><will>5</will>
		<speed>30 ft.</speed>
		<str>15</str><dex>13</dex><con>12</con><int>8</int><wis>11</wis><cha>10</cha>
		<bab>6</bab>
		<grapple>8</grapple>
		<action>
			<name>Sword, Short</name>
			<attack>+9/+4</attack>
			<damage>1d6+2</damage>
			<critical>19/x2</critical>
		</action>
		<action>
			<name>Templer Schwert</name>
			<attack>+9/+4</attack>
			<damage>1d6+2</damage>
			<critical>19/x2</critical>
		</action>
		<action>
			<name>Greatsword</name>
			<attack>+9/+4</attack>
			<damage>2d6+2</damage>
			<critical>19/x2</critical>
		</action>
		<action>
			<name>Dagger</name>
			<attack>+8/+3</attack>
			<damage>1d3+2</damage>
			<critical>19/x3</critical>
		</action>
		<feats>Dodge, Extra Turning, Improved Initiative, Power Attack, Weapon Focus Kurzschwert, Weapon Focus Zweihänder</feats>
		<skills>Bluff (1) +1, Climb (1) +3, Diplomacy (1) +1, Hide (1) +2, Intimidate (3) +3, Jump (2) +4, Move Silently (1) +2, Search (1) +0, Spellcraft (1) +0, Spot (1) +1</skills>
	</pc>
</characters>`;

describe("parseFightClubXml", () => {
  const { pcs, issues } = parseFightClubXml(XML);
  const pc = pcs[0]!;

  it("liest genau einen Charakter ohne Meckern", () => {
    expect(pcs).toHaveLength(1);
    expect(issues).toEqual([]);
  });

  it("liest Kopfdaten und Attribute (Endwerte)", () => {
    expect(pc.name).toBe("Import Testfall");
    expect(pc.raceClass).toBe("Human Fighter 3/Cleric 4");
    expect(pc.abilities).toEqual({ str: 15, dex: 13, con: 12, int: 8, wis: 11, cha: 10 });
    expect(pc.ac).toBe(16);
    expect(pc.touch).toBe(12);
    expect(pc.flatFooted).toBe(14);
    expect(pc.bab).toBe(6);
    expect(pc.grapple).toBe(8);
    expect(pc.saves).toEqual({ fort: 8, ref: 3, will: 5 });
    expect(pc.init).toBe(1);
  });

  it("zerlegt '36/62 (7 HD)' in aktuelle und maximale TP", () => {
    expect(pc.hp).toEqual({ current: 36, max: 62 });
  });

  it("liest Talente, Fertigkeiten mit Rängen und Aktionen", () => {
    expect(pc.featTokens).toHaveLength(6);
    expect(pc.featTokens).toContain("Weapon Focus Kurzschwert");
    expect(pc.skills).toHaveLength(10);
    expect(pc.skills.find((s) => s.name === "Intimidate")).toEqual({
      name: "Intimidate",
      ranks: 3,
      total: 3,
    });
    expect(pc.actions.map((a) => a.name)).toEqual([
      "Sword, Short",
      "Templer Schwert",
      "Greatsword",
      "Dagger",
    ]);
  });

  it("meldet fehlende Charaktere statt zu crashen", () => {
    const empty = parseFightClubXml("<characters version=\"3\"></characters>");
    expect(empty.pcs).toEqual([]);
    expect(empty.issues[0]?.code).toBe("fc-no-characters");
  });

  it("erkennt Fertigkeiten mit Teilgebiet in Klammern", () => {
    const xml = `<characters version="3"><pc><name>X</name><raceClass>Human Cleric 1</raceClass>
      <skills>Knowledge (Religion) (2) +3, Bluff (1) +1</skills></pc></characters>`;
    const parsed = parseFightClubXml(xml).pcs[0]!;
    expect(parsed.skills[0]).toEqual({ name: "Knowledge (Religion)", ranks: 2, total: 3 });
  });

  it("zerreißt Kommas INNERHALB von Klammern nicht", () => {
    // SRD-Waffennamen enthalten Kommas („Sword, short") und tauchen in
    // Talent-Auswahlen auf — naives Splitten an ',' würde sie zerlegen.
    const xml = `<characters version="3"><pc><name>X</name><raceClass>Human Fighter 1</raceClass>
      <feats>Weapon Focus (Sword, short), Dodge</feats>
      <skills>Craft (armor, light) (2) +4, Bluff (1) +1</skills></pc></characters>`;
    const parsed = parseFightClubXml(xml).pcs[0]!;
    expect(parsed.featTokens).toEqual(["Weapon Focus (Sword, short)", "Dodge"]);
    expect(parsed.skills.map((s) => s.name)).toEqual(["Craft (armor, light)", "Bluff"]);
  });

  it("verwechselt Aktions-Namen nicht mit dem Charakternamen", () => {
    // Hier steht <action> VOR den Kopfdaten.
    const xml = `<characters version="3"><pc>
      <action><name>Dagger</name><damage>1d4</damage></action>
      <name>Echter Name</name><raceClass>Human Rogue 1</raceClass><ac>15</ac>
      </pc></characters>`;
    const parsed = parseFightClubXml(xml).pcs[0]!;
    expect(parsed.name).toBe("Echter Name");
    expect(parsed.ac).toBe(15);
    expect(parsed.actions.map((a) => a.name)).toEqual(["Dagger"]);
  });

  it("liest auch NSC-Blöcke", () => {
    const xml = `<characters version="3"><npc><name>Ork-Wache</name>
      <raceClass>Half-Orc Fighter 2</raceClass><hp>17</hp></npc></characters>`;
    const parsed = parseFightClubXml(xml).pcs;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.name).toBe("Ork-Wache");
    expect(parsed[0]!.hp).toEqual({ current: 17, max: 17 });
  });

  it("dekodiert XML-Entities (Namen mit & und Anführungszeichen)", () => {
    const xml = `<characters version="3"><pc><name>Bob &amp; Sons &quot;Der Kühne&quot;</name>
      <raceClass>Human Bard 1</raceClass></pc></characters>`;
    expect(parseFightClubXml(xml).pcs[0]!.name).toBe('Bob & Sons "Der Kühne"');
  });

  it("verkraftet halbe Ränge und fehlende Summen", () => {
    const xml = `<characters version="3"><pc><name>X</name><raceClass>Elf Rogue 1</raceClass>
      <skills>Hide (0.5), Spot (2) +4</skills></pc></characters>`;
    const parsed = parseFightClubXml(xml).pcs[0]!;
    expect(parsed.skills[0]).toEqual({ name: "Hide", ranks: 0.5, total: undefined });
  });
});

// ---------------------------------------------------------------------------
// Abbildung gegen die echten SRD-Packs
// ---------------------------------------------------------------------------

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
  return resolveCompendium(entities);
}

describe.skipIf(!packsAvailable)("Fight-Club-Import gegen die SRD-Packs", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();
  let counter = 0;
  const idFactory = () => `id-${++counter}`;
  const { results } = importFightClubXml(XML, compendium, { idFactory });
  const { character, issues, comparisons } = results[0]!;
  const sheet = deriveSheet(character, compendium);

  it("erkennt Volk und Multiclass-Stufen", () => {
    expect(parseRaceClass("Human Fighter 3/Cleric 4", compendium)).toEqual({
      raceId: "srd:race:human",
      classLevels: [
        { classId: "srd:class:fighter", level: 3 },
        { classId: "srd:class:cleric", level: 4 },
      ],
      unmatched: [],
    });
    expect(character.levels).toHaveLength(7);
    expect(sheet.classLevels.map((c) => `${c.className} ${c.level}`)).toEqual([
      "Fighter 3",
      "Cleric 4",
    ]);
  });

  it("rechnet Endwerte auf Basiswerte zurück (Mensch: unverändert)", () => {
    expect(character.abilities.base).toEqual({
      str: 15,
      dex: 13,
      con: 12,
      int: 8,
      wis: 11,
      cha: 10,
    });
    expect(sheet.abilities.str.score.total).toBe(15);
  });

  it("übernimmt TP exakt als festes Maximum plus Schaden", () => {
    expect(character.hp.overrideMax).toBe(62);
    expect(character.hp.damage).toBe(26);
    expect(sheet.hp.max).toBe(62);
    expect(sheet.hp.current).toBe(36);
  });

  it("reproduziert GAB, Rettungswürfe und Ringkampf des Originals exakt", () => {
    // Diese Werte kommen aus den Klassentabellen — hier darf NICHT ausgeglichen werden.
    expect(sheet.bab).toBe(6);
    expect(sheet.saves.fort.total).toBe(8);
    expect(sheet.saves.ref.total).toBe(3);
    expect(sheet.saves.will.total).toBe(5);
    expect(sheet.grapple.total).toBe(8);
    // Genau diese vier Werte müssen als „stimmt" gemeldet werden.
    const matching = comparisons.filter((c) => c.status === "match").map((c) => c.label);
    expect(matching).toEqual(["Fortitude", "Reflex", "Will", "GAB", "Ringkampf"]);
    expect(comparisons.filter((c) => c.status === "reconciled").map((c) => c.label)).toEqual(["RK"]);
  });

  it("gleicht die RK per sichtbarem Rüstungs-Modifikator an (nicht untyped!)", () => {
    const acMod = character.miscModifiers.find((m) => m.target === "ac");
    expect(acMod?.value).toBe(5);
    // „armor" bleibt korrekt aus der Berührungs-RK heraus und wird von echter
    // Rüstung überdeckt statt addiert.
    expect(acMod?.bonusType).toBe("armor");
    expect(acMod?.note).toContain("Fight-Club-Import");
    expect(sheet.ac.total.total).toBe(16);
    expect(sheet.ac.touch).toBe(11);
  });

  it("Save-Ausgleich nutzt 'resistance' (überdeckt später echte Resistenz-Boni)", () => {
    const withCloak = XML.replace("<will>5</will>", "<will>8</will>");
    let n = 0;
    const result = importFightClubXml(withCloak, compendium, { idFactory: () => `x-${++n}` })
      .results[0]!;
    const willMod = result.character.miscModifiers.find((m) => m.target === "save.will");
    expect(willMod?.value).toBe(3);
    expect(willMod?.bonusType).toBe("resistance");
    expect(deriveSheet(result.character, compendium).saves.will.total).toBe(8);
  });

  it("berichtet Abweichungen statt sie zu verbiegen (Initiative)", () => {
    // Fight Club listet hier nur den GE-Modifikator, die App zählt
    // 'Improved Initiative' mit.
    const init = comparisons.find((c) => c.label === "Initiative")!;
    expect(init.imported).toBe(1);
    expect(init.derived).toBe(5);
    expect(init.status).toBe("reported");
    expect(init.hint).toBeTruthy();
    expect(character.miscModifiers.some((m) => m.target === "init")).toBe(false);
  });

  it("ordnet Talente zu und rettet deutsche Waffennamen in die Auswahl", () => {
    expect(character.feats).toHaveLength(6);
    expect(character.feats).toContainEqual({ featId: "srd:feat:dodge" });
    expect(character.feats).toContainEqual({
      featId: "srd:feat:weapon-focus",
      choice: "Kurzschwert",
    });
    expect(character.feats).toContainEqual({
      featId: "srd:feat:weapon-focus",
      choice: "Zweihänder",
    });
    // „Weapon Focus" darf NICHT mit „Greater/Epic Weapon Focus" verwechselt werden.
    expect(character.feats.some((f) => f.featId.includes("greater"))).toBe(false);
  });

  it("übernimmt Fertigkeitsränge; die Summen der App decken sich mit dem Original", () => {
    expect(character.skillRanks["srd:skill:intimidate"]).toBe(3);
    expect(character.skillRanks["srd:skill:jump"]).toBe(2);
    const skillDeviations = comparisons.filter(
      (c) => !["RK", "GAB", "Ringkampf", "Initiative", "Fortitude", "Reflex", "Will"].includes(c.label),
    );
    expect(skillDeviations).toEqual([]);
    // Stichprobe: Intimidate 3 Ränge + CH 0 = +3 wie im Original.
    expect(
      sheet.skills.find((s) => s.skillId === "srd:skill:intimidate")?.total.total,
    ).toBe(3);
  });

  it("legt SRD-Waffen angelegt ins Inventar, Eigenbauten als freie Zeile", () => {
    const ids = character.inventory.map((i) => i.itemId ?? i.customName);
    expect(ids).toEqual([
      "srd:item:sword-short",
      "Templer Schwert",
      "srd:item:greatsword",
      "srd:item:dagger",
    ]);
    const custom = character.inventory.find((i) => i.customName === "Templer Schwert")!;
    expect(custom.notes).toContain("1d6+2");
    // Angelegte SRD-Waffen erzeugen eigene Angriffszeilen im Bogen.
    expect(sheet.attacks.some((a) => a.label === "Greatsword")).toBe(true);
  });

  it("erzeugt keine Fehler-Issues und keine kaputten Referenzen", () => {
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(sheet.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("hält die Herkunft in den Notizen fest", () => {
    expect(character.notes).toContain("Fight Club");
    expect(character.notes).toContain("Human Fighter 3/Cleric 4");
  });

  it("meldet unbekannte Klassen ohne den Import abzubrechen", () => {
    const xml = XML.replace(
      "<raceClass>Human Fighter 3/Cleric 4</raceClass>",
      "<raceClass>Human Fighter 3/Kriegsmagier 4</raceClass>",
    );
    const result = importFightClubXml(xml, compendium, { idFactory }).results[0]!;
    expect(result.issues.some((i) => i.code === "class-unmatched")).toBe(true);
    expect(result.character.levels).toHaveLength(3);
  });
});
