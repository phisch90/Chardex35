import { describe, expect, it } from "vitest";
import { entitySchema, type ItemEntity } from "@codex35/core";
import {
  EMPTY_ITEM_DRAFT,
  draftFromEntity,
  draftFromTemplate,
  draftProblems,
  draftToEntity,
  draftToInput,
  fieldsFor,
  isPlainDamageDice,
  normalizeCritMult,
  normalizeCritRange,
  type ItemDraft,
} from "./itemDraft.js";

/**
 * Die Regeln des Gegenstands-Editors.
 *
 * Geprüft wird hier, weil die Oberfläche selbst nicht prüfbar ist: es gibt in
 * diesem Arbeitsbereich kein DOM. Also stehen alle Entscheidungen, die eine Zahl
 * auf dem Bogen verschieben können, in dieser Datei — und werden hier festgenagelt.
 */

const item = (data: unknown, extra: Record<string, unknown> = {}): ItemEntity =>
  entitySchema.parse({
    id: "homebrew:item:t",
    kind: "item",
    name: "Templer Schwert",
    source: "homebrew",
    ...extra,
    data,
  }) as ItemEntity;

describe("Welche Felder je Art", () => {
  it("Rüstung bekommt die Stärke-Wahl, ein Schild nicht", () => {
    // Der Schild IST seine Art — „leichter Schild" wäre eine zweite Wahl über
    // dasselbe, und dann könnten die beiden auseinanderlaufen.
    expect(fieldsFor("armor")).toEqual({ armor: true, armorKind: true, weapon: false });
    expect(fieldsFor("shield")).toEqual({ armor: true, armorKind: false, weapon: false });
    expect(fieldsFor("weapon")).toEqual({ armor: false, armorKind: false, weapon: true });
    expect(fieldsFor("gear")).toEqual({ armor: false, armorKind: false, weapon: false });
  });
});

describe(`Kritischer Bereich: „19" heißt 19–20`, () => {
  it("Eine einzelne Zahl unter 20 ist die UNTERE Grenze", () => {
    /*
      Fight Club und die Bücher schreiben „19/x2" und meinen 19–20. Wer die 19 so
      stehen lässt, hat eine Waffe, die nur auf genau 19 kritisch trifft — das
      fällt am Tisch nie auf und ist immer falsch.
    */
    expect(normalizeCritRange("19")).toBe("19-20");
    expect(normalizeCritRange("18")).toBe("18-20");
    expect(normalizeCritRange("20")).toBe("20");
    expect(normalizeCritRange("")).toBe("20");
  });

  it("Ein ausgeschriebener Bereich bleibt, auch mit Gedankenstrich", () => {
    expect(normalizeCritRange("19-20")).toBe("19-20");
    expect(normalizeCritRange("18 – 20")).toBe("18-20");
  });

  it("Der Faktor wird vereinheitlicht", () => {
    expect(normalizeCritMult("3")).toBe("x3");
    expect(normalizeCritMult("X4")).toBe("x4");
    expect(normalizeCritMult("×2")).toBe("x2");
    expect(normalizeCritMult("")).toBe("x2");
  });
});

describe("Schadenswürfel", () => {
  it("Nur der Würfel gilt als saubere Eingabe", () => {
    expect(isPlainDamageDice("1d8")).toBe(true);
    expect(isPlainDamageDice("2d6")).toBe(true);
    expect(isPlainDamageDice(" d4 ")).toBe(true);
    expect(isPlainDamageDice("1")).toBe(true);
    expect(isPlainDamageDice("1d8+2")).toBe(false);
    expect(isPlainDamageDice("1d6 plus Gift")).toBe(false);
  });
});

describe("Warnen statt sperren", () => {
  const weapon = (over: Partial<ItemDraft>): ItemDraft => ({
    ...EMPTY_ITEM_DRAFT,
    kind: "weapon",
    name: "Templer Schwert",
    damage: "1d8",
    ...over,
  });

  it("Ein Schaden mit Bonus wird gemeldet, aber angenommen", () => {
    const { blocking, hints } = draftProblems(weapon({ damage: "1d8+2" }));
    expect(blocking).toEqual([]);
    expect(hints.join(" ")).toContain("nur den Würfel");
    // Und er wird wirklich so übernommen, wie es dasteht.
    expect(draftToInput(weapon({ damage: "1d8+2" }), "homebrew:item:a").weapon?.damage).toBe(
      "1d8+2",
    );
  });

  it("Genau drei Dinge halten das Speichern auf", () => {
    // Kein Name, und eine Waffe ohne Würfel — mehr nicht. Alles andere ist seine
    // Entscheidung.
    expect(draftProblems({ ...EMPTY_ITEM_DRAFT, name: "" }).blocking).toHaveLength(1);
    expect(draftProblems(weapon({ damage: "" })).blocking).toHaveLength(1);
    expect(draftProblems(weapon({})).blocking).toEqual([]);
  });

  it("Eine leichte Rüstung mit RK +8 wird gemeldet und trotzdem gebaut", () => {
    const draft: ItemDraft = {
      ...EMPTY_ITEM_DRAFT,
      kind: "armor",
      name: "Templer Panzer",
      armorKind: "light",
      acBonus: 8,
    };
    expect(draftProblems(draft).hints.join(" ")).toContain("leichte Rüstung");
    expect(draftProblems(draft).blocking).toEqual([]);
    expect(draftToEntity(draft, "homebrew:item:b").data.armor).toEqual({
      kind: "light",
      acBonus: 8,
      maxDex: null,
      acp: 0,
      asf: 0,
    });
  });

  it("Ein Gewicht, das keine Zahl ist, bleibt leer statt 0 zu werden", () => {
    /*
      Der Unterschied ist wichtig: 0 lb heißt „wiegt nichts" und geht in die
      Traglast ein, leer heißt „weiß ich nicht". Der Prüfbericht nennt genau diese
      Verwechslung („leere Eingabe als ‚unverändert' behandeln statt als 0").
    */
    const draft: ItemDraft = { ...EMPTY_ITEM_DRAFT, name: "Seil", weightLb: "schwer" };
    expect(draftProblems(draft).hints.join(" ")).toContain("keine Zahl");
    expect(draftToInput(draft, "homebrew:item:c").weightLb).toBeUndefined();
    expect(draftToInput({ ...draft, weightLb: "0" }, "homebrew:item:c").weightLb).toBe(0);
    expect(draftToInput({ ...draft, weightLb: "2,5" }, "homebrew:item:c").weightLb).toBe(2.5);
  });
});

describe("Der Fertigkeits-Malus steht positiv im Regler und negativ in den Daten", () => {
  it("Aus 6 im Formular wird −6 am Gegenstand", () => {
    // Im Buch steht „−6". Ein Regler, an dem man nach unten drehen muss, um mehr
    // Malus zu bekommen, liest sich falsch.
    const draft: ItemDraft = {
      ...EMPTY_ITEM_DRAFT,
      kind: "armor",
      name: "Templer Platte",
      armorKind: "heavy",
      acBonus: 8,
      acp: 6,
      maxDexLimited: true,
      maxDex: 1,
      asf: 35,
    };
    expect(draftToEntity(draft, "homebrew:item:d").data.armor).toEqual({
      kind: "heavy",
      acBonus: 8,
      maxDex: 1,
      acp: -6,
      asf: 35,
    });
  });

  it(`„unbegrenzt" ist null, nicht 0`, () => {
    // 0 heißt „kein DEX-Bonus zählt", null heißt „alles zählt". Der Unterschied
    // sind bei DEX 18 volle vier Punkte RK.
    const draft: ItemDraft = {
      ...EMPTY_ITEM_DRAFT,
      kind: "shield",
      name: "Templer Schild",
      acBonus: 2,
    };
    expect(draftToEntity(draft, "homebrew:item:e").data.armor?.maxDex).toBeNull();
    expect(
      draftToEntity({ ...draft, maxDexLimited: true, maxDex: 0 }, "homebrew:item:e").data.armor
        ?.maxDex,
    ).toBe(0);
  });
});

describe("Fernkampf-Felder gelten nur im Fernkampf", () => {
  it("Reichweite und Stärkeschaden stehen nur an einer Fernkampfwaffe", () => {
    const melee: ItemDraft = {
      ...EMPTY_ITEM_DRAFT,
      kind: "weapon",
      name: "Templer Schwert",
      damage: "1d8",
      rangeIncrementFt: 30,
      strDamage: "full",
    };
    // Im Nahkampf gilt immer der ganze Bonus — ein gespeichertes `strDamage`
    // wäre eine Zahl, die nie gelesen wird.
    expect(draftToInput(melee, "homebrew:item:f").weapon).toEqual({
      damage: "1d8",
      critRange: "20",
      critMult: "x2",
      category: "martial",
      handedness: "one",
    });

    const ranged = draftToInput({ ...melee, handedness: "ranged" }, "homebrew:item:g");
    expect(ranged.weapon?.strDamage).toBe("full");
    expect(ranged.weapon?.rangeIncrementFt).toBe(30);
  });
});

describe("Hin und zurück", () => {
  it("Ein bestehender Gegenstand kommt unverändert aus dem Formular zurück", () => {
    /*
      Der Test, der das Bearbeiten trägt: Entity → Formular → Entity muss dasselbe
      ergeben. Läuft hier etwas verloren, verschwindet es beim ersten Öffnen des
      Editors — und das wäre ein stiller Datenverlust an einem Gegenstand, der
      schon auf einem Bogen liegt.
    */
    const original = item(
      {
        category: "armor",
        weightLb: 50,
        costGp: 1500,
        armor: { kind: "heavy", acBonus: 8, maxDex: 1, acp: -6, asf: 35 },
      },
      { description: "Eigenbau des Ordens.", tags: ["import"] },
    );
    const again = draftToEntity(draftFromEntity(original), original.id, original);
    expect(again.data).toEqual(original.data);
    expect(again.name).toBe(original.name);
    expect(again.description).toBe(original.description);
    expect(again.tags).toEqual(["import"]);
  });

  it("Auch eine Waffe mit allen Angaben", () => {
    const original = item({
      category: "weapon",
      weightLb: 4,
      weapon: {
        damage: "1d8",
        critRange: "19-20",
        critMult: "x3",
        damageType: "slashing",
        category: "exotic",
        handedness: "ranged",
        rangeIncrementFt: 30,
        strDamage: "penaltyOnly",
      },
    });
    expect(draftToEntity(draftFromEntity(original), original.id, original).data).toEqual(
      original.data,
    );
  });

  it("Ein Schild wird nicht zur leichten Rüstung und zurück", () => {
    // Die Falle: `armor.kind === "shield"` ist eine ART, keine Stärke. Würde das
    // Formular sie in die Wahl leicht/mittel/schwer schreiben, käme ein Schild als
    // leichte Rüstung zurück — und läge damit auf dem Rüstungsplatz statt in der
    // Schildhand.
    const shield = item({ category: "shield", armor: { kind: "shield", acBonus: 2, acp: -2 } });
    const draft = draftFromEntity(shield);
    expect(draft.kind).toBe("shield");
    expect(draftToEntity(draft, shield.id, shield).data.armor?.kind).toBe("shield");
  });
});

describe("Von einer Vorlage abschreiben", () => {
  const template = entitySchema.parse({
    id: "srd:item:full-plate",
    kind: "item",
    name: "Full plate",
    source: "srd",
    description: "Englischer Regeltext aus dem SRD.",
    data: {
      category: "armor",
      weightLb: 50,
      costGp: 1500,
      armor: { kind: "heavy", acBonus: 8, maxDex: 1, acp: -6, asf: 35 },
    },
  }) as ItemEntity;

  it("Alle Werte kommen mit, die Kennung nicht", () => {
    const draft = draftFromTemplate(template);
    expect(draft.kind).toBe("armor");
    expect(draft.armorKind).toBe("heavy");
    expect(draft.acBonus).toBe(8);
    expect(draft.maxDexLimited).toBe(true);
    expect(draft.maxDex).toBe(1);
    // Positiv im Formular.
    expect(draft.acp).toBe(6);
    expect(draft.asf).toBe(35);
    expect(draft.weightLb).toBe("50");
    expect(draft.costGp).toBe("1500");
    expect(draft.name).toBe("Full plate");
  });

  it("`basedOn` zeigt auf die Vorlage — daran hängt Weapon Focus", () => {
    const draft = draftFromTemplate(template);
    expect(draft.basedOn).toBe("srd:item:full-plate");
    expect(draft.basedOnName).toBe("Full plate");
    expect(draftToEntity(draft, "homebrew:item:h").basedOn).toBe("srd:item:full-plate");
  });

  it("Der englische Regeltext wird NICHT mit abgeschrieben", () => {
    // Abgeschrieben wird der WERT, nicht der Text: die Beschreibung ist im Editor
    // seine Notiz („was steht im Buch dazu"), und der SRD-Absatz stünde dort als
    // fremder Text, den er löschen müsste.
    expect(draftFromTemplate(template).description).toBe("");
  });

  it("Eine gebaute Abschrift trägt niemals die SRD-Kennung", () => {
    expect(() => draftToEntity(draftFromTemplate(template), template.id)).toThrow(/SRD-Kennung/);
  });
});
