/**
 * Porträts landen als Data-URL IM Charakter — ein Foto direkt vom iPad wäre
 * mehrere Megabyte und würde jeden Export und jeden Geräte-Abgleich sprengen
 * (die Gist-Ablage schneidet Dateien ab 1 MB ab). Deshalb wird beim Hochladen
 * verkleinert, nicht erst beim Verschicken.
 */

/** Längste Kante nach dem Verkleinern. Reicht für den Kopf des Bogens. */
export const PORTRAIT_MAX_PX = 512;
/** Bilder darunter bleiben unangetastet — kein Qualitätsverlust ohne Gewinn. */
const KEEP_AS_IS_BYTES = 150_000;
const JPEG_QUALITY = 0.82;
/** Hintergrund für durchsichtige PNGs — dieselbe Farbe wie die Oberfläche. */
const BACKDROP = "#0f172a";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
    image.src = src;
  });
}

/**
 * Verkleinert auf `maxPx` längste Kante und gibt eine JPEG-Data-URL zurück.
 * Schlägt irgendetwas fehl, kommt das Original zurück — ein Porträt ist kein
 * Grund, den Bogen nicht zu speichern.
 */
export async function toPortraitDataUrl(file: File, maxPx = PORTRAIT_MAX_PX): Promise<string> {
  const original = await readAsDataUrl(file);
  try {
    const image = await loadImage(original);
    const longest = Math.max(image.width, image.height);
    if (longest <= maxPx && file.size <= KEEP_AS_IS_BYTES) return original;

    const scale = Math.min(1, maxPx / longest);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return original;
    context.fillStyle = BACKDROP;
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const shrunk = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    // Bei kleinen Grafiken kann JPEG größer werden als das Original.
    return shrunk.length < original.length ? shrunk : original;
  } catch {
    return original;
  }
}
