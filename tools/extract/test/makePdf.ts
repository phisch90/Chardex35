/**
 * Erzeugt ein PDF, das wie eine Regelwerk-Seite aufgebaut ist: zwei Spalten,
 * laufende Kopfzeile mit Seitenzahl, Eintragsnamen fett, Feldnamen („Benefit:")
 * fett am Absatzanfang.
 *
 * Damit lässt sich der Konverter gegen bekannten Inhalt prüfen, OHNE ein echtes
 * Buch anzufassen. Der Text der Prüfdaten ist SRD — frei verwendbar.
 */
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

/** Ein Textabschnitt: `bold` gilt für den Teil vor dem ersten Doppelpunkt. */
export interface Block {
  /** Eigene Zeile, ganz fett — der Name eines Eintrags. */
  heading?: string;
  /** Fließtext-Absatz. `label` wird fett vorangestellt („Benefit:"). */
  label?: string;
  text?: string;
  /** Eine Tabelle über die ganze Seitenbreite (Klassentabelle). */
  table?: Table;
}

/**
 * Eine Tabelle, wie Regelwerke sie setzen: über die ganze Seitenbreite, kleinere
 * Schrift als der Fließtext, feste Spalten-x, und eine zu lange Zelle bricht
 * innerhalb ihrer Spalte um (die Spalte „Special" tut das ständig).
 */
export interface Table {
  /** Spaltenanfänge als Abstand vom linken Seitenrand. */
  columns: number[];
  /** Kopfzeilen (können mehrere sein: „Base" über „Attack Bonus"). */
  header: string[][];
  rows: string[][];
}

const MARGIN = 54;
const GUTTER = 24;
const FONT_SIZE = 9.5;
const LEADING = 11.5;
const HEAD_SIZE = 8;

export async function makeRulebookPdf(options: {
  title: string;
  blocks: Block[];
  /** Seitenhöhe klein halten, damit die Prüfdaten mehrere Seiten füllen. */
  pageSize?: [number, number];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const body = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const [pageWidth, pageHeight] = options.pageSize ?? [420, 380];
  const columnWidth = (pageWidth - 2 * MARGIN - GUTTER) / 2;

  let page: PDFPage | null = null;
  let column = 0;
  let y = 0;
  let pageNumber = 0;
  /** Oberkante der Textspalten — unter einer Tabelle liegt sie tiefer. */
  let columnTop = 0;

  const columnX = () => MARGIN + column * (columnWidth + GUTTER);
  const bottom = () => MARGIN;

  const newPage = () => {
    page = doc.addPage([pageWidth, pageHeight]);
    pageNumber++;
    // Laufende Kopfzeile — genau das, was der Konverter wegwerfen muss.
    page.drawText(`${options.title}`, {
      x: MARGIN,
      y: pageHeight - MARGIN * 0.5,
      size: HEAD_SIZE,
      font: bold,
    });
    page.drawText(`Page ${pageNumber}`, {
      x: pageWidth - MARGIN - 40,
      y: pageHeight - MARGIN * 0.5,
      size: HEAD_SIZE,
      font: body,
    });
    column = 0;
    columnTop = pageHeight - MARGIN;
    y = columnTop;
  };

  const nextColumn = () => {
    if (column === 0) {
      column = 1;
      y = columnTop;
    } else {
      newPage();
    }
  };

  const ensure = (needed: number) => {
    if (page === null) newPage();
    else if (y - needed < bottom()) nextColumn();
  };

  /** Eine Zeile aus Stücken (Schrift + Text) setzen. */
  const drawRun = (runs: { text: string; font: PDFFont }[]) => {
    ensure(LEADING);
    let x = columnX();
    for (const run of runs) {
      page!.drawText(run.text, { x, y, size: FONT_SIZE, font: run.font });
      x += run.font.widthOfTextAtSize(run.text, FONT_SIZE);
    }
    y -= LEADING;
  };

  /**
   * Tabelle setzen. Die Zellen werden WORTWEISE gezeichnet, nicht als ein Stück:
   * so entstehen dieselben vielen kleinen Textstücke wie in einem echten PDF, und
   * der Konverter muss sie tatsächlich anhand der Abstände zu Zellen bündeln.
   * Zeichnete der Prüf-PDF jede Zelle als ein Stück, wäre die Zellen-Erkennung
   * mitgetestet-aber-nicht-geprüft.
   */
  const drawTable = (table: Table) => {
    const size = FONT_SIZE * 0.78; // Tabellenschrift ist kleiner als Fließtext
    const leading = size * 1.25;
    const widthOf = (index: number) => {
      const next = table.columns[index + 1];
      const end = next === undefined ? pageWidth - MARGIN : MARGIN + next - 3;
      return end - (MARGIN + table.columns[index]!);
    };

    const drawRow = (cells: string[], font: PDFFont) => {
      // Zellen umbrechen, bevor irgendetwas gezeichnet wird — die Zeilenhöhe
      // richtet sich nach der höchsten Zelle.
      const wrapped = cells.map((cell, index) => {
        const limit = widthOf(index);
        const out: string[] = [];
        let line = "";
        for (const word of cell.split(/\s+/).filter((w) => w !== "")) {
          const candidate = line === "" ? word : `${line} ${word}`;
          if (font.widthOfTextAtSize(candidate, size) > limit && line !== "") {
            out.push(line);
            line = word;
          } else line = candidate;
        }
        if (line !== "") out.push(line);
        return out;
      });
      const height = Math.max(...wrapped.map((w) => w.length), 1) * leading;
      if (page === null || y - height < bottom()) newPage();

      wrapped.forEach((linesOfCell, index) => {
        linesOfCell.forEach((line, row) => {
          let x = MARGIN + table.columns[index]!;
          // Wortweise zeichnen, mit dem Vorschub, den die Schrift vorgibt.
          for (const word of line.split(" ")) {
            page!.drawText(word, { x, y: y - row * leading, size, font });
            x += font.widthOfTextAtSize(`${word} `, size);
          }
        });
      });
      y -= height;
    };

    // Eine Tabelle wird nie über einen Spaltenwechsel gerissen: sie steht als
    // Ganzes oben auf einer Seite, und der Text fließt darunter weiter — genau so
    // stehen Klassentabellen im Buch.
    newPage();
    for (const header of table.header) drawRow(header, bold);
    for (const row of table.rows) drawRow(row, body);
    y -= LEADING * 0.5;
    columnTop = y;
  };

  for (const block of options.blocks) {
    if (block.table !== undefined) {
      drawTable(block.table);
      continue;
    }
    if (block.heading !== undefined) {
      // Überschrift nie als letzte Zeile einer Spalte stehen lassen.
      ensure(LEADING * 3);
      drawRun([{ text: block.heading, font: bold }]);
      continue;
    }
    const words = (block.text ?? "").split(/\s+/).filter((w) => w !== "");
    let line = "";
    let labelPending = block.label;
    const flush = () => {
      if (line === "" && labelPending === undefined) return;
      const runs: { text: string; font: PDFFont }[] = [];
      if (labelPending !== undefined) {
        runs.push({ text: `${labelPending} `, font: bold });
        labelPending = undefined;
      }
      runs.push({ text: line, font: body });
      drawRun(runs);
      line = "";
    };
    for (const word of words) {
      const candidate = line === "" ? word : `${line} ${word}`;
      const prefix = labelPending === undefined ? 0 : bold.widthOfTextAtSize(`${labelPending} `, FONT_SIZE);
      if (prefix + body.widthOfTextAtSize(candidate, FONT_SIZE) > columnWidth) {
        flush();
        line = word;
      } else {
        line = candidate;
      }
    }
    flush();
    y -= LEADING * 0.35; // Absatzabstand
  }

  return await doc.save();
}
