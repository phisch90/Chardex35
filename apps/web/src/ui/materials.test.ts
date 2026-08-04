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

describe("Ruhige Flächen, kräftige Rahmen", () => {
  /*
    Seine Ansage: „Farben bitte deutlich dezenter im Hintergründe. Aber die Rahmen und den
    Kopf Teil so lassen." Das sind ZWEI Forderungen in einem Satz, und sie zeigen in
    verschiedene Richtungen — genau deshalb steht das hier als Zahl und nicht als Absicht
    in einem Kommentar. Eine Aufräumrunde, die „alle Farbwerte angleichen" will, hätte
    sonst die Hälfte seines Auftrags rückgängig gemacht, ohne dass etwas kaputtgeht.
  */
  const zahl = (name: string): number[] =>
    [...CSS.matchAll(new RegExp(`${name}:\\s*([0-9.]+)`, "g"))].map(([, v]) => Number(v));

  it("die Kartentönung ist leise", () => {
    // Die Karten sind die größte Fläche des Bogens — getönt schlucken sie die Ruhe.
    const werte = zahl("--karte-a");
    expect(werte.length, "--karte-a steht im Stylesheet").toBeGreaterThan(0);
    for (const v of werte) expect(v, `--karte-a: ${v}`).toBeLessThanOrEqual(0.12);
  });

  it("der Anstrich ist nach einem Viertel vorbei", () => {
    /*
      Was ihn dezent macht, ist nicht ein kleinerer Wert, sondern ein kürzerer WEG: als
      Gradient von oben bleibt er am KOPF stehen (den soll er behalten) und läuft in der
      Fläche früh aus. Ein blindes Absenken von `--wash-a` hätte den Kopf mit entfärbt.
    */
    const reach = zahl("--wash-reach");
    expect(reach.length, "--wash-reach steht im Stylesheet").toBeGreaterThan(0);
    for (const v of reach) expect(v, `--wash-reach: ${v}%`).toBeLessThanOrEqual(35);
    // Und der Gradient muss die Variable auch BENUTZEN, sonst ist sie Zierde.
    expect(CSS).toMatch(/var\(--wash-reach\)/);
    // Am Kopf bleibt die Kraft: hier wird nicht heruntergedreht, sondern verkürzt.
    for (const v of zahl("--wash-a")) expect(v, `--wash-a: ${v}`).toBeGreaterThanOrEqual(0.28);
  });

  it("der Rahmen bleibt kräftig", () => {
    // „Aber die Rahmen … so lassen." Die andere Hälfte seines Satzes.
    const werte = zahl("--rahmen-a");
    expect(werte.length, "--rahmen-a steht im Stylesheet").toBeGreaterThan(0);
    for (const v of werte) expect(v, `--rahmen-a: ${v}`).toBeGreaterThanOrEqual(0.8);
  });
});

describe("Der Hauptschalter für die Klassenfarbe", () => {
  /*
    Sein Auftrag: „Stelle ein, das Man die Klassen Farbe auch abschalten kann."

    Der Schalter ist ein einzelnes `boolean` — was daran schiefgehen kann, liegt trotzdem
    an drei Stellen: der Standardwert, der Rückfall für ein Gerät, auf dem das Feld noch
    gar nicht liegt, und die Frage, OB die Oberfläche ihn überhaupt liest.
  */
  it("steht standardmäßig AN", () => {
    // Die Klassenfarben sind der Stand, den er gerade abgenommen hat. Wer sie nicht will,
    // schaltet sie ab — nicht umgekehrt.
    expect(DEFAULT_APP_SETTINGS.classAccent).toBe(true);
  });

  it("ein fehlendes Feld bedeutet AN, nicht aus", () => {
    /*
      Das ist die wichtigste Prüfung hier. Auf seinem iPhone liegen die Einstellungen ohne
      dieses Feld; fiele es auf `false` zurück, wären die Klassenfarben nach dem Update
      spurlos weg — und er würde einen Fehler suchen, wo eine Voreinstellung stand.
    */
    expect(parseAppSettings({}).classAccent).toBe(true);
    expect(parseAppSettings({ material: "kladde" }).classAccent).toBe(true);
    // Ein Unsinnswert genauso: lieber der abgenommene Stand als ein farbloser Bogen.
    expect(parseAppSettings({ classAccent: "nein" }).classAccent).toBe(true);
  });

  it("ein ausdrückliches Aus bleibt aus", () => {
    // Die Gegenprobe zum Rückfall: sonst wäre der Schalter ein Knopf ohne Wirkung.
    expect(parseAppSettings({ classAccent: false }).classAccent).toBe(false);
  });

  it("der Bogen entscheidet an EINER Stelle, und der Schalter steht in den Abhängigkeiten", () => {
    /*
      Zwei Fehler wären hier möglich, und beide sähen aus wie ein kaputter Schalter:

      - jede der drei Schichten (Rahmen, Anstrich, Kartentönung) prüft den Schalter selbst.
        Dann fällt beim nächsten Umbau eine davon durch. Deshalb entscheidet EINE Stelle,
        ob `data-accent` überhaupt gesetzt wird — fällt es weg, fallen alle drei mit.
      - der Schalter fehlt in der Abhängigkeitsliste des Effekts. Dann wirkt er erst beim
        nächsten Öffnen des Bogens, und in den Einstellungen tut der Umschalter scheinbar
        nichts. Genau die Familie „etwas weiß es, und etwas anderes kann es nicht".
    */
    const sheet = readFileSync(join(SRC, "pages/sheet/index.tsx"), "utf8");
    expect(sheet).toContain("!classAccent");
    expect(sheet).toContain("}, [character, classAccent]);");
    // Und der Schalter muss aus den Einstellungen kommen, nicht aus einem eigenen Speicher.
    expect(sheet).toMatch(/const \{[^}]*classAccent[^}]*\} = useAppSettings\(\)/);
  });

  it("die Einstellungen haben einen Umschalter dafür", () => {
    const settings = readFileSync(join(SRC, "pages/SettingsPage.tsx"), "utf8");
    expect(settings).toContain("appSettings.classAccent");
    expect(settings).toMatch(/label="Klassenfarbe im Bogen"/);
  });

  it("die Versionsmarke steht in den Einstellungen, aber nicht mehr auf der Startseite", () => {
    /*
      Sein Auftrag war „Bogen Version löschen" — gemeint war die kleine Marke über der
      Charakterliste. In den Einstellungen BLEIBT sie, und das ist kein Übersehen: sie ist
      das einzige ehrliche Zeichen dafür, ob sein GERÄT einen neuen Stand hat (ein grüner
      Deploy sagt nur, dass er auf dem Server liegt). Wer sie ganz entfernt, nimmt der App
      die Antwort auf „Es kommt kein Update".
    */
    const liste = readFileSync(join(SRC, "pages/CharacterList.tsx"), "utf8");
    expect(liste).not.toContain("VersionBadge");
    const settings = readFileSync(join(SRC, "pages/SettingsPage.tsx"), "utf8");
    expect(settings).toContain("VersionBadge");
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
    expect(bits).toContain('className={`karte relative rounded-xl');
    expect(bits).toContain('className="abschnitt ');
  });

  it("werden vom Stylesheet benutzt", () => {
    expect(CSS).toMatch(/\[data-material="[a-zA-Z]+"\] \.karte/);
    expect(CSS).toMatch(/\[data-material="[a-zA-Z]+"\] \.abschnitt/);
  });

  it("der Rahmen ist kräftig — zwei Pixel, nicht einer", () => {
    /*
      Sein Auftrag: „Einen kräftigen Rahmen um alles." Ein Pixel verschwindet auf einem
      Handy mit dreifacher Auflösung fast; das hier hält die zwei fest, damit sie nicht bei
      der nächsten Aufräumrunde als „unnötig" wieder auf einen fallen.
    */
    const bits = readFileSync(join(SRC, "ui/bits.tsx"), "utf8");
    expect(bits).toContain("border-2");
    expect(CSS).toMatch(/\[data-accent\] \.karte \{\s*border-color:/);
    expect(CSS).toMatch(/\[data-accent\] \.blatt \{/);
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
