/**
 * Letzter Schritt jedes Parsers: die Entity durchs Schema schicken.
 *
 * Warum das nicht optional ist: ein handgebautes Objekt-Literal bekommt KEINE
 * Schema-Vorgaben. `bonusSlots`, `armorFailure`, `spellbook` und ein Dutzend
 * andere Felder entstehen erst beim Parsen. Ohne diesen Schritt schreibt der
 * Konverter eine Datei, die anders aussieht als das, was die App nach dem Import
 * daraus macht — und genau diese Sorte Unterschied hat in dieser App schon
 * einmal für eine Lawine falscher Konflikt-Kopien gesorgt.
 *
 * Zweiter Zweck: Fehler früh und laut. Eine Entity, die das Schema nicht besteht,
 * darf nicht in die Ausgabedatei — sonst scheitert der Import später mit einer
 * Meldung, die nicht mehr auf das Buch zeigt.
 */
import { entitySchema, type Entity, type EntityInput } from "@codex35/core";

export function finishEntity(entity: EntityInput): Entity {
  const parsed = entitySchema.safeParse(entity);
  if (parsed.success) return parsed.data;
  const problems = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "(Wurzel)"}: ${issue.message}`)
    .join("; ");
  throw new Error(`„${entity.name}" passt nicht ins Schema — ${problems}`);
}
