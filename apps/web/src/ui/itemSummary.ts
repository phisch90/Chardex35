import { displayName, type Entity } from "@codex35/core";
import { fmtMod } from "./bits.js";

/**
 * Die eine Zeile unter dem Namen: was bringt das Stück?
 *
 * Vorher stand das nur bei Rüstung und Schild. Für eine Waffe stand dort gar
 * nichts Mechanisches — man musste in den Kampf-Reiter wechseln, um zu sehen, ob
 * das Kurzschwert 1d6 oder 1d8 macht. Fight Club schreibt es an jede Zeile, und
 * das ist offensichtlich richtig: die Liste ist der Ort, an dem man vergleicht.
 *
 * Enthält bewusst KEINE abgeleiteten Gesamtwerte (kein „+11 Angriff"): die hängen
 * an Attributen und Talenten, gehören auf den Bogen und würden hier bei jedem
 * Stück eine andere Wahrheit behaupten.
 */
export function itemSummary(entity: Entity | undefined): string {
  if (entity === undefined || entity.kind !== "item") return "";
  const data = entity.data;
  const parts: string[] = [];

  const armor = data.armor;
  if (armor) {
    parts.push(`RK ${fmtMod(armor.acBonus)}`);
    if (armor.maxDex !== null) parts.push(`max. DEX ${armor.maxDex}`);
    /*
      `acp` steht in den Packs NEGATIV (der Generator erzwingt -Math.abs).
      Vorher stand hier `Malus −${acp}` und daraus wurde auf dem Bogen
      „Malus −-6". Deshalb: Betrag nehmen und das Vorzeichen selbst setzen.
    */
    if (armor.acp !== 0) parts.push(`Malus −${Math.abs(armor.acp)}`);
    if (armor.asf > 0) parts.push(`${armor.asf}% Zauberpatzer`);
  }

  const weapon = data.weapon;
  if (weapon) {
    parts.push(`${weapon.damage} Schaden`);
    parts.push(`krit. ${weapon.critRange}/${weapon.critMult}`);
    if (weapon.rangeIncrementFt !== undefined) parts.push(`${weapon.rangeIncrementFt} ft`);
  }

  return parts.join(" · ");
}

/** Name der Zeile — eigener Name schlägt Kompendium-Name. */
export function itemLabel(
  row: { customName?: string | undefined },
  entity: Entity | undefined,
): string {
  return row.customName ?? (entity ? displayName(entity) : "—");
}
