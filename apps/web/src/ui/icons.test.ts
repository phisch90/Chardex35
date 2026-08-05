/**
 * Zwei Dinge werden hier festgehalten, und beide sind schon einmal schiefgegangen.
 *
 * 1. **Die Formen selbst.** Ein `d`-Ausdruck mit einem Tippfehler malt kein Fehler-Zeichen,
 *    er malt gar nichts — der Browser schweigt, und der Reiter steht ohne Zeichen da. Ein
 *    Test, der bloß „ICON_SHAPES hat 21 Einträge" prüft, hätte das durchgelassen.
 *    Geprüft wird deshalb JEDER Pfad: fängt mit `M` an, enthält nur erlaubte Zeichen, und
 *    alle Zahlen liegen im 24er-Feld (ein Zeichen, das über den Rand ragt, wird
 *    abgeschnitten und sieht am Handy aus wie ein Zeichenfehler).
 *
 * 2. **Dass kein Emoji zurückkommt.** Sein Auftrag war, sie zu ersetzen — und die Stelle,
 *    an der sie sich wieder einschleichen, ist `strings.ts`: ein Zeichen in einem TEXT
 *    kann seine Farbe nicht vom Knopf nehmen, und beim nächsten Export steht es mitten im
 *    Satz. Deshalb liest dieser Test die Quelltexte und verbietet Emoji in `strings.ts`
 *    und in der Navigation.
 *
 * Die zweite Hälfte prüft Quelltext und nicht die laufende App. Das ist Absicht: der Lauf
 * im gebauten Bogen sieht nur, was gerade gerendert IST — ein Emoji in einem Zweig, den
 * er nicht aufschlägt, findet er nie.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ICON_NAMES, ICON_SHAPES, type IconName } from "./icons.js";
import { ACCENT_KEYS } from "./classAccents.js";
import { RACE_ICONS, RACE_ICON_FALLBACK, raceIconName } from "./raceIcon.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
/** Die Packs sind die Quelle der Völker — nicht eine Liste in diesem Test. */
const PACKS = join(SRC, "../../../packs/srd");

/**
 * Emoji im engeren Sinn: die farbigen. Bewusst NICHT die typografischen Zeichen
 * (✓ ✕ ★ ✧ ⚠ ⟳ ✎ − ＋) — die sind einfarbig, nehmen `currentColor` und waren nie das
 * Problem. Wer die auch ersetzen wollte, müsste 40 Stellen anfassen und gewönne nichts.
 */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{2B00}-\u{2BFF}]|\u{FE0F}/u;

/** Erlaubt in einem `d`: Befehle, Zahlen, Vorzeichen, Punkt, Komma, Leerzeichen. */
const PATH_OK = /^[MmLlHhVvCcSsQqTtAaZz0-9 ,.\-]+$/;

describe("Zeichen-Formen", () => {
  it("kennt jedes Zeichen, das die Oberfläche benutzt", () => {
    // 7 Reiter, 4 Hauptwege, 8 im ⋯-Blatt, 3 im Inhalt, 11 Klassen, 7 Völker.
    expect(ICON_NAMES.length).toBe(39);
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
  });

  it("jede Klasse hat ihr Symbol, und es heißt wie ihr Thema", () => {
    /*
      Das ist die wichtigste Prüfung an den Klassenzeichen: ihre Namen sind GENAU die
      Schlüssel der Themen. Dadurch braucht `ClassMark` keine Zuordnungstabelle — und wer
      eine Klasse dazunimmt, kann das Symbol nicht vergessen, weil der Typ es verlangt.

      Umgekehrt geprüft: kein Thema ohne Symbol UND kein verwaistes Symbol.
    */
    for (const key of ACCENT_KEYS) {
      expect(ICON_NAMES, key).toContain(key);
      expect(ICON_SHAPES[key].d.length, key).toBeGreaterThan(0);
    }
    expect(ACCENT_KEYS.length).toBe(11);
  });

  it("jedes Volk aus den Packs löst auf ein Zeichen auf", () => {
    /*
      Dieselbe Prüfung wie bei den Klassen, nur in die andere Richtung gelesen: die
      VÖLKER stehen in den Packs, und der Name des Zeichens ist ihre Kennung in
      Binnenschreibweise. Wer ein achtes Volk einspielt, bekommt hier den Fehler — in der
      App wäre es ein Kopf, der wie alle unbekannten aussieht (`characters`), und das
      fällt zwischen sieben Kacheln niemandem auf.

      Gelesen wird die PACK-Datei und nicht eine Liste hier: eine Liste im Test wäre eine
      zweite Wahrheit, die genauso veraltet wie die Zuordnung, die es nicht gibt.
    */
    const races = JSON.parse(readFileSync(join(PACKS, "races.json"), "utf8")) as { id: string }[];
    expect(races.length).toBe(7);
    for (const race of races) {
      const name = raceIconName(race.id);
      expect(name, race.id).not.toBe(RACE_ICON_FALLBACK);
      expect(ICON_NAMES, race.id).toContain(name);
      expect(ICON_SHAPES[name].d.length, race.id).toBeGreaterThan(0);
    }
    // Und kein verwaistes Kopfzeichen: jedes wird von genau einem Volk getroffen.
    const getroffen = new Set(races.map((race) => raceIconName(race.id)));
    expect([...getroffen].sort()).toEqual([...RACE_ICONS].sort());
  });

  it("ein unbekanntes Volk bekommt das neutrale Zeichen", () => {
    /*
      Der Unterschied zu den Klassen, und er ist Absicht: eine unbekannte Klasse bekommt
      GAR kein Thema (eine falsche Farbe wäre schlimmer als keine), eine Kachel dagegen
      muss etwas zeigen — sonst klafft ein Loch im Raster.
    */
    expect(raceIconName("homebrew:race:kobold")).toBe(RACE_ICON_FALLBACK);
    expect(raceIconName(undefined)).toBe(RACE_ICON_FALLBACK);
    // Ein Elf bleibt ein Elf, auch aus einem anderen Pack.
    expect(raceIconName("meinbuch:race:elf")).toBe("elf");
    // Und der Bindestrich wird zur Binnenschreibweise, nicht weggeworfen.
    expect(raceIconName("srd:race:half-orc")).toBe("halfOrc");
  });

  it("jedes Zeichen hat mindestens einen Pfad", () => {
    for (const name of ICON_NAMES) {
      expect(ICON_SHAPES[name].d.length, name).toBeGreaterThan(0);
    }
  });

  it("jeder Pfad fängt mit M an und enthält nur erlaubte Zeichen", () => {
    for (const name of ICON_NAMES) {
      for (const d of ICON_SHAPES[name].d) {
        expect(d.startsWith("M"), `${name}: ${d}`).toBe(true);
        expect(PATH_OK.test(d), `${name}: ${d}`).toBe(true);
      }
    }
  });

  it("bleibt im 24er-Feld", () => {
    /*
      Absolute Befehle geben Koordinaten, relative Verschiebungen — beide liegen bei
      diesen Zeichen zwischen −24 und 24. Eine Zahl darüber ist immer ein Tippfehler
      (ein verrutschtes Komma), und genau der schneidet das Zeichen ab.
    */
    for (const name of ICON_NAMES) {
      for (const d of ICON_SHAPES[name].d) {
        for (const raw of d.match(/-?\d+(\.\d+)?/g) ?? []) {
          expect(Math.abs(Number(raw)), `${name}: ${d} → ${raw}`).toBeLessThanOrEqual(24);
        }
      }
      for (const [cx, cy, r] of ICON_SHAPES[name].dots ?? []) {
        expect(cx, name).toBeGreaterThanOrEqual(0);
        expect(cx, name).toBeLessThanOrEqual(24);
        expect(cy, name).toBeGreaterThanOrEqual(0);
        expect(cy, name).toBeLessThanOrEqual(24);
        expect(r, name).toBeGreaterThan(0);
      }
    }
  });

  it("die sieben Reiter des Bogens haben ihr eigenes Zeichen", () => {
    // Der Schlüssel des Reiters IST der Name des Zeichens — deshalb keine Tabelle im Bogen.
    const tabs: IconName[] = [
      "stats",
      "combat",
      "skills",
      "spells",
      "inventory",
      "feats",
      "notes",
    ];
    for (const tab of tabs) expect(ICON_NAMES, tab).toContain(tab);
  });
});

describe("keine Emoji mehr in Text und Navigation", () => {
  it("strings.ts trägt kein Emoji", () => {
    const text = readFileSync(join(SRC, "strings.ts"), "utf8");
    const lines = text.split("\n").filter((line) => EMOJI.test(line));
    expect(lines, `Emoji in strings.ts:\n${lines.join("\n")}`).toEqual([]);
  });

  it("die Navigation trägt kein Emoji", () => {
    /*
      Hier fielen sie am meisten auf: die Reiterleiste unten steht am Handy immer im Bild.
      Die Kommentare in `icons.tsx` selbst NENNEN Emoji (sie erklären, was ersetzt wurde) —
      diese Datei steht deshalb nicht in der Liste.
    */
    for (const rel of ["ui/Layout.tsx", "pages/sheet/index.tsx", "ui/CharacterActions.tsx"]) {
      const text = readFileSync(join(SRC, rel), "utf8");
      const code = text
        .split("\n")
        // Kommentarzeilen dürfen ein Emoji nennen — sie erklären ja gerade dessen Abschaffung.
        .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line));
      const bad = code.filter((line) => EMOJI.test(line));
      expect(bad, `Emoji in ${rel}:\n${bad.join("\n")}`).toEqual([]);
    }
  });
});
