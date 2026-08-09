# Chardex35 — Vorgaben für die Arbeit an diesem Projekt

Notizen für mich (Claude) über das, was Philipp entschieden hat. Sie stehen hier und
nicht im Chat, weil ein Chat irgendwann von vorn anfängt und diese Entscheidungen
dann trotzdem gelten.

## Wie ausgeliefert wird

**Direkt mergen, keine Entwürfe.** Wörtlich: „merge einfach immer. brauche keine
entwürfe."

Der Ablauf ist damit: bauen → prüfen → pushen → PR anlegen (nicht als Entwurf) →
mergen, sobald die Prüfläufe grün sind. Nicht auf ein „Merge" warten. Der PR bleibt
als Aufschrieb bestehen — dort steht, WARUM etwas so gebaut ist —, aber er ist keine
Wartestelle mehr.

**Vorher immer:** `pnpm -r typecheck` UND `pnpm test`. Vitest typprüft nicht; ein
Fehler kann grüne Tests haben. Bei Änderungen an der Oberfläche zusätzlich ein
Durchlauf im gebauten Bogen (`vite preview`, Playwright, 390×844) — nichts als
fertig melden, was nicht in der echten App gelaufen ist.

**Zwei Ausnahmen, bei denen ich trotzdem vorher frage:**

1. Änderungen, die die Zahlen BESTEHENDER Charaktere verschieben (z.B. die
   Zweiwaffen-Mali −6/−10). Das ist eine Regelentscheidung für seinen Tisch, keine
   Programmierentscheidung.
2. Alles, was Daten löscht oder unwiederbringlich umschreibt.

## Wie wir Schirm für Schirm durchgehen

Er will die App Ansicht für Ansicht durchgehen — wörtlich: „Lass uns jetzt mal gemeinsam
jede Ansicht, jede Seite von der App durchgehen und schauen, was wir verbessern können."
Gefragt, wie viel er dabei mitentscheiden will, hat er sich entschieden: **automatisch,
mit Fragen bei Geschmack.**

Der Ablauf je Schirm ist damit:

1. Er sagt, was ihn an diesem Schirm stört.
2. Wo sein GESCHMACK oder eine Regel seines Tisches entscheidet, kommen vorher 2–4 Fragen
   mit Antwortmöglichkeiten. Wo es eine Programmierentscheidung ist, entscheide ich.
3. Bauen, im gebauten Bogen prüfen, mergen, Commit melden.

**Kein Planungsmodus je Schirm** — er hatte ihn einmal versucht und wieder verworfen. Die
zwei Ausnahmen oben (Zahlen bestehender Bögen, Daten löschen) gelten unverändert weiter:
dort wird gefragt, egal wie automatisch der Rest läuft.

## Was live ist, immer dazusagen

Nach jedem Merge: welcher Commit jetzt unter https://phisch90.github.io/Chardex35/
läuft. Er spielt auf dem Handy und muss wissen, ob er das Neue schon hat.

Die Live-Adresse ist von der Entwicklungsumgebung aus NICHT abrufbar (der Proxy
blockt `github.io`). Der Stand lässt sich am Lauf „Deploy (GitHub Pages)" ablesen.
Die GitHub-API ist ebenfalls nicht direkt erreichbar — nur über die MCP-Tools der
Sitzung, nicht per `curl`.

**Und der wichtige Zusatz, gelernt durch „Es kommt kein Update":** ein grüner
Deploy-Lauf heißt, dass der Stand auf dem SERVER liegt — nicht, dass er auf seinem
Gerät ist. Monatelang stand in meinen Meldungen „läuft jetzt live", während seine
Web-App auf dem Homescreen unverändert weiterlief. Wer einen Stand meldet, meldet
den Server; ob das Gerät ihn hat, sagt die Versionsnummer IN der App.

## Inhalte

- **Oberfläche deutsch, Regelinhalte englisch** (SRD). Regelkürzel bleiben englisch:
  DEX, nicht GE. Steht so in seinen Büchern, in der Gruppen-Excel und in Fight Club.
- **Gegenstände: deutscher Name UND deutsche Erklärung, englisches Original klein
  daneben.** Wörtlich: „Bitte alle Ausrüstungsgegenstände immer auf deutsch im Namen und
  Erklärung. Englischen og namen klein daneben." Die Grenze zur Regel oben liegt
  zwischen DING und BEGRIFF: „Longsword" ist ein Ding, also „Langschwert"; „Acid Arrow"
  auf einer Schriftrolle ist ein Zaubername, bleibt also englisch und bekommt ein
  deutsches Wort davor („Schriftrolle: Acid Arrow") — am Bogen gruppiert nichts nach Art,
  dort muss der Name selbst sagen, was das Stück ist. Alles in
  `core/compendium/itemGerman.ts`, beim Einrichten als `localized.de` übergelegt; die
  Packs bleiben unverändert. Anzeige über `ui/ItemName.tsx` (`ItemName`, `ItemText`).
  ACHTUNG: die Reihenfolge ist hier UMGEKEHRT zu den Klassenmerkmalen — dort wollte er
  „Englisch zuerst", bei der Ausrüstung Deutsch zuerst.
- **Kein Fachjargon** in Texten für ihn — weder in der App noch im Chat. „Regal"
  statt Gist, „Kennwort" statt Passphrase, „Auftrag" statt Patch.
- **Nur OGL/SRD-Inhalte im Repo.** Seine Bücher sind sein Eigentum für den privaten
  Gebrauch. Was daraus stammt (PDF-Auszüge, seine echten Charakterdateien, seine
  Kampagnennotizen) bleibt lokal und gitignored — Tests dafür bauen ein eigenes
  Beispiel im selben Format nach.
- Der GitHub-Token aus dem Chat wurde nie gespeichert und wird nie benutzt.

## Wie die App gedacht ist

- **Lokal-first, kein Backend.** Alles im Browser, offline nutzbar. „Man bräuchte
  einen Server" ist keine Antwort.
- **Warnen statt sperren.** Die Engine wendet auch regelwidrige Werte an und meldet
  sie. Der DM hat Recht, nicht die App.
- **Die Gruppe:** jeder Bogen liegt beim jeweiligen Spieler, Link + Kennwort sind die
  Zugangsdaten. Der Spielleiter besitzt den AUFBAU (Stufen, Talente, Ausrüstung), der
  Spieler den SPIELZUSTAND (Schaden, verbrauchte Zauber, Zähler, Notizen).

## Die Fehlerfamilie dieses Projekts

**Ein abgeleiteter Wert, der gespeichert wurde.** Bisher fünf Fälle: rohe statt
geparster Datenbankzeilen · fehlende Schema-Standardwerte, weil Parser Literale
bauten · `equipped` statt `slot` · das eingefrorene Maximum eines Zählers, weshalb
Extra Turning nie ankam · der Abzweigpunkt des Abgleichs, der für Bögen weiterzählte,
die nie hochgeladen wurden. Bei jedem neuen Feld die Frage stellen: ist das eine
Eingabe oder eine Folge?

**Fall 1 ist wiedergekommen, und zwar im SCHREIBweg.** `CharacterRepo.mutate` holte
die rohe Zeile aus der Datenbank und mutierte sie. Sein Kleriker war gespeichert,
bevor es Domänen gab — dort war `domains` nicht `[]`, sondern gar nicht da. Die
Anzeige las den geparsten Stand und zeigte brav „0 von 2 gewählt", aber
`c.domains.some(...)` warf, die Transaktion brach ab, und ein nacktes `void`
verschluckte es. Seine Beschreibung war genau richtig: „lassen sich quasi auflisten
aber nicht auswählen." Behoben durch `hydrateCharacterRow` IM Schreibweg (nicht am
einzelnen Feld — jedes Feld mit Standardwert war dieselbe Falle) plus ein `catch`,
das einen fehlgeschlagenen Schreibvorgang wenigstens protokolliert. Lehre: ein
gespeicherter Datensatz ist nie auf dem Stand des Schemas, und ein `void` ohne
`catch` macht jeden Fehler dahinter unsichtbar.

Beim Domänenplatz war die Antwort: die WAHL der Domäne ist eine Eingabe (steht am
Charakter), der PLATZ je Zaubergrad ist eine Folge (steht als Merkmal an der Klasse
und wird gerechnet) — und in welchem der Plätze ein vorbereiteter Zauber sitzt,
gehört gar niemandem: das rechnet die Anzeige aus, gespeichert wird es nicht.

Zweite Falle, aus dem Prüfbericht: **ein Feld, das seinen Wert in eine eigene Kopie
zieht und nur beim Verlassen speichert.** Dabei geht Tippen verloren. Durchschreiben,
nicht zwischenspeichern.

Dritte Falle, aus der Startseite: **eine Klasse, die hinten angehängt wird, gewinnt
nicht.** Tailwind entscheidet bei gleicher Spezifität nach der Reihenfolge im
STYLESHEET, und dort steht `slate` hinter allen Buntfarben. Ein
`bg-emerald-950/40` im `className` einer Karte blieb deshalb wirkungslos — die
Kampagnenfarbe war unsichtbar, obwohl die Klasse am Element stand. Dasselbe für
`p-2` gegen ein eingebautes `p-3`. Wer Farbe oder Polster ändern will, ERSETZT sie
(`Card` hat dafür `tone` und `padding`), statt sie zu ergänzen.

Vierte Falle, ebenfalls von dort: **die angesagte Menge ist nicht die geschriebene.**
Der Hinweis „gilt auch für Torben" hing an der Liste der Bögen mit ABWEICHENDER
Farbe — die ist leer, solange alle dieselbe tragen, also im Normalfall immer. Beim
Schreiben ist der Filter richtig (keine rev-Erhöhungen ohne Bedeutung), bei der
Ansage falsch: angesagt wird, wer BETROFFEN ist, geschrieben, wer sich ÄNDERT.

Fünfte Falle, von seinem iPad-Bild: **ein Abstand, der ein Element einrechnet, das es in
dieser Breite nicht gibt.** Die untere Reiterleiste ist `md:hidden` — ab 768px steht links
die Seitenleiste, unten ist nichts. Der Weiter-Balken des Assistenten rechnete ihre Höhe
aber in JEDER Breite ein und schwebte auf dem iPad deshalb 64px über dem Rand: ein Band
quer durch die Liste, mit Text, der durch die halbdurchsichtige Fläche schien. Sein Wort
dazu: „So hab ich den Balken immer im Weg." Wer eine Höhe aus der Hülle in `bottom-…`
einrechnet, muss sie ab `md` zurückstellen — `ui/UndoBar.tsx` (`md:bottom-4`) und
`ui/SyncBadge.tsx` (`md:bottom-3`) machen es richtig vor. Und geprüft wird in DREI Größen,
nicht in einer: 390×844, 1180×820, 820×1180.

Sechste Falle, und die ist mir jetzt VIERMAL passiert: **CSS `uppercase` verändert
`innerText`.** Wer im Playwright-Lauf gegen einen Titel prüft, der `uppercase` trägt
(`SectionTitle`, die Überschrift der Empfehlungskarte, die Schritt-Marken), bekommt
„ZAUBER FÜR DEINEN BARD" und findet „Zauber für deinen Bard" nicht. Der Test schlägt fehl,
obwohl die App recht hat — und man sucht den Fehler in der App. Regel: **jede Textprüfung
im gebauten Bogen mit `/i`**, außer es geht ausdrücklich um Groß- und Kleinschreibung.

Siebte Falle, aus derselben Runde: **ein `prompt()` ist keine Auswahl.** Für Teilgebiete
zählte der Browser-Dialog die zehn möglichen Werte AUF und stellte ein leeres Feld zum
Abschreiben daneben. Sein Urteil: „Find ich ja irgendwie sehr unprofessionell, dass man da
dann das Ganze abtippen soll, was man auswählt." Wo die App die Möglichkeiten KENNT, gehört
jede einzelne als Knopf hin (`ui/SubtypePicker.tsx`); das Freitextfeld bleibt daneben, weil
die SRD-Listen nicht abschließend sind. Der E2E-Lauf prüft es hart: es darf überhaupt kein
Browser-Dialog mehr aufgehen (`page.on("dialog", …)` muss leer bleiben).

Achte Falle, aus der Ausrüstungs-Übersetzung: **ein Überzug, der nur beim
Neu-Einrichten greift, kommt auf seinem Gerät nie an.** Das Kompendium wird genau dann
neu eingespielt, wenn `manifest.srdRev` im Build höher ist als der Wert in der Datenbank
(`db/seed.ts`). Die 1866 deutschen Namen werden aber NICHT in die Packs geschrieben,
sondern beim Einrichten als `localized.de` übergelegt — die Packs sind also unverändert,
`srdRev` bleibt gleich, und sein iPhone hätte weiter „Longsword" gezeigt. Behoben durch
einen zweiten Stand im gespeicherten Schlüssel (`${srdRev}+de${GERMAN_REV}`): wer die
deutsche Tabelle ändert, erhöht `GERMAN_REV` um eins. Regel: **wer etwas beim Seeding
BERECHNET statt es in die Daten zu schreiben, braucht seine eigene Versionsnummer.**

Neunte Falle, aus demselben Lauf: **die Reiterleiste des Bogens heißt am Handy anders
als im Code.** Unten steht `S.sheet.tabsShort` („Ausr.", „Fert.", „Notiz") mit einem
Symbol darüber, also lautet `innerText` „🎒\nAusr." — ab `md` steht oben eine Chip-Reihe
mit dem vollen „Ausrüstung". Ein `filter({hasText: /^Ausrüstung$/})` traf deshalb am
Handy nichts, und weil meine Hilfsfunktion still `false` zurückgab, prüfte der Test
danach den WERTE-Reiter und meldete, das Gepäck sei leer. Zwei Lehren: beide Formen
prüfen (`nav button` zuerst, dann die Chips) — und **eine Navigationshilfe im Test darf
nicht still scheitern**, sonst zeigt der Fehler auf die falsche Stelle. Dasselbe gilt für
die Gepäckzeile: ihr ERSTER Knopf ist die Anlege-Marke, nicht der Name.

Zehnte Falle, und sie ist mir jetzt ZWEIMAL passiert: **ein `useMemo` hinter einem frühen
`return`.** In `pages/LevelUp.tsx` stand die Rechnung für die Zähler unten bei ihrer
Verwendung — und damit hinter `if (character === undefined) return …`. Solange der
Charakter lud, lief der Hook nicht; sobald er da war, lief er, und React zählte einen Hook
mehr als beim Durchlauf davor: „Minified React error #310", die halbe Seite weiß. Der Lauf
im gebauten Bogen hat es gemeldet, nicht `pnpm test` und nicht `tsc` — ein Hook hinter
einer Bedingung ist gültiges TypeScript. Regel: **jeder Hook steht VOR dem ersten
`return`, oder es ist kein Hook.** Wo die Rechnung billig ist (eine Schleife über die
Zähler, ein Kartenzugriff), ist die einfache Zuweisung die richtige Antwort — genau so
macht es der Assistent bei `advice`. Wo sie teuer wäre, muss der `useMemo` nach oben
wandern und selbst mit dem noch nicht geladenen Zustand umgehen.

Elfte Falle, von seinem Bild der Reiterleiste: **eine Warnfarbe, die auch die
Bedienfarbe ist, ist keine Warnfarbe.** Der Punkt „hier ist noch etwas offen" war
`bg-amber-400` — dieselbe Farbe wie der aktive Reiter, die Sterne an den
Klassenfertigkeiten und jeder Hauptknopf. Am Handy sitzt er zusätzlich AM SYMBOL, und
über „Zauber" steht ✨: ein gelber Punkt an gelben Funken ist kein Punkt mehr. Sein Wort:
„Übersieht man leicht." Zwei Lehren. **Erstens**: eine Farbe, die alles bedeutet, bedeutet
nichts — die Warnung hat jetzt ihre eigene (rosé, `ui/bits.tsx`: `OpenDot`, `OPEN_MARK`,
`OPEN_CARD`), und alle vier Stellen, die „offen" sagen, holen sie von dort. **Zweitens**:
wo ein Zeichen auf einem Emoji liegt, hilft kein Kontrast, weil das Emoji die Farbe
bestimmt — dort trennt ein `ring` in der Farbe des Untergrunds. Nebenbei ist damit auch
die Testsonde ehrlich geworden: sie musste den Punkt am Durchmesser (`w-1.5` gegen `w-6`)
vom Unterstrich des aktiven Reiters unterscheiden, weil beide amber waren.

Zwölfte Falle, und sie ist die Folge einer eigenen Änderung: **ein neuer Zähler macht
jedes `.first()` im Test falsch.** Seit die Aktionspunkte JEDEM Bogen vorgeschlagen werden,
gibt es mindestens zwei Zähler — und die Strecke, die „Untote vertreiben" prüfte, klickte
plötzlich die Knopfreihe des anderen. Der Lauf meldete dann sieben Fehler, von denen keiner
in der App lag. Zwei Lehren: **Klick UND Lesen gehören in denselben Kasten**
(`page.locator("li").filter({hasText:/Untote vertreiben/})`), und der `li` enthält auch die
Knopfreihe, in der alle drei Bedingungen als BESCHRIFTUNG stehen — wer „Kurze Pause ist
weg" prüfen will, muss das Stück nach „füllt sich bei:" ausschneiden, sonst findet er das
Wort auf dem Knopf. Nebenbei war der zuerst gemeldete Fehler richtig und harmlos: ein
voller Zähler wird beim Aufstieg gar nicht angesagt, weil es nichts aufzufüllen gibt.

Und die Falle mit `uppercase` (sechste, oben) ist mir in derselben Runde ZUM FÜNFTEN MAL
passiert: der Grad-Kopf im Zauber-Reiter heißt im `innerText` „GRAD 0", mein `/Grad 0/`
traf nichts, und die Prüfung zeigte auf die App statt auf den Test. Es hilft offenbar
nicht, es aufzuschreiben — deshalb steht es jetzt auch im Kopf der Teststrecken selbst.

Und die Gegenprobe, die dazugehört: 🎒 hat selbst einen runden roten Fleck oben rechts,
genau dort, wo der Punkt sitzt. Im Bild sah der Ausrüstungs-Reiter deshalb aus, als
trüge er einen — er tut es nicht (auf den Ausrüstungs-Reiter zeigt gar keine Warnung).
Wer eine Marke an einem Symbol prüft, prüft sie im DOM und nicht am Bild.

Dreizehnte Falle, und sie ist die BÖSE Verwandte der ersten Fehlerfamilie: **der Router
merkt sich `window.scrollY`, und diese App scrollt nicht das Fenster.** Sein Einwand war
„springt der immer an Seitenanfang. Das ist blöd." Die naheliegende Antwort ist ein
`scrollRestoration: true` am Router — eine Zeile, die nichts tut: gescrollt wird das
`main` mit `overflow-y-auto` in `ui/Layout.tsx` (Kopf und Reiterleiste sollen stehen
bleiben), `window.scrollY` ist immer 0. Gemerkt hätte sich der Router also die 0, und
die hätte er auch brav wiederhergestellt. Gefunden hat es nur der Lauf im gebauten
Bogen, weil er die ECHTE Zahl gemessen hat — hätte er `window.scrollY` geprüft, hätte er
0 gegen 0 verglichen und einen kaputten Zurück-Weg für grün gehalten. **Wer eine
Scroll-Höhe prüft, muss den Kasten messen, der wirklich scrollt.**

Und die zweite Hälfte davon, die einzeln genauso wirkungslos wäre: **beim Zurückkommen
ist die Liste noch nicht da.** Der Bogen holt seinen Charakter aus der Datenbank; im
ersten Bild ist der Kasten leer und damit 0 Pixel hoch, ein einmaliges `scrollTop = 900`
verpufft dort. `data-scroll-restoration-id` scheitert an genau dem (der Router setzt zu
früh) — deshalb setzt `lib/scrollMemory.ts` die Höhe über einige Bilder NACH, bis sie
sitzt, und hört sofort auf, sobald er selbst anfasst (Finger, Rad, Taste). Eine App, die
gegen den Daumen scrollt, ist schlimmer als eine, die die Höhe vergisst.

Und die zwölfte Falle noch einmal, diesmal von der anderen Seite: **wer per `.last()`
einen Kasten ERRÄT, prüft irgendwann den falschen.** `page.locator("div").filter({hasText:
/^grad 0/i}).last()` traf den Grad-0-Block, solange der Kopf ein `div` war; seit er ein
Knopf ist, griff die Auswahl über den Kasten hinaus und meldete das „Vorbereiten" von
GRAD 1 als Fehler von Grad 0 — 17 von 18, und der Fehler zeigte auf die App, die recht
hatte. Jeder Zaubergrad IST ein `section`: dort wird gezählt, und gezählt werden KNÖPFE,
nicht Textstellen („vorbereitet" steht auch im Blockkopf „Cleric — vorbereitet" und im
Erklärtext). Dazu gehört die Gegenprobe: Grad 0 hat 0 Vorbereiten-Knöpfe, Grad 1 hat 31 —
sonst hätte ich zu viel entfernt und es nicht gemerkt.

Vierzehnte Falle, und sie kostet vor allem SUCHZEIT: **ein `*/` im Text eines
Blockkommentars beendet ihn.** In `strings.test.ts` erklärte ein Kommentar, warum die
Notiz daneben ein `/** … */`-Block ist — und genau diese drei Zeichen im Erklärtext
schlossen den Kommentar zwanzig Zeilen zu früh. Alles danach war plötzlich Code, und
esbuild meldete „Expected ; but found $" an einer völlig gesunden Zeile weiter unten.
Man sucht den Fehler dann dort, wo er gemeldet wird, und dort ist er nicht. Regel: **in
einem Kommentar keine Kommentar-Zeichen ZEIGEN** — beschreiben („ein Block, dessen Zeilen
alle einen Stern tragen") statt hinschreiben. Dieselbe Familie wie die deutschen
Anführungszeichen: ein Zeichen, das die Sprache selbst benutzt, gehört nicht in einen
Text über die Sprache.

Und die Verwandte davon aus derselben Runde, diesmal in einer PRÜFUNG: **eine Schranke,
die eine Formatierung verlangt statt einen Zustand zu lesen, meldet irgendwann am
falschen Ort.** Die erste Fassung der Kürzel-Prüfung hielt eine Zeile für einen Kommentar,
wenn sie mit einem Stern ANFÄNGT — und meldete damit die alte Notiz in `strings.ts`, die
eingerückter Fließtext ist und genau diese Umbenennung erklärt. Ein Block-Kommentar ist
ein Block: was zwischen Anfang und Ende steht, ist Kommentar, ganz egal wie eingerückt.
Jetzt läuft die Prüfung als kleiner Zustandsautomat über die Datei.

## Beantwortete Entscheidungen (nicht neu fragen)

- **Geräte:** iPhone UND iPad, beide. Deshalb war der Abgleich-Fehler dringend — er
  ist behoben (Abzweigpunkt je Regal, siehe `sync/merge.ts`).
- **Abgleich: nur beim Start.** Wörtlich: „Mitten drin ist Quatsch denn ich spiele ja nicht
  auf 2 Geräten gleichzeitig. Deaktiviere die Funktion. Nicht löschen!" Also deaktiviert
  statt entfernt (`MID_SESSION_SYNC`), Einzelheiten im eigenen Abschnitt weiter unten. Nicht
  neu fragen — auch nicht „wäre einmal pro Stunde nicht praktisch".
- **Zauberplätze: − verbraucht, + gibt zurück.** Wörtlich: „Bei den Zaubern würde ich gerne
  + und - in der Funktion vertauschen. Das ist aus meiner Sicht logischer." Er hat recht: die
  Zahl im Grad-Kopf zeigt die FREIEN Plätze, ein „+" durfte sie nie kleiner machen. Gespeichert
  wird weiter die Gegenzahl (`usedSlots`) — der Knopf gehört zur Anzeige, nicht zum Speicher.
- **Turn Undead: 7.** Seine Notiz hat recht (3 + CHA + 4 vom Talent), die 8 in Fight
  Club war ein alter Stand. Der Zähler rechnet, er speichert nicht.
- **Die Hauptnavigation sitzt am Handy OBEN.** Wörtlich: „Die untere Menü Leiste soll bitte
  ganz nach oben wandern." Gemeint ist die Hauptnavigation (Charaktere · Kompendium · Würfel
  · Einstellungen), nicht die Reiterleiste des Bogens — die bleibt unten in Daumenreichweite
  und ist nur nachgerutscht. Ab `md` ändert sich nichts: dort steht die Navigation links als
  Seitenleiste.
  **Und das ist die fünfte Falle in der ANDEREN Richtung.** Fünf Stellen rechneten die Höhe
  der Leiste unten ein — die Reiterleiste des Bogens, der Weiter-Balken des Assistenten, die
  Rücknahme-Meldung, die Abgleich-Marke, das Polster des Inhalts. Wer eine Höhe aus der Hülle
  einrechnet, muss sie zurückstellen, sobald die Hülle sie nicht mehr hat: aus 7rem wird
  3,5rem, aus `bottom-[3.5rem]` wird `bottom-0`, aus `pb-` wird `pt-`. Ein Wert zu viel ist
  hier kein kleiner Fehler, sondern genau das Band, das 56px über dem Rand schwebt.
  Dazu ein Punkt, der leicht untergeht: oben heißt `env(safe-area-inset-TOP)`. Ein Polster
  für den falschen Rand ist so gut wie keines — auf dem iPhone liegt oben die Dynamic Island.
- **Domänen: fehlten wirklich.** Gebaut: Heal/War als Wahl am Charakter, ein
  Domänenplatz je Zaubergrad ab 1, die Domänenzauber in der Auswahl, und der Import
  liest seine Notiz „Domains".

- **Zweiwaffen-Mali: gelten an seinem Tisch.** Wörtlich: „der zwei waffen angriff
  malus gilt bei uns." Gebaut als Schalter in den Kampfoptionen, die Höhe als
  Folge aus (Zweitwaffe leicht?) × (Talent?) — −6/−10 · −4/−8 · −4/−4 · −2/−2.
  Sein Wort deckt den ANGRIFF; der halbe Stärkeschaden der zweiten Hand ist eine
  eigene Frage und noch offen.
- **Rast: zwei Zeilen im ⋯-Menü, TP bleiben unberührt.** Der Mond in jedem
  Zauberblock ist weg — wörtlich: „Mond überall entfernen. Rasten soll irgendwo
  anders zentral sein nicht ein Button den man versehentlich drückt ohne zu wissen
  was passiert ist." Gebaut als „Rast (8 Stunden)" (Zauberplätze aller Klassen +
  Tageszähler) und „Kurze Pause" (nur Tageszähler, „Ja, ohne Zauberplätze"), beide
  mit Ansage der echten Zahlen vorher und Rücknahme danach. Gefragt und
  entschieden: TP fasst die Rast NICHT an („weiter nichts anfassen"), temporäre TP
  überdauern eine Nacht („bleiben stehen"). Die Regel-Funktion steht in
  `core/engine/rest.ts`; `planRest` rechnet, `applyRest` führt genau diesen Plan
  aus. Die kurze Pause ist eine Hausregel seines Tisches — im Regelwerk füllen sich
  Fähigkeiten pro Tag erst nach acht Stunden.
- **Iterative Angriffe ab BAB +6: sein Tisch spielt sie.** Wörtlich: „Wir spielen bei
  6bab mit zwei Angriffen." Damit ist die letzte große offene Frage beantwortet, und
  zwar mit „alles bleibt" — der Bogen zeigt die Reihe seit dem ersten Tag. Die Zahl
  ändert sich also NICHT, aber die Regel hat jetzt einen Test
  (`core/engine/iterativeAttacks.test.ts`): eine Regel, die man nicht geändert hat, hat
  keinen Commit, an dem sie ablesbar wäre, und ohne Test sieht die zweite Zahl wie eine
  unbelegte Annahme aus. Geprüft wird die Grenze von BEIDEN Seiten (+5 einer, +6 zwei)
  und dass die Reihe wirklich am Bogen landet.
- **Der Wert heißt BAB, nicht GAB.** Wörtlich: „Bitte auch immer bab nennen." Die
  Entscheidung „Regelkürzel bleiben englisch" gab es längst, aber am Bogen stand „GAB",
  in den Einstellungen „Fraktionale BAB/Saves" und in der Engine „BAB" — **ein Wert mit
  zwei Namen, und keiner davon überall.** Dasselbe hatte „4+IN Punkte" überlebt (an drei
  Stellen). Beides ist jetzt englisch, und `strings.test.ts` verbietet die deutschen
  Kürzel im Quelltext: eine Entscheidung, die nur als Prosa in dieser Datei steht, ist
  nachweislich keine Schranke.
  **Und der BAB steht am Angriff dabei**, in beiden Fassungen: am Handy „2 Angriffe pro
  Runde (BAB +6)", ab `sm` der ganze Satz „Volle Attacke aus BAB +6: …". Er hat den
  besseren Grund dafür geliefert, als ihm vermutlich klar war — die Reihe „+9/+4" kommt
  aus dem BAB und nicht aus der Zahl, die daneben steht.
- **Die Trefferpunkte heißen HP, nicht TP.** Wörtlich: „TP bitte in HP umbenennen." Dieselbe
  Familie wie GAB → BAB, eine Runde später, und der Umfang war größer als er klingt: **rund
  zwanzig Stellen in vier Dateien und ZWEI Paketen**, dazu vier deutsche Texte in den Packs
  selbst (`conditions.json`, `feats-1.json` — die haben eine Quelle in `tools/etl`, also
  wurde dort geändert und `srdRev` erhöht). Die Kürzel-Prüfung liest jetzt **beide** Pakete;
  vorher hätte sie grün gemeldet, während die halbe App das alte Wort zeigt. Sie hat dabei
  drei Stellen gefunden, die ich von Hand übersehen hatte (Vergleichsseite, Import-Bericht,
  eine Warnung in `validate.ts`).
  Das deutsche WORT „Trefferpunkte" bleibt in Erklärsätzen stehen — verboten ist die
  Abkürzung. Die Feldnamen im Code (`hp`, `tempHp`, `hpRoll`) waren schon englisch und
  wurden nicht angefasst: eine Datenbank-Wanderung für einen Namen wäre Risiko ohne Nutzen.
- **Zwei Angriffe ab BAB +6 stehen jetzt EINMAL deutlich da.** Wörtlich: „das mit dem
  zweifachen Angriff deutlicher aufnehmen sobald der Char einen BAB 6 erreicht. Auch beim
  leveln." Gebaut als abgesetzte Zeile über der Angriffsliste (ohne Tap sichtbar) und als
  Ansage im Stufenaufstieg. Verglichen wird dort die ANZAHL vorher gegen nachher und nicht
  der BAB gegen 6 — damit stimmt es auch für +11 und +16, und bei 6 → 7 steht es nicht da.
  Ein Satz, der immer dasteht, wird nicht gelesen.
- **Der Trefferwürfel beim Aufstieg ist der der gesteigerten Klasse.** Wörtlich: „wir
  bekommen immer den HD der Klasse die wir leveln." Das tat die App schon richtig; neu ist
  der Test dafür (Kämpfer 3 + eine Kleriker-Stufe = W8, nicht W10). Und die zweite Hälfte
  seines Satzes ist der Grund, warum nichts umgerechnet wird: „Anfangs haben wir auch
  gewürfelt, deswegen passt hikes TP nicht ganz." Gewürfelte Stufen bleiben Zahl für Zahl
  stehen — genau deshalb steht `hpRoll` an der STUFE und nicht als Hausregel über allen.
  **Was NICHT dazugehört: ein Satz über seinen Tisch.** Ich hatte „Euer Tisch spielt die
  Reihe ab BAB +6." angehängt; sein Wort dazu: „Das „euer Tisch…" kann raus." Er hat recht,
  und der Grund ist mehr als Kürze — der Satz erzählte ihm eine Regel, die er selbst
  gesetzt hat, an einer Stelle, an der er mitten im Kampf eine ZAHL sucht. Die Auslassung
  steht als Prüfung in `strings.test.ts` und in der Teststrecke, sonst kommt sie beim
  nächsten Mal als gut gemeinte Ergänzung zurück.
- **Startseite: Kampagne mit Farbe, keine TP, Karten in Stufen.** Gefragt und
  entschieden: eintragen an ALLEN DREI Stellen (Bogen bei Name/Spieler, ⋯-Menü der
  Karte, Assistent) · **nach Kampagne gruppieren**, nicht nur färben · **in Stufen
  kleiner werden, dann scrollen** — keine zweite Spalte auf dem iPad, „ab etwa zehn"
  wird gescrollt. Die Kartengröße RECHNET (`ui/cardTier.ts`, vier Stufen gegen 634px
  bei 390×844); kommt eine Kampagnen-Überschrift dazu, rutscht die Stufe von allein.
  Der Kampagnenname steht in der Abschnitts-Überschrift, nicht zusätzlich auf jeder
  Karte — die trägt die Farbe.
- **Talentfilter: Handtabelle, nicht die eingetragenen Effekte.** Gefragt und
  entschieden: „Handtabelle: was das Talent verbessert." Der Grund war ein Befund —
  von 327 Talenten tragen nur **27** einen maschinenlesbaren `effect`; ein Filter
  darauf hätte 300 Talente versteckt. Also 13 Kategorien nach den Werten, die am Bogen
  stehen (Angriff, Schaden, RK, Rettung, Fertigkeiten, Zauber, TP, Initiative,
  Bewegung, Handlungen, Übung, Herstellen, Besonderes), handverlesen für alle **175
  nicht-epischen** Talente in `core/compendium/featBonus.ts`. Episch wird GERECHNET
  („Epic Toughness" ist Toughness), nicht zweitabelliert — zwei Tabellen wären zwei
  Wahrheiten. Die Zuordnung steht beim Aufklappen als „Wirkt auf: RK" dran, weil eine
  Handtabelle, die man nicht ansehen kann, eine Meinung ist.

- **Warnung, wenn etwas offen ist.** Sein Auftrag: „Wir brauchen eine Warnung wenn man
  etwas vergessen hat. Wenn man zb ein Talent zu wenig oder noch skill Punkte offen
  sind." Gefragt und entschieden: **Punkt am betroffenen Reiter** UND **Marke auf der
  Startseite** (kein Band oben am Bogen) · gewarnt wird über **Fertigkeitspunkte,
  Talent-Slots und unbelegte Zauberplätze** · am Ende von Assistent und Stufenaufstieg
  **warnen und einmal nachfragen**, nicht sperren · und **„passt so" je Bogen und je
  Warnung**. Die Prüfungen stehen als PAAR bei ihrer jeweiligen anderen Hälfte in
  `core/engine/validate.ts`; die Anzeige-Regeln in `core/engine/issues.ts`.

## Die dritte Fehlerfamilie: etwas WEISS es, und etwas anderes KANN es nicht

Sein Satz: „Es kommt kein Update." Zwei Fehler lagen auf demselben Weg, und jeder
sah für sich richtig aus:

1. **Der Knopf konnte es nicht.** Die Versionsmarke fragte `version.json` ab (das
   liegt bewusst außerhalb des Cache — gut gebaut) und meldete richtig „veraltet".
   Ihr `onClick` war `window.location.reload()`. Der Service Worker registriert aber
   `new NavigationRoute(createHandlerBoundToURL("index.html"))` — **jede Navigation
   wird aus dem Precache beantwortet.** Ein Neuladen brachte also garantiert die
   alte App zurück. Die Marke konnte ewig „veraltet" sagen; der Knopf daneben konnte
   daran nichts ändern.
2. **Es suchte niemand.** `registerSW` prüft nur beim LADEN der Seite auf ein neues
   `sw.js`. Eine installierte Web-App auf dem iPhone wird aus dem Hintergrund geholt
   und nie neu geladen — die Prüfung lief nie, und das `confirm("Update verfügbar")`
   ging nie auf.

Lehre, und sie gilt über die PWA hinaus: **eine Anzeige, die etwas weiß, und eine
Aktion, die es nicht kann, sind zusammen schlimmer als keine Anzeige.** Wer einen
Zustand meldet, muss den Weg dorthin mitprüfen — im Zweifel im gebauten Bogen, mit
zwei echten Ständen hintereinander (`e2e-update.mjs` macht genau das).

Konkret für diese App: `window.location.reload()` ist in einer PWA KEIN Weg zu einer
neuen Fassung. Der Weg steht als Leiter in `lib/swUpdate.ts` — wartenden Worker
übernehmen, sonst `registration.update()` und noch einmal schauen, und erst zuletzt
den Zwischenspeicher leeren (das kostet die Offline-Bereitschaft, deshalb zuletzt).
Gesucht wird bei Rückkehr in den Vordergrund, bei „wieder online" und halbstündlich.

### Der stillste Fall dieser Familie: ein fehlgeschlagenes Speichern

Er stand monatelang als offener Punkt in dieser Datei — und der Satz, mit dem er dort
stand, war schon die Diagnose: „Es steht jetzt in der Konsole, aber auf dem Handy
schaut da niemand hinein."

Das ist dieselbe Familie in ihrer leisesten Form: die App WEISS, dass ein Tap verloren
ging, und sagt es an einer Stelle, die auf einem iPhone gar nicht erreichbar ist.
Sichtbar bleibt nur, dass eine Zahl zurückspringt — und wer das am Tisch erlebt, sucht
den Fehler in seinen Fingern. Genau so hat der Domänen-Fehler ausgesehen („lassen sich
quasi auflisten aber nicht auswählen").

Gebaut als Band unter der Hauptnavigation (`ui/SaveErrorBar.tsx`, Speicher in
`lib/saveError.ts`), und drei Entscheidungen daran sind eine Notiz wert:

- **Das Band trägt einen ECHTEN zweiten Versuch**, nicht bloß einen Knopf. Das ist die
  Lehre dieses Kapitels, wörtlich angewendet: gemeldet wird nur, was auch einen Weg
  hat. Jede Schreibstelle übergibt deshalb ihren Aufruf als Funktion (`const write =
  () => …`), und der Knopf ruft genau diesen noch einmal. Dass er beliebig oft laufen
  darf, liegt an `CharacterRepo.mutate`: es arbeitet auf dem FRISCHEN Datenbankstand
  und nicht auf dem von damals. Die Teststrecke klemmt dafür den Schreibweg wirklich
  ab (`IDBObjectStore.prototype.put` wirft) und gibt ihn wieder frei — sonst wäre der
  Knopf ungeprüft.
- **Der Grund steht in seinen Worten.** `describeSaveError` macht aus
  `QuotaExceededError` den Satz „Der Speicher des Geräts ist voll" — kein Fachjargon,
  dieselbe Regel wie „Regal" statt Gist. Die Konsole behält das ganze Fehlerobjekt mit
  Stapel; dort sucht man, in der Leiste liest man.
- **Angeschlossen sind ALLE Schreibwege**, nicht nur der Bogen: Rast und ihre
  Rücknahme, Kampagne, Farbthema, Kampagnenfarbe der Geschwister, eigener
  Gegenstandstyp (anlegen, ändern, löschen), Zurückholen im Kompendium, Kopieren,
  Löschen, der Stufenaufstieg und das Anlegen im Assistenten. Bei den drei letzten
  passiert außerdem der FOLGESCHRITT nicht mehr, wenn das Schreiben scheitert — vorher
  navigierte der Aufstieg weiter und der Bogen stand ohne die neue Stufe da.

Zwei Dinge hat erst der Lauf gefunden. **`String(undefined)` ergibt „undefined"** — eine
nicht-leere Zeichenkette, die als Grund durchgekommen wäre und wörtlich in der Leiste
gestanden hätte; jetzt zählt nur ein Fehlerobjekt oder eine geworfene Zeichenkette.
Und **`IDBDatabase.prototype.transaction` ist nicht der Weg, an dem Dexie 4
vorbeikommt**: die erste Fassung der Strecke klemmte dort ab, der Klick ging durch, und
die Prüfung meldete ein fehlendes Band, das die App zu Recht nicht gezeigt hat.

## Die zweite Fehlerfamilie: eine Schranke, die nur eine Richtung prüft

`validate.ts` meldete jahrelang, wenn ein Topf ÜBERZOGEN war, und schwieg, wenn etwas
darin liegen blieb — bei Fertigkeitspunkten, Talent-Slots und vorbereiteten Zaubern
gleich dreimal. Die Zahlen dafür rechnete die Engine längst (`skillPoints`,
`featSlots`); es fehlte nur der Satz dazu. Die einzige Ausnahme waren die Domänen, und
zwar weil sie erst spät dazukamen und deshalb von Anfang an `!==` prüften statt `>`.

Lehre: **wer `>` schreibt, muss `<` mitdenken.** Beide Hälften stehen jetzt
unmittelbar beieinander, weil sie sich ausschließen müssen („3 zu viel ausgegeben" und
„3 noch offen" dürfen nie zusammen dastehen) — und der Test prüft genau das.

Dazu zwei kleinere Fallen aus derselben Runde:

- **Ein Abstell-Schlüssel darf keine Menge enthalten.** Hieße „passt so" bei sechs
  offenen Punkten `skill-points-open:6`, wäre der Schalter bei fünf wieder wirkungslos
  — scheinbar zufällig vergessen. Der Schlüssel trägt deshalb nur die Art, und die
  Menge steht daneben (`upTo`): so gilt die Entscheidung für genau das, was er gesehen
  hat, und wächst der Rest, meldet sich die App wieder. Der Test verbietet jede Ziffer
  im Schlüssel.
- **Ein Schalter ohne Rückweg ist Löschen.** Abgestellte Hinweise werden nur MARKIERT,
  nicht entfernt, und stehen gedämpft unter „1 Hinweis ist abgestellt — wieder zeigen".
- **Einen Bogen löschen: nichts wird getippt.** Die Abfrage hat drei Fassungen gehabt und
  ist jedes Mal kürzer geworden: den NAMEN abtippen („finde ich übertrieben"), dann der
  feste Code „1337", jetzt gar nichts — wörtlich: „Schmeiß bitte das 1337 Passwort raus.
  Brauchen kein Passwort." Der Weg bleibt dreistufig (Gefahrenzone → „Charakter löschen …"
  → roter Knopf), weil das die Hürden sind, die ihn nie gestört haben.
  **Und der Rest des Schutzes wandert in den Knopf:** dort steht jetzt „Löschprobe
  endgültig löschen" mit dem Namen darin. Was der Code geleistet hat, war nie der Schutz
  vor dem Löschen, sondern der davor, den FALSCHEN Bogen zu erwischen — und den kann die
  Beschriftung tragen, ohne dass jemand tippt.
  Dazu eine Anordnungs-Entscheidung, die ohne das Eingabefeld erst nötig wurde:
  **„Abbrechen" steht VOR dem roten Knopf.** Vorher lag das Feld dazwischen; ohne es
  würden die zwei Stufen genau übereinander liegen, und der zweite Tipp eines Doppeltipps
  träfe sofort „löschen". Der Test prüft die Reihenfolge im DOM, nicht bloß, dass beide da
  sind.

- **Eigene Gegenstandstypen löschen: ja.** Sein Wort dazu ist da. Gebaut wie die
  Talentwahl — **gesperrt mit Notausgang**: die App nennt die betroffenen Bögen
  NAMENTLICH und sagt, was passiert (der Bogen verliert RK bzw. Angriffszeile), und
  wer trotzdem will, bestätigt mit „Ja, mein DM erlaubt es". Gelöscht heißt
  MARKIERT (`deletedAt`), und der Rückweg steht im Kompendium unter „Gelöschte
  zeigen" mit „Zurückholen". Zwei Sachen fielen erst im gebauten Bogen auf: der
  Schalter muss **nur** die Gelöschten zeigen (zwischen 1866 Gegenständen findet man
  sonst nichts, und die Liste hört bei 300 auf), und er darf nicht am gemerkten
  Zustand hängen — holt man den letzten zurück, verschwand der Knopf, der Filter
  blieb an, und das Kompendium stand leer da. Dieselbe Falle wie beim Talentfilter.
- **Zähler bei der Rast: einstellbar.** Wörtlich: „ja, bzw soll man das selber
  einstellen können." `refillOf` in `core/engine/trackers.ts` ist die EINE Stelle, die
  die Frage beantwortet — mit Rückfall auf die alte Ableitung für alles, was schon
  gespeichert ist. Der Rückfall ist „short" und nicht „long": die kurze Pause füllte
  bisher die Tageszähler, und das war seine Entscheidung. Ein Test hat genau diesen
  Rückschritt gefangen. Der Fight-Club-Import schreibt `resetType 1` jetzt ins FELD
  statt als Satz in die Notiz.
- **Welche Bedingungen: lange Rast · kurze Pause · Stufenaufstieg.** Sein Auftrag: „Der
  Zähler reset soll schon automatisch passieren aber halt nur wenn es für den Zähler für
  eine lange Rast aktiviert ist." Vorgeschlagen hatte ich fünf, gestrichen hat er zwei —
  wörtlich: „Begegnung kann weg / Neuer Tag auch raus." Geblieben ist, was die App
  WEISS: acht Stunden, seine Hausregel-Pause, und der Stufenaufstieg. Mehrere zugleich
  möglich, deshalb eine Knopf-Reihe und keine ⟳-Schleife mehr — bei drei Werten war das
  Durchschalten noch vertretbar, bei einer Menge ist es Raten. **Und die Richtung ist
  jetzt wählbar** (`resetTo`: „voll" oder „0"): ein Zähler kann auch etwas MITZÄHLEN,
  das eine Rast wieder auf null stellt. „voll" bleibt der Standardwert, weil ein stiller
  Wechsel auf 0 jeden bestehenden Zähler geleert hätte.
- **Ein Feld, das schon ausgeliefert ist, wird übersetzt und nicht umgebaut.** `refill`
  stand als `"long" | "short" | "never"` auf seinem Gerät. Der Typ ist deshalb eine
  Vereinigung aus dieser ersten Fassung und der neuen Liste, und `refillOf` liest beide.
  Eine Datenbank-Wanderung für drei Werte wäre mehr Risiko als Nutzen, ein zweites Feld
  daneben wären zwei Wahrheiten. Dass die kurze Pause die lange Rast EINSCHLIESST, steht
  auch dort und nicht in der Oberfläche — so ist der Zustand „nur kurze Pause, aber nicht
  die lange Rast" gar nicht herstellbar.
- **Der Stufenaufstieg sagt vorher an, welcher Zähler zurückgeht.** Gerechnet gegen den
  Bogen NACH dem Aufstieg (`planLevelUpRefill`), damit eine stufenabhängige Grenze schon
  die neue ist, und ausgeführt mit derselben Funktion wie bei der Rast
  (`applyTrackerLines`) — was er gelesen hat, passiert danach. Dieselbe Trennung wie
  zwischen `planRest` und `applyRest`.
- **Eine Rast, die nichts tut, sagt warum.** Vorher stand dort immer „alle Plätze
  sind frei und die Zähler voll" — auch wenn ein Zähler bei 2 von 3 stand und bloß
  nicht mitrastet. Eine falsche Auskunft, gefunden im gebauten Bogen.

## Martins Hausregeln — beantwortet und entschieden

Martin, sein Spielleiter, hat geantwortet. Sechs Regeln, hier wörtlich, mit dem was
jeweils daraus folgt. **Diese sechs sind entschieden — nicht neu fragen.**

1. **„TP bei Levelup: volle Hit Die der Klasse (Krieger +10), kein Wurf."** Und auf die
   Rückfrage, ob das auch für die schon eingetragenen Stufen gilt: **nur ab dem nächsten
   Aufstieg.** Bestehende Bögen bleiben Zahl für Zahl, wie sie sind — genau deshalb wird
   der Wert beim Aufstieg als `hpRoll: "max"` an die STUFE geschrieben und nicht als
   Hausregel-Schalter, den die Engine über alle Stufen legt. Ein Schalter hätte jeden
   gespeicherten Wurf neu gedeutet; das ist die Fehlerfamilie 1 in ihrer bösen Form
   (dieselbe Zahl bedeutet plötzlich etwas anderes). Der Würfel-Knopf verschwindet damit
   auch: „kein Wurf" heißt kein Knopf.
2. **„Trainer 0 Spells: müssen nicht vorbereitet werden, allgemein lockere Handhabung,
   gilt für alle."** „Trainer 0" ist Grad 0. Auf die Rückfrage, ob die Plätze weiter
   mitzählen: **Plätze bleiben, nur die Wahl fällt weg** — ein Cleric 1 hat weiter drei
   Grad-0-Plätze am Tag und entscheidet beim Wirken, welcher Zauber es wird. „Gilt für
   alle" heißt ALLE Klassen, auch der Magier (den er selbst nicht genannt hatte) und die
   spontanen. Folge in der App: auf Grad 0 kein Vorbereiten mehr, und die Warnung
   „Zauberplätze nicht belegt" zählt Grad 0 nicht mehr mit — dort ist nichts zu belegen.
3. **„Action Points: Reset bei Stufenaufstieg."** Zusammen mit seinem früheren
   „Actionpoints hat jeder 6" ist der Zähler damit vollständig: Vorschlag für JEDEN
   Charakter, Höchstwert 6, `refill: ["levelUp"]`. Ausdrücklich NICHT „short" — genau
   dieser Rückfall war der Grund, den Vorschlag vorher nicht zu bauen.
4. **„Zweihändig / 1,5x Stärke: wird immer angewendet, auch bei negativem Mod."** Das ist
   das Verhalten, das die App schon hat (`Math.floor(strMod * 1.5)`, aus −1 wird −2).
   Nichts zu ändern — aber jetzt steht ein Test daneben, der es festhält, damit es nicht
   jemand später als Fehler „aufräumt".
5. **„Zweiwaffenkampf: Off Hand nur halber Stärkebonus (relevant für Daniel)."** Das
   verschiebt Zahlen auf einem bestehenden Bogen, und sein Wort deckt es ausdrücklich —
   er nennt Daniel selbst. Gerechnet als `Math.floor(strMod / 2)`, dieselbe Rundung wie
   im Anderthalbfach-Pfad: +4 → +2, +3 → +1, −1 → −1.
6. **„Sterben: Tod erst bei HP gleich negativem CON Wert. Zwischen 0 und minus CON Mod:
   Selbststabilisierung per Fort Save DC 10 (oder DM Ermessen). Unterhalb des negativen
   Mods: keine Probe mehr, automatisch 1 HP Verlust pro Runde."** Achtung auf den
   Unterschied im Satz: der Tod steht beim negativen CON-**WERT** (CON 14 → tot bei −14),
   die Probenzone endet beim negativen CON-**MODIFIKATOR** (−2). Das sind drei Zonen, und
   damit bekommt das Hausregel-Feld `deathAt` („negCon") endlich eine Wirkung.

### Power Attack mit leichter Waffe — seine Entscheidung, und der Weg dorthin

Sein Befund: **„Wenn der Würfel an ist. Dann sollte die power attack auch auf den
Schadenswurf gerechnet werden."** Nachgemessen war die Anzeige aber richtig: der
Schadenswurf enthält Power Attack längst (Langschwert mit PA 4: `1d8+4` → `1d8+8`, und der
Würfel liefert wirklich `d8: [4]+8`). **Außer bei einer leichten Waffe** — dort verbietet
der SRD den Bonus, und der Angriffsmalus gilt trotzdem.

Erst sein zweiter Satz machte es eindeutig: **„Ich kämpfe mit kurzschwert und Schild."**
Das Kurzschwert steht in den Packs als `handedness: "light"`, und „leicht" ist eine
Eigenschaft der WAFFE und nicht des Platzes — mit Schild in der anderen Hand bleibt es
leicht. Power Attack kostete ihn also Trefferchance und brachte nichts.

Seine Rückfrage darauf war die genau richtige (**„Oder gilt power attack beim Kurzschwert
nie?"** — ja, nie), und mit dieser Auskunft hat er entschieden: **„Bei uns zählt sie
trotzdem."** Gebaut als `powerAttackLightWeapons`, **Standard AN**, gelesen an genau EINER
Stelle (`meleeDamage` in `core/engine/combatOptions.ts`).

Drei Dinge daran sind eine Notiz wert:

- **Das ist die erste Runde, in der eine Zahl auf einem bestehenden Bogen wandert** — und
  sie wandert nur, weil er nach der Regelauskunft ausdrücklich zugestimmt hat. Die Frage
  vorher war Pflicht (Ausnahme 1 oben), die Antwort ist die Deckung.
- **Ist die Hausregel AUS, sagt die Zeile jetzt warum** („Leichte Waffe: Power Attack gibt
  hier keinen Schaden — der Angriffsmalus gilt trotzdem"). Das war die eigentliche Ursache
  seines Befunds: die App wusste es und schwieg. Ein Zustand ohne Satz ist ein Fehler, den
  man in der Zahl sucht.
- **Und der Erklärtext am Feld musste mitwandern.** Dort stand „mit leichter Waffe gar
  nicht", während die Rechnung das Gegenteil tat — ein Text, der der Zahl neben sich
  widerspricht, ist schlimmer als keiner. **Gefunden hat das der Blick auf ein Bild, kein
  Test**, und deshalb prüft die Strecke jetzt beide Fassungen des Hinweises.

Eine Schranke ist nebenbei mit eingebaut: eine leichte Waffe bekommt auch mit Hausregel
NIE das Doppelte. „Power Attack zählt auch mit leichter Waffe" heißt nicht „eine leichte
Waffe ist ein Zweihänder" — sonst käme aus einem Kurzschwert im Platz „beide Hände" still
der doppelte Bonus.

**Alle sechs sind gebaut**, in zwei Runden: erst 3, 4, 5 (Aktionspunkte, der Test zum
Anderthalbfachen, die zweite Hand), dann 1, 2, 6 (volle Trefferwürfel, Grad-0-Zauber,
Sterbe-Zonen).

Drei Dinge daran sind einer Notiz wert:

- **Die Sterbe-Regel hat ihr eigenes Modul** (`core/engine/dying.ts`), weil sie zwei
  Grenzen hat, die man leicht verwechselt: die Probenzone endet beim CON-**Modifikator**,
  der Tod steht beim CON-**Wert**. Bei CON 14 also Probe bis −2, tot bei −14 — wer hier
  den Modifikator für den Wert nimmt, tötet Charaktere zwölf Punkte zu früh. Der Zustand
  ist eine FOLGE (`sheet.hp.state`) und darf nie in `conditionIds` landen; die Versuchung
  ist eingebaut, weil es dort anklickbare Zustände „sterbend" und „stabil" gibt. Genau
  EINE Eingabe hat die Regel: `hp.stabilized`, das Ergebnis der Fort-Probe am Tisch — und
  neuer Schaden löscht sie in `applyHpChange`, nicht in der Oberfläche.
- **`deathAt` hat jetzt einen Leser UND einen Schalter.** Vorher war es das Musterbeispiel
  für „etwas weiß es, und etwas anderes kann es nicht": ein gespeichertes Feld ohne
  Wirkung und ohne Bedienelement. Der Standard steht jetzt auf `negCon` (seine Tischregel)
  — ein nie gezeigter Standardwert ist keine Entscheidung, die man erhalten müsste. Und am
  Bogen steht die Grenze als ZAHL („tot bei −14"), damit eine falsche Einstellung sofort
  auffällt statt still zu wirken.
- **Grad 0 zählt nicht mehr in der Warnung.** Wo nichts zu belegen ist, kann nichts offen
  sein. Die Plätze selbst BLEIBEN (seine Entscheidung) und stehen weiter im Zauber-Reiter
  — nur „Vorbereiten" verschwindet dort, und zwar nur bei Vorbereitern: ein Hexenmeister
  entscheidet ohnehin erst beim Wirken.

Zwei Dinge, die beim Bauen von 3 auffielen und mitgeradegerückt wurden: ein Vorschlag
kann jetzt seine Auffüll-Bedingung MITGEBEN (`TrackerSuggestion.refill`), weil ein Zähler
ohne sie auf „kurze Pause" zurückfällt — bei den Aktionspunkten wäre das genau die
falsche Antwort. Und der Assistent schrieb bisher `value: 0` in jeden Zähler aus einem
Vorschlag: ein neu angelegter Kleriker startete mit „Untote vertreiben 0 von 3", während
derselbe Zähler am Bogen voll beginnt. Eine neue Figur hat ihre Tagesfähigkeiten noch
nicht verbraucht.

**Von Martin ist damit alles beantwortet.** Die Spellcraft-Probe kam als Foto seines
Blatts und ist gebaut (eigener Abschnitt weiter unten); die EP-Strafe ist entfernt
(„Spielen wir nicht"), das Punktebudget gebaut und standardmäßig aus. `FRAGEN-AN-DEN-DM.md`
hat keinen offenen Teil mehr. Die volle Attacke stand bis vor kurzem auch hier — sie ist
beantwortet („Wir spielen bei 6bab mit zwei Angriffen"), und die Antwort war „alles
bleibt".

Quer über 2 und 3 stand zweimal **„Zauberpunkte"**, und das war die Frage mit der
größten Folge: bei einem echten Punktevorrat hätte die App einen ZWEITEN Weg gebraucht,
Zauber zu verbuchen. **Erledigt, er hat es selbst richtiggestellt:** „Zauberränge. Sorry
nicht Punkte." Es ist also das, was die App PLATZ nennt — einer je Zaubergrad und Tag,
wie im Regelwerk. Kein zweites Modell.

Übrig bleibt eine Wortfrage an IHN (nicht an den DM): die App sagt „Zauberplätze", er
sagt „Zauberränge". Umbenennen ginge, kollidiert aber mit den Fertigkeits-RÄNGEN — „3
Ränge in Spellcraft" neben „3 Zauberränge Grad 1" wären zwei Bedeutungen für ein Wort.
Deshalb bleibt „Platz" stehen, bis er etwas anderes sagt.

**Die drei Hausregel-Felder ohne Wirkung — alle drei erledigt.**
`houseRulesSchema` hatte sechs Felder; drei rechneten (`fractionalBabAndSaves`,
`maxHpFirstLevel` — Standard AN —, `ignoreEncumbrance`), und drei taten nichts:
`multiclassXpPenalty` **hatte einen Schalter in den Einstellungen, den niemand las**
(sein eigener Kommentar sagte „Warn-only", aber es gab keine Warnung), `deathAt` und
`pointBuyBudget` hatten nicht einmal eine Oberfläche. Das war die Familie „etwas weiß es,
und etwas anderes kann es nicht" in ihrer schlichtesten Form: ein Schalter, der etwas
verspricht und nichts tut, ist schlimmer als kein Schalter.

Der Weg heraus war für jedes ein anderer, und die drei Wege zusammen sind die Lehre:

- **`deathAt`: beantwortet und gerechnet** (Martins Regel 6, `engine/dying.ts`).
- **`multiclassXpPenalty`: ENTFERNT.** Sein Wort: „Ep Strafe kannste aber ganz weg
  lassen. Spielen wir nicht." Feld, Schalter und Text sind weg. Dass das gefahrlos ging,
  ist keine Vermutung: der Standardwert war `false` und niemand las ihn, ein gespeichertes
  `true` hätte also nie etwas bewirkt — und Zod streift beim Lesen unbekannte Schlüssel
  ohnehin ab. **Ein Schalter für eine Regel, die niemand spielt, ist nicht neutral,
  sondern Lärm** — und einer, der etwas verspricht und nichts tut, ist der Anfang eines
  Fehlerberichts.
- **`pointBuyBudget`: gebaut** (eigener Abschnitt weiter unten).

**Auf eine Abschnittsnummer in `FRAGEN-AN-DEN-DM.md` wird hier absichtlich nicht
verwiesen** — die Nummern verschieben sich, sobald eine Frage beantwortet ist und nach
Teil 1 wandert, und ein Verweis auf „Frage 9.1" zeigte dann ins Leere.

## Punktekauf für die Attribute — ein Angebot, keine Regel

Sein Auftrag war „setzt mal 1 um", gemeint war die Runde gegen die toten Schalter. Beim
Punktebudget hat er die drei Fragen entschieden: **Budget standardmäßig AUS** · **gezählt
wird nur im Assistenten** · **Preis je Feld plus ein Knopf „Auf Budget verteilen"**.

**Die wichtigste der drei ist die zweite, und ihr Grund ist Hike.** Eure Bögen sind
gewürfelt — sein Satz dazu steht weiter oben: „Anfangs haben wir auch gewürfelt, deswegen
passt hikes TP nicht ganz." Hikes Attribute treffen also kein Budget. Eine Warnung am
BOGEN hätte ab sofort an jedem bestehenden Charakter geklebt, für eine Regel, unter der
er nie gebaut wurde — genau der Fehler, den die Runde eigentlich bekämpft: ein Satz, der
immer dasteht, wird nicht gelesen. Deshalb liest `deriveSheet` das Budget NICHT, und die
Prüfung im gebauten Bogen hält das als Abwesenheit fest.

Gerechnet wird in `core/engine/pointBuy.ts` — Tabelle des Regelwerks (8 gratis, 14 kostet
6, 18 kostet 16), `pointBuySpent` als Summe, `pointBuyState` mit **einer** Zahl für beide
Richtungen (`left`, negativ heißt überzogen). Die zwei Zahlen daneben zu führen wäre die
zweite Fehlerfamilie: „3 zu viel" und „3 übrig" dürfen nie zusammen dastehen.

Drei Entscheidungen im Kleinen sind eine Notiz wert:

- **Die Tabelle hört bei 8 und 18 auf, die App darf das nicht.** Wer eine 6 oder eine 19
  tippt, bekommt trotzdem einen Preis (unter 8 gibt jeder Punkt einen zurück, über 18
  wachsen die Schritte weiter) — sonst stünde ein Strich, wo eine Auskunft hingehört.
  Die Fortsetzung ist ausdrücklich die des Programms und steht als solche im Kommentar.
- **Der Verteilen-Knopf kauft nur, was den MODIFIKATOR verbessert.** In 3.5 zählt der
  gerade Wert: 8 und 9 geben beide −1. Der erste Entwurf gab den letzten Punkt in ein
  STR 9 und sah damit aus wie ein Tippfehler statt wie eine Entscheidung. **Gefunden hat
  das ein Blatt mit allen Vorschlägen in vier Budgets, kein Test** — und der Test war
  sogar schuld: er verlangte „nichts bleibt liegen", und das war das falsche Ziel.
  Richtig ist „nichts wird verschwendet"; ein Restpunkt darf stehen bleiben und wird als
  „1 Punkt übrig" angesagt.
- **Billigster Schritt zuerst, nicht wichtigster.** So holt das Budget die meisten
  Modifikatorpunkte heraus: STR 16 + CON 16 schlägt STR 18 + CON 12, weil die 17 und die
  18 drei Punkte je Stufe kosten. Die Reihenfolge der Empfehlung entscheidet bei gleichem
  Preis — und sie kommt aus `Advice.abilities`, derselben Quelle wie die Sterne an den
  Feldern. Eine zweite Liste im Knopf wären zwei Wahrheiten.

Zwei Sachen hat der Lauf im gebauten Bogen gefunden, und beide waren MEINE Sonde: die
Punkte-Zeile stand nicht in dem `div`, das ich mit `.last()` erraten hatte (sie sitzt als
Geschwister über der Knopfreihe — zwölfte Falle, wieder), und der Attributs-Schritt ist
GESPERRT, bis Volk und Klasse stehen („Erst Volk und Klasse wählen"). Beim zweiten hat die
Regel gehalten, dass eine Navigationshilfe nicht still scheitern darf: sie warf, und der
Fehler zeigte sofort auf die richtige Stelle statt auf die App.

Und einen Fund hat nur der BLICK gebracht: der Hinweis zum Verteilen-Knopf stand zuerst
oben im Punkte-Kasten und erklärte dort scheinbar die Summe, während der Knopf darunter
lag. Ein Satz neben der falschen Sache ist schlimmer als keiner.

Und eine Namensfalle, die `tsc` gefangen hat und kein Test: im Assistenten gibt es
**zwei Sorten Punkte** — Fertigkeitspunkte und Attributspunkte. Meine neuen Texte hießen
zuerst genauso wie die alten (`pointsLeft`), und in einem Objektliteral gewinnt still der
spätere Schlüssel. Sie heißen jetzt `abilityPoints…`; der Bereich gehört in den Namen,
wo ein Wort zweimal vorkommt.

## Fünf Punkte von seiner Liste — und wo eine Sache hingehört

Fünf Sätze in einer Runde, und vier davon beantworten dieselbe Frage: **wo gehört das
hin?**

### 1. Das Infofeld klappt unter SEINER Kachel auf

Sein Einwand, wörtlich: „Beim Charakter erstellen sollten die Informationen zum Volk oder
zur Klasse aufklappen direkt unter dem Volk oder der Klasse, nicht unter allen Völkern und
allen Klassen, ganz unten. Denn wenn die oberen dann die Infos abrufen will, denkt man,
dass nichts angezeigt wird."

Er hat recht, und **das war ausdrücklich meine Entscheidung von vorher** (sie stand als
Begründung in der Kacheln-Runde: die Faktentabelle ist in 170 px unlesbar, also volle
Breite unter dem Raster). Der Grund war richtig, die Folge falsch: bei elf Klassen liegt
das Feld vier Reihen tiefer, außerhalb des Bildes — ein Tap, der scheinbar nichts tut.

Beides geht zusammen, und der Trick ist eine Zeile CSS: ein `col-span-full` im Raster
rutscht von allein in die nächste Zeile. Das Feld bricht damit die Reihe der geklickten
Kachel auf und ist trotzdem so breit wie die Seite. **Gemessen** im gebauten Bogen: der
Abstand zur Kachel liegt unter 60 px (vorher: eine ganze Kachelreihe), die Breite über dem
1,6-fachen einer Kachel. Die Überschrift mit dem Namen bleibt — bei drei Spalten sagt sie,
zu welcher der drei Kacheln das Feld gehört.

### 2. Ein Knopf, den man nicht als Knopf erkennt, ist keiner

„Beim Talente aufnehmen sollte klar sein, dass beim Tippen auf ein Talent die
Textbeschreibung ausgeklappt wird." Der Tap gab es längst — die ganze Zeile ist ein Knopf
(„das Ziel ist groß, weil am Tisch mit dem Daumen getippt wird") —, aber nichts sagte es.

Jetzt zweierlei: ein **▸ an jeder Zeile**, das sich beim Aufklappen zu ▾ dreht (dieselbe
Sprache wie „Infos ▸" an den Kacheln), und **ein Satz über der Liste**. Der Satz steht nur
da, wenn die Liste etwas enthält — eine Anleitung für nichts ist Lärm.

### 3. Bearbeiten wohnt hinter den drei Punkten

„Den Button bearbeiten im Charakterbogen grundsätzlich in allen Bereichen immer hinter den
drei Punkten." Vorher stand der Chip über JEDEM Reiter und nahm dort dauerhaft eine Zeile
weg — für einen Handgriff, den man selten braucht.

**Und die eine Entscheidung, die dazugehört: der Rückweg.** Ein Zustand, den man über das
Menü erreicht, aber nur dort verlassen kann, ist die Familie „etwas weiß es, und etwas
anderes kann es nicht". Also ist der amber Streifen „Bearbeiten: Name, Ränge …" jetzt
SELBST der Ausschalter — kein zweites Bedienelement, sondern der Hinweis, der schon dastand.
Ist Bearbeiten aus, steht dort nichts: kein leerer Streifen, keine Zeile Platz. Im ⋯-Blatt
steht die Zeile in beiden Zuständen („Bearbeiten" / „Bearbeiten beenden").

### 4. „Auf einen Blick" — ganz oben, weil „sofort" ohne Scrollen heißt

„Auf der Seite Werte würde ich gerne komplett alle Werte stehen haben … dass man einfach
auf einen Blick hat, wenn der DM fragt, wie hoch der Rüstungswert ist, dass man das sofort
sehen kann."

Zwölf Kacheln in einer Karte, ganz oben: RK · berührt · flachfüßig · Fort · Ref · Will ·
Initiative · BAB · Bewegung · Nahkampf · Fernkampf · Ringkampf. Jede antippbar mit
derselben Aufschlüsselung wie im Kampf-Reiter; gerechnet wird nichts, alles kommt fertig
aus `sheet`.

Zwei Auslassungen sind Absicht:

- **Die eigene Rettungswürfe-Karte ist weg.** Ihre drei Zahlen stehen jetzt oben; zweimal
  dieselbe Zahl auf EINEM Schirm ist die Doppelung, die diese App überall vermeidet — und
  beim Suchen hätte niemand gewusst, welche die aktuelle ist. Der Lauf prüft die Abwesenheit.
- **Die HP nicht.** Sie stehen im Kopf JEDES Reiters, größer und mit dem Knopf zum Ändern.
  Eine zweite HP-Zeile zwei Zentimeter darunter wäre genau diese Doppelung.

Und ein Fund vom BILD, den keine Prüfung gemeldet hätte: die Bewegung stand als „30", im
Kampf-Reiter aber als „30 ft". **Dieselbe Zahl darf auf zwei Reitern nicht zwei
Schreibweisen haben.**

### 5. Zähler haben einen Bereich — seine Frage, und die Antwort

Sein Befund: „die Zähler gehören nicht auf die Werte Seite. Da bin ich mir allerdings nicht
so sicher wo sie hingehören. Turn Undead ist ja was für die Kampf Seite. Actionpoint dann
wieder nicht. Hast Du eine Idee, wie man das aufteilen kann?"

Gefragt und entschieden: **eine Kategorie je Zähler**, mit allen vier Bereichen — Werte ·
Kampf · Zauber · Ausrüstung. Ein Zähler steht in genau EINEM Reiter, umgestellt wird mit
einer Knopfreihe in demselben Kasten, in dem auch „füllt sich bei" und „zurück auf" stehen.

Vier Entscheidungen daran sind eine Notiz wert:

- **Die Kategorie ist eine EINGABE, kein Raten am Namen.** „Heißt es Turn Undead?" wäre
  dieselbe versteckte Regel, die schon bei den Behältern verworfen wurde: sie ginge bei
  jedem eigenen Zähler und bei jeder Umbenennung vorbei.
- **Aber es gibt eine harte Herkunft, und die wird benutzt.** Ein Zähler aus einem
  Vorschlag trägt `suggestedFrom`, und `categoryOf` liest daraus den Bereich — deshalb
  landet auch der FIGHT-CLUB-importierte „Untote vertreiben" von allein im Kampf, ohne
  dass jemand ihn umstellt. Genau das ist sein Bogen Hike. Die Zuordnung steht als EINE
  Tabelle (`SUGGESTION_CATEGORY`), aus der sich beide Leser speisen: die Vorschläge und
  der Rückfall. Zwei Listen wären zwei Wahrheiten, und die eine würde beim nächsten
  Vorschlag vergessen.
- **Ein neuer Zähler gehört in den Bereich, in dem er ENTSTEHT.** Ohne das legt man ihn im
  Kampf an und findet ihn auf der Werte-Seite wieder.
- **Und die Beispieltexte hängen jetzt am Bereich.** Der alte Satz nannte „Untote
  vertreiben" — und stand nach der Aufteilung auch im Werte-Reiter, wo dieser Zähler
  ausdrücklich nicht hingehört. Ein Beispiel im falschen Reiter ist ein Text, der der
  Sache neben sich widerspricht; davon hat diese App schon einen bezahlt (der Erklärtext
  zu Power Attack mit leichter Waffe).

**Das Feld ist `optional` und nicht `.default("general")`, und das ist die Lehre der
Fehlerfamilie 1 von vorn bedacht:** ein `.default()` macht das Feld im AUSGABE-Typ Pflicht,
und dann muss jede Stelle, die einen Zähler als Literal baut, es mitschreiben — `tsc`
meldete auf Anhieb 13 solche Stellen (der Fight-Club-Import und ein Dutzend Tests). Genau
daraus entstand einmal „fehlende Schema-Standardwerte, weil Parser Literale bauten". Ein
LESER entscheidet, wie bei `refillOf` und `resetToOf`.

### Drei Sondenfallen dieser Runde, und die dritte ist neu

- **Ein Locator mit Filter ist eine SUCHE, keine Referenz.** `filter({hasText:/▸/}).first()`
  nach dem Klick neu ausgewertet trifft die NÄCHSTE noch zugeklappte Zeile — meine Prüfung
  meldete „immer noch ▸", während die App richtig aufgeklappt hatte. Festgehalten wird am
  NAMEN.
- **`hasText` mit einem regulären Ausdruck prüft `textContent`, und das verkettet ohne
  Trennzeichen.** Die Zeilen im ⋯-Blatt tragen Beschriftung und Hinweis in einem Knopf; im
  DOM steht „✎BearbeitenName, Ränge, …", obwohl das Auge drei Teile sieht. Weder
  `^Bearbeiten$` noch `^Bearbeiten\s` trifft. Die Verwandte der `uppercase`-Falle: was man
  liest, ist nicht, was der Ausdruck sieht.
- **Und `.slice(0, 200)` auf dem Body ist keine Prüfung.** Das ⋯-Blatt steht im DOM WEIT
  hinten (hinter dem ganzen Bogen); meine erste Fassung las die ersten 200 Zeichen und
  hätte „steht da" gemeldet, egal was im Blatt steht. Geklickt UND gelesen wird im
  `[role="dialog"]`-Kasten.

## Gruppierte Kacheln, randloses Porträt, Ziehen — und drei Messungen

Seine Antwort auf die Übersicht war dreiteilig: **„Nein, hab ich nicht mitten die
Kachelreihe"** (die HP bleiben also draußen — bestätigt), **„die Kacheln aber bitte noch
etwas klarer differenzieren, zum Beispiel die zusammen und nicht alles mehr oder weniger
durcheinander"**, **„Gerne bis an den Rand"** und **„Umsortieren per Ziehen, gerne"**.

### Die Kacheln stehen in vier Gruppen à drei

Verteidigung (RK · berührt · flachfüßig) · Rettungswürfe · Angriff (BAB · Nahkampf ·
Fernkampf) · Bewegung & Ringen (Initiative · Bewegung · Ringkampf). Jede mit einer kleinen
Überschrift.

**Dass jede Gruppe genau DREI trägt, ist der Grund für die Zuordnung des Ringkampfs.** Er
gehört fachlich zum Angriff — dort wären es aber vier, und bei 390 px sind drei Kacheln je
Reihe die Grenze, ab der „FERNKAMPF" noch lesbar ist. Eine Vierergruppe hätte 3 + 1
ergeben, also wieder eine Reihe, die nur aus der Spaltenzahl entsteht: genau sein Einwand.
Der Lauf prüft die Gruppen nicht am Text, sondern an der y-POSITION der Kacheln — eine
Überschrift ohne echte Reihe darunter wäre eine Behauptung.

### Das Porträt bis an den Rand — und was „der Rand" ist

Vorher 373 von 390 px. Die 17 Pixel sind nachgerechnet: `-mx-3` hebt nur das Polster der
Karte auf, darunter liegen die Einrückung des Blatts und sein Rahmen (`width: calc(100% -
0.8rem)` plus `border: 2px` in `styles.css`). Die Marge ist deshalb
`calc(0.75rem + 0.4rem + 2px)`.

**Und zwei Messungen haben je einen Fehler gefunden, den kein Nachdenken gefunden hätte:**

1. Meine erste Fassung zog den Rahmen der KARTE mit ab — das Bild war 394 statt 390 px
   breit, also zwei Pixel je Seite aus dem Bild heraus. Eine gerechnete Marge ist eine
   Behauptung, bis sie gemessen ist.
2. Meine erste PRÜFUNG verglich mit der Fensterbreite und meldete auf beiden iPad-Größen
   einen Fehler, den die App nicht hatte: ab `md` steht links die Seitenleiste, und der
   Bogen ist zentriert und schmaler (768 von 1180). „Bis an den Rand" heißt bis an den Rand
   des BOGENS — am Handy ist das der Bildschirmrand, auf dem iPad nicht. Dieselbe Familie
   wie die fünfte Falle: wer ein Hüllenmaß einrechnet, muss prüfen, ob die Hülle in dieser
   Breite dieselbe ist.

### Drei Sondenfallen dieser Runde, und die erste ist neu und teuer

- **`page.mouse` arbeitet in VIEWPORT-Koordinaten und scrollt nicht mit.** Der Anfasser
  des Kurzschwerts lag bei y=1589 in einem 844 px hohen Fenster; ein `mouse.move` dorthin
  landet auf dem `<html>`, `elementFromPoint` findet nichts, der Zug tut nichts — und die
  Prüfung zeigt auf eine Funktion, die in Wirklichkeit läuft. `locator.click()` scrollt von
  allein, `page.mouse` nicht. Gefunden hat es erst ein Mitschreiben der Pointer-Ereignisse
  im Browser (`target=HTML`, `unter=-`).
- **Seit es Behälter gibt, trägt JEDE Gepäckzeile den Namen des Behälters** — als Chip in
  der Reihe „Einpacken: Am Körper · Rucksack (leer)". Meine Ablesung der Reihenfolge suchte
  den Namen im ganzen `li` und las „ruck, ruck, ruck". Gelesen wird jetzt `data-drag-id`,
  also die Kennung am `li`. Dieselbe Familie wie „Fertigkeiten" enthält „Fertig".
- **Ein Zug auf ein verbotenes Ziel ist kein Fehler.** Meine Touch-Prüfung zog den
  Rucksack auf das Seil, das zu diesem Zeitpunkt IN ihm liegt — `canSwap` verhindert das zu
  Recht, und die Prüfung meldete trotzdem einen Fehlschlag. Wer eine Grenze baut, darf
  nicht dagegen testen.

### Und die Prüfung, auf die es wirklich ankommt: der FINGER

Er spielt am Handy. Ein Zug, den nur die Maus schafft, ist für ihn wertlos — deshalb fährt
die Strecke denselben Zug zusätzlich über echte Touch-Ereignisse (CDP
`Input.dispatchTouchEvent`, weil Playwright für einen gehaltenen Finger keine eigene
Schnittstelle hat) und prüft dabei mit, dass die Liste NICHT weggescrollt ist. Genau das
war der Grund, warum diese Runde vorher Knöpfe hatte.

Dazu ein Fund vom BILD: der Griff war mit 26×22 px zu klein für einen Daumen — er ist das
einzige Ziel, das man TREFFEN muss, bevor man zieht.

### Was diese Runde in einer ALTEN Strecke gefunden hat

`e2e-behaelter` lief nicht mehr durch — nicht wegen dieser Runde, sondern wegen der
VORIGEN: seit „Bearbeiten" hinter den drei Punkten steht, gibt es den ✎-Chip über dem
Reiter nicht mehr, und die Strecke klickte ihn. Ich hatte sie damals nicht mitgezogen.
**Wer ein Bedienelement verschiebt, muss die Sonden mitzählen** — dieselbe Lehre wie bei
der Rückfrage im Assistenten, die sechs Strecken gebrochen hat.

## Behälter im Gepäck — und was ein Löschen NICHT mitnehmen darf

Der letzte große Punkt seiner eigenen Liste: „Behälter (Inventar/Geldbeutel,
Münzgewicht) und Umsortieren". Gebaut ist alles davon, mit einer bewusst anderen
Antwort beim Umsortieren (unten).

**JEDE Zeile kann ein Behälter sein** — es gibt keine Liste erlaubter Behälter. Der
Grund ist derselbe wie bei den Klassenfarben: eine Namenserkennung („heißt es
Backpack?") wäre eine versteckte Regel, die beim Handy Haversack und bei jedem
eigenen Gegenstand vorbeigeht. `container` am Datensatz ist deshalb ein FELD und
keine Ableitung, und `containerId` zeigt auf die KENNUNG einer anderen Zeile statt
auf einen Namen: der Rucksack ist selbst ein Gegenstand mit eigenem Gewicht, ein
Textfeld hätte ihn nur beschrieben statt ihn anzuschließen.

Fünf Entscheidungen daran sind eine Notiz wert:

- **Ein Behälter liegt nie in einem anderen.** Damit kann kein Kreis entstehen
  (Rucksack im Beutel im Rucksack), und `carriedWeight` braucht keine Tiefensuche
  mit Zykluswächter — die Rechnung terminiert von allein. Beide Seiten halten sich
  daran: die Oberfläche bietet Behälter nicht zum Einpacken an, und die Funktion
  ignoriert ein `containerId` an einem Behälter. Der Test prüft genau den bösen Fall
  (zwei Behälter, die aufeinander zeigen).
- **Eine Kennung ins Leere heißt „am Körper" — und das ist eine Schutzregel, keine
  Nachlässigkeit.** Wird der Rucksack gelöscht, zeigt sein Inhalt noch auf ihn. Würde
  der Inhalt dann verschwinden (oder sein Gewicht), wäre ein Bogen durch ein Löschen
  leichter geworden. So bleibt alles stehen, und eine RÜCKNAHME bringt den Behälter
  samt Inhalt zurück — genau deshalb löscht das Löschen die Zeiger der Kinder NICHT.
  Beim Umstellen auf „kein Behälter" dagegen werden sie geräumt: dort gibt es die
  Zeile ja weiterhin, und ein Zeiger auf etwas, das kein Behälter mehr ist, wäre ein
  Widerspruch zwischen zwei Feldern — die Fehlerfamilie, die diese App schon einmal
  bezahlt hat.
- **Angelegt heißt aus dem Behälter heraus** (und Einpacken heißt abgelegt). Nicht aus
  Regeltreue, sondern weil die Liste „Angelegt" den Kampf-Reiter treibt: eine Waffe,
  die dort fehlt, weil sie im Rucksack steckt, wäre eine Angriffszeile, die auf dem
  Bogen nicht auftaucht.
- **Der Sack der Bewahrung nimmt den INHALT heraus, sich selbst nicht.** 15 lb bleiben
  15 lb. Wer das verwechselt, verschenkt am Tisch ein paar Pfund und merkt es nie —
  deshalb steht es als eigene Prüfung da („nicht 6 lb"). Auch das ein Schalter je
  Behälter und keine Namenserkennung: die Packdaten sagen nichts darüber.
- **Der Abschnitt heißt jetzt „Im Gepäck".** Er hieß „Rucksack", und das ging nicht
  mehr: seit eine Zeile wirklich ein Rucksack sein kann, stand die Überschrift
  „Rucksack" über einem Abschnitt, in dem ein Rucksack liegt. Dieselbe Regel wie bei
  „Zauberplätze" gegen „Fertigkeitsränge" — ein Wort für zwei Sachen.

### Münzgewicht: Standard AUS, und der Standardwert ist die Entscheidung

50 Münzen = 1 lb (PHB), gerechnet in `carriedWeight`, geschaltet in den Einstellungen
unter „Gewicht & Traglast". **Aus, bis er es einschaltet** — und diesmal ist der
Standardwert das Gegenteil von `deathAt` und `powerAttackLightWeapons`: die Regel
würde die Traglast JEDES bestehenden Bogens sofort verschieben, ohne dass jemand etwas
angefasst hat. Bei 500 gp sind das zehn Pfund, und das kann eine leichte Last zur
mittleren machen (Max-DEX 3, Rüstungsmalus −3, 10 ft weniger). Zahlen an bestehenden
Bögen wandern in diesem Projekt nur auf ausdrückliches Wort — die Prüfung im gebauten
Bogen hält deshalb eine ABWESENHEIT fest: mit 500 gp im Beutel stehen 18 lb da und
nicht 28.

**Aufgerundet, nicht abgeschnitten.** 56 Münzen sind mehr als ein Pfund; wer auf 1 lb
abschneidet, gibt Gewicht her, das der DM gleich wieder dazurechnet — und an einer
Lastgrenze ist genau diese Richtung die Frage. Eine App, die warnt statt zu sperren,
darf nicht schmeicheln.

**Und die Traglast sagt jetzt, woraus sie besteht** („davon 18 lb Gepäck und 10 lb
Münzen", „10 lb liegen gewichtslos im Behälter") — aber nur, wenn es etwas zu erklären
GIBT. Ohne Münzgewicht und ohne magischen Behälter ist die Summe das Gepäck, und ein
Satz, der das wiederholt, ist genau der Satz, der nicht gelesen wird.

### Umsortieren: erst ↑↓, dann ZIEHEN — und beides bleibt

Zuerst waren es nur **↑↓ im Bearbeiten-Modus**, obwohl er „Umsortieren per ZIEHEN"
geschrieben hatte. Der Grund war nicht Bequemlichkeit: dieser Bogen benutzt die
Wischgeste schon zweimal — waagerecht zum Reiterwechsel (`e2e-wischen`) und senkrecht
zum Scrollen im `main` mit `overflow-y-auto`. Ein Ziehen müsste sich gegen beides
durchsetzen, und heraus kommt eine Liste, die manchmal scrollt, manchmal den Reiter
wechselt und manchmal sortiert.

**Auf die Frage hat er es trotzdem bestellt („Umsortieren per Ziehen, gerne"), und
damit ist es gebaut** — mit genau dem Anfasser, der damals als Bedingung notiert war
(`ui/useDragSort.ts`, das ⠿ in der Knopfreihe). Die Geste wird an der Wurzel getrennt:
`touch-action: none` steht NUR am Griff, überall sonst bleibt Scrollen und Wischen, wie
es war. **Die ↑↓-Knöpfe bleiben** — mit einer Maus oder einem Vorleseprogramm ist ein
Zug kein Ersatz für einen Knopf, und sie kosten keine eigene Zeile.

Vier Entscheidungen stecken im Hook:

- **Vorschau lokal, geschrieben wird EINMAL beim Loslassen.** Ein Zug über fünf Zeilen
  wären sonst fünf Schreibvorgänge, fünf `rev`-Erhöhungen und fünf Abgleich-Einträge.
- **Die Reihenfolge liegt während des Zugs auch in einem `ref`**, nicht nur im State:
  der nächste `pointermove` kommt, bevor React neu gerendert hat, und würde sonst auf
  einer veralteten Liste rechnen — der Zug überspringt bei schneller Bewegung Zeilen.
- **Nur unter Geschwistern** (`canSwap`): gleicher Behälter, und beide abgelegt. Ohne
  das schiebt ein Zug die Zeile aus ihrem Rucksack heraus.
- **Ein Hook, nicht einer je Behälter.** Hooks dürfen nicht in einer Schleife stehen,
  also bekommt er ALLE Kennungen und die Gruppengrenze als Funktion.

### Was der BLICK gefunden hat, und drei Prüfungen nicht

- **Eine Zeile, die schon voll ist, verträgt keinen vierten Knopf.** Im
  Bearbeiten-Modus trägt eine Gepäckzeile Marke, Name, Menge (−/1/+), ✎ und ✕. Mit
  Behälter-Marke und ↑↓ dazu blieb bei 390 px vom Namen ein **„T…"** übrig, die
  Kleinzeile brach in ein Wort pro Zeile, und das ✕ stand halb außerhalb der Karte.
  Alle 93 Prüfungen waren dabei grün — sie lesen `innerText`, und der stimmte.
  Behoben, indem ↑↓ in die Knopfreihe DARUNTER wandern (sie umbricht) und die Marke im
  Bearbeiten-Modus wegfällt: dort sagen die Knöpfe ohnehin, dass es ein Behälter ist.
  Die Marke selbst bleibt für den Tisch, wo sie hingehört — ohne Bearbeiten-Modus.
- **Und die Prüfung dazu musste umziehen, nicht weichen.** Meine erste Fassung
  verlangte die Marke im Bearbeiten-Modus und meldete danach die App als falsch. Sie
  prüft jetzt den Zustand OHNE Bearbeiten — dort steht sie, dort liest er sie.

### Zwei Sondenfallen, und beide sind alte Bekannte

- **„Fertigkeiten" enthält „Fertig".** Der Bearbeiten-Schalter heißt „✎ Bearbeiten" /
  „✎ Fertig"; mein `/bearbeiten|fertig/i` traf ab `md` den FERTIGKEITEN-Reiter, und
  die Prüfung danach meldete eine fehlende Gepäckzeile — der Fehler zeigte auf die
  App, die recht hatte. Erkannt wird der Schalter jetzt am **✎**, das in beiden
  Zuständen dasteht. Dieselbe Familie wie „Ausrüstung" gegen „Ausr.": ein Wort, das in
  einem anderen steckt.
- **Mit Verschachtelung trifft der äußere `li` den inneren Text.** Der Inhalt steht als
  `ul` IM `li` des Behälters, also findet `li.filter({hasText:/Hanfseil/}).first()` den
  RUCKSACK. Ich habe damit einmal die Pfeile des Rucksacks gemessen und sie dem Seil
  zugeschrieben. Gesucht ist das INNERSTE Treffer-`li` (das ohne weiteren Treffer
  darin) — zwölfte Falle, und diesmal von innen.

### Der stillste Fund der Runde: eine Prüfung, die seit Monaten nie lief

`e2e-portrait` klickte `button:has-text('Rucksack')`, um einen Gegenstand umzulegen —
**einen solchen Knopf gab es nie** (die Überschrift ist ein `div`). Die Strecke lief
dort seit Monaten in einen Timeout, und alles DANACH wurde nie geprüft. Nachgemessen
gegen einen Build ohne diese Runde: derselbe Timeout, also ein alter Sondenfehler und
keine Folge der Umbenennung. Geklickt wird jetzt die Anlege-Marke der ersten Zeile
(der ERSTE Knopf einer Gepäckzeile IST die Marke), und die Prüfung beweist endlich
etwas: „Angelegt: 1 → 2".

**Und was danach sichtbar wurde, ist ein offener Punkt und kein Fehler dieser Runde:**
die erste erreichbare Prüfung dahinter verlangt, dass das Porträt 380 von 390 px füllt
— es sind 373, weil die Karte ihr Polster hat. Eine Schwelle, die nie gegen die
Wirklichkeit gelaufen ist, ist eine Behauptung; ob das Porträt bis an den Rand gehen
soll, ist seine Geschmacksfrage. **Lehre: eine Strecke, die früh abbricht, meldet
nicht „grün" — sie meldet gar nichts, und das sieht man nur, wenn man die Zahl der
Prüfungen ansieht.**

## Was deine Rüstung kostet — eine Karte für vier verstreute Zahlen

Sein Auftrag war ein Wort: „Rüstung". Gemeint war die Werte-Karte, die aus der
Ausrüstungs-Runde offen stand — und der Grund, warum sie eine eigene Karte ist und
keine Zeile am Gegenstand: **die Rüstung kostet an vier Stellen, und alle vier standen
woanders.**

| Was | Stand bisher | steht jetzt |
|---|---|---|
| DEX-Grenze | klein im NAMEN einer RK-Zeile („DEX-Modifikator (max. DEX 1)") | als Zahl, mit ihrem Preis |
| Rüstungsmalus | in fünfzehn Fertigkeitszeilen einzeln | als Summe, mit der Liste dahinter |
| Bewegung | als eine Zeile in der Aufschlüsselung der Bewegung | „30 ft → 20 ft" |
| Arcane Spell Failure | **nirgends** | mit der Antwort, ob sie diesen Bogen betrifft |

Die vierte ist der eigentliche Fund: `asf` lag seit dem ersten ETL-Lauf in den
Packdaten, `armorFailure` seit demselben Tag in den Klassendaten — und **beide hatte
niemand gelesen.** Ein Wert ohne Leser ist die schlichteste Form der dritten
Fehlerfamilie.

Drei Entscheidungen sind eine Notiz wert:

- **Gerechnet wird in der ENGINE, nicht in der Karte** (`armorCost` in `derive.ts`,
  Typ in `engine/types.ts`). Die Karte hat keine einzige Regel: welche Grenze gewinnt
  (Rüstung oder Last), dass der Malus NICHT stackt (der schlechtere zählt, PHB S. 162),
  dass Swim ihn doppelt nimmt, ob die Prozentzahl gilt — alles kommt fertig herein.
  Sonst stünde dieselbe Regel in Engine und Anzeige, und das ist die Falle „eine Regel,
  die in drei Ansichten steht, steht in keiner".
- **Die Karte nennt die HERKUNFT jeder Grenze** („aus der Rüstung", „aus der Last",
  „aus Rüstung und Last"). Ohne das sieht ein MaxDex 3 bei einem Kettenhemd (das 4
  erlaubt) nach einem Fehler aus — es ist die mittlere Last. Damit dafür EINE Wahrheit
  bleibt, steht die Bedingung der Last jetzt als eigene Zahl in `derive.ts`
  (`loadSlowsSpeed`) statt zweimal ausgeschrieben.
- **Eine Grenze, die nichts kostet, sagt das.** „Max. DEX 4" bei DEX 14 kostet nichts;
  die Zahl am Tisch ist nicht die Grenze, sondern ihr PREIS (`dexLost`).

Zwei Dinge hat nur der BLICK auf das Bild gefunden, kein Test:

- **Zwei verschiedene Minuszeichen auf einer Karte.** `fmtMod` liefert ASCII (`-8`, so
  steht es am Angriff), die Gegenstandszeilen zwei Zentimeter darüber sagen
  „Fertigkeiten −6" (`ui/itemSummary.ts`). Die Karte folgt ihrer NACHBARSCHAFT, weil
  sie über genau diese Zahlen redet — das Vorzeichen steht deshalb einmal oben in
  `ArmorCostCard.tsx` und nicht dreimal im Text. Mein Test war dabei zweimal grün: er
  maß erst das eine Zeichen, dann das andere.
- **Ein durchgestrichener Wert behauptet etwas.** Die erste Fassung strich die
  DEX-Grenze durch, wenn sie nichts kostet — beim Magier stand damit „max. DEX ~~4~~",
  also „es gibt keine". Gedämpft und durchgestrichen sind jetzt zwei Sachen: gedämpft
  heißt „gilt, kostet dich aber nichts", durchgestrichen heißt „zählt an diesem Bogen
  nicht" (nur die arkane Zahl beim Nicht-Arkanisten). Und weil ein durchgestrichener
  SATZ kaum zu lesen ist, steht „gehen schief" in der Beschriftung und die Prozentzahl
  allein im Wert.

## Zauber-Reiter: was wem gehört

Seine vier Punkte in einer Runde — Höhe halten, Sternchen, Grade einklappen, und die
stehengebliebenen Grad-0-Vorbereitungen löschen. Drei Entscheidungen daran sind es wert,
aufgeschrieben zu werden, weil sie alle dieselbe Frage beantworten: **wo gehört das hin?**

- **Der Favorit gehört dem SPIELER.** Er steht als `favorites` im `spellState` am
  Charakter (nicht im Speicher der Seite: er soll das Gerät wechseln und ein Neuladen
  überstehen) — und in `group/orders.ts` gewinnt beim Abgleich die Fassung des SPIELERS,
  nicht der Auftrag des Spielleiters. Ein Stern ist kein Aufbau, sondern ein Handgriff am
  Tisch. Die Reihenfolge daraus ist eine FOLGE und wird nie gespeichert: `repertoireAt`
  sortiert stabil, Favoriten zuerst.
- **Der zugeklappte Grad gehört dem GERÄT.** Er liegt in `sessionStorage`
  (`codex35.spells.folded.<charId>.<classId>`) und nicht am Charakter: dass er den Grad 3
  auf dem iPhone zugeklappt hat, ist keine Eigenschaft der Figur. Dasselbe gilt für die
  Scroll-Höhe in `lib/scrollMemory.ts`.
- **Löschen bekommt eine Wanderung mit Nummer, nicht einen Handgriff.** Sein Auftrag war
  „das vorbereitet bei den Level null Zaubern löschen bei dem Charakter Hike" — gebaut als
  Wanderung 2 in `db/repo.ts` (`characterMigrations`), damit sie je Bogen genau EINMAL
  läuft und am `schemaVersion` ablesbar ist. Sie arbeitet auf der ROHEN Zeile und muss
  deshalb mit allem rechnen, was dort liegen kann (kein `spellState`, `prepared` keine
  Liste) — die erste Fehlerfamilie, diesmal von vorn bedacht. Der Test in
  `db/migrate.test.ts` prüft beide Richtungen: Grad 0 weg, Grad 1 und höher unangetastet.

### Die Punkte zählen AB — zwei Anzeigen, eine Richtung

Sein Befund: **„Irgendwie Quatsch, dass sich die Zauberplätze füllen wenn ich einen Zauber
wirke. Die Punkte sollen bitte abgezogen werden."** Er hat recht, und der Fehler stand in
DERSELBEN Kopfzeile: die ZAHL lief abwärts („Slots 3/4" sind die FREIEN Plätze), die PUNKTE
liefen aufwärts (`i < used ? "●" : "○"` — ein gewirkter Zauber füllte einen Punkt). Zwei
Anzeigen für dieselbe Sache, in Gegenrichtung, zehn Pixel voneinander entfernt.

Das ist genau die Verwechslung, die er beim − / + schon einmal gemeldet hat, und die
Antwort ist dieselbe: **die Anzeige zeigt, was er NOCH HAT.** Ein voller Punkt ist ein
Platz, den er noch hat; Wirken nimmt einen weg. Der Hinweistext hat mitwandern müssen
(„Wirken zieht einen Slot des Grads ab" statt „zählt hoch") und die Legende auch — sie ist
die Stelle, an der man nachliest, und eine falsche Legende ist schlimmer als keine.

Zwei Dinge daran hat nur das MESSEN gefunden, nicht das Nachdenken:

- **Ein zweiter Ton für denselben Zustand kippt irgendwann.** Der verbrauchte Domänenplatz
  bekam zuerst `violet-800`, der freie `violet-300` — auf der KLADDE war damit der
  VERBRAUCHTE kräftiger (Kontrast zum Papier 179 gegen 160), weil die Buntrampe dort anders
  faltet als die von Slate. Jetzt tragen alle verbrauchten Punkte denselben Ton: **die FORM
  sagt „Domäne", der TON sagt „noch da" oder „weg".** Die Messung steht als Schranke in
  `e2e-papiere.mjs` — in allen vier Papieren, und mit einer Untergrenze auch dafür, dass der
  verbrauchte Punkt SICHTBAR bleibt (mit `slate-700` war die Reihe auf dem Bild leer, und
  sie soll weiter sagen, wie viele Plätze der Grad überhaupt hat).
- **Kein Amber für die Punkte.** Das ist die Bedienfarbe; die Punkte sind Auskunft und kein
  Knopf (elfte Falle). Sie stehen deshalb in der Slate-Rampe, und die faltet mit dem Papier.

Und eine Falle in der Probe selbst, die zur dritten Anzeige-Falle gehört: **eine Klasse, die
im Quelltext nicht mehr vorkommt, existiert im Stylesheet nicht.** Nach dem Entfernen von
`text-violet-800` maß meine Probe weiter diese Klasse — der Messpunkt erbte die Textfarbe,
und die Messung meldete 238 statt 38. Wer Farben messen will, muss messen, was die App
WIRKLICH benutzt.

## Aussehen: zwei Regler, nicht 33 Entwürfe

Sein Wunsch war „ein alternatives Design, was an pen and paper erinnert", dann drei Entwürfe
zur Abnahme — **alle drei angenommen** —, und dazu: „für jede Klasse ein eigenes Farbkonzept,
ein eigenes Thema. Also zum Druiden etwas Grünes … beim Barden vielleicht etwas Verspieltes,
beim Paladin etwas sehr Edles … Beim Barbaren soll es 'n bisschen wilder anmuten."

Dazu die Frage „gibt es ein Limit?" — und die Antwort ist der Kern dieser Runde: **drei
Papiere × elf Klassen wären 33 Entwürfe, und so gebaut wäre es nach dem zweiten neuen Knopf
kaputt**, weil jede neue Karte 33-mal stimmen müsste. Es sind deshalb zwei Regler, die sich
nicht kennen:

- **`data-material`** am `<html>` — Papier, Karten, Linien, Schrift. Vier Werte, alle vier
  gebaut: Codex, Nachtbogen, Kopierter Bogen, Kladde. Was ein Papier darf, steht im eigenen
  Abschnitt „Die zwei hellen Papiere" weiter unten.
- **`data-accent`** am `<html>`, aber nur **solange ein Bogen offen ist** — genau die Farbe,
  die heute Amber ist. Draußen färbt die Kampagne, drinnen die Klasse: außen sieht man, zu
  welcher Gruppe eine Figur zählt, innen, wer sie ist. **Ganz abschaltbar** über
  `classAccent` in den Einstellungen (Runde 6): dann wird das Attribut nicht gesetzt, und
  alles, was daran hängt, fällt zusammen weg.

**Warum das billig ist, und es ist der ganze Trick:** Tailwind 4 legt jede Farbe als
CSS-Variable ab (`--color-slate-900`), und jede Hilfsklasse LIEST sie. Ein Thema fasst
deshalb keine einzige Komponente an — es definiert die Variablen neu, und die 168 Stellen mit
`text-slate-500` wechseln mit. Nachgeprüft im gebauten Stylesheet, nicht vermutet.

Drei Entscheidungen daran sind es wert, aufgeschrieben zu werden:

- **Die Warnfarbe steht NICHT im Thema.** `styles.css` definiert nur `slate` (Material) und
  `amber` (Bedienfarbe) um; `rose` (Warnung), `red` (Gefahr), `emerald` (in Ordnung) und
  `violet` (Domänenplatz) bleiben unberührt. Das sind Bedeutungen, keine Dekoration — eine
  Warnfarbe, die je Klasse wechselt, wäre genau der Fehler, den die elfte Falle beschreibt.
  Der Lauf im gebauten Bogen misst das hart: dieselbe Marke, zwei Themen, identische Pixel.
- **Eine Klasse ist EINE Zeile.** Die Rampe steht einmal (`[data-accent]`, Helligkeit und
  Sättigung 1:1 von `amber` abgelesen), variabel sind nur Farbton `--ac-h` und ein
  Sättigungs-Faktor `--ac-s`. Damit kann keine Klasse versehentlich einen anderen Kontrast
  haben als die anderen, ohne dass jemand elf Rampen pflegt. (Hier stand „und der Kämpfer
  darf fast grau sein (Stahl)" — das war falsch, sobald elf Klassen unterscheidbar sein
  sollen, und Runde 4 hat es nachgemessen: alle elf mindestens 32 Grad auseinander, keine
  unter 0,55 Sättigung.)
- **Die Farbe ist eine FOLGE, die Wahl eine Eingabe.** `accentClassIdOf` rechnet die Klasse
  mit den meisten Stufen aus (bei Gleichstand die zuletzt gestiegene) — gefragt und
  entschieden, Hike wird damit Kleriker und nicht Kämpfer. Gespeichert wird nur, was er von
  Hand überschreibt (`character.accent`), und auch das als Schlüssel, nicht als Farbwert.

### Runde 6: ein Hauptschalter, und „dezent" heißt kürzer, nicht blasser

Drei Sätze: **„Stelle ein, das Man die Klassen Farbe auch abschalten kann. Bogen Version
löschen."** und **„Farben bitte deutlich dezenter im Hintergründe. Aber die Rahmen und den
Kopf Teil so lassen."**

#### Der dritte Satz ist der interessante, weil er in zwei Richtungen zeigt

„Dezenter" und „so lassen" schließen sich aus, solange man Farbe als EINEN Regler denkt.
Sie lösen sich auf, weil Hintergrund und Kopf verschiedene STELLEN sind: der Anstrich ist
ein Gradient von oben. Wer `--wash-a` senkt, nimmt dem Kopf die Farbe mit — **was ihn
dezent macht, ist nicht ein kleinerer Wert, sondern ein kürzerer WEG.** Also neu
`--wash-reach` (26% dunkel, 24% hell): dieselbe Kraft oben, nach einem Viertel der Höhe
vorbei. Vorher lief er über 72% aus und tönte damit den ganzen Bogen.

Der eigentliche „Hintergrund", über den er gestolpert ist, waren aber die **Karten**:
`--karte-a` von 0,30 auf **0,07** (hell 0,16 → 0,05). Sie sind die größte Fläche des
Bogens; getönt schlucken sie jede Ruhe. `--rahmen-a` ist ausdrücklich unberührt geblieben
(0,85 / 0,9) — das ist die andere Hälfte seines Satzes.

**Gemessen im gebauten Bogen, gegen denselben Bogen OHNE Klassenfarbe als Nullpunkt:** am
Kopf 128 Abstand, in der Fläche weit unten **0**. Die elf Klassen bleiben dabei
unterscheidbar (engstes Paar 151, Karten-Boden 13 gegen die alte Schwelle 8) — **keine
Schwelle wurde gesenkt, damit es grün wird.**

Und die Messung geht über ein BILDSCHIRMFOTO durch eine Zeichenfläche, nicht über
`getComputedStyle`: gefragt ist die Überlagerung aus Papier, Anstrich und Deckkraft, und
die steht in keiner einzelnen Eigenschaft.

#### Der Hauptschalter: EINE Stelle entscheidet

`classAccent` in den GERÄTE-Einstellungen — es gibt schon eine Wahl je Charakter
(`character.accent` im ⋯-Menü: „welche Farbe"), das hier ist die Frage darüber
(„überhaupt Farbe"). Zwei Fragen, zwei Orte.

Entschieden wird im Bogen VOR der Rangfolge: ist der Schalter aus, wird `data-accent` gar
nicht gesetzt — und damit fallen Rahmenfarbe, Anstrich und Kartentönung **zusammen** weg.
Prüfte jede der drei Schichten den Schalter selbst, würde beim nächsten Umbau eine davon
durchfallen. Der Schalter steht dafür in der Abhängigkeitsliste des Effekts; ohne das
wirkte er erst beim nächsten Öffnen, und in den Einstellungen täte der Umschalter
scheinbar nichts (die Familie „etwas weiß es, und etwas anderes kann es nicht").

**Aus ist nicht grau, sondern Amber:** ohne `data-accent` fällt die Rampe auf das
ursprüngliche Aussehen zurück, das er von Anfang an abgenommen hat. Das Klassensymbol
BLEIBT (nur gedämpft) — der Hinweis am Schalter sagt das zu, also prüft der Lauf es mit.

**Und der Standardwert ist AN, auch für ein fehlendes Feld.** Auf seinem iPhone liegt das
Feld noch gar nicht; fiele es auf `false`, wären die Klassenfarben nach dem Update spurlos
weg, und er würde einen Fehler suchen, wo eine Voreinstellung stand.

#### „Bogen Version löschen" — und warum die Marke in den Einstellungen bleibt

Weg ist die knappe Marke über der Charakterliste. In den Einstellungen bleibt sie, und das
ist kein Übersehen: sie ist das EINZIGE ehrliche Zeichen dafür, ob sein GERÄT einen neuen
Stand hat — ein grüner Deploy sagt nur, dass er auf dem Server liegt. Wer sie ganz
entfernt, nimmt der App die Antwort auf „Es kommt kein Update". Ein Test hält beides fest:
nicht auf der Startseite, weiter in den Einstellungen.

#### Was der Test dieser Runde festhält, und warum als ZAHL

Seine zwei Forderungen zeigen in verschiedene Richtungen, also stehen sie als Schwellen im
Stylesheet-Test (`--karte-a` ≤ 0,12 · `--wash-reach` ≤ 35% · `--wash-a` ≥ 0,28 ·
`--rahmen-a` ≥ 0,8) und nicht als Absicht in einem Kommentar. Eine Aufräumrunde, die „alle
Farbwerte angleichen" will, hätte sonst die Hälfte seines Auftrags rückgängig gemacht, ohne
dass etwas kaputtgeht.

### Runde 5: kräftig statt dezent — Rahmen, Wasserzeichen, elf Klassensymbole

Sein Urteil nach Runde 4, wörtlich: **„Sorry aber die Farben sind alle zu blass und dezent.
Dann mach doch lieber was farbigeres. Einen kräftigen Rahmen um alles. Und evtl. ein
passendes Symbol welches wie ein Wasserzeichen an manchen Stellen vorkommt."**

Zum dritten Mal „zu wenig" — und dreimal ist es keine Geschmacksfrage mehr, sondern ein
Befund über mich: ich habe jede Runde die vorsichtigere Hälfte gewählt. Diesmal ohne
Rückfrage kräftig, weil die Richtung nach drei Anläufen eindeutig ist.

**Was farbiger wurde**, in Zahlen: der Anstrich von `--wash-a: 0.22` auf **0.42**, die
Tönung der Karten von `0.13` auf **0.30**. Der Kontrast der Kleinschrift bleibt dabei
unverändert (3,91 / 5,37 / 6,18 / 6,40) — das ist die Grenze, die nicht verhandelbar war,
und der Lauf im gebauten Bogen prüft sie in allen vier Papieren.

**Der Rahmen** steht an zwei Stellen: `border-2` an jeder Karte (im Bauteil, weil die
Stärke zum Kasten gehört) und die FARBE aus der Klasse (`[data-accent] .karte`). Dazu ein
neuer Griff `blatt` am Inhaltskasten — der ganze Bogen ist damit ein eingefasstes Blatt und
keine Liste von Kästen. Der Rahmen braucht dafür Luft: `width: calc(100% - 0.8rem)` mit
`margin: … auto` rückt ihn beidseitig ein und lässt ihn auf dem iPad mittig; ein reines
`margin` hätte das `auto` des `mx-auto` überschrieben und die Zentrierung zerstört.

**Warum die Klasse hier `border-color` setzen darf, das Papier aber nicht:** die
Kampagnenfarbe färbt nur auf der STARTSEITE, und dort steht kein `data-accent`. Innerhalb
eines Bogens gibt es keine Kampagnenfarbe, die überschrieben werden könnte.

#### Die elf Klassensymbole

`ui/icons.tsx` hat elf Formen dazubekommen, und ihre Namen sind GENAU die Schlüssel der
Themen (`wild`, `natur`, `edel`, …) — dieselbe Regel wie bei den Reitern: der Schlüssel ist
der Name, also braucht `ClassMark` keine Zuordnungstabelle, und der Test prüft beide
Richtungen (kein Thema ohne Symbol, kein verwaistes Symbol).

Sie erscheinen an zwei Stellen:

- **Als Wasserzeichen** hinter dem Bogen, 220 px, in der Klassenfarbe bei 15% Deckkraft.
- **Als Porträt-Platzhalter** auf der Startseite. Dort bewusst GEDÄMPFT und nicht in der
  Klassenfarbe: draußen färbt die Kampagne, und ein buntes Symbol je Karte würde mit der
  Gruppenfarbe streiten. Das Symbol sagt die Klasse, die Farbe die Gruppe.

**Der Barbar hat fünf Anläufe gebraucht**, und die Lehre daraus ist die wichtigste dieser
Runde:

| Fassung | sah aus wie |
|---|---|
| Stiel mit kleinem Blatt | eine Fahne |
| Doppelaxt, kleine Blätter | eine Fliege am Mast |
| Doppelaxt, große Blätter | ein Auge auf einem Stiel |
| einschneidig, großes Blatt | wieder eine Fahne |
| zwei Hörner | ein Spross — und dem Druidenblatt zum Verwechseln ähnlich |

Erst der Schädel las sich als Schädel. **Wenn drei Anläufe dasselbe Missverständnis
erzeugen, liegt es am MOTIV und nicht an der Ausführung** — ein Stiel mit einer Fläche
daran IST eine Fahne, ganz egal, wie man das Blatt schneidet. Nebenbei mussten auch das
Druidenblatt (las sich als Feder — es fehlten die ADERN) und die Schurkenmaske (ein Stiel
darunter machte sie zum Käfergesicht) neu gezeichnet werden. Gefunden hat das jedes Mal ein
Blatt mit allen elf in 30/56/110 px, nicht der Test.

#### Die Falle dieser Runde: `isolation: isolate` sperrt jeden Dialog ein

Das Wasserzeichen soll UNTER den Karten liegen. Der naheliegende Weg war `isolate` am
Wurzelkasten des Bogens plus `-z-10` am Zeichen — und das hat **jedes Blatt des Bogens
hinter die Hauptnavigation gelegt**: `isolation: isolate` macht einen neuen Stapelkontext,
und damit galt das `z-50` von ⋯-Menü, Würfelblatt und TP-Feld nur noch INNERHALB dieses
Kastens. Gegen die untere Leiste (`z-40`, aber im Wurzelkontext) verloren sie.

Gemeldet hat es die Lösch-Strecke mit einem Timeout auf „Gefahrenzone" — ein Dialog, den
man nicht anklicken kann. **Ein Stapelkontext an einer Seitenwurzel wirkt auf alles darin,
auch auf das, was gar nichts mit der Änderung zu tun hat.** Ohne `isolate` regelt die
Zeichenreihenfolge dasselbe: das Zeichen steht als erstes Kind, und alles danach mit
`relative` zeichnet darüber — deshalb hat `Card` ein `relative` bekommen, eine Klasse, die
nichts verschiebt.

#### Und der Fund, der kein Fund war

Auf dem Bild der Startseite hatte genau eine von vier Karten einen goldenen Rahmen. Nach
dem Nachmessen: es war der **Hover**-Zustand (`hover:border-amber-600/50`), weil der Zeiger
nach dem letzten Klick auf der Karte stehenblieb. Beide gemessenen Karten hatten denselben
grauen Rahmen. Lehre, und sie gehört zur Sechsten: **wer ein Bild prüft, prüft auch den
Zeiger** — ein Aufnahmegerät hat immer eine Maus, sein iPhone nicht.

### Runde 3: die zwei hellen Papiere — und was ein Material überhaupt darf

Sein Einwand nach Runde 2, wörtlich: **„Ich sehe grad, dass ja nur die Kontrastfarben ändern.
Ich wollte ganze eigene Designs. Und auch das pen and paper design."** Er hatte in beiden
Punkten recht: der Nachtbogen tauschte die Farbrampe aus und legte drei weiche Flecken auf den
Untergrund — Schrift, Linien, Kästen und Dichte blieben, wie sie waren. Und die zwei hellen
Papiere, also das eigentliche „pen and paper", standen seit der Abnahme als offener Punkt da.

**Gefragt und entschieden** (Geschmack, deshalb gefragt): ein Papier darf **Schrift, Linien
und Kästen** ändern · **beide** hellen Papiere in einer Runde · **Serifen überall**, nicht nur
in den Überschriften.

**Selbst entschieden**, weil es Programmierentscheidungen sind:

- **Das PAPIER besitzt Schrift und Struktur, die KLASSE besitzt Farbe, Ecken und Laufweite.**
  Ohne diese Grenze wären es 4 × 11 = 44 Entwürfe. Ein Paladin auf der Kladde ist damit
  „Kladde mit Königsblau" und kein 45. Design.
- **Keine geladene Schrift.** Nur was auf dem Gerät liegt (`ui-serif`, dann Cambria/Times bzw.
  Palatino/Georgia). Ein Papier, das erst ein Megabyte holt, ist offline kein Papier — und
  damit sehen die zwei hellen trotzdem verschieden aus: der kopierte Bogen bekommt eine
  Druckschrift, die Kladde eine runde.

#### Die FALTUNG — der Kern dieser Runde

Ein helles Papier kann die Rampe nicht einfach umdrehen. Nachgezählt, was die App wirklich
benutzt (nicht geschätzt — `grep` über alle Hilfsklassen):

| Rampe | Text | Rahmen | Knopf mit weißer Schrift | getönte Fläche |
|---|---|---|---|---|
| `slate` | 50–600 | 600–800 | — | 700–950 |
| bunt | 50–400 | 500–800 | **500–800** | 900–950 |

Ein blindes Umdrehen macht deshalb aus `bg-red-600` (Löschknopf) ein hellrotes Feld mit weißer
Schrift. Also wird **gefaltet**: die niedrigen Stufen werden Tinte, die hohen werden Papier,
und die Mitte bleibt satt, weil dort die Knöpfe sitzen. Danach ist die Rampe nicht mehr
monoton — jede VERWENDUNG ist aber richtig, und das ist, was zählt.

**Und die Faltstellen sind nicht geraten.** Sie liegen dort, wo die App die Rolle wechselt.
Zuerst hatte ich bei 700/800 gefaltet; `bg-amber-800` und `bg-red-800` sind aber die Knöpfe im
TP-Feld und tragen weiße Schrift — bei 800 als heller Ton wären sie leer geworden. Die
Buntrampen falten deshalb bei **800/900**, `slate` bei **600/700**.

Der zweite Nutzen der Faltung, und er war nicht geplant: **eine Rampe darf oben warm und unten
kühl sein.** Die Kladde hat deshalb cremefarbenes Papier (Farbton 88–95) und BLAUSCHWARZE
Tinte (265) — ein Füller, kein Kopierer.

#### Was dafür umgebaut werden musste

- **Die Bedienfarbe steht jetzt bei `:root` und nicht mehr hinter `[data-accent]`.** Sie ist
  immer gerechnet, auch ohne offenen Bogen. Sonst wäre die Startseite auf hellem Papier bei
  Tailwinds echtem Amber geblieben: hellgelbe Schrift auf Weiß. Dieselbe Falle wie immer —
  eine Regel, die nur in EINEM Zustand greift, fehlt in allen anderen.
- **Drei Sorten Variablen statt einer.** `--ac-h`/`--ac-s` (Farbton, Sättigung) setzt die
  KLASSE, `--ac-l…`/`--ac-c…` (Helligkeit, Buntheit je Stufe) setzt das MATERIAL, die Rampe
  selbst steht genau einmal. Damit können sich die zwei Regler weiter nicht in die Quere
  kommen, obwohl das Papier jetzt in die Farbe hineinredet.
- **Die Zierfarbe bekommt eine VERSCHIEBUNG (`--ac2-lshift`), keinen zweiten Wert.** Die
  Klasse sagt weiter, wie hell ihr Gold ist; das Papier schiebt den ganzen Satz um −32%. Ein
  zweiter Wert wären zwei Wahrheiten für dieselbe Farbe.
- **Zwei GRIFFE im Quelltext**: `karte` an `Card`, `abschnitt` an `SectionTitle`. Schatten und
  Rahmenstärke stehen in Hilfsklassen, und eine CSS-Variable gibt es dafür nicht — ohne einen
  Griff je Bauteil kann ein Material nur Farben tauschen, und genau das war sein Einwand.
  **Was ein Papier am Griff NICHT anfassen darf: Farbe und Ecken.** Eine `background`-Regel
  dort hätte (0,2,0) und die Kampagnenfarbe der Startseite überschrieben — die dritte
  Anzeige-Falle, diesmal von der anderen Seite: die spätere Regel gewinnt zu VIEL. Der Test
  in `ui/materials.test.ts` verbietet Farbe und Radius am Griff hart.

#### Die Bedeutungsfarben — und warum das kein Widerspruch zur elften Falle ist

`rose`, `red`, `emerald`, `violet` und `sky` falten mit. Verboten war, dass eine Warnfarbe je
**KLASSE** anders aussieht: dann bedeutet sie nichts mehr. Dass sie auf Papier dunkel und auf
Nachtpapier hell ist, ist das Gegenteil davon — derselbe Ton, lesbar auf beidem. Der Lauf im
gebauten Bogen prüft es in allen vier Papieren: die Warnung muss rot BLEIBEN (R deutlich über
G und B) und lesbar sein.

#### Was das Ansehen gefunden hat, und die Zahlen nicht

Drei Sachen waren rechnerisch in Ordnung und sahen trotzdem nach nichts aus:

- **Die Linien der Kladde bei 0,1 Deckkraft waren auf dem Bild unsichtbar.** Ein Papier, das
  man nicht erkennt, ist kein Papier — jetzt 0,22.
- **Der kopierte Bogen war zu clean.** 96% Papier gegen 99,5% Karte ist zu wenig Unterschied,
  um als Formularfeld zu lesen: jetzt 93% Blatt gegen reines Weiß.
- **Die Linienstufe war mit 78% zu blass.** Eine Fotokopie hat harte Linien; jetzt 68%.

Lehre, dieselbe wie bei den Zeichen: **bei einem Aussehen ist das Bild der Test, nicht die
Zahl.**

#### Und der Nebenbefund, der eine echte Verbesserung ist

Die häufigste Farbe der App ist `text-slate-500` (171 Fundstellen, sie trägt die
Kleinschrift), und sie ist in Codex mit **3,9** die schwächste Stelle der ganzen Oberfläche.
Auf den zwei hellen Papieren liegt dieselbe Schrift bei **6,2** bzw. **6,4** — deutlich besser
lesbar als das, was er heute benutzt. Nachgemessen, nicht behauptet.

#### Testfallen aus dieser Runde, alle in MEINEM Lauf

- **Eine halbdurchsichtige Fläche muss über dem gerechnet werden, was WIRKLICH darunter
  liegt.** Meine erste Messung legte `bg-slate-800/60` über Schwarz und bekam für Kopierpapier
  ein mittleres Grau (177 statt 240) — Kontrast 3,07 statt 6,2. Der Test zeigte auf die App,
  die recht hatte. Jetzt wird die ganze Kette der Hintergründe gesammelt und von hinten nach
  vorne übereinandergerechnet, genau wie der Browser zeichnet.
- **Ein Klassenname mit Schrägstrich ist EIN Klassenname.** `.border-rose-800` trifft
  `border-rose-800/70` nicht; dafür braucht es `[class*=…]`.
- **Eine Schwelle darf nicht die Dunkelheit messen.** Zuerst forderte ich „jedes Papier so gut
  wie Codex". Codex ist weiße Schrift auf Fastschwarz und kommt auf 18,4 — das kann kein
  helles Papier erreichen und muss es nicht; 14,7 auf Kopierpapier ist ausgezeichnet. Jetzt
  eine Schwelle je ROLLE, und gegen Codex verglichen wird nur die Kleinschrift, weil sie die
  schwächste Stelle ist.
- **Nicht das erste Vorkommen nehmen.** Die gemeinsame Faltung endet mit
  `[data-material="kladde"] {`; ein `indexOf` traf deshalb den falschen Block und meldete eine
  fehlende Schrift, die längst dastand. Dieselbe Sorte Fehler wie ein geratenes `.last()`.
- **`tsc` fängt, was `vitest` nicht fängt.** Der neue Test lief grün und `tsc` meldete
  `string | undefined` (`noUncheckedIndexedAccess`) — genau der Grund, warum beide immer
  laufen.

### Runde 4: die Klassenfarbe bestimmt den Bogen — und der Weg zurück

Zwei Aufträge. Der erste wörtlich: **„Ich möchte aus den Einstellungen direkt zurück in den
Charakter gehen können."** Der zweite: **„Können wir nicht einfach für alle Klassen
Kontrastfarben festlegen? Die dann den Stil der Bögen bestimmen? Ich sehe da grade kaum
Unterschiede."**

#### Der Weg zurück

`lib/lastSheet.ts` merkt in `sessionStorage`, welcher Bogen offen war; in den Einstellungen
steht dann „← Zurück zu Hike". Bewusst **nicht** der `BackButton`: der geht einen Schritt im
VERLAUF zurück, und wer zwei Papiere ausprobiert und dazwischen etwas antippt, landet damit
irgendwo. Er will zurück in DEN Charakter — deshalb steht der Name im Knopf.

Ohne gemerkten Bogen (oder wenn es ihn nicht mehr gibt) erscheint **nichts**: ein Knopf, der
auf einen gelöschten Charakter zeigt, ist schlimmer als keiner. Deshalb löscht `doDelete`
den Eintrag mit, UND die Anzeige prüft zusätzlich, ob der Bogen noch da ist — beides, weil
ein Löschen auf dem anderen Gerät hier gar nicht vorbeikommt.

**Später auf alle drei Seiten ausgeweitet** — sein Auftrag: „Ich möchte aus meinem
Charakter ins Kompendium UND zurück switchen können. Nicht nur ins Charakter Menü." Der
Knopf wohnt seither als geteiltes Bauteil in `ui/BackToSheet.tsx` (zwei Kopien wären zwei
Wahrheiten) und steht in den Einstellungen, im Kompendium (Liste UND Detail — im Detail
neben dem ←, der nur einen Schritt zurückgeht) und auf der Würfel-Seite. Der HINWEG war
nie das Problem (Hauptnavigation); gefehlt hat der Rückweg, der nicht über die
Charakterliste führt.

#### „Kaum Unterschiede" — nachgemessen waren es zwei getrennte Ursachen

**Erste Ursache: drei Paare lagen praktisch aufeinander.** Kleriker 240° gegen Kämpfer 245°
(fünf Grad!), Waldläufer 120° gegen Druide 130°, Paladin 272° gegen Magier 285°. Dazu
Sättigungen von 0,20 bis 0,40, die grau lesen. Beides waren MEINE Werte — „der Kämpfer darf
fast grau sein (Stahl)" stand als Absicht in dieser Datei und war schlicht falsch, sobald
elf Klassen unterscheidbar sein sollen. Jetzt liegen alle elf **32 Grad** auseinander, und
keine ist unter 0,55.

**Zweite Ursache, und die größere: die Farbe hatte kaum FLÄCHE.** Sie saß am aktiven Reiter,
an den Hauptknöpfen und an ein paar Chips. Der Eindruck eines Bogens kommt aber vom
Untergrund, und der war in jeder Klasse derselbe. Dagegen zwei neue Schichten:

- **Der ANSTRICH** (`--anstrich` am `#root`): ein weicher Zug der Klassenfarbe über das
  Papier. Am `#root` und nicht am `body`, weil das Papier dort schon seine Struktur hat und
  eine Klassenregel sie ERSETZT statt ergänzt hätte. Zwei Ebenen, die sich nicht kennen.
- **Die KARTEN** (`[data-accent] .karte`): sie tragen den Ton mit. Ohne das bringt der
  Anstrich fast nichts — die Karten liegen darüber und sind zu 70% deckend, sichtbar blieb
  die Klassenfarbe also nur in den LÜCKEN. Gefunden im gebauten Bogen, nicht gerechnet.

**Und der Grund, warum das die Kampagnenfarbe nicht kaputtmacht — das ist der ganze Trick:**
an der Karte steht ein `background-image`, keine `background-color`. Ein Bild liegt ÜBER der
Farbe statt sie zu ersetzen, also bleibt die Kampagnenfarbe darunter sichtbar. Und auf der
Startseite steht ohnehin kein `data-accent`.

#### Was die Messung gelehrt hat, und es war jedes Mal überraschend

- **Entsättigen macht zwei Farben ÄHNLICHER, nicht verschiedener.** Der Kämpfer war zu nah
  am Kleriker; ich habe seine Sättigung gesenkt, und der Abstand fiel von 48 auf 28 — weniger
  Buntheit schiebt ihn Richtung Grau und damit näher an das helle Blau des Klerikers.
- **32 Grad reichen bei BLAU nicht.** Zwei Grüne mit demselben Abstand sahen deutlich
  verschieden aus, Kleriker und Kämpfer nicht. Also eine ZWEITE Achse: `--wash-shift`, eine
  Helligkeitsstufe je Klasse, bei den drei Blauen um je 18%.
- **Der Anstrich ist ZWEIFARBIG** — oben die Bedienfarbe, unten die Zierfarbe. Das war der
  dritte Schritt, weil die Helligkeitsstufe allein noch nicht reichte, und es kostet nichts:
  die zweite Farbe steht je Klasse längst da und ist ausdrücklich QUER zur ersten gewählt.
  Barden-Koralle gegen Kämpfer-Messing sind 53 Grad, wo die Bedienfarben nur 32 hergeben.
- **Eine Zier-Kollision zählt nur zwischen Klassen, deren HAUPTfarben nah sind.** Fünf
  Klassen teilen ungefähr dasselbe Gold (62–92) — harmlos, solange ihre Hauptfarben weit
  auseinanderliegen. Durchgerechnet blieb genau EIN echtes Problempaar: Barbar und
  Hexenmeister hatten dieselbe Zierfarbe (40) UND dieselbe Helligkeitsstufe (0) bei nur 40
  Grad Hauptfarben-Abstand. Und ein zweites bei den Karten: Waldläufer-„Leder" stand auf 62
  und damit fast auf der Rinde des Druiden, wo beide Klassen grün sind.

#### Zwei Testfallen, und die zweite ist die schlimmste Sorte

- **`^Wild$` trifft den Knopf nicht.** Er trägt den Namen UND den Hinweis darunter
  („Wild\nRost und Ruß — Barbar"). Zum dritten Mal derselbe Fehler, und er sieht jedes Mal
  aus wie ein fehlender Knopf in der App.
- **Ein Test, der nichts messen konnte und Erfolg meldet.** Die erste Fassung verglich alle
  Paare gegen einen Anfangswert von 999 — und war GRÜN, obwohl kein einziges Thema gefunden
  wurde. Das ist schlimmer als kein Test: er behauptet genau das, was zu beweisen war. Jetzt
  steht die Frage „wurden alle elf gemessen?" VOR dem Vergleich, und bei weniger als zwei
  bricht der Lauf ab.
- **Und eine Schwelle, die ich selbst falsch gesetzt hatte:** von JEDER Schicht 25 zu
  verlangen ist unfair gegen die Karte, die absichtlich die leiseste ist (Text steht darauf).
  Von einer zurückhaltenden Schicht dasselbe zu fordern wie vom Ganzen heißt, sie so lange
  hochzudrehen, bis sie nicht mehr zurückhaltend ist. Jetzt entscheidet die SUMME über alle
  drei Flächen (≥70), dazu ein Mindestmaß je Fläche, damit keine still auf null fällt.

Ergebnis, gemessen im gebauten Bogen: das engste Paar liegt insgesamt bei **123**, die
Bedienfarben bei **51**, der Anstrich bei **40**, die Karten bei **19**. Vorher war der
Anstrich zwischen Kleriker und Kämpfer **7**.

### Runde 2: die zweite Farbe und der Charakter je Klasse

Sein Auftrag danach: „Ich hab 2 Varianten bitte Bau jetzt die nächsten für die Klassen."
Gebaut ist damit, was aus den Entwürfen noch fehlte — und alles nach derselben Regel wie
Runde 1: **Variablen, keine Komponenten.** Drei Stück je Klasse, alle in EINER Zeile:

- **`--ac2-h/-s/-l` — die Zierfarbe.** Sie hat einen JOB und ist keine Dekoration: sie färbt,
  was der Bogen über SICH sagt (die Abschnitts-Überschriften), während die Bedienfarbe färbt,
  was man DRÜCKEN kann. Ohne diese Trennung wären es zwei Farben mit derselben Bedeutung.
  Technisch eine eigene Tailwind-Farbe (`--color-trim-*` im `@theme`), damit `text-trim-400`
  überhaupt existiert — ein Farbwert ohne Hilfsklasse wäre unbenutzbar.
- **`--radius-*` — die Ecken.** Tailwind liest den Radius aus einer Variablen, `rounded-lg`
  wird also je Klasse weich oder kantig, ohne dass eine Karte angefasst wird. Der Druide ist
  gewachsen (0,9rem), der Barbar geschlagen (0,2rem).
- **`--tracking-widest` — die Laufweite der Überschriften.** Derselbe Trick. Der Mönch bekommt
  Luft (0,22em), der Barbar drängt (0,06em).

**Der Standardwert der Zierfarbe IST `slate-400`** — abgelesen (`oklch(70.4% 0.04 256.788)`),
nicht geschätzt. Ohne Klassenthema sieht deshalb keine Überschrift anders aus als vorher; das
Codex-Aussehen hat er schon abgenommen, und eine Runde, die das nachträglich verändert, hätte
er nicht bestellt.

**Und die Falle, die diese Runde wirklich gekostet hat: ein Faktor 10 zu viel.** Die Buntheit
stand als `calc(0.11 * var(--ac2-s) * 10)` da — bei `--ac2-s: 0.62` also 0,68, weit außerhalb
des darstellbaren Bereichs. Der Browser klemmt ab, und aus dem Blattgold des Paladins wurde
ein knallrotes `rgb(255,77,0)`. Das Schlimme daran: **der Test hat die Zahl gemessen und
trotzdem grün gemeldet**, weil „Rot und Grün über Blau" auf Orange genauso zutrifft wie auf
Gold. Eine Prüfung, die eine Farbe nur nach der REIHENFOLGE der Kanäle beurteilt, hält jede
ausgerissene Farbe für richtig. Jetzt prüft sie zusätzlich die BUNTHEIT (Abstand zwischen
größtem und kleinstem Kanal): eine Zierfarbe liegt zwischen 18 und 110, alles darüber ist
kein Schmuck mehr, sondern ein Warnschild. Gold `{199,183,133}`, Rinde `{168,149,127}`.

Zwei Fallen aus dieser Runde:

- **Farben messen heißt Pixel messen.** Die erste Fassung des Tests las
  `getComputedStyle(...).backgroundColor` mit einem `rgb(...)`-Ausdruck und bekam immer
  `null`: seit die Themen in `oklch()` stehen, gibt Chrome auch `oklch(...)` zurück. Der Test
  zeigte damit auf die App, obwohl die Farbe längst da war. Jetzt geht der Wert durch eine
  1×1-Zeichenfläche — was dort ankommt, ist das, was er sieht.
- **Und die Anführungszeichen zum vierten Mal.** `check("… „Aussehen"", …)` — deutsche
  Anführungszeichen in einer doppelt gequoteten Zeichenkette, dreimal in einer Datei. Es
  hilft offenbar nicht, es aufzuschreiben: **in Teststrecken gar keine `„…"` verwenden**, auch
  nicht in Beschriftungen.

## Volk und Klasse als Kacheln — und die sieben Köpfe

Sein Auftrag: **„Danach hätte ich gerne die Volkauswahl als Kacheln mit jeweils einem
Piktogramm des Kopfes (wie bei BG3) der jeweiligen Rasse. Danach das selbe mit den Klassen.
Piktogramme und Kacheln."**

Vorher war beides eine LISTE (`PickList` im Assistenten): pro Zeile ein Name, eine
Kleinzeile, ein „Infos ▸". Jetzt ein Raster (`ui/PickTiles.tsx`), zwei Spalten am Handy,
drei ab `sm`, je Kachel ein Zeichen in 40 px. **Für die Klassen war nichts zu zeichnen** —
sie tragen genau die elf Embleme, die schon am Bogen als Wasserzeichen stehen
(`accentOfClass`), und das ist der Punkt: eine zweite Tabelle hier hätte bedeutet, dass der
Assistent ein anderes Symbol zeigt als der Bogen danach. Der Lauf prüft es hart — dieselbe
Form, Pfad für Pfad.

Drei Entscheidungen sind eine Notiz wert:

- **Der Zeichenname kommt aus der KENNUNG**, nicht aus einer Zuordnung: `srd:race:half-orc`
  → `halfOrc` (`ui/raceIcon.ts`). Dieselbe Regel wie bei den Reitern und den Klassen. Der
  Unterschied ist der RÜCKFALL: eine unbekannte Klasse bekommt gar kein Thema (eine falsche
  Farbe wäre schlimmer als keine), eine Kachel dagegen MUSS etwas zeigen, sonst klafft ein
  Loch im Raster — also das neutrale `characters`. Der Test liest dazu `packs/srd/races.json`
  und nicht eine Liste im Test: sonst wäre die Liste die zweite Wahrheit, die veraltet.
- **Das Infofeld steht in voller Breite UNTER dem Raster**, nicht in der Kachel: `RaceInfo`
  und `ClassInfo` sind dichte Faktentabellen und in 170 px unlesbar. Dafür trägt es den Namen
  als Überschrift — losgelöst von der Zeile muss es selbst sagen, wovon es redet.
- **Der Stufenaufstieg bekommt dieselben Kacheln** (vorher eine Chip-Reihe plus ein
  Aufklapper mit schmaler Liste). Dort wird `info` ABSICHTLICH nicht übergeben: die
  Faktentabelle der gewählten Klasse steht schon darunter, und zwei Infofelder auf einem
  Schirm wären zwei Wahrheiten. Nebenbei ist damit ein zweiter Weg zur selben Auskunft weg.

**Die sieben Köpfe haben vier Anläufe gebraucht, und jeder Fehlschlag war dieselbe Sorte
Missverständnis: eine FLÄCHE an der falschen Stelle wird etwas anderes.**

| Fehlschlag | las sich als |
|---|---|
| Mensch: Haaransatz bis an den Umriss | Badekappe |
| Elf: Ohren bis x=2,6, so dick wie der Kopf | Flügel |
| Zwerg: ein durchgehender Umriss | Affengesicht (kein Bart zu sehen) |
| Zwerg: Schnurrbart als ∩-Bogen | trauriger Mund |
| Zwerg: Nase plus Schnurrbart | Schnauze |
| Gnom: spitzes V unter dem Kinn | Möhre |
| Gnom: breiter Kinnbart | offener Mund |
| Gnom: große Nase | Schlüsselloch, mit den Ohren ein Affe |
| Gnom: Zipfelmütze | Helm |
| Halb-Ork: Mundlinie plus zwei Hauer | Eimer im Mund |
| Halb-Ork: gebogene Hauer außen | Wangenfalten |
| Halb-Ork: Braue über die ganze Breite | Mützenschirm |

Daraus die zwei Regeln, die am Ende alle sieben gerettet haben: **in der Mitte des Gesichts
steht nichts** (dort entsteht sofort eine Schnauze), und **was Haar sein soll, darf den
Umriss nicht berühren** (sonst ist es eine Kappe). Unterschieden wird im UMRISS: schlicht ·
kurze Spitzohren · lange Spitzohren · breiter Bart · große Rundohren · Locken oben ·
schwerer Kiefer mit Hauern. Dazu die Gegenprobe gegen die zwei Klassenzeichen, die selbst
Gesichter sind (Schädel, Maske) — sie kommen im Assistenten einen Schritt später.
**Gefunden hat das alles ein Blatt mit allen sieben in 30/40/56/110 px, kein Test.** Dieselbe
Lehre wie beim Barbaren, nur diesmal von vorn eingeplant.

### Und dann waren die Striche trotzdem falsch: „zu simpel"

Sein Urteil über die fertigen Köpfe, DREIMAL in Folge: **„Finde ich alle zu simpel. Sehen
nicht gut aus."** Das ist der wichtigste Abschnitt dieses Kapitels, weil er nicht von den
Zeichen handelt, sondern von mir.

**Mein erster Versuch war fünf Fassungen — und alle fünf waren dieselbe Zeichnung.** Fläche
zu 18% darunter, dickerer Strich, ein Ring drumherum, alles zusammen. Das sind DOSEN, keine
ARTEN. Wer „zu simpel" sagt und eine dickere Version derselben Strichzeichnung bekommt, sagt
zu Recht noch einmal „zu simpel". Dass er es dreimal sagen musste, ist der Befund.

Erst ein Blatt mit drei ARTEN hat es entschieden — gefüllt wie eine Prägung · drei Tonstufen ·
viele Zierlinien —, und zwar an zwei Motiven und in vier Größen. **Seine Wahl: die Prägung
(gefüllt, Details ausgestanzt).** Und der Grund dafür war am Blatt MESSBAR und nicht Geschmack:
die Kachel zeigt 40 px, und das ist die einzige der drei Arten, die dort nicht zerfällt — die
Tonstufen wurden ein grauer Klumpen, die Zierlinien liefen zusammen.

Drei Dinge daran sind eine Notiz wert:

- **Die Machart steht jetzt im TYP** (`IconShape`: `d` für Striche, `solid` für die Fläche mit
  `fill-rule="evenodd"`), und der Test verbietet beides gleichzeitig UND erlaubt die Fläche
  nur den sieben Köpfen. Zwei Macharten sind schon eine Ausnahme; drei Zustände wären eine
  Einladung. Nebenbei prüft er, dass jede Fläche mindestens drei Teilpfade hat: eine Fläche
  ohne Löcher ist ein schwarzer Klecks in Kopfform, und `evenodd` hätte nichts zu tun.
- **Die Fläche braucht keinen Ton und keine zweite Farbe** — Löcher statt heller Stufen.
  Deshalb dreht sie auf hellem Papier von allein mit und nimmt die Klassenfarbe wie jedes
  andere Zeichen. Die Tonstufen-Fassung hätte je Papier anders gewirkt: genau das hat die
  Messung an den verbrauchten Zauberpunkten schon einmal gezeigt (Kladde, Buntrampe).
- **Ein Strich um eine Fläche macht die Löcher zu.** Bei 40 px ist ein Augenloch 1,7 px groß,
  die Strichbreite 1,6 — das Loch verschwindet. `stroke="none"` an der Fläche ist deshalb
  keine Kosmetik.

Die elf Klassenembleme bleiben Striche: **seine Entscheidung war „nur die sieben Köpfe".** Der
Assistent zeigt sie weiter genauso wie das Wasserzeichen am Bogen — und die Prüfung, die
beide Formen Pfad für Pfad vergleicht, gilt unverändert.

### Was der Lauf dieser Runde in ALTEN Strecken gefunden hat

Sechs Strecken schlugen fehl, und **keiner der Fehler lag an dieser Runde** — nachgemessen,
nicht behauptet: dieselbe Strecke gegen einen Build OHNE die Änderung meldet dasselbe.
Zwei Ursachen, beide lehrreich:

- **Eine Adressprüfung, die auch die Adresse des Assistenten trifft.** `/\/charaktere\//`
  passt auf `/charaktere/neu`. Seit der Assistent am Ende EINMAL nachfragt, wenn noch etwas
  offen ist, endet „Anlegen" auf einer Rückfrage — vier Strecken klickten sie nie, blieben im
  Assistenten und hielten ihn für einen Bogen. Danach prüften sie einen Bogen, den es nicht
  gab, und der Fehler zeigte auf die Reiterleiste, den Zauber-Reiter, den Zähler. Die Prüfung
  verlangt jetzt die KENNUNG (`/charaktere/[0-9a-f-]{8,}/`).
  **Inzwischen sind es SECHS**: in der Rüstungs-Runde kamen `e2e-eigene` und
  `e2e-ausruestung-deutsch` dazu, beide mit derselben Ursache und beide nachweislich
  älter als die Runde (dieselbe Strecke gegen einen Build ohne die Änderung meldet
  dasselbe — nachgemessen, nicht behauptet). Eine Rückfrage, die eine Runde EINBAUT,
  bricht jede Strecke, die durch den Assistenten geht; wer sie einbaut, muss die Sonden
  mitzählen.
- **`:visible` fehlte**, zum wiederholten Mal: der Weiter-Balken steht zweimal im DOM (einer
  für schmal, einer ab `md`), und der unsichtbare steht vorn. Zwei Sonden von VOR diesem
  Balken (30.07., der Balken kam am 31.07. mit `222c6b1`) liefen deshalb seit Monaten in
  einen Timeout, ohne dass es jemandem auffiel.

Dazu zwei stehengebliebene Erwartungen aus der TP→HP-Runde: eine Zusammenfassungs-Prüfung
auf `\bTP\b` und die harte Liste der 13 Talent-Kategorien, in der noch „TP" stand — sie
zählte 12 und meldete die App als falsch. **Eine Kürzel-Umbenennung muss auch durch die
Teststrecken gehen**, nicht nur durch den Quelltext; die Schranke in `strings.test.ts` deckt
`src`, nicht die Sonden im Notizordner.

Und ein Befund, der bleibt und NICHT von hier kommt: **bei neun Bögen scrollt die Startseite
schon** (933 gegen 844 px bei 390×844), obwohl seine Entscheidung „ab etwa zehn wird
gescrollt" lautet. Auch das gegen den alten Build gemessen — identisch. Wer das angeht, dreht
an `ui/cardTier.ts`; es ist eine Geschmacksfrage über die Kartenhöhe und deshalb hier nur
notiert.

## Eigene Zeichen statt Emoji

Sein Auftrag: „Kannst du die Emojis durch eigene icons ersetzen? Kannst du die bei Figma
erstellen?" Beides ja — und der Grund für das Erste ist mehr als Geschmack: **bei einem Emoji
bestimmt die Schriftart des Geräts die Farbe, nicht die App.** Genau daran ist die elfte Falle
gescheitert (gelber Punkt auf gelben Funken). Diese Runde legte 21 Zeichen als Striche in
`ui/icons.tsx`, alle 24×24, Strichbreite 1,6, `currentColor` — inzwischen sind es **39**
(elf Klassen, sieben Völker sind dazugekommen; die Zahl steht als Schranke in
`ui/icons.test.ts`).

Vier Entscheidungen daran sind eine Notiz wert:

- **Der Schlüssel des Reiters IST der Name des Zeichens.** Deshalb steht am Bogen keine
  Zuordnungstabelle mehr, sondern `Record<TabKey, IconName>` — der Typ verlangt, dass wer einen
  achten Reiter dazunimmt, ein Zeichen dazuzeichnet.
- **Ein Zeichen gehört in die ANSICHT, nicht in den Text.** Zwei Emoji standen in `strings.ts`
  (`rollAll`, `levelUp.ready`). Dort kann ein Zeichen seine Farbe nicht vom Knopf nehmen, und
  in einem Export steht ein Bildchen mitten im Satz. Beide sind jetzt reiner Text, das Zeichen
  steht daneben. Der Test verbietet Emoji in `strings.ts` hart.
- **Die typografischen Zeichen bleiben** (✓ ✕ ★ ☆ ✧ ⚠ ⟳ ✎ − ＋). Sie sind einfarbig und nehmen
  `currentColor` — sie waren nie das Problem. Wer sie mitersetzt, fasst 40 Stellen an und
  gewinnt nichts.
- **Ab `md` tragen die Reiter jetzt auch ein Zeichen.** Unten am Handy stand ein Emoji, oben in
  der Chip-Reihe nur Text — dieselben sieben Reiter sahen auf dem iPad also anders aus als auf
  dem iPhone. Seit die Zeichen aus dem Quelltext kommen, kostet die Angleichung nichts.

**Und die Gegenprobe, die den Ring rettet:** die Warnung liegt am Handy AUF dem Zeichen. Die
Farbe dahinter ist jetzt unsere — aber es ist die KLASSENFARBE, und die wechselt je Bogen. Ein
fester Kontrast wäre also weiter geraten; der `ring` in `OpenDot` bleibt deshalb.

**Drei Zeichen mussten neu gezeichnet werden, und gefunden hat das nur das Hinsehen.** Ein
Blatt mit allen 21 in 14/19/30 px (`scratchpad/icons-blatt.png`, gerendert aus `ICON_SHAPES`)
zeigte: `combat` war ein **Kreuz** (†), `inventory` ein **Vorhängeschloss**, `spellbook` eine
**Tür**. Kein Test hätte das gemeldet — `pnpm test` prüft, dass ein Pfad gültig ist, nicht was
er zeigt. Behoben: die Klinge ist jetzt eine Umrissform (bei 14 px läuft sie zu einem breiten
Strich zusammen, und der breite Strich gegen die dünne Parierstange ist genau das, was ein
Kreuz nicht hat) · der Bügel oben ist weg, statt ihm eine Deckelnaht · das Buch hat ein
Lesebändchen mit Kerbe. Lehre: **bei einem Zeichen ist das Blatt der Test.**

**Was der Test trotzdem kann**, und das ist die andere Hälfte: er prüft JEDEN Pfad (fängt mit
`M` an, nur erlaubte Zeichen, alle Zahlen im 24er-Feld — ein verrutschtes Komma malt nämlich
gar nichts, und der Browser schweigt dazu), und er liest die Quelltexte auf Emoji. Die
Quelltext-Prüfung ist Absicht: der Lauf im gebauten Bogen sieht nur, was gerade gerendert IST
— ein Emoji in einem Zweig, den er nicht aufschlägt, findet er nie.

**Figma: die Datei steht, gefüllt ist sie nicht.** `Chardex35 — Zeichen` ist angelegt
(`u4HQAuJgzTjqzJBQEfC6YJ`), aber jeder SCHREIBENDE Figma-Aufruf braucht in dieser Umgebung
seine Zustimmung, und die kann von hier niemand geben — drei Versuche, kurz und lang, alle mit
„requires approval". Die 21 Formen sind deshalb als eine SVG-Datei mit 21 benannten Gruppen
herausgegeben; die zieht er in Figma hinein und hat 21 benannte Ebenen. **Und die Richtung
bleibt so:** die WAHRHEIT ist `ICON_SHAPES` im Quelltext, weil das ausgeliefert wird — Figma
ist die Ansicht davon, nicht die Quelle. Eine SVG-Datei im Repo wäre eine zweite Wahrheit für
dieselben Formen, deshalb liegt sie dort nicht.

**Und die Anführungszeichen zum FÜNFTEN Mal, diesmal an einer neuen Stelle.** `„…"` in einer
Zeichenkette hat den Figma-Sandkasten mit „SyntaxError: unexpected character" abgewiesen —
Umlaute gehen, die deutschen Anführungszeichen nicht. Die Regel gilt damit über die
Teststrecken hinaus: **in erzeugtem Code überhaupt keine `„…"`.**

Zwei Testfallen aus dieser Runde, beide in MEINEM Lauf und nicht in der App:

- **`:visible` ist keine Kosmetik.** Der Weiter-Balken des Assistenten steht zweimal im DOM
  (einer für schmal, einer ab `md`), und der unsichtbare stand vorn. Dasselbe bei der unteren
  Reiterleiste, die ab `md` weiter im DOM steht (nur `md:hidden`). Ein Klick darauf läuft in
  einen Timeout — und der sieht hinterher aus wie ein Fehler der App.
- **Die Seitenleiste ist bei 390px 0×0 groß.** Die Prüfung „jedes Zeichen ist quadratisch und
  zwischen 12 und 24 px" schlug an ihr fehl, obwohl die App recht hatte. Wer eine Größe misst,
  misst das, was in DIESER Breite wirklich da ist.

## Abgleich nur beim Start — und die Kosten, die mit weggefallen sind

Sein Auftrag, wörtlich: „Abgleich bitte nur nach dem Start der App. Mitten drin ist Quatsch
denn ich spiele ja nicht auf 2 Geräten gleichzeitig. Deaktiviere die Funktion. Nicht
löschen!" Also **deaktiviert, nicht entfernt**: `MID_SESSION_SYNC` in `sync/SyncGate.tsx` ist
die eine Zahl, an der die zwei Auslöser mittendrin hängen (Rückkehr in den Vordergrund und
das gedrosselte Hochschreiben vier Sekunden nach jeder Änderung). Auf `true` ist das alte
Verhalten zurück, ohne dass jemand etwas nachbaut.

Drei Dinge daran sind eine Notiz wert:

- **Der „online"-Horcher bleibt, aber nur als NACHHOLEN.** Am Spieltisch ist kein Netz der
  Normalfall, der Start-Abgleich fällt dort also aus. Kommt das Netz später, wird er
  nachgeholt — und danach schweigt der Horcher (`startDone`). Ohne diese Abfrage wäre er ein
  Abgleich mittendrin, denn am Tisch fällt das Netz mehrmals aus und wieder ein.
- **Der Fingerabdruck lief weiter und kaufte nichts mehr.** `useLocalFingerprint` liest bei
  JEDEM Schreibvorgang alle Charaktere samt Porträt aus der Datenbank — sinnvoll, solange
  danach abgeglichen wurde. Jetzt liest es niemand mehr, also läuft die Abfrage auch nicht
  mehr. Der Hook selbst bleibt und wird unbedingt gerufen (ein Hook hinter einer Bedingung
  ist kein Hook); übersprungen wird nur die Arbeit darin.
- **Die Kehrseite steht dabei:** eine installierte Web-App auf dem iPhone wird aus dem
  Hintergrund geholt und selten wirklich neu geladen — dieselbe Beobachtung wie beim „Es
  kommt kein Update". Zwischen zwei echten Starts kann also viel Zeit liegen. Deshalb sagt
  der Kleintext am Schalter jetzt „Beim Start abgleichen … dafür ist der Knopf oben da",
  und die Sicherungs-Zusage in den Einstellungen nennt den Stand vom LETZTEN Abgleich statt
  von diesem Moment. Eine Sicherung, die man für aktueller hält, als sie ist, ist die
  gefährlichste.

**Und ein alter Befund wurde dadurch scharf.** Die Abgleich-Marke lag bei `bottom-4rem`
genau auf der Reiterleiste des Bogens; weil sie ein Link in die Einstellungen ist, öffnete
ein Tap auf „Talente" die Einstellungen. Das stand als offener Punkt im Prüfbericht und war
selten — bis jetzt: einen Fehler überschreibt kein späterer Abgleich mehr, die Marke steht
also die ganze Sitzung da. Behoben mit demselben Wert wie `UndoBar.tsx` (7rem = 3,5rem
Hauptnavigation + 3,5rem Reiterleiste). Gefunden hat es der Lauf im gebauten Bogen, und zwar
auf die harte Art: er blieb an der Marke hängen, weil sie den Klick abfing.

Dazu zwei Testfallen aus derselben Runde:

- **Die Sperre gehört zur Richtung.** Nach dem Vertauschen von − und + prüft der Lauf beide
  Enden: bei allen freien Plätzen ist + gesperrt (es gibt nichts zurückzugeben), bei keinem
  freien Platz −. Ohne diese zwei Prüfungen hätte ein vertauschtes `disabled` niemandem
  wehgetan, bis er am Tisch auf einen toten Knopf tippt.
- **Die fünfte Falle, diesmal im Test.** Die Prüfung „Marke liegt über der Reiterleiste"
  schlug ab `md` fehl — dort steht die Leiste OBEN, und der Vergleich lief gegen etwas am
  anderen Bildschirmrand. Die App hatte recht. Wer eine Überdeckung prüft, muss prüfen, ob
  das Verdeckte in dieser Breite überhaupt dort ist.

## Halbe Fertigkeitsränge — und warum sie zweimal weg mussten

Sein Befund: „Bei Hike habe ich grade wieder in 0.5er Schritten stellen können. Das sollte
doch raus. 2 Skillpunkte = 1 Rang bei denen." Er hat recht, und die Regel stand längst
richtig da — nur nicht überall.

**Die vergessene dritte Stelle.** Der Commit „Ganze Fertigkeitsränge (3.5)" hat
`CharacterWizard.tsx`, `LevelUp.tsx`, `tabs-more.tsx` und `tables.ts` angefasst —
`tabs-core.tsx` stand NICHT in seiner Dateiliste. Dort lebte `skill.isClassSkill ? 1 : 0.5`
weiter, also genau am Bogen, an dem er am Tisch tippt. Zwei Ansichten sagten „ganze Ränge",
die dritte widersprach. Lehre, und sie ist die Verwandte der zwölften Falle:
**eine Regel, die in DREI Ansichten steht, steht in keiner.** Die Schrittweite ist deshalb
jetzt `stepRank` im Kern, mit Test — und alle drei holen sie von dort. Klassenfremd ist
nicht der RANG halb, sondern der PREIS doppelt (`skillPointCost`).

**Ein halber Rang stirbt nicht durch einen besseren Knopf.** Gespeichert liegen sie weiter
da: aus einem Fight-Club-Import (das Format schreibt „Hide (0.5)", und der Parser liest
Dezimalstellen ausdrücklich) oder von einem Klick vor dieser Runde. Automatisch runden wäre
eine Zahl auf einem bestehenden Bogen — also gewarnt statt gerundet (`half-rank` in
`validate.ts`), und der ±-Knopf ist der Ausweg: `stepRank` führt von 2,5 auf 2 bzw. 3. Der
Import bleibt ehrlich und liest, was in der Datei steht; die Warnung sagt es danach.

**Und der Fund daneben, wieder „etwas weiß es, und etwas anderes kann es nicht":** ein
halber Rang macht den GESAMTWERT krumm (2,5 + DEX 2 = 4,5). Daraus baute die Anzeige
`1d20+4.5`, `parseDice` kennt keine Dezimalstellen und gibt `null` zurück, und
`diceStore.roll` verschluckte das mit einem stillen `return null`. **Der Würfelknopf an
dieser Zeile tat gar nichts** — ohne ein Wort dazu. Alle vier Wurfstellen gehen jetzt durch
`d20Roll` (abgerundet wie überall in 3.5), und der Test prüft nicht den Text, sondern die
STRECKE: was `d20Roll` baut, muss `parseDice` lesen können. Ein Test auf die Zeichenkette
allein hätte genau diesen Fehler durchgelassen.

Zwei Testfallen aus derselben Runde, beide in MEINEM Test und nicht in der App:

- **Die Warnung ist selbst ein `li`.** Sobald „Spot: 2,5 Ränge…" dasteht, trifft
  `page.locator("li").filter({hasText:/spot/i}).first()` den HINWEIS und nicht die Zeile
  mit den Knöpfen. Eingeengt wird auf den Kasten, der einen Knopf TRÄGT — und die
  Hilfsfunktion wirft, statt still auf den falschen zu zeigen.
- **Ein regulärer Ausdruck über den ganzen Bogen trifft den eigenen Text.** Die Prüfung
  „keine krumme Zahl im Wurf" (`/\d\.5/`) schlug an „Halbe Ränge gibt es in **3.5** nicht"
  an — meiner eigenen Warnung. Gemessen wird im Würfelblatt, nicht im Body.

Nebenbei mitgeradegerückt: die Meldungen schrieben „2.5 Ränge" mit englischem Dezimalpunkt
in einem deutschen Satz. Eine Zahl in einem deutschen Satz bekommt ein Komma (`de()` in
`validate.ts`); ganze Zahlen bleiben unberührt.

## Der Bearbeiten-Modus: eine rote Leiste statt zweier Leisten

Vier Sätze in einer Runde, und alle vier zeigen auf denselben Zustand — den, in dem man
etwas nachträgt statt zu spielen.

1. **„Wenn ich einen neuen Zähler anlege, dann möchte ich … die kompletten Optionen …
   sofort haben, nicht einfach nur den Namen anlegen. Jetzt aktuell muss ich dann immer
   erst über Bearbeiten gehen und dann den Zähler bearbeiten. Wer das nicht weiß, findet
   das niemals."**
2. **„diese komische ZFW Button, das soll ausgeschrieben sein, dass son son Buttons
   nebeneinander sein und nicht einer mit am einen Buchstaben nur der dann wechselt."**
3. **„dann möchte ich bitte, dass Kopf- und Fußleisten verschwinden und dafür die Warnung,
   dass ich im Bearbeitungsmodus bin, klar erkennbar, also bestenfalls in Rot, rötlich am
   unteren Bildrand als Leiste mit Hover Effekt."**
4. **„Außerdem soll es beim Bearbeiten möglich sein zwischen den verschiedenen Seiten hin
   und her zu wechseln und dauerhaft im Bearbeitungsmodus zu bleiben."**

Auf die Frage, wie man dann noch die Seite wechselt, hat er entschieden: **„Rote Leiste
TRÄGT die Reiter."** Damit beantworten 3 und 4 sich gegenseitig, und es braucht keine
zweite Leiste.

### Punkt 1 und 2: drei `prompt()` weniger

Das Anlegen ging über `prompt()` für den Namen, danach war der Zähler fertig — Art,
Grenze, Auffüll-Bedingung und Bereich standen nur im Bearbeiten-Modus hinter einem
weiteren Knopf. Und die Art war ein Knopf, der `Z` → `F` → `W` durchschaltete: dieselbe
⟳-Falle, die bei den Auffüll-Bedingungen schon einmal aufgelöst wurde, nur mit
ABKÜRZUNGEN statt Wörtern. Ab drei Werten rät man, welcher als nächstes kommt.

Gebaut ist ein Formular (`TrackerFields`), das beim ANLEGEN und beim BEARBEITEN dasselbe
ist — der Weg über „erst anlegen, dann bearbeiten" fällt damit weg, statt bequemer zu
werden. Die Art steht als drei Knöpfe mit je einem Erklärsatz; der Entwurf lebt als
`TrackerDraft` im Zustand und wird erst beim „Anlegen" geschrieben.

**Der neue Zähler startet VOLL, wenn er eine Grenze hat.** Eine frische Figur hat ihre
Tagesfähigkeiten noch nicht verbraucht — derselbe Fehler war beim Assistenten schon
einmal da (`value: 0` in jedem Vorschlag).

### Punkt 3 und 4: die Leiste, und die Falle darin

Die Warnung IST die Reiterleiste unten: im Modus wird sie rosé und trägt links den
Ausgang. Die Hauptnavigation oben fällt weg (`lib/editMode.ts`, ein Store — die Hülle
kennt die Seite darin nicht), und mit ihr das obere Polster; ein Polster für eine Leiste,
die es gerade nicht gibt, ist die fünfte Falle wörtlich.

**Und die fünfte Falle ist mir in derselben Runde trotzdem passiert.** Die Reiterleiste
ist seit jeher `md:hidden` — am iPad stehen die Reiter oben als Chips. Im Bearbeiten-Modus
gab es dort deshalb **gar keine Leiste: keine Warnung und keinen Ausgang.** Sein Wort
sagte es selbst und ich habe es überlesen: ein Daumen fährt nicht über etwas, „Leiste mit
Hover Effekt" MEINT die große Fassung. Jetzt gilt `md:hidden` nur außerhalb des Modus; im
Modus steht die Leiste in jeder Breite, rückt hinter die Seitenleiste (`md:left-52`), und
die Chip-Reihe oben verschwindet — sonst gäbe es zwei Reiterleisten für dieselbe Frage.

**Gefunden hat es keine Prüfung dieser Runde, sondern eine ALTE Strecke**, die den Modus
auf dem iPad wirklich einschalten wollte und in einen Timeout lief. Meine neue Strecke war
grün — weil ich ihren ganzen Leisten-Block hinter `width < 768` gestellt hatte. **Eine
Prüfung, die eine Breite ausnimmt, behauptet nicht „hier gilt es nicht" — sie schaut nur
nicht hin.** Ausgenommen wird jetzt nur, was in dieser Breite wirklich anders IST (oben
die Hauptnavigation); alles andere wird überall gemessen, und dazu gehört die Gegenprobe,
dass die Reiter genau EINMAL anklickbar sind.

### Was der BLICK gefunden hat

Der Satz „Für eigene Mechaniken: Aktionspunkte, Schicksalspunkte …" ist der Hinweis für
einen leeren Bereich. Bei offenem Formular rutschte er unter „Anlegen / Abbrechen" und las
sich wie deren Erklärung. Er steht jetzt nur, solange das Formular ZU ist. Genau dieser
Fund ist beim Verteilen-Knopf im Punktekauf schon einmal gemacht worden, und wieder hat
ihn kein Test gebracht, sondern ein Bildschirmfoto.

### Vier tote Teststrecken, und keine davon war es wegen dieser Runde

Beim Nachlaufen der bestehenden Strecken fielen vier durch. **Gegen einen Build OHNE diese
Runde nachgemessen: identisch** — sie sind seit Runde #91 tot, als „Bearbeiten" hinter die
drei Punkte wanderte und der ✎-Chip über dem Reiter verschwand. Drei suchten weiter diesen
Chip, die vierte lief noch in die Rückfrage des Assistenten (das ist jetzt die SIEBTE
Strecke mit dieser Ursache) und zeigte obendrein auf einen Port, der gar nicht läuft.

Was sie dabei meldeten, ist die eigentliche Lehre: `e2e-vergessen` behauptete „Die Zahl im
Hinweis sinkt mit — 12 → 12" und klagte damit die App an. In Wahrheit ging der Modus nie
an, also gab es keine ±-Knöpfe, also wurde nichts geklickt. **Eine Strecke, deren
Hilfsfunktion still scheitert, meldet nicht „ich komme nicht hin" — sie meldet einen
Fehler an der Stelle, an der sie danach zufällig hinschaut.** Alle vier erkennen den
Zustand jetzt am Ausgang in der Leiste und werfen, wenn sie ihn nicht schalten können.

Dass es sich lohnt, sieht man an den Zahlen: `e2e-raenge` (15 Prüfungen) und
`e2e-vergessen` (39) liefen monatelang gar nicht, `e2e-eigene` brach vor seinen letzten
drei Prüfungen ab.

### Und die vierte davon hat zwei weitere Anklagen gegen die App erhoben

`e2e-featmods` lief nach der Wiederbelebung bis tief hinein und meldete dort zwei Fehler,
die nach echten Fehlern aussahen: „Initiative auf dem Bogen um 3 höher — vorher null,
nachher 2" und „Aufschlüsselung nennt das Talent als Herkunft — (keine Zeile gefunden)".
Sein Wort dazu war „aktuell haben wir keine Modifikatoren, die wir von Hand eintragen" —
also nichts, was am Tisch wehtut. Nachgesehen wurde trotzdem, und zwar aus einem Grund,
der in dieser Datei überall steht: **ein Knopf, der etwas verspricht und nichts tut, ist
schlimmer als kein Knopf.** Ob der „+ Modifikator" einer davon ist, ist keine
Geschmacksfrage.

Nachgemessen im gebauten Bogen (Talent Alertness, Modifikator „Initiative +3") war die App
in beiden Punkten im Recht: die Aufschlüsselung sagt „Initiative +3 · DEX-Modifikator +0 ·
**Talent: Alertness** +3" und der Würfel wirft `1d20+3`.

Der Fehler saß in **`openTab`**, und er ist die neunte Falle in ihrer teuersten Form: die
Hilfe klickte `button:visible` mit dem Wort, und der erste Treffer für `/Kampf/` ist bei
390 px die Kachel „NAHKAMPF" oder der Kategorie-Chip „Kampf" im Talentfilter — **nie der
Reiter**. Der Reiter wechselte also gar nicht, `tileValue` las die falsche Seite und
bekam `null`, und die Prüfung danach zeigte auf die App. Geklickt wird jetzt in der
REITERLEISTE (beide Formen, kurz und lang), und wenn nichts trifft, wird geworfen. Die
Aufschlüsselung wird im `[role="dialog"]` gelesen und nicht im Body.

Damit sind alle fünf Strecken grün, und der Fund ist die Regel selbst: **eine Sonde, die
sich ihr Ziel über ein Wort sucht statt über den Ort, findet irgendwann das falsche — und
meldet es als Fehler der App.**

## Erklärung, Zustand, Bedienung — die Grenze, die diese Runde gezogen hat

Vier Punkte, und der zweite hat eine Unterscheidung erzwungen, die es vorher nicht gab.

### 1. Ringkampf heißt Grapple

Sein Wort: **„Ringkampf in EN lassen."** Der dritte Fall derselben Familie nach GAB → BAB
und TP → HP, und wie dort steht die Entscheidung jetzt als Schranke in `strings.test.ts`
und nicht als Prosa.

**Die Gruppen-Überschrift musste mit**: „Bewegung & Ringen" über einer Kachel „GRAPPLE"
wären zwei Namen für einen Wert auf EINEM Schirm — genau der Fehler, den GAB gekostet hat.
Sie heißt jetzt „Bewegung & Grapple"; dass sie halb deutsch bleibt, ist die Regel dieser
App und kein Bruch (deutsche Oberfläche, englische Regelbegriffe mittendrin).

**Und die Schranke greift ABSICHTLICH nicht auf „Ringen".** Das deutsche Wort steht in den
Gegenstandstexten und meint dort etwas völlig anderes: „ein Hemd aus Ringen" ist das
Kettenhemd. Eine Prüfung, die zu weit greift, meldet eine Stelle, die mit der Regel nichts
zu tun hat — und man baut den Text kaputt, um sie grün zu bekommen.

### 2. Kurzbeschreibungen abschaltbar — und was das NICHT heißt

Sein Auftrag: **„Kurzbeschreibungen optional machen. Ich würde es für mich zum Beispiel
deaktivieren, denn ich kenne die Fähigkeiten meines Charakters … Alle Beschreibungen sollen
aber über antippen und ausklappen weiterhin nachlesbar sein."** Gefragt und entschieden:
**nur Regel-Erklärungen.**

Daraus folgt eine Grenze, die diese App vorher nicht ausgesprochen hatte — **drei Sorten
Kleinschrift, und nur eine davon darf weg:**

| Sorte | Beispiel | verschwindet? |
|---|---|---|
| **Erklärung** — wie die REGEL funktioniert | „Vom Angriff auf den Schaden, höchstens 6" | ja |
| **Zustand** — was an DIESEM Bogen gilt | „Kurzschwert: zählt einfach — eure Hausregel" | **nie** |
| **Bedienung** — was ein KNOPF anrichtet | „Gilt für diese Runde" | **nie** |

Eine Erklärung kann man auswendig können, einen Zustand nicht — er wechselt mit jedem
Waffenwechsel. Wer ihn mitversteckt, baut die Familie „etwas weiß es, und etwas anderes
kann es nicht" neu auf. Und wer den Bedienhinweis versteckt, macht aus jedem Knopf ein
Rätsel.

Gebaut als EIN Bauteil (`ui/RuleHint.tsx`) und nicht als `if` je Stelle: sonst steht die
Frage „darf das hier weg?" an jeder Stelle noch einmal und wird beim nächsten neuen Text
vergessen. Ausgeblendet bleibt ein ▸ mit dem NAMEN der Sache stehen — bei vier
Kampfoptionen untereinander wäre viermal „Erklärung ▸" nicht zu unterscheiden.

### 3. Was Power Attack mit der geführten Waffe macht

Sein Auftrag: **„dennoch würde ich gerne bei powerattack eine Anzeige haben, ob es mit der
geführten waffe anwendbar ist."** Der Anlass steht weiter oben in dieser Datei — sein Bogen
kämpft mit Kurzschwert und Schild, und nach dem Buch bringt Power Attack dort nichts.

**Der eigentliche Fund war eine doppelte Regel.** Die Bedingung „leichte Waffe bekommt
keinen Schaden" stand ZWEIMAL ausgeschrieben: als `lightBlocked` in `combatOptions.ts` und
noch einmal in `derive.ts` als Bedingung für den Hinweis an der Angriffszeile. Mit dieser
Anzeige wäre es die dritte Kopie geworden. Jetzt gibt es `powerAttackDamageFactor` (0 · 1 ·
2), und alle drei lesen von dort. Zwei Kopien einer Regel sind zwei Wahrheiten — es hätte
gereicht, die Hausregel an einer Stelle zu vergessen, und der Bogen hätte einen Satz
gezeigt, dem seine eigene Zahl widerspricht.

Gerechnet wird **zweimal** — nach dem Buch und mit seiner Hausregel —, und die Differenz
IST die Auskunft: `byHouseRule` sagt „ohne eure Regel brächte es hier nichts". Die
Alternative wäre gewesen, die Bedingung ein drittes Mal hinzuschreiben.

Gezählt wird nur, was **in einer Hand** liegt. Eine Waffe im Rucksack bekommt eine
Angriffszeile (das ist richtig und bleibt), aber „die geführte Waffe" ist sie nicht.

### 4. „Wirken" — Schritt für Schritt durch eine Tagesfähigkeit

Sein Auftrag: **„bei Turn undead hätte ich gerne einen Button der sagt ‚wirken' dann öffnet
sich eine infobox, die die Fähigkeit Schritt für Schritt durch geht. Ich glaub Ziele
auswählen, würfeln, schaden etc. ka. So dass ich das korrekt ausführe."** Gefragt und
entschieden: **auch Niederstrecken, Wut und Bardenmusik**, und **der Zähler geht am Ende
mit ab, mit Ansage.**

Die Anleitung steht im KERN (`engine/abilityGuide.ts`), weil jeder Schritt echte Zahlen
dieses Bogens trägt: die Probe ist `1d20+3`, weil sein CHA +3 ist, der Vertreibungsschaden
`2d6+9`, weil er Kleriker 6 mit CHA +3 ist. Eine Anleitung mit Platzhaltern wäre eine
Bedienungsanleitung; eine mit seinen Zahlen ist ein Handgriff. Und was Zahlen rechnet,
gehört an die Stelle, die geprüft wird.

Vier Entscheidungen sind eine Notiz wert:

- **Die Vertreibungsstufe ist die KLERIKERstufe**, nicht die Gesamtstufe (ein Paladin ab 4
  rechnet mit Paladinstufe − 3). Ein Kleriker 3 / Kämpfer 5 vertreibt wie ein Kleriker 3 —
  wer hier die Gesamtstufe nimmt, verschenkt fünf Stufen, und es fällt nicht auf, weil die
  Zahl plausibel aussieht.
- **Die Dauer der Wut rechnet mit dem ERHÖHTEN CON-Modifikator.** Aus CON 14 (+2) wird in
  der Wut CON 18 (+4), also 3 + 4 = 7 Runden. Das ist die Stelle, an der man sich am Tisch
  verzählt.
- **Die Turning-Tabelle steht als Rechnung, nicht als neun Zeilen** — dafür prüft der Test
  jede Stufe der Treppe von BEIDEN Seiten. Ein Punkt zu viel ist am Tisch ein Untoter zu
  viel.
- **Gebucht wird am Ende, nie beim Öffnen.** Wer nur nachlesen will, schließt das Blatt und
  hat nichts verbraucht; der Knopf sagt vorher „1 Versuch weg (6 → 5)". Dieselbe Trennung
  wie zwischen `planRest` und `applyRest`, und die Rücknahme steht daneben — der DM
  entscheidet manchmal, dass ein Versuch nicht zählt.

**Die Prüfung, auf die es ankommt, ist die STRECKE:** jeder Würfelausdruck der Anleitung
muss durch `parseDice` gehen. Genau hier ist schon einmal ein toter Würfelknopf entstanden
(aus einem halben Fertigkeitsrang wurde „1d20+4.5", `parseDice` gab `null`, der Knopf tat
wortlos nichts). Ein Test auf die Zeichenkette hätte das durchgelassen — und der Test zählt
mit, WIE VIELE Würfe er geprüft hat, sonst könnte er grün melden, ohne etwas gemessen zu
haben.

### Was der BLICK gefunden hat, und 81 grüne Prüfungen nicht

Der Wirken-Knopf stand zuerst oben in der Zählerzeile, zwischen der Zahl und dem Minus. Bei
390 px blieb vom Namen **„Untote vertre…"** übrig, und die Kleinzeile brach in sechs Zeilen
um. Alle 81 Prüfungen waren dabei grün — sie lesen `innerText`, und der stimmte.

Das ist WÖRTLICH derselbe Fund wie bei den Behältern: **eine Zeile, die schon voll ist,
verträgt keinen vierten Knopf.** Behoben wie damals — der Knopf wandert in eine eigene
Zeile darunter und ist dort nebenbei ein größeres Daumenziel.

### Und die Anführungszeichen zum SECHSTEN Mal

`describe("… die Tabelle „Turning Undead"", …)` — esbuild meldete „Unterminated string
literal", und die Suche ging wieder an die falsche Stelle. In `CLAUDE.md` steht seit der
Zeichen-Runde, in Prüfdateien gar keine `„…"` zu benutzen. Es hilft offenbar nicht, es
aufzuschreiben; es steht jetzt zusätzlich im Kopf der neuen Teststrecke.

### Was diese Runde in ALTEN Strecken gefunden hat

Acht Strecken zeigten auf **Port 5202**, den es nicht mehr gibt — sie liefen seit Monaten
gar nicht. Fünf davon sind nach dem Umstellen sofort grün; drei brauchten mehr, und was sie
meldeten, ist jedes Mal dieselbe Lehre: **eine tote Sonde meldet nicht „ich komme nicht
hin", sie meldet einen Fehler an der Stelle, an der sie danach zufällig hinschaut.**

- `e2e-fcimport` klagte „Rucksack-Waffen sind als solche markiert" an — der Abschnitt heißt
  seit der Behälter-Runde „Im Gepäck". Und die Angriffszeilen suchte sie auf ENGLISCH
  („Sword, short"), obwohl die Ausrüstung seit seiner Übersetzungs-Runde deutsch heißt.
- `e2e-equip` blieb im Assistenten stehen (die Rückfrage am Ende, inzwischen die ACHTE
  Strecke mit dieser Ursache) und hielt `/charaktere/neu` für einen Bogen. Danach meldete
  sie zehn Fehler — **gegen einen Build OHNE diese Runde nachgemessen: dieselben zehn.**
  Sie bleiben offen und stehen unten.
- `e2e-version` wartet auf einen Update-Knopf, den es nur mit zwei echten Ständen gibt;
  dafür ist `e2e-update` da.

## Der Ausrüstungs-Reiter: ein Griff statt eines Formulars

Vier Sätze, und zwei davon nehmen frühere Entscheidungen von IHM zurück. Das ist kein
Widerspruch, sondern der Normalfall in diesem Projekt: eine Entscheidung galt für einen
Reiter, den es so nicht mehr gibt.

### 1. Der Kasten „Ausrüstung und Hände" ist weg

Sein Wort: **„Am Anfang möchte ich erst mal den Container Ausrüstung und Hände entfernen.
Den brauchen wir nicht."**

Der Kasten war seine eigene frühere Bitte — „ich möchte wählen können, was ich in 1H und
OH halte". **Deshalb war die wichtigste Frage dieser Runde nicht, ob er weg darf, sondern
was an seine Stelle tritt**: ohne Ersatz hätte ich ihm etwas genommen, das er bestellt
hatte. Gefragt und entschieden: **langer Druck auf die Marke öffnet die Plätze.**

### 2. Das Geld steht ganz unten

Auch das eine Umkehr: der Kasten stand ganz OBEN, weil er ihn unter der Liste nicht mehr
gefunden hatte. Der Reiter ist inzwischen ein anderer — das Hinzufügen steckt hinter einem
Knopf, das Gepäck ist geordnet. Geld zählt man nach dem Abenteuer, nicht im Kampf.

### 3. Hinzufügen hinter EINEM Knopf

Sein Wort: **„dass neue Waffen oder Ausrüstung hinzufügen deutlich schmaler gehalten
werden kann und man wirklich erst, wenn man den Button drückt, dass dann die ganzen
Optionen erscheinen beziehungsweise die Kategorien erst erscheinen … das kann man ja auch
quasi in soner Art Pop-up Menü machen."**

Vorher stand der ganze Blätterer offen im Reiter: Suchfeld, zwölf Kategorien und der Knopf
für eigene Gegenstände — jedes Mal, auch wenn man nur nachsehen wollte, was man trägt.
Geblieben ist eine Zeile. Gefragt und entschieden: **alles zum Hinzufügen** wandert mit
hinein, auch die Suche und der eigene Gegenstand.

### 4. Ein Griff zum Anlegen — und warum das eine Regel im KERN ist

Sein Wort: **„wenn ich 'ne Einhandwaffe und ein Schild führe und dann auf den Zweihänder
drauftippe, dass er den automatisch dann ausrüstet und die anderen beiden Sachen dann halt
wegpackt. Genauso, wenn ich 'n Einhandwaffe trage und eine andere Einhandwaffe antippe,
dass die dann einfach nur tauschen, also dass ich nicht erst etwas ablegen muss."**

Gebaut als `equipTap` in `engine/equipment.ts`, und die Regel ist EINE Zeile: **der erste
ERLAUBTE Platz, nicht der erste freie** — und was dort liegt, wandert ins Gepäck. Alle drei
seiner Beispiele fallen damit auf dieselbe Regel: eine einhändige Waffe geht in die
Haupthand (tauscht also), ein Zweihänder in „beide Hände" (verdrängt Waffe UND Schild), ein
Schild in die Schildhand, eine Rüstung auf den Rüstungsplatz.

**Das ist ausdrücklich das Gegenteil von `cycleEquipSlot`, und beide bleiben.** Jene
Funktion sucht den nächsten FREIEN Platz; sie kam aus seiner damaligen Bitte „erste und
zweite Hand equippen, zum Beispiel Kurzschwert und Dolch". Beides zugleich geht nicht —
also entscheidet der kurze Tipp für den häufigen Fall (wechseln), der lange Druck öffnet
die Plätze, und der Assistent führt weiter durch sie hindurch.

Zwei Entscheidungen daran sind eine Notiz wert:

- **Angesagt, nie still.** Ein Tipp, der ein Schild ablegt, kostet RK — und das merkt man
  am Tisch erst, wenn man getroffen wird. Die App sagt „Kurzschwert und Schild ins Gepäck
  gelegt" und stellt die Rücknahme daneben, in derselben Leiste wie beim Löschen.
- **Der lange Druck merkt sich, dass er ausgelöst HAT.** Ohne diese zweite Hälfte kommt
  nach dem Menü noch der Klick hinterher — die Marke würde also erst die Plätze zeigen und
  dann trotzdem anlegen. Dieselbe Sorte Nebenwirkung wie oben.

### Was diese Runde in ALTEN Strecken gefunden hat — und einmal war ICH es

**`e2e-ziehen` war eine echte Regression, und zwar aus der VORIGEN Runde.** Bei 820×1180
lag der Anfasser der letzten Gepäckzeile auf y=1152 — und dort steht seit der roten
Bearbeiten-Leiste (die jetzt in JEDER Breite steht, nicht mehr nur am Handy) die
Reiterleiste. `elementFromPoint` fand den REITER, der Zug fing nie an, und die Prüfung
zeigte auf eine Funktion, die in Wirklichkeit läuft. Nachgemessen gegen einen Build ohne
diese Runde: 73 grün gegen 71/2 — also wirklich von mir.

Die App ist dabei in Ordnung (der Inhalt hat sein Polster, ein Daumen scrollt frei); die
Sonde war es nicht. **Lehre: `scrollIntoViewIfNeeded` bringt ein Element in den
SICHTBEREICH und hört dort auf — eine feste Leiste darüber kennt es nicht.** Wer mit
`page.mouse` auf etwas zielt, muss selbst dafür sorgen, dass nichts darüber liegt.

Und zwei Erwartungen mussten mitwandern, weil diese Runde sie bewusst umdreht:
`e2e-fcimport` verlangte „Geld steht über der Liste" und „ein Tap legt den Dolch in die
Schildhand". Beides war richtig — bis zu seinen neuen Sätzen. **`e2e-eigene` hat dabei
etwas Echtes gefunden**: die Strecke legte die eigene Rüstung über das Auswahlfeld des
Hände-Kastens an. Ohne ihn wäre sie nie angelegt worden, und die Prüfung hätte „RK 10"
gemeldet und wie ein Rechenfehler ausgesehen. Angelegt wird jetzt über die Marke — was
nebenbei beweist, dass der neue Weg auch für Rüstung durchgeht.

## Der Talente-Reiter: wann darf man wählen, und wer besitzt die Waffe

Vier Sätze, und drei davon beantworten dieselbe Frage: **wann ist eine Wahl dran?**

### 1. Trennung: Linie UND Luft

Sein Auftrag: „Die Talente in der Talente Seite bitte deutlicher voneinander trennen mit
'ner leichten Trennlinie oder so oder etwas mehr Abstand." Gefragt und entschieden:
**beides** — `divide-slate-700` statt `-800` und `py-3` statt `py-2`. Der Grund für beides
statt einem: seit jedes Talent Erklärtext, Marken und im Bearbeiten-Modus eine Knopfreihe
trägt, liefen zwei Talente bei acht Pixeln Luft optisch ineinander.

**Gemessen wird die UNTERE Kante.** Tailwind 4 zeichnet `divide-y` als `border-bottom` an
alle Kinder außer dem letzten. Meine Sonde las zweimal `border-top` — erst an der ersten
Zeile (dort steht keine Linie, dort steht die Überschrift), dann an der zweiten — und
bekam beide Male 0px. Beide Male zeigte die Prüfung auf die App, und beide Male hatte die
App recht. **Wer eine Linie misst, muss die Kante messen, die sie wirklich benutzt.**

### 2. Die Waffe gehört zur WAHL, nicht zum Bogen

Sein Auftrag: „bei den Weapon Fokus sollte man nicht einfach im Bogen die Waffe ändern
können, sondern das muss man einmal machen, wenn man das Talent auswählt. Und ansonsten
kann man es nur ändern, wenn man im Bearbeiten Modus ist."

Vorher hing die Waffe an einem Knopf, der IMMER dastand — und dahinter ein `prompt()`, das
die Waffen des Gepäcks nummeriert aufzählte und ein leeres Feld zum Abschreiben
danebenstellte. Das ist wörtlich die siebte Falle, die bei den Fertigkeits-Teilgebieten
schon einmal bezahlt wurde. Dazu ein `alert()` („Keine Waffe im Inventar"), also eine
Sackgasse: ein Talent darf man auch für eine Waffe nehmen, die man erst noch kauft.

Gebaut als `ui/FeatWeaponPicker.tsx` — **Gepäck zuerst, darunter alle Waffen mit Suche**
(seine Wahl). Drei Entscheidungen sind eine Notiz wert:

- **Die Frage sitzt im BLÄTTERER, nicht in der Ansicht.** `FeatPicker` fragt selbst, bevor
  er `onPick` ruft — damit gilt es im Assistenten, im Stufenaufstieg und am Bogen, ohne
  dass drei Stellen dieselbe Regel tragen. Die Eigenschaft `ownWeapons` ist deshalb
  **Pflicht und nicht optional**: eine neue Aufrufstelle soll die Frage nicht still
  überspringen können. Der Typ stellt die Frage, nicht mein Gedächtnis.
- **Wer abbricht, bekommt kein halbes Talent.** Das Talent wird erst nach der Waffenwahl
  hinzugefügt. Die Gegenprobe steht als eigene Prüfung („Abbrechen legt KEIN halbes Talent
  an"), weil sonst genau der Zustand entstünde, den die Warnung am Bogen meldet.
- **Welche Talente die Frage auslösen, steht im KERN** (`compendium/featChoice.ts`,
  `featNeedsWeaponChoice`). Die Bedingung stand vorher zweimal ausgeschrieben — im
  Talente-Reiter und im Fight-Club-Import. Gefragt wird die WIRKUNG (`scope: "chosenItem"`)
  und nicht der Name: „heißt es Weapon Focus?" ginge bei jedem Talent aus einem eigenen
  Buch vorbei, dieselbe Entscheidung wie bei den Behältern.

Der freie Text (`choice`) bleibt für Talente OHNE Waffenbezug — dort kennt die App die
Möglichkeiten nicht. Er ist jetzt ein Feld, das DURCHSCHREIBT, und kein `prompt()`; damit
ist der Talente-Reiter frei von Browser-Dialogen, und die Strecke prüft das hart.

### 3. Hinzufügen nur, wenn ein Punkt frei ist

Sein Auftrag: „dass man nur was hinzufügen kann, wenn man auch einen Punkt dafür frei hat
oder über bearbeiten wenn man was wechseln darf bzw. Wenn man bei HB noch was wählen darf."

Gelesen als **zwei** Bedingungen, nicht drei: `featSlots.available` summiert JEDE Quelle
von `feats.slots` — auch die aus einer eigenen Klasse. Ein Talentplatz aus Hausgemachtem
zählt also von allein mit, und es bleibt `frei > 0 ODER Bearbeiten-Modus`.

**Ist nichts frei, sagt die App warum** (seine Wahl): „Kein Talent frei — 8 von 8 gewählt.
Tauschen geht im Bearbeiten-Modus." Ein Abschnitt, der stumm verschwindet, sieht wie ein
Defekt aus — dieselbe Familie wie „etwas weiß es, und etwas anderes kann es nicht". Und im
Bearbeiten-Modus steht umgekehrt dabei, warum es trotzdem geht.

### 4. Erst die eigenen Talente

Sein Auftrag: „Erst mal nur die Talente anzeigen, die man auch hat. Die Liste von weiteren
Talenten sollte unten dann aufklappbar sein und nicht direkt drunter angeflanscht."

Der Blätterer (Suche, sieben Marken, zwei Abschnitte) hing unmittelbar unter seinen
Talenten in DERSELBEN Karte — man scrollte an der eigenen Liste vorbei, ohne es zu merken.
Jetzt eine eigene Karte darunter, zugeklappt, mit der Zahl am Knopf („1 Talent frei").

### Was der BLICK gefunden hat, und 78 grüne Prüfungen nicht

Auf dem Bild des Reiters steht im Erklärtext von Dodge **„GE-Bonus"** und in dem von
Weapon Focus **„Ringkampf"** — beides Wörter, die er ausdrücklich abgeschafft hat (DEX
statt GE, Grapple statt Ringkampf). Die Schranke in `strings.test.ts` liest `apps/web/src`
und `packages/core/src`; diese Texte liegen in den PACKS und kommen aus
`tools/etl/src/data/feats-de.ts` (dazu `manual/conditions.ts`). Zusammen 10 Fundstellen.
**Eine Schranke, die die halbe Wahrheit abdeckt, meldet grün, während die App das alte
Wort zeigt** — dieselbe Lehre wie bei TP → HP, wo die Prüfung erst beide Pakete lesen
musste. Steht als offener Punkt unten; es braucht eine `srdRev`-Erhöhung und ist deshalb
eine eigene Runde.

### Und drei tote Strecken, keine davon von hier

`e2e-talente` und `e2e-talentfilter` laufen nicht durch, `e2e-kacheln` meldet 3 Fehler.
**Gegen einen Build OHNE diese Runde nachgemessen: identisch** — dieselbe Stelle, dieselbe
Zahl. Die ersten zwei hängen an der Rückfrage am Ende des Assistenten (das ist jetzt die
neunte und zehnte Strecke mit dieser Ursache), die dritte an der Position des Infofelds in
den Kacheln.

## Zaubern per Spellcraft-Probe — Martins Blatt, und die eine Klärung

Martins Antwort auf die letzte offene DM-Frage kam als Foto seines Blatts
(„Spellcasting by Spellcraft (HB)"), und Philipps Klärung schloss die eine Lücke im
Text: **„Ermüdung bei jeder Nutzung"** — der DC-Grundwert 12 steigt mit JEDER Probe um
den gewirkten Grad, nicht nur beim Fehlschlag (dort kommt nur der Gelegenheitsangriff
dazu). Die Rast (8 Stunden) setzt auf 12 zurück.

Die Regel in Zahlen: DC 12 + Ermüdung + Grad · Patzer (natürliche 1) wirft 1 Schaden je
Grad zurück · kritisch ab 20 minus Bonus-Plätze des Grads (Blatt-Beispiel: 2
Bonus-Grad-1-Plätze → 18–20), mit Wahl aus drei Boni · Grad 0 zählt als Grad 1
(Ermüdung, Schaden), Crit-Grundlage dafür 19–20.

**Und die eine Auslegung, die das Blatt offenließ, ist bestätigt:** welche Bonus-Plätze
bei Grad-0-Zaubern die Crit-Reichweite weiten. Gerechnet wird mit den GRAD-1-Plätzen
(weil Grad 0 „als Grad 1 zählt"), und sein Wort dazu: „Ja korrekt so." Nicht neu fragen.

Gefragt und entschieden (Geschmack): **ein Knopf je Zaubergrad** im Grad-Kopf (die
Zeilen der Zauber bleiben unberührt — eine volle Zeile verträgt keinen vierten Knopf,
zweimal bezahlt), und **der Patzer bucht den Schaden mit**, mit Ansage und Rücknahme.

Fünf Entscheidungen sind eine Notiz wert:

- **Die Ermüdung ist eine EINGABE und Spielzustand.** Gespeichert wird die SUMME der
  gewirkten Grade (`spellcraftExhaustion`, optional ohne `.default(0)` — Fehlerfamilie 1,
  der Leser ist `spellcraftExhaustionOf`), nicht der DC: die 12 ist eine Regel, kein
  Zustand. Sie steht in `PLAY_STATE_FIELDS` (gehört dem Spieler, löst keine
  Rettungskopie aus) und je CHARAKTER, nicht je Klasse — das Blatt sagt „exhaustion of
  the character".
- **Der GRAD ist die ganze Rechnung.** DC, Ermüdung und Crit-Reichweite hängen nur am
  Grad — welcher Zauber es erzählerisch wird, entscheidet er am Tisch. Deshalb genügt
  ein Knopf je Grad-Kopf, und die Plätze bleiben unberührt (das ist der Sinn der Regel).
- **Dieselbe Bauart wie die Wirken-Anleitungen:** Rechnung im Kern
  (`engine/spellcraftCasting.ts`, `spellcraftCastPlan`/`applySpellcraftCast` — dieselbe
  Trennung wie `planRest`/`applyRest`), Anzeige in `ui/SpellcraftCastSheet.tsx`. Gebucht
  wird am Ende, nie beim Öffnen; der Wurf ist der ECHTE Spellcraft-Wert des Bogens und
  geht durch `parseDice` (die Strecke, an der schon einmal ein toter Würfelknopf
  entstand). Ohne brauchbares Spellcraft (nur geübt nutzbar) gibt es keinen
  Würfelknopf, sondern einen Satz — gewarnt, nicht gesperrt.
- **Die Rast nennt die Ermüdung in der Ansage** („Spellcraft-Ermüdung: 5 → 0") und setzt
  sie nur bei der LANGEN Rast zurück — das Blatt sagt ausdrücklich „after a long rest".
  `applyRest` LÖSCHT das Feld statt 0 zu schreiben: ein ausgeruhter Bogen sieht aus wie
  einer, der die Regel nie benutzt hat. Die Rücknahme der Rast bringt sie zurück.
- **Standard AN** wie die anderen Tischregeln (`deathAt`, `powerAttackLightWeapons`):
  sie verschiebt keine Zahl an bestehenden Bögen, sie gibt einen zweiten Weg DAZU.
  Der Schalter in den Einstellungen nennt in beiden Stellungen die Folge.

**Und ein Fund vom Bild, kein Test:** die Rücknahme-Leiste hängte ihr eingebautes
„gelöscht" an — „Spellcraft-Probe verbucht gelöscht", zwei Verben, das zweite gelogen.
`useUndo.offer` nimmt jetzt ein optionales Verb; der Standard bleibt „gelöscht", weil
das der Fall ist, für den die Leiste gebaut wurde.

## Die Packs sprechen die beschlossenen Wörter — und die Falle im Erzeuger

Der Anlass: er gibt die App Martin zum Testen, und die Talent-Erklärungen sagten noch
„GE-Bonus" und „Ringkampf" — Wörter, die er längst abgeschafft hat. Die Texte liegen als
DATEN in `packs/srd`, Quelle ist `tools/etl` (`data/feats-de.ts`, `manual/conditions.ts`).

**Der wichtigste Fund dieser Runde war nicht ein Text, sondern der Erzeuger.** Das
Manifest im Repo stand auf `srdRev: 10`, `build.ts` schrieb aber noch `9`: bei der
TP→HP-Runde wurde nur die DATEI von Hand erhöht und der Erzeuger vergessen. Wer die
Packs dann neu erzeugt, dreht die Version ZURÜCK — und kein Gerät spielt irgendetwas
neu ein, während alles grün aussieht. Deshalb VOR jeder Änderung die Gegenprobe: ETL
unverändert laufen lassen und den Diff ansehen (er zeigte genau die eine Manifest-Zeile
— die Quellen waren in Ordnung). Regel: **die `srdRev` wird im ERZEUGER erhöht, nie in
der Datei**; der Warnkommentar steht jetzt in `build.ts`, und `packs.test.ts` nagelt
die Zahl fest.

Die Schranke in `strings.test.ts` liest seither auch die deutschen PACK-Texte (alles
unter `localized.de` plus die `data.summary` der Zustände). Zwei Dinge daran:

- **In Daten darf sie schärfer greifen als im Quelltext:** dort verbietet sie auch die
  allein stehenden Kürzel (`\bGE\b`, `\bST\b`, …), die im Code falsche Treffer hätten.
  Genau damit fand sie FÜNF Fälle mehr als der Blick: „KO-Würfe", zweimal „KO-Bonus",
  „WE-Bonus" (Stunning Fist) und „CH-Bonus" (Divine Might). Aus 10 vermuteten
  Fundstellen wurden 19.
- **Und ihre erste Zusicherung war falsch:** sie verlangte über 1000 gelesene Texte,
  weil ich die 1866 Gegenstandstexte in den Packs vermutete. Die liegen dort NICHT —
  sie werden beim Einrichten aus `core/compendium/itemGerman.ts` übergelegt, und diese
  Datei liest der Quelltext-Durchlauf längst. In den Packs stehen 204 deutsche Texte
  (175 Talente + 29 Zustände). Eine Schwelle muss die Wirklichkeit kennen, die sie
  prüft — sonst meldet sie die Packs als falsch, die recht haben.

Ausgeliefert als `srdRev 11`; geprüft im gebauten Bogen mit frischem Profil (Dodge sagt
„DEX-Bonus", Weapon Focus „Grapple", die Zustände im Kompendium sind sauber).

## Die Liste aufräumen — und was ich von hier aus NICHT kann

Sein Auftrag: **„Mach mal die Char Liste sauber. Schmeiß alle außer Hike raus."**

**Von hier aus geht das nicht, und das ist kein Mangel, sondern seine eigene
Entscheidung.** Die Bögen liegen ausschließlich im Speicher SEINES Geräts (lokal-first,
kein Backend); im Repo liegt kein einziger Charakter, und die App kennt keinen Server, den
ich fragen könnte. Was ich bauen kann, ist der WEG — drücken muss er.

Gefragt und entschieden: **Mehrfachauswahl** (nicht „alle außer diesem einen") und **vorher
eine Sicherung anbieten**.

Vier Entscheidungen sind eine Notiz wert:

- **Angekreuzt wird, was WEG soll.** Ein Knopf „alle außer diesem" wäre bei einem Fehlgriff
  der teuerste der ganzen App — und er sähe genauso aus wie einer, der das Richtige tut.
- **Die Rückfrage nennt jeden Namen einzeln**, und die Teststrecke prüft die Gegenprobe:
  Hike steht NICHT darin. Ohne sie wäre die Prüfung auch dann grün, wenn alle vier
  dastünden — dieselbe Familie wie die Farbprüfung, die gegen einen Startwert von 999 lief
  und Erfolg meldete, ohne etwas gemessen zu haben.
- **Die Sicherung ist der Rückweg, weil es keinen anderen gibt.** Ein Charakter kennt weder
  Rücknahme noch Papierkorb — `CharacterRepo.remove` wirft die Zeile weg. Deshalb steht der
  Satz dabei, und deshalb schreibt der Knopf eine Datei mit ALLEN Bögen (dieselbe, die
  „Charakter-Datei (JSON)" wieder einliest). Scheitert sie, wird nicht gelöscht.
- **„Abbrechen" steht VOR dem roten Knopf** — dieselbe Anordnung wie beim einzelnen
  Löschen, und aus demselben Grund: sonst träfe der zweite Tipp eines Doppeltipps sofort
  „löschen". Die Strecke prüft die Reihenfolge im DOM, nicht bloß, dass beide da sind.

Dazu zwei Dinge, die im Modus selbst stecken: die **drei Punkte verschwinden** (ein
Fehlgriff dürfte nicht das Aktions-Blatt mit der Gefahrenzone öffnen), und die Karte wird
im Auswahlmodus wirklich zu einem KNOPF statt zu einem festgehaltenen Link — ein `<a>`, das
man mit `preventDefault` bändigt, navigiert am Handy trotzdem, sobald jemand lange drückt
und „Öffnen" wählt. Der Auswahl-Schalter selbst steht erst ab ZWEI Bögen da.

**Und die deutschen Anführungszeichen zum SIEBTEN Mal**, diesmal in `strings.ts` statt in
einer Teststrecke: `„Charakter-Datei (JSON)"` in einer doppelt gequoteten Zeichenkette, und
`tsc` meldete acht Folgefehler in den Zeilen darunter. Die Regel gilt damit überall, nicht
nur in Prüfdateien: **wer deutsche Anführungszeichen in einen Text schreibt, nimmt
Backticks.**

## Götter und die Herkunft der Talente

Sein Auftrag, zwei Hälften: **„Ich möchte auch gerne die Götter mit reinbringen, sodass wir
die Domains des clerics korrekt verwenden können."** und **„die Talente [sollen] die Info
zeigen woher sie kommen. Also ob die als Bonus fest gewählt wurden oder in welchem Level ich
sie dazu genommen hab."** Sein Beispiel dazu ist der Kern der Runde: „ob ich den Bonus fest
von der war Domain schon hab oder ob ich den vergessen hab und den zweiten weapon Focus
versehentlich als Krieger gewählt hab."

Gefragt und entschieden: **eigener Bereich im Kompendium** (nicht bloß ein Feld am Bogen) und
**Hinweis mit Knopf** für den festen Weapon Focus der War-Domäne — die Zahl wandert erst auf
seinen Tipp.

### Die Götter — und warum die App KEINE mitliefert

**Die Namen der D&D-Götter sind Product Identity und stehen nicht im freien SRD** — nur die
32 Domänen tun das. Die App liefert deshalb das FACH (Name, Domänen, Lieblingswaffe,
Gesinnung — `deityEntitySchema`, nur Homebrew), und sein Tisch legt seine eigenen an:
Kompendium → Götter → „+ Eigene Gottheit" (`ui/DeityEditor.tsx`). Der leere Bereich SAGT das
(„Die App liefert keine Götter mit …") — eine erklärte Leere ist kein Fehler. Ihm so gesagt,
er hat es angenommen; nicht neu fragen, ob man „die bekannten Götter" einbauen könnte.

Fünf Entscheidungen sind eine Notiz wert:

- **Der Bogen speichert den VERWEIS** (`deityRef`), der Name daneben (`deity`) ist Anzeige —
  dasselbe Paar wie `choiceRef`/`choice` am Talent. `deityOf` löst nur über die Kennung auf,
  nie über den Namen; der Referenz-Sammler in `sync/refs.ts` sammelt stumpf alle Kennungen,
  also reist die Gottheit beim Teilen eines Charakters von allein mit.
- **Der Editor verlangt mindestens EINE Domäne**, mit Grund am gesperrten Knopf. Eine
  Gottheit ohne Domänen wäre falsch herum wirksam: `domainsOutsideDeity` hielte dann JEDE
  gewählte Domäne für fremd.
- **Fremde Domänen werden GEMELDET, nie gesperrt** (`domain-not-deity` in `validate.ts`, mit
  „passt so"): der DM hat Recht. Im Auswähler stehen die Domänen der Gottheit oben und
  tragen ihre Marke mit NAMEN („✓ Kord") — damit klar ist, wer hier etwas anbietet.
- **`warFocusStatus` wird GERECHNET und nirgends gespeichert** — ein gespeichertes „hat den
  Bonus schon" wäre die Fehlerfamilie 1. Verglichen wird die KENNUNG der Waffe, mit
  `basedOn`-Ausweichen wie in `derive.ts`: die eigene Variante desselben Typs zählt mit.
- **Das Löschen einer Gottheit nimmt dem Bogen nichts weg**: `deityRef` bleibt stehen, eine
  Kennung ins Leere heißt „keine Gottheit" — nur die Prüfung fällt weg. Dieselbe Schutzregel
  wie bei den Behältern; der Editor nennt beim Löschen die betroffenen Bögen namentlich.

### Die Herkunft am Talent

`origin` an der Talent-Zeile: `{ level?, source? }` — **optional ohne `.default()`**
(Fehlerfamilie 1: ein `.default()` zwänge jede Stelle, die Talente als Literal baut, das
Feld mitzuschreiben; bestehende Bögen tragen ohnehin nichts). Der Assistent schreibt
`{ level: 1 }`, der Stufenaufstieg die NEUE Gesamtstufe, der War-Knopf
`{ source: "War Domain (Kord)" }` — und **die Quelle gewinnt in der Anzeige vor der Stufe**,
weil „War Domain (Kord)" genau seine Frage beantwortet und „Stufe 1" nicht. Altbestand
zeigt NICHTS (keine erfundene Herkunft) und wird im Bearbeiten-Modus nachgetragen — zwei
durchschreibende Felder, sind beide leer, fällt `origin` ganz weg.

### Drei Fallen dieser Runde

- **Die zwölfte Falle, wörtlich wie notiert:** „Dodge: Voraussetzung nicht erfüllt (DEX 13)"
  ist selbst ein `li` (IssueCard), und `filter({hasText:/Dodge/}).first()` traf die WARNUNG
  statt der Talent-Zeile — die Prüfung „trägt keine Herkunft" war grün am falschen Kasten.
  Die Talent-Zeile ist die mit dem fett gesetzten Namen (`has: span.font-medium`).
- **Die deutschen Anführungszeichen zum ACHTEN Mal**, diesmal in `strings.ts`
  (`deityNoneYet` mit „Götter" im Satz). Backticks, wie die Regel sagt — sie stand da und
  wurde trotzdem erst nach dem `tsc`-Lauf befolgt.
- **„Alles hier kommt aus dem SRD" wäre bei den Göttern gelogen** — dort ist alles Homebrew.
  Der Satz, der bei leeren Quellen-Filtern erklärt, warum die Knöpfe nichts trennen, ist für
  diesen Bereich abgeschaltet: ein Erklärsatz, der die falsche Sache erklärt, ist schlimmer
  als keiner.

## Noch offen

- **`e2e-equip` meldet zehn Fehler, und sie sind ALT.** Die Strecke war doppelt tot
  (falscher Port, dazu die Rückfrage des Assistenten) und läuft seit dieser Runde wieder
  durch. Nachgemessen gegen einen Build ohne diese Runde: dieselben zehn. Es geht um die
  Slot-Marken (eine zweite Rüstung verdrängt die erste, ein Zweihänder verdrängt Schild und
  Langschwert, ein Bogen wird 2H) und darum, dass der Power-Attack-Regler in DIESER Strecke
  nicht gefunden wird. Ob App oder Sonde, ist ungeklärt — bei einer monatelang toten Strecke
  ist beides gleich wahrscheinlich, und die Slot-Regeln haben eigene Tests im Kern.
- **Die volle Attacke ist beantwortet und steht damit nicht mehr hier.** „Wir spielen bei
  6bab mit zwei Angriffen" — die Reihe bleibt, wie sie war, und hat jetzt einen Test
  (`core/engine/iterativeAttacks.test.ts`). Dasselbe Schicksal wie der halbe
  Stärkeschaden in der zweiten Hand und die Rundung im ×1,5-Pfad, die auch hier standen
  (Martins Regeln 4 und 5). Damit ist die Liste der Fragen, die JEDEN Bogen ändern
  könnten, leer.
- **Am Aussehen ist nichts Großes mehr offen.** Vier Papiere stehen, elf Klassenfarben sind
  nachgemessen unterscheidbar, die zweite Farbe je Klasse arbeitet an drei Stellen
  (Überschriften, Anstrich, Karten), Rahmen und Klassensymbole sind kräftig, die Flächen
  darunter ruhig, und ein Hauptschalter nimmt die Klassenfarbe ganz weg. Wer hier
  weitermachen will: die Zierfarben ballen sich im Gold-Band (fünf Klassen zwischen 62 und
  92) — harmlos, weil ihre Hauptfarben weit auseinanderliegen, aber es wäre die nächste
  Feinarbeit.
- **Ausrüstung — Rest:** die Werte-Karte „Was deine Rüstung kostet" ist gebaut (eigener
  Abschnitt weiter unten). Eigene Gegenstände mit echten Rüstungs- und Waffenwerten
  waren schon da (Editor im Ausrüstungs-Reiter, `ui/ItemEditor.tsx` +
  `ui/itemDraft.ts`, Erzeuger in `core/compendium/homebrewItem.ts`), und der Assistent
  benutzt denselben Blätterer wie der Bogen. Offen bleibt hier nur noch die
  Übersetzung der 97 epischen Erklärungen (weiter unten).
- **Behälter, Münzgewicht und Umsortieren sind gebaut** (eigener Abschnitt weiter unten) —
  das Ziehen inzwischen auch, auf seinen Wunsch („Umsortieren per Ziehen, gerne"), mit
  Anfasser und mit einer Prüfung über echte Touch-Ereignisse. Die ↑↓-Knöpfe bleiben
  daneben.
- **Die deutschen Kürzel in den Packs sind raus** (`srdRev 11`, eigener Abschnitt
  „Die Packs sprechen die beschlossenen Wörter" weiter oben). Die Schranke in
  `strings.test.ts` liest seither auch die Packs.
- **97 Gegenstände tragen noch keine deutsche ERKLÄRUNG** — Name haben alle 1866. Die 97
  sind ausnahmslos episch (Stufe 21+, im Blätterer standardmäßig ausgeblendet) oder
  Artefakte; der Test in `core/compendium/itemGerman.test.ts` hält genau das fest, damit
  kein gewöhnlicher Gegenstand still hineinrutscht. Wer eine Erklärung nachträgt, senkt
  die Schranke im Test mit.
- **104 epische Talente tragen noch keine Wirkung.** Alle 175 nicht-epischen haben eine
  — das ist alles, was bis Stufe 20 vorkommt —, und wo ein episches ein Vorbild hat, erbt
  es dessen Wirkung über `EPIC_ALIAS`. Die übrigen fallen aus dem Wirkungs-Filter, sind
  aber ohne ihn weiter da. Der Test in `core/compendium/featBonus.test.ts` hält die
  Schranke bei 104 und verlangt, dass jedes Fehlende episch IST; wer eine nachträgt,
  senkt sie mit.
- **Zauber, Talente, Völker und Klassen haben noch keine deutschen NAMEN.** Diese Runde
  hat nur die Ausrüstung übersetzt. Bei Zaubern ist es Absicht (Zaubernamen sind
  Regelbegriffe), bei Völkern und Klassen ist es offen — „Halb-Ork" statt „Half-Orc"
  wäre möglich, verschiebt aber jede Überschrift und braucht sein Wort.

Details: `PRUEFBERICHT.md`.
