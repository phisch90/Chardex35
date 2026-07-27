# Marken-Grafiken

Die beiden Originale (1254 px) sind die Master — aus ihnen entsteht alles andere:

| Datei | Verwendung |
| --- | --- |
| `icon-source.png` | C+D-Monogramm mit d20 („35") → **App-Symbol** |
| `logo-source.png` | Drei Helden + Wortmarke → **Kopfbild** in den Einstellungen |

Warum diese Aufteilung: das Monogramm bleibt bis 40 px lesbar, beim Helden-Bild
zerfallen Gesichter und Wortmarke schon bei 80 px. Für ein Symbol, das auf dem
Startbildschirm 60–120 px groß ist, taugt nur das Erste.

## Neu erzeugen

```sh
pip install pillow
python3 tools/brand/build-icons.py
```

Das Skript schreibt nach `apps/web/public/` und erklärt in den Kommentaren, warum
es die maskable-Fassung mit zusätzlicher Luft baut und mit 128 Farben quantisiert.
Die Master selbst werden nicht ausgeliefert — sie liegen außerhalb von `public/`,
damit sie nicht in den Offline-Vorrat der App wandern.
