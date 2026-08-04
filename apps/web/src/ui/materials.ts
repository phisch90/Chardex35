import type { Material } from "../db/appSettings.js";

/**
 * Wie ein Material heißt und woran man es erkennt.
 *
 * Dieselbe Trennung wie bei den Kampagnen- und Klassenfarben: der SCHLÜSSEL steht bei den
 * Daten (`db/appSettings.ts`), das AUSSEHEN in `styles.css`, und der NAME hier. So kann ein
 * Papier umbenannt werden, ohne dass ein gespeicherter Wert etwas anderes bedeutet.
 */
export const MATERIAL_LABELS: Record<Material, string> = {
  codex: "Codex",
  nachtbogen: "Nachtbogen",
  kopierterBogen: "Kopierter Bogen",
  kladde: "Kladde",
};

/**
 * Woran man es erkennt — und bei den zwei hellen steht die SCHRIFT mit dabei, weil das
 * der auffälligste Unterschied ist. Wer „hell" liest, erwartet dieselbe App in Weiß;
 * gemeint ist ein gedruckter Bogen.
 */
export const MATERIAL_HINTS: Record<Material, string> = {
  codex: "Kühles Blaugrau — wie bisher",
  nachtbogen: "Dunkles Papier, Tinte und Messing",
  kopierterBogen: "Hell, Serifen, dünne Linien — wie eine Fotokopie",
  kladde: "Cremepapier, Serifen, blauschwarze Tinte",
};

/**
 * Welche Papiere hell sind.
 *
 * Nur für die Oberfläche (die Auswahl trennt hell von dunkel) — das AUSSEHEN steht in
 * `styles.css`, und dort steht die Liste ein zweites Mal als Auswahlliste. Das sind
 * bewusst zwei Stellen und keine geteilte Wahrheit: CSS kann eine TypeScript-Liste nicht
 * lesen, und eine zur Laufzeit gebaute Klasse würde Tailwind nie finden. Wer ein Papier
 * dazunimmt, trägt es an beiden Stellen ein — der Test hält genau das fest.
 */
export const LIGHT_MATERIALS: readonly Material[] = ["kopierterBogen", "kladde"];
