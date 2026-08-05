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

**Noch keine Antwort von Martin** haben: die Spellcraft-Probe statt eines Zauberplatzes,
die EP-Strafe beim Mischen von Klassen und das Punktebudget für die Attribute. Die stehen
als Teil 2 in `FRAGEN-AN-DEN-DM.md`. Die volle Attacke stand bis vor kurzem auch hier —
sie ist beantwortet („Wir spielen bei 6bab mit zwei Angriffen"), und die Antwort war
„alles bleibt".

Quer über 2 und 3 stand zweimal **„Zauberpunkte"**, und das war die Frage mit der
größten Folge: bei einem echten Punktevorrat hätte die App einen ZWEITEN Weg gebraucht,
Zauber zu verbuchen. **Erledigt, er hat es selbst richtiggestellt:** „Zauberränge. Sorry
nicht Punkte." Es ist also das, was die App PLATZ nennt — einer je Zaubergrad und Tag,
wie im Regelwerk. Kein zweites Modell.

Übrig bleibt eine Wortfrage an IHN (nicht an den DM): die App sagt „Zauberplätze", er
sagt „Zauberränge". Umbenennen ginge, kollidiert aber mit den Fertigkeits-RÄNGEN — „3
Ränge in Spellcraft" neben „3 Zauberränge Grad 1" wären zwei Bedeutungen für ein Wort.
Deshalb bleibt „Platz" stehen, bis er etwas anderes sagt.

**Beim Zusammentragen aufgefallen: drei Hausregel-Felder haben keine Wirkung.**
`houseRulesSchema` hat sechs Felder; drei rechnen (`fractionalBabAndSaves`,
`maxHpFirstLevel` — Standard AN —, `ignoreEncumbrance`), und drei tun nichts:
`multiclassXpPenalty` **hat einen Schalter in den Einstellungen, den niemand liest**
(sein eigener Kommentar sagt „Warn-only", aber es gibt keine Warnung), `deathAt` und
`pointBuyBudget` haben nicht einmal eine Oberfläche. Das ist die Familie „etwas weiß es,
und etwas anderes kann es nicht" in ihrer schlichtesten Form: ein Schalter, der etwas
verspricht und nichts tut, ist schlimmer als kein Schalter. Alle drei sind Tischregeln,
also stehen sie in `FRAGEN-AN-DEN-DM.md` — jede mit einer fertigen Hälfte dahinter. Von
den drei ist `deathAt` inzwischen beantwortet und gebaut (Martins Regel 6); die anderen
zwei stehen dort unter „Zwei Regeln, für die schon ein Fach existiert". **Auf eine
Abschnittsnummer wird hier absichtlich nicht mehr verwiesen** — die Nummern verschieben
sich, sobald eine Frage beantwortet ist und nach Teil 1 wandert, und ein Verweis auf
„Frage 9.1" zeigte dann ins Leere.

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

## Noch offen

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
- **Ausrüstung — Rest:** die Werte-Karte „Was deine Rüstung kostet" fehlt noch.
  Eigene Gegenstände mit echten Rüstungs- und Waffenwerten sind gebaut (Editor im
  Ausrüstungs-Reiter, `ui/ItemEditor.tsx` + `ui/itemDraft.ts`, Erzeuger in
  `core/compendium/homebrewItem.ts`), und der Assistent benutzt jetzt denselben
  Blätterer wie der Bogen.
- **Ein fehlgeschlagenes Speichern sieht er nicht.** Es steht jetzt in der Konsole,
  aber auf dem Handy schaut da niemand hinein. Eine sichtbare Meldung fehlt.
- **Behälter** (Inventar/Geldbeutel, Münzgewicht) und Umsortieren per Ziehen.
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
