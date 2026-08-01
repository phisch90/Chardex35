import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { displayName, entitySchema, type Entity, type ItemEntity } from "../schema/entities.js";
import {
  ITEM_GERMAN_SAME_AS_ENGLISH,
  ITEM_GERMAN_TABLES,
  itemGerman,
  itemsWithoutGerman,
  itemsWithoutGermanSummary,
  withGermanItemNames,
} from "./itemGerman.js";

/**
 * Gegen die ECHTEN Packs, und zwar in beide Richtungen:
 *
 *   jede Kennung in der Tabelle muss im Pack existieren  — sonst ist es ein
 *     Tippfehler, der lautlos nichts tut (dieselbe Falle wie bei den
 *     Fertigkeits-Kennungen in `advice.ts`),
 *   jeder Gegenstand im Pack muss einen deutschen Namen bekommen — sonst
 *     rutscht ein neuer Eintrag halb deutsch durch.
 *
 * Beides mit erfundenen Daten zu prüfen wäre wertlos: der ganze Sinn ist die
 * Deckung des echten Bestands.
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

describe.skipIf(!packsAvailable)("Deutsche Namen für die Ausrüstung", () => {
  const entities = packsAvailable ? loadEntities() : [];
  const items = entities.filter((e): e is ItemEntity => e.kind === "item");
  const byKey = new Map(items.map((e) => [e.id.replace(/^srd:item:/, ""), e]));
  const item = (key: string): ItemEntity => {
    const hit = byKey.get(key);
    if (hit === undefined) throw new Error(`${key} steht nicht im Pack`);
    return hit;
  };

  it("keine Kennung in den Tabellen zeigt ins Leere", () => {
    /*
      Der wichtigste Test. Ein Tippfehler in einer Kennung tut NICHTS — der
      Gegenstand behält still seinen englischen Namen, und niemand merkt es. Die
      Fehlermeldung nennt deshalb Tabelle und Schlüssel.
    */
    const unknown: string[] = [];
    for (const [table, entries] of Object.entries(ITEM_GERMAN_TABLES)) {
      for (const key of Object.keys(entries)) {
        if (!byKey.has(key)) unknown.push(`${table}: ${key}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it("kein Schlüssel steht in zwei Tabellen", () => {
    /*
      `{...A, ...B}` lässt den späteren gewinnen, ohne ein Wort. Genau so wären
      mir die Schilde beinahe zweimal untergekommen: `shield-heavy-steel` ist
      Rüstung, `shield-heavy` ist die Waffe — zwei Kennungen, die sich lesen wie
      eine.
    */
    const seen = new Map<string, string>();
    const doubled: string[] = [];
    for (const [table, entries] of Object.entries(ITEM_GERMAN_TABLES)) {
      for (const key of Object.keys(entries)) {
        const first = seen.get(key);
        if (first !== undefined) doubled.push(`${key}: ${first} + ${table}`);
        else seen.set(key, table);
      }
    }
    expect(doubled).toEqual([]);
  });

  it("jeder Gegenstand im Pack bekommt einen deutschen Namen", () => {
    const missing = itemsWithoutGerman(entities);
    expect(missing).toEqual([]);
  });

  it("kein deutscher Name ist leer oder ungewollt gleich dem englischen", () => {
    /*
      Eine kopierte Zeile fällt hier auf. Zwölf Namen sind auf Deutsch WIRKLICH
      dieselben (Kama, Rapier, Hammer …) — die stehen in einer benannten Liste,
      damit die Ausnahme eine Entscheidung ist und kein Versehen.
    */
    const bad: string[] = [];
    for (const entity of items) {
      const german = itemGerman(entity);
      if (german === undefined) continue;
      const key = entity.id.replace(/^srd:item:/, "");
      if (german.name.trim() === "") bad.push(`${entity.id}: leer`);
      if (german.name === entity.name && !ITEM_GERMAN_SAME_AS_ENGLISH.has(key)) {
        bad.push(`${entity.id}: unverändert`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("die Ausnahmeliste hat keine überflüssigen Einträge", () => {
    // Wird eine Zeile später doch übersetzt, muss sie hier RAUS — sonst deckt
    // die Liste eine Kopie, die es nicht mehr gibt.
    const useless: string[] = [];
    for (const key of ITEM_GERMAN_SAME_AS_ENGLISH) {
      const entity = byKey.get(key);
      if (entity === undefined) useless.push(`${key}: nicht im Pack`);
      else if (itemGerman(entity)?.name !== entity.name) useless.push(`${key}: doch übersetzt`);
    }
    expect(useless).toEqual([]);
  });

  it("die Erklärungen sind ganze Sätze, keine Bruchstücke", () => {
    const bad: string[] = [];
    for (const entity of items) {
      const summary = itemGerman(entity)?.summary;
      if (summary === undefined) continue;
      if (summary.length < 15) bad.push(`${entity.id}: zu kurz`);
      if (!/[.!?]$/.test(summary.trim())) bad.push(`${entity.id}: kein Satzende`);
    }
    expect(bad).toEqual([]);
  });

  it("die weltliche Ausrüstung ist vollständig erklärt, nicht nur benannt", () => {
    /*
      Bei den 282 weltlichen Stücken ist die Erklärung der eigentliche Gewinn:
      „Tanglefoot bag" sagt einem deutschen Leser nichts, und die Werte-Zeile
      („50 gp · 4 lb") auch nicht. Hier ist deshalb JEDE Erklärung Pflicht — bei
      den 1584 magischen wird sie gezählt, nicht erzwungen.
    */
    const mundane = items.filter((e) => !e.tags.includes("magic"));
    expect(mundane).toHaveLength(282);
    const withoutSummary = mundane.filter((e) => itemGerman(e)?.summary === undefined);
    expect(withoutSummary.map((e) => e.id)).toEqual([]);
  });

  it("zwei verschiedene Gegenstände heißen nicht gleich auf Deutsch", () => {
    /*
      Am Bogen steht der deutsche Name. Tragen zwei VERSCHIEDENE Gegenstände
      denselben, sind sie in der Gepäckliste nicht mehr zu unterscheiden — und man
      legt den falschen an.

      Der Vergleich läuft über den ENGLISCHEN Namen: das Pack führt selbst 206
      Namen doppelt („Cure Light Wounds" gibt es als Trank, zweimal als Rolle und
      als Zauberstab). Wo schon das Original gleich ist, darf die Übersetzung es
      auch sein — dort geht nichts verloren, das nicht vorher schon fehlte. Genau
      diese Prüfung hat „Amulet of Health" und „Periapt of Health" auseinander
      gebracht: beides hieß erst „Amulett der Gesundheit", jetzt ist der Periapt
      ein „Anhänger".
    */
    const byGerman = new Map<string, Set<string>>();
    for (const entity of items) {
      const german = itemGerman(entity)?.name;
      if (german === undefined) continue;
      const set = byGerman.get(german) ?? new Set<string>();
      set.add(entity.name);
      byGerman.set(german, set);
    }
    const collisions = [...byGerman]
      .filter(([, originals]) => originals.size > 1)
      .map(([german, originals]) => `${german} ← ${[...originals].join(" / ")}`);
    expect(collisions).toEqual([]);
  });

  it("nennt die Namen, die Philipp am Bogen sieht", () => {
    expect(itemGerman(item("longsword"))?.name).toBe("Langschwert");
    expect(itemGerman(item("banded-mail"))?.name).toBe("Bandrüstung");
    expect(itemGerman(item("shield-heavy-steel"))?.name).toBe("Schwerer Stahlschild");
    expect(itemGerman(item("morningstar"))?.name).toBe("Morgenstern");
    expect(itemGerman(item("holy-symbol-silver"))?.name).toBe("Heiliges Symbol, Silber");
    expect(itemGerman(item("backpack-empty"))?.name).toBe("Rucksack (leer)");
  });

  it("Zaubernamen bleiben englisch, mit deutschem Wort davor", () => {
    /*
      Die Regel dieses Projekts: Regelbegriffe englisch (DEX, nicht GE). Ein
      Zaubername ist ein Regelbegriff — „Säurepfeil" stünde in keinem seiner
      Bücher und wäre in der Suche nicht zu finden.
    */
    const scroll = itemGerman(item("acid-arrow"));
    expect(scroll?.name).toBe("Schriftrolle: Acid Arrow");
    expect(scroll?.summary).toContain("Acid Arrow");

    expect(itemGerman(item("acid-arrow-wand"))?.name).toBe("Zauberstab: Acid Arrow");
    expect(itemGerman(item("cure-light-wounds"))?.name).toBe("Trank: Cure Light Wounds");
  });

  it("die Familien +1 … +5 sind vollständig und einzeln richtig", () => {
    for (const bonus of [1, 2, 3, 4, 5]) {
      expect(itemGerman(item(`cloak-of-resistance-${bonus}`))?.name).toBe(
        `Umhang der Widerstandskraft +${bonus}`,
      );
    }
    expect(itemGerman(item("bracers-of-armor-8"))?.name).toBe("Armschienen der Rüstung +8");
    expect(itemGerman(item("amulet-of-health-6"))?.name).toBe("Amulett der Gesundheit +6");
  });

  it("Waffen- und Rüstungseigenschaften sagen, dass sie welche sind", () => {
    /*
      „Flaming" ist kein Gegenstand, sondern eine Aufwertung. Stünde im Gepäck
      nur „Flammend", sähe es aus wie ein Ding, das man tragen kann.
    */
    expect(itemGerman(item("flaming"))?.name).toBe("Eigenschaft: Flammend");
    expect(itemGerman(item("keen"))?.name).toBe("Eigenschaft: Geschärft");
    expect(itemGerman(item("holy"))?.name).toBe("Eigenschaft: Heilig");
    // Aber ein echtes Einzelstück NICHT.
    expect(itemGerman(item("holy-avenger"))?.name).toBe("Heiliger Rächer");
  });

  it("Verfluchtes sagt, dass es verflucht ist", () => {
    for (const key of ["bag-of-devouring", "necklace-of-strangulation", "potion-of-poison"]) {
      expect(itemGerman(item(key))?.summary).toMatch(/Verflucht/);
    }
  });

  it("Homebrew wird nicht angefasst", () => {
    const own: Entity = {
      ...item("longsword"),
      id: "homebrew:item:mein-schwert",
      source: "homebrew",
      name: "Mein Schwert",
    };
    expect(itemGerman(own as ItemEntity)).toBeUndefined();
    expect(withGermanItemNames([own])[0]?.localized).toBeUndefined();
  });

  it("der Überzug setzt localized.de und lässt entity.name stehen", () => {
    const overlaid = withGermanItemNames(entities);
    const sword = overlaid.find((e) => e.id === "srd:item:longsword");
    expect(sword?.name).toBe("Longsword");
    expect(displayName(sword!)).toBe("Langschwert");
    expect(sword?.localized?.de?.summary).toMatch(/Standardklinge/);
  });

  it("ein schon vorhandener deutscher Name gewinnt gegen den Überzug", () => {
    const handmade: Entity = {
      ...item("longsword"),
      localized: { de: { name: "Spatha", summary: "Von Hand." } },
    };
    const [out] = withGermanItemNames([handmade]);
    expect(out?.localized?.de?.name).toBe("Spatha");
    expect(out?.localized?.de?.summary).toBe("Von Hand.");
  });

  it("der Überzug lässt alles außer localized unverändert", () => {
    /*
      Die Fehlerfamilie dieses Projekts: ein abgeleiteter Wert, der irgendwo
      hängen bleibt. Der Überzug darf `rev`, `updatedAt` und `data` NICHT
      anfassen — sonst sieht jeder Abgleich eine Änderung, die keine ist.
      Nur `entities`, die schon einen Namen haben, sind unverändert; die
      übrigen unterscheiden sich AUSSCHLIESSLICH in `localized`.
    */
    const overlaid = withGermanItemNames(entities);
    expect(overlaid).toHaveLength(entities.length);
    for (let i = 0; i < entities.length; i++) {
      const before = entities[i]!;
      const after = overlaid[i]!;
      expect({ ...after, localized: undefined }).toEqual({ ...before, localized: undefined });
    }
  });

  it("zählt ehrlich, wie viele Erklärungen noch fehlen", () => {
    /*
      Kein stiller Rest. Die Zahl steht hier, damit sie beim nächsten Zuwachs
      auffällt — und damit sie im Bericht an Philipp nachprüfbar ist.
    */
    const missing = itemsWithoutGermanSummary(entities);
    // 1769 von 1866 sind erklärt. Die Schranke darf nur FALLEN — mehr schreiben
    // ist erlaubt, weniger nicht.
    expect(missing.length).toBeLessThanOrEqual(97);
    /*
      Und der Rest ist AUSSCHLIESSLICH episch (Stufe 21+, im Blätterer
      standardmäßig ausgeblendet) oder Artefakt. Das ist die eigentliche Aussage:
      nichts, was an einem Bogen der Stufen 1–20 vorkommt, steht ohne Erklärung
      da. Rutscht ein gewöhnlicher Gegenstand in diese Liste, fällt es hier auf.
    */
    for (const id of missing) {
      const entity = items.find((e) => e.id === id);
      const epic = entity?.tags.includes("epic") || entity?.tags.includes("artifact");
      expect(epic, `${id} ist weder episch noch Artefakt`).toBe(true);
    }
  });
});
