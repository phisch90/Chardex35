import { describe, expect, it } from "vitest";
import { evaluateArithmetic, hpAmount } from "./arithmetic.js";
import { pressKey } from "./keypad.js";

/** Tastenfolge am Ziffernblock durchspielen. */
function type(...keys: string[]): string {
  return keys.reduce((input, key) => pressKey(input, key), "");
}

/** Was der Bogen aus der Tastenfolge als TP-Betrag bekäme. */
function amount(...keys: string[]): number | string {
  const result = evaluateArithmetic(type(...keys));
  return result.ok ? hpAmount(result.value) : result.reason;
}

describe("pressKey", () => {
  it("reiht Ziffern und Operatoren", () => {
    expect(type("1", "2", "+", "3")).toBe("12+3");
    expect(amount("1", "2", "+", "3")).toBe(15);
  });

  it("ersetzt einen Operator statt ihn anzuhängen", () => {
    expect(type("8", "+", "×")).toBe("8×");
    expect(type("8", "+", "×", "÷", "2")).toBe("8÷2");
    expect(amount("8", "+", "×", "÷", "2")).toBe(4);
  });

  it(`lässt „−" nach einem Operator als Vorzeichen stehen`, () => {
    // „2×−3" ist ein gültiger Ausdruck; ohne diese Regel wäre er nicht tippbar.
    expect(type("2", "×", "−", "3")).toBe("2×−3");
    expect(amount("2", "×", "−", "3")).toBe(0); // −6 → kein Effekt
    expect(type("1", "0", "−", "−", "3")).toBe("10−−3");
    expect(amount("1", "0", "−", "−", "3")).toBe(13);
    // Aber nicht beliebig stapeln: ein weiterer Druck korrigiert beide Zeichen
    // zu dem einen, das gedrückt wurde.
    expect(type("2", "×", "−", "−")).toBe("2−");
    expect(type("2", "×", "−", "÷")).toBe("2÷");
    expect(type("(", "−", "−")).toBe("(−");
  });

  it("erlaubt am Anfang nur ein Vorzeichen", () => {
    expect(type("×")).toBe("");
    expect(type("÷")).toBe("");
    expect(type("+")).toBe("");
    expect(type("−")).toBe("−");
    expect(type("−", "5")).toBe("−5");
  });

  it("kippt ein Vorzeichen nie in ein Rechenzeichen", () => {
    // Früher ersetzte der Druck das Vorzeichen und hinterließ einen Ausdruck,
    // der mit einem Rechenzeichen beginnt („−" → „×", „(−" → „(×").
    expect(type("−", "×")).toBe("−");
    expect(type("−", "+")).toBe("−");
    expect(type("−", "−")).toBe("−");
    expect(type("(", "−", "×")).toBe("(−");
    expect(type("(", "−", "÷")).toBe("(−");
    expect(type("2", "×", "(", "−", "+")).toBe("2×(−");
    // Und ein Rechenzeichen hinter einem Vorzeichen ersetzt beide, statt zu
    // stapeln: „2×−" + „×" ist „2×", nicht „2××".
    expect(type("2", "×", "−", "×")).toBe("2×");
    expect(type("1", "0", "−", "−", "×")).toBe("10×");
  });

  it("hält jeden erreichbaren Zustand frei von Rechenzeichen-Ketten", () => {
    // Deterministischer Zufallslauf über die Tasten (fester Startwert, damit ein
    // Fehlschlag reproduzierbar ist): kein Zustand darf mit einem Rechenzeichen
    // beginnen, zwei davon hintereinander tragen oder direkt hinter „(" eines
    // haben. Ein Vorzeichen („−") ist erlaubt, ein Rechenzeichen nicht.
    // Geprüft wird in reinem JS und erst am Ende behauptet — 100.000 einzelne
    // expect-Aufrufe blockieren die Suite minutenlang.
    const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "(", ")", "÷", "×", "−", "+"];
    let seed = 20260726;
    const nextKey = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return KEYS[seed % KEYS.length]!;
    };
    const bad: string[] = [];
    const seen = new Set<string>();
    for (let run = 0; run < 2000; run++) {
      let input = "";
      for (let step = 0; step < 12; step++) {
        const key = nextKey();
        const next = pressKey(input, key);
        seen.add(next);
        if (
          /^[÷×+]/.test(next) ||
          /[÷×+−][÷×+]/.test(next) ||
          /\([÷×+]/.test(next) ||
          next.length > 40
        ) {
          bad.push(`"${input}" + "${key}" → "${next}"`);
        }
        input = next;
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(seen.size).toBeGreaterThan(400);
  });

  it(`erlaubt nach „(" nur ein Vorzeichen`, () => {
    expect(type("(", "×")).toBe("(");
    expect(type("(", "−", "4", ")")).toBe("(−4)");
    expect(amount("(", "−", "4", ")")).toBe(0);
  });

  it("schließt Klammern nur, wenn eine offen ist", () => {
    expect(type(")")).toBe("");
    expect(type("5", ")")).toBe("5");
    expect(type("(", "5", ")")).toBe("(5)");
    // Nicht direkt nach einem Operator schließen.
    expect(type("(", "5", "+", ")")).toBe("(5+");
  });

  it("schreibt kein Malzeichen in den Ausdruck — das ergänzt der Rechner", () => {
    expect(type("2", "(", "4", "+", "5", ")")).toBe("2(4+5)");
    expect(amount("2", "(", "4", "+", "5", ")")).toBe(18);
    expect(type("(", "2", ")", "(", "3", ")")).toBe("(2)(3)");
    expect(amount("(", "2", ")", "(", "3", ")")).toBe(6);
    // Ziffer nach „)" ebenso — früher lief das direkt in einen Fehlerzustand.
    expect(amount("(", "2", "+", "3", ")", "4")).toBe(20);
  });

  it("bleibt bei einem selbst getippten Malzeichen nach dem Rückschritt erhalten", () => {
    // Der Rückschritt der UI löscht immer genau ein Zeichen; hier gegengeprüft,
    // dass „2×(" minus ein Zeichen „2×" ist und nicht „2" — sonst würde aus
    // einem gemeinten „2×3" still die Zahl 23.
    const typed = type("2", "×", "(");
    expect(typed).toBe("2×(");
    expect(typed.slice(0, -1)).toBe("2×");
    expect(amount("2", "×", "3")).toBe(6);
  });

  it("deckelt die Länge, damit der Rechner nicht in die Tiefe läuft", () => {
    let input = "";
    for (let i = 0; i < 100; i++) input = pressKey(input, "(");
    expect(input.length).toBe(40);
    // Und der Rechner liefert dafür einen Fehler, keine Ausnahme.
    expect(evaluateArithmetic(input).ok).toBe(false);
  });

  it("Tisch-Beispiele", () => {
    expect(amount("1", "5", "÷", "2")).toBe(7); // halber Schaden
    expect(amount("2", "(", "4", "+", "5", ")")).toBe(18); // doppelter Schaden
    expect(amount("6", "−", "1", "0")).toBe(0); // Feuerschaden gegen Resistenz 10
    expect(amount("8", "÷", "0")).toBe("divide-by-zero");
    expect(amount("5", "+")).toBe("syntax");
  });
});
