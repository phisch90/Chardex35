import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { deriveSheet } from "../engine/index.js";
import { importFightClubXml } from "./fightclub.js";
import { derivedTrackerKey, isFullFightClubExport, parseFullFightClubXml } from "./fightclubFull.js";

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

function loadFullCompendium(): Map<string, Entity> {
  return resolveCompendium(loadPackEntities());
}

/**
 * Erfundene Datei im echten Format.
 *
 * Bewusst NICHT Philipps Bogen: der enthält Inhalte aus seinen gekauften Büchern
 * und seine Kampagne. Geprüft wurde gegen sein Original, festgehalten wird an
 * einem Nachbau — jede Eigenheit hier ist eine, die an echten Daten schiefging.
 */
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<pc version="3"><character>
  <name>Testfigur</name>
  <race><name>Human</name>
    <feat><name>Languages</name><text>Common.</text></feat>
  </race>
  <class><id>1</id><name>Fighter</name><level>3</level><slots>3,1,0,</slots>
    <feat><name>Bonus Feats</name><text>Klassenfähigkeit, kein Talent.</text></feat>
  </class>
  <class><id>2</id><name>Cleric</name><level>4</level><slots>5,3,2,0,</slots>
    <slotsCurrent>5,2,2,0,</slotsCurrent><spellAbility>5</spellAbility>
    <feat><name>Turn or Rebuke Undead (Su)</name><text>Klassenfähigkeit.</text></feat>
    <spell><name>Bless</name><level>1</level><prepared>2</prepared></spell>
    <spell><name>Fireball</name><level>3</level></spell>
  </class>
  <abilities>10,15,13,12,8,11,10,</abilities>
  <hpMax>62</hpMax><hpCurrent>36</hpCurrent><xp>15100</xp>
  <feat><name>Dodge</name><text>…</text><modifier><type>12</type><value>1</value></modifier></feat>
  <feat><name>Power Attack</name><text>…</text></feat>
  <skill><skillID>2</skillID><name>Bluff (1)</name><ability>6</ability><classSkill>1</classSkill><rank>1</rank></skill>
  <skill><skillID>16</skillID><name>Intimidate (3)</name><ability>6</ability><rank>3</rank></skill>
  <skill><skillID>1</skillID><name>Balance U</name><ability>2</ability></skill>
  <item><name>Leather Armor</name><slot>5</slot><type>0</type><armorClass>2</armorClass><damage>1d4</damage></item>
  <item><name>Shield, Heavy Wooden</name><slot>4</slot><type>3</type><armorClass>2</armorClass><damage>1d4</damage></item>
  <item><name>Sword, Short</name><slot>2</slot><type>4</type><damage>1d6</damage><property>1</property><critDie>19</critDie>
    <modifier><type>1</type><value>1</value></modifier></item>
  <item><name>Dagger</name><type>4</type><damage>1d3</damage><critDie>19</critDie><critMult>3</critMult><weight>1.0</weight></item>
  <item><name>Schaufel</name><damage>1d4</damage></item>
  <item><name>Amulett</name><slot>1</slot><type>15</type><damage>1d4</damage>
    <modifier><type>99</type><value>3</value></modifier></item>
  <container><name>Geldbeutel</name><ignore>1</ignore><carried>1</carried>
    <item><name>Gold Pieces</name><slot>1</slot><type>18</type><damage>1d4</damage><value>1.0</value><quantity>45</quantity></item>
    <item><name>Copper Pieces</name><slot>1</slot><type>18</type><damage>1d4</damage><value>0.01</value><quantity>11</quantity></item>
  </container>
  <container><name>Inventar</name><ignore>1</ignore><carried>1</carried>
    <item><name>Rations, Trail (per day)</name><slot>1</slot><damage>1d4</damage><weight>1.0</weight></item>
  </container>
  <tracker><label>Action Points</label><value>3</value><formula>6</formula></tracker>
  <tracker><label>Turn Undead</label><resetType>1</resetType><value>8</value><formula>8</formula></tracker>
  <note><title>Domains</title><text>Heal / War</text></note>
</character></pc>`;

const STATBLOCK = `<?xml version="1.0"?><characters version="3"><pc><name>Andere</name><str>15</str></pc></characters>`;

describe("Format erkennen", () => {
  it(`unterscheidet die beiden Fight-Club-Exporte`, () => {
    /*
      Die Weiche ist der wichtigste Test im Modul: ohne sie lief der vollständige
      Export durch den Statblock-Leser und ergab einen Charakter, von dem nur der
      Name ankam — weil <name> in beiden Formaten so heißt.
    */
    expect(isFullFightClubExport(XML)).toBe(true);
    expect(isFullFightClubExport(STATBLOCK)).toBe(false);
  });
});

const pc = parseFullFightClubXml(XML).pcs[0]!;

describe("Kopfdaten", () => {
  it(`nimmt den Namen der FIGUR, nicht den ersten <name> im Baum`, () => {
    // Der Baum enthält Namen von Klassen, Talenten, Zaubern und Gegenständen.
    expect(pc.name).toBe("Testfigur");
  });

  it(`liest die Attributsliste mit dem richtigen Versatz`, () => {
    // Feld 0 ist ein Platzhalter. Um eins verschoben wären alle Attribute falsch,
    // und das fällt erst am Spieltisch auf.
    expect(pc.abilities).toEqual({ str: 15, dex: 13, con: 12, int: 8, wis: 11, cha: 10 });
  });

  it(`setzt Volk und Klassen mit SCHRÄGSTRICH zusammen`, () => {
    // „Human Fighter 3 Cleric 4" war eine unbekannte Klasse — der Bogen kam ohne
    // Stufe, ohne GAB und ohne Rettungswürfe an.
    expect(pc.raceClass).toBe("Human Fighter 3 / Cleric 4");
  });

  it(`übernimmt Trefferpunkte und Erfahrung`, () => {
    expect(pc.hp).toEqual({ current: 36, max: 62 });
    expect(pc.full.xp).toBe(15100);
  });

  it(`liest Zauberplätze nur bei Zauberklassen`, () => {
    // Der Fighter trägt „3,1,0" — das sind keine Zauber.
    const [fighter, cleric] = pc.full.classes;
    expect(fighter?.slots).toBeUndefined();
    expect(cleric?.slots).toEqual([5, 3, 2, 0]);
    expect(cleric?.spellAbility).toBe("wis");
  });
});

describe("Talente", () => {
  it(`nimmt NUR gewählte Talente, keine Klassenfähigkeiten`, () => {
    /*
      Klassen und Volk bringen eigene <feat>-Blöcke mit. Ohne den Ausschnitt kamen
      an Philipps Bogen elf erfundene Talente an („Languages", „Aura (Ex)",
      „Spontaneous Casting") — neben den sechs echten.
    */
    expect(pc.featTokens).toEqual(["Dodge", "Power Attack"]);
  });

  it(`übernimmt bekannte Boni und meldet unbekannte`, () => {
    expect(pc.full.featModifiers).toEqual([
      { feat: "Dodge", target: "ac", label: "RK", value: 1 },
    ]);
  });
});

describe("Fertigkeiten", () => {
  it(`nimmt die Ränge aus <rank> und putzt den Namen`, () => {
    expect(pc.skills).toEqual([
      { name: "Bluff", ranks: 1, total: undefined },
      { name: "Intimidate", ranks: 3, total: undefined },
    ]);
  });

  it(`lässt Fertigkeiten ohne Ränge weg`, () => {
    // „Balance U" ist untrainiert und ohne Rang — eine Zeile ohne Aussage.
    expect(pc.skills.some((s) => s.name.startsWith("Balance"))).toBe(false);
  });
});

describe("Gegenstände", () => {
  const byName = (name: string) => pc.full.items.find((item) => item.name === name)!;

  it(`erkennt Waffen NICHT am Schadenswürfel`, () => {
    /*
      Fight Club schreibt „1d4" an jeden Gegenstand — auch an Wegzehrung und an eine
      Schaufel. Ohne diese Unterscheidung wäre das Gepäck voller Waffen.
    */
    expect(byName("Sword, Short").looksLikeWeapon).toBe(true);
    expect(byName("Dagger").looksLikeWeapon).toBe(true);
    expect(byName("Schaufel").looksLikeWeapon).toBe(false);
    expect(byName("Schaufel").damage).toBeUndefined();
    expect(byName("Rations, Trail (per day)").looksLikeWeapon).toBe(false);
  });

  it(`übersetzt den Platz am Körper`, () => {
    expect(byName("Leather Armor").slot).toBe("armor");
    expect(byName("Shield, Heavy Wooden").slot).toBe("offHand");
    expect(byName("Sword, Short").slot).toBe("mainHand");
    expect(byName("Amulett").slot).toBe("worn");
    // Ohne <slot>: im Rucksack.
    expect(byName("Dagger").slot).toBe("none");
  });

  it(`legt nichts an, was in einem Behälter liegt`, () => {
    // Fight Club schreibt allem im Beutel slot 1 — wörtlich genommen trüge die
    // Figur ihre Wegzehrung am Körper.
    const rations = byName("Rations, Trail (per day)");
    expect(rations.slot).toBe("none");
    expect(rations.container).toBe("Inventar");
  });

  it(`liest den Preis nicht aus einem Bonus`, () => {
    /*
      Das Kurzschwert trägt <modifier><type>1</type><value>1</value></modifier>.
      Ohne Ausschnitt kostete es 1 Gold.
    */
    expect(byName("Sword, Short").costGp).toBeUndefined();
    expect(byName("Sword, Short").modifiers).toEqual([
      { target: "attack", label: "Angriff", value: 1 },
    ]);
  });

  it(`rät bei unbekannten Boni nicht`, () => {
    expect(byName("Amulett").modifiers).toEqual([]);
    expect(byName("Amulett").unknownModifiers).toEqual([{ type: "99", value: 3 }]);
  });

  it(`macht aus Münzen Geld statt Gepäckzeilen`, () => {
    expect(pc.full.money).toEqual({ pp: 0, gp: 45, sp: 0, cp: 11 });
    expect(pc.full.items.some((item) => item.name === "Gold Pieces")).toBe(false);
  });

  it(`gibt Waffen als Angriffe weiter, mit dem ganzen Kritbereich`, () => {
    // „19" allein hieße bei uns „nur die 19 trifft kritisch".
    expect(pc.actions).toEqual([
      { name: "Sword, Short", damage: "1d6", critical: "19-20/x2" },
      { name: "Dagger", damage: "1d3", critical: "19-20/x3" },
    ]);
  });

  it(`gibt den echten Platz mit, damit nicht geraten wird`, () => {
    expect(pc.slotByName?.["Leather Armor"]).toBe("armor");
    expect(pc.slotByName?.["Dagger"]).toBe("none");
  });
});

describe("Zähler, Notizen, vorbereitete Zauber", () => {
  it(`merkt sich, was sich bei der Rast füllt`, () => {
    expect(pc.full.trackers).toEqual([
      { label: "Action Points", value: 3, max: 6, perDay: false },
      { label: "Turn Undead", value: 8, max: 8, perDay: true },
    ]);
  });

  it(`nimmt die Notizen mit Titel`, () => {
    expect(pc.full.notes).toEqual([{ title: "Domains", text: "Heal / War" }]);
  });

  it(`nimmt NUR vorbereitete Zauber, nicht die ganze Klassenliste`, () => {
    // In echten Dateien stehen 300+ Zauber; vorbereitet sind vier.
    expect(pc.full.prepared).toEqual([{ name: "Bless", level: 1, count: 2 }]);
  });
});

describe("Zähler: was folgt, folgt", () => {
  it(`hängt Untote vertreiben an den Vorschlag statt an die Zahl aus dem Export`, () => {
    /*
      Philipps Bogen stand auf 8, seine eigene Notiz nennt die Formel 3 + CHA + 4,
      und gefragt hat er geantwortet: 7. Die 8 war ein alter Stand, der in Fight Club
      hängen geblieben ist — genau die Sorte eingefrorener Wert, die bei den Zählern
      gerade abgeschafft wurde. Also folgt der Zähler der Regel.
    */
    expect(derivedTrackerKey("Turn Undead (1d6+2)")).toBe("turn-undead");
    expect(derivedTrackerKey("Rebuke Undead")).toBe("turn-undead");
    expect(derivedTrackerKey("Smite Evil 2/day")).toBe("smite-evil");
    expect(derivedTrackerKey("Wild Shape")).toBe("wild-shape");
  });

  it(`lässt Hausregel-Zähler in Ruhe`, () => {
    // „Action Points" und „Restore Spell Points" gibt es im SRD nicht. Für die kennen
    // wir keine Formel, und eine erfundene wäre schlimmer als seine Zahl.
    expect(derivedTrackerKey("Action Points")).toBeUndefined();
    expect(derivedTrackerKey("Restore Spell Points")).toBeUndefined();
    expect(derivedTrackerKey("Spellcast DC")).toBeUndefined();
    expect(derivedTrackerKey("Level 0 Spell")).toBeUndefined();
  });

  it(`verwechselt nichts, was nur ähnlich anfängt`, () => {
    expect(derivedTrackerKey("Ragebringer Aufladungen")).toBeUndefined();
    expect(derivedTrackerKey("")).toBeUndefined();
  });
});

/**
 * Domänen — der Weg von der Notiz in echte Daten.
 *
 * Fight Club hat für Domänen kein Feld; in seinem Bogen stehen sie als
 * `<note><title>Domains</title><text>Heal / War</text></note>`. Als Notiztext
 * angekommen wären sie ein Text und nichts weiter: keine neun Zauber, kein Platz
 * je Grad. Gegen die ECHTEN Packs geprüft, weil an ihnen die 36 Domänenlisten und
 * die Marke hängen, über die zugeordnet wird.
 */
describe.skipIf(!packsAvailable)("Domänen aus der Notiz", () => {
  const compendium = packsAvailable ? loadFullCompendium() : new Map<string, Entity>();
  let n = 0;
  const result = packsAvailable
    ? importFightClubXml(XML, compendium, { idFactory: () => `dom-${++n}` }).results[0]!
    : undefined;

  it(`ordnet „Heal / War" den richtigen zwei Zauberlisten zu`, () => {
    // „Heal" ist die Domäne, die im SRD „Healing" heißt — Anfangsvergleich, kein
    // Gleichheitstest. Und sie hängen am KLERIKER, nicht am Fighter.
    expect(result?.character.domains).toEqual([
      { classId: "srd:class:cleric", spellListId: "srd:spelllist:domain-healing" },
      { classId: "srd:class:cleric", spellListId: "srd:spelllist:domain-war" },
    ]);
  });

  it(`sagt, dass es sie übernommen hat`, () => {
    const issue = result?.issues.find((i) => i.code === "fc-full-domains");
    expect(issue?.message).toContain("Heal");
    expect(issue?.message).toContain("War");
  });

  it(`lässt seine Notiz stehen`, () => {
    // Sein Text, seine Sache. Der Import liest ihn, er schreibt ihn nicht um.
    expect(result?.character.noteSections.map((s) => s.title)).toContain("Domains");
  });

  it(`bringt den Domänenplatz auf den Bogen`, () => {
    const withImported = resolveCompendium([...loadPackEntities(), ...(result?.entities ?? [])]);
    const sheet = deriveSheet(result!.character, withImported);
    const block = sheet.spellcasting.find((b) => b.classId === "srd:class:cleric")!;
    // Kleriker 4, WIS 11: Tabelle 5/3/2, auf dem Bogen 5/4/3.
    expect(block.slots.slice(0, 3).map((s) => s.total)).toEqual([5, 4, 3]);
    expect(block.domains.map((d) => d.name)).toEqual(["Healing Domain", "War Domain"]);
    // Und damit kein Gemecker mehr über fehlende Domänen.
    expect(sheet.issues.filter((i) => i.code.startsWith("domains-"))).toEqual([]);
  });

  it(`überliest seine Merkliste der Domänenzauber, statt vier Domänen zu erfinden`, () => {
    /*
      Seine echte Notiz ist DREI Zeilen lang:

          Heal / war
          1 — Cure light wounds / magic weapon
          2 — Cure moderate wounds / spiritual weapon

      Die erste Fassage warf alles in einen Topf und meldete in der App vier
      erfundene Domänen. Eine Zeile zählt nur, wenn sie ausschließlich aus
      Domänennamen besteht.
    */
    const xml = XML.replace(
      "<text>Heal / War</text>",
      "<text>Heal / war\n1 — Cure light wounds / magic weapon \n2 — Cure moderate wounds / spiritual weapon </text>",
    );
    let m = 0;
    const other = importFightClubXml(xml, compendium, { idFactory: () => `x-${++m}` }).results[0]!;
    expect(other.character.domains).toEqual([
      { classId: "srd:class:cleric", spellListId: "srd:spelllist:domain-healing" },
      { classId: "srd:class:cleric", spellListId: "srd:spelllist:domain-war" },
    ]);
    // Und KEIN Hinweis über die zwei Zeilen, die er für sich geschrieben hat.
    expect(other.issues.find((i) => i.code === "fc-full-domains-unmatched")).toBeUndefined();
  });

  it(`nimmt auch eine Domäne pro Zeile`, () => {
    const xml = XML.replace("<text>Heal / War</text>", "<text>Sun\nTravel</text>");
    let m = 0;
    const other = importFightClubXml(xml, compendium, { idFactory: () => `w-${++m}` }).results[0]!;
    expect(other.character.domains.map((d) => d.spellListId)).toEqual([
      "srd:spelllist:domain-sun",
      "srd:spelllist:domain-travel",
    ]);
  });

  it(`meldet, wenn es GAR NICHTS erkannt hat`, () => {
    const xml = XML.replace("<text>Heal / War</text>", "<text>Zwielicht und Feuerwerk</text>");
    let m = 0;
    const other = importFightClubXml(xml, compendium, { idFactory: () => `v-${++m}` }).results[0]!;
    expect(other.character.domains).toEqual([]);
    const issue = other.issues.find((i) => i.code === "fc-full-domains-unmatched");
    expect(issue?.message).toContain("Zwielicht");
    expect(issue?.message).toContain("Feuerwerk");
  });

  it(`raten bei mehrdeutigem Anfang: lieber nichts`, () => {
    // „Ma" passt auf Madness UND Magic. Neun falsche Zauber merkt man erst am
    // Spieltisch.
    const xml = XML.replace("<text>Heal / War</text>", "<text>Ma</text>");
    let m = 0;
    const other = importFightClubXml(xml, compendium, { idFactory: () => `y-${++m}` }).results[0]!;
    expect(other.character.domains).toEqual([]);
    expect(other.issues.find((i) => i.code === "fc-full-domains-unmatched")).toBeDefined();
  });

  it(`ein Charakter ohne Domänenklasse bekommt keine Domänen angehängt`, () => {
    // Notiz da, Klasse nicht — dann bleibt es eine Notiz.
    const xml = XML.replace(/<class><id>2<\/id>[\s\S]*?<\/class>/, "");
    let m = 0;
    const other = importFightClubXml(xml, compendium, { idFactory: () => `z-${++m}` }).results[0]!;
    expect(other.character.domains).toEqual([]);
    expect(other.character.noteSections.map((s) => s.title)).toContain("Domains");
  });
});
