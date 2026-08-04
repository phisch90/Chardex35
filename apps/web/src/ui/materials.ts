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
};

export const MATERIAL_HINTS: Record<Material, string> = {
  codex: "Kühles Blaugrau — wie bisher",
  nachtbogen: "Dunkles Papier, Tinte und Messing",
};
