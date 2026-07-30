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

Beim Domänenplatz war die Antwort: die WAHL der Domäne ist eine Eingabe (steht am
Charakter), der PLATZ je Zaubergrad ist eine Folge (steht als Merkmal an der Klasse
und wird gerechnet) — und in welchem der Plätze ein vorbereiteter Zauber sitzt,
gehört gar niemandem: das rechnet die Anzeige aus, gespeichert wird es nicht.

Zweite Falle, aus dem Prüfbericht: **ein Feld, das seinen Wert in eine eigene Kopie
zieht und nur beim Verlassen speichert.** Dabei geht Tippen verloren. Durchschreiben,
nicht zwischenspeichern.

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
- **Iterative Angriffe ab GAB +6:** er klärt mit seinem DM, ob sein Tisch die
  volle Attacke spielt. Fight Club zeigt sie ihm seit zwei Jahren als „+9/+4",
  ohne ein Wort dazu. Bis zur Antwort NICHT anfassen — das würde jeden Bogen
  ändern.

## Noch offen

- **Halber Stärkeschaden in der zweiten Hand** (Dolch 1d4+1 statt 1d4+2) und die
  Rundung bei negativem Stärkemodifikator im ×1,5-Pfad — beides verschiebt Zahlen,
  beides braucht sein Wort.
- **Wurfwaffen** (Schleuder, Wurfspeer, Dart, Shuriken, Bolas) bekommen keinen
  Stärkeschaden — braucht eine Marke „Wurfwaffe" an den Waffendaten.
- **Ausrüstung — Rest:** eigene Gegenstände mit echten RÜSTUNGS- und WAFFENWERTEN
  (heute geht nur eine freie Zeile mit Boni; für eine eigene Rüstung fehlen DEX-
  Grenze und Fertigkeits-Malus), die Werte-Karte „Was deine Rüstung kostet", und
  der Assistent benutzt noch die alte Suche.
- **Behälter** (Inventar/Geldbeutel, Münzgewicht) und Umsortieren per Ziehen.

Details: `PRUEFBERICHT.md`.
