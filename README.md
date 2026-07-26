# Chardex35

Ein D&D-3.5-Charakter-Manager als offline-fähige Web-App (PWA) — Charakterbögen mit
automatischer Regelberechnung, durchsuchbares SRD-Kompendium, Homebrew als Bürger
erster Klasse, Würfelroller und (später) Kampf-Tracker. Gedacht als Ersatz für die
iOS-App „Fight Club" (3.5 Edition).

## Charaktere auf mehreren Geräten

Zwei Wege, bewusst getrennt:

- **Geräte-Abgleich** (Einstellungen → Geräte-Abgleich): ein *privater* GitHub-Gist als
  Ablage, ein Token mit ausschließlich der Berechtigung `gist`. Jedes Gerät mit demselben
  Token findet die Ablage von allein und gleicht beim Start, bei Rückkehr in den
  Vordergrund und wenige Sekunden nach jeder Änderung ab. Pro Dokument entscheidet `rev`,
  bei Gleichstand die neuere `updatedAt`; ändert man denselben Bogen auf beiden Geräten,
  bleibt der Verlierer als **Konfliktkopie** stehen — der Abgleich wirft nie etwas weg.
  Das Token liegt nur in der lokalen IndexedDB und steht in keiner Export-Datei.
- **Datei teilen** (📤 am Bogen): ein Charakter samt dem Homebrew, das er braucht, als
  JSON. Auf iOS öffnet das das System-Teilen-Blatt (AirDrop, „In Dateien speichern"),
  sonst wird heruntergeladen. Braucht kein Konto und kein Netz.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `apps/web/` | Die PWA (Vite + React + TanStack Router + Dexie + Tailwind) |
| `packages/core/` | Zod-Schemas + pure Regel-Engine (`deriveSheet`), keine DOM-/Storage-Imports |
| `tools/etl/` | Konvertiert den SRD-3.5-Datensatz nach `packs/srd/` (Build-Zeit, nicht ausgeliefert) |
| `tools/extract/` | Konverter für **private** Inhalte (Output ist gitignored, wird nie committet) |
| `packs/srd/` | Generierte, committete SRD-JSON-Chunks (Open Game Content, OGL 1.0a) |

## Entwicklung

```bash
pnpm install
pnpm dev        # Dev-Server
pnpm test       # Engine-Tests (die Spezifikation des Projekts)
pnpm etl        # SRD-Packs neu generieren
pnpm build      # Produktions-Build (PWA)
```

## Lizenz der Spieldaten

`packs/srd/` enthält ausschließlich Open Game Content aus dem D&D 3.5 System Reference
Document unter der Open Game License v1.0a — siehe `packs/srd/OGL.txt` und die
Lizenz-Seite in der App. Eigene Buchinhalte gehören nicht ins Repo: sie werden mit
`tools/extract/` in private Paket-Dateien konvertiert und lokal in die App importiert.
