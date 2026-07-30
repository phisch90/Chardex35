import { displayName, type Entity } from "@codex35/core";
import { S } from "../strings.js";
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
 *
 * Zwei Änderungen aus Philipps Rückfrage zum Holzschild — wörtlich: „RK+2 (klar),
 * Malus -2 (hä?, warum und worauf?) 15% Zauberpatzer? (hä?)":
 *
 *  - „Malus −2" heißt jetzt „Fertigkeiten −2" und sagt damit, WORAUF er wirkt.
 *  - Die arkane Patzerchance steht hier NICHT mehr. Sie betrifft nur Bard,
 *    Sorcerer und Wizard; an seinem Kleriker war sie eine Zahl ohne jede
 *    Bedeutung, die trotzdem beunruhigt — und die Engine verrechnet sie nirgends.
 *    Sie erscheint jetzt nur da, wo auch der Satz danebensteht, wen sie betrifft.
 *
 * Dazu Art, Preis und Gewicht, weil 206 Namen im Kompendium doppelt vorkommen:
 * „Cure Light Wounds" gibt es viermal (Trank 50 gp, zwei Rollen, Zauberstab
 * 750 gp), und ohne diese Zeile sind die vier nicht zu unterscheiden.
 */
export function itemSummary(
  entity: Entity | undefined,
  opts?: {
    /**
     * Preis und Gewicht mitschreiben? In der AUSWAHL ja — dort vergleicht man,
     * und 206 Namen kommen doppelt vor. In der Gepäckliste nein: die Zeile führt
     * dort ihr eigenes Gewicht, MAL DER MENGE, und das kann diese Funktion nicht
     * wissen. Beides zusammen ergab „10 lb · 10 lb".
     */
    money?: boolean;
  },
): string {
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
    if (armor.acp !== 0) parts.push(`${S.items.acpLabel} −${Math.abs(armor.acp)}`);
    const kind = S.items.subgroups[armor.kind];
    if (kind !== undefined) parts.push(kind);
  }

  const weapon = data.weapon;
  if (weapon) {
    parts.push(`${weapon.damage} Schaden`);
    /*
      Beim Wurfnetz stehen im SRD-Bestand Kritisch und Reichweite vertauscht
      (`critMult` ist dort „10 ft."). „krit. 20/10 ft." ist Unsinn — dann lieber
      weglassen als eine Angabe hinschreiben, die niemand deuten kann.
    */
    if (!/ft/i.test(weapon.critMult)) parts.push(`krit. ${weapon.critRange}/${weapon.critMult}`);
    if (weapon.rangeIncrementFt !== undefined) parts.push(`${weapon.rangeIncrementFt} ft`);
    const category = S.items.subgroups[weapon.category];
    if (category !== undefined) parts.push(category);
  }

  /*
    Preis und Gewicht nur, wo sie GESETZT sind. Eine feste Spalte wäre zu 80 %
    leer: von 1866 Gegenständen tragen nur 370 ein Gewicht — bei „Antitoxin
    (vial)" fehlt es einfach, und „0 lb" hinzuschreiben wäre eine Behauptung.
  */
  if (opts?.money !== false) {
    if (data.costGp !== undefined && data.costGp > 0) parts.push(`${data.costGp} gp`);
    if (data.weightLb !== undefined && data.weightLb > 0) parts.push(`${data.weightLb} lb`);
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
