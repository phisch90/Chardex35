/**
 * PDF → Textzeilen in Leserichtung.
 *
 * Regelwerke sind zweispaltig, und pdf.js liefert Textstücke in der Reihenfolge,
 * in der sie im Dokument stehen — nicht in Leserichtung. Ohne Spaltenerkennung
 * kommen die beiden Spalten verschränkt heraus, und dann ist jede weitere
 * Erkennung wertlos. Deshalb: Stücke → Zeilen (nach y bündeln) → Spalten (nach x
 * trennen) → Spalte 1 komplett, dann Spalte 2.
 */
import { readFile } from "node:fs/promises";

export interface TextPiece {
  text: string;
  /** Vom linken Rand, in PDF-Punkten. */
  x: number;
  /** Von der UNTERKANTE der Seite (so liefert es PDF). */
  y: number;
  width: number;
  height: number;
  fontName: string;
}

export interface Line {
  text: string;
  page: number;
  x: number;
  /** Rechtes Ende der Zeile. Eine Zeile, die den Satzspiegel NICHT ausfüllt,
   *  beendet einen Absatz — das ist der zuverlässigste Absatz-Hinweis, den ein
   *  PDF hergibt (Leerzeilen gibt es dort nicht). */
  right: number;
  y: number;
  /** Größte Schrifthöhe der Zeile — Überschriften sind höher als Fließtext. */
  height: number;
  /** Schrift des ersten Stücks; Namen von Einträgen stehen fett, also anders. */
  fontName: string;
  /** 0 = linke Spalte, 1 = rechte; bei einspaltigen Seiten immer 0. */
  column: number;
}

export interface PdfPage {
  number: number;
  width: number;
  height: number;
  pieces: TextPiece[];
}

/** Zwei Stücke gehören zur selben Zeile, wenn ihre Grundlinie so nah liegt. */
const LINE_TOLERANCE = 2.5;

/**
 * Wie weit von Ober-/Unterkante als „Seitenrand" gilt. Großzügig gewählt, weil
 * zusätzlich Wiederholung über Seiten hinweg verlangt wird — und weil eine zu
 * knappe Zone genau das durchlässt, was sie fangen soll: die Kopfzeile lag im
 * Prüf-PDF 27 pt unter der Kante, bei 7 % waren 26 pt erlaubt.
 */
const MARGIN_BAND = 0.1;

export async function readPdfPages(path: string): Promise<PdfPage[]> {
  // legacy-Build: der normale ist für Browser gebaut und stolpert in Node.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await readFile(path));
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;

  const pages: PdfPage[] = [];
  for (let number = 1; number <= doc.numPages; number++) {
    const page = await doc.getPage(number);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const pieces: TextPiece[] = [];
    for (const item of content.items) {
      if (!("str" in item) || item.str.trim() === "") continue;
      // transform = [a, b, c, d, e, f]; e/f sind die Position, d die Höhe.
      const [, , , d, e, f] = item.transform as number[];
      pieces.push({
        text: item.str,
        x: e ?? 0,
        y: f ?? 0,
        width: item.width,
        height: Math.abs(d ?? item.height),
        fontName: item.fontName,
      });
    }
    pages.push({ number, width: viewport.width, height: viewport.height, pieces });
    page.cleanup();
  }
  await doc.destroy();
  return pages;
}

/**
 * Spaltengrenze finden: die x-Mitte der Seite ist eine Vermutung, kein Fakt.
 * Belegt wird sie über die tatsächlichen Zeilenanfänge — liegen genug davon
 * deutlich rechts der Mitte UND ist dazwischen ein leerer Streifen, ist die Seite
 * zweispaltig. Sonst wird nicht getrennt (Tabellen, Titelseiten).
 */
export function findColumnSplit(pieces: TextPiece[], pageWidth: number): number | null {
  if (pieces.length < 20) return null;
  const middle = pageWidth / 2;
  const starts = pieces.map((p) => p.x);
  const left = starts.filter((x) => x < middle).length;
  const right = starts.filter((x) => x >= middle).length;
  // Beide Seiten müssen ordentlich gefüllt sein, sonst ist es keine Spalte.
  if (left < pieces.length * 0.25 || right < pieces.length * 0.25) return null;

  // Der Streifen um die Mitte, in dem KEIN Text beginnt oder durchläuft.
  const band = pageWidth * 0.06;
  const crossing = pieces.filter((p) => p.x < middle - band && p.x + p.width > middle + band);
  if (crossing.length > pieces.length * 0.02) return null; // Text läuft durch → einspaltig
  return middle;
}

/** Stücke einer Seite zu Zeilen bündeln, Spalte für Spalte, von oben nach unten. */
export function piecesToLines(page: PdfPage): Line[] {
  const split = findColumnSplit(page.pieces, page.width);
  const columns: TextPiece[][] = split === null
    ? [page.pieces]
    : [page.pieces.filter((p) => p.x < split), page.pieces.filter((p) => p.x >= split)];

  const out: Line[] = [];
  columns.forEach((pieces, column) => {
    const rows = new Map<number, TextPiece[]>();
    for (const piece of pieces) {
      // Auf ein Raster runden, damit Grundlinien mit Rundungsfehlern zusammenfinden.
      const key = Math.round(piece.y / LINE_TOLERANCE);
      const row = rows.get(key);
      if (row) row.push(piece);
      else rows.set(key, [piece]);
    }
    const sorted = [...rows.entries()].sort((a, b) => b[0] - a[0]); // y groß = oben
    for (const [, row] of sorted) {
      row.sort((a, b) => a.x - b.x);
      const first = row[0];
      if (!first) continue;
      const last = row[row.length - 1]!;
      out.push({
        text: joinPieces(row),
        page: page.number,
        x: first.x,
        right: last.x + last.width,
        y: first.y,
        height: Math.max(...row.map((p) => p.height)),
        fontName: first.fontName,
        column,
      });
    }
  });
  return out;
}

/**
 * Stücke einer Zeile zu Text verbinden. pdf.js zerlegt eine Zeile an
 * Schriftwechseln und teils an jedem Wort; ob dazwischen ein Leerzeichen gehört,
 * verrät nur der Abstand.
 */
function joinPieces(row: TextPiece[]): string {
  let text = "";
  let previousEnd: number | null = null;
  for (const piece of row) {
    const gap = previousEnd === null ? 0 : piece.x - previousEnd;
    if (previousEnd !== null && gap > piece.height * 0.18 && !text.endsWith(" ")) text += " ";
    text += piece.text;
    previousEnd = piece.x + piece.width;
  }
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Laufende Kopf- und Fußzeilen entfernen: Text am oberen oder unteren
 * Seitenrand, der sich über Seiten hinweg wiederholt (Buchtitel, Kapitelname,
 * Seitenzahl). Ohne das landet „CHAPTER 2: FEATS" mitten in einem Talenttext.
 *
 * Das geschieht auf Ebene der TEXTSTÜCKE und damit VOR Spalten und Zeilen — aus
 * zwei Gründen, beide beim Prüfen aufgefallen:
 *
 *  1. Kopfzeile und Seitenzahl stehen außerhalb der Spalten. Erkennt eine Seite
 *     ihre Spalten nicht (kurze letzte Seite), landen beide in derselben Zeile:
 *     „Test Compendium Page 2". Der Vergleich mit „Test Compendium" von Seite 1
 *     scheitert dann, und die Kopfzeile bleibt stehen.
 *  2. Eine Kopfzeile läuft über die ganze Seitenbreite. Sie zählt damit in der
 *     Spaltenerkennung als Text, der die Mitte kreuzt — also als Beleg gegen
 *     Spalten, die es gibt.
 *
 * Der Schlüssel enthält die Höhe: eine Kopfzeile steht auf jeder Seite gleich
 * hoch, Fließtext trifft dieselbe Zeichenfolge nie zweimal auf derselben Höhe.
 */
export function stripRunningHeadPieces(pages: PdfPage[]): PdfPage[] {
  if (pages.length < 2) return pages;

  const isMargin = (page: PdfPage, piece: TextPiece) => {
    const fromTop = page.height - piece.y;
    return fromTop < page.height * MARGIN_BAND || piece.y < page.height * MARGIN_BAND;
  };
  const keyFor = (piece: TextPiece) => `${normalizeHead(piece.text)}@${Math.round(piece.y)}`;

  const seenOn = new Map<string, Set<number>>();
  for (const page of pages) {
    for (const piece of page.pieces) {
      if (!isMargin(page, piece)) continue;
      if (normalizeHead(piece.text) === "") continue;
      const key = keyFor(piece);
      const seen = seenOn.get(key);
      if (seen) seen.add(page.number);
      else seenOn.set(key, new Set([page.number]));
    }
  }

  /*
    Zwei Seiten genügen. Das Merkmal einer laufenden Kopfzeile ist nicht „steht
    auf den meisten Seiten" — ein Kapitelname steht nur auf den Seiten seines
    Kapitels —, sondern „steht am Seitenrand und WIEDERHOLT sich". Eine
    Prozentschwelle war hier schlicht falsch: bei kurzen Dokumenten griff sie
    gar nicht.
  */
  const repeated = new Set(
    [...seenOn.entries()].filter(([, seen]) => seen.size >= 2).map(([key]) => key),
  );
  return pages.map((page) => ({
    ...page,
    pieces: page.pieces.filter((piece) => !(isMargin(page, piece) && repeated.has(keyFor(piece)))),
  }));
}

/** Seitenzahlen wegnormalisieren, damit „Seite 41" und „Seite 42" als gleich gelten. */
function normalizeHead(text: string): string {
  return text.replace(/\d+/g, "#").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Kompletter Weg: Datei → Zeilen in Leserichtung, ohne Kopf-/Fußzeilen. */
export async function readPdfLines(path: string): Promise<{ pages: PdfPage[]; lines: Line[] }> {
  const raw = await readPdfPages(path);
  const pages = stripRunningHeadPieces(raw);
  return { pages, lines: pages.flatMap((page) => piecesToLines(page)) };
}
