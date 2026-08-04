/**
 * Wie groß die Charakterkarten sein dürfen, damit alle auf einen Bildschirm passen.
 *
 * Philipps Wunsch, wörtlich: „gerne etwas größer die Anzeige machen, weil da kommen
 * jetzt nicht ganz viele rein. Vielleicht kann die auch automatisch skalieren,
 * sobald der Bildschirm voll ist, werden die etwas kleiner, sodass immer alle
 * Charaktere angezeigt werden." Auf Rückfrage entschieden: **in Stufen kleiner
 * werden, ab etwa zehn dann scrollen.**
 *
 * Deshalb keine festgeklopften Grenzen („ab 7 klein"), sondern eine Rechnung: der
 * Platzbedarf jeder Stufe gegen das gemessene Budget, und genommen wird die erste,
 * die passt. Das macht die Anpassung wirklich automatisch — kommt eine
 * Kampagnen-Überschrift dazu, rutscht die Stufe von allein, ohne dass irgendwo eine
 * zweite Tabelle nachgepflegt werden muss.
 *
 * Warum gerechnet und nicht gemessen (kein `ResizeObserver`): messen hieße erst
 * groß zeichnen, dann feststellen „passt nicht", dann klein neu zeichnen — ein
 * sichtbares Zucken bei jedem Öffnen der Liste. Alle Karten einer Stufe sind exakt
 * gleich hoch, also ist die Anzahl der Karten die einzige Unbekannte, und die steht
 * vor dem ersten Pixel fest.
 *
 * ---
 *
 * Das Budget, gemessen bei 390×844 (sein iPhone), im ENGSTEN Fall — als
 * Web-App auf dem Startbildschirm, wo unten ~34px Safe-Area dazukommen:
 *
 *     844  Bildschirm
 *     −98  Freiraum für die untere Leiste (56px + Safe-Area + 8px Luft)
 *     −24  p-3 des inneren Kastens (Layout.tsx), oben und unten
 *     =722 nutzbar
 *     −36  Kopfzeile („Charaktere" gegen den Knopf „+ Neuer Charakter")
 *     −12  space-y-3
 *     −28  die Import-Leiste
 *     −12  space-y-3
 *     =634 für die Liste
 *
 * Im Browser-Tab ohne Safe-Area ist mehr Platz; gegen den engeren Fall zu rechnen
 * heißt, dass es dort erst recht passt.
 */

const LIST_BUDGET_PX = 634;

/** Eine Abschnitts-Überschrift: `text-xs` (16px) plus `mb-2` (8px). */
const HEADING_PX = 24;

/** Der Abstand zwischen zwei Abschnitten — das `space-y-3` der Wurzel. */
const SECTION_GAP_PX = 12;

export type CardTierKey = "xl" | "gross" | "mittel" | "kompakt";

export interface CardTier {
  key: CardTierKey;
  /** Porträt bzw. Platzhalter — quadratisch. */
  portrait: string;
  /**
   * Kantenlänge des Platzhalter-Zeichens im Porträt, in Pixeln.
   *
   * Stand hier als Schriftgrößen-Klasse (`text-3xl`), solange der Platzhalter ein 🛡️ war.
   * Seit es ein gezeichnetes Zeichen ist, ist die Größe eine Zahl und keine Schriftgröße
   * mehr — und damit auch nachmessbar.
   */
  markPx: number;
  /** Polster der Karte. */
  padding: string;
  /** Der Charaktername. */
  name: string;
  /** Spielername, Rasse und Klassen. */
  sub: string;
  /**
   * Der ⋯-Knopf.
   *
   * Muss mitschrumpfen, und das war nicht offensichtlich: mit festem `py-3 text-lg`
   * ist er 52px hoch und damit HÖHER als ein 40px-Porträt — dann bestimmt er die
   * Kartenhöhe, und die kleine Stufe wird nicht kleiner als die mittlere. Im
   * gebauten Bogen nachgemessen: beide kamen auf 78px, obwohl gerechnet 58 waren.
   * Nach unten begrenzt durch das, was ein Daumen am Tisch noch trifft.
   */
  action: string;
  /** Abstand zur nächsten Karte. */
  gap: string;
  /**
   * Kartenhöhe + Abstand, in Pixeln — die Zahl, mit der gerechnet wird.
   *
   * Kartenhöhe = das Höchste im Inhalt (Porträt, ⋯-Knopf oder die zwei Textzeilen)
   * + zweimal Polster + 2px Rahmen. In allen drei Stufen gewinnt das Porträt, und
   * genau darauf sind die anderen zwei zugeschnitten.
   */
  pitch: number;
}

/**
 * Von groß nach klein. Die Reihenfolge IST die Rangfolge — genommen wird die erste
 * Stufe, die passt.
 *
 * Die Zahlen sind im gebauten Bogen bei 390×844 nachgemessen, nicht geschätzt.
 */
export const CARD_TIERS: readonly CardTier[] = [
  {
    /*
      Die großzügigste Stufe, für seinen wahrscheinlichsten Fall: drei oder vier
      Bögen. Ohne sie stand bei drei Charakteren die halbe Fläche leer, und sein
      Wunsch war ausdrücklich „gerne etwas größer die Anzeige machen".

      Die Höhe kommt aus dem POLSTER, nicht aus einem größeren Porträt. Ein
      96px-Bild würde auf 390px Breite dem Text 16px wegnehmen, und „Human · Fighter
      1" steht dort schon knapp. So bleibt die Textbreite genau wie bei `gross`, und
      größer wird die Karte trotzdem.
    */
    key: "xl",
    portrait: "h-20 w-20",
    markPx: 30,
    padding: "p-5",
    name: "text-xl",
    sub: "text-sm",
    action: "px-2 py-3 text-lg",
    gap: "mb-2",
    pitch: 80 + 40 + 2 + 8,
  },
  {
    key: "gross",
    portrait: "h-20 w-20",
    markPx: 30,
    padding: "p-3",
    name: "text-lg",
    sub: "text-sm",
    // 52px hoch — passt bequem unter das 80px-Porträt.
    action: "px-2 py-3 text-lg",
    gap: "mb-1.5",
    pitch: 80 + 24 + 2 + 6,
  },
  {
    key: "mittel",
    portrait: "h-12 w-12",
    markPx: 22,
    padding: "p-3",
    name: "text-base",
    sub: "text-sm",
    // 44px — die Untergrenze für ein Tap-Ziel, und knapp unter dem 48px-Porträt.
    action: "px-2 py-2 text-lg",
    gap: "mb-1.5",
    pitch: 48 + 24 + 2 + 6,
  },
  {
    key: "kompakt",
    portrait: "h-10 w-10",
    markPx: 17,
    padding: "p-2",
    name: "text-sm",
    sub: "text-[11px]",
    // 36px. Kleiner als ideal — aber das eigentliche Tap-Ziel ist die ganze Karte,
    // und die ist auch hier 58px hoch.
    action: "px-2 py-1.5 text-base",
    gap: "mb-1",
    pitch: 40 + 16 + 2 + 4,
  },
];

/**
 * Was die Abschnitts-Überschriften vom Budget wegnehmen.
 *
 * Bei EINEM Abschnitt gibt es keine Überschrift: eine einzige Gruppe braucht keine
 * Beschriftung, und „Ohne Kampagne" über der einzigen Liste wäre Lärm. Ab zwei
 * Abschnitten trägt jeder eine — auch der ohne Kampagne, denn ein unbeschrifteter
 * Block unter beschrifteten ist nicht zu deuten.
 */
function headingsFor(sections: number): number {
  return sections <= 1 ? 0 : sections;
}

function needPx(pitch: number, rows: number, sections: number): number {
  return (
    rows * pitch +
    headingsFor(sections) * HEADING_PX +
    Math.max(0, sections - 1) * SECTION_GAP_PX
  );
}

/**
 * Die größte Stufe, in der `rows` Karten in `sections` Abschnitten noch ohne
 * Scrollen auf den Bildschirm passen.
 *
 * Passt selbst die kleinste nicht mehr, kommt sie trotzdem zurück — dann wird
 * gescrollt, und das ist ab etwa zehn Bögen seine ausdrückliche Entscheidung. Noch
 * kleiner zu werden würde die Karten unlesbar machen, um ein Scrollen zu vermeiden,
 * das niemand störend findet.
 */
export function cardTier(rows: number, sections: number): CardTier {
  for (const tier of CARD_TIERS) {
    if (needPx(tier.pitch, rows, sections) <= LIST_BUDGET_PX) return tier;
  }
  return CARD_TIERS[CARD_TIERS.length - 1]!;
}

/**
 * Passt diese Stufe noch ohne Scrollen? Nur für Tests und zum Nachmessen — die
 * Oberfläche fragt nicht danach, sie scrollt einfach.
 */
export function fitsWithoutScrolling(tier: CardTier, rows: number, sections: number): boolean {
  return needPx(tier.pitch, rows, sections) <= LIST_BUDGET_PX;
}
