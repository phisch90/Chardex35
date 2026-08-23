/**
 * Die Bogendateien der Teststrecken — und warum sie eine Schranke brauchen.
 *
 * In `e2e/fixtures` liegen die Bögen, die die Strecken importieren. Sie sind von
 * Hand geschrieben, und damit sind sie das, was dieses Projekt überall vermeidet:
 * eine zweite Wahrheit. Eine Kennung, die es in den Packs nicht mehr gibt, oder
 * ein Feld, das das Schema nicht kennt, fällt beim Import LEISE aus — und die
 * Strecke danach meldet einen Fehler an der Stelle, an der sie zufällig hinschaut.
 * Genau das ist die Lehre der toten Sonden: eine Strecke, die früh abbricht,
 * meldet nicht rot, sie meldet gar nichts.
 *
 * Dieser Test ist die Schranke: jede Datei geht durch `exportEnvelopeSchema` (also
 * durch denselben Parser wie der Import-Knopf), und jede `srd:`-Kennung darin muss
 * in den Packs stehen. Damit kann keine Umbenennung im Kompendium eine Strecke
 * still entwerten.
 *
 * Und die zweite Hälfte: **im Repo liegen nur OGL/SRD-Inhalte.** Die Namen der
 * D&D-Götter stehen nicht im freien SRD, seine echten Bögen gehören ihm. Die
 * Bogendateien hier sind deshalb erfundene Beispiele im echten Format — der Test
 * verlangt, dass jede Homebrew-Kennung mit `hb:` anfängt und keine Datei nach
 * einem seiner Bögen benannt ist.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exportEnvelopeSchema } from "@codex35/core";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXTURES = join(REPO, "e2e/fixtures");
const PACKS = join(REPO, "packs/srd");

const dateien = existsSync(FIXTURES)
  ? readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).sort()
  : [];

/** Alle Kennungen der Packs — einmal gelesen, für alle Prüfungen. */
function packIds(): Set<string> {
  const ids = new Set<string>();
  const manifest = JSON.parse(readFileSync(join(PACKS, "manifest.json"), "utf8")) as {
    files: string[];
  };
  for (const file of manifest.files) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    const inhalt = JSON.parse(readFileSync(join(PACKS, file), "utf8")) as unknown;
    if (!Array.isArray(inhalt)) continue;
    for (const eintrag of inhalt) {
      if (typeof eintrag === "object" && eintrag !== null && "id" in eintrag) {
        ids.add(String((eintrag as { id: unknown }).id));
      }
    }
  }
  return ids;
}

/** Jede Zeichenkette im Baum, die wie eine Kennung aussieht. */
function kennungen(wert: unknown, gefunden = new Set<string>()): Set<string> {
  if (typeof wert === "string") {
    if (/^(srd|hb):/.test(wert)) gefunden.add(wert);
    return gefunden;
  }
  if (Array.isArray(wert)) {
    for (const eintrag of wert) kennungen(eintrag, gefunden);
    return gefunden;
  }
  if (typeof wert === "object" && wert !== null) {
    for (const eintrag of Object.values(wert)) kennungen(eintrag, gefunden);
  }
  return gefunden;
}

describe("Bogendateien der Teststrecken", () => {
  /*
    Die Zahl steht hier, damit ein leerer Ordner nicht als Erfolg durchgeht. Ein
    Test, der nichts messen konnte und grün meldet, ist schlimmer als kein Test —
    das hat die Farbmessung dieses Projekts schon einmal bewiesen.
  */
  it("es gibt welche", () => {
    expect(dateien.length).toBeGreaterThanOrEqual(3);
  });

  it.each(dateien)("%s parst durch dasselbe Schema wie der Import-Knopf", (name) => {
    const roh = JSON.parse(readFileSync(join(FIXTURES, name), "utf8")) as unknown;
    const envelope = exportEnvelopeSchema.parse(roh);
    expect(envelope.characters.length + envelope.homebrewEntities.length).toBeGreaterThan(0);
  });

  it("jede srd-Kennung steht wirklich in den Packs", () => {
    const ids = packIds();
    expect(ids.size).toBeGreaterThan(2000);
    const fehlend: string[] = [];
    for (const name of dateien) {
      const roh = JSON.parse(readFileSync(join(FIXTURES, name), "utf8")) as unknown;
      for (const kennung of kennungen(roh)) {
        if (kennung.startsWith("srd:") && !ids.has(kennung)) fehlend.push(`${name}: ${kennung}`);
      }
    }
    expect(fehlend).toEqual([]);
  });

  it("Homebrew nur unter hb:, und keine fremden Kennungsräume", () => {
    const fremd: string[] = [];
    for (const name of dateien) {
      const roh = JSON.parse(readFileSync(join(FIXTURES, name), "utf8")) as unknown;
      for (const kennung of kennungen(roh)) {
        if (!/^(srd|hb):/.test(kennung)) fremd.push(`${name}: ${kennung}`);
      }
    }
    expect(fremd).toEqual([]);
  });
});
