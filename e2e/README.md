# Teststrecken

Läufe im **gebauten** Bogen, mit einem echten Browser, in seinen drei Größen
(390×844, 1180×820, 820×1180). Das ist die einzige Prüfung, die Fehler findet, die
erst im Build entstehen — ein Hook hinter einem früheren `return`, eine Klasse, die
im Stylesheet hinter einer anderen steht, ein Service Worker, der jede Navigation
aus dem Zwischenspeicher beantwortet. `pnpm test` und `tsc` sehen davon nichts.

```bash
pnpm e2e                 # bauen, Vorschau auf 5199, alle Strecken
pnpm e2e warfocus        # nur diese eine
pnpm e2e --no-build      # gegen den Stand in dist (schneller beim Nachfassen)
```

Ein Lauf braucht einen Chromium. Auf einer frischen Maschine:

```bash
pnpm exec playwright install chromium
```

In der Entwicklungsumgebung liegt schon einer unter `/opt/pw-browsers`; die Hülle
findet ihn von allein, und `CHROMIUM_PATH` überschreibt die Wahl.

## Warum das hier liegt und nicht im Arbeitsordner

Es gab einmal **108 Strecken** — und sie lagen ausschließlich im Arbeitsordner der
Maschine, auf der ich laufe. Als die Maschine neu aufgesetzt wurde, waren sie weg,
alle. Aus dem Gesprächsprotokoll waren vier zu retten; der Rest ist verloren.

Das ist die Fehlerfamilie dieses Projekts einen Stock höher: **eine Prüfung, die nur
an einer Stelle existiert, die niemand sichert, ist keine Prüfung.** Deshalb gehört
jede neue Strecke in denselben Commit wie die Runde, die sie prüft.

Nicht in die GitHub-Aktion: ein Lauf braucht Browser und Build, und ein roter Lauf
dort würde jeden Merge aufhalten. Die Strecken sind das Werkzeug VOR dem Push.

## Was hier liegt

| | |
|---|---|
| `run.mjs` | der Läufer: baut, stellt die Vorschau hin, ruft die Strecken, räumt auf |
| `lib/probe.mjs` | die gemeinsame Hülle — hier stehen die Fallen EINMAL |
| `strecken/*.mjs` | eine Datei je Runde |
| `fixtures/*.json` | die Bögen, die die Strecken importieren |
| `.out/` | Bilder und Zwischenstände (gitignored) |

Die Bogendateien sind erfundene Beispiele im echten Format — im Repo liegen nur
OGL/SRD-Inhalte. `apps/web/src/e2eFixtures.test.ts` ist die Schranke dazu: jede
Datei geht durch denselben Parser wie der Import-Knopf, und jede `srd:`-Kennung muss
in den Packs stehen. Ohne das fällt eine veraltete Kennung beim Import **leise** aus,
und die Strecke danach klagt die App an einer Stelle an, an der sie recht hat.

## Die Fallen

Alle schon einmal bezahlt. Die Hülle fängt sie ab, aber wer eine eigene Prüfung
schreibt, läuft sonst wieder hinein.

1. **`uppercase` verändert `innerText`.** Ein Titel mit `uppercase` liest sich als
   `GRAD 0`. Deshalb **jede** Textprüfung mit `/i`. (Fünfmal passiert.)
2. **`:visible` ist keine Kosmetik.** Der Weiter-Balken des Assistenten und die
   untere Reiterleiste stehen zweimal im DOM; der unsichtbare steht vorn. Ein Klick
   darauf läuft in einen Timeout — und der sieht wie ein Fehler der App aus.
3. **Eine Navigationshilfe darf nicht still scheitern.** `openTab` und
   `setzeBearbeiten` **werfen**. Eine Hilfe, die `false` zurückgibt, meldet später
   einen Fehler an der Stelle, an der die Strecke zufällig hinschaut.
4. **Der Reiter heißt am Handy anders.** Unten `Ausr.` mit einem Zeichen darüber, ab
   `md` das ganze `Ausrüstung`. Und geklickt wird in der **Reiterleiste**: `Kampf`
   trifft sonst die Kachel `NAHKAMPF` oder einen Filter-Chip.
5. **Ein Ausdruck über den ganzen Body trifft den eigenen Text.** Die Kopfzeile sagt
   `Stufe 7 · Human`, eine Warnung sagt `3.5`. Gelesen wird im Kasten — Talentzeilen
   über `featZeile`, offene Blätter über `blattText`.
6. **`.first()` / `.last()` erraten den Kasten.** Ein `li` kann eine Warnung sein, und
   mit Verschachtelung trifft der äußere `li` den inneren Text. Dafür ist
   `innerstesLi` da.
7. **Diese App scrollt nicht das Fenster.** Gescrollt wird das `main` mit
   `overflow-y-auto`; `window.scrollY` ist immer 0, und `fullPage: true` fotografiert
   trotzdem nur ein Fenster. Wer eine Höhe misst, nimmt `scrollMain`.
8. **`page.mouse` arbeitet in Fenster-Koordinaten** und `scrollIntoViewIfNeeded`
   kennt keine feste Leiste darüber. Wer zieht, nimmt `intoView`.
9. **Keine deutschen Anführungszeichen** in diesen Dateien. Sie haben esbuild
   achtmal mit einer Meldung an der falschen Zeile abbrechen lassen. Backticks.
10. **Eine Strecke, die früh abbricht, meldet nicht rot — sie meldet gar nichts.**
    Deshalb nennt `done(n)` eine Mindestzahl an Prüfungen und bricht ab, wenn sie
    nicht erreicht wird.
11. **Ein Test, der nichts messen konnte, darf nicht grün melden.** Eine Farbprüfung
    dieses Projekts verglich einmal alle Paare gegen einen Startwert von 999 und war
    grün, obwohl kein einziges Thema gefunden wurde. Erst zählen, dann vergleichen.
12. **Ein Zug auf ein verbotenes Ziel ist kein Fehler.** Wer eine Grenze baut, darf
    nicht dagegen prüfen.
