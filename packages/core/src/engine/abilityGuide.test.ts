import { describe, expect, it } from "vitest";
import { abilityGuide, turningTableOffset } from "./abilityGuide.js";
import { parseDice } from "../dice/dice.js";
import type { DerivedSheet } from "./types.js";

/**
 * Ein Bogen, so weit die Anleitung ihn braucht — Klassenstufen und Attributsmodifikatoren.
 *
 * Bewusst KEIN echter `deriveSheet`-Durchlauf: die Anleitung liest genau zwei Dinge, und
 * ein voller Bogen würde die Prüfung an Dutzende Felder binden, die mit ihr nichts zu tun
 * haben. Der Typ hält trotzdem fest, dass es dieselben Felder sind.
 */
function bogen(
  levels: Array<{ classId: string; level: number }>,
  mods: Partial<Record<"cha" | "con", number>> = {},
): DerivedSheet {
  const ability = (mod: number) => ({ mod, score: { total: 10 + mod * 2, parts: [] } });
  return {
    classLevels: levels,
    abilities: {
      str: ability(0),
      dex: ability(0),
      con: ability(mods.con ?? 0),
      int: ability(0),
      wis: ability(0),
      cha: ability(mods.cha ?? 0),
    },
  } as unknown as DerivedSheet;
}

const KLERIKER = "srd:class:cleric";
const PALADIN = "srd:class:paladin";
const BARBAR = "srd:class:barbarian";
const BARDE = "srd:class:bard";

describe("Schritt-für-Schritt: die Tabelle Turning Undead", () => {
  /*
    Die Treppe des SRD, von BEIDEN Seiten geprüft. Eine Tabelle, die man als Rechnung
    schreibt, ist genau an ihren Rändern falsch — und ein Punkt zu viel ist am Tisch ein
    Untoter zu viel.
  */
  it("trifft jede Stufe der Treppe, auch an den Rändern", () => {
    expect(turningTableOffset(-3)).toBe(-4);
    expect(turningTableOffset(0)).toBe(-4);
    expect(turningTableOffset(1)).toBe(-3);
    expect(turningTableOffset(3)).toBe(-3);
    expect(turningTableOffset(4)).toBe(-2);
    expect(turningTableOffset(6)).toBe(-2);
    expect(turningTableOffset(7)).toBe(-1);
    expect(turningTableOffset(9)).toBe(-1);
    expect(turningTableOffset(10)).toBe(0);
    expect(turningTableOffset(12)).toBe(0);
    expect(turningTableOffset(13)).toBe(1);
    expect(turningTableOffset(15)).toBe(1);
    expect(turningTableOffset(16)).toBe(2);
    expect(turningTableOffset(19)).toBe(3);
    expect(turningTableOffset(21)).toBe(3);
    expect(turningTableOffset(22)).toBe(4);
    expect(turningTableOffset(40)).toBe(4);
  });
});

describe("Schritt-für-Schritt durch eine Tagesfähigkeit", () => {
  it("kennt genau die vier Fähigkeiten, für die es eine Anleitung gibt", () => {
    /*
      `undefined` und keine leere Anleitung: die Oberfläche zeigt den Wirken-Knopf nur,
      wenn wirklich etwas dahintersteht. Ein Knopf, der eine leere Box öffnet, ist die
      Fehlerfamilie verspricht etwas und tut nichts — und ein selbstgebauter Zähler
      (Glueckswuerfel) ist genau der Fall, an dem das auffliegen würde.
    */
    const sheet = bogen([{ classId: KLERIKER, level: 5 }], { cha: 3 });
    for (const key of ["turn-undead", "smite-evil", "rage", "bardic-music"]) {
      expect(abilityGuide(key, sheet), key).toBeDefined();
    }
    expect(abilityGuide("action-points", sheet)).toBeUndefined();
    expect(abilityGuide("glueckswuerfel", sheet)).toBeUndefined();
  });

  /*
    DIE Prüfung dieser Runde: jeder Würfelausdruck muss wirklich würfelbar sein.

    Geprüft wird nicht der TEXT, sondern die STRECKE — was die Anleitung baut, muss
    `parseDice` lesen können. Genau hier ist in diesem Projekt schon einmal ein toter
    Würfelknopf entstanden: aus einem halben Fertigkeitsrang wurde 1d20+4.5,
    `parseDice` gab `null` zurück, und der Knopf tat wortlos nichts. Ein Test auf die
    Zeichenkette allein hätte das durchgelassen.
  */
  it("jeder Wurf in jeder Anleitung ist wirklich würfelbar", () => {
    const bögen: DerivedSheet[] = [
      bogen([{ classId: KLERIKER, level: 1 }], { cha: -1 }),
      bogen([{ classId: KLERIKER, level: 5 }], { cha: 3 }),
      bogen([{ classId: KLERIKER, level: 20 }], { cha: 8 }),
      bogen([{ classId: PALADIN, level: 4 }], { cha: 0 }),
      bogen([{ classId: BARBAR, level: 12 }], { con: 2 }),
      bogen([{ classId: BARDE, level: 9 }], { cha: 2 }),
    ];
    let geprüft = 0;
    for (const sheet of bögen) {
      for (const key of ["turn-undead", "smite-evil", "rage", "bardic-music"]) {
        const guide = abilityGuide(key, sheet);
        expect(guide, key).toBeDefined();
        for (const step of guide!.steps) {
          if (step.roll === undefined) continue;
          expect(parseDice(step.roll), `${key}: ${step.roll}`).not.toBeNull();
          // Ein Wurf ohne Beschriftung landet im Würfelblatt als nackte Zahl.
          expect(step.rollLabel, `${key}: ${step.roll}`).toBeTruthy();
          geprüft++;
        }
      }
    }
    /*
      Und die Gegenprobe, ohne die dieser Test grün melden könnte, ohne etwas gemessen zu
      haben: es MUSS Würfe gegeben haben. Genau diesen Fehler hat die Themen-Prüfung schon
      einmal gemacht — sie verglich gegen einen Anfangswert und war grün, obwohl kein
      einziges Thema gefunden wurde.
    */
    expect(geprüft).toBeGreaterThanOrEqual(12);
  });

  it("rechnet Untote vertreiben mit der KLERIKERstufe, nicht mit der Gesamtstufe", () => {
    /*
      Ein Kleriker 3 / Kämpfer 5 vertreibt wie ein Kleriker 3. Wer hier die Gesamtstufe
      nimmt, verschenkt am Tisch fünf Stufen Vertreibungsschaden — und es fällt nicht auf,
      weil die Zahl plausibel aussieht.
    */
    const guide = abilityGuide(
      "turn-undead",
      bogen(
        [
          { classId: KLERIKER, level: 3 },
          { classId: "srd:class:fighter", level: 5 },
        ],
        { cha: 2 },
      ),
    );
    const schaden = guide!.steps.find((s) => s.rollLabel?.includes("HD"));
    expect(schaden?.roll).toBe("2d6+5"); // 3 + 2, nicht 8 + 2
  });

  it("lässt einen Paladin ab Stufe 4 mit Paladinstufe − 3 vertreiben", () => {
    const guide = abilityGuide("turn-undead", bogen([{ classId: PALADIN, level: 6 }], { cha: 1 }));
    const schaden = guide!.steps.find((s) => s.rollLabel?.includes("HD"));
    expect(schaden?.roll).toBe("2d6+4"); // (6 − 3) + 1
  });

  it("nimmt beim Niederstrecken nur einen POSITIVEN CHA-Modifikator auf den Angriff", () => {
    /*
      add your Charisma bonus (if any) — ein Malus zählt nicht. Wer das übersieht, macht
      aus einer Fähigkeit eine Strafe.
    */
    const mies = abilityGuide("smite-evil", bogen([{ classId: PALADIN, level: 5 }], { cha: -2 }));
    expect(mies!.steps[1]?.text).toContain("nicht positiv");
    const gut = abilityGuide("smite-evil", bogen([{ classId: PALADIN, level: 5 }], { cha: 3 }));
    expect(gut!.steps[1]?.text).toContain("+3");
    // Der Schaden hängt an der STUFE, nicht am Attribut.
    expect(gut!.steps[2]?.text).toContain("+5");
  });

  it("rechnet die Dauer der Wut mit dem ERHÖHTEN CON-Modifikator", () => {
    /*
      Das ist die Stelle, an der man sich am Tisch verzählt: aus CON 14 (+2) wird in der
      Wut CON 18 (+4), also 3 + 4 = 7 Runden — nicht 5.
    */
    const guide = abilityGuide("rage", bogen([{ classId: BARBAR, level: 5 }], { con: 2 }));
    expect(guide!.steps.find((s) => s.title === "Wie lange")?.text).toContain("7 Runden");
  });

  it("kennt die Stufen der Wut und die Erschöpfung danach", () => {
    const klein = abilityGuide("rage", bogen([{ classId: BARBAR, level: 5 }], { con: 0 }));
    expect(klein!.steps[1]?.text).toContain("STR +4");
    expect(klein!.steps[3]?.text).toContain("erschöpft");

    const groß = abilityGuide("rage", bogen([{ classId: BARBAR, level: 20 }], { con: 0 }));
    expect(groß!.steps[1]?.text).toContain("STR +8");
    // Ab 17 keine Erschöpfung mehr — die Gegenprobe zur Zeile darüber.
    expect(groß!.steps[3]?.text).toContain("NICHT erschöpft");
  });

  it("lässt Inspire Courage mit der Bardenstufe wachsen", () => {
    const werte: Array<[number, string]> = [
      [1, "+1"],
      [8, "+2"],
      [14, "+3"],
      [20, "+4"],
    ];
    for (const [stufe, erwartet] of werte) {
      const guide = abilityGuide("bardic-music", bogen([{ classId: BARDE, level: stufe }]));
      expect(guide!.steps[0]?.text, `Stufe ${stufe}`).toContain(`Inspire Courage (Perform 3): ${erwartet}`);
    }
  });

  it("bietet auf niedriger Bardenstufe nicht an, was es dort nicht gibt", () => {
    const klein = abilityGuide("bardic-music", bogen([{ classId: BARDE, level: 1 }]));
    expect(klein!.steps[0]?.text).not.toContain("Suggestion");
    const groß = abilityGuide("bardic-music", bogen([{ classId: BARDE, level: 18 }]));
    expect(groß!.steps[0]?.text).toContain("Mass Suggestion");
  });

  it("sagt bei jeder Anleitung, was ein Einsatz kostet", () => {
    // Der letzte Schritt bucht ihn — und was gebucht wird, muss vorher dastehen.
    const sheet = bogen([{ classId: KLERIKER, level: 5 }], { cha: 3 });
    for (const key of ["turn-undead", "smite-evil", "rage", "bardic-music"]) {
      expect(abilityGuide(key, sheet)!.cost, key).toMatch(/^1 /);
    }
  });
});
