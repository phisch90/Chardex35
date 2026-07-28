/**
 * Zeilenstrom → Einträge.
 *
 * Verlässt sich NICHT auf Schriftgrößen oder Fettschrift: welche Schrift ein
 * Verlag für Eintragsnamen nimmt, ist von Buch zu Buch anders, und pdf.js gibt
 * Fettschrift nur als undurchsichtigen Fontnamen heraus. Was dagegen in allen
 * 3.5-Büchern gleich ist, ist der AUFBAU eines Eintrags: ein Name, danach
 * beschriftete Felder („Prerequisite:", „Level:", „Casting Time:").
 *
 * Deshalb wird an den Feldnamen verankert und von dort nach oben zum Namen
 * gegangen. Das ist robust gegen Layout und übersieht im Zweifel einen Eintrag,
 * statt Fließtext für einen Namen zu halten.
 */
import type { Line } from "./pdf.js";

export interface RawEntry {
  name: string;
  /** Was in eckigen Klammern hinter dem Namen stand („General", „Fighter"). */
  bracket?: string;
  /** Beschriftete Felder in Reihenfolge; Label ohne Doppelpunkt. */
  fields: { label: string; text: string }[];
  /** Absätze ohne Feldnamen (der eigentliche Beschreibungstext). */
  body: string[];
  page: number;
}

/** „Power Attack [General]" → Name + Klammer. */
const HEADING_WITH_BRACKET = /^(.{2,70}?)\s*\[([^\]]{2,40})\]$/;

/** „Casting Time: 1 standard action" → Label + Text. */
const FIELD = /^([A-Z][A-Za-z /'-]{1,28}):\s*(.*)$/;

/**
 * Sieht die Zeile wie ein Eintragsname aus? Kurz, ohne Satzzeichen am Ende, und
 * nicht selbst ein Feld. Absichtlich streng: ein falsch erkannter Name zerreißt
 * den Eintrag davor.
 */
export function looksLikeHeading(text: string): boolean {
  if (text.length < 2 || text.length > 70) return false;
  if (FIELD.test(text)) return false;
  if (/[.,;:]$/.test(text)) return false;
  // Muss mit einem Großbuchstaben beginnen und darf keine Satz-Länge haben.
  if (!/^[A-Z0-9]/.test(text)) return false;
  return text.split(/\s+/).length <= 9;
}

export interface SegmentOptions {
  /** Feldnamen, an denen ein Eintrag erkennbar beginnt. */
  anchors: string[];
  /**
   * Zeilen, die auf dem Weg vom Anker nach oben ÜBERSPRUNGEN werden, weil sie
   * zwischen Name und Feldern stehen. Bei Zaubern ist das die Schulzeile
   * („Evocation [Fire]") — die sieht wie ein Name aus, und ohne diese Ausnahme
   * hieße der Zauber „Evocation" und Fireball wäre verloren.
   */
  skipAbove?: RegExp;
}

/** Einträge herausschneiden. */
export function segmentEntries(lines: Line[], options: SegmentOptions): RawEntry[] {
  const anchorSet = new Set(options.anchors.map((a) => a.toLowerCase()));
  const texts = lines.map((l) => l.text);
  const paragraphStart = findParagraphStarts(lines);

  // 1. Ankerzeilen finden und von dort den Namen suchen.
  const starts: { headingIndex: number; name: string; bracket?: string }[] = [];
  for (let i = 0; i < texts.length; i++) {
    const field = FIELD.exec(texts[i]!);
    if (!field || !anchorSet.has(field[1]!.toLowerCase())) continue;

    // Vom Anker nach oben: die nächste Zeile, die wie ein Name aussieht.
    let headingIndex = -1;
    for (let back = 1; back <= 5 && i - back >= 0; back++) {
      const candidate = texts[i - back]!;
      if (FIELD.test(candidate)) continue; // ein weiteres Feld — weiter hoch
      if (options.skipAbove?.test(candidate) === true) continue; // Schulzeile & Co.
      if (looksLikeHeading(candidate)) {
        headingIndex = i - back;
        break;
      }
      break; // Fließtext dazwischen: kein Name mehr zu erwarten
    }
    if (headingIndex === -1) continue;
    if (starts.some((s) => s.headingIndex === headingIndex)) continue; // zweiter Anker im selben Eintrag

    const heading = texts[headingIndex]!;
    const withBracket = HEADING_WITH_BRACKET.exec(heading);
    starts.push(
      withBracket
        ? { headingIndex, name: withBracket[1]!.trim(), bracket: withBracket[2]!.trim() }
        : { headingIndex, name: heading.trim() },
    );
  }

  // 2. Jeder Eintrag läuft bis zum Namen des nächsten.
  const out: RawEntry[] = [];
  for (let s = 0; s < starts.length; s++) {
    const start = starts[s]!;
    const end = starts[s + 1]?.headingIndex ?? texts.length;
    const entry: RawEntry = {
      name: start.name,
      ...(start.bracket === undefined ? {} : { bracket: start.bracket }),
      fields: [],
      body: [],
      page: lines[start.headingIndex]?.page ?? 0,
    };

    for (let i = start.headingIndex + 1; i < end; i++) {
      const text = texts[i]!;
      const field = FIELD.exec(text);
      if (field) {
        entry.fields.push({ label: field[1]!.trim(), text: field[2]!.trim() });
        continue;
      }
      // Fortsetzung oder neuer Absatz? Das entscheidet die Geometrie, nicht der
      // Text — siehe findParagraphStarts.
      const newParagraph = paragraphStart[i] === true;
      const lastField = entry.fields[entry.fields.length - 1];
      if (!newParagraph && entry.body.length === 0 && lastField) {
        lastField.text = `${lastField.text} ${text}`.trim();
      } else if (!newParagraph && entry.body.length > 0) {
        entry.body[entry.body.length - 1] = `${entry.body[entry.body.length - 1]} ${text}`.trim();
      } else {
        entry.body.push(text);
      }
    }
    out.push(entry);
  }
  return out;
}

/**
 * Für jede Zeile: beginnt hier ein neuer Absatz?
 *
 * Ein PDF kennt keine Leerzeilen — es kennt nur Positionen. Zwei Merkmale sind
 * dafür verlässlich, und beide sind Layout, nicht Sprache:
 *
 *  1. Die VORIGE Zeile füllt den Satzspiegel nicht aus. Innerhalb eines Absatzes
 *     reicht jede Zeile bis kurz vor den rechten Rand; die letzte Zeile eines
 *     Absatzes endet früher.
 *  2. Der Zeilenabstand ist größer als üblich (Absatzabstand).
 *
 * An einem Spalten- oder Seitenwechsel wird bewusst NICHT getrennt: dort läuft
 * ein Absatz in aller Regel weiter. Sich stattdessen an Satzzeichen zu
 * orientieren, führt in die Irre — „…than normal." steht mitten im Absatz
 * genauso wie an seinem Ende.
 */
export function findParagraphStarts(lines: Line[]): boolean[] {
  // Rechter Rand je Spalte: das weiteste rechte Ende, das dort vorkommt.
  const columnRight = new Map<string, number>();
  for (const line of lines) {
    const key = `${line.page}/${line.column}`;
    columnRight.set(key, Math.max(columnRight.get(key) ?? 0, line.right));
  }

  // Üblicher Zeilenabstand = Median der Abstände innerhalb einer Spalte.
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const previous = lines[i - 1]!;
    const line = lines[i]!;
    if (previous.page !== line.page || previous.column !== line.column) continue;
    const gap = previous.y - line.y;
    if (gap > 0) gaps.push(gap);
  }
  gaps.sort((a, b) => a - b);
  const leading = gaps[Math.floor(gaps.length / 2)] ?? 0;

  /*
    Die „kurze Zeile beendet den Absatz"-Regel gilt NUR bei Blocksatz. Bei
    flatterigem Satz endet jede Zeile irgendwo, und die Regel würde jede zweite
    Zeile zu einem neuen Absatz erklären — genau daran sind beim Prüfen vier
    Tests gescheitert. Ob ein Dokument Blocksatz hat, ist messbar: dann endet die
    große Mehrheit der Zeilen am selben rechten Rand.
  */
  const ends = lines.filter((line) => line.right > 0);
  const flush = ends.filter((line) => {
    const right = columnRight.get(`${line.page}/${line.column}`) ?? line.right;
    return right - line.right < 2;
  }).length;
  const justified = ends.length > 0 && flush / ends.length >= 0.6;

  const out: boolean[] = lines.map((_, i) => i === 0);
  for (let i = 1; i < lines.length; i++) {
    const previous = lines[i - 1]!;
    const line = lines[i]!;
    if (previous.page !== line.page || previous.column !== line.column) continue;

    const right = columnRight.get(`${previous.page}/${previous.column}`) ?? previous.right;
    const shortLine = justified && previous.right < right - (right - previous.x) * 0.12;
    const bigGap = leading > 0 && previous.y - line.y > leading * 1.2;
    out[i] = shortLine || bigGap;
  }
  return out;
}

/** Feld eines Eintrags holen (erster Treffer, Groß-/Kleinschreibung egal). */
export function field(entry: RawEntry, ...labels: string[]): string | undefined {
  const wanted = new Set(labels.map((l) => l.toLowerCase()));
  return entry.fields.find((f) => wanted.has(f.label.toLowerCase()))?.text;
}
