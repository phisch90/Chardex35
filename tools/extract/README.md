# tools/extract — eigene Buchinhalte (Output NIEMALS committen!)

Wandelt **eigene Regelwerke** (PDF) in private Kompendium-Pakete: JSON im
Homebrew-Format, das in der App importiert wird (Einstellungen → JSON
importieren).

**Wichtig:** `out/`, `private/` und `*.private.json` sind per `.gitignore`
ausgeschlossen und dürfen nie ins Repo oder in den App-Build gelangen. Nur das
freie SRD (`packs/srd`) gehört ins Repository. Die Originalbücher sind
urheberrechtlich geschützt; die Pakete sind für den privaten Gebrauch der Gruppe
und leben neben den PDFs, z. B. im OneDrive.

## Was fertig ist

- **PDF lesen** (`src/pdf.ts`): Zweispaltigkeit, Leserichtung, laufende Kopf- und
  Fußzeilen weg.
- **Einträge erkennen** (`src/segment.ts`): verankert an den Feldnamen
  („Prerequisite:", „Level:"), nicht an Schriftgrößen — die sind von Buch zu Buch
  verschieden. Absatzgrenzen über die Geometrie, inkl. Erkennung, ob das Buch im
  Blocksatz gesetzt ist.
- **Talente** (`src/parse/feats.ts`): Art, Voraussetzungen (als echte
  Verknüpfung gegen das SRD), Benefit/Normal/Special.
- **Namensauflösung** (`src/lookup.ts`) gegen `packs/srd`.

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

- Zauber und Prestigeklassen (Prestige braucht die Stufentabelle — Gitterlayout).
- CLI, die eine PDF-Datei zu `out/<name>.private.json` plus Prüfbericht macht.
- Feinabstimmung an einem **echten** Buch: Layouts unterscheiden sich, und ohne
  eine Beispieldatei ist jede weitere Annahme geraten.
