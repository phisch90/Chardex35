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

## Beantwortete Entscheidungen (nicht neu fragen)

- **Geräte:** iPhone UND iPad, beide. Deshalb war der Abgleich-Fehler dringend — er
  ist behoben (Abzweigpunkt je Regal, siehe `sync/merge.ts`).
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
- **Iterative Angriffe ab GAB +6:** er klärt mit seinem DM, ob sein Tisch die
  volle Attacke spielt. Fight Club zeigt sie ihm seit zwei Jahren als „+9/+4",
  ohne ein Wort dazu. Bis zur Antwort NICHT anfassen — das würde jeden Bogen
  ändern.
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

## Noch offen

- **Halber Stärkeschaden in der zweiten Hand** (Dolch 1d4+1 statt 1d4+2) und die
  Rundung bei negativem Stärkemodifikator im ×1,5-Pfad — beides verschiebt Zahlen,
  beides braucht sein Wort.
- **Ausrüstung — Rest:** die Werte-Karte „Was deine Rüstung kostet" fehlt noch.
  Eigene Gegenstände mit echten Rüstungs- und Waffenwerten sind gebaut (Editor im
  Ausrüstungs-Reiter, `ui/ItemEditor.tsx` + `ui/itemDraft.ts`, Erzeuger in
  `core/compendium/homebrewItem.ts`), und der Assistent benutzt jetzt denselben
  Blätterer wie der Bogen.
- **Eigene Gegenstände LÖSCHEN** gibt es bewusst nicht: jeder Bogen, der einen
  gelöschten Typ noch trägt, verliert RK und Angriffszeile und zeigt eine
  Fehlermeldung. Das braucht sein Wort (Löschen ist eine der zwei Ausnahmen).
- **Eigene Zähler bei der Rast:** aufgefüllt wird nur, was aus einem Vorschlag der
  App entstand (`suggestedFrom`) — bei „Aktionspunkte" kennt die App die Regel
  nicht und sagt das. Damit Fight-Club-Zähler mitrasten, bräuchte der Zähler ein
  echtes Feld „füllt sich bei der Rast" (der Import liest es schon als `perDay` und
  wirft es weg).
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
