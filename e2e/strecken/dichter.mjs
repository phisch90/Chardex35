/*
  Dichter statt auseinandergezogen — und EINE Bauart in der Knopfreihe.

  Sein Befund zum iPad war "Sieht kacke Aus". Auf die Frage, was daran, hat er zwei
  Punkte angekreuzt ("Auseinandergezogene Zeilen" und "Die Knopfreihe oben") und fuer
  den Platz entschieden: "Dichter: drei Kacheln je Reihe werden sechs."

  Der KERN dieser Strecke ist, dass die Dichte am KASTEN haengt und nicht am Fenster.
  Dasselbe quere iPad traegt 494 px je Spalte, wenn zwei Ansichten stehen, und 1039 px,
  wenn eine steht — ein Breakpoint am Fenster koennte beide nicht auseinanderhalten.
  Geprueft wird deshalb in allen drei Groessen UND im Querformat in beiden Zustaenden,
  und zwar gegeneinander: was breit gilt, darf schmal gerade nicht gelten.

  Gemessen wird die Zahl der SPALTEN aus `grid-template-columns` und die Zahl der
  REIHEN aus den y-Positionen der Kacheln — nicht aus einem Text. Eine Ueberschrift
  ohne echte Reihe darunter waere eine Behauptung.

  KOPFNOTIZ: keine deutschen Anfuehrungszeichen. Textpruefungen mit /i.
*/
import {
  GROESSEN,
  bild,
  createReport,
  importiere,
  oeffneApp,
  oeffneBogen,
  openTab,
  setzeBearbeiten,
  ueberlauf,
} from "../lib/probe.mjs";

const bericht = createReport("dichter");

/** Wie viele Spalten hat dieses Raster wirklich? `none` heisst: gar kein Raster, also eine. */
const spalten = (locator) =>
  locator.evaluate((el) => {
    const v = getComputedStyle(el).gridTemplateColumns;
    return v === "none" || v === "" ? 1 : v.trim().split(/\s+/).length;
  });

/** Wie viele REIHEN? Aus den y-Positionen der Kinder, nicht aus der Spaltenzahl gerechnet. */
const reihen = (locator, kindSelektor) =>
  locator.evaluate(
    (el, sel) =>
      new Set(
        [...el.querySelectorAll(sel)].map((k) => Math.round(k.getBoundingClientRect().top)),
      ).size,
    kindSelektor,
  );

for (const [groesse, width, height] of GROESSEN) {
  for (const zweiAnsichten of groesse === "ipad-quer" ? [true, false] : [true]) {
    const lage = groesse === "ipad-quer" ? `${groesse} ${zweiAnsichten ? "zwei" : "eine"}` : groesse;
    console.log(`\n=== ${lage} (${width}x${height})`);
    const { ctx, page, seitenfehler, dialoge } = await oeffneApp(width, height);
    await importiere(page, "slotprobe");
    await oeffneBogen(page, /Slotprobe/i);

    const breit = width >= 1024;
    const geteilt = breit && zweiAnsichten;
    if (breit && !zweiAnsichten) {
      /*
        Die zweite Ansicht zumachen. Der Knopf traegt seinen Namen am `title` und nicht
        im Text (im Text steht nur das Zeichen) — gesucht wird deshalb ueber das
        Attribut. WIRFT, wenn er fehlt: eine Navigationshilfe, die still scheitert,
        meldet hinterher einen Fehler an der Stelle, an der sie zufaellig hinschaut.
      */
      const zu = page.locator("button[title*='Zweite Ansicht']:visible").first();
      if ((await zu.count()) === 0) throw new Error("kein Knopf fuer die zweite Ansicht");
      await zu.click();
      await page.waitForTimeout(800);
    }

    /* ---------- Die Knopfreihe: EINE Bauart ---------- */
    if (width >= 768) {
      /*
        Sie ist jetzt ein `nav` mit Namen — damit findet `openTab` sie als Leiste und
        muss nicht mehr ueber ein Wort raten. Genau dieses Raten hat in der
        Talente-Runde sechs Pruefungen auf die falsche Stelle zeigen lassen.
      */
      const reihe = page.locator("nav[aria-label*='Reiter']:visible");
      bericht.check("die Reiterzeile traegt einen Namen", (await reihe.count()) === 1);

      const schienen = reihe.locator("> span:visible");
      const anzahl = await schienen.count();
      bericht.check(
        breit ? "zwei Schienen im Querformat" : "eine Schiene im Hochformat",
        anzahl === (breit ? 2 : 1),
        `${anzahl}`,
      );

      /*
        DER KERN seiner Ruege: vorher standen hier drei Bauarten mit drei Hoehen
        nebeneinander (Pille 26 px, Schiene 44 px, Knopf 34 px). Geprueft wird die
        GLEICHHEIT der Hoehen und nicht eine bestimmte Zahl — so haelt die Pruefung die
        Regel und nicht meine Wahl.
      */
      if (breit) {
        const hoehen = await schienen.evaluateAll((els) =>
          els.map((e) => Math.round(e.getBoundingClientRect().height)),
        );
        bericht.check(
          "beide Schienen sind gleich hoch",
          hoehen.length === 2 && hoehen[0] === hoehen[1],
          hoehen.join(" / "),
        );
        const radien = await schienen.evaluateAll((els) =>
          els.map((e) => getComputedStyle(e).borderTopLeftRadius),
        );
        bericht.check("und haben denselben Eckenradius", radien[0] === radien[1], radien.join(" / "));
      }

      /*
        Kein runder Pillen-Reiter mehr. `rounded-full` loest in Tailwind 4 zu einem
        absurd grossen Radius auf — gemessen wird deshalb die Zahl und nicht die Klasse.
      */
      const pillen = await reihe.locator("button:visible").evaluateAll((els) =>
        els.filter((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius) > 100).length,
      );
      bericht.check("keine runde Pille mehr in der Reihe", pillen === 0, `${pillen}`);

      /* Das Ziel bleibt daumengross — ein Knopf, den man nicht trifft, ist keiner. */
      const zuKlein = await reihe.locator("button:visible").evaluateAll((els) =>
        els.filter((e) => e.getBoundingClientRect().height < 34).length,
      );
      bericht.check("jedes Ziel ist mindestens 34 px hoch", zuKlein === 0, `${zuKlein} zu klein`);

      /* Und genau EIN Weg, die zweite Ansicht zu schalten (die alte Doppelung). */
      const schalter = await page.locator("button[title*='Zweite Ansicht']:visible").count();
      bericht.check(
        breit ? "genau ein Schalter fuer die zweite Ansicht" : "im Hochformat gar keiner",
        schalter === (breit ? 1 : 0),
        `${schalter}`,
      );
    }

    /* ---------- Auf einen Blick: drei Kacheln je Reihe werden sechs ---------- */
    await openTab(page, /Werte/i);
    await page.waitForTimeout(700);

    const blick = page.locator("[data-raster='blick']:visible");
    bericht.check("das Raster der Uebersicht steht genau einmal da", (await blick.count()) === 1);

    const gruppen = await blick.locator("> div").count();
    bericht.check("vier Gruppen", gruppen === 4, `${gruppen}`);

    const kacheln = blick.locator("> div > div > *");
    const kachelZahl = await kacheln.count();
    bericht.check("zwoelf Kacheln", kachelZahl === 12, `${kachelZahl}`);

    const kachelReihen = await reihen(blick, ":scope > div > div > *");
    const erwartet = !breit && width < 768 ? 4 : geteilt || width < 1024 ? 2 : 1;
    bericht.check(
      `die Kacheln stehen in ${erwartet} Reihe(n)`,
      kachelReihen === erwartet,
      `${kachelReihen}`,
    );

    /*
      Die Dreiergruppe bleibt — sie ist seine Entscheidung aus der Kachel-Runde und der
      Grund, warum Grapple bei der Bewegung steht. Ein Raster ueber alle zwoelf haette
      die Reihen wieder aus der Spaltenzahl gemacht statt aus der Bedeutung.
    */
    /*
      Eine Gruppe ist ein `div` mit ZWEI Kindern: der kleinen Ueberschrift und dem
      Raster. Gezaehlt wird das Raster, also das LETZTE Kind — meine erste Fassung
      zaehlte beide und meldete 0/3/0/3 als Fehler der App, die recht hatte.
    */
    const jeGruppe = await blick.evaluate((el) =>
      [...el.querySelectorAll(":scope > div")].map((g) => g.lastElementChild?.children.length ?? -1),
    );
    bericht.check(
      "und jede Gruppe traegt genau drei",
      jeGruppe.length === 4 && jeGruppe.every((n) => n === 3),
      jeGruppe.join("/"),
    );

    /*
      GEGENPROBE zur Dichte: keine Kachel faellt unter ihre Mindestbreite. `min-w-16`
      ist eine UNTERGRENZE — faellt die Spalte darunter, schrumpft die Kachel nicht,
      sondern laeuft aus der Karte heraus. Das saehe `innerText` nie.
    */
    const schmalste = await kacheln.evaluateAll((els) =>
      Math.min(...els.map((e) => Math.round(e.getBoundingClientRect().width))),
    );
    bericht.check("keine Kachel ist schmaler als 64 px", schmalste >= 64, `${schmalste}px`);

    /* Die sechs Attribute: drei je Reihe, ab 28rem Kastenbreite sechs. */
    const attr = page.locator("[data-raster='attribute']:visible");
    const attrSpalten = await spalten(attr);
    bericht.check(
      width < 768 ? "Attribute: drei je Reihe am Handy" : "Attribute: sechs je Reihe",
      attrSpalten === (width < 768 ? 3 : 6),
      `${attrSpalten}`,
    );

    await bild(page, `dichter-${lage.replace(/\s/g, "-")}-werte`);

    /* ---------- Die Fertigkeiten ---------- */
    await openTab(page, /Fert/i);
    await page.waitForTimeout(700);
    const fert = page.locator("[data-liste='fertigkeiten']:visible");
    bericht.check("die Fertigkeitsliste steht genau einmal da", (await fert.count()) === 1);
    const fertSpalten = await spalten(fert);
    const fertErwartet = width < 768 ? 1 : geteilt ? 2 : width < 1024 ? 2 : 3;
    bericht.check(
      `Fertigkeiten in ${fertErwartet} Spalte(n)`,
      fertSpalten === fertErwartet,
      `${fertSpalten}`,
    );

    /*
      Und die zweite Haelfte derselben Messung: im BEARBEITEN-Modus traegt jede Zeile
      noch ✕, − und +, also rund 120 px mehr. Die Schwelle liegt dort hoeher, und im
      Hochformat (707 px Kasten) bleibt es deshalb EINSPALTIG. Ohne diese Gegenprobe
      waere die Regel oben auch dann gruen, wenn die Schwelle fuer beide Zustaende
      dieselbe waere.
    */
    await setzeBearbeiten(page, true);
    await page.waitForTimeout(700);
    const fertBearbeiten = page.locator("[data-liste='fertigkeiten']:visible");
    const bearbeitenSpalten = await spalten(fertBearbeiten);
    const bearbeitenErwartet = !breit || geteilt ? 1 : 2;
    bericht.check(
      `im Bearbeiten-Modus ${bearbeitenErwartet} Spalte(n)`,
      bearbeitenSpalten === bearbeitenErwartet,
      `${bearbeitenSpalten}`,
    );
    bericht.check(
      "also nie mehr Spalten als ohne Bearbeiten",
      bearbeitenSpalten <= fertSpalten,
      `${bearbeitenSpalten} gegen ${fertSpalten}`,
    );
    await setzeBearbeiten(page, false);
    await page.waitForTimeout(700);

    /* ---------- Die Zauber: die laengste Liste des Bogens ---------- */
    await openTab(page, /Zauber/i);
    await page.waitForTimeout(1000);
    const zauber = page.locator("[data-liste='zauber']:visible").first();
    bericht.check("die Zauberliste steht da", (await zauber.count()) > 0);
    const zauberSpalten = await spalten(zauber);
    /*
      Eigene Schwelle, und das ist Absicht: unter jedem Zauber steht eine Knopfreihe mit
      bis zu drei Knoepfen (rund 230 px). Bei 494 px Spaltenbreite blieben je Spalte
      239 px — zu knapp. Die geteilte Ansicht bleibt deshalb EINSPALTIG, und genau das
      ist die Gegenprobe zu den Fertigkeiten, die dort schon zwei Spalten haben.
    */
    const zauberErwartet = geteilt || width < 768 ? 1 : breit ? 3 : 2;
    bericht.check(
      `Zauber in ${zauberErwartet} Spalte(n)`,
      zauberSpalten === zauberErwartet,
      `${zauberSpalten}`,
    );
    if (geteilt) {
      bericht.check(
        "und das ist WENIGER als bei den Fertigkeiten daneben",
        zauberSpalten < fertSpalten,
        `${zauberSpalten} gegen ${fertSpalten}`,
      );
    }
    await bild(page, `dichter-${lage.replace(/\s/g, "-")}-zauber`);

    /* ---------- Gegenproben ---------- */
    bericht.check("kein Browser-Dialog", dialoge.length === 0, dialoge.join(" | "));
    bericht.check("keine Seitenfehler", seitenfehler.length === 0, seitenfehler.join(" | "));
    bericht.check("kein seitlicher Ueberlauf", (await ueberlauf(page)) <= 1);

    await ctx.close();
  }
}

/*
  GEMESSEN und nicht geschaetzt: vier Durchlaeufe (iPhone, iPad quer in beiden
  Zustaenden, iPad hoch). Eine zu hohe Zahl meldet jede gruene Strecke rot, eine zu
  niedrige faengt den Abbruch nicht.
*/
bericht.done(84);
