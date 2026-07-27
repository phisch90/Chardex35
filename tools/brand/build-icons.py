#!/usr/bin/env python3
"""
Erzeugt aus den Original-Grafiken den Satz an App-Symbolen für apps/web/public.

    pip install pillow
    python3 tools/brand/build-icons.py

Die Originale liegen daneben in tools/brand/. Sie werden nicht direkt
ausgeliefert: 1254 px und ~1,9 MB je Bild sind für ein Symbol sinnlos, und die
App hält alle Dateien offline vor.
"""

from pathlib import Path

from PIL import Image

BRAND = Path(__file__).parent
OUT = BRAND.parent.parent / "apps" / "web" / "public"

# Das Abzeichen füllt 93 % der Vorlage; der Rest ist schwarzer Rand.
ICON = BRAND / "icon-source.png"
# Drei Helden + Wortmarke: zu detailliert für ein Symbol, gut als Kopfbild.
LOGO = BRAND / "logo-source.png"

# 128 Farben sind bei dieser flächigen Grafik auch bei 4× Zoom nicht von voller
# Farbtiefe zu unterscheiden und halbieren die Dateigröße.
COLORS = 128


def quantized(img: Image.Image) -> Image.Image:
    return img.convert("P", palette=Image.ADAPTIVE, colors=COLORS)


def square(icon: Image.Image, size: int) -> Image.Image:
    """Vollformat — das Abzeichen mit seinem eigenen schmalen Rand."""
    return icon.resize((size, size), Image.LANCZOS)


def maskable(icon: Image.Image, size: int) -> Image.Image:
    """
    Für Android: die Maske (Kreis, Squircle, Tropfen …) darf nur die mittleren
    80 % als sicher annehmen. Das Abzeichen füllt aber 93 % der Vorlage — ohne
    zusätzliche Luft schneidet die Maske den Goldrand rundherum ab.
    """
    inner = round(size * 0.78)
    canvas = Image.new("RGB", (size, size), (0, 0, 0))  # wie der Rand der Vorlage
    canvas.paste(icon.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2,) * 2)
    return canvas


def main() -> None:
    icon = Image.open(ICON).convert("RGB")
    logo = Image.open(LOGO).convert("RGB")

    targets = {
        # Manifest, purpose "any" — so, wie die Grafik gemeint ist.
        "icon-192.png": square(icon, 192),
        "icon-512.png": square(icon, 512),
        # Manifest, purpose "maskable" — mit Luft für die Maske.
        "icon-maskable-192.png": maskable(icon, 192),
        "icon-maskable-512.png": maskable(icon, 512),
        # iOS rundet selbst; der schwarze Rand der Vorlage fängt das auf.
        "apple-touch-icon.png": square(icon, 180),
        "favicon-32.png": square(icon, 32),
        "logo.png": logo.resize((480, 480), Image.LANCZOS),
    }

    total = 0
    for name, img in targets.items():
        path = OUT / name
        quantized(img).save(path, optimize=True)
        size = path.stat().st_size
        total += size
        print(f"{size / 1024:7.1f} kB  {name}")
    print(f"{total / 1024:7.1f} kB  Summe")


if __name__ == "__main__":
    main()
