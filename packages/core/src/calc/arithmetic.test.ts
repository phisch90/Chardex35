import { describe, expect, it } from "vitest";
import { evaluateArithmetic, hpAmount } from "./arithmetic.js";

/** Kurzform: rechnet und liefert die Zahl, oder wirft mit dem Fehlergrund. */
function value(input: string): number {
  const result = evaluateArithmetic(input);
  if (!result.ok) throw new Error(`unerwartet ungültig (${result.reason}): ${input}`);
  return result.value;
}

function reason(input: string): string {
  const result = evaluateArithmetic(input);
  if (result.ok) throw new Error(`unerwartet gültig (${result.value}): ${input}`);
  return result.reason;
}

describe("evaluateArithmetic", () => {
  it("rechnet einzelne Zahlen", () => {
    expect(value("0")).toBe(0);
    expect(value("7")).toBe(7);
    expect(value("62")).toBe(62);
    expect(value("  12  ")).toBe(12);
  });

  it("rechnet Strich von links nach rechts", () => {
    expect(value("2+3")).toBe(5);
    expect(value("10-3")).toBe(7);
    expect(value("10-3-4")).toBe(3); // nicht 11
    expect(value("1+2+3+4")).toBe(10);
  });

  it("hält Punkt vor Strich ein", () => {
    expect(value("2+3×4")).toBe(14);
    expect(value("2×3+4")).toBe(10);
    expect(value("20-2×5")).toBe(10);
    expect(value("12÷4+1")).toBe(4);
    expect(value("1+12÷4")).toBe(4);
  });

  it("rechnet Punkt von links nach rechts", () => {
    expect(value("100÷5÷2")).toBe(10); // nicht 40
    expect(value("2×3×4")).toBe(24);
  });

  it("ergänzt das Malzeichen, wo am Ziffernblock keins getippt wird", () => {
    expect(value("2(4+5)")).toBe(18);
    expect(value("(2)(3)")).toBe(6);
    expect(value("(2+3)4")).toBe(20);
    expect(value("2(3)(4)")).toBe(24);
    // Punkt vor Strich gilt auch für das implizite Malzeichen.
    expect(value("1+2(3+4)")).toBe(15);
    // Zwei Zahlen nebeneinander bleiben ein Tippfehler, keine Multiplikation.
    expect(reason("2 3")).toBe("syntax");
  });

  it("respektiert Klammern, auch verschachtelt", () => {
    expect(value("(2+3)×4")).toBe(20);
    expect(value("2×(3+4)")).toBe(14);
    expect(value("((1+2)×(3+4))")).toBe(21);
    expect(value("(10-(2+3))×2")).toBe(10);
  });

  it("versteht Vorzeichen vor Zahl, Klammer und Operator", () => {
    expect(value("-5")).toBe(-5);
    expect(value("2×-3")).toBe(-6);
    expect(value("(-4)")).toBe(-4);
    expect(value("-(2+3)")).toBe(-5);
    expect(value("--3")).toBe(3);
    expect(value("+7")).toBe(7);
    expect(value("10--3")).toBe(13);
  });

  it("akzeptiert die Anzeigezeichen des Ziffernblocks", () => {
    // × ÷ − sind die Zeichen auf den Tasten, * / - die getippte Variante.
    expect(value("6×7")).toBe(value("6*7"));
    expect(value("84÷2")).toBe(value("84/2"));
    expect(value("9−4")).toBe(value("9-4"));
    expect(value("8:2")).toBe(4);
  });

  it("liest Dezimalwerte mit Punkt und Komma", () => {
    expect(value("3.5")).toBe(3.5);
    expect(value("3,5×2")).toBe(7);
  });

  it("meldet leere Eingabe getrennt von Syntaxfehlern", () => {
    expect(reason("")).toBe("empty");
    expect(reason("   ")).toBe("empty");
  });

  it("meldet unvollständige Ausdrücke als Syntaxfehler", () => {
    for (const bad of ["2+", "2×", "÷2", "×2", "()", "(2+3", "2+3)", "2)3", "(", ")", "2 3", "+"]) {
      expect(reason(bad), bad).toBe("syntax");
    }
  });

  it("weist unbekannte Zeichen ab — hier wird nur gerechnet", () => {
    for (const bad of ["2d6", "alert(1)", "2^3", "0x10", "1e5", "2%3", "$"]) {
      expect(reason(bad), bad).toBe("syntax");
    }
  });

  it("meldet Teilung durch Null statt Unendlich zu liefern", () => {
    expect(reason("5÷0")).toBe("divide-by-zero");
    expect(reason("5÷(3-3)")).toBe("divide-by-zero");
    expect(reason("0÷0")).toBe("divide-by-zero");
    // Auch tief in einem größeren Ausdruck.
    expect(reason("1+2×(8÷0)")).toBe("divide-by-zero");
  });

  it("meldet Überlauf statt eine unsinnige Zahl zu liefern", () => {
    const huge = "9".repeat(20);
    expect(reason(huge)).toBe("overflow");
    expect(reason(`${huge}×${huge}`)).toBe("overflow");
    // Auch weit jenseits der sicheren Ganzzahlen bleibt es „zu groß", nicht
    // „kaputt" — früher fiel das in den Pfad für unbekannte Zeichen.
    expect(reason("9".repeat(150))).toBe("overflow");
    expect(reason(`1+${"9".repeat(150)}`)).toBe("overflow");
    // Noch längere Eingaben fängt vorher die Längenbremse ab (200 Zeichen).
    expect(reason("9".repeat(309))).toBe("too-complex");
  });

  it("prüft ZWISCHENwerte, nicht nur das Ergebnis", () => {
    // Ohne Prüfung der Zwischenwerte käme hier ok:true mit 0 heraus.
    expect(reason("9007199254740992+1-9007199254740992")).toBe("overflow");
    expect(reason("99999999×99999999÷99999999")).toBe("overflow");
    // Ein einzelnes Literal an der Grenze bleibt gültig.
    expect(value(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("bleibt bei tiefer Klammerung stehen, ohne zu hängen", () => {
    const deep = `${"(".repeat(60)}1${")".repeat(60)}`;
    expect(value(deep)).toBe(1);
    // Fehlende schließende Klammer bleibt ein Syntaxfehler, kein Absturz.
    expect(reason("(".repeat(60) + "1")).toBe("syntax");
  });

  it("LIEFERT einen Fehler statt zu werfen, wenn es zu tief wird", () => {
    // Der Abstieg ist rekursiv: ohne Bremse reißt hier der Aufruf-Stack, und
    // ein RangeError verlässt die Funktion — der Bogen nähme das als Absturz.
    for (const bad of [
      `${"(".repeat(20000)}1${")".repeat(20000)}`,
      "(".repeat(20000) + "1",
      "-".repeat(11000) + "1",
      "(".repeat(70) + "1" + ")".repeat(70),
      "-".repeat(70) + "1",
    ]) {
      const result = evaluateArithmetic(bad);
      expect(result.ok, bad.slice(0, 12)).toBe(false);
      if (!result.ok) expect(["too-complex", "syntax"]).toContain(result.reason);
    }
  });
});

describe("hpAmount", () => {
  it("macht aus dem Ergebnis einen TP-Betrag ab 0", () => {
    expect(hpAmount(7)).toBe(7);
    expect(hpAmount(0)).toBe(0);
  });

  it("lässt Bruchteile weg — halber Schaden rundet ab", () => {
    expect(hpAmount(3.5)).toBe(3); // 7 ÷ 2
    expect(hpAmount(0.9)).toBe(0);
    expect(hpAmount(13 / 3)).toBe(4);
  });

  it("macht aus Schaden unter der Resistenz KEINEN Schaden", () => {
    // „6−10" ist Feuerschaden 6 gegen Feuerresistenz 10 — also 0, nicht 4.
    expect(hpAmount(value("6−10"))).toBe(0);
    expect(hpAmount(-7)).toBe(0);
    expect(hpAmount(-0.5)).toBe(0);
  });

  it("verschluckt keinen TP wegen Fließkomma-Rest", () => {
    // 61÷7×7 ergibt als Double 60.99999999999999.
    expect(hpAmount(value("61÷7×7"))).toBe(61);
    expect(hpAmount(value("1÷3×5×9"))).toBe(15);
    expect(hpAmount(value("3÷11×55"))).toBe(15);
    expect(hpAmount(value("1÷49×49"))).toBe(1);
    // Echte Bruchteile fallen weiterhin weg.
    expect(hpAmount(value("7÷2"))).toBe(3);
    expect(hpAmount(value("15÷2"))).toBe(7);
  });
});
