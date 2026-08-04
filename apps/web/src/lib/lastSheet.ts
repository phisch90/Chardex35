/**
 * Welcher Bogen zuletzt offen war.
 *
 * Sein Auftrag: „Ich möchte aus den Einstellungen direkt zurück in den Charakter gehen
 * können." Der Weg dorthin ist der Grund, warum es das braucht: Papier umstellen heißt
 * Bogen → Einstellungen → Papier wählen → zurück in den Bogen, und der letzte Schritt
 * ging bisher nur über die Startseite und einen zweiten Tap auf die Karte.
 *
 * Warum nicht der `BackButton`? Der geht im VERLAUF zurück, und das ist hier nicht
 * dasselbe: wer in den Einstellungen zwei Papiere ausprobiert und dazwischen etwas
 * anderes antippt, landet irgendwo. Er will zurück in DEN CHARAKTER, nicht einen Schritt
 * zurück — deshalb steht der Name im Knopf, und der Knopf führt genau dorthin.
 *
 * Und warum `sessionStorage`: das gehört dem GERÄT und der Sitzung, nicht der Figur.
 * Dieselbe Trennung wie beim zugeklappten Zaubergrad und bei der Scroll-Höhe — dass er
 * auf dem iPhone gerade Hike offen hatte, ist keine Eigenschaft von Hike.
 */
const KEY = "codex35.lastSheet";

/** Merken, dass dieser Bogen offen ist. Fehler werden verschluckt: im privaten Modus
 *  kann `sessionStorage` gesperrt sein, und dann fehlt eben der Knopf. */
export function rememberSheet(charId: string): void {
  try {
    sessionStorage.setItem(KEY, charId);
  } catch {
    // Ohne Gedächtnis eben ohne Knopf — das ist kein Grund, die Seite zu zerlegen.
  }
}

/** Die Kennung des zuletzt offenen Bogens, oder `null`. */
export function lastSheetId(): string | null {
  try {
    const value = sessionStorage.getItem(KEY);
    return value === null || value === "" ? null : value;
  } catch {
    return null;
  }
}

/**
 * Vergessen — wenn ein Bogen gelöscht wurde.
 *
 * Ohne das würde der Knopf auf einen Charakter zeigen, den es nicht mehr gibt: die
 * Fehlerfamilie „etwas weiß es, und etwas anderes kann es nicht" in ihrer kleinsten
 * Form. Die Anzeige prüft zusätzlich, ob der Bogen wirklich noch da ist — beides,
 * weil ein Löschen auf dem ANDEREN Gerät hier gar nicht vorbeikommt.
 */
export function forgetSheet(charId: string): void {
  try {
    if (sessionStorage.getItem(KEY) === charId) sessionStorage.removeItem(KEY);
  } catch {
    // s.o.
  }
}
