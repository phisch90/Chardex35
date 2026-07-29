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

**Ein abgeleiteter Wert, der gespeichert wurde.** Bisher vier Fälle: rohe statt
geparster Datenbankzeilen · fehlende Schema-Standardwerte, weil Parser Literale
bauten · `equipped` statt `slot` · das eingefrorene Maximum eines Zählers, weshalb
Extra Turning nie ankam. Bei jedem neuen Feld die Frage stellen: ist das eine
Eingabe oder eine Folge?

Zweite Falle, aus dem Prüfbericht: **ein Feld, das seinen Wert in eine eigene Kopie
zieht und nur beim Verlassen speichert.** Dabei geht Tippen verloren. Durchschreiben,
nicht zwischenspeichern.

## Offene Entscheidungen (Stand: Prüfbericht)

- **Arbeitet er wirklich auf iPhone UND iPad?** Davon hängt ab, wie dringend der
  Abgleich-Fehler ist (Konflikt wird nur bei genau gleicher `rev` erkannt, sonst
  geht Arbeit still verloren).
- **Turn Undead: 8 oder 7?** Sein Zähler sagt 8, seine eigene Notiz sagt 3+CHA+4 = 7.
- **Domänen** (Heal/War) stehen bei ihm nur in einer Notiz — zusammen mit dem
  fehlenden Domänenplatz zu bauen.

Details zu allem Offenen: `PRUEFBERICHT.md`.
