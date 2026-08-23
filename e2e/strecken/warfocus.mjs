/*
  Was die War-Domaene GEWAEHRT, kostet keinen Talentplatz.

  Der Fehler, den diese Strecke festhaelt: der Knopf `Weapon Focus eintragen` im
  Zauber-Reiter legte eine Talentzeile an, `used` zaehlte sie stumpf mit, und aus
  6 von 6 wurde 7 von 6 samt Ruege. Ein Knopf, der etwas verspricht und danach
  ruegt, ist die Fehlerfamilie dieses Projekts in Reinform.

  Geprueft wird die ganze STRECKE im gebauten Bogen: Gottheit da, Knopf da, Zahl
  vorher, Knopf druecken, Zahl nachher, keine Ruege. Und die Gegenprobe ohne
  War-Domaene — ohne sie waere der geschenkte Platz auch dann gruen, wenn er
  ueberall auftaucht.

  KOPFNOTIZ: keine deutschen Anfuehrungszeichen. Textpruefungen mit /i.
*/
import {
  GROESSEN,
  bodyText,
  createReport,
  importiere,
  oeffneApp,
  oeffneBogen,
  openTab,
  ueberlauf,
} from "../lib/probe.mjs";

const bericht = createReport("warfocus");

for (const [groesse, width, height] of GROESSEN) {
  console.log(`\n=== ${groesse} (${width}x${height})`);
  const { ctx, page, seitenfehler, dialoge } = await oeffneApp(width, height);

  /* Der Bogen bringt seine Gottheit mit (Homebrew im selben Umschlag). */
  await importiere(page, "slotprobe");
  await oeffneBogen(page, /Slotprobe/i);

  /** Die Zahl aus der Talente-Ueberschrift: TALENTE (6/7). Wirft, wenn sie fehlt. */
  const talentZahl = async () => {
    await openTab(page, /Talente/i);
    const m = /talente\s*\((\d+)\s*\/\s*(\d+)\)/i.exec(await bodyText(page));
    if (m === null) throw new Error("Talente-Zahl nicht gefunden");
    return { used: Number(m[1]), available: Number(m[2]) };
  };

  /* ---------- VORHER: der geschenkte Platz steht da, das Talent noch nicht ---------- */
  const vorher = await talentZahl();
  bericht.check(
    "vorher: 6 von 7 — der geschenkte Platz ist da",
    vorher.used === 6 && vorher.available === 7,
    `${vorher.used}/${vorher.available}`,
  );
  let text = await bodyText(page);
  bericht.check("und der Bogen sagt, dass einer frei ist", /1 slot ist noch frei/i.test(text));
  bericht.check("KEINE Ruege ueber zu viele Talente", !/nur \d+ slots verfügbar/i.test(text));

  /* ---------- Der Knopf ---------- */
  await openTab(page, /Zauber/i);
  text = await bodyText(page);
  bericht.check(
    "der War-Hinweis nennt die Lieblingswaffe",
    /war-domäne gewährt dir weapon focus \(halbarte\)/i.test(text),
    text.match(/.{0,80}weapon focus.{0,40}/i)?.[0] ?? "",
  );
  const eintragen = page.locator("button:visible").filter({ hasText: /Weapon Focus eintragen/i });
  bericht.check("der Eintragen-Knopf steht da", (await eintragen.count()) > 0);
  await eintragen.first().click();
  await page.waitForTimeout(1500);

  /* ---------- NACHHER: 7 von 7, und KEINE Ruege ---------- */
  const nachher = await talentZahl();
  bericht.check(
    "nachher: 7 von 7",
    nachher.used === 7 && nachher.available === 7,
    `${nachher.used}/${nachher.available}`,
  );
  text = await bodyText(page);
  bericht.check(
    "KEINE Ruege nach dem Eintragen — das war der Fehler",
    !/nur \d+ slots verfügbar/i.test(text),
    text.match(/.{0,60}slots verfügbar.{0,20}/i)?.[0] ?? "",
  );
  bericht.check("und auch kein offener Platz mehr", !/slot ist noch frei/i.test(text));
  bericht.check("das Talent traegt seine Quelle", /war domain \(probegott\)/i.test(text));

  /* ---------- Gegenprobe: dieselbe Gottheit, aber keine War-Domaene ---------- */
  await page.goto(process.env.CHARDEX_BASE ?? "http://localhost:5199", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await importiere(page, "ohne-war");
  await oeffneBogen(page, /Ohnewar/i);
  const ohne = await talentZahl();
  bericht.check(
    "ohne War-Domaene: 6 von 6 — kein geschenkter Platz",
    ohne.used === 6 && ohne.available === 6,
    `${ohne.used}/${ohne.available}`,
  );
  text = await bodyText(page);
  bericht.check("und dort steht auch kein freier Platz", !/slot ist noch frei/i.test(text));
  bericht.check(
    "der War-Hinweis fehlt dort ebenfalls",
    !/war-domäne gewährt dir weapon focus/i.test(text),
  );

  bericht.check("kein Browser-Dialog", dialoge.length === 0, dialoge.join(" | "));
  bericht.check("keine Seitenfehler", seitenfehler.length === 0, seitenfehler.slice(0, 2).join(" | "));
  const ueber = await ueberlauf(page);
  bericht.check("kein seitlicher Ueberlauf", ueber <= 1, `${ueber}px`);

  await ctx.close();
}

bericht.done(36);
