/**
 * Ein Buch-PDF vollständig einlesen — in der Reihenfolge, die sich als die
 * einzig funktionierende erwiesen hat:
 *
 *   1. Seiten lesen
 *   2. laufende Kopf-/Fußzeilen weg (sonst zählen sie als Text, der die Mitte
 *      kreuzt, und sprechen gegen Spalten, die es gibt)
 *   3. TABELLEN finden und ihre Textstücke herausnehmen
 *   4. erst jetzt Spalten erkennen und Zeilen bauen
 *
 * Schritt 3 muss vor Schritt 4 kommen. Eine Klassentabelle läuft über die ganze
 * Seitenbreite; solange ihre Zellen noch da sind, sieht die Seite einspaltig aus,
 * und der Text UNTER der Tabelle — der sehr wohl zweispaltig ist — wird
 * zeilenweise durcheinandergemischt. Umgekehrt ist die Tabelle selbst auf
 * Zeilenebene unlesbar, sie wird ohnehin aus den Stücken gelesen.
 */
import { piecesToLines, readPdfPages, stripRunningHeadPieces, type Line, type PdfPage } from "./pdf.js";
import { findLevelTable, type LevelTable } from "./table.js";

export interface Rulebook {
  /** Seiten ohne Kopf-/Fußzeilen, mit allen Stücken (auch den Tabellen). */
  pages: PdfPage[];
  /** Zeilen in Leserichtung, ohne die Tabellen. */
  lines: Line[];
  /** Gefundene Stufentabellen, eine je Seite. */
  tables: LevelTable[];
}

export async function readRulebook(path: string): Promise<Rulebook> {
  return fromPages(stripRunningHeadPieces(await readPdfPages(path)));
}

/** Derselbe Weg ohne Datei — damit er prüfbar ist. */
export function fromPages(pages: PdfPage[]): Rulebook {
  const tables: LevelTable[] = [];
  for (const page of pages) {
    const table = findLevelTable([page]);
    if (table !== null) tables.push(table);
  }

  const forText = pages.map((page) => {
    const table = tables.find((t) => t.page === page.number);
    if (table === undefined) return page;
    return {
      ...page,
      pieces: page.pieces.filter((piece) => piece.y > table.topY || piece.y < table.bottomY),
    };
  });

  return { pages, lines: forText.flatMap((page) => piecesToLines(page)), tables };
}
