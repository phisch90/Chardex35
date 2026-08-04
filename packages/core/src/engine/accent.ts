import type { Character } from "../schema/character.js";

/**
 * Welche Klasse färbt den Bogen?
 *
 * Sein Wunsch: „für jede Klasse ein eigenes Farbkonzept, ein eigenes Thema". Bei einer
 * Klasse ist das keine Frage — bei Hike (Kämpfer 1 / Kleriker 6) schon. Gefragt und
 * entschieden: **die Klasse mit den meisten Stufen**, bei Gleichstand die ZULETZT
 * gestiegene.
 *
 * Die Farbe ist damit eine FOLGE aus den Stufen und wird nie gespeichert — die
 * Fehlerfamilie dieses Projekts. Gespeichert wird nur, wenn er sie AM BOGEN überschreibt
 * (`character.accent`); das ist dann eine Eingabe und gehört ihm.
 *
 * Warum „meiste Stufen" und nicht „erste Klasse": ein Kämpfer 1 / Kleriker 6 ist am Tisch
 * ein Kleriker mit Kampferfahrung, kein Kämpfer, der ein bisschen betet. Und warum bei
 * Gleichstand die zuletzt gestiegene: bei 3/3 ist die Richtung, in die die Figur wächst,
 * die interessantere Auskunft.
 */
export function accentClassIdOf(character: Character): string | undefined {
  if (character.levels.length === 0) return undefined;

  const count = new Map<string, number>();
  for (const level of character.levels) {
    count.set(level.classId, (count.get(level.classId) ?? 0) + 1);
  }

  /*
    Von HINTEN durchgehen: so gewinnt bei gleicher Stufenzahl die Klasse, deren letzter
    Aufstieg am nächsten liegt. Mit `>` (nicht `>=`) beim Vergleich bleibt der zuerst
    gefundene — und das ist von hinten gesehen der spätere.
  */
  let bestId: string | undefined;
  let bestCount = 0;
  for (let i = character.levels.length - 1; i >= 0; i--) {
    const id = character.levels[i]!.classId;
    const n = count.get(id) ?? 0;
    if (n > bestCount) {
      bestCount = n;
      bestId = id;
    }
  }
  return bestId;
}
