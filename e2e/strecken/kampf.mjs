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

/**
 * Eine ANGRIFFSZEILE — und zwar die in der Angriffe-Karte, nicht irgendein `li`.
 *
 * Die neue Karte `Gefuehrt` listet dieselben Waffennamen und steht im DOM FRUEHER:
 * `locator("li").filter({hasText:/Streitkolben/}).first()` traf sie, und die Pruefung
 * `der Aufklapper steht da` war rot an einem Kasten, der ihn gar nicht haben soll.
 * Zwoelfte Falle dieses Projekts, und sie entsteht bei JEDER neuen Karte neu, die
 * dieselben Namen nennt.
 */
async function angriffsZeile(page, muster) {
  return (await karte(page, /angriffe/i)).locator("li").filter({ hasText: muster }).first();
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

  /* ---------- Der Ueberblick ueber das Angelegte ---------- */
  /*
    Sein zweiter Befund: „Ich habe beim Kampf keinen Ueberblick was ich eigentlich
    equipped hab und was meine waffe kann."

    Geprueft wird an einem EIGENEN Bogen, auf dem wirklich etwas angelegt ist — der
    Slotprobe traegt alles im Gepaeck, und eine Karte, die nur `frei` zeigt, beweist die
    halbe Zusage.
  */
  await ctx.close();
  const zweiter = await oeffneApp(width, height);
  const page2 = zweiter.page;
  await importiere(page2, "waffenprobe");
  await oeffneBogen(page2, /Waffenprobe/i);
  await openTab(page2, /Kampf/i);
  await page2.waitForTimeout(800);

  const gefuehrt = await karte(page2, /gef(ü|ue)hrt/i);
  const gText = await gefuehrt.innerText();
  bericht.check("die Karte Gefuehrt steht ganz oben", (await gefuehrt.count()) > 0);
  bericht.check("sie nennt die Haupthand", /Haupthand[\s\S]*Streitkolben/i.test(gText), gText.replace(/\n/g, " | "));
  bericht.check("die Schildhand", /Schildhand[\s\S]*Holzschild/i.test(gText));
  bericht.check("und die Ruestung", /R(ü|ue)stung[\s\S]*Lederr(ü|ue)stung/i.test(gText));

  /*
    Und die Gegenprobe, die die halbe Auskunft traegt: eine LEERE Hand steht mit da.
    Ohne sie waere die Karte eine Liste dessen, was zufaellig vorhanden ist — am Tisch
    ist aber die Frage, ob noch eine Hand frei ist.
  */
  const slotprobeSeite = await oeffneApp(width, height);
  await importiere(slotprobeSeite.page, "slotprobe");
  await oeffneBogen(slotprobeSeite.page, /Slotprobe/i);
  await openTab(slotprobeSeite.page, /Kampf/i);
  await slotprobeSeite.page.waitForTimeout(800);
  const leerText = await (await karte(slotprobeSeite.page, /gef(ü|ue)hrt/i)).innerText();
  bericht.check(
    "eine leere Hand steht ausdruecklich da",
    /Haupthand[\s\S]*frei/i.test(leerText),
    leerText.replace(/\n/g, " | "),
  );
  await slotprobeSeite.ctx.close();

  /* ---------- Was die Waffe kann ---------- */
  const bogenZeile = await angriffsZeile(page2, /Kurzbogen/i);
  const bogenText = await bogenZeile.innerText();
  bericht.check(
    "die Reichweite steht am Angriff",
    /60 ft Reichweite/i.test(bogenText),
    bogenText.replace(/\n/g, " | "),
  );
  /*
    Die Uebung: GEWARNT, nicht gerechnet. Der Kleriker ist mit dem Kurzbogen nicht
    geuebt (martialisch), mit dem Streitkolben schon (einfach) — beide Richtungen, sonst
    waere die Marke auch dann gruen, wenn sie an JEDER Waffe staende.
  */
  bericht.check("und die Warnung, dass die Uebung fehlt", /nicht ge(ü|ue)bt/i.test(bogenText));
  const kolbenZeile = await angriffsZeile(page2, /Streitkolben/i);
  bericht.check(
    "beim Streitkolben steht sie NICHT",
    !/nicht ge(ü|ue)bt/i.test(await kolbenZeile.innerText()),
  );

  /* Der Regeltext klappt auf — deutsch zuerst. */
  const aufklapper = kolbenZeile.locator("button").filter({ hasText: /Was die Waffe kann/i });
  bericht.check("der Aufklapper steht da", (await aufklapper.count()) > 0);
  bericht.check(
    "und ist zu, bis man tippt",
    !/Kolben f(ü|ue)r eine Hand/i.test(await kolbenZeile.innerText()),
  );
  await aufklapper.first().click();
  await page2.waitForTimeout(400);
  bericht.check(
    "aufgeklappt steht die deutsche Erklaerung da",
    /Kolben f(ü|ue)r eine Hand/i.test(await kolbenZeile.innerText()),
    (await kolbenZeile.innerText()).replace(/\n/g, " | "),
  );

  /* ---------- Die Boni sind gross ---------- */
  /*
    Gemessen wird die SCHRIFTGROESSE, nicht das Vorhandensein: „die Boni sind super
    klein und nur klein gedruckt" war sein Befund, und eine Pruefung auf den Text waere
    auch vorher gruen gewesen. Der Name der Waffe ist `text-sm` (14 px) — die Zahl muss
    groesser sein als er, sonst liest man im Kampf das Falsche zuerst.
  */
  const zahl = kolbenZeile.locator("span.tabular-nums").first();
  const groesse_px = await zahl.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  bericht.check("die Angriffszahl ist groesser als der Waffenname", groesse_px >= 17, `${groesse_px}px`);

  /* Angelegtes zuerst: der Streitkolben steht vor dem Langschwert im Gepaeck. */
  const reihenfolge = await (await karte(page2, /angriffe/i))
    .locator("li")
    .allInnerTexts();
  const iKolben = reihenfolge.findIndex((x) => /Streitkolben/i.test(x));
  const iSchwert = reihenfolge.findIndex((x) => /Langschwert/i.test(x));
  bericht.check(
    "die angelegte Waffe steht vor der aus dem Gepaeck",
    iKolben >= 0 && iSchwert >= 0 && iKolben < iSchwert,
    `Kolben ${iKolben} · Schwert ${iSchwert}`,
  );

  if (groesse === "iphone") await bild(page2, "kampf-waffen");
  bericht.check("kein Seitenfehler auf dem zweiten Bogen", zweiter.seitenfehler.length === 0);
  await zweiter.ctx.close();
  const ctx2 = await oeffneApp(width, height);
  const page3 = ctx2.page;
  await importiere(page3, "slotprobe");
  await oeffneBogen(page3, /Slotprobe/i);
  await openTab(page3, /Kampf/i);
  await page3.waitForTimeout(800);

  /* ---------- Und wie hoch der Reiter jetzt ist ---------- */
  if (groesse === "iphone") {
    const mass = await scrollMain(page3, 0);
    /*
      Gemessen: 1640 px vor der Aufraeum-Runde, 1245 danach — und 1477, seit die
      Uebersichtskarte und die grossen Zahlen dazugekommen sind.

      Die Schranke stand auf 1450 und hat bei dieser Runde ANGESCHLAGEN. Genau dafuer
      ist sie da: sie hat gefragt, ob der neue Inhalt den gewonnenen Platz wert ist. Die
      Antwort war ja (sein Auftrag), also steht sie jetzt auf 1550 — angehoben mit Grund
      und nicht gesenkt, damit es gruen wird. Unter dem Ausgangswert bleibt sie in jedem
      Fall: wer hier wieder bei 1640 landet, hat die Runde rueckgaengig gemacht.
    */
    bericht.check("der Reiter bleibt deutlich kuerzer als am Anfang", mass.hoehe < 1550, `${mass.hoehe}px`);
  }

  bericht.check("kein Browser-Dialog", dialoge.length === 0, dialoge.join(" | "));
  bericht.check("keine Seitenfehler", seitenfehler.length === 0, seitenfehler.slice(0, 2).join(" | "));
  bericht.check("kein seitlicher Ueberlauf", (await ueberlauf(page3)) <= 1);

  await bild(page3, `kampf-${groesse}`);
  await ctx2.ctx.close();
}

/*
  Gemessen, nicht geschaetzt: 40 Pruefungen je Groesse, am iPhone eine mehr (die Hoehe).
  Eine Mindestzahl, die nie erreicht wird, macht jede gruene Strecke rot; eine zu
  niedrige faengt den Abbruch nicht.
*/
bericht.done(121);
