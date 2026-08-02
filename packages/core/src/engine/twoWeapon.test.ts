import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { characterSchema, type Character, type EquipSlot } from "../schema/character.js";
import { entitySchema, resolveCompendium, type Entity } from "../schema/entities.js";
import { deriveSheet } from "./index.js";

/**
 * Zweiwaffenkampf — gegen die ECHTEN Packs, weil an ihnen die Waffendaten hängen.
 *
 * Was die Zahlen prüfen, ist eine Regelentscheidung von Philipps Tisch: „der zwei
 * waffen angriff malus gilt bei uns." Die Mali stehen wörtlich am SRD-Talent
 * (`packs/srd/feats-2.json`, srd:feat:two-weapon-fighting): Grundlage −6/−10, mit
 * leichter Waffe in der ZWEITEN Hand je 2 weniger, mit dem Talent 2 weniger für
 * die Haupthand und 6 weniger für die zweite. Vier Fälle, eine Formel.
 *
 * Mit erfundenen Kennungen wäre nichts davon geprüft: ob eine Waffe „leicht" ist,
 * steht in den Packdaten, und genau daran hängt die Höhe.
 */
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

const SHORT = "srd:item:sword-short"; // leicht, 1d6
const DAGGER = "srd:item:dagger"; // leicht, 1d4
const LONG = "srd:item:longsword"; // einhändig, 1d8 — NICHT leicht
const GREAT = "srd:item:greatsword"; // zweihändig
const CROSSBOW = "srd:item:crossbow-light"; // Fernkampf
const TWF = "srd:feat:two-weapon-fighting";
const IMPROVED = "srd:feat:improved-two-weapon-fighting";

/**
 * Hikes Bauform: Kämpfer 3 / Kleriker 4 → Grundangriffsbonus +6, STR 15 (+2).
 * Das Kurzschwert trägt sein +1 als eigener Modifikator an der Inventarzeile,
 * damit die Zahlen die aus seinem Bogen sind (+9) und nicht runde Testwerte.
 */
function hike(opts: {
  hands: { itemId: string; slot: EquipSlot }[];
  twoWeaponFighting?: boolean;
  feats?: string[];
}): Character {
  return characterSchema.parse({
    id: "tw-1",
    name: "Hike",
    abilities: { base: { str: 15, dex: 12, con: 12, int: 10, wis: 11, cha: 10 } },
    raceId: "srd:race:human",
    levels: [
      ...Array.from({ length: 3 }, () => ({ classId: "srd:class:fighter", hpRoll: "avg" as const })),
      ...Array.from({ length: 4 }, () => ({ classId: "srd:class:cleric", hpRoll: "avg" as const })),
    ],
    feats: (opts.feats ?? []).map((featId) => ({ featId, extraEffects: [] })),
    inventory: opts.hands.map((hand, i) => ({
      id: `inv-${i}`,
      itemId: hand.itemId,
      slot: hand.slot,
      extraEffects:
        hand.itemId === SHORT
          ? [
              { target: "attack.self", bonusType: "enhancement", value: 1 },
              { target: "damage.self", bonusType: "enhancement", value: 1 },
            ]
          : [],
    })),
    combatOptions: { twoWeaponFighting: opts.twoWeaponFighting ?? false },
  });
}

describe.skipIf(!packsAvailable)("Zweiwaffenkampf", () => {
  const compendium = packsAvailable ? loadCompendium() : new Map<string, Entity>();

  /** Angriffszeilen nach Waffe, plus die Sammelzeile Nahkampf. */
  const lines = (character: Character) => {
    const sheet = deriveSheet(character, compendium);
    const byLabel = new Map(sheet.attacks.map((a) => [a.label, a]));
    return { sheet, byLabel };
  };
  const bonuses = (character: Character, label: string) => {
    const hit = lines(character).byLabel.get(label);
    if (!hit) throw new Error(`keine Angriffszeile „${label}"`);
    return hit.bonuses;
  };

  const beideHaende = [
    { itemId: SHORT, slot: "mainHand" as EquipSlot },
    { itemId: DAGGER, slot: "offHand" as EquipSlot },
  ];

  it("Schalter AUS: alles bleibt, wie es war", () => {
    // Grundangriffsbonus +6, STR +2, Kurzschwert +1 → +9, zweiter Angriff +4.
    const c = hike({ hands: beideHaende });
    expect(bonuses(c, "Sword, short")).toEqual([9, 4]);
    expect(bonuses(c, "Dagger")).toEqual([8, 3]);
    expect(bonuses(c, "Nahkampf")).toEqual([8, 3]);
  });

  it("Schalter AN, ohne Talent, leichte Waffe in der zweiten Hand: −4 / −8", () => {
    const c = hike({ hands: beideHaende, twoWeaponFighting: true });
    expect(bonuses(c, "Sword, short")).toEqual([5, 0]);
    // Die zweite Hand bekommt EINEN Angriff, nicht die absteigende Reihe.
    expect(bonuses(c, "Dagger")).toEqual([0]);
  });

  it("Schalter AN, MIT dem Talent: −2 / −2", () => {
    const c = hike({ hands: beideHaende, twoWeaponFighting: true, feats: [TWF] });
    expect(bonuses(c, "Sword, short")).toEqual([7, 2]);
    expect(bonuses(c, "Dagger")).toEqual([6]);
  });

  it("Nicht leichte Waffe in der zweiten Hand: die volle Härte, −6 / −10", () => {
    // Langschwert ist „one", nicht „light" — der Malus hängt allein an ihr.
    const hands = [
      { itemId: SHORT, slot: "mainHand" as EquipSlot },
      { itemId: LONG, slot: "offHand" as EquipSlot },
    ];
    const ohne = hike({ hands, twoWeaponFighting: true });
    expect(bonuses(ohne, "Sword, short")).toEqual([3, -2]);
    expect(bonuses(ohne, "Longsword")).toEqual([-2]);
    const mit = hike({ hands, twoWeaponFighting: true, feats: [TWF] });
    expect(bonuses(mit, "Sword, short")).toEqual([5, 0]);
    expect(bonuses(mit, "Longsword")).toEqual([4]);
  });

  it("Die Höhe hängt an der ZWEITEN Hand, nicht an der Haupthand", () => {
    /*
      Der Test, der die häufigste Fehlversion abfängt: „ist die Waffe in der
      Haupthand leicht?" Beide Aufbauten haben eine leichte und eine schwere
      Waffe, nur seitenvertauscht — die Mali müssen sich unterscheiden.
    */
    const leichtHinten = hike({
      hands: [
        { itemId: LONG, slot: "mainHand" },
        { itemId: DAGGER, slot: "offHand" },
      ],
      twoWeaponFighting: true,
    });
    const schwerHinten = hike({
      hands: [
        { itemId: DAGGER, slot: "mainHand" },
        { itemId: LONG, slot: "offHand" },
      ],
      twoWeaponFighting: true,
    });
    // Leicht hinten → −4/−8. Langschwert 6+2=8 → 4, Dolch 8 → 0.
    expect(bonuses(leichtHinten, "Longsword")).toEqual([4, -1]);
    expect(bonuses(leichtHinten, "Dagger")).toEqual([0]);
    // Schwer hinten → −6/−10. Dolch 8 → 2, Langschwert 8 → −2.
    expect(bonuses(schwerHinten, "Dagger")).toEqual([2, -3]);
    expect(bonuses(schwerHinten, "Longsword")).toEqual([-2]);
  });

  it("Improved Two-Weapon Fighting gibt der zweiten Hand einen zweiten Angriff", () => {
    const c = hike({
      hands: beideHaende,
      twoWeaponFighting: true,
      feats: [TWF, IMPROVED],
    });
    expect(bonuses(c, "Dagger")).toEqual([6, 1]);
  });

  it("Die Sammelzeile Nahkampf bekommt NIE einen Malus", () => {
    /*
      Genau dieser Fehler war bei Power Attack schon einmal live: ein Malus, der
      für eine Waffenkombination gilt, landete auf dem Gesamtwert. Stattdessen
      steht dort ein Satz.
    */
    const c = hike({ hands: beideHaende, twoWeaponFighting: true, feats: [TWF] });
    const { byLabel } = lines(c);
    expect(byLabel.get("Nahkampf")?.bonuses).toEqual([8, 3]);
    expect(byLabel.get("Nahkampf")?.notes.join(" ")).toContain("Zweiwaffenkampf ist an");
    // Fernkampf: GAB +6 und DEX +1 — vom Zweiwaffenkampf unberührt.
    expect(byLabel.get("Fernkampf")?.bonuses).toEqual([7, 2]);
  });

  it("Der Malus steht in der Aufschlüsselung, nicht nur in der Summe", () => {
    const c = hike({ hands: beideHaende, twoWeaponFighting: true });
    const { byLabel } = lines(c);
    const haupt = byLabel.get("Sword, short")!.attack.contributions.find((x) => x.value === -4);
    expect(haupt?.source).toContain("Zweiwaffenkampf");
    expect(haupt?.source).toContain("Haupthand");
    const zweite = byLabel.get("Dagger")!.attack.contributions.find((x) => x.value === -8);
    expect(zweite?.source).toContain("zweite Hand");
  });

  describe("Wann es NICHT gilt", () => {
    const gilt = (c: Character) =>
      lines(c).byLabel.get("Sword, short")!.attack.contributions.some((x) =>
        x.source.includes("Zweiwaffenkampf"),
      );

    it("Zweite Waffe im Rucksack: kein Malus, aber eine Warnung", () => {
      const c = hike({
        hands: [
          { itemId: SHORT, slot: "mainHand" },
          { itemId: DAGGER, slot: "none" },
        ],
        twoWeaponFighting: true,
      });
      expect(gilt(c)).toBe(false);
      expect(bonuses(c, "Sword, short")).toEqual([9, 4]);
      // Aus dem Rucksack bekommt der Dolch weiter seine ganze Reihe.
      expect(bonuses(c, "Dagger")).toEqual([8, 3]);
      expect(lines(c).sheet.issues.some((i) => i.code === "combat-option")).toBe(true);
    });

    it("Altbestand `worn` ist keine Hand", () => {
      // Charaktere aus der Zeit vor den Slot-Marken tragen `equipped: true`, was
      // das Schema zu `worn` macht. Zählte das mit, verschöben sich still die
      // Zahlen aller alten Bögen.
      const c = hike({
        hands: [
          { itemId: SHORT, slot: "worn" },
          { itemId: DAGGER, slot: "worn" },
        ],
        twoWeaponFighting: true,
      });
      expect(gilt(c)).toBe(false);
      expect(bonuses(c, "Sword, short")).toEqual([9, 4]);
    });

    it("Ein Zweihänder sperrt — beide Hände sind belegt", () => {
      const c = hike({
        hands: [
          { itemId: SHORT, slot: "mainHand" },
          { itemId: DAGGER, slot: "offHand" },
          { itemId: GREAT, slot: "bothHands" },
        ],
        twoWeaponFighting: true,
      });
      expect(gilt(c)).toBe(false);
      expect(lines(c).sheet.issues.some((i) => i.code === "combat-option")).toBe(true);
    });

    it("Eine Armbrust in der Haupthand ist kein Zweiwaffenkampf", () => {
      // `allowedSlots` erlaubt Fernkampfwaffen in der Haupthand. Ein
      // Nahkampf-Malus auf eine Armbrust wäre genau der Fehlertyp, der hier
      // schon einmal live war.
      const c = hike({
        hands: [
          { itemId: CROSSBOW, slot: "mainHand" },
          { itemId: DAGGER, slot: "offHand" },
        ],
        twoWeaponFighting: true,
      });
      expect(bonuses(c, "Crossbow, light")).toEqual([7, 2]); // 6 + DEX 1
      expect(bonuses(c, "Dagger")).toEqual([8, 3]);
    });

    it("Schwert und Schild lösen nichts aus", () => {
      // Sein eigener Aufbau. Der RK-Schild trägt keine Waffendaten und steht
      // damit gar nicht unter den Waffen — das darf niemand „aufräumen".
      const c = hike({
        hands: [
          { itemId: SHORT, slot: "mainHand" },
          { itemId: "srd:item:shield-heavy-wooden", slot: "offHand" },
        ],
        twoWeaponFighting: true,
      });
      expect(gilt(c)).toBe(false);
      expect(bonuses(c, "Sword, short")).toEqual([9, 4]);
    });

    it("Der Schalter allein tut nichts, wenn die Hände leer sind", () => {
      const c = hike({ hands: [{ itemId: SHORT, slot: "mainHand" }], twoWeaponFighting: true });
      expect(gilt(c)).toBe(false);
      expect(lines(c).sheet.twoWeaponPossible).toBe(false);
    });
  });

  it("twoWeaponPossible sagt der Oberfläche, ob der Schalter sinnvoll ist", () => {
    expect(lines(hike({ hands: beideHaende })).sheet.twoWeaponPossible).toBe(true);
    expect(
      lines(hike({ hands: [{ itemId: SHORT, slot: "mainHand" }] })).sheet.twoWeaponPossible,
    ).toBe(false);
  });

  it("Sagt, dass die Zahl für die volle Attacke gilt", () => {
    /*
      Der Erklärsatz zur Angriffsfolge behauptet „ein einzelner Angriff nutzt
      immer +5" — mit angeschaltetem Zweiwaffenkampf ist das falsch, denn den
      Malus zahlt man nur, WEIL man mit beiden Waffen angreift. Am Tisch hängt
      genau daran die Zahl, die gewürfelt wird.
    */
    const c = hike({ hands: beideHaende, twoWeaponFighting: true });
    const notes = lines(c).byLabel.get("Sword, short")!.notes.join(" ");
    expect(notes).toContain("volle Attacke mit beiden Waffen");
    expect(notes).toContain("Ein einzelner Angriff");
    // Ohne Schalter steht der Satz NICHT da.
    const aus = hike({ hands: beideHaende });
    expect(lines(aus).byLabel.get("Sword, short")!.notes.join(" ")).not.toContain("volle Attacke");
  });

  /*
    Der halbe Stärkeschaden der zweiten Hand — Martins Antwort: „Zweiwaffenkampf: Off
    Hand nur halber Stärkebonus (relevant für Daniel)."

    Vorher stand hier ein Test, der das GEGENTEIL festhielt („der Schaden bleibt
    unberührt — das ist eine eigene Frage"), weil die Regel noch offen war. Genau so
    soll es sein: die Antwort kommt, der Test dreht sich, und die Änderung ist an einer
    Stelle sichtbar statt still.
  */
  describe("Halber Stärkeschaden in der zweiten Hand", () => {
    it("Die zweite Hand bekommt die Hälfte, die Haupthand den vollen Bonus", () => {
      // STR 15 (+2): der Dolch bekommt +1, das Kurzschwert +2 und sein eigenes +1.
      const c = hike({ hands: beideHaende, twoWeaponFighting: true });
      const { byLabel } = lines(c);
      expect(byLabel.get("Dagger")?.damageText).toBe("1d4+1");
      expect(byLabel.get("Sword, short")?.damageText).toBe("1d6+3");
    });

    it("Ohne eingeschalteten Zweiwaffenkampf zählt die Stärke voll", () => {
      /*
        Die Halbierung hängt an derselben Bedingung wie der Angriffsmalus: man zahlt
        sie, WEIL man mit beiden Waffen angreift. Wer den Dolch nur dabei hat und
        einmal zusticht, führt ihn als Primärwaffe.
      */
      const c = hike({ hands: beideHaende });
      expect(lines(c).byLabel.get("Dagger")?.damageText).toBe("1d4+2");
    });

    it("Der Bogen sagt es auch in Worten, mit der echten Zahl", () => {
      const c = hike({ hands: beideHaende, twoWeaponFighting: true });
      const notes = lines(c).byLabel.get("Dagger")!.notes.join(" ");
      expect(notes).toMatch(/halbe STR-Bonus/i);
      expect(notes).toContain("+2 → +1");
    });

    it("Die Aufschlüsselung benennt den halben Bonus", () => {
      const c = hike({ hands: beideHaende, twoWeaponFighting: true });
      const quellen = lines(c)
        .byLabel.get("Dagger")!
        .damageBonus.contributions.map((d) => d.source)
        .join(" | ");
      expect(quellen).toContain("½ zweite Hand");
    });

    it("Ein STR-MALUS wird NICHT halbiert — er zählt voll", () => {
      /*
        Halbiert wird ein BONUS. Ein Malus bleibt ganz, und zwar aus derselben
        Richtung wie Martins andere Antwort („1,5x wird immer angewendet, auch bei
        negativem Mod"): es geht nie zugunsten des Charakters. `Math.floor` hätte es
        von allein falsch gemacht — floor(−2 × 0,5) ist −1.
      */
      const schwach = characterSchema.parse({
        ...JSON.parse(JSON.stringify(hike({ hands: beideHaende, twoWeaponFighting: true }))),
        abilities: { base: { str: 7, dex: 12, con: 12, int: 10, wis: 11, cha: 10 } },
      });
      const { byLabel } = lines(schwach);
      // STR 7 = −2: beide Hände tragen die volle −2 (das Kurzschwert hat +1 dazu).
      expect(byLabel.get("Dagger")?.damageText).toBe("1d4-2");
      expect(byLabel.get("Sword, short")?.damageText).toBe("1d6-1");
      expect(byLabel.get("Dagger")!.notes.join(" ")).toMatch(/Malus zählt voll/i);
    });

    it("Eine zweihändige Waffe bleibt beim Anderthalbfachen", () => {
      // Gegenprobe: der neue Zweig darf den ×1,5-Weg nicht anfassen. STR +2 × 1,5 = +3.
      const c = hike({ hands: [{ itemId: GREAT, slot: "bothHands" }] });
      expect(lines(c).byLabel.get("Greatsword")?.damageText).toBe("2d6+3");
    });
  });
});
