/*
  Der Kampf-Reiter: Angriffe zuerst, keine doppelten Kacheln, Kampfoptionen zugeklappt.

  Seine drei Punkte in einer Runde. Was die Strecke vor allem festhaelt, ist nicht das
  Entfernen, sondern die GEGENPROBE dazu: dieselben sechs Zahlen muessen weiter auf der
  Werte-Seite stehen. Ohne sie waere eine Doppelung abgeschafft, indem die Auskunft
  abgeschafft wurde — und das haette niemand gemerkt, bis er sie am Tisch sucht.

  KOPFNOTIZ: keine deutschen Anfuehrungszeichen. Jede Textpruefung mit /i, weil
  Ueberschriften `uppercase` tragen und `innerText` damit GROSS liest.
*/
import {
  GROESSEN,
  bild,
  createReport,
  importiere,
  oeffneApp,
  oeffneBogen,
  openTab,
  scrollMain,
  ueberlauf,
} from "../lib/probe.mjs";

const bericht = createReport("kampf");

/**
 * Die SPALTE des gerade aktiven Reiters — und das ist keine Feinheit.
 *
 * Im Querformat stehen seit seiner Entscheidung ZWEI Ansichten nebeneinander, und
 * rechts stand bei dieser Strecke die Werte-Seite. Meine erste Fassung suchte im ganzen
 * Dokument und meldete drei Kacheln, die der Kampf-Reiter gar nicht hat — sie gehoerten
 * dem Nachbarn. Die Pruefung zeigte auf die App, und die App hatte recht.
 *
 * Links steht immer der aktive Reiter (`koerper(active)` ist das erste Kind); ohne
 * zweite Spalte ist es das `main`.
 *
 * Ein `.or(main)` tut es NICHT, und das war die zweite Fassung dieses Fehlers: `main`
 * steht im DOM frueher, also gewinnt es bei `.first()` immer — und die Pruefung las
 * wieder beide Spalten. Gefragt wird deshalb ausdruecklich, ob geteilt ist.
 */
async function aktiveSpalte(page) {
  const geteilt = page.locator('[data-geteilt="ja"] > div');
  return (await geteilt.count()) > 0 ? geteilt.first() : page.locator("main");
}

/** Die Karte mit dieser Ueberschrift — gesucht wird der Kasten, nicht die Zeile. */
async function karte(page, titel) {
  return (await aktiveSpalte(page))
    .locator("div.karte")
    .filter({ has: page.locator("h2", { hasText: titel }) })
    .first();
}

/** Der Text der aktiven Spalte — nie der des ganzen Schirms. */
const spaltenText = async (page) => (await aktiveSpalte(page)).innerText();

/**
 * Wie oft steht dieses Wort als KACHEL-Beschriftung da?
 *
 * Nicht im ganzen Text gesucht: `Nahkampf` steht als Angriffszeile voellig zu Recht
 * weiterhin im Kampf-Reiter. Gefragt ist, ob es ZUSAETZLICH eine Kachel dafuer gibt —
 * und die erkennt man an ihrer eigenen kleinen Beschriftung, nicht am Wort.
 */
async function kacheln(page, muster) {
  return (await aktiveSpalte(page))
    .locator("button div.uppercase, button .text-\\[10px\\], button .text-xs")
    .filter({ hasText: muster })
    .count();
}

for (const [groesse, width, height] of GROESSEN) {
  console.log(`\n=== ${groesse} (${width}x${height})`);
  const { ctx, page, seitenfehler, dialoge } = await oeffneApp(width, height);
  await importiere(page, "slotprobe");
  await oeffneBogen(page, /Slotprobe/i);
  await openTab(page, /Kampf/i);
  await page.waitForTimeout(800);

  /* ---------- 1. Die Angriffe stehen zuerst ---------- */
  const angriffe = await karte(page, /angriffe/i);
  const optionen = await karte(page, /kampfoptionen/i);
  const rk = await karte(page, /^RK$/i);
  const [yA, yO, yR] = await Promise.all(
    [angriffe, optionen, rk].map(async (k) => (await k.boundingBox())?.y ?? -1),
  );
  bericht.check("die drei Karten sind alle da", yA > 0 && yO > 0 && yR > 0, `${yA} ${yO} ${yR}`);
  bericht.check(
    "die Angriffe stehen VOR den Kampfoptionen und der RK",
    yA < yO && yO < yR,
    `Angriffe ${Math.round(yA)} · Optionen ${Math.round(yO)} · RK ${Math.round(yR)}`,
  );

  /*
    Und der eigentliche Punkt: man muss nicht scrollen. Vorher lagen die Angriffe hinter
    einem ganzen Bildschirm — im Kampf ist das das Erste, was er sucht.
  */
  const kasten = await angriffe.boundingBox();
  bericht.check(
    "die Angriffsliste ist ohne Scrollen zu sehen",
    kasten !== null && kasten.y < height - 120,
    `y=${Math.round(kasten?.y ?? -1)} von ${height}`,
  );

  /* ---------- 2. Die doppelten Kacheln sind weg ---------- */
  for (const [name, muster] of [
    ["Initiative", /^initiative$/i],
    ["Grapple", /^grapple$/i],
    ["Bewegung", /^bewegung$/i],
  ]) {
    bericht.check(`keine ${name}-Kachel mehr im Kampf`, (await kacheln(page, muster)) === 0);
  }
  /*
    Nahkampf und Fernkampf sind der interessantere Fall: sie standen ZWEIMAL auf diesem
    einen Schirm — als Kachel und zwei Zentimeter darunter als Angriffszeile mit genau
    derselben Zahl. Die Zeile bleibt, die Kachel geht.
  */
  const kampfText = await spaltenText(page);
  for (const wort of ["Nahkampf", "Fernkampf"]) {
    const treffer = kampfText.split(new RegExp(wort, "g")).length - 1;
    bericht.check(`${wort} steht genau einmal da`, treffer === 1, `${treffer}×`);
  }

  /* ---------- Die GEGENPROBE: auf der Werte-Seite steht alles weiter ---------- */
  await openTab(page, /Werte/i);
  await page.waitForTimeout(700);
  const werteText = await spaltenText(page);
  for (const wort of ["Initiative", "Grapple", "Bewegung", "Nahkampf", "Fernkampf", "BAB"]) {
    bericht.check(
      `${wort} steht weiter auf der Werte-Seite`,
      new RegExp(wort, "i").test(werteText),
    );
  }
  await openTab(page, /Kampf/i);
  await page.waitForTimeout(700);

  /* ---------- 3. Die Kampfoptionen ---------- */
  const kopf = optionen.locator("button[aria-expanded]").first();
  bericht.check("die Kampfoptionen sind zugeklappt", (await kopf.getAttribute("aria-expanded")) === "false");
  bericht.check(
    "und sagen, dass nichts aktiv ist",
    /keine Option aktiv/i.test(await optionen.innerText()),
    (await optionen.innerText()).replace(/\n/g, " | "),
  );
  bericht.check(
    "Power Attack steckt dahinter und nimmt keinen Platz",
    !/Power Attack/i.test(await optionen.innerText()),
  );

  if (groesse === "iphone") await bild(page, "kampf-zu");

  await kopf.click();
  await page.waitForTimeout(500);
  bericht.check("aufklappen zeigt Power Attack", /Power Attack/i.test(await optionen.innerText()));
  bericht.check("und den Hinweis zur Runde", /Gilt für diese Runde/i.test(await optionen.innerText()));

  /* Eine Option anschalten und wieder zuklappen — DAS ist die Zusage. */
  await optionen.locator('button[title*="Power Attack erhöhen"]').first().click();
  await optionen.locator('button[title*="Power Attack erhöhen"]').first().click();
  await page.waitForTimeout(500);
  if (groesse === "iphone") await bild(page, "kampf-offen");
  await kopf.click();
  await page.waitForTimeout(500);

  const zuText = await optionen.innerText();
  bericht.check(
    "zugeklappt steht trotzdem da, was an ist",
    /Power Attack 2/i.test(zuText),
    zuText.replace(/\n/g, " | "),
  );
  /*
    Die Gegenprobe dazu, und sie ist die wichtigere: ein Regler, der einen Malus auf
    jeden Angriff legt und sich dabei versteckt, waere die Fehlerfamilie dieses Projekts
    in Reinform. Ohne diese Zeile waere die Pruefung darueber auch dann gruen, wenn
    DANEBEN weiter `keine Option aktiv` staende.
  */
  bericht.check("und eben NICHT: keine Option aktiv", !/keine Option aktiv/i.test(zuText));
  bericht.check(
    "der Zuruecksetzen-Knopf steht daneben",
    (await optionen.locator("button").filter({ hasText: /alles zurück/i }).count()) > 0,
  );

  /* Zurueckstellen — und die Zeile geht mit. */
  await optionen.locator("button").filter({ hasText: /alles zurück/i }).first().click();
  await page.waitForTimeout(500);
  bericht.check(
    "zuruecksetzen fuehrt die Zeile mit",
    /keine Option aktiv/i.test(await optionen.innerText()),
  );

  /* ---------- Und wie hoch der Reiter jetzt ist ---------- */
  if (groesse === "iphone") {
    const mass = await scrollMain(page, 0);
    /*
      Gemessen: 1640 px vor dieser Runde, 1245 danach. Die Schranke steht als ZAHL und
      nicht als Absicht in einem Kommentar — eine Aufraeumrunde, die eine Karte wieder
      einbaut, soll hier anschlagen und nicht erst an seinem Daumen. Grosszuegig genug,
      dass ein neuer Zaehler sie nicht sprengt.
    */
    bericht.check("der Reiter ist deutlich kuerzer als vorher", mass.hoehe < 1450, `${mass.hoehe}px`);
  }

  bericht.check("kein Browser-Dialog", dialoge.length === 0, dialoge.join(" | "));
  bericht.check("keine Seitenfehler", seitenfehler.length === 0, seitenfehler.slice(0, 2).join(" | "));
  bericht.check("kein seitlicher Ueberlauf", (await ueberlauf(page)) <= 1);

  await bild(page, `kampf-${groesse}`);
  await ctx.close();
}

/*
  Gemessen, nicht geschaetzt: 26 Pruefungen je Groesse, am iPhone eine mehr (die Hoehe).
  Eine Mindestzahl, die nie erreicht wird, macht jede gruene Strecke rot; eine zu
  niedrige faengt den Abbruch nicht.
*/
bericht.done(79);
