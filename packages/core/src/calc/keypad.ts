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
  const beforeLast = input.slice(-2, -1);
  const open = (input.match(/\(/g) ?? []).length - (input.match(/\)/g) ?? []).length;

  if (key === "(") return `${input}(`;
  if (key === ")") {
    if (open <= 0) return input;
    if (!/\d/.test(last) && last !== ")") return input;
    return `${input})`;
  }
  if (isOperator(key)) {
    // Am Anfang und direkt nach „(" trägt nur ein Vorzeichen — und zwar genau
    // eines. Ein zweiter Druck ersetzt es, statt „−−" zu stapeln.
    const atStart = input === "" || last === "(" || (isOperator(last) && input.length === 1);
    if (atStart) {
      if (key !== "−") return input;
      return isOperator(last) ? `${input.slice(0, -1)}−` : `${input}−`;
    }
    // Ein „−" hinter einem echten Rechenzeichen ist ein Vorzeichen („2×−3"),
    // keine Korrektur — sonst wären negative Operanden nicht eingebbar. „Echt"
    // heißt: davor steht ein Wert, nicht schon ein Vorzeichen.
    if (key === "−" && isOperator(last) && (/\d/.test(beforeLast) || beforeLast === ")")) {
      return input + key;
    }
    if (isOperator(last)) return input.slice(0, -1) + key;
    return input + key;
  }
  return input + key;
}
