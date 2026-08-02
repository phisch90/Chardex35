/**
 * Sterben — Martins Hausregel, wörtlich:
 *
 * > „Tod erst bei HP gleich negativem CON Wert. Zwischen 0 und minus CON Mod:
 * > Selbststabilisierung per Fort Save DC 10 (oder DM Ermessen). Unterhalb des negativen
 * > Mods: keine Probe mehr, automatisch 1 HP Verlust pro Runde."
 *
 * Zwei Zahlen, die man leicht verwechselt, und der Satz nennt beide: die Probenzone endet
 * beim CON-**MODIFIKATOR**, der Tod steht beim CON-**WERT**. Bei CON 14 (+2) heißt das:
 * 0 bis −2 Probe, −3 bis −13 blutend, tot bei −14. Wer hier einmal den Modifikator für
 * den Wert nimmt, tötet Charaktere bei −2.
 *
 * Der Zustand ist eine FOLGE und wird nirgends gespeichert — das ist die Fehlerfamilie 1
 * dieses Projekts, und sie liegt hier besonders nah: es gibt im Kompendium fertige
 * Zustände („dying", „stable"), die man antippen kann. Würde „sterbend" dorthin
 * geschrieben, bliebe die Marke nach der Heilung stehen.
 *
 * Genau EINE Eingabe hat die Regel: ob die Selbststabilisierungs-Probe gelungen ist. Ein
 * Würfelergebnis am Tisch kann die App nicht ableiten, also gehört es an den Charakter
 * (`hp.stabilized`) — und neuer Schaden löscht es wieder (`applyHpChange`).
 */

/** Der Schwierigkeitsgrad der Selbststabilisierung. Martin: „Fort Save DC 10". */
export const STABILIZE_DC = 10;

export type DyingZone =
  /** Über 0 — alles in Ordnung. */
  | "ok"
  /** In der Probenzone: eine Fort-Probe kann stabilisieren. */
  | "saveZone"
  /** Probe gelungen: der Verlust ist gestoppt, aber es bleibt knapp. */
  | "stable"
  /** Unter der Probenzone: keine Probe mehr, 1 TP pro Runde. */
  | "bleeding"
  /** Beim negativen CON-Wert. */
  | "dead";

export interface DyingStatus {
  state: DyingZone;
  /**
   * Bei diesem Stand ist die Figur tot — als Zahl, damit die Oberfläche sie ANZEIGEN
   * kann statt sie nachzurechnen. Zwei Rechnungen derselben Grenze wären zwei Wahrheiten.
   */
  deadAt: number;
  /**
   * Die untere Grenze der Probenzone (−CON-Modifikator), oder `undefined`, wenn es die
   * Zone gar nicht gibt: bei CON 10 oder schlechter ist der Modifikator 0 oder negativ,
   * dann liegt unter 0 sofort die blutende Zone. Ohne diese Ausnahme entstünde eine
   * „Zone" von 0 bis +1.
   */
  saveZoneDownTo: number | undefined;
}

export function dyingStatus(input: {
  /** Aktuelle TP — dürfen negativ sein. */
  current: number;
  /** Der ENDWERT von CON (nicht der Modifikator). */
  conScore: number;
  /** Der CON-Modifikator. */
  conMod: number;
  /** Hausregel: Tod bei −10 oder beim negativen CON-Wert. */
  deathAt: "minus10" | "negCon";
  /** Ist die Selbststabilisierungs-Probe gelungen? */
  stabilized: boolean;
}): DyingStatus {
  const deadAt = input.deathAt === "negCon" ? -input.conScore : -10;
  const saveZoneDownTo = input.conMod > 0 ? -input.conMod : undefined;

  if (input.current > 0) return { state: "ok", deadAt, saveZoneDownTo };
  if (input.current <= deadAt) return { state: "dead", deadAt, saveZoneDownTo };
  if (input.stabilized) return { state: "stable", deadAt, saveZoneDownTo };
  /*
    Die 0 gehört zur Probenzone. Sein Satz fängt dort an („zwischen 0 und minus CON
    Mod"); im Regelwerk wäre 0 eine eigene Zone (wach, halbe Handlung). Steht als
    Merkzettel in FRAGEN-AN-DEN-DM.md, falls es sich am Tisch anders ergibt.
  */
  if (saveZoneDownTo !== undefined && input.current >= saveZoneDownTo) {
    return { state: "saveZone", deadAt, saveZoneDownTo };
  }
  return { state: "bleeding", deadAt, saveZoneDownTo };
}
