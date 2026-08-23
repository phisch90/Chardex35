/*
  Die Herkunft wird GEWAEHLT, nicht getippt — und die App leitet die Plaetze aus
  dem Aufbau her.

  Sein Auftrag: man kann doch jetzt mal den Charakter zurueckgehen und sehen,
  okay, drei Fighter, Mensch und vier Kleriker. Da raus kann man doch herleiten,
  wie viele Talente ich habe … Und in der Zukunft, jedes Mal, wenn man ein neues
  Talent auswaehlt, dann steht drin, dass es vom Level-up zu Klasse Rang x y
  kommt.

  Geprueft wird im gebauten Bogen: die Knoepfe tragen die ECHTEN Plaetze seines
  Aufbaus (Mensch, Kaempfer 3 / Kleriker 4 macht Stufe 1 . Stufe 3 . Stufe 6 .
  Human . Fighter 1 . Fighter 2), der Zuordnen-Knopf verteilt sie, eine Zeile
  laesst sich einzeln richtigstellen, ein belegter Platz ist als belegt markiert
  — und es gibt kein Freitextfeld mehr.

  KOPFNOTIZ: keine deutschen Anfuehrungszeichen. Gelesen wird in den
  TALENT-Zeilen und nicht im Body: im Kopf steht Fighter 3 / Cleric 4 . Stufe 7 .
  Human, und ein Ausdruck ueber den ganzen Bogen trifft den eigenen Text.
*/
import {
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

const bericht = createReport("herkunft");
/* Genau die sechs Plaetze, die sein Aufbau hergibt — und keiner mehr. */
const PLAETZE = ["Stufe 1", "Stufe 3", "Stufe 6", "Human", "Fighter 1", "Fighter 2"];

for (const [groesse, width, height] of GROESSEN) {
  console.log(`\n=== ${groesse} (${width}x${height})`);
  const { ctx, page, seitenfehler, dialoge } = await oeffneApp(width, height);

  /* Der Bogen OHNE War-Domaene: genau 6 Plaetze, kein geschenkter dazwischen. */
  await importiere(page, "ohne-war");
  await oeffneBogen(page, /Ohnewar/i);
  await openTab(page, /Talente/i);

  /*
    ALLE Zeilen mit fett gesetztem Namen, nicht eine Liste von Namen: zwei
    Talente heissen Weapon Focus, und eine Namensliste hat deshalb einmal fuenf
    von sechs Zeilen gelesen — die sechste Herkunft stand da und wurde nie
    angesehen.
  */
  const zeilenTexte = async () => {
    const zeilen = page.locator("li").filter({ has: page.locator("span.font-medium") });
    const alle = await zeilen.allInnerTexts();
    const talente = alle.filter((t) => /dodge|extra turning|improved initiative|power attack|weapon focus/i.test(t));
    if (talente.length === 0) throw new Error("keine Talent-Zeile gefunden");
    return talente;
  };

  let texte = await zeilenTexte();
  bericht.check("sechs Talent-Zeilen stehen da", texte.length >= 6, `${texte.length}`);
  bericht.check(
    "vorher tragen sie keine Herkunft",
    !/stufe [1-9]|fighter [1-9]|human/i.test(texte.join(" ~ ")),
    texte.join(" ~ ").slice(0, 140),
  );

  await setzeBearbeiten(page, true);
  await page.waitForTimeout(600);

  /* ---------- Die Knoepfe tragen die ECHTEN Plaetze seines Aufbaus ---------- */
  const dodge = featZeile(page, /Dodge/i);
  const knopfNamen = (await dodge.locator("button").allInnerTexts()).map((t) =>
    t.replace(/\s+/g, " ").trim(),
  );
  for (const erwartet of PLAETZE) {
    bericht.check(
      `der Platz ${erwartet} steht als Knopf da`,
      knopfNamen.some((t) => t.startsWith(erwartet)),
      knopfNamen.join(" | ").slice(0, 160),
    );
  }
  bericht.check(
    "und es gibt einen Knopf fuer keine Angabe",
    knopfNamen.some((t) => /keine angabe/i.test(t)),
  );
  bericht.check(
    "Plaetze, die es NICHT gibt, stehen auch nicht da (kein Fighter 3, keine Stufe 2)",
    !knopfNamen.some((t) => /^Fighter 3/.test(t)) && !knopfNamen.some((t) => /^Stufe 2$/.test(t)),
  );

  /* ---------- Kein Freitextfeld mehr — die siebte Falle, richtig entschieden ---------- */
  const felder = await dodge
    .locator('input[type="number"], input[type="text"]:not([type="search"])')
    .count();
  bericht.check("kein Freitextfeld an der Zeile mehr", felder === 0, `${felder} Felder`);

  /* ---------- Der Zuordnen-Knopf verteilt ---------- */
  const zuordnen = page.locator("button:visible").filter({ hasText: /Herkunft zuordnen/i });
  bericht.check("der Zuordnen-Knopf steht da (6 Zeilen ohne Herkunft)", (await zuordnen.count()) > 0);
  await zuordnen.first().click();
  await page.waitForTimeout(1200);

  await setzeBearbeiten(page, false);
  await page.waitForTimeout(600);
  texte = await zeilenTexte();
  const zusammen = texte.join(" ~ ");
  for (const erwartet of PLAETZE) {
    bericht.check(
      `nach dem Zuordnen steht ${erwartet} an einem Talent`,
      new RegExp(erwartet, "i").test(zusammen),
      zusammen.slice(0, 140),
    );
  }
  /*
    Das Verb steht GENAU EINMAL da. Die Ruecknahme-Leiste haengt selbst eines an
    — trug der Text sein eigenes, stand dort zugeordnet zugeordnet. Gefunden hat
    das ein Bild und kein Test.
  */
  const body = await bodyText(page);
  const verben = body.match(/zugeordnet/gi) ?? [];
  bericht.check("die Ruecknahme sagt zugeordnet, und zwar einmal", verben.length === 1, `${verben.length}x`);
  bericht.check("und nicht geloescht", !/zugeordnet geloescht|zugeordnet gelöscht/i.test(body));

  /* ---------- Einzeln richtigstellen, und belegt ist als belegt markiert ---------- */
  await setzeBearbeiten(page, true);
  await page.waitForTimeout(600);
  const extra = featZeile(page, /Extra Turning/i);
  const belegt = await extra.locator("button").filter({ hasText: /belegt/i }).count();
  bericht.check("ein Platz, den ein anderes Talent hat, ist als belegt markiert", belegt > 0, `${belegt}`);

  const stufe6 = extra.locator("button").filter({ hasText: /^Stufe 6/ }).first();
  if ((await stufe6.count()) === 0) throw new Error("Knopf Stufe 6 an Extra Turning nicht gefunden");
  await stufe6.click();
  await page.waitForTimeout(1000);
  await setzeBearbeiten(page, false);
  await page.waitForTimeout(600);
  bericht.check(
    "die einzelne Zeile laesst sich richtigstellen",
    /stufe 6/i.test(await featZeile(page, /Extra Turning/i).innerText()),
  );

  bericht.check("kein Browser-Dialog", dialoge.length === 0, dialoge.join(" | "));
  bericht.check("keine Seitenfehler", seitenfehler.length === 0, seitenfehler.slice(0, 2).join(" | "));
  const ueber = await ueberlauf(page);
  bericht.check("kein seitlicher Ueberlauf", ueber <= 1, `${ueber}px`);

  if (groesse === "iphone") {
    await setzeBearbeiten(page, true);
    await page.waitForTimeout(500);
    await bild(page, "herkunft-bearbeiten");
    await setzeBearbeiten(page, false);
    await page.waitForTimeout(500);
    await bild(page, "herkunft-lesend");
  }
  await ctx.close();
}

bericht.done(60);
