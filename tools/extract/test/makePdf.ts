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
    y = pageHeight - MARGIN;
  };

  const nextColumn = () => {
    if (column === 0) {
      column = 1;
      y = pageHeight - MARGIN;
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

  for (const block of options.blocks) {
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
