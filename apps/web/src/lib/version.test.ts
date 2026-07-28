import { describe, expect, it } from "vitest";
import { compareVersions, formatBuildTime, versionLabel } from "./version.js";

/**
 * Die Anzeige darf nichts behaupten, was sie nicht weiß. Ohne Antwort vom Server
 * (offline, am Spieltisch der Normalfall) steht „unbekannt" — nicht „aktuell".
 * Ein grüner Haken ohne Prüfung wäre schlimmer als gar keine Anzeige.
 */
const running = { commit: "abc1234", builtAt: "2026-07-27T21:41:00.000Z" };

describe("compareVersions", () => {
  it(`sagt „unbekannt", solange nichts vom Server kam`, () => {
    expect(compareVersions(running, null).kind).toBe("unbekannt");
  });

  it(`sagt „aktuell" bei gleichem Commit, auch wenn die Bauzeit abweicht`, () => {
    // Zwei Builds desselben Stands sind derselbe Stand.
    const deployed = { commit: "abc1234", builtAt: "2026-07-28T09:00:00.000Z" };
    expect(compareVersions(running, deployed).kind).toBe("aktuell");
  });

  it(`sagt „veraltet" und nennt den Stand, der auf dem Server liegt`, () => {
    const deployed = { commit: "def5678", builtAt: "2026-07-28T09:00:00.000Z" };
    const state = compareVersions(running, deployed);
    expect(state.kind).toBe("veraltet");
    if (state.kind === "veraltet") expect(state.deployed.commit).toBe("def5678");
  });
});

describe("Anzeige", () => {
  it(`macht aus dem Zeitstempel eine lesbare Zeit`, () => {
    expect(formatBuildTime("2026-07-27T21:41:00.000Z")).toMatch(/27\.07\.2026/);
  });

  it(`verträgt einen fehlenden oder kaputten Zeitstempel`, () => {
    expect(formatBuildTime("")).toBe("");
    expect(formatBuildTime("irgendwas")).toBe("");
    // Dann steht wenigstens der Commit da, statt „abc1234 · Invalid Date".
    expect(versionLabel({ commit: "abc1234", builtAt: "irgendwas" })).toBe("abc1234");
  });
});
