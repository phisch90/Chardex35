import type { Character } from "../schema/character.js";
import { entitySchema, type DeityEntity, type Entity } from "../schema/entities.js";

/**
 * Gottheiten — sein Auftrag: „Ich möchte auch gerne die Götter mit reinbringen,
 * sodass wir die Domains des clerics korrekt verwenden können."
 *
 * Die App liefert KEINE Götter mit: die Namen der D&D-Götter sind Product
 * Identity und stehen nicht im freien SRD (Grundsatz des Repos: nur OGL/SRD).
 * Sie liefert das FACH — Name, Domänen, Lieblingswaffe, Gesinnung — und sein
 * Tisch legt seine eigenen als Homebrew-Einträge an. Die reisen wie eigene
 * Gegenstände über Sicherung, Abgleich und das Teilen eines Charakters mit
 * (der Referenz-Sammler in `sync/refs.ts` sammelt Kennungen stumpf, `deityRef`
 * kommt also von allein mit).
 */

export function deityEntities(compendium: ReadonlyMap<string, Entity>): DeityEntity[] {
  return [...compendium.values()]
    .filter((e): e is DeityEntity => e.kind === "deity" && !e.deletedAt)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Die Gottheit eines Charakters — über den Verweis, nie über den Namen. */
export function deityOf(
  character: Pick<Character, "deityRef">,
  compendium: ReadonlyMap<string, Entity>,
): DeityEntity | undefined {
  if (character.deityRef === undefined) return undefined;
  const entity = compendium.get(character.deityRef);
  return entity?.kind === "deity" && !entity.deletedAt ? entity : undefined;
}

/** Einen neuen Gottheits-Eintrag bauen — durchs Schema, nie als Literal. */
export function buildDeity(input: {
  name: string;
  domainIds: string[];
  favoredWeaponId?: string | undefined;
  favoredWeaponName?: string | undefined;
  alignment?: string | undefined;
  id?: string | undefined;
}): DeityEntity {
  const entity = entitySchema.parse({
    id: input.id ?? `hb:deity:${crypto.randomUUID()}`,
    kind: "deity",
    name: input.name,
    source: "homebrew",
    effects: [],
    data: {
      domainIds: input.domainIds,
      ...(input.favoredWeaponId === undefined ? {} : { favoredWeaponId: input.favoredWeaponId }),
      ...(input.favoredWeaponName === undefined
        ? {}
        : { favoredWeaponName: input.favoredWeaponName }),
      ...(input.alignment === undefined || input.alignment === ""
        ? {}
        : { alignment: input.alignment }),
    },
  });
  if (entity.kind !== "deity") throw new Error("buildDeity: kind verloren");
  return entity;
}

export const WAR_DOMAIN_ID = "srd:spelllist:domain-war";
const WEAPON_FOCUS_ID = "srd:feat:weapon-focus";

export interface WarFocusStatus {
  /** Der Bogen hat die War-Domäne UND eine Gottheit mit Lieblingswaffe. */
  applies: boolean;
  weaponId?: string | undefined;
  weaponName?: string | undefined;
  /** Weapon Focus mit GENAU dieser Waffe steht schon am Bogen. */
  granted: boolean;
}

/**
 * Gewährt die War-Domäne diesem Bogen Weapon Focus — und hat er es schon?
 *
 * Genau seine Frage: „Dann weiß ich ob ich zum Beispiel den Bonus fest von der
 * war Domain schon hab oder ob ich den vergessen hab." Die Antwort wird
 * GERECHNET und nirgends gespeichert; eingetragen wird das Talent nur auf
 * seinen Tipp (es verschiebt Angriffswerte — Zahlen wandern hier nie von
 * allein). Verglichen wird die KENNUNG der Waffe, mit `basedOn`-Ausweichen wie
 * in `derive.ts`: eine eigene Variante desselben Typs zählt mit.
 */
export function warFocusStatus(
  character: Pick<Character, "deityRef" | "domains" | "feats">,
  compendium: ReadonlyMap<string, Entity>,
): WarFocusStatus {
  const deity = deityOf(character, compendium);
  const hasWar = character.domains.some((d) => d.spellListId === WAR_DOMAIN_ID);
  const weaponId = deity?.data.favoredWeaponId;
  if (deity === undefined || !hasWar || weaponId === undefined) {
    return { applies: false, granted: false };
  }
  const weapon = compendium.get(weaponId);
  const weaponName =
    deity.data.favoredWeaponName ??
    (weapon !== undefined ? (weapon.localized?.de?.name ?? weapon.name) : weaponId);
  const granted = character.feats.some((feat) => {
    if (feat.featId !== WEAPON_FOCUS_ID) return false;
    if (feat.choiceRef === weaponId) return true;
    const chosen = feat.choiceRef !== undefined ? compendium.get(feat.choiceRef) : undefined;
    return chosen !== undefined && chosen.basedOn === weaponId;
  });
  return { applies: true, weaponId, weaponName, granted };
}

/**
 * Gewählte Domänen, die NICHT zur Gottheit gehören — für die Warnung.
 * Ohne Gottheit (oder ohne Verweis) ist die Liste leer: nichts zu prüfen.
 */
export function domainsOutsideDeity(
  character: Pick<Character, "deityRef" | "domains">,
  compendium: ReadonlyMap<string, Entity>,
): string[] {
  const deity = deityOf(character, compendium);
  if (deity === undefined) return [];
  const allowed = new Set(deity.data.domainIds);
  return character.domains
    .map((d) => d.spellListId)
    .filter((id) => !allowed.has(id));
}
