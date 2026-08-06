import { beforeEach, describe, expect, it, vi } from "vitest";
import { describeSaveError, reportSaveFailure, useSaveErrorStore } from "./saveError.js";

/*
  Die Meldung selbst ist die halbe Sache; die andere Hälfte ist der WEG ZURÜCK.

  Bei der PWA hat diese App genau daran einmal einen Monat verloren: die Marke
  wusste, dass ein neuer Stand da ist, und der Knopf daneben konnte nichts
  ausrichten. Deshalb prüft diese Strecke nicht nur den Satz, sondern dass ein
  zweiter Versuch wirklich denselben Schreibvorgang startet — und dass er nach
  einem Fehlschlag NICHT verschwindet.
*/
describe("describeSaveError", () => {
  it("nennt den vollen Gerätespeicher beim Namen, ohne Fachjargon", () => {
    const error = new Error("The quota has been exceeded.");
    error.name = "QuotaExceededError";
    const satz = describeSaveError(error);
    expect(satz).toMatch(/speicher des geräts ist voll/i);
    // Kein Fachjargon in Texten für ihn — „Quota" gehört in die Konsole.
    expect(satz).not.toMatch(/quota/i);
  });

  it("erkennt eine geschlossene Datenbank und sagt, was hilft", () => {
    const error = new Error("DatabaseClosedError");
    error.name = "DatabaseClosedError";
    expect(describeSaveError(error)).toMatch(/schließ sie einmal ganz/i);
  });

  it("gibt sonst die Meldung des Fehlers weiter statt zu schweigen", () => {
    expect(describeSaveError(new Error("ConstraintError: key exists"))).toBe(
      "ConstraintError: key exists",
    );
  });

  it("hat auch für etwas, das kein Fehlerobjekt ist, einen Satz", () => {
    expect(describeSaveError(undefined)).toMatch(/unbekannter grund/i);
  });
});

describe("die Leiste weiß, was schiefging — und kann etwas dagegen tun", () => {
  beforeEach(() => {
    useSaveErrorStore.getState().dismiss();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("meldet mit Name und Satz und schreibt weiter in die Konsole", () => {
    const error = new Error("kaputt");
    reportSaveFailure("Hike", error, () => Promise.resolve());
    const failure = useSaveErrorStore.getState().failure;
    expect(failure?.what).toBe("Hike");
    expect(failure?.why).toBe("kaputt");
    // Die Konsole bleibt die Stelle mit dem Stapel — dort sucht man den Fehler.
    expect(console.error).toHaveBeenCalled();
  });

  it("ein geglückter zweiter Versuch räumt die Meldung weg und sagt es", async () => {
    const write = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    reportSaveFailure("Hike", new Error("kaputt"), write);
    await useSaveErrorStore.getState().retry();
    expect(write).toHaveBeenCalledTimes(1);
    expect(useSaveErrorStore.getState().failure).toBeNull();
    expect(useSaveErrorStore.getState().fixed).toBe(true);
  });

  it("ein zweiter Fehlschlag lässt die Meldung STEHEN, mit dem neuen Grund", async () => {
    const write = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(Object.assign(new Error("voll"), { name: "QuotaExceededError" }));
    reportSaveFailure("Hike", new Error("kaputt"), write);
    await useSaveErrorStore.getState().retry();
    const failure = useSaveErrorStore.getState().failure;
    expect(failure).not.toBeNull();
    expect(failure?.why).toMatch(/speicher des geräts ist voll/i);
    expect(useSaveErrorStore.getState().fixed).toBe(false);
  });

  it("ein zweiter Tap während des Versuchs schreibt nicht doppelt", async () => {
    let loesen: (() => void) | undefined;
    const write = vi
      .fn<() => Promise<void>>()
      .mockReturnValue(new Promise<void>((resolve) => (loesen = resolve)));
    reportSaveFailure("Hike", new Error("kaputt"), write);
    const erster = useSaveErrorStore.getState().retry();
    await useSaveErrorStore.getState().retry(); // läuft ins Leere, weil `busy`
    loesen?.();
    await erster;
    expect(write).toHaveBeenCalledTimes(1);
  });
});
