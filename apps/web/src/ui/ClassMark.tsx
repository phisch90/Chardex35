import type { Character } from "@codex35/core";
import { Icon, type IconName } from "./icons.js";
import { accentKeyOf } from "./classAccents.js";

/**
 * Das KLASSENSYMBOL als Wasserzeichen.
 *
 * Sein Auftrag: „evtl. ein passendes Symbol welches wie ein Wasserzeichen an manchen
 * Stellen vorkommt." Und der Satz davor gibt die Richtung: „die Farben sind alle zu blass
 * und dezent. Dann mach doch lieber was farbigeres."
 *
 * Deshalb ist es KEIN graues Wasserzeichen, sondern eines in der Klassenfarbe
 * (`text-amber-500`, also die Bedienfarbe des Themas) — beim Druiden ein grünes Blatt,
 * beim Barbaren ein rostroter Schädel.
 *
 * Warum als echtes Element und nicht als `background-image`: ein Bild in einer
 * Data-URI kann `currentColor` nicht lesen, die Farbe müsste also elfmal fest
 * hineingeschrieben werden — und wäre bei einem neuen Papier sofort falsch.
 *
 * `aria-hidden` steckt schon im `Icon`: ein Wasserzeichen ist Schmuck und hat nichts
 * vorzulesen.
 */
export function ClassMark(props: {
  character: Character;
  /** Kantenlänge in px. */
  size: number;
  /** Zusätzliche Lage/Deckkraft — die Stelle entscheidet, nicht dieses Bauteil. */
  className?: string;
  /**
   * Was statt des Klassensymbols kommt, wenn die App die Klasse nicht kennt.
   *
   * Ohne Angabe: NICHTS. Das ist der richtige Standard fürs Wasserzeichen — ein falsches
   * Zeichen wäre schlimmer als keines. Wo aber ein Platz gefüllt werden muss (der
   * Porträt-Platzhalter auf der Startseite), gehört ein neutrales Zeichen hin, sonst
   * klafft ein leeres Kästchen.
   */
  fallback?: IconName;
  /** Strichbreite. Standard 1,1 — dünner als die Reiter-Zeichen, weil groß gezeigt. */
  strokeWidth?: number;
}) {
  const key = accentKeyOf(props.character);
  const name = key ?? props.fallback;
  if (name === undefined) return null;
  return (
    <span aria-hidden="true" className={props.className}>
      <Icon name={name} size={props.size} strokeWidth={props.strokeWidth ?? 1.1} />
    </span>
  );
}
