/**
 * Was ein Bogen wirklich trägt — Behälter, Inhalt und Münzen.
 *
 * Bisher war das eine Schleife von vier Zeilen mitten in `derive.ts`: Gewicht mal
 * Menge, aufsummiert, fertig. Mit Behältern ist es keine Summe mehr, sondern eine
 * Frage je Zeile („liegt das in einem Beutel, der das Gewicht schluckt?"), und mit
 * den Münzen kommt eine zweite Quelle dazu, die gar nicht im Gepäck steht.
 *
 * Deshalb steht es hier, in einer reinen Funktion ohne Kompendium und ohne
 * Charakter: was am Ende in der Traglast steht, ist an EINER Stelle nachlesbar und
 * ohne den halben Bogen prüfbar. Die Anzeige rechnet nichts nach — sie zeigt, was
 * hier herauskommt. Dieselbe Trennung wie bei `armorCost`: die Karte hat keine
 * einzige Regel.
 *
 * Die Grenze zwischen Eingabe und Folge, wie immer: WELCHE Zeile in welchem
 * Behälter liegt, ist eine Eingabe (steht am Charakter). Was ein Behälter WIEGT, ist
 * eine Folge und wird nie gespeichert.
 */

/** Eine Zeile, so weit die Traglast sie kennt — ohne Kompendium, ohne Effekte. */
export interface CarryRow {
  id: string;
  /** Gewicht EINES Stücks in lb (Override oder aus dem Gegenstand), 0 wenn unbekannt. */
  weightLb: number;
  qty: number;
  /** In welchem Behälter die Zeile liegt. Unbekannte Kennung = am Körper. */
  containerId?: string | undefined;
  /** Gesetzt heißt: diese Zeile IST ein Behälter. */
  container?: { weightless: boolean } | undefined;
}

/** Münzen, wie sie am Charakter stehen. */
export interface CoinPurse {
  pp: number;
  gp: number;
  sp: number;
  cp: number;
}

/**
 * Wie viele Münzen ein Pfund sind (PHB: „Fifty coins weigh one pound").
 *
 * Die Sorte ist dabei gleichgültig — ein Kupferstück wiegt so viel wie ein
 * Platinstück. Das steht so im Buch und überrascht am Tisch regelmäßig.
 */
export const COINS_PER_POUND = 50;

/** Was ein Behälter trägt — für die Zeile, die es ansagt. */
export interface ContainerLoad {
  id: string;
  /** Das Gewicht des INHALTS, ohne den Behälter selbst. */
  contentLb: number;
  /** Wie viele Zeilen darin liegen. */
  rows: number;
  /** Trägt er den Inhalt gewichtslos (Sack der Bewahrung)? */
  weightless: boolean;
}

export interface CarryBlock {
  /** Was zählt: Gepäck + Münzen, ohne das, was ein magischer Behälter schluckt. */
  loadLb: number;
  /** Nur die Gegenstände. */
  itemsLb: number;
  /** Nur die Münzen — 0, solange die Hausregel aus ist. */
  coinLb: number;
  /** Was magische Behälter der Traglast abnehmen. Zum Ansagen, nicht zum Rechnen. */
  weightlessLb: number;
  /** Je Behälter, in der Reihenfolge des Gepäcks. */
  containers: ContainerLoad[];
}

/**
 * Die Traglast aus Gepäck und Münzen.
 *
 * Ein Behälter zählt IMMER selbst mit — auch ein Sack der Bewahrung wiegt seine 15
 * lb. Gewichtslos ist der INHALT, nicht der Beutel; wer das verwechselt, verschenkt
 * am Tisch ein paar Pfund und merkt es nie.
 *
 * Eine Schachtelung gibt es absichtlich nicht: ein Behälter liegt immer am Körper,
 * nie in einem anderen. Damit kann kein Kreis entstehen (Rucksack im Beutel im
 * Rucksack), und die Rechnung braucht keine Tiefensuche mit Zykluswächter. Die
 * Oberfläche hält sich daran, indem sie nur Zeilen ohne eigenen Behälter zum
 * Einpacken anbietet — und diese Funktion hält sich daran, indem sie ein
 * `containerId` an einem Behälter ignoriert.
 */
export function carriedWeight(
  rows: readonly CarryRow[],
  money: CoinPurse,
  options: { countCoins: boolean },
): CarryBlock {
  const containers = new Map<string, ContainerLoad>();
  for (const row of rows) {
    if (row.container === undefined) continue;
    containers.set(row.id, {
      id: row.id,
      contentLb: 0,
      rows: 0,
      weightless: row.container.weightless,
    });
  }

  let itemsLb = 0;
  let weightlessLb = 0;
  for (const row of rows) {
    const weight = row.weightLb * row.qty;
    // Ein Behälter liegt nie in einem anderen — siehe oben.
    const holder = row.container === undefined ? containers.get(row.containerId ?? "") : undefined;
    if (holder !== undefined) {
      holder.contentLb += weight;
      holder.rows += 1;
      if (holder.weightless) {
        weightlessLb += weight;
        continue;
      }
    }
    itemsLb += weight;
  }

  /*
    Die Münzen aufgerundet, nicht abgeschnitten. 56 Münzen sind mehr als ein Pfund,
    und wer sie auf 1 lb abschneidet, gibt Gewicht her, das der DM gleich wieder
    dazurechnet. Bei einer Grenze („noch leichte Last?") ist genau die Richtung die
    Frage — und die App warnt statt zu sperren, also darf sie nicht schmeicheln.
  */
  const coins = money.pp + money.gp + money.sp + money.cp;
  const coinLb = options.countCoins ? Math.ceil(coins / COINS_PER_POUND) : 0;

  return {
    loadLb: itemsLb + coinLb,
    itemsLb,
    coinLb,
    weightlessLb,
    containers: [...containers.values()],
  };
}
