/**
 * Kleiner Ausdrucks-Rechner für den TP-Rechner im Bogen: `+ − × ÷` mit
 * Punkt-vor-Strich und Klammern, so wie Fight Club es anbietet.
 *
 * Bewusst KEIN `eval`/`new Function`: ein eigener Parser kann nichts anderes
 * tun als rechnen, liefert bei Unsinn einen benennbaren Fehler statt einer
 * Ausnahme, und ist ohne Browser testbar.
 */

export type ArithmeticResult =
  | { ok: true; value: number }
  | { ok: false; reason: ArithmeticError };

/** `empty` = nichts eingegeben, `syntax` = unvollständig/kaputt. */
export type ArithmeticError =
  | "empty"
  | "syntax"
  | "divide-by-zero"
  | "overflow"
  | "too-complex";

type Token =
  | { kind: "number"; value: number }
  | { kind: "op"; value: "+" | "-" | "*" | "/" }
  | { kind: "paren"; value: "(" | ")" };

/**
 * Ab hier rechnet auch der beste Parser nur noch Unsinn — und mit TP dieser
 * Größenordnung hat noch keine Runde etwas zu tun. Gilt für Literale UND
 * Zwischenwerte, sonst käme „9007199254740992+1-9007199254740992" als 0 durch.
 */
const LIMIT = Number.MAX_SAFE_INTEGER;

/**
 * Der Abstieg ist rekursiv, also braucht er eine Bremse — sonst reißt bei
 * genügend Klammern oder Vorzeichen der Aufruf-Stack, und die Funktion WIRFT
 * statt ein `{ ok: false }` zu liefern. Das nähme der Bogen als Absturz mit.
 * 64 Ebenen sind mehr, als ein TP-Betrag je braucht.
 */
const MAX_DEPTH = 64;

/** Dieselbe Bremse für die Länge: „−" tausendfach ist auch ohne Klammern tief. */
const MAX_LENGTH = 200;

/** `×`/`·` und `÷`/`:` sind Anzeigezeichen — intern gilt `*` und `/`. */
const OPERATORS: Record<string, "+" | "-" | "*" | "/"> = {
  "+": "+",
  "-": "-",
  "−": "-", // U+2212 Minus
  "–": "-", // Halbgeviertstrich, kommt aus Copy-&-Paste
  "*": "*",
  "×": "*",
  "·": "*",
  "/": "/",
  "÷": "/",
  ":": "/",
};

/** `"overflow"` statt `null`, damit eine zu große Zahl nicht als Tippfehler gilt. */
function tokenize(input: string): Token[] | "syntax" | "overflow" {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const char = input[i]!;
    if (char === " " || char === "\t") {
      i += 1;
      continue;
    }
    if (char >= "0" && char <= "9") {
      let end = i;
      while (end < input.length && input[end]! >= "0" && input[end]! <= "9") end += 1;
      // Dezimaltrenner mitlesen, damit ein eingefügter Wert nicht zerfällt.
      if ((input[end] === "." || input[end] === ",") && isDigit(input[end + 1])) {
        end += 1;
        while (end < input.length && isDigit(input[end])) end += 1;
      }
      const value = Number(input.slice(i, end).replace(",", "."));
      if (!Number.isFinite(value) || value > LIMIT) return "overflow";
      tokens.push({ kind: "number", value });
      i = end;
      continue;
    }
    const op = OPERATORS[char];
    if (op) {
      tokens.push({ kind: "op", value: op });
      i += 1;
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ kind: "paren", value: char });
      i += 1;
      continue;
    }
    return "syntax";
  }
  return tokens;
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= "0" && char <= "9";
}

/**
 * Steht an `pos` ein Faktor, der ohne Malzeichen an den vorigen anschließt?
 * Erlaubt ist „…(" (2(4+5)) und „)zahl" ((2+3)4) — aber nicht „zahl zahl".
 */
function isImplicitMultiplication(tokens: Token[], pos: number): boolean {
  const next = tokens[pos];
  if (next === undefined) return false;
  if (next.kind === "paren" && next.value === "(") return true;
  const previous = tokens[pos - 1];
  return next.kind === "number" && previous?.kind === "paren" && previous.value === ")";
}

/**
 * Rekursiver Abstieg:
 *   expr    := term (('+' | '-') term)*
 *   term    := factor (('*' | '/' | IMPLIZIT) factor)*
 *   factor  := ('+' | '-') factor | primary
 *   primary := number | '(' expr ')'
 *
 * IMPLIZIT deckt „2(4+5)", „(2)(3)" und „(2+3)4" ab — am Ziffernblock tippt
 * niemand erst das Malzeichen. Zwei Zahlen nebeneinander („2 3") bleiben ein
 * Fehler; das ist ein Tippfehler, keine Multiplikation.
 */
export function evaluateArithmetic(input: string): ArithmeticResult {
  if (input.trim() === "") return { ok: false, reason: "empty" };
  if (input.length > MAX_LENGTH) return { ok: false, reason: "too-complex" };
  const tokens = tokenize(input);
  if (typeof tokens === "string") return { ok: false, reason: tokens };
  if (tokens.length === 0) return { ok: false, reason: "empty" };

  let pos = 0;
  let depth = 0;
  let failure: ArithmeticError | null = null;

  const fail = (reason: ArithmeticError): number => {
    failure ??= reason;
    return 0;
  };

  /** Jeder Zwischenwert wird geprüft, nicht nur das Endergebnis. */
  const guard = (value: number): number => {
    if (!Number.isFinite(value) || Math.abs(value) > LIMIT) return fail("overflow");
    return value;
  };

  const peek = (): Token | undefined => tokens[pos];

  const parseExpr = (): number => {
    let value = parseTerm();
    for (;;) {
      const token = peek();
      if (failure) return value;
      if (token?.kind !== "op" || (token.value !== "+" && token.value !== "-")) return value;
      pos += 1;
      const right = parseTerm();
      if (failure) return value;
      value = guard(token.value === "+" ? value + right : value - right);
    }
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    for (;;) {
      if (failure) return value;
      const token = peek();
      let operator: "*" | "/";
      if (token?.kind === "op" && (token.value === "*" || token.value === "/")) {
        operator = token.value;
        pos += 1;
      } else if (isImplicitMultiplication(tokens, pos)) {
        operator = "*";
      } else {
        return value;
      }
      const right = parseFactor();
      if (failure) return value;
      if (operator === "/") {
        if (right === 0) return fail("divide-by-zero");
        value = guard(value / right);
      } else {
        value = guard(value * right);
      }
    }
  };

  const parseFactor = (): number => {
    if (failure) return 0;
    const token = peek();
    if (token?.kind === "op" && (token.value === "+" || token.value === "-")) {
      // Jedes Vorzeichen ist ein weiterer Rahmen auf dem Stack.
      if (depth >= MAX_DEPTH) return fail("too-complex");
      pos += 1;
      depth += 1;
      const value = parseFactor();
      depth -= 1;
      return token.value === "-" ? -value : value;
    }
    return parsePrimary();
  };

  const parsePrimary = (): number => {
    const token = peek();
    if (token === undefined) return fail("syntax");
    if (token.kind === "number") {
      pos += 1;
      return token.value;
    }
    if (token.kind === "paren" && token.value === "(") {
      // Eine Klammerebene sind vier Rahmen: primary → expr → term → factor.
      if (depth >= MAX_DEPTH) return fail("too-complex");
      pos += 1;
      depth += 1;
      const value = parseExpr();
      depth -= 1;
      if (failure) return value;
      const close = peek();
      if (close?.kind !== "paren" || close.value !== ")") return fail("syntax");
      pos += 1;
      return value;
    }
    return fail("syntax");
  };

  const value = parseExpr();
  if (failure) return { ok: false, reason: failure };
  // Rest übrig (z.B. „2)3") heißt: der Ausdruck war nicht vollständig lesbar.
  if (pos !== tokens.length) return { ok: false, reason: "syntax" };
  if (!Number.isFinite(value) || Math.abs(value) > LIMIT) {
    return { ok: false, reason: "overflow" };
  }
  return { ok: true, value };
}

/**
 * Ein TP-Betrag ist eine ganze Zahl ab 0.
 *
 * - **Bruchteile fallen weg** (3.5: „round down"), damit halber Schaden aus
 *   `÷2` stimmt: 7÷2 = 3.
 * - **Negativ wird 0**, nicht der Betrag: „6−10" ist Feuerschaden 6 gegen
 *   Feuerresistenz 10, also kein Schaden. Ein Absolutwert machte daraus 4.
 * - Vorher wird auf Rechengenauigkeit eingerastet: `61÷7×7` ergibt als
 *   Fließkommazahl 60.99999999999999 und würde sonst einen TP verschlucken.
 */
export function hpAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const nearest = Math.round(value);
  const snapped = Math.abs(value - nearest) < 1e-9 ? nearest : value;
  return Math.floor(snapped);
}
