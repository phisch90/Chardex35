import { entitySchema, type Entity } from "@codex35/core";

/**
 * Kompendium-Einträge beim LESEN durchs Schema schicken — genau wie Charaktere.
 *
 * Der Grund ist ein echter Absturz: Einträge liegen so in der Datenbank, wie
 * eine frühere App-Version sie hineingeschrieben hat. Kommt im Schema ein Feld
 * dazu (`extraUses` an den Talenten), fehlt es in diesen alten Zeilen — und die
 * Regel-Engine, die sich auf den Standardwert verlässt, läuft ins Leere. Sichtbar
 * wurde das beim ersten Start nach dem Update: die App rendert schon, während
 * das neue Kompendium im Hintergrund noch geladen wird, also mit den alten
 * Zeilen. Ein `?? []` an der Fundstelle heilt nur diesen einen Fall; hier ist
 * die Ursache behoben.
 *
 * Mit Cache, weil es nicht billig ist: gut 3000 Einträge einmal zu parsen kostet
 * auf dem Handy einige hundert Millisekunden, und `useLiveQuery` liefert die
 * ganze Tabelle bei JEDER Änderung neu. Der Schlüssel deckt alles ab, was einen
 * Eintrag inhaltlich verändert — `rev` steigt bei jeder Bearbeitung, und ein
 * App-Update mit neuem Schema hebt `schemaVersion`.
 */
const cache = new Map<string, Entity>();

function keyFor(raw: Entity): string {
  return `${raw.id}#${raw.rev}#${raw.schemaVersion}#${raw.updatedAt}`;
}

/**
 * Nach dem Neu-Einspielen der SRD-Packs aufrufen — PFLICHT.
 *
 * Der Schlüssel oben erkennt jede normale Bearbeitung (`rev` steigt), aber
 * NICHT das Reseed: dort werden die SRD-Zeilen durch neue mit derselben `id`,
 * `rev` und `updatedAt` ersetzt. Ohne dieses Leeren liefert der Cache
 * anschließend weiter die alten Inhalte — die neuen Pack-Daten kämen erst nach
 * einem Neustart der App an. (Genau das ist beim Testen passiert: der
 * Talent-Bonus blieb nach dem Reseed aus.)
 */
export function clearEntityCache(): void {
  cache.clear();
}

/** Grobe Obergrenze: neue Einträge entstehen nur beim Bearbeiten (rev steigt). */
const MAX_CACHE = 20000;

export function hydrateEntity(raw: Entity): Entity {
  const key = keyFor(raw);
  const cached = cache.get(key);
  if (cached) return cached;
  if (cache.size > MAX_CACHE) cache.clear();

  const parsed = entitySchema.safeParse(raw);
  // Bei einem echten Datenfehler nicht die App anhalten: Rohdaten
  // durchlassen, damit das Kompendium sichtbar bleibt, und laut protokollieren.
  const entity = parsed.success ? parsed.data : raw;
  if (!parsed.success) {
    console.error(`Eintrag ${raw.id} passt nicht zum Schema:`, parsed.error.issues[0]);
  }
  cache.set(key, entity);
  return entity;
}

export function hydrateEntities(raw: Entity[]): Entity[] {
  return raw.map(hydrateEntity);
}
