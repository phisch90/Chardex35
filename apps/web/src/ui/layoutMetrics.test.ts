/**
 * Die Maße der Hülle stehen an EINER Stelle — und das ist die Schranke dafür.
 *
 * Der Anlass: sein iPad-Bild („Die Leiste links ist auf dem iPad zu groß. Und dafür ist
 * sie auch zu unwichtig."). Beim Schmalermachen kam heraus, dass die Breite VIERMAL im
 * Quelltext stand: einmal an der Leiste und dreimal als `md:left-52` an allem, was fest
 * daneben klebt. Wer eine davon vergisst, bekommt ein Band, das neben dem Rand schwebt
 * — das ist die fünfte Falle dieses Projekts, und sie war hier schon zweimal bezahlt.
 *
 * Eine Entscheidung, die nur als Prosa in `CLAUDE.md` steht, ist nachweislich keine
 * Schranke (so stand es schon bei GAB gegen BAB). Dieser Test ist die Schranke: außer
 * in `layoutMetrics.ts` darf keine Datei die Zahlen selbst hinschreiben.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BLATT_BREITE, LEISTE_BREITE, LEISTE_VERSATZ, ZWEISPALTIG_AB } from "./layoutMetrics.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const QUELLE = "ui/layoutMetrics.ts";

function dateien(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const pfad = join(dir, name);
    if (statSync(pfad).isDirectory()) dateien(pfad, out);
    else if (/\.tsx?$/.test(pfad) && !/\.test\.tsx?$/.test(pfad)) out.push(pfad);
  }
  return out;
}

/**
 * Kommentare raus, bevor gesucht wird.
 *
 * Die erste Fassung dieser Schranke meldete `CharacterWizard.tsx` — dort steht
 * `max-w-3xl` in einem ERKLÄRSATZ über die Knopfbreite, nicht als Klasse. Das ist
 * genau die Falle, die in `CLAUDE.md` steht: eine Prüfung, die zu weit greift, meldet
 * eine Stelle, die mit der Regel nichts zu tun hat — und man baut den Text kaputt, um
 * sie grün zu bekommen. Dieselbe Antwort wie bei der Kürzel-Prüfung: ein kleiner
 * Zustandsautomat über die Datei.
 */
function ohneKommentare(text: string): string {
  let out = "";
  let i = 0;
  let inBlock = false;
  let inZeile = false;
  while (i < text.length) {
    const zwei = text.slice(i, i + 2);
    if (!inBlock && !inZeile && zwei === "/*") {
      inBlock = true;
      i += 2;
    } else if (inBlock && zwei === "*/") {
      inBlock = false;
      i += 2;
    } else if (!inBlock && !inZeile && zwei === "//") {
      inZeile = true;
      i += 2;
    } else if (inZeile && text[i] === "\n") {
      inZeile = false;
      out += "\n";
      i += 1;
    } else {
      if (!inBlock && !inZeile) out += text[i];
      i += 1;
    }
  }
  return out;
}

const alle = dateien(SRC).map((pfad) => ({
  rel: pfad.slice(SRC.length + 1).replace(/\\/g, "/"),
  text: ohneKommentare(readFileSync(pfad, "utf8")),
}));

describe("Die Maße der Hülle stehen einmal", () => {
  it("es wurde wirklich etwas gelesen", () => {
    // Ein Test, der nichts messen konnte und grün meldet, ist schlimmer als kein Test.
    expect(alle.length).toBeGreaterThan(40);
    expect(alle.some((d) => d.rel === QUELLE)).toBe(true);
  });

  it("die Breite der Symbolleiste steht nur in layoutMetrics", () => {
    /*
      Gesucht wird der RESPONSIVE Präfix und nicht die nackte Zahl: `w-16` ist überall
      in der App eine gewöhnliche Elementgröße (ein Zahlenfeld, eine Kachelspalte), und
      eine Schranke, die sie mitzählt, verbietet etwas, das mit der Leiste nichts zu tun
      hat. Ein Maß der HÜLLE erkennt man daran, dass es erst ab einer Breite gilt.
    */
    const treffer = alle
      .filter((d) => d.rel !== QUELLE && /\bmd:(w|left|pl|ml)-\d/.test(d.text))
      .map((d) => d.rel);
    expect(treffer).toEqual([]);
  });

  it("die Blattbreite steht nur in layoutMetrics", () => {
    const treffer = alle
      .filter((d) => d.rel !== QUELLE && /max-w-(3xl|6xl)/.test(d.text))
      .map((d) => d.rel);
    expect(treffer).toEqual([]);
  });

  it("Leiste und Versatz passen zueinander", () => {
    /*
      Die eigentliche Gefahr ist nicht, dass jemand die Zahl woanders hinschreibt,
      sondern dass er hier EINE von beiden ändert. Beide tragen dieselbe Zahl, und der
      Test liest sie aus den Klassen statt sie zu wiederholen.
    */
    const zahl = (klasse: string) => Number(/-(\d+)$/.exec(klasse)?.[1]);
    expect(zahl(LEISTE_BREITE)).toBe(zahl(LEISTE_VERSATZ));
    expect(zahl(LEISTE_BREITE)).toBeGreaterThan(0);
  });

  it("die Grenze für zwei Ansichten ist dieselbe Zahl wie das lg des Blatts", () => {
    /*
      `BLATT_BREITE` schaltet bei `lg` auf die volle Fläche, `useBreiterSchirm` gibt ab
      `ZWEISPALTIG_AB` zwei Spalten frei. Liefen die auseinander, stünden zwei Spalten
      in einem Blatt, das noch 768 px breit ist — jede Spalte wäre dann 370 px schmal.
    */
    expect(BLATT_BREITE).toContain("lg:max-w-");
    expect(ZWEISPALTIG_AB).toBe(1024); // Tailwinds lg
  });
});
