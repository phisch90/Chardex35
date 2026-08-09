import type { Entity } from "../schema/entities.js";

/**
 * Welche Talente eine WAFFE brauchen — und warum das eine Funktion ist.
 *
 * „Weapon Focus" allein bewirkt nichts: sein Bonus trägt `scope: "chosenItem"` und
 * greift erst, wenn `feats[].choiceRef` auf einen Waffentyp zeigt (`derive.ts`,
 * `chosenItemContributions`). Ein Talent ohne diese Zuordnung ist ein Eintrag, der
 * am Bogen steht und nichts tut.
 *
 * Die Bedingung stand bisher ZWEIMAL wörtlich da — im Talente-Reiter und im
 * Fight-Club-Import. Das ist die Falle, die dieses Projekt schon bezahlt hat: eine
 * Regel, die in drei Ansichten steht, steht in keiner. Sie steht jetzt hier, und
 * die Auswahl beim WÄHLEN des Talents (statt irgendwann später am Bogen) liest
 * dieselbe Funktion.
 *
 * Bewusst KEINE Namensliste: „heißt es Weapon Focus?" ginge bei jedem Talent aus
 * einem eigenen Buch vorbei — dieselbe Entscheidung wie bei den Behältern im
 * Gepäck. Gefragt wird die WIRKUNG.
 */
export function featNeedsWeaponChoice(entity: Entity | undefined): boolean {
  if (entity === undefined || entity.kind !== "feat") return false;
  return entity.effects.some((effect) => effect.scope === "chosenItem");
}

/**
 * Ist dieser Eintrag eine Waffe? Die Frage steht an drei Stellen der Oberfläche
 * (Waffenwahl am Talent, Angriffszeilen, Vorschläge) und wird hier einmal
 * beantwortet.
 */
export function isWeaponEntity(entity: Entity | undefined): boolean {
  return entity !== undefined && entity.kind === "item" && entity.data.weapon !== undefined;
}
