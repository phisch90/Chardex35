/**
 * Stufentabellen lesen.
 *
 * Eine Klassentabelle ist der einzige Teil eines Regelwerks, der nicht als Text
 * gelesen werden darf. „+2" heißt in der Spalte „Ref Save" etwas völlig anderes
 * als in „Fort Save", und welche Spalte gemeint ist, sagt allein die POSITION.
 * Deshalb wird hier nicht mit Zeilentext gearbeitet, sondern mit den Textstücken
 * und ihren x-Werten.
 *
 * Wichtig: Tabellen laufen über die ganze Seitenbreite und dürfen NICHT durch
 * die Spaltenerkennung gehen. Eine Tabellenzeile hat links und rechts der
 * Seitenmitte Text und wenige Stücke, die die Mitte kreuzen — genau das Muster,
 * das `findColumnSplit` für zwei Spalten hält. Die Zeile „5th +3 +1 +4 +1
 * Improved uncanny dodge 3 2 0 —" würde dabei in der Mitte zerschnitten.
 */
import type { PdfPage, TextPiece } from "./pdf.js";

export interface Cell {
  text: string;
  x: number;
  right: number;
}

export interface GridRow {
  cells: Cell[];
  y: number;
  page: number;
}

/** Zwei Stücke auf derselben Grundlinie (wie in pdf.ts). */
const LINE_TOLERANCE = 2.5;

/**
 * Ab welchem Abstand zwei Stücke in verschiedene Zellen gehören. Innerhalb einer
 * Zelle stehen Wörter mit Leerzeichen-Abstand (~0,25 × Schriftgröße), zwischen
 * Zellen liegt Spaltenabstand. Der Faktor liegt bewusst deutlich über dem
 * Leerzeichen und unter dem üblichen Spaltenabstand.
 */
const CELL_GAP = 0.7;

/** Seite → Zeilen über die ganze Breite, in Zellen zerlegt. */
export function gridRows(page: PdfPage): GridRow[] {
  const rows = new Map<number, TextPiece[]>();
  for (const piece of page.pieces) {
    const key = Math.round(piece.y / LINE_TOLERANCE);
    const row = rows.get(key);
    if (row) row.push(piece);
    else rows.set(key, [piece]);
  }

  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, pieces]) => {
      pieces.sort((a, b) => a.x - b.x);
      const cells: Cell[] = [];
      let current: TextPiece[] = [];
      const flush = () => {
        if (current.length === 0) return;
        const first = current[0]!;
        const last = current[current.length - 1]!;
        cells.push({
          text: current
            .map((p) => p.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
          x: first.x,
          right: last.x + last.width,
        });
        current = [];
      };
      for (const piece of pieces) {
        const previous = current[current.length - 1];
        if (previous !== undefined) {
          const gap = piece.x - (previous.x + previous.width);
          if (gap > piece.height * CELL_GAP) flush();
        }
        current.push(piece);
      }
      flush();
      return { cells, y: pieces[0]?.y ?? 0, page: page.number };
    })
    .filter((row) => row.cells.length > 0);
}

/** „1st", „10th" → 1, 10. Sonst null. */
export function ordinal(text: string): number | null {
  const match = /^(\d{1,2})(?:st|nd|rd|th)$/i.exec(text.trim());
  return match ? parseInt(match[1]!, 10) : null;
}

/** „+3", „−1", „0" → Zahl. „—" und Leeres → null. */
export function signedNumber(text: string): number | null {
  const match = /^([+\-−–]?)(\d+)$/.exec(text.trim());
  if (!match) return null;
  const value = parseInt(match[2]!, 10);
  return match[1] === "-" || match[1] === "−" || match[1] === "–" ? -value : value;
}

/**
 * GAB-Zelle → Zahl. Ab +6 steht in der Tabelle „+6/+1", weil daraus zwei
 * Angriffe werden. Gespeichert wird der GAB selbst (die Folgeangriffe rechnet die
 * Engine aus) — also zählt die erste Zahl.
 */
export function babNumber(text: string): number | null {
  const first = text.trim().split("/")[0];
  return first === undefined ? null : signedNumber(first);
}

export interface LevelTable {
  /** Stufe → Zellen dieser Zeile (ohne die Stufen-Zelle selbst). */
  rows: Map<number, Cell[]>;
  /**
   * Spaltenmitte je Zaubergrad, falls die Tabelle „Spells per Day" hat.
   * Schlüssel ist der Grad (0 für Zaubertricks), Wert die x-Mitte der Spalte.
   */
  spellColumns: Map<number, number>;
  /** Oberkante (Kopfzeile) und Unterkante der Tabelle auf der Seite. */
  topY: number;
  bottomY: number;
  page: number;
}

/** Kopfzeilen-Wörter, die eine Klassentabelle ausweisen. */
const HEADER_WORDS = ["level", "attack", "save", "special"];

/**
 * Die Stufentabelle einer Klasse suchen.
 *
 * Erkennungsmerkmal ist nicht die Beschriftung (die heißt je Buch „Class Level"
 * oder nur „Level"), sondern die FOLGE der Stufenzeilen: 1st, 2nd, 3rd … in
 * aufsteigender Reihenfolge, jede mit GAB und drei Rettungswürfen direkt
 * dahinter. Das trifft keine Zaubertabelle und keine Ausrüstungsliste.
 */
export function findLevelTable(pages: PdfPage[]): LevelTable | null {
  for (const page of pages) {
    const grid = gridRows(page);

    // 1. Die Stufenzeilen selbst: 1st, 2nd, 3rd … in Folge.
    const levelRows: { level: number; index: number }[] = [];
    let expected = 1;
    for (const [index, row] of grid.entries()) {
      if (ordinal(row.cells[0]?.text ?? "") !== expected) continue;
      if (statCells(row.cells.slice(1)) === null) continue;
      levelRows.push({ level: expected, index });
      expected++;
    }
    if (levelRows.length < 2) continue;
    const firstRowIndex = levelRows[0]!.index;

    /*
      2. Fortsetzungszeilen anhängen. Die Spalte „Special" ist die einzige mit
      Fließtext, und sie bricht ständig um („Improved uncanny dodge, sneak attack
      +3d6" passt in keinem Buch in eine Zeile). Solche Zeilen tragen keine Stufe
      und würden sonst verlorengehen — mitten in einem Satz.

      Angehängt wird nur, was ZWISCHEN zwei Stufenzeilen steht. Nach der letzten
      Zeile beginnt der Fließtext des Kapitels, und der gehört nicht in die
      Tabelle.
    */
    const rows = new Map<number, Cell[]>();
    let bottomY = grid[firstRowIndex]?.y ?? 0;
    for (const [position, { level, index }] of levelRows.entries()) {
      const cells = [...grid[index]!.cells.slice(1)];
      const nextIndex = levelRows[position + 1]?.index ?? index + 1;
      for (let i = index + 1; i < nextIndex; i++) {
        cells.push(...grid[i]!.cells);
        bottomY = Math.min(bottomY, grid[i]!.y);
      }
      bottomY = Math.min(bottomY, grid[index]!.y);
      rows.set(level, cells);
    }

    // Kopfzeile: die nächste Zeile über der ersten Stufenzeile, die
    // Tabellen-Beschriftungen enthält. Sie liefert die Zaubergrad-Spalten.
    let topY = grid[firstRowIndex]?.y ?? 0;
    const spellColumns = new Map<number, number>();
    for (let i = firstRowIndex - 1; i >= 0 && i >= firstRowIndex - 4; i--) {
      const row = grid[i]!;
      const joined = row.cells
        .map((c) => c.text.toLowerCase())
        .join(" ")
        .replace(/\s+/g, " ");
      const isHeader = HEADER_WORDS.filter((word) => joined.includes(word)).length >= 2;
      // Die Grad-Spalten stehen als „1st 2nd 3rd 4th" (manchmal „0" für Tricks)
      // rechts in der Kopfzeile — dieselbe Zeile oder eine darüber.
      for (const cell of row.cells) {
        const level = cell.text.trim() === "0" ? 0 : ordinal(cell.text);
        if (level === null || level > 9) continue;
        spellColumns.set(level, (cell.x + cell.right) / 2);
      }
      topY = row.y;
      if (isHeader) break;
      if (spellColumns.size === 0) break; // keine Kopfzeile in Sicht
    }

    /*
      Eine einzelne „1st"-Zelle in der Kopfzeile ist keine Zaubertabelle,
      sondern die Beschriftung „1st" der Stufenspalte. Erst ab zwei Graden
      nebeneinander ist es eine Spaltengruppe.
    */
    if (spellColumns.size < 2) spellColumns.clear();

    return { rows, spellColumns, topY, bottomY, page: page.number };
  }
  return null;
}


/**
 * GAB und die drei Rettungswürfe einer Stufenzeile — die ersten VIER ZELLEN,
 * nicht die ersten vier Zahlen. Der Unterschied ist wichtig: in der Spalte
 * „Special" steht „+2 save against poison", und als „erste Zahl" gelesen wäre das
 * ein Rettungswurf. Die Spaltenfolge Base Attack Bonus / Fort / Ref / Will ist in
 * 3.5 dagegen ausnahmslos dieselbe, also darf die Position entscheiden.
 */
function statCells(cells: Cell[]): [number, number, number, number] | null {
  const bab = babNumber(cells[0]?.text ?? "");
  const fort = signedNumber(cells[1]?.text ?? "");
  const ref = signedNumber(cells[2]?.text ?? "");
  const will = signedNumber(cells[3]?.text ?? "");
  if (bab === null || fort === null || ref === null || will === null) return null;
  return [bab, fort, ref, will];
}

/**
 * Eine Stufenzeile auswerten. Die Zauberspalten hängen an ihrer x-Position, nicht
 * an der Reihenfolge — sonst würde eine leere Zelle („—" bei einem Grad, den es
 * auf dieser Stufe noch nicht gibt) alle folgenden Grade verschieben.
 */
export interface LevelRowValues {
  bab: number;
  fort: number;
  ref: number;
  will: number;
  /** Freitext der Spalte „Special". */
  special: string;
  /** Grad → Zauber pro Tag; fehlende Zellen bleiben weg (= „—"). */
  spellsPerDay: Map<number, number>;
}

export function readLevelRow(
  cells: Cell[],
  spellColumns: Map<number, number>,
): LevelRowValues | null {
  const stats = statCells(cells);
  if (stats === null) return null;

  const spellBandLeft =
    spellColumns.size === 0 ? Infinity : Math.min(...spellColumns.values()) - COLUMN_SNAP;

  const spellsPerDay = new Map<number, number>();
  const special: string[] = [];
  for (const cell of cells.slice(4)) {
    if (cell.x < spellBandLeft) {
      special.push(cell.text);
      continue;
    }
    const value = signedNumber(cell.text);
    if (value === null) continue; // „—" — dieser Grad steht auf dieser Stufe nicht zu
    const center = (cell.x + cell.right) / 2;
    let best: { level: number; distance: number } | null = null;
    for (const [level, columnCenter] of spellColumns) {
      const distance = Math.abs(center - columnCenter);
      if (best === null || distance < best.distance) best = { level, distance };
    }
    if (best !== null && best.distance <= COLUMN_SNAP) spellsPerDay.set(best.level, value);
  }

  return {
    bab: stats[0],
    fort: stats[1],
    ref: stats[2],
    will: stats[3],
    special: special.join(" ").replace(/\s+/g, " ").trim(),
    spellsPerDay,
  };
}

/**
 * Wie weit eine Zelle von der Spaltenmitte abweichen darf. Zahlen sind in
 * Tabellen zentriert oder rechts ausgerichtet, und „3" ist schmaler als „10" —
 * ein paar Punkte Abweichung sind normal, eine halbe Spaltenbreite nicht.
 */
const COLUMN_SNAP = 14;
