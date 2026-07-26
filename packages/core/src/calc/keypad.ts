/**
 * Eingabe-Grammatik des TP-Ziffernblocks. Gehört zum Rechner, nicht zur
 * Oberfläche: der Parser ist streng, und hier wird abgefangen, was am
 * Ziffernblock offensichtlich gemeint ist. So ist beides an einer Stelle
 * getestet, ohne Browser.
 */

/** Anzeigezeichen der Operator-Tasten, in der Reihenfolge des Ziffernblocks. */
export const HP_PAD_OPERATORS = ["÷", "×", "−", "+"] as const;

const isOperator = (char: string | undefined): boolean =>
  char !== undefined && (HP_PAD_OPERATORS as readonly string[]).includes(char);

/** Kein TP-Betrag braucht mehr; deckelt zugleich die Verschachtelungstiefe. */
const MAX_INPUT = 40;

/**
 * Tastendruck auf den bisherigen Ausdruck anwenden. Der Rechner selbst ist
 * streng; die Eingabe fängt hier ab, was am Ziffernblock offensichtlich gemeint
 * ist. Ein zurückgegebener unveränderter Ausdruck heißt „diese Taste geht
 * hier nicht" — die UI sperrt sie daraufhin, statt den Tap stumm zu verschlucken.
 *
 * „2(4+5)" bleibt bewusst so stehen, wie es getippt wurde: das Malzeichen
 * ergänzt der Rechner selbst. Würde die Eingabe ein sichtbares `×` einfügen,
 * müsste der Rückschritt zwei Zeichen auf einmal löschen — und der dann nicht
 * mehr unterscheidbare Fall „selbst getipptes ×(" machte aus „2×3" still „23".
 */
export function pressKey(input: string, key: string): string {
  if (input.length >= MAX_INPUT) return input;
  const last = input.slice(-1);
  const open = (input.match(/\(/g) ?? []).length - (input.match(/\)/g) ?? []).length;

  if (key === "(") return `${input}(`;
  if (key === ")") {
    if (open <= 0) return input;
    if (!/\d/.test(last) && last !== ")") return input;
    return `${input})`;
  }
  if (isOperator(key)) {
    /*
      Entscheidend ist, was VOR den Rechenzeichen am Ende steht — nicht das
      letzte Zeichen allein. Sonst ersetzt ein Druck auf „×" das Vorzeichen in
      „(−" und hinterlässt „(×", also einen Ausdruck, der mit einem
      Rechenzeichen beginnt.
    */
    const stem = input.replace(/[÷×−+]+$/, "");
    const stemLast = stem.slice(-1);
    /** Steht vor den Rechenzeichen ein Wert, an den sie anknüpfen können? */
    const afterValue = /\d/.test(stemLast) || stemLast === ")";
    /** Wie viele Rechenzeichen hängen dahinter (0, 1 = Zeichen, 2 = + Vorzeichen). */
    const trailing = input.length - stem.length;

    // Ohne Wert davor (Anfang oder direkt nach „(") trägt die Stelle nur ein
    // Vorzeichen — und zwar genau eines.
    if (!afterValue) return key === "−" ? `${stem}−` : input;

    // Mit Wert davor: erstes Zeichen anhängen, weitere ersetzen. Ein „−" hinter
    // einem Rechenzeichen ist dabei ein Vorzeichen („2×−3"), keine Korrektur —
    // sonst wären negative Operanden über den Ziffernblock nicht eingebbar.
    if (trailing === 0) return input + key;
    if (trailing === 1 && key === "−") return input + key;
    return stem + key;
  }
  return input + key;
}
