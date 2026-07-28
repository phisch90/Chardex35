# tools/extract — eigene Buchinhalte (Output NIEMALS committen!)

Wandelt **eigene Regelwerke** (PDF) in private Kompendium-Pakete: JSON im
Homebrew-Format, das in der App importiert wird (Einstellungen → JSON
importieren).

**Wichtig:** `out/`, `private/` und `*.private.json` sind per `.gitignore`
ausgeschlossen und dürfen nie ins Repo oder in den App-Build gelangen. Nur das
freie SRD (`packs/srd`) gehört ins Repository. Die Originalbücher sind
urheberrechtlich geschützt; die Pakete sind für den privaten Gebrauch der Gruppe
und leben neben den PDFs, z. B. im OneDrive.

## Benutzen

```
pnpm --filter @codex35/extract extract "/pfad/zum/Buch.pdf"
```

Schalter: `--pack=name` (Paketname in der App), `--only=spells,feats,classes`,
`--out=verzeichnis`. Es entstehen zwei Dateien in `out/`:

| Datei | wozu |
| --- | --- |
| `<pack>.private.json` | in der App unter „Importieren" einlesen |
| `<pack>-bericht.txt` | was übernommen wurde und was nachzusehen ist |

Der **Prüfbericht** ist der wichtigere Teil. Ein Konverter, der stillschweigend
das Beste hofft, ist wertlos — der Fehler fällt dann erst am Spieltisch auf.

Findet der Lauf nichts, ist das PDF meist ein Scan ohne Textebene; dann hilft nur
eine Fassung mit Text.

## Was fertig ist

- **PDF lesen** (`src/pdf.ts`, `src/read.ts`): Zweispaltigkeit, Leserichtung,
  laufende Kopf- und Fußzeilen weg. Die Reihenfolge ist dabei entscheidend:
  erst Kopfzeilen, dann **Tabellen** heraus, dann Spalten erkennen. Solange die
  Tabellenzellen noch da sind, sieht eine Seite einspaltig aus — und der Text
  unter der Tabelle wird zeilenweise durcheinandergemischt.
- **Einträge erkennen** (`src/segment.ts`): verankert an den Feldnamen
  („Prerequisite:", „Level:", „Hit Die:"), nicht an Schriftgrößen — die sind von
  Buch zu Buch verschieden. Absatzgrenzen über die Geometrie, inkl. Erkennung, ob
  das Buch im Blocksatz gesetzt ist.
- **Talente** (`src/parse/feats.ts`): Art, Voraussetzungen (als echte
  Verknüpfung gegen das SRD), Benefit/Normal/Special.
- **Zauber** (`src/parse/spells.ts`): Schule, Teilschule, Deskriptoren, die
  Kartenfelder — und die Grad-Zeile, übersetzt in die Klassenlisten des
  Kompendiums („Sor/Wiz 3" → `sorcerer-wizard`). Ein Kürzel, das keiner Liste
  zuzuordnen ist, wird gemeldet, nicht einsortiert.
- **Prestigeklassen** (`src/parse/classes.ts`, `src/table.ts`): Trefferwürfel,
  Voraussetzungen, Klassenfertigkeiten, Fertigkeitspunkte — und die Stufentabelle
  als **Raster**. Die darf nicht als Text gelesen werden: welche Spalte ein „+2"
  meint, sagt allein die Position.
- **Namensauflösung** (`src/lookup.ts`) gegen `packs/srd`.
- **Schema-Prüfung** (`src/finish.ts`): jede Entity geht durchs Zod-Schema, bevor
  sie in die Datei kommt. Ein handgebautes Objekt bekommt sonst keine
  Schema-Vorgaben, und die Datei sieht anders aus als das, was die App nach dem
  Import daraus macht.

## Grundhaltung

Lieber ein Talent **ohne** mechanische Wirkung übernehmen als eine Wirkung
erfinden. Ein erratener Bonus verändert stillschweigend Werte auf dem
Charakterbogen, und ein falscher Bonus, den niemand bemerkt, ist schlimmer als
ein fehlender, der beim Spielen auffällt. Abgeleitet wird nur der eine völlig
regelmäßige Satzbau („+2 bonus on all Hide checks and Move Silently checks");
alles andere landet als Text im Eintrag und als Hinweis im Prüfbericht.

## Prüfen ohne Buch

`test/makePdf.ts` erzeugt ein Regelwerk-artiges PDF (zwei Spalten, laufende
Kopfzeile, fette Feldnamen) aus **SRD-Text** — frei verwendbar. Das Soll steht in
`test/fixtures.ts`; wo möglich wird gegen die geprüften Einträge in `packs/srd`
verglichen statt gegen ein selbst ausgedachtes Ergebnis.

## Noch offen

- Feinabstimmung an einem **echten** Buch: Layouts unterscheiden sich, und ohne
  eine Beispieldatei ist jede weitere Annahme geraten. Die wahrscheinlichsten
  Stellen: Bücher, die Absätze über den Erstzeilen-Einzug trennen statt über den
  Zeilenabstand, und Seiten, auf denen zwei Tabellen übereinander stehen (erkannt
  wird bisher eine je Seite).
- „Spells Known"-Tabelle spontaner Zauberwirker (bisher nur „Zauber pro Tag").
- Monster und Gegenstände.
