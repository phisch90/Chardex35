import { Link } from "@tanstack/react-router";
import { lastSheetId } from "../lib/lastSheet.js";
import { useCharacter } from "../lib/hooks.js";

/**
 * „← Zurück zu Hike" — der direkte Weg zurück in den zuletzt offenen Bogen.
 *
 * Entstanden für die Einstellungen (sein Auftrag: „Ich möchte aus den Einstellungen
 * direkt zurück in den Charakter gehen können"), und jetzt geteilt, weil das
 * Kompendium denselben Weg braucht — sein Auftrag: „Ich möchte aus meinem Charakter
 * ins Kompendium UND zurück switchen können. Nicht nur ins Charakter Menü." Der
 * Hinweg steht in der Hauptnavigation; was fehlte, war der RÜCKWEG, der nicht über
 * die Charakterliste führt.
 *
 * Bewusst NICHT der `BackButton`: der geht einen Schritt im VERLAUF zurück, und wer
 * im Kompendium geblättert hat, landet damit auf der vorigen Kompendiumsseite. Er
 * will zurück in DEN Charakter — deshalb steht der Name im Knopf.
 *
 * Steht kein Bogen im Gedächtnis oder gibt es ihn nicht mehr, erscheint gar nichts:
 * ein Knopf, der auf einen gelöschten Charakter zeigt, wäre schlimmer als keiner.
 * (`doDelete` löscht den Eintrag mit, UND hier wird geprüft, ob der Bogen noch da
 * ist — beides, weil ein Löschen auf dem anderen Gerät am Eintrag vorbeikommt.)
 */
export function BackToSheet() {
  const charId = lastSheetId();
  // Der Hook muss laufen, auch wenn nichts gemerkt ist — ein Hook hinter einer
  // Bedingung ist kein Hook. `useCharacter` verträgt eine leere Kennung.
  const character = useCharacter(charId ?? "");
  if (charId === null || !character) return null;
  return (
    <Link
      to="/charaktere/$charId"
      params={{ charId }}
      className="-ml-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-amber-300 hover:bg-slate-800"
    >
      <span aria-hidden="true">←</span>
      Zurück zu {character.name}
    </Link>
  );
}
