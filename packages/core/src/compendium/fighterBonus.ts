/**
 * Die Bonustalent-Liste des Kämpfers — eine Handtabelle.
 *
 * Sie stand seit der War-Domänen-Runde als offener Punkt in `CLAUDE.md`: „Die
 * Kämpfer-Bonusliste steht nicht in den Packdaten, die App kann also nicht prüfen, ob
 * ein Kämpfer-Bonustalent zulässig ist (Extra Turning wäre es nicht)."
 *
 * Der Anlass, sie jetzt zu bauen, ist genau dieser Fall an seinem Bogen: der Knopf
 * „Herkunft zuordnen" legte Extra Turning auf einen Platz, den es nach den Regeln nicht
 * haben darf — und die App konnte es nicht wissen.
 *
 * **Warum eine Handtabelle und keine Ableitung:** die Packdaten sagen über die Liste
 * nichts. Es gibt kein Feld am Talent und keines an der Klasse; im SRD steht sie als
 * Fließtext unter dem Kämpfer. Dieselbe Entscheidung wie beim Talentfilter
 * (`featBonus.ts`) — und dieselbe Pflicht: **eine Handtabelle, die man nicht ansehen
 * kann, ist eine Meinung.** Deshalb steht sie hier als Liste mit Namen und wird in der
 * Oberfläche als Grund genannt, nicht bloß als Sperre.
 *
 * **Und deshalb wird GEWARNT, nicht gesperrt.** Diese Liste ist von Hand abgeschrieben;
 * ein vergessener Eintrag würde sonst ein Talent verbieten, das erlaubt ist. Der DM hat
 * Recht, nicht die App — dieselbe Regel wie überall in diesem Projekt. Wer hier etwas
 * vermisst, trägt es nach; die Warnung verschwindet dann von allein.
 *
 * Talente aus seinen eigenen Büchern stehen naturgemäß nicht darauf. Auch die bekommen
 * deshalb keine Sperre, sondern einen Satz — siehe `fighterBonusVerdict`.
 */

/**
 * Die Kennungen OHNE `srd:feat:`-Vorsatz — wie in `proficiency.ts`, und aus demselben
 * Grund: die Tabelle ist von Hand geschrieben, und ein Vorsatz an 44 Zeilen ist 44-mal
 * dieselbe Gelegenheit für einen Tippfehler. Abgestreift wird an EINER Stelle.
 */
const FIGHTER_BONUS = new Set([
  "blind-fight",
  "cleave",
  "combat-expertise",
  "combat-reflexes",
  "deflect-arrows",
  "dodge",
  "exotic-weapon-proficiency",
  "far-shot",
  "great-cleave",
  "greater-two-weapon-fighting",
  "greater-weapon-focus",
  "greater-weapon-specialization",
  "improved-bull-rush",
  "improved-critical",
  "improved-disarm",
  "improved-feint",
  "improved-grapple",
  "improved-initiative",
  "improved-overrun",
  "improved-precise-shot",
  "improved-shield-bash",
  "improved-sunder",
  "improved-trip",
  "improved-two-weapon-fighting",
  "improved-unarmed-strike",
  "manyshot",
  "mobility",
  "mounted-archery",
  "mounted-combat",
  "point-blank-shot",
  "power-attack",
  "precise-shot",
  "quick-draw",
  "rapid-reload",
  "rapid-shot",
  "ride-by-attack",
  "shot-on-the-run",
  "snatch-arrows",
  "spirited-charge",
  "spring-attack",
  "stunning-fist",
  "trample",
  "two-weapon-defense",
  "two-weapon-fighting",
  "weapon-finesse",
  "weapon-focus",
  "weapon-specialization",
  "whirlwind-attack",
]);

/** Dieselbe Ableitung wie in `proficiency.ts` — wer ablegt und wer vergleicht, nimmt sie. */
function featKey(featId: string): string {
  return featId.replace(/^srd:feat:/, "");
}

/**
 * Wie viele Talente die Liste führt. Steht hier statt als Zahl im Test: eine Schranke,
 * die ihre eigene Quelle liest, prüft nichts.
 */
export const FIGHTER_BONUS_COUNT = FIGHTER_BONUS.size;

export type FighterBonusVerdict =
  /** Steht auf der Liste — als Kämpfer-Bonustalent zulässig. */
  | { kind: "ok" }
  /** Steht nicht darauf, ist aber SRD: dann ist es wirklich keines. */
  | { kind: "no" }
  /**
   * Kein SRD-Talent (eigenes oder aus einem seiner Bücher). Die Liste kann darüber
   * nichts sagen — und Schweigen wäre hier falsch: ein „nein" für ein Talent aus
   * seinem Buch wäre eine erfundene Regel.
   */
  | { kind: "unknown" };

/**
 * Darf dieses Talent auf einem Bonusplatz des Kämpfers sitzen?
 *
 * Geprüft wird die KENNUNG und nicht der Name: „Weapon Focus (Zweihänder)" und
 * „Weapon Focus (Kurzschwert)" sind dasselbe Talent mit verschiedener Wahl, und ein
 * Namensvergleich ginge daran vorbei — dieselbe Falle wie bei den Behältern.
 */
export function fighterBonusVerdict(featId: string): FighterBonusVerdict {
  if (!featId.startsWith("srd:feat:")) return { kind: "unknown" };
  return FIGHTER_BONUS.has(featKey(featId)) ? { kind: "ok" } : { kind: "no" };
}
