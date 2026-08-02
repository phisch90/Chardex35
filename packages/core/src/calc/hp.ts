import type { Character } from "../schema/character.js";

/** Der rohe TP-Zustand eines Charakters (nichts Abgeleitetes). */
export type HpState = Character["hp"];

export type HpChangeMode = "heal" | "temp" | "damage" | "nonlethal";

/**
 * Wendet eine TP-Änderung auf den rohen Zustand an — die eine Stelle, an der
 * die 3.5-Regeln zu Schaden, Heilung und temporären TP stehen.
 *
 * - **Schaden** geht zuerst gegen die temporären TP (PHB: „temporary hit points
 *   are lost first"), der Rest gegen die echten. Ohne das wären temporäre TP
 *   reine Dekoration: der Balken zeigte Verlust, obwohl noch Puffer da ist.
 * - **Heilung** baut zuerst nichttödlichen Schaden ab (der heilt schneller und
 *   ist nie der gefährlichere), dann echten. Unter 0 kann nichts fallen.
 * - **Temporäre TP** werden addiert. In 3.5 stapeln sich mehrere Quellen
 *   eigentlich nicht — es gilt der höhere Wert. Das hängt aber an der Quelle,
 *   die die App nicht kennt (zwei Zauber vs. ein Zauber zweimal), also bleibt
 *   es beim Addieren: der Spieler weiß, was er eintippt. Regel-Hinweis statt
 *   Blocker, wie überall.
 * - **Neuer Schaden löscht die Stabilisierung.** Wer wieder getroffen wird, ist nicht
 *   mehr stabil — das ist eine Regel und gehört deshalb hierher und nicht in die
 *   Oberfläche. Ohne diese Zeile hinge ein „stabilisiert: ja" vom letzten Kampf noch
 *   drin, wenn er drei Abende später wieder umfällt: eine gespeicherte Wahrheit, die
 *   nicht mehr stimmt.
 *
 * Mutiert nichts, sondern liefert den neuen Zustand.
 */
export function applyHpChange(hp: HpState, mode: HpChangeMode, amount: number): HpState {
  const value = Math.max(0, Math.floor(amount));
  if (value === 0) return hp;

  switch (mode) {
    case "damage": {
      const fromTemp = Math.min(hp.temp, value);
      return {
        ...hp,
        temp: hp.temp - fromTemp,
        damage: hp.damage + (value - fromTemp),
        stabilized: false,
      };
    }
    case "nonlethal":
      return { ...hp, nonlethal: hp.nonlethal + value };
    case "heal": {
      const toNonlethal = Math.min(hp.nonlethal, value);
      const rest = value - toNonlethal;
      return {
        ...hp,
        nonlethal: hp.nonlethal - toNonlethal,
        damage: Math.max(0, hp.damage - rest),
      };
    }
    case "temp":
      return { ...hp, temp: hp.temp + value };
  }
}
