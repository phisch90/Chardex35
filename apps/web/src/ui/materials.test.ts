/**
 * Ein Papier steht an DREI Stellen, und keine kann die andere lesen:
 *
 *   `db/appSettings.ts`  der Schlüssel (das, was gespeichert wird)
 *   `ui/materials.ts`    der Name und der Hinweis
 *   `styles.css`         das Aussehen
 *
 * Das ist Absicht — CSS kann keine TypeScript-Liste lesen, und eine zur Laufzeit gebaute
 * Klasse würde Tailwind beim Durchsuchen des Quelltexts nie finden. Aber drei Stellen sind
 * drei Gelegenheiten, eine zu vergessen, und das Ergebnis wäre die Fehlerfamilie „etwas
 * weiß es, und etwas anderes kann es nicht": ein Knopf in den Einstellungen, der ein
 * Papier verspricht, das es im Stylesheet nicht gibt.
 *
 * Deshalb liest dieser Test das Stylesheet und vergleicht.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MATERIALS, DEFAULT_APP_SETTINGS, parseAppSettings } from "../db/appSettings.js";
import { LIGHT_MATERIALS, MATERIAL_HINTS, MATERIAL_LABELS } from "./materials.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSS = readFileSync(join(SRC, "styles.css"), "utf8");

describe("Die Papiere", () => {
  it("sind vier", () => {
    expect(MATERIALS).toEqual(["codex", "nachtbogen", "kopierterBogen", "kladde"]);
  });

  it("haben alle einen Namen und einen Hinweis", () => {
    for (const key of MATERIALS) {
      expect(MATERIAL_LABELS[key], key).toBeTruthy();
      expect(MATERIAL_HINTS[key], key).toBeTruthy();
    }
  });

  it("jedes hat einen Block im Stylesheet — außer dem Grundzustand", () => {
    /*
      „codex" ist der Grundzustand und hat ABSICHTLICH keinen Block: das Attribut wird für
      ihn entfernt statt gesetzt (`ui/Layout.tsx`). Ein Attribut, auf das keine Regel
      zeigt, wäre eine Einladung, es doch zu benutzen.
    */
    for (const key of MATERIALS) {
      const vorhanden = CSS.includes(`[data-material="${key}"]`);
      expect(vorhanden, key).toBe(key !== "codex");
    }
  });

  it("jedes helle Papier steht in der gemeinsamen Faltung", () => {
    /*
      Die Faltung (dunkle Stufen werden Tinte, helle werden Papier) steht EINMAL für alle
      hellen Papiere. Wer eines dazunimmt und die Auswahlliste dort vergisst, bekommt ein
      helles Papier mit den dunklen Bedeutungsfarben — rosa Warnschrift auf Creme.
    */
    const block = CSS.slice(CSS.indexOf("--fold-l50"));
    const kopf = CSS.slice(0, CSS.indexOf("--fold-l50"));
    const auswahl = kopf.slice(kopf.lastIndexOf("}") + 1);
    expect(block.length, "Faltungs-Block gefunden").toBeGreaterThan(0);
    for (const key of LIGHT_MATERIALS) {
      expect(auswahl, `${key} fehlt in der Auswahlliste der Faltung`).toContain(
        `[data-material="${key}"]`,
      );
    }
  });

  it("jedes helle Papier setzt color-scheme und eine Serifenschrift", () => {
    /*
      Nicht das ERSTE Vorkommen nehmen: die gemeinsame Faltung endet mit
      `[data-material="kladde"] {`, und dort steht keine Schrift. Ein `indexOf` traf
      deshalb den falschen Block und meldete die App als kaputt, obwohl die Schrift
      längst dastand — dieselbe Sorte Fehler wie ein geratenes `.last()`.
      Geprüft wird also über ALLE Blöcke dieses Papiers.
    */
    for (const key of LIGHT_MATERIALS) {
      const bloecke = [
        ...CSS.matchAll(new RegExp(`\\[data-material="${key}"\\][^{]*\\{([^}]*)\\}`, "g")),
      ].map(([, inhalt]) => inhalt ?? "");
      expect(bloecke.length, key).toBeGreaterThan(0);
      expect(
        bloecke.some((b) => /--font-sans:[^;]*serif/.test(b)),
        `${key} braucht eine Serifenschrift`,
      ).toBe(true);
    }
    // `color-scheme: light` steht einmal in der gemeinsamen Auswahl, nicht je Papier.
    expect(CSS).toContain("color-scheme: light");
  });

  it("jedes helle Papier ist auch ein Papier", () => {
    for (const key of LIGHT_MATERIALS) {
      expect(MATERIALS as readonly string[], key).toContain(key);
    }
  });

  it("dunkle Papiere falten nicht", () => {
    // Der Nachtbogen ist dunkel: er darf `color-scheme` nicht auf hell stellen.
    const i = CSS.indexOf('[data-material="nachtbogen"] {');
    const block = CSS.slice(i, CSS.indexOf("\n}", i));
    expect(block).not.toContain("color-scheme: light");
    expect(block).not.toContain("--fold-l");
  });

  it("ein unbekannter gespeicherter Wert fällt auf das heutige Aussehen zurück", () => {
    // Auf seinem Gerät kann ein Papier liegen, das es nicht mehr gibt — dann darf die App
    // nicht farblos dastehen.
    expect(parseAppSettings({ material: "papyrus" }).material).toBe(DEFAULT_APP_SETTINGS.material);
    expect(parseAppSettings({ material: "kladde" }).material).toBe("kladde");
  });
});

describe("Die Griffe, an denen ein Papier anfassen darf", () => {
  /*
    `karte` und `abschnitt` sind keine Tailwind-Klassen, sondern Griffe für die Papiere.
    Verschwindet einer aus dem Bauteil, verliert jedes Papier still seine Kästen bzw. die
    Linie unter der Überschrift — und niemand merkt es, weil nichts kaputtgeht.
  */
  it("stehen im Bauteil", () => {
    const bits = readFileSync(join(SRC, "ui/bits.tsx"), "utf8");
    expect(bits).toContain('className={`karte rounded-xl');
    expect(bits).toContain('className="abschnitt ');
  });

  it("werden vom Stylesheet benutzt", () => {
    expect(CSS).toMatch(/\[data-material="[a-zA-Z]+"\] \.karte/);
    expect(CSS).toMatch(/\[data-material="[a-zA-Z]+"\] \.abschnitt/);
  });

  it("das Papier fasst an einem Griff weder Farbe noch Ecken an", () => {
    /*
      Die wichtigste Regel dieser Runde, und sie hat zwei Gründe:
      - die FARBE gehört der Kampagne (`Card` gibt sie über `tone` mit). Eine
        `background`-Regel am Griff hätte (0,2,0) und die Kampagnenfarbe der Startseite
        überschrieben — dieselbe Falle wie damals, nur von der anderen Seite.
      - die ECKEN gehören der Klasse. Das war die Bedingung, unter der vier Papiere ×
        elf Klassen tragbar sind: sonst wären es 44 Entwürfe.
    */
    for (const griff of [".karte", ".abschnitt"]) {
      const regeln = [...CSS.matchAll(new RegExp(`\\[data-material="[a-zA-Z]+"\\] \\${griff} \\{([^}]*)\\}`, "g"))];
      expect(regeln.length, griff).toBeGreaterThan(0);
      for (const [, inhalt] of regeln) {
        expect(inhalt, `${griff} darf keine Farbe setzen`).not.toMatch(
          /(background-color|background:|border-color|color:)/,
        );
        expect(inhalt, `${griff} darf keine Ecken setzen`).not.toMatch(/border-radius/);
      }
    }
  });
});
