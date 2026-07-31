import { describe, expect, it } from "vitest";
import { characterSchema, type Character } from "../schema/character.js";
import { buildFingerprint } from "./orders.js";
import { campaignsOf, charactersToRecolor, colorOfCampaign } from "./campaigns.js";

/**
 * Kampagnen.
 *
 * Der Anlass, wörtlich: „jede Kampagne soll dann auch irgendwie optisch anders
 * dargestellt werden […] man trägt den Kampagnennamen ein und sucht sich eine
 * Farbe aus, die dann diese Kampagne trägt."
 */
const hero = (name: string, campaign?: { name: string; color?: string }): Character =>
  characterSchema.parse({
    id: `c-${name}`,
    name,
    raceId: "srd:race:human",
    abilities: { base: { str: 15, dex: 13, con: 12, int: 8, wis: 11, cha: 10 } },
    levels: [{ classId: "srd:class:fighter", hpRoll: "avg" as const }],
    ...(campaign === undefined ? {} : { campaign }),
  });

describe("Kampagnen fallen aus den Bögen — nicht aus einer zweiten Liste", () => {
  it("Jeder Name kommt einmal vor, mit Anzahl und Farbe", () => {
    const list = campaignsOf([
      hero("Hike", { name: "Nachtwind", color: "emerald" }),
      hero("Torben", { name: "Nachtwind", color: "emerald" }),
      hero("Alrik", { name: "Sturmtal", color: "sky" }),
    ]);
    expect(list).toEqual([
      { name: "Nachtwind", color: "emerald", count: 2, mixed: false },
      { name: "Sturmtal", color: "sky", count: 1, mixed: false },
    ]);
  });

  it("Bögen ohne Kampagne machen keine leere Kampagne auf", () => {
    // „Keine Kampagne" ist keine Kampagne, sondern die Abwesenheit einer.
    expect(campaignsOf([hero("Einzelgänger"), hero("Leer", { name: "   " })])).toEqual([]);
  });

  it("Groß- und Kleinschreibung machen keine zweite Kampagne", () => {
    // Sonst stehen „Nachtwind" und „nachtwind" nebeneinander, in zwei Farben.
    const list = campaignsOf([
      hero("A", { name: "Nachtwind", color: "emerald" }),
      hero("B", { name: "nachtwind ", color: "emerald" }),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]?.count).toBe(2);
  });

  it("Laufen zwei Geräte auseinander, wird das gemeldet statt verschwiegen", () => {
    /*
      Die Farbe liegt an jedem Bogen, damit sie mitreist. Der Preis: zwei Geräte
      können verschiedene Farben schreiben. Dann gewinnt die häufigere — und
      `mixed` sagt der Oberfläche, dass es etwas zu richten gibt.
    */
    const list = campaignsOf([
      hero("A", { name: "Nachtwind", color: "emerald" }),
      hero("B", { name: "Nachtwind", color: "emerald" }),
      hero("C", { name: "Nachtwind", color: "rose" }),
    ]);
    expect(list[0]?.color).toBe("emerald");
    expect(list[0]?.mixed).toBe(true);
  });

  it("Ohne Farbangabe ist die Kampagne unauffällig", () => {
    expect(campaignsOf([hero("A", { name: "Nachtwind" })])[0]?.color).toBe("slate");
  });
});

describe("Die Farbe gehört der Kampagne, nicht dem einzelnen Bogen", () => {
  it("Ein Farbwechsel nimmt alle Bögen dieser Kampagne mit", () => {
    // Bei vier Bögen viermal einzeln zu tippen heißt: einer wird vergessen.
    const all = [
      hero("A", { name: "Nachtwind", color: "emerald" }),
      hero("B", { name: "Nachtwind", color: "emerald" }),
      hero("C", { name: "Sturmtal", color: "sky" }),
      hero("D"),
    ];
    expect(charactersToRecolor(all, "Nachtwind", "rose").map((c) => c.name)).toEqual(["A", "B"]);
  });

  it("Wer die Farbe schon hat, wird nicht angefasst", () => {
    /*
      Sonst schreibt der Aufrufer rev-Erhöhungen, die nichts bedeuten — und der
      Abgleich hätte grundlos zu tun.
    */
    const all = [
      hero("A", { name: "Nachtwind", color: "rose" }),
      hero("B", { name: "Nachtwind", color: "emerald" }),
    ];
    expect(charactersToRecolor(all, "Nachtwind", "rose").map((c) => c.name)).toEqual(["B"]);
  });

  it("Eine bestehende Kampagne gibt ihre Farbe vor", () => {
    // Damit er sie beim zweiten Bogen nicht neu wählen muss.
    const all = [hero("A", { name: "Nachtwind", color: "teal" })];
    expect(colorOfCampaign(all, "nachtwind")).toBe("teal");
    expect(colorOfCampaign(all, "Unbekannt")).toBeUndefined();
  });
});

describe("Die Kampagne ist KEIN Aufbau", () => {
  it("Ein Farbwechsel löst keine Rettungskopie aus", () => {
    /*
      Der wichtigste Test an dieser Runde. `buildFingerprint` läuft über ALLE Felder
      und überspringt nur eine Ausnahmeliste — ein neues Feld gilt darin automatisch
      als Aufbau. Genau so hat schon einmal ein PORTRÄT eine Rettungskopie
      ausgelöst; eine Farbe darf das nicht wiederholen.
    */
    const a = hero("Hike", { name: "Nachtwind", color: "emerald" });
    const b = characterSchema.parse({ ...a, campaign: { name: "Nachtwind", color: "rose" } });
    expect(buildFingerprint(a)).toBe(buildFingerprint(b));
  });

  it("Auch ein anderer Kampagnenname zählt nicht als Umbau", () => {
    const a = hero("Hike", { name: "Nachtwind", color: "emerald" });
    const b = characterSchema.parse({ ...a, campaign: { name: "Sturmtal", color: "emerald" } });
    expect(buildFingerprint(a)).toBe(buildFingerprint(b));
  });

  it("Eine echte Regeländerung schlägt weiter durch", () => {
    // Die Gegenprobe: der Fingerabdruck ist nicht einfach blind geworden.
    const a = hero("Hike", { name: "Nachtwind", color: "emerald" });
    const b = characterSchema.parse({
      ...a,
      levels: [...a.levels, { classId: "srd:class:cleric", hpRoll: "avg" as const }],
    });
    expect(buildFingerprint(a)).not.toBe(buildFingerprint(b));
  });
});
