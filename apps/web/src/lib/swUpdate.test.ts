import { describe, expect, it } from "vitest";
import { applyUpdate, type UpdateEnv, type UpdateOutcome } from "./swUpdate.js";

/**
 * „Es kommt kein Update" — die Leiter, die daraus entstanden ist.
 *
 * Der Fehler war nicht, dass die App das Update nicht ERKANNTE: `version.json`
 * liegt außerhalb des Cache, und die Marke sagte richtig „veraltet". Der Fehler war,
 * dass der Knopf daneben `window.location.reload()` rief — und der Service Worker
 * beantwortet jede Navigation aus dem Cache. Der Knopf konnte nie halten, was die
 * Marke versprach.
 *
 * Geprüft wird deshalb genau die REIHENFOLGE der Sprossen. Sie ist die ganze Logik:
 * die sanfte zuerst (nichts geht verloren), der Zwischenspeicher zuletzt.
 */

/** Ein Protokoll statt Zusicherungen auf Aufrufzahlen — die Reihenfolge zählt. */
function env(options: {
  hasServiceWorker?: boolean;
  /** Wartet von Anfang an einer? */
  waiting?: boolean;
  /** Lässt `check()` einen auftauchen? */
  appearsOnCheck?: boolean;
}): { env: UpdateEnv; log: string[] } {
  const log: string[] = [];
  let waiting = options.waiting ?? false;
  return {
    log,
    env: {
      hasServiceWorker: () => options.hasServiceWorker ?? true,
      waiting: () => waiting,
      check: async () => {
        log.push("check");
        if (options.appearsOnCheck === true) waiting = true;
      },
      takeOver: async () => void log.push("takeOver"),
      clearAndUnregister: async () => void log.push("clear"),
      reload: () => void log.push("reload"),
    },
  };
}

const run = async (options: Parameters<typeof env>[0]): Promise<[UpdateOutcome, string[]]> => {
  const { env: e, log } = env(options);
  return [await applyUpdate(e), log];
};

describe("Update holen", () => {
  it("wartet schon einer: übernehmen, sonst nichts", async () => {
    /*
      Der saubere Fall. Kein `check` (unnötiger Netzabruf) und vor allem kein
      Cache-Leeren — der neue Stand liegt ja schon fertig da.
    */
    const [outcome, log] = await run({ waiting: true });
    expect(outcome).toBe("uebernommen");
    expect(log).toEqual(["takeOver"]);
  });

  it("keiner wartet: erst nachfragen — DAS war der fehlende Schritt", async () => {
    /*
      Der Normalfall auf seinem iPhone: die App wusste aus `version.json`, dass es
      etwas Neues gibt, hatte aber nie nach dem neuen `sw.js` gefragt. Genau dieses
      `check` fehlte, und ohne es half kein Neuladen.
    */
    const [outcome, log] = await run({ appearsOnCheck: true });
    expect(outcome).toBe("nachgefragt-und-uebernommen");
    expect(log).toEqual(["check", "takeOver"]);
  });

  it("auch nach dem Nachfragen keiner: Zwischenspeicher leeren und neu laden", async () => {
    const [outcome, log] = await run({ appearsOnCheck: false });
    expect(outcome).toBe("cache-geleert");
    expect(log).toEqual(["check", "clear", "reload"]);
  });

  it("der Zwischenspeicher wird NIE vor dem Nachfragen geleert", async () => {
    /*
      Die eigentliche Zusage dieser Leiter. Zuerst zu leeren wäre einfacher zu
      schreiben und würde auch „funktionieren" — es kostete aber jedes Mal die
      Offline-Bereitschaft, für einen Fall, der meist schon eine Sprosse höher gelöst
      ist.
    */
    for (const options of [{ waiting: true }, { appearsOnCheck: true }, {}]) {
      const [, log] = await run(options);
      const clear = log.indexOf("clear");
      if (clear === -1) continue;
      expect(log.indexOf("check")).toBeLessThan(clear);
    }
  });

  it("nach dem Übernehmen wird nicht zusätzlich neu geladen", async () => {
    /*
      `takeOver` (= `updateSW(true)`) lädt selbst neu. Ein `reload` danach wäre ein
      zweites Neuladen mitten in der Übernahme — und je nach Zeitpunkt lädt es die
      alte Fassung, weil der neue Worker noch nicht übernommen hat.
    */
    for (const options of [{ waiting: true }, { appearsOnCheck: true }]) {
      const [, log] = await run(options);
      expect(log).not.toContain("reload");
    }
  });

  it("ohne Service Worker: nur neu laden, und nichts anfassen", async () => {
    // In der Entwicklung (`vite dev`) gibt es keinen — dort ist Neuladen richtig.
    const [outcome, log] = await run({ hasServiceWorker: false });
    expect(outcome).toBe("nur-neu-geladen");
    expect(log).toEqual(["reload"]);
  });

  it("keine Sprosse wird zweimal genommen", async () => {
    for (const options of [{ waiting: true }, { appearsOnCheck: true }, {}]) {
      const [, log] = await run(options);
      expect(new Set(log).size).toBe(log.length);
    }
  });
});
