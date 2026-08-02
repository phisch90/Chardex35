import { describe, expect, it } from "vitest";
import { dyingStatus, STABILIZE_DC } from "./dying.js";

/**
 * Martins Regel in Zahlen. Der Prüfstein ist CON 14 (+2), weil daran die beiden
 * Grenzen weit auseinanderliegen: Probenzone bis −2, tot erst bei −14. Wer
 * Modifikator und Wert verwechselt, tötet die Figur zwölf Punkte zu früh — und genau
 * das fängt dieser Test.
 */
const con14 = { conScore: 14, conMod: 2, deathAt: "negCon" as const, stabilized: false };

describe("Sterben — drei Zonen bis zum negativen CON-Wert", () => {
  it("Über 0 ist alles in Ordnung", () => {
    expect(dyingStatus({ ...con14, current: 1 }).state).toBe("ok");
    expect(dyingStatus({ ...con14, current: 40 }).state).toBe("ok");
  });

  it("0 bis −2: Probenzone (die 0 gehört dazu)", () => {
    for (const current of [0, -1, -2]) {
      expect(dyingStatus({ ...con14, current }).state, `bei ${current}`).toBe("saveZone");
    }
  });

  it("−3 bis −13: blutend, keine Probe mehr", () => {
    for (const current of [-3, -7, -13]) {
      expect(dyingStatus({ ...con14, current }).state, `bei ${current}`).toBe("bleeding");
    }
  });

  it("−14 ist der Tod — nicht −2", () => {
    expect(dyingStatus({ ...con14, current: -14 }).state).toBe("dead");
    expect(dyingStatus({ ...con14, current: -20 }).state).toBe("dead");
    // Die Gegenprobe zur häufigsten Verwechslung:
    expect(dyingStatus({ ...con14, current: -2 }).state).not.toBe("dead");
  });

  it("Die Grenzen kommen als ZAHLEN mit — die Oberfläche soll nicht nachrechnen", () => {
    const status = dyingStatus({ ...con14, current: -5 });
    expect(status.deadAt).toBe(-14);
    expect(status.saveZoneDownTo).toBe(-2);
  });

  it("Eine gelungene Probe stoppt den Verlust, auch tief unten", () => {
    expect(dyingStatus({ ...con14, current: -9, stabilized: true }).state).toBe("stable");
    // Aber sie hält den Tod nicht auf: unter der Grenze ist unter der Grenze.
    expect(dyingStatus({ ...con14, current: -14, stabilized: true }).state).toBe("dead");
  });

  it("Ohne CON-Bonus gibt es keine Probenzone", () => {
    /*
      CON 10 (+0) oder schlechter: „minus CON Mod" wäre 0 oder positiv, die Zone hätte
      keine Ausdehnung — oder ginge sogar nach OBEN. Dann liegt unter 0 sofort die
      blutende Zone, und `saveZoneDownTo` sagt ausdrücklich „gibt es nicht".
    */
    const con10 = { conScore: 10, conMod: 0, deathAt: "negCon" as const, stabilized: false };
    expect(dyingStatus({ ...con10, current: 0 }).state).toBe("bleeding");
    expect(dyingStatus({ ...con10, current: 0 }).saveZoneDownTo).toBeUndefined();

    const con8 = { conScore: 8, conMod: -1, deathAt: "negCon" as const, stabilized: false };
    expect(dyingStatus({ ...con8, current: -1 }).state).toBe("bleeding");
    expect(dyingStatus({ ...con8, current: -8 }).state).toBe("dead");
    expect(dyingStatus({ ...con8, current: -8 }).saveZoneDownTo).toBeUndefined();
  });

  it("Die Regel des Buches bleibt wählbar: Tod bei −10", () => {
    const raw = { ...con14, deathAt: "minus10" as const };
    expect(dyingStatus({ ...raw, current: -10 }).state).toBe("dead");
    expect(dyingStatus({ ...raw, current: -9 }).state).toBe("bleeding");
    expect(dyingStatus({ ...raw, current: -9 }).deadAt).toBe(-10);
  });

  it("Bei einer zähen Figur liegt der Tod TIEFER als im Buch", () => {
    // CON 20 (+5): Probe bis −5, tot erst bei −20. Nach RAW wäre sie bei −10 tot.
    const con20 = { conScore: 20, conMod: 5, deathAt: "negCon" as const, stabilized: false };
    expect(dyingStatus({ ...con20, current: -5 }).state).toBe("saveZone");
    expect(dyingStatus({ ...con20, current: -12 }).state).toBe("bleeding");
    expect(dyingStatus({ ...con20, current: -20 }).state).toBe("dead");
  });

  it("Der Schwierigkeitsgrad steht an EINER Stelle", () => {
    // „Fort Save DC 10" — als Konstante, damit Text und Regel nicht auseinanderlaufen.
    expect(STABILIZE_DC).toBe(10);
  });
});
