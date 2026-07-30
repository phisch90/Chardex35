import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import {
  entitySchema,
  resolveCompendium,
  type Entity,
  type ItemEntity,
} from "../schema/entities.js";
import { deriveSheet } from "../engine/index.js";
import { itemGroupOf } from "./items.js";
import { buildHomebrewItem, homebrewFromTemplate } from "./homebrewItem.js";

/**
 * Eigene Gegenstände mit ECHTEN Werten.
 *
 * Die Messlatte ist nicht „speichert ohne Fehler", sondern: eine selbst
 * eingetragene Vollplatte muss dieselbe RK, dieselbe DEX-Grenze, denselben
 * Fertigkeits-Malus und dieselbe Bewegung ergeben wie die aus dem Regelwerk.
 * Deshalb wird hier gegen die echten Packs geprüft und die eigene Fassung
 * Zahl für Zahl gegen die SRD-Fassung gestellt.
 */
const packsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packs/srd");
const manifestPath = join(packsDir, "manifest.json");
const packsAvailable = existsSync(manifestPath);

function loadCompendium(extra: Entity[] = []): Map<string, Entity> {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: string[] };
  const entities: Entity[] = [...extra];
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    for (const item of JSON.parse(readFileSync(join(packsDir, file), "utf8")) as unknown[]) {
      entities.push(entitySchema.parse(item));
    }
  }
  return resolveCompendium(entities);
}

describe("buildHomebrewItem — die Hülle kommt vom Schema", () => {
  it("Ein Entwurf mit nur einem Schadenswürfel bekommt alle Standardwerte", () => {
    /*
      Der Grund, warum es diese Funktion gibt: die alte Bauform schrieb
      `critRange`, `critMult`, `category`, `handedness`, `schemaVersion`, `rev`,
      `tags` und `effects` von Hand hin. Als `strDamage` ins Schema kam, fehlte es
      dort still. Hier steht nichts von Hand — also kann auch nichts fehlen.
    */
    const item = buildHomebrewItem({
      id: "homebrew:item:abc",
      name: "Templer Schwert",
      kind: "weapon",
      weapon: { damage: "1d8" },
    });
    expect(item.data.weapon).toEqual({
      damage: "1d8",
      critRange: "20",
      critMult: "x2",
      category: "simple",
      handedness: "one",
    });
    expect(item.source).toBe("homebrew");
    expect(item.schemaVersion).toBe(1);
    expect(item.rev).toBe(1);
    expect(item.updatedAt).toBe("");
    expect(item.tags).toEqual([]);
    expect(item.effects).toEqual([]);
    expect(item.data.category).toBe("weapon");
  });

  it("Rüstung: die drei Werte, die der Import erfinden musste, kommen vom Schema", () => {
    const item = buildHomebrewItem({
      id: "homebrew:item:def",
      name: "Templer Platte",
      kind: "armor",
      armor: { kind: "heavy", acBonus: 8 },
    });
    expect(item.data.armor).toEqual({ kind: "heavy", acBonus: 8, maxDex: null, acp: 0, asf: 0 });
    expect(item.data.category).toBe("armor");
  });

  // Backticks, weil im Namen deutsche Anführungszeichen stehen — mit " würde die
  // Zeichenkette mitten im Satz enden. Das ist in diesem Projekt schon siebenmal
  // passiert.
  it(`Ein Schild steht in der Kategorie „shield", gefunden wird er bei „armor"`, () => {
    const shield = buildHomebrewItem({
      id: "homebrew:item:ghi",
      name: "Templer Schild",
      kind: "shield",
      armor: { kind: "shield", acBonus: 2, acp: -2 },
    });
    expect(shield.data.category).toBe("shield");
    // Die Größe, die sich nicht bewegen darf: gesucht wird bei „Rüstung & Schilde".
    expect(itemGroupOf(shield)).toBe("armor");
  });

  it("Keine SRD-Kennung — sonst ist der Gegenstand beim nächsten Pack-Update weg", () => {
    /*
      Das Neuseeding löscht nur `source === "srd"`, schreibt danach aber per
      bulkPut über JEDE Zeile mit derselben Kennung. Eine Homebrew-Zeile mit
      SRD-Kennung verschwände lautlos — samt der RK, die an ihr hängt.
    */
    expect(() =>
      buildHomebrewItem({
        id: "srd:item:full-plate",
        name: "Meine Vollplatte",
        kind: "armor",
        armor: { kind: "heavy", acBonus: 8 },
      }),
    ).toThrow(/SRD-Kennung/);
  });

  it("Waffe ohne Waffenwerte wird abgelehnt statt still wirkungslos", () => {
    // Ohne `data.weapon` ist der Gegenstand für die Engine „other": kein Platz
    // außer „worn", keine Angriffszeile. Das sähe wie ein App-Fehler aus.
    expect(() =>
      buildHomebrewItem({ id: "homebrew:item:x", name: "Stock", kind: "weapon" }),
    ).toThrow(/Schadenswürfel/);
    expect(() =>
      buildHomebrewItem({ id: "homebrew:item:y", name: "Fetzen", kind: "armor" }),
    ).toThrow(/Rüstungswert/);
  });

  it("Beim Ändern bleiben Marken, Wirkungen und der Stand erhalten", () => {
    /*
      Ohne `previous` fiele `rev` auf 1 zurück — der Abgleich hielte die Änderung
      dann für ÄLTER als den Stand auf dem iPad. Und die Marken einer importierten
      Waffe („import", „waffe") wären weg, womit sie aus jeder Filterung fällt.
    */
    const first = buildHomebrewItem({
      id: "homebrew:item:jkl",
      name: "Dolch",
      kind: "weapon",
      tags: ["import", "waffe"],
      weapon: { damage: "1d4" },
    });
    const stored: ItemEntity = { ...first, rev: 7, updatedAt: "2026-07-01T00:00:00.000Z" };
    const changed = buildHomebrewItem(
      { id: stored.id, name: "Halblingsdolch", kind: "weapon", weapon: { damage: "1d3" } },
      stored,
    );
    expect(changed.id).toBe("homebrew:item:jkl");
    expect(changed.name).toBe("Halblingsdolch");
    expect(changed.rev).toBe(7);
    expect(changed.tags).toEqual(["import", "waffe"]);
    expect(changed.data.weapon?.damage).toBe("1d3");
  });

  it("Umbenennen ändert die Kennung nicht — sonst zeigen alle Bögen ins Leere", () => {
    const first = buildHomebrewItem({
      id: "homebrew:item:mno",
      name: "Alter Name",
      kind: "gear",
    });
    const renamed = buildHomebrewItem({ ...{ id: first.id, kind: "gear" }, name: "Neuer Name" }, first);
    expect(renamed.id).toBe(first.id);
  });
});

describe.skipIf(!packsAvailable)("Eigene Werte rechnen wie die aus dem Regelwerk", () => {
  const srd = packsAvailable ? loadCompendium() : new Map<string, Entity>();

  const itemOf = (id: string): ItemEntity => {
    const entity = srd.get(id);
    if (entity === undefined || entity.kind !== "item") throw new Error(`fehlt: ${id}`);
    return entity;
  };

  /** Ein Kämpfer 1 mit DEX 18 und einem angelegten Gegenstand. */
  const wearer = (itemId: string, slot: "armor" | "offHand" | "mainHand"): Character =>
    characterSchema.parse({
      id: "hb-1",
      name: "Träger",
      raceId: "srd:race:human",
      abilities: { base: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 } },
      levels: [{ classId: "srd:class:fighter", hpRoll: "avg" as const }],
      inventory: [{ id: "i0", itemId, slot, extraEffects: [] }],
    });

  it("Eine abgeschriebene Vollplatte ergibt genau dieselbe RK", () => {
    /*
      Der eigentliche Beweis der Aufgabe. Vollplatte: RK +8, DEX-Grenze 1,
      Fertigkeits-Malus −6. Bei DEX 18 (+4) zählt wegen der Grenze nur +1:
      10 + 8 + 1 = 19. Wäre die Grenze nicht mitgekommen, stünden hier 22 —
      und genau das passiert heute bei einem importierten Rüstungsstück.
    */
    const template = itemOf("srd:item:full-plate");
    const copy = buildHomebrewItem(homebrewFromTemplate(template, "homebrew:item:platte"));
    const mixed = loadCompendium([copy]);

    const srdSheet = deriveSheet(wearer(template.id, "armor"), mixed);
    const ownSheet = deriveSheet(wearer(copy.id, "armor"), mixed);

    expect(srdSheet.ac.total.total).toBe(19);
    expect(ownSheet.ac.total.total).toBe(srdSheet.ac.total.total);
    /*
      Nicht nur die Summe: die ganze Aufschlüsselung muss gleich sein. Die Summe
      allein könnte auf zwei verschiedenen Wegen entstehen — etwa +8 Rüstung mit
      ungekapptem DEX gegen +11 Rüstung ohne DEX. Hier steht Beitrag für Beitrag
      dasselbe, also ist auch die DEX-Grenze mitgekommen.
    */
    const parts = (sheet: typeof ownSheet) =>
      sheet.ac.total.contributions.map((c) => `${c.source} ${c.bonusType} ${c.value} ${c.applied}`);
    expect(parts(ownSheet)).toEqual(parts(srdSheet));
    /*
      Von DEX +4 zählt wegen der Grenze nur +1 — und die Zeile SAGT das auch, mit
      der Grenze im Klartext. Ohne die mitgekommene Grenze stünde hier „+4" und
      die RK wäre 22.
    */
    expect(ownSheet.ac.total.contributions.map((c) => `${c.source}=${c.value}`)).toContain(
      "DEX-Modifikator (max. DEX 1)=1",
    );
    expect(ownSheet.speedFt.total).toBe(srdSheet.speedFt.total);
    // Schwere Rüstung bremst: 30 ft werden 20 ft.
    expect(ownSheet.speedFt.total).toBe(20);
  });

  it("Der Fertigkeits-Malus kommt an — bei Swim doppelt", () => {
    const template = itemOf("srd:item:full-plate");
    const copy = buildHomebrewItem(homebrewFromTemplate(template, "homebrew:item:platte2"));
    const mixed = loadCompendium([copy]);
    const own = deriveSheet(wearer(copy.id, "armor"), mixed);
    const srdSheet = deriveSheet(wearer(template.id, "armor"), mixed);

    const skill = (sheet: typeof own, key: string) =>
      sheet.skills.find((s) => s.key === key)?.total.total;
    expect(skill(own, "srd:skill:climb")).toBe(skill(srdSheet, "srd:skill:climb"));
    expect(skill(own, "srd:skill:swim")).toBe(skill(srdSheet, "srd:skill:swim"));
    // −6 auf Climb, doppelt auf Swim: −12. Die Zahlen stehen an der Rüstung.
    expect(skill(own, "srd:skill:climb")).toBe(-6);
    expect(skill(own, "srd:skill:swim")).toBe(-12);
  });

  it("Ein abgeschriebenes Kurzschwert schlägt wie das echte", () => {
    const template = itemOf("srd:item:sword-short");
    const copy = buildHomebrewItem(homebrewFromTemplate(template, "homebrew:item:templer"));
    const mixed = loadCompendium([copy]);
    const line = (itemId: string) => {
      const sheet = deriveSheet(wearer(itemId, "mainHand"), mixed);
      const attack = sheet.attacks.find((a) => a.key === "weapon:i0");
      if (!attack) throw new Error("keine Angriffszeile");
      return {
        bonuses: attack.bonuses,
        attack: attack.attack.total,
        damage: attack.damageText,
        crit: attack.critical,
      };
    };
    // Erst die Zahlen festnageln, dann vergleichen — sonst prüft ein Vergleich
    // zweier undefinierter Felder gar nichts.
    expect(line(template.id)).toEqual({ bonuses: [1], attack: 1, damage: "1d6", crit: "19-20/x2" });
    expect(line(copy.id)).toEqual(line(template.id));
  });

  it("Weapon Focus wirkt auf die Abschrift — dafür ist `basedOn` da", () => {
    /*
      Der einzige Leser von `basedOn` im ganzen Programm (derive.ts vergleicht
      `feat.choiceRef` gegen `entity.id` UND `entity.basedOn`). Weapon Focus gilt
      für einen Waffen-TYP; ohne den Verweis verliert die Abschrift +1 auf den
      Angriff, und niemand würde erraten, warum.
    */
    const template = itemOf("srd:item:sword-short");
    const withRef = buildHomebrewItem(homebrewFromTemplate(template, "homebrew:item:mit"));
    const noRef = buildHomebrewItem({
      ...homebrewFromTemplate(template, "homebrew:item:ohne"),
      basedOn: undefined,
    });
    const mixed = loadCompendium([withRef, noRef]);

    const attackWith = (itemId: string): number => {
      const c = characterSchema.parse({
        ...wearer(itemId, "mainHand"),
        feats: [{ id: "f0", featId: "srd:feat:weapon-focus", choiceRef: template.id }],
      });
      return deriveSheet(c, mixed).attacks.find((a) => a.key === "weapon:i0")!.attack.total;
    };
    expect(withRef.basedOn).toBe(template.id);
    expect(noRef.basedOn).toBeUndefined();
    // Kämpfer 1, GAB +1, DEX 18 (leichte Waffe → Kampfgeschick zählt nicht ohne
    // Talent, also STR 10 = +0): ohne Talent +1, mit Weapon Focus +2.
    expect(attackWith(noRef.id)).toBe(1);
    expect(attackWith(withRef.id)).toBe(2);
  });

  it("Zwei Exemplare, ein Typ: der Würfel steht nur an einer Stelle", () => {
    /*
      Die Frage der Fehlerfamilie. Zwei Kurzschwerter im Gepäck sind zwei Zeilen,
      aber EINE Regel. Das +1 des einen Stücks gehört an die Zeile, der Würfel an
      den Typ — sonst gäbe es zwei Wahrheiten, die beim Abgleich auseinanderlaufen.
    */
    const copy = buildHomebrewItem(
      homebrewFromTemplate(itemOf("srd:item:sword-short"), "homebrew:item:zwei"),
    );
    const mixed = loadCompendium([copy]);
    const c = characterSchema.parse({
      ...wearer(copy.id, "mainHand"),
      inventory: [
        { id: "i0", itemId: copy.id, slot: "mainHand", extraEffects: [] },
        {
          id: "i1",
          itemId: copy.id,
          slot: "none",
          extraEffects: [
            { target: "attack.self", bonusType: "enhancement", value: 1, activation: "equipped" },
          ],
        },
      ],
    });
    const sheet = deriveSheet(c, mixed);
    const first = sheet.attacks.find((a) => a.key === "weapon:i0")!;
    const second = sheet.attacks.find((a) => a.key === "weapon:i1")!;
    // Derselbe Würfel an beiden — er steht am Typ.
    expect(first.damageText).toBe(second.damageText);
  });
});

describe("homebrewFromTemplate — die Art fällt aus den Daten", () => {
  it("Rüstung, Schild, Waffe und Sonstiges werden richtig erkannt", () => {
    const make = (data: unknown): ItemEntity =>
      entitySchema.parse({
        id: "srd:item:t",
        kind: "item",
        name: "T",
        source: "srd",
        data,
      }) as ItemEntity;

    expect(
      homebrewFromTemplate(make({ category: "armor", armor: { kind: "heavy", acBonus: 8 } }), "x")
        .kind,
    ).toBe("armor");
    expect(
      homebrewFromTemplate(make({ category: "shield", armor: { kind: "shield", acBonus: 2 } }), "x")
        .kind,
    ).toBe("shield");
    expect(
      homebrewFromTemplate(make({ category: "weapon", weapon: { damage: "1d6" } }), "x").kind,
    ).toBe("weapon");
    expect(homebrewFromTemplate(make({ category: "gear" }), "x").kind).toBe("gear");
  });

  it("Der Name lässt sich beim Abschreiben gleich ersetzen", () => {
    const template = entitySchema.parse({
      id: "srd:item:sword-short",
      kind: "item",
      name: "Sword, short",
      source: "srd",
      data: { category: "weapon", weapon: { damage: "1d6" }, weightLb: 2, costGp: 10 },
    }) as ItemEntity;
    const draft = homebrewFromTemplate(template, "homebrew:item:x", "Templer Schwert");
    expect(draft.name).toBe("Templer Schwert");
    expect(draft.weightLb).toBe(2);
    expect(draft.costGp).toBe(10);
    expect(draft.basedOn).toBe("srd:item:sword-short");
    // Ohne Leser wird sie nicht gesetzt: ein gespeicherter Wert ohne Leser
    // friert ein.
    expect("basedOnRev" in draft).toBe(false);
  });
});
