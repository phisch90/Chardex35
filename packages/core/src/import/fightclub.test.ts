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

function loadPackEntities(): Entity[] {
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

function loadCompendium(): Map<string, Entity> {
  return resolveCompendium(loadPackEntities());
}

describe.skipIf(!packsAvailable)("Fight-Club-Import gegen die SRD-Packs", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();
  let counter = 0;
  const idFactory = () => `id-${++counter}`;
  const { results } = importFightClubXml(XML, compendium, { idFactory });
  const { character, issues, comparisons } = results[0]!;
  // Beim Import erzeugte Homebrew-Einträge gehören ins Kompendium — die App
  // speichert sie (ImportPage), also muss der Bogen sie hier auch kennen.
  const withImported = packsAvailable
    ? resolveCompendium([...loadPackEntities(), ...results[0]!.entities])
    : compendium;
  const sheet = deriveSheet(character, withImported);

  it("erkennt Volk und Multiclass-Stufen", () => {
    expect(parseRaceClass("Human Fighter 3/Cleric 4", compendium)).toEqual({
      raceId: "srd:race:human",
      unknownRace: null,
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

  it("gleicht die RK per sichtbaren Modifikatoren an (nie untyped)", () => {
    const acMods = character.miscModifiers.filter((m) => m.target === "ac");
    // Summe trifft den Importwert; kein untyped, damit Berührungs-RK und
    // späteres 3.5-Stacking mit echter Ausrüstung korrekt bleiben.
    expect(acMods.reduce((sum, m) => sum + m.value, 0)).toBe(5);
    expect(acMods.every((m) => m.bonusType !== "untyped")).toBe(true);
    expect(acMods.every((m) => m.note.includes("Fight-Club-Import"))).toBe(true);
    expect(sheet.ac.total.total).toBe(16);
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
    // Fight Club listet hier nur den DEX-Modifikator, die App zählt
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
    expect(character.feats).toContainEqual({ featId: "srd:feat:dodge", extraEffects: [] });
    // Die Auswahl trägt zusätzlich den Verweis auf die Waffe — nur damit wirkt
    // der Bonus (siehe eigener Test weiter unten).
    expect(character.feats).toContainEqual({
      featId: "srd:feat:weapon-focus",
      extraEffects: [],
      choice: "Kurzschwert",
      choiceRef: "srd:item:sword-short",
    });
    expect(character.feats).toContainEqual({
      featId: "srd:feat:weapon-focus",
      choice: "Zweihänder",
      choiceRef: "srd:item:greatsword",
      extraEffects: [],
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

  it("legt jede Waffe angelegt ins Inventar — Eigenbauten als Homebrew-Eintrag", () => {
    const ids = character.inventory.map((i) => i.itemId);
    expect(ids).toEqual([
      "srd:item:sword-short",
      "homebrew:item:templer-schwert",
      "srd:item:greatsword",
      "srd:item:dagger",
    ]);
    /*
      Fight Clubs <action>-Zeilen sind ANGRIFFE, nicht das, was in der Hand liegt.
      Vorher bekam JEDE Waffe die Marke 1H — vier Waffen in zwei Händen, und vier
      Angriffszeilen auf dem Bogen. Genau das ist Philipp aufgefallen.
    */
    const inHand = character.inventory.filter((i) => i.slot !== "none");
    expect(inHand).toHaveLength(1);
    expect(inHand[0]?.slot).toBe("mainHand");
    expect(character.inventory.filter((i) => i.slot === "none")).toHaveLength(3);
    expect(issues.some((i) => i.code === "weapons-stowed")).toBe(true);
    // Jede angelegte Waffe erzeugt eine eigene Angriffszeile im Bogen.
    for (const label of ["Sword, short", "Templer Schwert", "Greatsword", "Dagger"]) {
      expect(sheet.attacks.some((a) => a.label === label), label).toBe(true);
    }
  });

  it("erzeugt keine Fehler-Issues und keine kaputten Referenzen", () => {
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(sheet.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("hält die Herkunft in einem eigenen Notiz-Abschnitt fest", () => {
    const section = character.noteSections[0]!;
    expect(section.title).toContain("Fight Club");
    expect(section.body).toContain("Human Fighter 3/Cleric 4");
    expect(section.body).toContain("Angriffe im Original");
  });

  it("hält negative TP fest: ein sterbender Charakter bleibt sterbend", () => {
    const dying = XML.replace("<hp>36/62 (7 HD)</hp>", "<hp>-3/62 (7 HD)</hp>");
    let n = 0;
    const result = importFightClubXml(dying, compendium, { idFactory: () => `d-${++n}` }).results[0]!;
    expect(result.character.hp.damage).toBe(65);
    expect(deriveSheet(result.character, compendium).hp.current).toBe(-3);
  });

  it("rekonstruiert auch die Berührungs-RK (Aufteilung Rüstung/Ablenkung)", () => {
    // Original: RK 16, Berührung 12 → +4 Rüstung (nicht gegen Berührung)
    // und +1 Ablenkung (auch gegen Berührung).
    expect(sheet.ac.total.total).toBe(16);
    expect(sheet.ac.touch.total).toBe(12);
    const types = character.miscModifiers
      .filter((m) => m.target === "ac")
      .map((m) => `${m.bonusType}${m.value >= 0 ? "+" : ""}${m.value}`)
      .sort();
    expect(types).toEqual(["armor+4", "deflection+1"]);
  });

  it("Mönch: der RK-Bonus gilt auch gegen Berührung", () => {
    const monk = `<characters version="3"><pc><name>Mönch</name>
      <raceClass>Human Monk 5</raceClass><size>M</size>
      <str>12</str><dex>16</dex><con>12</con><int>10</int><wis>16</wis><cha>10</cha>
      <ac>17</ac><touch>17</touch><hp>30/30</hp></pc></characters>`;
    let n = 0;
    const result = importFightClubXml(monk, compendium, { idFactory: () => `m-${++n}` }).results[0]!;
    const monkSheet = deriveSheet(result.character, compendium);
    expect(monkSheet.ac.total.total).toBe(17);
    expect(monkSheet.ac.touch.total).toBe(17);
  });

  it("legt für Nicht-SRD-Völker ein Platzhalter-Volk an statt einen kaputten Bogen", () => {
    const ogre = `<characters version="3"><npc><name>Grunk</name>
      <raceClass>Ogre Barbarian 2</raceClass><size>L</size><speed>40 ft.</speed>
      <str>21</str><dex>8</dex><con>15</con><int>6</int><wis>10</wis><cha>7</cha>
      <hp>29/29</hp></npc></characters>`;
    let n = 0;
    const result = importFightClubXml(ogre, compendium, { idFactory: () => `o-${++n}` }).results[0]!;
    expect(result.entities).toHaveLength(1);
    const race = result.entities[0]!;
    expect(race.kind).toBe("race");
    expect(race.name).toBe("Ogre");
    expect(race.source).toBe("homebrew");
    if (race.kind === "race") {
      expect(race.data.size).toBe("large");
      expect(race.data.speedFt).toBe(40);
      // Attributsmodifikatoren MÜSSEN leer bleiben: sie stecken schon in den
      // exportierten Endwerten.
      expect(race.data.abilityMods).toEqual({});
    }
    expect(result.character.raceId).toBe(race.id);
    expect(result.character.levels).toHaveLength(2);

    // Der Bogen rechnet vollständig — mit dem Platzhalter im Kompendium.
    const withPlaceholder = resolveCompendium([
      ...[...compendium.values()],
      ...result.entities,
    ]);
    const ogreSheet = deriveSheet(result.character, withPlaceholder);
    expect(ogreSheet.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(ogreSheet.size).toBe("large");
    expect(ogreSheet.speedFt.total).toBe(40);
    expect(ogreSheet.abilities.str.score.total).toBe(21);
  });

  it("führt Teilgebiete getrennt — eigene Ränge je Knowledge", () => {
    const wizard = `<characters version="3"><pc><name>Magier</name>
      <raceClass>Elf Wizard 5</raceClass>
      <str>8</str><dex>14</dex><con>12</con><int>18</int><wis>12</wis><cha>10</cha>
      <hp>20/20</hp>
      <skills>Knowledge (Arcana) (8) +12, Knowledge (Religion) (5) +9, Spellcraft (8) +12</skills>
      </pc></characters>`;
    let n = 0;
    const result = importFightClubXml(wizard, compendium, { idFactory: () => `w-${++n}` }).results[0]!;
    const { character } = result;
    // Zwei eigenständige Fertigkeiten, nichts wird zusammengelegt.
    expect(character.skillRanks["srd:skill:knowledge#arcana"]).toBe(8);
    expect(character.skillRanks["srd:skill:knowledge#religion"]).toBe(5);
    expect(character.skillRanks["srd:skill:knowledge"]).toBeUndefined();
    expect(character.skillSubtypes).toEqual([
      { skillId: "srd:skill:knowledge", subtype: "arcana" },
      { skillId: "srd:skill:knowledge", subtype: "religion" },
    ]);

    const wizSheet = deriveSheet(character, compendium);
    expect(wizSheet.issues.filter((i) => i.code === "max-ranks")).toEqual([]);
    // Kein „Teilgebiete werden nicht getrennt geführt"-Hinweis mehr.
    expect(result.issues.filter((i) => i.code === "skill-subtype")).toEqual([]);
    // Die Originalzeilen stehen weiterhin im Herkunfts-Abschnitt.
    expect(character.noteSections[0]!.body).toContain("Knowledge (Religion) (5)");

    // Beide Zeilen stehen im Bogen und stimmen mit dem Original überein.
    const arcana = wizSheet.skills.find((s) => s.key === "srd:skill:knowledge#arcana")!;
    const religion = wizSheet.skills.find((s) => s.key === "srd:skill:knowledge#religion")!;
    expect(arcana.name).toBe("Knowledge (arcana)");
    expect(arcana.total.total).toBe(12); // 8 Ränge + 4 IN
    expect(religion.total.total).toBe(9); // 5 Ränge + 4 IN
    // Synergie hängt am Teilgebiet: Knowledge (arcana) ≥5 → Spellcraft +2.
    const spellcraft = wizSheet.skills.find((s) => s.key === "srd:skill:spellcraft")!;
    expect(spellcraft.total.contributions.some((c) => c.source.includes("arcana"))).toBe(true);
    expect(spellcraft.total.total).toBe(14); // 8 Ränge + 4 IN + 2 Synergie
  });

  it("hängt Ränge auf die Grundfertigkeit, wenn sie keine Teilgebiete kennt", () => {
    const rogue = `<characters version="3"><pc><name>Schurke</name>
      <raceClass>Human Rogue 3</raceClass>
      <str>10</str><dex>16</dex><con>12</con><int>12</int><wis>10</wis><cha>10</cha>
      <hp>18/18</hp>
      <skills>Hide (6) +9, Move Silently (Schatten) (6) +9</skills>
      </pc></characters>`;
    let n = 0;
    const result = importFightClubXml(rogue, compendium, { idFactory: () => `r-${++n}` }).results[0]!;
    expect(result.character.skillRanks["srd:skill:move-silently"]).toBe(6);
    expect(result.character.skillSubtypes).toEqual([]);
    expect(result.issues.some((i) => i.code === "skill-subtype")).toBe(true);
  });

  it("ordnet deutsche Waffen-Auswahlen der Waffe zu, damit Weapon Focus wirkt", () => {
    const focus = character.feats.filter((f) => f.featId === "srd:feat:weapon-focus");
    expect(focus).toHaveLength(2);
    expect(focus.map((f) => [f.choice, f.choiceRef])).toEqual([
      ["Kurzschwert", "srd:item:sword-short"],
      ["Zweihänder", "srd:item:greatsword"],
    ]);
    // Und der Bonus landet auf genau diesen beiden Waffen.
    const bonus = (label: string) =>
      sheet.attacks.find((a) => a.label === label)?.attack.contributions
        .filter((c) => c.source.startsWith("Weapon Focus"))
        .reduce((sum, c) => sum + c.value, 0) ?? 0;
    expect(bonus("Sword, short")).toBe(1);
    expect(bonus("Greatsword")).toBe(1);
    expect(bonus("Dagger")).toBe(0);
  });

  it("legt Waffen mit eigenem Namen als Homebrew-Waffe an, nicht als Notiz", () => {
    const weapon = results[0]!.entities.find((e) => e.kind === "item");
    expect(weapon).toBeDefined();
    expect(weapon!.name).toBe("Templer Schwert");
    expect(weapon!.source).toBe("homebrew");
    if (weapon!.kind !== "item") throw new Error("kein Gegenstand");
    // Schaden ohne den Attributsbonus aus dem Export; „19/x2" heißt 19–20.
    expect(weapon!.data.weapon).toMatchObject({ damage: "1d6", critRange: "19-20", critMult: "x2" });
    // Sie ist angelegt und erzeugt damit eine Angriffszeile.
    const row = character.inventory.find((i) => i.itemId === weapon!.id);
    // Die erste Aktionszeile landet in der Haupthand, die weiteren im Rucksack.
    expect(row).toBeDefined();
    expect(sheet.attacks.some((a) => a.label === "Templer Schwert")).toBe(true);
  });

  it("verliert Fertigkeiten ohne Rangangabe nicht (Listen +11)", () => {
    const xml = XML.replace(
      "<skills>Bluff (1) +1,",
      "<skills>Listen +11, Spot +9, Bluff (1) +1,",
    );
    let n = 0;
    const result = importFightClubXml(xml, compendium, { idFactory: () => `s-${++n}` }).results[0]!;
    expect(result.character.skillRanks["srd:skill:listen"]).toBe(0);
    // Die Abweichung (Original +11, App +0) wird berichtet statt verschluckt.
    expect(result.comparisons.some((c) => c.label === "Listen" && c.status === "reported")).toBe(true);
  });

  it("gleicht NICHT aus, wenn Volk oder Klassen fehlen (kein Zudecken)", () => {
    const broken = XML.replace(
      "<raceClass>Human Fighter 3/Cleric 4</raceClass>",
      "<raceClass>Human Fighter 3/Kriegsmagier 4</raceClass>",
    );
    let n = 0;
    const result = importFightClubXml(broken, compendium, { idFactory: () => `b-${++n}` }).results[0]!;
    expect(result.character.miscModifiers).toEqual([]);
    const acRow = result.comparisons.find((c) => c.label === "RK")!;
    expect(acRow.status).toBe("reported");
    expect(acRow.hint).toContain("Kein Ausgleich");
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
