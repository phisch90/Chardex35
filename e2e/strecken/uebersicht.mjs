/*
  Martins Uebersicht — sein Wunsch, ueber Philipp: eine Uebersicht pro Charakter.
  Wo auf einer Seite, gerne mit scrolling aber ohne Seiten Wechsel, relevante
  Infos zusammen gefasst werden.

  Entschieden: im Punkte-Menue . alles kompakt . nur lesen AUSSER den HP.

  Geprueft wird die STRECKE, die Martin geht: Charakterliste -> Punkte-Menue der
  Karte -> Uebersicht. Und vom Bogen aus derselbe Weg. Auf der Seite: alle
  Abschnitte, die HP-Aenderung (der eine Schreibweg), die Klassenfarbe, und die
  Gegenprobe, dass NICHTS sonst bedienbar ist.

  KOPFNOTIZ: keine deutschen Anfuehrungszeichen. Textpruefungen mit /i.
*/
import {
  GROESSEN,
  bild,
  bodyText,
  createReport,
  importiere,
  oeffneApp,
  ueberlauf,
} from "../lib/probe.mjs";

const bericht = createReport("uebersicht");

for (const [groesse, width, height] of GROESSEN) {
  console.log(`\n=== ${groesse} (${width}x${height})`);
  const { ctx, page, seitenfehler, dialoge } = await oeffneApp(width, height);
  await importiere(page, "domprobe");

  /* ---------- Martins Weg: von der LISTE aus, ohne den Bogen zu oeffnen ---------- */
  await page.locator("a").filter({ hasText: /Domprobe/i }).first().waitFor({ timeout: 6000 });
  /* Der Punkte-Knopf steht NEBEN dem Link — ein Knopf IM Link wuerde ihn oeffnen. */
  const kartenMenu = page
    .locator("li, div")
    .filter({ has: page.locator("a", { hasText: /Domprobe/i }) })
    .locator("button")
    .filter({ hasText: /⋯/ })
    .first();
  if ((await kartenMenu.count()) === 0) throw new Error("Punkte-Knopf an der Karte nicht gefunden");
  await kartenMenu.click();
  await page.locator('[role="dialog"]').first().waitFor({ timeout: 6000 });
  await page.waitForTimeout(400);
  const zeile = page.locator('[role="dialog"] button:visible').filter({ hasText: /Übersicht/ });
  bericht.check("die Zeile Uebersicht steht im Menue der KARTE", (await zeile.count()) > 0);
  await zeile.first().click();
  await page.waitForTimeout(1500);
  bericht.check("und fuehrt auf die Uebersichts-Adresse", /\/uebersicht$/.test(page.url()), page.url());

  /* ---------- Inhalt: alles kompakt ---------- */
  let text = await bodyText(page);
  bericht.check("Kopf: Name und Klasse/Stufe", /domprobe/i.test(text) && /cleric 6/i.test(text));
  bericht.check("der Nur-lesen-Satz steht da", /nur zum nachsehen/i.test(text));
  bericht.check("HP-Feld mit Aendern-Knopf", /hp 60\/60/i.test(text) && /± hp ändern/i.test(text));
  bericht.check("Attribute (WIS 16)", /wis/i.test(text) && /16/.test(text));
  bericht.check(
    "die zwoelf Werte-Kacheln (RK, Fortitude, BAB, Grapple)",
    /\brk\b/i.test(text) && /fortitude/i.test(text) && /\bbab\b/i.test(text) && /grapple/i.test(text),
  );
  bericht.check("Angriffe: das Langschwert mit Schaden", /langschwert/i.test(text) && /1d8/.test(text));
  bericht.check("Fertigkeiten: die erklaerte Leere", /keine ränge vergeben/i.test(text));
  bericht.check("Zauber: Slots je Grad", /grad 1/i.test(text) && /von \d+ frei/i.test(text));
  bericht.check(
    "Talente mit Herkunft (Stufe 3 aus dem Import)",
    /combat casting/i.test(text) && /stufe 3/i.test(text),
  );
  bericht.check("Angelegt: Langschwert mit 1H-Marke", /angelegt/i.test(text) && /\b1H\b/.test(text));
  bericht.check("Notizen: die erklaerte Leere", /keine notizen/i.test(text));

  /* Die Klassenfarbe: dieselbe wie am Bogen (Kleriker -> fromm). */
  const accent = await page.evaluate(() => document.documentElement.getAttribute("data-accent"));
  bericht.check("die Klassenfarbe gilt auch hier", accent === "fromm", String(accent));

  /*
    Nur lesen — die Gegenprobe: AUSSERHALB des HP-Blatts gibt es kein einziges
    Eingabefeld. Ein zweiter Schreibweg waere eine zweite Fehlerquelle.
  */
  const felder = await page.locator("main input:visible, main textarea:visible").count();
  bericht.check("kein Eingabefeld auf der Seite", felder === 0, `${felder} Felder`);

  /* ---------- Der eine Schreibweg: HP ---------- */
  await page.locator("button").filter({ hasText: /± HP ändern/i }).first().click();
  await page.locator('[role="dialog"]').first().waitFor({ timeout: 6000 });
  const pad = page.locator('[role="dialog"]').last();
  await pad.locator("button").filter({ hasText: /^5$/ }).first().click();
  await pad.locator("button").filter({ hasText: /Schaden/i }).first().click();
  await page.waitForTimeout(1200);
  await page.keyboard.press("Escape").catch(() => {});
  const schliessen = page.locator('[role="dialog"] button').filter({ hasText: /✕|×/ }).first();
  if ((await schliessen.count()) > 0) await schliessen.click().catch(() => {});
  await page.waitForTimeout(800);
  text = await bodyText(page);
  bericht.check("5 Schaden gebucht — HP 55/60 auf der Uebersicht", /hp 55\/60/i.test(text));

  /* ---------- Der Rueckweg und der Weg vom BOGEN aus ---------- */
  await page.locator("a").filter({ hasText: /Zum Bogen/i }).first().click();
  await page.waitForTimeout(1200);
  bericht.check(
    "Zum Bogen fuehrt in den Bogen",
    /\/charaktere\/[0-9a-z-]{8,}$/i.test(page.url()),
    page.url(),
  );
  await page.getByRole("button", { name: /Aktionen/i }).first().click();
  await page.locator('[role="dialog"]').first().waitFor({ timeout: 6000 });
  await page.waitForTimeout(400);
  const zeile2 = page.locator('[role="dialog"] button:visible').filter({ hasText: /Übersicht/ });
  bericht.check("die Zeile steht auch im Menue des BOGENS", (await zeile2.count()) > 0);
  await zeile2.first().click();
  await page.waitForTimeout(1200);
  bericht.check("und fuehrt ebenfalls zur Uebersicht", /\/uebersicht$/.test(page.url()), page.url());

  /* ---------- Schlussproben ---------- */
  bericht.check("kein Browser-Dialog aufgegangen", dialoge.length === 0, dialoge.join(" | "));
  bericht.check("keine Seitenfehler", seitenfehler.length === 0, seitenfehler.slice(0, 2).join(" | "));
  const ueber = await ueberlauf(page);
  bericht.check("kein seitlicher Ueberlauf", ueber <= 1, `${ueber}px`);

  await bild(page, `uebersicht-${groesse}`);
  await ctx.close();
}

bericht.done(54);
