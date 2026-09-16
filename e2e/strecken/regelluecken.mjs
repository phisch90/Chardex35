/*
  Zwei Regelluecken, beide aus derselben Familie: die App WEISS es und sagt nichts.

  1. Sie zeigte Zauberplaetze fuer Grade, die das Attribut gar nicht zulaesst. Im SRD
     steht bei jeder zaubernden Klasse derselbe Satz: man braucht 10 + Zaubergrad. Bei
     WIS 11 sind das alle Grade ab 2 — und die standen mit vollen Punkten da.
  2. Der Knopf "Herkunft zuordnen" legte Extra Turning auf einen Kaempfer-Bonusplatz.
     Das Talent steht nicht auf der Liste des Kaempfers, aber die Liste stand nirgends.

  Geprueft wird beides im gebauten Bogen — und in BEIDE Richtungen: was gemeldet werden
  muss, und was nicht gemeldet werden darf. Eine Warnung, die immer dasteht, ist Tapete.

  KOPFNOTIZ: keine deutschen Anfuehrungszeichen. Textpruefungen mit /i.
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

const bericht = createReport("regelluecken");

for (const [groesse, width, height] of GROESSEN) {
  console.log(`\n=== ${groesse} (${width}x${height})`);
  const { ctx, page, seitenfehler, dialoge } = await oeffneApp(width, height);
  await importiere(page, "regelluecken");
  await oeffneBogen(page, /Lueckenprobe/i);

  /* ---------- 1. Der Riegel aus dem Attribut ---------- */
  await openTab(page, /Zauber/i);
  let text = await bodyText(page);

  bericht.check(
    "der Bogen sagt, dass WIS 11 nur bis Grad 1 reicht",
    /wis 11 reicht nur bis grad 1/i.test(text),
    text.match(/.{0,40}reicht nur bis.{0,40}/i)?.[0] ?? "",
  );
  bericht.check(
    "und er nennt den Wert, der FEHLT",
    /wis 12 nötig/i.test(text),
    text.match(/.{0,30}nötig.{0,10}/i)?.[0] ?? "",
  );

  /*
    Die Plaetze BLEIBEN stehen — gewarnt statt gesperrt, der DM hat Recht. Eine Sperre
    waere hier der Fehler: dann fehlt die Zahl, und niemand sieht mehr, worueber geredet
    wird.
  */
  bericht.check("die Grad-2-Plaetze stehen trotzdem da", /grad 2/i.test(text));

  /* Die Marke am Grad selbst — die Warnung oben allein waere zwei Bildschirme entfernt. */
  /*
    Der Grad-Kopf wird ueber `aria-expanded` gefunden und nicht ueber `^GRAD`: vor dem
    Wort steht das Aufklapp-Zeichen, und `hasText` prueft `textContent` — das verkettet
    ohne Trennzeichen zu "▸GRAD 2". Die aufgeschriebene Falle, und ich bin ihr trotzdem
    hineingelaufen; der Fehler sah aus, als fehlte die Marke in der App.
  */
  const gradKoepfe = await page.locator("button[aria-expanded]:visible").allInnerTexts();
  const marke = gradKoepfe.find((t) => /grad 2/i.test(t));
  bericht.check(
    "am Grad 2 selbst steht die Marke mit dem noetigen Wert",
    marke !== undefined && /wis 12/i.test(marke),
    marke?.replace(/\s+/g, " ") ?? "kein Grad-2-Kopf",
  );
  const gradEins = gradKoepfe.find((t) => /grad 1/i.test(t));
  bericht.check(
    "an Grad 1 steht KEINE Marke — er darf ihn ja wirken",
    gradEins !== undefined && !/wis \d/i.test(gradEins),
    gradEins?.replace(/\s+/g, " ") ?? "kein Grad-1-Kopf",
  );

  /* ---------- 2. Die falsche Herkunft ---------- */
  await openTab(page, /Talente/i);
  text = await bodyText(page);
  bericht.check(
    "der Bogen meldet die Herkunft von Extra Turning",
    /bonustalent-liste des kämpfers/i.test(text),
    text.match(/.{0,60}bonustalent-liste.{0,30}/i)?.[0] ?? "",
  );

  /*
    Und die Marke an der ZEILE sagt es auch — nicht nur die Karte oben. Eine Zeile, die
    harmlos aussieht, laesst den Fehler beim Lesen der Liste uebersehen.
  */
  const extraZeile = await featZeile(page, /Extra Turning/i).innerText();
  bericht.check(
    "die Herkunfts-Marke an der Zeile traegt die Warnung",
    /⚠/.test(extraZeile) && /fighter 1/i.test(extraZeile),
    extraZeile.replace(/\s+/g, " ").slice(0, 80),
  );
  const paZeile = await featZeile(page, /Power Attack/i).innerText();
  bericht.check("eine passende Herkunft traegt KEINE Warnung", !/⚠/.test(paZeile));

  /*
    Und im Auswaehler ist der Platz MARKIERT, nicht gesperrt: die Liste ist von Hand
    geschrieben, und ein Talent aus seinen Buechern steht nie darauf.
  */
  await setzeBearbeiten(page, true);
  await page.waitForTimeout(600);
  const extra = featZeile(page, /Extra Turning/i);
  const fighterKnopf = extra.locator("button").filter({ hasText: /^⚠?\s*Fighter 1/ }).first();
  bericht.check("der Fighter-Platz steht im Auswaehler noch da", (await fighterKnopf.count()) > 0);
  bericht.check(
    "aber er traegt eine Warnmarke",
    /⚠/.test(await fighterKnopf.innerText().catch(() => "")),
    (await fighterKnopf.innerText().catch(() => "")).replace(/\s+/g, " "),
  );
  bericht.check(
    "und er ist NICHT gesperrt",
    await fighterKnopf.isEnabled(),
  );

  /* Ein Platz, der passt, traegt keine Marke. */
  const powerAttack = featZeile(page, /Power Attack/i);
  const paFighter = powerAttack.locator("button").filter({ hasText: /Fighter 1/ }).first();
  bericht.check(
    "bei Power Attack traegt derselbe Platz KEINE Marke",
    !/⚠/.test(await paFighter.innerText().catch(() => "⚠")),
    (await paFighter.innerText().catch(() => "")).replace(/\s+/g, " "),
  );

  await setzeBearbeiten(page, false);
  await page.waitForTimeout(500);

  bericht.check("kein Browser-Dialog", dialoge.length === 0, dialoge.join(" | "));
  bericht.check("keine Seitenfehler", seitenfehler.length === 0, seitenfehler.slice(0, 2).join(" | "));
  bericht.check("kein seitlicher Ueberlauf", (await ueberlauf(page)) <= 1);

  if (groesse === "iphone") await bild(page, "regelluecken-talente");
  await ctx.close();
}

/*
  45 und nicht mehr: fuenfzehn Pruefungen in drei Groessen. Gemessen und nicht geschaetzt —
  eine Mindestzahl, die nie erreicht wird, macht jede gruene Strecke rot.
*/
bericht.done(45);
