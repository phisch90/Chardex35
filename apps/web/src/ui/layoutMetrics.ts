import { useEffect, useState } from "react";

/**
 * Die Maße der Hülle — an EINER Stelle.
 *
 * Sein Befund zum iPad: „Die Leiste links ist auf dem iPad zu groß. Und dafür ist sie
 * auch zu unwichtig." Sie war 208 px breit (`w-52`) und trug vier Links, die man im
 * Bogen praktisch nie braucht — auf 1180 px also rund ein Sechstel der Fläche.
 *
 * Beim Schmalermachen kam das eigentliche Problem heraus: **die Breite stand viermal
 * im Quelltext.** Einmal an der Leiste selbst und dreimal als `md:left-52` an allem,
 * was fest daneben sitzt (die rote Bearbeiten-Leiste, die Löschen-Leiste). Wer die
 * Leiste schmaler macht und eine davon vergisst, bekommt ein Band, das 144 px neben
 * dem Rand schwebt — das ist die fünfte Falle dieses Projekts, wörtlich, und sie ist
 * hier schon zweimal bezahlt worden.
 *
 * Deshalb stehen die Klassen hier und nirgends sonst. Die Schranke dazu steht in
 * `layoutMetrics.test.ts`: sie liest die Quelltexte und verbietet die Zahlen im Rest
 * der App.
 */

/** Die Symbolleiste ab `md`. Nur noch Zeichen, 4 rem statt 13. */
export const LEISTE_BREITE = "md:w-16";

/**
 * Der Versatz für alles, was fest am Bildschirmrand klebt und die Leiste nicht
 * überdecken darf. Muss zu `LEISTE_BREITE` passen — dafür sind beide hier.
 */
export const LEISTE_VERSATZ = "md:left-16";

/**
 * Die Breite des Blatts. Bis `lg` wie immer (768 px, eine gut lesbare Zeile), ab `lg`
 * die volle Fläche — seine Entscheidung zum iPad: „Volle Breite evtl. dafür dann auch
 * zwei Ansichten nebeneinander? Im Querformat."
 *
 * Genau deshalb ist die Grenze `lg` (1024 px) und nicht `md`: sein iPad ist quer
 * 1180 px breit (zwei Ansichten passen) und hoch 820 px (sie passen nicht). Eine
 * Abfrage auf die AUSRICHTUNG wäre die schlechtere Bedingung — entscheidend ist, wie
 * viel Platz wirklich da ist, und ein geteiltes Fenster auf dem iPad hat die
 * Ausrichtung des Geräts, aber nicht dessen Breite.
 */
export const BLATT_BREITE = "mx-auto w-full max-w-3xl lg:max-w-6xl";

/** Ab hier passen zwei Ansichten nebeneinander — dieselbe Grenze wie `lg` in `BLATT_BREITE`. */
export const ZWEISPALTIG_AB = 1024;

/**
 * Ist wirklich Platz für zwei Ansichten?
 *
 * GEMESSEN und nicht bloß gespeichert: wer im Querformat zwei Ansichten aufschlägt und
 * dann das iPad dreht, hat die Einstellung noch — den Platz nicht. Ohne diese Frage
 * bliebe im Hochformat das Wischen zwischen den Reitern abgeschaltet, obwohl nur eine
 * Ansicht dasteht, und niemand fände den Grund.
 */
export function useBreiterSchirm(): boolean {
  const [breit, setBreit] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= ZWEISPALTIG_AB,
  );
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${ZWEISPALTIG_AB}px)`);
    const lesen = () => setBreit(mql.matches);
    lesen();
    mql.addEventListener("change", lesen);
    return () => mql.removeEventListener("change", lesen);
  }, []);
  return breit;
}
