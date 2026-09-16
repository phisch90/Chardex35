/*
  Die Symbolleiste und die zwei Ansichten nebeneinander.

  Sein Befund am iPad-Bild: "Die Leiste links ist auf dem iPad zu gross. Und dafuer
  ist sie auch zu unwichtig." Und seine Entscheidung dazu: schmale Symbolleiste,
  volle Breite, "zwei Ansichten nebeneinander? Im Querformat. Im Hochformat anders."

  Geprueft wird deshalb in allen drei Groessen, und zwar GEGENEINANDER: was im
  Querformat da sein muss, darf im Hochformat gerade nicht da sein. Eine Pruefung, die
  eine Breite ausnimmt, behauptet nicht "hier gilt es nicht" — sie schaut nur nicht hin.

  KOPFNOTIZ: keine deutschen Anfuehrungszeichen. Textpruefungen mit /i.
*/
import {
  GROESSEN,
  bild,
  bodyText,
  createReport,
  importiere,
  oeffneApp,
  oeffneBogen,
  ueberlauf,
} from "../lib/probe.mjs";

const bericht = createReport("ipad-leiste");
/* Dieselbe Grenze wie `ZWEISPALTIG_AB` und wie das `lg` der Blattbreite. */
const ZWEISPALTIG_AB = 1024;

for (const [groesse, width, height] of GROESSEN) {
  console.log(`\n=== ${groesse} (${width}x${height})`);
  const { ctx, page, seitenfehler, dialoge } = await oeffneApp(width, height);
  await importiere(page, "slotprobe");
  await oeffneBogen(page, /Slotprobe/i);

  const breit = width >= ZWEISPALTIG_AB;
  const abMd = width >= 768;

  /* ---------- Die Symbolleiste ---------- */
  /*
    ERST fragen, ob sie ueberhaupt sichtbar ist. `boundingBox()` WARTET auf ein
    sichtbares Element und laeuft bei `display:none` in einen Timeout statt `null` zu
    liefern — am Handy ist die Seitenleiste genau das. Die erste Fassung dieser Strecke
    ist daran gestorben, und der Fehler sah aus wie eine fehlende Leiste in der App.
  */
  const leiste = page.locator("nav").first();
  const sichtbar = await leiste.isVisible();
  const kasten = sichtbar ? await leiste.boundingBox() : null;
  if (abMd) {
    if (kasten === null) throw new Error("Symbolleiste nicht gefunden");
    bericht.check(
      "die Leiste ist schmal (64 px, vorher 208)",
      kasten.width > 50 && kasten.width < 80,
      `${Math.round(kasten.width)}px`,
    );
    bericht.check(
      "und nimmt hoechstens ein Zwoelftel der Breite",
      kasten.width / width < 0.09,
      `${((kasten.width / width) * 100).toFixed(1)}%`,
    );
    /*
      Das Kuerzel darf nicht unter der Statusleiste stecken. Genau das war auf seinem
      Bild zu sehen: die Leiste am Handy rechnete den oberen Geraeterand ein, die
      Seitenleiste nicht. Ohne Geraeterand im Browser ist die Zahl klein, aber der
      Kasten muss trotzdem VOLLSTAENDIG im Bild liegen.
    */
    const kuerzel = leiste.locator("div").first();
    const k = await kuerzel.boundingBox();
    bericht.check("das Kuerzel steht vollstaendig im Bild", k !== null && k.y >= 0, `y=${k?.y}`);
    bericht.check("und es ist nicht der ganze Name", /c35/i.test(await kuerzel.innerText()));

    /* Die Ziele tragen ihren Namen, auch ohne Beschriftung. */
    const namen = await leiste.locator("a[aria-label]").count();
    bericht.check("jedes Zeichen traegt seinen Namen (aria-label)", namen >= 3, `${namen}`);
  } else {
    bericht.check("am Handy gibt es keine Seitenleiste", !sichtbar, `sichtbar=${sichtbar}`);
  }

  /* ---------- Die Blattbreite ---------- */
  const blatt = await page.locator(".blatt").first().boundingBox();
  if (blatt === null) throw new Error("Blatt nicht gefunden");
  const frei = width - (kasten?.width ?? 0);
  if (breit) {
    bericht.check(
      "im Querformat nutzt der Bogen die volle Flaeche",
      blatt.width / frei > 0.9,
      `${Math.round(blatt.width)} von ${Math.round(frei)}px`,
    );
  } else {
    bericht.check(
      "sonst bleibt die lesbare Breite (hoechstens 768 px)",
      blatt.width <= 800,
      `${Math.round(blatt.width)}px`,
    );
  }

  /* ---------- Zwei Ansichten ---------- */
  /*
    Der Knopf traegt bei offener zweiter Ansicht NUR noch sein Zeichen — der ganze Satz
    haette die Reiterzeile bei 1024 px umbrechen lassen, seit die Schiene daneben steht.
    Gesucht wird deshalb am `title` und nicht am Text: ein `hasText` liefe ins Leere und
    saehe aus wie ein fehlender Knopf in der App.
  */
  const knopf = page.locator("button[title*='Zweite Ansicht']:visible");
  const geteilt = () => page.locator('[data-geteilt="ja"]');

  if (breit) {
    /*
      Zwei Spalten sind der NORMALFALL — sein Befund: "Bitte mache 2 Reiter auf ein Bild.
      Sonst ist ein Reiter zuuuuu breit." Vorher musste man sie erst aufschlagen; jetzt
      stehen sie da, ohne dass jemand etwas antippt.
    */
    bericht.check("im Querformat stehen SOFORT zwei Spalten da", (await geteilt().count()) === 1);
    bericht.check("der Knopf zum Schliessen steht da", (await knopf.count()) > 0);

    const spalten = geteilt().locator("> div");
    bericht.check("es sind genau zwei", (await spalten.count()) === 2, `${await spalten.count()}`);

    /* Nebeneinander heisst: gleiche Hoehe, verschiedene x. */
    const links = await spalten.nth(0).boundingBox();
    const rechts = await spalten.nth(1).boundingBox();
    bericht.check(
      "sie stehen NEBENeinander und nicht untereinander",
      links !== null && rechts !== null && rechts.x > links.x + links.width - 5,
      `links x=${Math.round(links?.x ?? -1)} rechts x=${Math.round(rechts?.x ?? -1)}`,
    );

    /*
      DER KERN DIESER RUNDE. Sein Befund: "Mir gefaellt der Versatz nicht." Die Schiene
      der rechten Spalte stand ueber deren Karte und schob sie nach unten — die linke
      Karte fing rund 40 px hoeher an.

      Gemessen wird die OBERKANTE beider Karten, nicht die Abwesenheit der Schiene: eine
      Pruefung, die nur sagt "die Schiene ist weg", waere auch dann gruen, wenn etwas
      anderes den Versatz macht.
    */
    const obenLinks = await spalten.nth(0).locator(".karte").first().boundingBox();
    const obenRechts = await spalten.nth(1).locator(".karte").first().boundingBox();
    bericht.check(
      "beide Spalten beginnen auf derselben Hoehe (kein Versatz)",
      obenLinks !== null && obenRechts !== null && Math.abs(obenLinks.y - obenRechts.y) <= 2,
      `links y=${Math.round(obenLinks?.y ?? -1)} rechts y=${Math.round(obenRechts?.y ?? -1)}`,
    );

    /*
      Die Schiene ist damit nicht verschwunden, sondern umgezogen: sie steht in der
      Reiterzeile ueber BEIDEN Spalten. Erkannt wird sie an ihrer Gruppe — der Name der
      Reiter ist dort derselbe wie in der grossen Chip-Reihe, also traegt nur die Gruppe
      den Unterschied.
    */
    const schiene = page.locator('[role="group"][aria-label*="rechts"]:visible');
    bericht.check("die Schiene fuer rechts steht da", (await schiene.count()) === 1);
    bericht.check(
      "und nicht mehr in der Spalte selbst",
      (await spalten.nth(1).locator('[role="group"]').count()) === 0,
    );
    bericht.check(
      "sie traegt alle sieben Reiter",
      (await schiene.locator("button").count()) === 7,
      `${await schiene.locator("button").count()}`,
    );
    /*
      Und jeder traegt einen Namen, der ihn von der Chip-Reihe daneben unterscheidet.
      Zweimal "Kampf" auf einem Schirm waere fuer ein Vorleseprogramm nicht trennbar.
    */
    const eigene = await schiene.locator('button[aria-label*="Rechts:"]').count();
    bericht.check("jeder Reiter der Schiene sagt, dass er rechts meint", eigene === 7, `${eigene}`);

    /*
      Und sie hat GENAU EINEN Weg zum Schliessen. Vorher stand das ✕ in der rechten
      Spalte UND "Zweite Ansicht schliessen" oben — dasselbe zweimal auf einem Schirm,
      und im Bild war das das Auffaelligste. Ohne diese Gegenprobe kaeme es beim naechsten
      Umbau zurueck.
    */
    const schliessenRechts = await spalten
      .nth(1)
      .locator("button:visible")
      .filter({ hasText: /✕|×/ })
      .count();
    bericht.check("kein zweiter Schliessen-Knopf in der Spalte", schliessenRechts === 0, `${schliessenRechts}`);
    /*
      Und die andere Haelfte derselben Zusage: es gibt ueberhaupt genau EINEN. Ohne diese
      Zahl waere die Pruefung darueber auch dann gruen, wenn das zweite Kreuz irgendwo
      sonst auf dem Schirm steht.
    */
    const kreuze = await page.locator("button[title*='Zweite Ansicht']:visible").count();
    bericht.check("genau ein Weg, die zweite Ansicht zuzumachen", kreuze === 1, `${kreuze}`);
    bericht.check(
      "und sie steht in EINER Zeile (kein Umbruch)",
      await schiene.evaluate((el) => {
        const knoepfe = [...el.querySelectorAll("button")];
        const oben = new Set(knoepfe.map((b) => Math.round(b.getBoundingClientRect().y)));
        return knoepfe.length === 7 && oben.size === 1;
      }),
    );

    /* Umschalten der rechten Spalte, ohne die linke anzufassen. */
    const vorherLinks = (await spalten.nth(0).innerText()).slice(0, 80);
    await schiene.getByTitle("Notizen", { exact: true }).click();
    await page.waitForTimeout(900);
    const nachherLinks = (await geteilt().locator("> div").nth(0).innerText()).slice(0, 80);
    bericht.check("die linke Spalte bleibt dabei stehen", vorherLinks === nachherLinks);
    bericht.check(
      "und rechts stehen jetzt die Notizen",
      /notiz/i.test(await geteilt().locator("> div").nth(1).innerText()),
    );

    bericht.check("kein seitlicher Ueberlauf mit zwei Spalten", (await ueberlauf(page)) <= 1);

    if (groesse === "ipad-quer") await bild(page, "ipad-zwei-ansichten");

    /* Zumachen — und zwar so, dass es HAELT. */
    await page.locator("button[title*='schließen']:visible").first().click();
    await page.waitForTimeout(900);
    bericht.check("sie laesst sich schliessen", (await geteilt().count()) === 0);
    /*
      Die Gegenprobe zum Standard: ein Reiterwechsel darf sie nicht wieder aufgehen
      lassen. Ohne den eigenen gespeicherten Zustand "zu" waere das genau passiert — der
      Knopf haette scheinbar nichts getan.
    */
    await page.locator("button:visible").filter({ hasText: /^Kampf$/ }).first().click();
    await page.waitForTimeout(900);
    bericht.check("und sie bleibt zu, auch nach einem Reiterwechsel", (await geteilt().count()) === 0);

    /* Und wieder auf. */
    await knopf.first().click();
    await page.waitForTimeout(900);
    bericht.check("wieder aufschlagen geht auch", (await geteilt().count()) === 1);
  } else {
    /*
      Die GEGENPROBE, und sie ist der Kern von "im Hochformat anders": weder der Knopf
      noch die Spalten duerfen hier auftauchen. Ein Knopf, der nichts bewirkt, waere ein
      Versprechen ohne Weg.
    */
    bericht.check("im Hochformat gibt es den Knopf nicht", (await knopf.count()) === 0);
    bericht.check("und keine zweite Spalte", (await geteilt().count()) === 0);
  }

  const text = await bodyText(page);
  bericht.check("der Bogen steht noch da", /slotprobe/i.test(text));
  bericht.check("kein Browser-Dialog", dialoge.length === 0, dialoge.join(" | "));
  bericht.check("keine Seitenfehler", seitenfehler.length === 0, seitenfehler.slice(0, 2).join(" | "));
  bericht.check("kein seitlicher Ueberlauf", (await ueberlauf(page)) <= 1);

  await bild(page, `ipad-leiste-${groesse}`);
  await ctx.close();
}

/*
  48 und nicht mehr: im Hochformat laufen weniger Pruefungen als im Querformat (dort gibt
  es die zweite Ansicht gar nicht). Die Zahl ist gemessen und nicht geschaetzt — eine
  Mindestzahl, die nie erreicht wird, macht jede gruene Strecke rot; eine zu niedrige
  faengt den Abbruch nicht. 43 waren es, bevor die Schiene in die Reiterzeile umzog.
*/
bericht.done(48);
