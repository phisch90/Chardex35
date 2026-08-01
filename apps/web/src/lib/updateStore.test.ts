import { describe, expect, it } from "vitest";
import { updateBarVisible, updateState } from "./updateStore.js";
import { RUNNING } from "./version.js";

/**
 * Was die Leiste zeigt — und wann sie NICHT wiederkommt.
 *
 * Zwei Meldewege laufen hier zusammen: der Service Worker („es liegt schon einer
 * bereit") und `version.json` („auf dem Server steht etwas anderes"). Vorher kannten
 * sie sich nicht, der eine kam auf dem iPhone nie und der andere konnte nichts
 * bewirken — sein Satz dazu war „Es kommt kein Update".
 *
 * Der heikle Teil ist das Wegtippen. Ein `boolean` dafür wäre derselbe Fehler wie ein
 * „passt so" ohne Menge: einmal weggetippt, und er sähe NIE wieder eine neue Fassung.
 */
const gleich = { commit: RUNNING.commit, builtAt: RUNNING.builtAt };
const anders = { commit: "abc1234", builtAt: "2026-08-01T22:00:00.000Z" };
const nochAnders = { commit: "def5678", builtAt: "2026-08-02T09:00:00.000Z" };

describe("Update-Leiste", () => {
  it("nichts bekannt: keine Leiste", () => {
    expect(updateState({ swWaiting: false, deployed: null })).toEqual({ kind: "keins" });
    expect(updateBarVisible({ swWaiting: false, deployed: null, dismissedFor: null })).toBe(false);
  });

  it("derselbe Stand auf dem Server: keine Leiste", () => {
    expect(updateState({ swWaiting: false, deployed: gleich })).toEqual({ kind: "keins" });
  });

  it("anderer Stand auf dem Server: Leiste mit der Nummer", () => {
    expect(updateState({ swWaiting: false, deployed: anders })).toEqual({
      kind: "server",
      commit: "abc1234",
    });
    expect(updateBarVisible({ swWaiting: false, deployed: anders, dismissedFor: null })).toBe(true);
  });

  it("„bereit“ gewinnt über „server“", () => {
    /*
      Es ist derselbe neue Stand, nur schon heruntergeladen — und dann genügt ein
      Tap, ohne den Zwischenspeicher anzufassen. Die gröbere Auskunft zu zeigen wäre
      hier schlechter, nicht ehrlicher.
    */
    expect(updateState({ swWaiting: true, deployed: anders })).toEqual({ kind: "bereit" });
    expect(updateState({ swWaiting: true, deployed: null })).toEqual({ kind: "bereit" });
  });

  it("weggetippt bleibt weg — aber nur DIESE Fassung", () => {
    const dismissed = { swWaiting: false, deployed: anders, dismissedFor: "abc1234" };
    expect(updateBarVisible(dismissed)).toBe(false);
    // Eine NEUE Fassung holt die Leiste zurück.
    expect(updateBarVisible({ ...dismissed, deployed: nochAnders })).toBe(true);
  });

  it("weggetippt, und dann liegt sie fertig bereit: Leiste kommt zurück", () => {
    /*
      Anderer Zustand, anderer Schlüssel. Sonst hätte ein weggetipptes „es gibt eine
      neue Fassung" auch das spätere „sie liegt bereit" mitverschluckt — und das ist
      genau der Tap, der ohne Cache-Leeren auskommt.
    */
    expect(updateBarVisible({ swWaiting: true, deployed: anders, dismissedFor: "abc1234" })).toBe(
      true,
    );
  });

  it("„bereit“ weggetippt bleibt weg", () => {
    expect(updateBarVisible({ swWaiting: true, deployed: null, dismissedFor: "bereit" })).toBe(
      false,
    );
  });
});
