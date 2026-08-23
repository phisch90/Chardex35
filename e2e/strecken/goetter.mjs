/*
  Goetter im Kompendium + die Herkunft am Talent — seine zwei Auftraege einer Runde:

  1. Ich moechte auch gerne die Goetter mit reinbringen, sodass wir die Domains
     des clerics korrekt verwenden koennen. — eigener Kompendium-Bereich (seine
     Wahl), Gottheit am Bogen waehlbar, Domaenen der Gottheit markiert, fremde
     nur GEWARNT.
  2. Die Talente sollen die Info zeigen woher sie kommen. — Herkunfts-Marke am
     Talent, im Bearbeiten-Modus nachtragbar. Der feste Weapon Focus der
     War-Domaene kommt als Hinweis MIT Knopf (seine Wahl) und traegt beim
     Eintragen seine Quelle mit.

  Die Gottheit hier heisst Testgottheit, und das ist Absicht: die Namen der
  D&D-Goetter stehen nicht im freien SRD und gehoeren deshalb nicht ins Repo. Die
  App liefert das FACH, sein Tisch legt seine Goetter selbst an — genau diesen Weg
  laeuft die Strecke ab.

  KOPFNOTIZ: keine deutschen Anfuehrungszeichen. Textpruefungen mit /i.
*/
import {
  BASE,
  GROESSEN,
  bild,
  bodyText,
  createReport,
  featZeile,
  importiere,
  oeffneApp,
  oeffneBogen,
  openTab,
  setzeBearbeiten,
  ueberlauf,
} from "../lib/probe.mjs";

const bericht = createReport("goetter");
const GOTT = "Testgottheit";

for (const [groesse, width, height] of GROESSEN) {
  console.log(`\n=== ${groesse} (${width}x${height})`);
  const { ctx, page, seitenfehler, dialoge } = await oeffneApp(width, height);

  /* ---------- 1. Kompendium: Bereich Goetter, leer mit Erklaerung ---------- */
  await page.goto(`${BASE}/kompendium/deity`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  let text = await bodyText(page);
  bericht.check("der Bereich Goetter existiert", /götter/i.test(text));
  bericht.check(
    "die Leere ist ERKLAERT, kein nacktes Nichts-gefunden",
    /liefert keine götter mit/i.test(text),
  );
  bericht.check("kein Nichts-gefunden neben der Erklaerung", !/nichts gefunden/i.test(text));

  /* ---------- 2. Eigene Gottheit anlegen ---------- */
  await page.locator("button:visible").filter({ hasText: /Eigene Gottheit/i }).first().click();
  await page.locator('[role="dialog"]').first().waitFor({ timeout: 6000 });
  const blatt = page.locator('[role="dialog"]');

  /* Gesperrt MIT Grund, solange Name und Domaene fehlen — die Gegenprobe zuerst. */
  bericht.check(
    "Anlegen ist anfangs gesperrt und nennt den Grund",
    /fehlt noch/i.test(await blatt.innerText()),
  );
  await blatt.locator('input[placeholder*="Schmied"]').fill(GOTT);
  bericht.check(
    "ohne Domaene bleibt es gesperrt (Grund: Domaene)",
    /mindestens eine domäne/i.test(await blatt.innerText()),
  );

  /* Exakt gematcht: War steckt in Warterei. */
  await blatt.locator("button").filter({ hasText: /^War$/ }).first().click();
  await blatt.locator("button").filter({ hasText: /^Strength$/ }).first().click();
  bericht.check("die Zaehlung nennt 2 gewaehlt", /2 gewählt/i.test(await blatt.innerText()));

  await blatt.locator('input[placeholder*="Suche"], input[type="search"]').last().fill("longsword");
  await page.waitForTimeout(600);
  const treffer = blatt.locator("ul button").filter({ hasText: /Langschwert|Longsword/i });
  if ((await treffer.count()) === 0) throw new Error("Waffensuche fand kein Langschwert");
  await treffer.first().click();
  await page.waitForTimeout(400);
  bericht.check("die gewaehlte Waffe steht im Formular", /langschwert/i.test(await blatt.innerText()));

  await blatt.locator("button").filter({ hasText: /^Anlegen$/ }).first().click();
  await page.waitForTimeout(1200);
  text = await bodyText(page);
  bericht.check("die Gottheit steht in der Liste", new RegExp(GOTT, "i").test(text));
  bericht.check("mit Domaenenzahl und Lieblingswaffe", /2 domänen · langschwert/i.test(text));

  /* ---------- 3. Detailseite ---------- */
  await page.locator("a").filter({ hasText: new RegExp(GOTT, "i") }).first().click();
  await page.waitForTimeout(1200);
  text = await bodyText(page);
  bericht.check(
    "das Detail nennt die Lieblingswaffe",
    /lieblingswaffe/i.test(text) && /langschwert/i.test(text),
  );
  bericht.check("die Domaenen stehen als Marken da", /war/i.test(text) && /strength/i.test(text));
  bericht.check(
    "Bearbeiten steht bereit (Homebrew)",
    (await page.locator("button:visible").filter({ hasText: /^Bearbeiten$/i }).count()) > 0,
  );

  /* ---------- 4. Bogen: Gottheit waehlen, War-Hinweis, Eintragen ---------- */
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await importiere(page, "domprobe");
  await oeffneBogen(page, /Domprobe/i);

  await openTab(page, /Zauber/i);
  text = await bodyText(page);
  bericht.check("ohne Wahl: Gottheit keine gewaehlt", /gottheit:\s*keine gewählt/i.test(text));
  bericht.check("ohne Gottheit KEINE Fremd-Domaenen-Warnung", !/bietet .* nicht an/i.test(text));
  bericht.check("ohne Gottheit kein War-Hinweis", !/war-domäne gewährt/i.test(text));

  await setzeBearbeiten(page, true);
  await page.locator("button:visible").filter({ hasText: new RegExp(GOTT, "i") }).first().click();
  await page.waitForTimeout(1200);
  text = await bodyText(page);
  bericht.check(
    "die Gottheit steht am Bogen, mit Lieblingswaffe",
    new RegExp(`gottheit:\\s*${GOTT}`, "i").test(text) && /lieblingswaffe: langschwert/i.test(text),
  );

  /*
    Die Markierung im Auswaehler: die War-Domaene traegt die Marke der Gottheit.
    Gelesen wird in der ZEILE, nicht im Body — der Name steht inzwischen mehrfach
    auf der Seite.
  */
  const warZeile = page.locator("li").filter({ hasText: /^War\b/ }).first();
  bericht.check(
    "War traegt die Marke der Gottheit",
    new RegExp(GOTT, "i").test(await warZeile.innerText().catch(() => "")),
  );
  bericht.check("die fremde Domaene wird GEMELDET", /bietet healing nicht an/i.test(text));
  bericht.check("und sie bleibt trotzdem am Bogen (warnen statt sperren)", /healing/i.test(text));

  bericht.check(
    "der War-Hinweis steht da",
    /war-domäne gewährt dir weapon focus \(langschwert\)/i.test(text),
  );
  const eintragen = page.locator("button:visible").filter({ hasText: /Weapon Focus eintragen/i });
  bericht.check("mit dem Eintragen-Knopf", (await eintragen.count()) > 0);

  await eintragen.first().click();
  await page.waitForTimeout(1200);
  text = await bodyText(page);
  bericht.check(
    "nach dem Tipp: Hinweis wird zur Bestaetigung",
    /weapon focus \(langschwert\) steht am bogen/i.test(text),
  );
  bericht.check("der Knopf ist weg (nichts doppelt eintragen)", (await eintragen.count()) === 0);
  bericht.check(
    "die Ruecknahme sagt eingetragen, nicht geloescht",
    /weapon focus \(langschwert\) eingetragen/i.test(text),
  );

  /* ---------- 5. Talente: die Herkunft ---------- */
  await setzeBearbeiten(page, false);
  await openTab(page, /Talente/i);
  await page.waitForTimeout(600);

  const wfText = await featZeile(page, /Weapon Focus/i).innerText();
  bericht.check(
    "Weapon Focus traegt seine QUELLE",
    new RegExp(`war domain \\(${GOTT}\\)`, "i").test(wfText),
    wfText.replace(/\s+/g, " ").slice(0, 120),
  );
  const ccText = await featZeile(page, /Combat Casting/i).innerText();
  bericht.check("Combat Casting traegt seine Stufe (aus dem Import)", /stufe 3/i.test(ccText));
  const dodgeText = await featZeile(page, /Dodge/i).innerText();
  bericht.check(
    "Dodge (Altbestand) traegt NICHTS — keine erfundene Herkunft",
    !/stufe \d|domain \(/i.test(dodgeText),
    dodgeText.replace(/\s+/g, " ").slice(0, 120),
  );

  /*
    Nachtragen im Bearbeiten-Modus. Seit der Herkunfts-Runde ist das ein KNOPF je
    Platz und kein Feld mehr — wo die App die Moeglichkeiten kennt, gehoert jede
    einzelne als Knopf hin. Genau hier war die alte Fassung dieser Strecke
    stehengeblieben: sie suchte ein Zahlenfeld, das es nicht mehr gibt.
  */
  await setzeBearbeiten(page, true);
  await page.waitForTimeout(600);
  const stufe1 = featZeile(page, /Dodge/i).locator("button").filter({ hasText: /^Stufe 1/ }).first();
  if ((await stufe1.count()) === 0) throw new Error("Knopf Stufe 1 an Dodge nicht gefunden");
  await stufe1.click();
  await page.waitForTimeout(900);
  await setzeBearbeiten(page, false);
  await page.waitForTimeout(600);
  bericht.check(
    "die nachgetragene Stufe steht als Marke da",
    /stufe 1/i.test(await featZeile(page, /Dodge/i).innerText()),
  );

  /* ---------- Schlussproben ---------- */
  bericht.check("kein Browser-Dialog aufgegangen", dialoge.length === 0, dialoge.join(" | "));
  bericht.check("keine Seitenfehler", seitenfehler.length === 0, seitenfehler.slice(0, 2).join(" | "));
  const ueber = await ueberlauf(page);
  bericht.check("kein seitlicher Ueberlauf", ueber <= 1, `${ueber}px`);

  await bild(page, `goetter-${groesse}`);
  await ctx.close();
}

bericht.done(84);
