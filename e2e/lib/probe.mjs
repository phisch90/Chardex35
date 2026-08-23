/*
  Die gemeinsame Huelle aller Teststrecken.

  WARUM sie existiert: es gab einmal 108 Strecken, jede mit ihrer eigenen Kopie
  von check(), Browserstart, Reiterwechsel und Textlesen. Damit stand jede Falle
  108-mal da, und beim Abstellen wurde sie einmal abgestellt. Die Fallen unten
  sind alle schon einmal bezahlt worden; hier stehen sie EINMAL.

  KOPFNOTIZ, und sie gilt fuer jede Datei in diesem Ordner: keine deutschen
  Anfuehrungszeichen. Sie haben esbuild schon achtmal mit einer Meldung an der
  falschen Zeile abbrechen lassen. Backticks, wenn ein Zitat noetig ist.

  DIE FALLEN, die diese Huelle abfaengt:

  1. CSS `uppercase` veraendert `innerText`. Ein Titel mit `uppercase` liest sich
     als GRAD 0, nicht als Grad 0 — deshalb JEDE Textpruefung mit /i. `hasText`
     bekommt hier nie eine nackte Zeichenkette.
  2. `:visible` ist keine Kosmetik. Der Weiter-Balken des Assistenten und die
     untere Reiterleiste stehen ZWEIMAL im DOM (einmal schmal, einmal ab md);
     der unsichtbare steht vorn. Ein Klick darauf laeuft in einen Timeout, und
     der sieht hinterher wie ein Fehler der App aus.
  3. Eine Navigationshilfe darf nicht still scheitern. `openTab` WIRFT, wenn der
     Reiter nicht getroffen wird — sonst prueft die Strecke danach die falsche
     Seite und klagt die App an einer Stelle an, an der sie recht hat.
  4. Ein Reiter heisst am Handy anders als ab md: unten steht `Ausr.` mit einem
     Zeichen darueber, oben in der Chip-Reihe das ganze `Ausruestung`. Beide
     Formen werden probiert, und zwar die REITERLEISTE zuerst — ein Wort wie
     `Kampf` trifft sonst die Kachel NAHKAMPF oder einen Filter-Chip.
  5. Gelesen wird im Kasten, nicht im Body. Ein Ausdruck ueber den ganzen Bogen
     trifft irgendwann den eigenen Text (die Kopfzeile sagt `Stufe 7 . Human`,
     eine Warnung sagt `3.5`), und ein Blatt steht WEIT hinten im DOM.
  6. Diese App scrollt nicht das Fenster, sondern das `main` mit overflow-y-auto.
     Wer eine Hoehe messen oder die ganze Seite sehen will, nimmt `scrollMain`.
  7. `page.mouse` arbeitet in Fenster-Koordinaten und scrollt nicht mit — und
     `scrollIntoViewIfNeeded` kennt keine feste Leiste darueber. Wer zieht,
     nimmt `intoView`, das beides beruecksichtigt.
*/
import { chromium } from "playwright";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const BASE = process.env.CHARDEX_BASE ?? "http://localhost:5199";
export const E2E_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

/** Die drei Groessen, in denen geprueft wird — sein iPhone und sein iPad, beide Lagen. */
export const GROESSEN = [
  ["iphone", 390, 844],
  ["ipad-quer", 1180, 820],
  ["ipad-hoch", 820, 1180],
];

/**
 * Welcher Chromium? Erst die Umgebung, dann der vorinstallierte unter
 * /opt/pw-browsers, sonst der von Playwright selbst gefundene. Ein fest
 * verdrahteter Pfad war der Grund, warum die alten Strecken auf einer anderen
 * Maschine gar nicht erst starteten.
 */
export function chromeExecutable() {
  const fromEnv = process.env.CHROMIUM_PATH;
  if (fromEnv !== undefined && existsSync(fromEnv)) return fromEnv;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  if (existsSync(root)) {
    for (const name of readdirSync(root)) {
      if (!name.startsWith("chromium-")) continue;
      const exe = join(root, name, "chrome-linux", "chrome");
      if (existsSync(exe)) return exe;
    }
  }
  return undefined;
}

/**
 * Der Zaehler. `check` schreibt sofort mit, `done` beendet den Prozess mit 1,
 * sobald etwas fehlt — und nennt die Zahl der PRUEFUNGEN, weil eine Strecke, die
 * frueh abbricht, sonst nach Erfolg aussieht: sie meldet dann nicht `rot`,
 * sondern gar nichts.
 */
export function createReport(titel) {
  let pass = 0;
  let fail = 0;
  const problems = [];
  const check = (label, ok, detail = "") => {
    if (ok) {
      pass++;
      console.log(`    ok   ${label}`);
    } else {
      fail++;
      problems.push(`${label}${detail ? ` — ${detail}` : ""}`);
      console.log(`    FAIL ${label}${detail ? ` — ${detail}` : ""}`);
    }
  };
  const done = (mindestens = 0) => {
    console.log(`\n${titel}: ${pass} ok, ${fail} FAIL`);
    for (const p of problems) console.log(`  - ${p}`);
    if (pass + fail < mindestens) {
      console.log(`  - ZU WENIG GEPRUEFT: ${pass + fail} statt ${mindestens} — die Strecke ist unterwegs abgebrochen`);
      process.exit(1);
    }
    process.exit(fail === 0 ? 0 : 1);
  };
  return { check, done, get pass() { return pass; }, get fail() { return fail; } };
}

/**
 * Ein frischer Browser mit frischem Profil. Frisch ist Pflicht: die App legt
 * ihren Bestand in IndexedDB ab, und ein Rest aus dem Lauf davor macht jede
 * Zaehlung falsch.
 */
export async function oeffneApp(width, height) {
  const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "chardex-")), {
    executablePath: chromeExecutable(),
    viewport: { width, height },
    args: ["--no-sandbox"],
  });
  const page = await ctx.newPage();
  const seitenfehler = [];
  const dialoge = [];
  page.on("pageerror", (e) => seitenfehler.push(String(e)));
  page.on("dialog", (d) => {
    dialoge.push(d.message());
    void d.dismiss();
  });
  await page.goto(BASE, { waitUntil: "networkidle" });
  // Das Kompendium wird beim ersten Start eingespielt (1866 Gegenstaende).
  await page.waitForFunction(() => !/wird eingerichtet|lädt/i.test(document.body.innerText), null, {
    timeout: 60000,
  }).catch(() => {});
  await page.waitForTimeout(4000);
  return { ctx, page, seitenfehler, dialoge };
}

/** Eine Bogendatei aus e2e/fixtures einlesen — derselbe Weg wie sein Import-Knopf. */
export async function importiere(page, name) {
  const datei = join(E2E_DIR, "fixtures", `${name}.json`);
  if (!existsSync(datei)) throw new Error(`Bogendatei fehlt: ${datei}`);
  const feld = page.locator('input[type=file][accept*="json"]').first();
  if ((await feld.count()) === 0) throw new Error("kein Import-Feld auf der Startseite");
  await feld.setInputFiles(datei);
  await page.waitForTimeout(2500);
}

/**
 * Einen Bogen oeffnen und die Adresse PRUEFEN. `/\/charaktere\//` passt auch auf
 * `/charaktere/neu` — vier Strecken haben deshalb monatelang den Assistenten
 * fuer einen Bogen gehalten und danach Fehler an der Reiterleiste gemeldet.
 */
export async function oeffneBogen(page, muster) {
  const link = page.locator("a").filter({ hasText: muster }).first();
  if ((await link.count()) === 0) throw new Error(`kein Bogen ${muster} auf der Startseite`);
  await link.click();
  await page.waitForTimeout(2000);
  if (!/\/charaktere\/[0-9a-z-]{8,}/i.test(page.url())) {
    throw new Error(`nicht im Bogen, sondern auf ${page.url()}`);
  }
}

/**
 * Den Reiter wechseln — Leiste zuerst, dann die Chip-Reihe ab md. WIRFT, wenn
 * beides nicht trifft.
 */
export async function openTab(page, muster) {
  const inLeiste = page.locator("nav button:visible").filter({ hasText: muster });
  if (await inLeiste.count()) {
    await inLeiste.first().click();
    await page.waitForTimeout(900);
    return;
  }
  const chip = page.locator("button:visible").filter({ hasText: muster });
  if ((await chip.count()) === 0) throw new Error(`Reiter ${muster} nicht gefunden`);
  await chip.first().click();
  await page.waitForTimeout(900);
}

/** Der Text des Bogens. */
export const bodyText = (page) => page.locator("body").innerText();

/** Der Text des offenen Blatts — es steht WEIT hinten im DOM, nie in den ersten Zeichen. */
export async function blattText(page) {
  const blatt = page.locator('[role="dialog"]');
  if ((await blatt.count()) === 0) throw new Error("kein offenes Blatt");
  return blatt.first().innerText();
}

/** Der Kasten, der wirklich scrollt. `window.scrollY` ist in dieser App immer 0. */
export const scrollMain = (page, top) =>
  page.evaluate((y) => {
    const main = document.querySelector("main");
    if (main === null) throw new Error("kein main");
    if (y !== undefined) main.scrollTop = y;
    return { top: main.scrollTop, hoehe: main.scrollHeight, sichtbar: main.clientHeight };
  }, top);

/**
 * Ein Element in Sicht bringen, OHNE dass eine feste Leiste darueber liegt —
 * die Voraussetzung fuer alles mit `page.mouse`.
 */
export async function intoView(locator, page) {
  await locator.scrollIntoViewIfNeeded();
  const kasten = await locator.boundingBox();
  if (kasten === null) throw new Error("Element hat keine Flaeche");
  const hoehe = page.viewportSize()?.height ?? 0;
  // Die rote Bearbeiten-Leiste und die Reiterleiste sitzen unten; 7rem Luft.
  if (kasten.y + kasten.height > hoehe - 112) {
    await scrollMain(page, (await scrollMain(page)).top + (kasten.y + kasten.height - (hoehe - 112)));
    await page.waitForTimeout(250);
  }
  const neu = await locator.boundingBox();
  if (neu === null) throw new Error("Element nach dem Scrollen ohne Flaeche");
  return neu;
}

/** Kein seitlicher Ueberlauf — der Body dieser App darf nie waagerecht scrollen. */
export const ueberlauf = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/**
 * Das INNERSTE Treffer-li. Mit Verschachtelung (Behaelter mit Inhalt, eine
 * Warnung als eigenes li) trifft `.first()` den falschen Kasten — und die
 * Pruefung danach klagt die App an.
 */
export async function innerstesLi(page, muster) {
  const treffer = page.locator("li").filter({ hasText: muster });
  const n = await treffer.count();
  if (n === 0) throw new Error(`kein li mit ${muster}`);
  for (let i = 0; i < n; i++) {
    const kandidat = treffer.nth(i);
    if ((await kandidat.locator("li").filter({ hasText: muster }).count()) === 0) return kandidat;
  }
  return treffer.first();
}

/**
 * Den Bearbeiten-Modus schalten. Er wohnt hinter den drei Punkten, und die rote
 * Leiste unten IST der Ausgang — erkannt am Stift, weil die Beschriftung
 * wechselt (`Bearbeiten` / `Fertig`) und `fertig` in `Fertigkeiten` steckt.
 * WIRFT, wenn sich der Zustand nicht herstellen laesst; drei Strecken haben
 * monatelang Fehler gemeldet, weil diese Hilfe still scheiterte.
 */
export async function setzeBearbeiten(page, an) {
  const ausgang = () => page.locator("nav button:visible").filter({ hasText: /✎/ }).first();
  if (((await ausgang().count()) > 0) === an) return;
  await page.getByRole("button", { name: /Aktionen/i }).first().click();
  await page.locator('[role="dialog"]').first().waitFor({ timeout: 6000 });
  await page.waitForTimeout(400);
  const zeile = page.locator('[role="dialog"] button:visible').filter({ hasText: /Bearbeiten/ }).first();
  if ((await zeile.count()) === 0) throw new Error("Bearbeiten-Zeile nicht im Blatt");
  await zeile.click();
  await page.waitForTimeout(900);
  if (((await ausgang().count()) > 0) !== an) {
    throw new Error(`Bearbeiten liess sich nicht auf ${an} stellen`);
  }
}

/**
 * Die TALENT-Zeile, nicht die Warnzeile. Ein IssueCard ist selbst ein `li` und
 * traegt denselben Talentnamen — erkannt wird die echte Zeile am fett gesetzten
 * Namen.
 */
export const featZeile = (page, muster) =>
  page
    .locator("li")
    .filter({ hasText: muster })
    .filter({ has: page.locator("span.font-medium") })
    .first();

/** Ein Bild nach e2e/.out — der Ordner ist gitignored, Bilder gehoeren nicht ins Repo. */
export async function bild(page, name) {
  const ziel = join(E2E_DIR, ".out");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(ziel, { recursive: true });
  await page.screenshot({ path: join(ziel, `${name}.png`) });
}
