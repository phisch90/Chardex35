import { ABILITIES, type Ability } from "../schema/common.js";
import type { Advice } from "./advice.js";

/**
 * Punktekauf für die Attribute — die Kostentabelle und was ein Bogen ausgibt.
 *
 * Warum das hier steht und nicht in der Anzeige: `pointBuyBudget` in den Hausregeln
 * war das Musterbeispiel für „etwas weiß es, und etwas anderes kann es nicht" —
 * ein gespeichertes Feld ohne Leser UND ohne Bedienelement. Damit es beim nächsten
 * Umbau nicht wieder auseinanderläuft, gibt es genau EINE Stelle, die rechnet.
 *
 * Die Grenze zwischen Eingabe und Folge ist dabei die übliche: das BUDGET ist eine
 * Eingabe (Hausregel, gespeichert), die AUSGABE ist eine Folge aus den Grundwerten
 * und wird nie gespeichert. Gerechnet wird auf `abilities.base` — die Werte VOR den
 * Volks-Modifikatoren, denn gekauft wird vor dem Volk.
 */

/**
 * Was ein Grundwert kostet (DMG-Tabelle, Punktekauf). 8 ist der Nullpunkt.
 *
 * Ab 15 wird es teuer, und das ist der ganze Sinn der Sache: der Sprung von 14 auf
 * 15 kostet 2 Punkte, der von 17 auf 18 drei.
 */
export const POINT_BUY_COST: Readonly<Record<number, number>> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 6,
  15: 8,
  16: 10,
  17: 13,
  18: 16,
};

/** Was der Punktekauf höchstens hergibt — darüber wird nicht gekauft, sondern gewürfelt. */
export const POINT_BUY_MAX = 18;
/** Der Nullpunkt der Tabelle. */
export const POINT_BUY_MIN = 8;

/**
 * Der Preis eines Grundwerts, auch außerhalb der Tabelle.
 *
 * Die Tabelle des Regelwerks deckt 8 bis 18 ab. Diese App WARNT statt zu sperren
 * („Der DM hat Recht, nicht die App"), also muss auch eine 6 oder eine 19 eine Zahl
 * bekommen — sonst stünde im Assistenten ein Strich, wo eine Auskunft hingehört.
 *
 * Die Fortsetzung ist deshalb ausdrücklich die des Programms und nicht die des
 * Buches: unter 8 gibt jeder Punkt einen Punkt zurück, über 18 wächst der Preis
 * weiter im Muster der Tabelle (die letzten Schritte kosten 3, dann 4, dann 5 …).
 */
export function pointBuyCost(score: number): number {
  const whole = Math.floor(score);
  const inTable = POINT_BUY_COST[whole];
  if (inTable !== undefined) return inTable;
  // Unter der Tabelle: jeder Punkt unter 8 gibt einen Punkt zurück.
  if (whole < POINT_BUY_MIN) return whole - POINT_BUY_MIN;
  /*
    Über der Tabelle: weiterzählen wie sie es tut. Die Zuwächse sind 1×6, dann 2, 2,
    3, 3 — also je zwei Stufen einer mehr. Ab 19 geht es mit 4, 4, 5, 5 … weiter.
  */
  let cost = POINT_BUY_COST[POINT_BUY_MAX]!;
  let step = 4;
  for (let value = POINT_BUY_MAX + 1; value <= whole; value++) {
    cost += step;
    // Nach jeder zweiten Stufe wird der Schritt eins teurer (20→21, 22→23, …).
    if ((value - POINT_BUY_MAX) % 2 === 0) step++;
  }
  return cost;
}

/** Was die sechs Grundwerte zusammen kosten. */
export function pointBuySpent(base: Record<Ability, number>): number {
  return ABILITIES.reduce((sum, ability) => sum + pointBuyCost(base[ability]), 0);
}

export interface PointBuyState {
  budget: number;
  spent: number;
  /**
   * Was noch übrig ist. NEGATIV heißt überzogen.
   *
   * Eine Zahl für beide Richtungen, weil sie sich ausschließen müssen: „3 zu viel"
   * und „3 noch übrig" dürfen nie zusammen dastehen. Das ist die zweite
   * Fehlerfamilie dieses Projekts, und sie kam davon, dass nur `>` geprüft wurde.
   */
  left: number;
}

/**
 * Der Stand des Punktekaufs — oder `null`, wenn gar kein Budget gesetzt ist.
 *
 * `null` ist Absicht und keine Bequemlichkeit: ohne Budget zählt die App nichts und
 * sagt nichts. Seine Entscheidung dazu war „aus, bis ich es setze" — eine Zahl, die
 * er erst suchen muss, um sie loszuwerden, ist keine Voreinstellung, sondern eine
 * Zumutung.
 */
export function pointBuyState(
  base: Record<Ability, number>,
  budget: number | undefined,
): PointBuyState | null {
  if (budget === undefined || budget <= 0) return null;
  const spent = pointBuySpent(base);
  return { budget, spent, left: budget - spent };
}

/**
 * Ein Vorschlag, der das Budget nach der Klassen-Empfehlung ausgibt.
 *
 * Die Reihenfolge kommt aus `Advice.abilities` (wichtigstes zuerst) — dieselbe
 * Quelle, aus der die Sterne an den Feldern kommen. Eine zweite Liste hier wäre eine
 * zweite Wahrheit: dann empfiehlt der Stern das eine und der Knopf das andere.
 *
 * Vier Runden, in dieser Reihenfolge:
 *   1. alles auf 8 (der Nullpunkt der Tabelle),
 *   2. die empfohlenen Attribute auf ihre genannte Untergrenze,
 *   3. den Rest des Budgets in die empfohlenen, immer der billigste Schritt zuerst,
 *   4. was dann noch übrig ist, in die übrigen Attribute — auch billigster Schritt
 *      zuerst.
 *
 * Gekauft wird dabei nur, was den MODIFIKATOR verbessert (siehe `nextUseful`). Ein
 * Restpunkt, der nichts mehr bringt, bleibt deshalb liegen und wird im Assistenten als
 * „1 Punkt übrig" angesagt — das ist ehrlicher als ein STR 9, das wie ein Tippfehler
 * aussieht.
 *
 * Ohne Zufall: derselbe Knopf muss zweimal dasselbe liefern, sonst ist er keine
 * Empfehlung, sondern ein zweiter Würfel.
 */
export function suggestPointBuy(
  budget: number,
  advice: Advice | undefined,
): Record<Ability, number> {
  const scores = Object.fromEntries(ABILITIES.map((a) => [a, POINT_BUY_MIN])) as Record<
    Ability,
    number
  >;
  let left = budget - pointBuySpent(scores);

  const priority = (advice?.abilities ?? []).map((entry) => entry.ability);
  const rest = ABILITIES.filter((ability) => !priority.includes(ability));

  /** Einen einzelnen Punkt kaufen — für die genannten Untergrenzen, die auch krumm sein dürfen. */
  const raiseByOne = (ability: Ability) => {
    const cost = pointBuyCost(scores[ability] + 1) - pointBuyCost(scores[ability]);
    if (scores[ability] >= POINT_BUY_MAX || cost > left) return false;
    scores[ability] += 1;
    left -= cost;
    return true;
  };

  /*
    Der nächste Wert, der WIRKLICH etwas bringt.

    In 3.5 verbessert sich der Modifikator nur auf GERADEN Werten: 8 und 9 geben beide
    −1, 14 und 15 beide +2. Ein Punkt von 8 auf 9 kauft also gar nichts.

    Genau das hat der erste Vorschlag getan: er gab den letzten Punkt in ein STR 9 und
    sah damit aus wie ein Tippfehler statt wie eine Entscheidung. Gefunden hat das ein
    Blatt mit allen Vorschlägen, kein Test — der prüfte, dass nichts liegen bleibt, und
    das war das falsche Ziel. Liegen bleiben DARF etwas; verschwendet werden darf nichts.

    Krumme Werte kauft deshalb nur Runde 2, wo eine Empfehlung sie ausdrücklich nennt
    (STR 15 beim Kämpfer, DEX 13 für ein Talent).

    Was der Knopf damit NICHT kann, und das gehört dazugesagt: ein Mensch kauft eine 15
    manchmal absichtlich, weil auf Stufe 4 ein Punkt dazukommt und daraus eine 16 wird.
    Dieser Vorschlag plant nicht in die Zukunft — er holt aus dem Budget heraus, was HEUTE
    zählt, und sagt den Rest an. Die Felder bleiben Tippfelder: wer die 15 will, tippt sie.
  */
  const nextUseful = (ability: Ability) => {
    const now = scores[ability];
    return now % 2 === 0 ? now + 2 : now + 1;
  };
  const stepCost = (ability: Ability) =>
    pointBuyCost(nextUseful(ability)) - pointBuyCost(scores[ability]);
  const raiseToUseful = (ability: Ability) => {
    const target = nextUseful(ability);
    const cost = stepCost(ability);
    if (target > POINT_BUY_MAX || cost > left) return false;
    scores[ability] = target;
    left -= cost;
    return true;
  };

  // Runde 2: die genannten Untergrenzen zuerst — sie sind der Grund der Empfehlung.
  for (const entry of advice?.abilities ?? []) {
    const min = entry.min;
    if (min === undefined) continue;
    while (scores[entry.ability] < Math.min(min, POINT_BUY_MAX)) {
      if (!raiseByOne(entry.ability)) break;
    }
  }

  /*
    Runden 3 und 4: erst die empfohlenen, dann die übrigen — billigster Schritt zuerst.

    Billigster zuerst und nicht wichtigster zuerst, und das ist eine Entscheidung: so
    holt das Budget die MEISTEN Modifikatorpunkte heraus. Ein Kämpfer mit STR 16 und
    CON 16 steht besser da als einer mit STR 18 und CON 12, denn die 17 und die 18
    kosten drei Punkte pro Stufe. Die Reihenfolge der Empfehlung entscheidet bei
    gleichem Preis — und die empfohlenen kommen als ganze Gruppe vor den übrigen.
  */
  for (const group of [priority, rest]) {
    let moved = true;
    while (moved) {
      moved = false;
      const möglich = group
        .filter((ability) => nextUseful(ability) <= POINT_BUY_MAX && stepCost(ability) <= left)
        /*
          Billigster Schritt zuerst. Bei gleichem Preis der NIEDRIGERE Wert, und erst
          dann die Reihenfolge der Gruppe.

          Der Wert in der Mitte ist der Fund aus dem Lauf im gebauten Bogen: ohne ihn
          gewann bei jedem Gleichstand dieselbe Kennung, und der ganze Rest landete in
          EINEM Attribut — der Kämpfer bekam INT 14, während WIS und CHA auf 8 stehen
          blieben. Das ist kein Verteilen mehr, das ist ein Trichter.
        */
        .sort(
          (a, b) =>
            stepCost(a) - stepCost(b) ||
            scores[a] - scores[b] ||
            group.indexOf(a) - group.indexOf(b),
        );
      const ziel = möglich[0];
      if (ziel !== undefined) moved = raiseToUseful(ziel);
    }
  }

  return scores;
}
