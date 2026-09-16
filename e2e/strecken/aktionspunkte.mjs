/*
  Die Aktionspunkte gehen nur beim Stufenaufstieg zurueck.

  Sein Auftrag: `Action points setze nur bei level up zurueck.` Die Regel stand seit
  Martins Antwort im Kern (`Reset bei Stufenaufstieg`) — sie kam nur an einem
  gespeicherten Zaehler nie an. Betroffen war genau seiner: aus dem Fight-Club-Import,
  ohne Anschluss an den Vorschlag, also ohne jede Bedingung.

  Die Bogendatei dieser Strecke steht deshalb ausdruecklich auf `schemaVersion: 2` —
  sonst laeuft die Wanderung gar nicht, und die Strecke wuerde einen Weg pruefen, den
  sein Geraet nie geht.

  KOPFNOTIZ: keine deutschen Anfuehrungszeichen. Jede Textpruefung mit /i.
*/
import {
  GROESSEN,
  bild,
  blattText,
  bodyText,
  createReport,
  importiere,
  oeffneApp,
  oeffneBogen,
  openTab,
  ueberlauf,
} from "../lib/probe.mjs";

const bericht = createReport("aktionspunkte");

/**
 * Die Zeile eines Zaehlers — der `li`, der den Namen FETT traegt.
 *
 * Nicht `filter({hasText})` allein: sobald eine Hinweiskarte denselben Namen nennt,
 * traefe der erste Treffer die Warnung statt den Zaehler. Das ist die zwoelfte Falle,
 * und sie ist in diesem Projekt schon dreimal bezahlt worden.
 */
function zaehlerZeile(page, name) {
  return page
    .locator("li")
    .filter({ has: page.locator("div.font-medium", { hasText: name }) })
    .first();
}

/**
 * EINE Zeile aus der Rast-Ansage — nicht der ganze Blatt-Text.
 *
 * Meine erste Fassung suchte `/Action Points.*erst bei der langen Rast/is` im ganzen
 * Blatt und war rot, obwohl die App recht hatte: unter den Aktionspunkten steht
 * `Schicksalspunkte — fuellt sich erst bei der langen Rast`, und `.*` mit `s` laeuft
 * ueber den Zeilenumbruch. Ein Ausdruck ueber den ganzen Kasten trifft irgendwann den
 * Nachbarn — gelesen wird die Zeile, um die es geht.
 */
async function ansageZeile(page, name) {
  const zeile = page.locator('[role="dialog"] li').filter({ hasText: name }).first();
  if ((await zeile.count()) === 0) return "(keine Zeile)";
  return zeile.innerText();
}

/** Das Aktions-Blatt hinter den drei Punkten oeffnen. */
async function oeffneAktionen(page) {
  const knopf = page.locator('button[title="Aktionen"]:visible').first();
  if ((await knopf.count()) === 0) throw new Error("kein Aktionen-Knopf am Bogen");
  await knopf.click();
  await page.waitForTimeout(900);
}

async function schliesseBlatt(page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
}

for (const [groesse, width, height] of GROESSEN) {
  console.log(`\n=== ${groesse} (${width}x${height})`);
  const { ctx, page, seitenfehler, dialoge } = await oeffneApp(width, height);
  await importiere(page, "aktionspunkte");
  await oeffneBogen(page, /Punkteprobe/i);

  /* ---------- Was am Zaehler steht ---------- */
  await openTab(page, /Werte/i);

  const punkte = zaehlerZeile(page, /Action Points/i);
  bericht.check("der Aktionspunkte-Zaehler steht da", (await punkte.count()) > 0);
  const punkteText = await punkte.innerText();

  bericht.check(
    "er sagt, dass er sich beim Stufenaufstieg fuellt",
    /f(ü|ue)llt sich bei:.*Stufenaufstieg/i.test(punkteText),
    punkteText.replace(/\n/g, " | "),
  );
  /*
    Die zwei Gegenproben, und sie sind der Kern: VORHER stand hier je nach Datei
    entweder `fuellt sich nicht von allein` (kein resetType in seinem Export) oder
    `Kurze Pause` (mit resetType, weil der Import hart short schrieb). Beides ist das
    Gegenteil von Martins Regel.
  */
  bericht.check(
    "und ausdruecklich NICHT: fuellt sich nicht von allein",
    !/f(ü|ue)llt sich nicht von allein/i.test(punkteText),
  );
  bericht.check(
    "und ausdruecklich NICHT bei einer Rast oder Pause",
    !/Kurze Pause|Lange Rast/i.test(punkteText),
  );
  // Seine Zahl bleibt seine Zahl — das war die Zusage zur Wanderung.
  bericht.check("seine 6 bleiben 6", /\b2\s*\/\s*6\b/.test(punkteText), punkteText.replace(/\n/g, " | "));

  /* Was er selbst eingestellt hat, ueberlebt die Wanderung. */
  const schicksal = zaehlerZeile(page, /Schicksalspunkte/i);
  const schicksalText = await schicksal.innerText();
  bericht.check(
    "ein selbst eingestellter Zaehler behaelt seine Bedingung",
    /Lange Rast/i.test(schicksalText),
    schicksalText.replace(/\n/g, " | "),
  );

  /*
    Und der Nebeneffekt, der eine eigene Pruefung wert ist: seit der Zaehler am
    Vorschlag haengt, wird derselbe Vorschlag nicht mehr ein zweites Mal angeboten.
    Die Werte-Seite sucht dafuer nach `suggestedFrom` oder dem DEUTSCHEN Namen — ein
    englisch benannter Zaehler lief an beidem vorbei.
  */
  const werteText = await bodyText(page);
  bericht.check(
    "der Vorschlag Aktionspunkte wird nicht noch einmal angeboten",
    !/\+\s*Aktionspunkte/i.test(werteText),
  );

  if (groesse === "iphone") {
    // Der Kasten, der wirklich scrollt — sonst zeigt das Bild die Wertekacheln oben
    // und nicht den Zaehler, um den es geht (dreizehnte Falle).
    await punkte.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(600);
    await bild(page, "aktionspunkte-zaehler");
  }

  /* ---------- Was die Rast sagt ---------- */
  await oeffneAktionen(page);
  const rastKnopf = page.locator('[role="dialog"] button:visible').filter({ hasText: /Rast \(8 Stunden\)/i });
  bericht.check("die Rast steht im Blatt", (await rastKnopf.count()) > 0);
  await rastKnopf.first().click();
  await page.waitForTimeout(900);
  const rastText = await blattText(page);
  const rastZeile = await ansageZeile(page, /Action Points/i);

  bericht.check(
    "die lange Rast laesst die Aktionspunkte in Ruhe und sagt warum",
    /f(ü|ue)llt sich nur beim Stufenaufstieg/i.test(rastZeile),
    rastZeile.replace(/\n/g, " | "),
  );
  /* Die Gegenprobe: der Tageszaehler rastet sehr wohl mit. */
  bericht.check(
    "Untote vertreiben fuellt sich dabei auf",
    /Turn Undead:\s*1\s*→/i.test(rastText),
    rastText.replace(/\n/g, " | ").slice(0, 300),
  );
  await page.locator('[role="dialog"] button:visible').filter({ hasText: /^Abbrechen$/ }).first().click();
  await page.waitForTimeout(600);

  /* ---------- Und die kurze Pause: DER Satz, der falsch war ---------- */
  const pauseKnopf = page.locator('[role="dialog"] button:visible').filter({ hasText: /Kurze Pause/i });
  bericht.check("die kurze Pause steht auch da", (await pauseKnopf.count()) > 0);
  await pauseKnopf.first().click();
  await page.waitForTimeout(900);
  const pauseZeile = await ansageZeile(page, /Action Points/i);
  /*
    Hier stand `fuellt sich erst bei der langen Rast` — eine Auskunft, die der Bogen
    daneben widerlegt: acht Stunden fuellen diesen Zaehler auch nicht. Ein Test hat
    den falschen Satz sogar festgenagelt.
  */
  bericht.check(
    "die kurze Pause sagt denselben, wahren Grund",
    /f(ü|ue)llt sich nur beim Stufenaufstieg/i.test(pauseZeile),
    pauseZeile.replace(/\n/g, " | "),
  );
  bericht.check(
    "und verspricht keine Nacht, die nichts bringt",
    !/erst bei der langen Rast/i.test(pauseZeile),
    pauseZeile.replace(/\n/g, " | "),
  );
  /*
    Und die Gegenprobe im selben Kasten: bei einem Zaehler, der die Nacht WIRKLICH
    fuellt, steht der Satz weiter da. Ohne sie wuerde die Pruefung darueber auch dann
    gruen melden, wenn der Grund ueberall abgeschafft worden waere.
  */
  bericht.check(
    "aber wo die Nacht hilft, steht es weiter",
    /erst bei der langen Rast/i.test(await ansageZeile(page, /Schicksalspunkte/i)),
  );

  if (groesse === "iphone") await bild(page, "aktionspunkte-rast");
  await page.locator('[role="dialog"] button:visible').filter({ hasText: /^Abbrechen$/ }).first().click();
  await page.waitForTimeout(600);
  await schliesseBlatt(page);

  /* ---------- Der Stufenaufstieg: die andere Haelfte ---------- */
  await page.goto(`${page.url().split("?")[0].replace(/\/$/, "")}/stufenaufstieg`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1500);
  const klasse = page.locator("button:visible").filter({ hasText: /^Cleric/i }).first();
  if ((await klasse.count()) > 0) {
    await klasse.click();
    await page.waitForTimeout(1200);
  }
  const aufstiegText = await bodyText(page);
  bericht.check(
    "der Aufstieg sagt die Aktionspunkte vorher an",
    /Action Points:\s*2\s*→\s*6\s*\(Stufenaufstieg\)/i.test(aufstiegText),
    (aufstiegText.match(/Action Points[^\n]*/i) ?? ["(keine Zeile)"])[0],
  );

  bericht.check("kein Browser-Dialog", dialoge.length === 0, dialoge.join(" | "));
  bericht.check("keine Seitenfehler", seitenfehler.length === 0, seitenfehler.slice(0, 2).join(" | "));
  bericht.check("kein seitlicher Ueberlauf", (await ueberlauf(page)) <= 1);

  await bild(page, `aktionspunkte-${groesse}`);
  await ctx.close();
}

/*
  Gemessen, nicht geschaetzt: 15 Pruefungen je Groesse, drei Groessen. Eine
  Mindestzahl, die nie erreicht wird, macht jede gruene Strecke rot; eine zu
  niedrige faengt den Abbruch nicht.
*/
bericht.done(45);
