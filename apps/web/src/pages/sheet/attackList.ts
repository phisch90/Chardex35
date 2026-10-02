import type { AttackLine } from "@codex35/core";

/**
 * Welche Angriffszeilen zeigt der Kampf-Reiter — und welche sind Grundwerte?
 *
 * Die Engine baut zwei SAMMELZEILEN, die keine Waffe sind: `Nahkampf` und
 * `Fernkampf` (`derive.ts`, die zwei `buildAttackLine`-Aufrufe mit `weapon = null`).
 * Sie sind die Zahl, mit der man eine Waffe schlaegt, die man gerade aufhebt — also
 * ein Nachschlagewert und keine Handlung.
 *
 * Sein Befund, woertlich: "Aber wenn es ein Schwert ist brauchen wir doch kein
 * fernkampfschaden." Er hatte recht, und zwar doppelt: bei Langschwert + Schild stand
 * ganz oben in der Liste "Fernkampf +7/+2" fuer eine Waffe, die er nicht traegt — und
 * direkt darueber "Nahkampf +9/+4", also dieselbe Zahl wie die Langschwert-Zeile
 * darunter. Seit die zwei Zahlen je Zeile GROSS stehen, kostete das zwei grosse Kaesten
 * fuer null Auskunft, in genau der Runde, die den Reiter kuerzer machen sollte.
 *
 * Verloren geht dabei nichts: beide Werte stehen auf der Werte-Seite als Kacheln
 * (BAB · NAHKAMPF · FERNKAMPF, `GlanceCard`) — sein eigener Auftrag war dort "komplett
 * alle Werte". Entdoppelt wird also die Anzeige, nicht die Auskunft.
 *
 * WARUM das hier steht und nicht im Reiter: `CharacterOverview` schreibt dieselbe
 * Bedingung seit der Uebersichts-Runde inline aus (`a.key !== "melee" && a.key !==
 * "ranged"`). Zwei Kopien einer Regel sind zwei Wahrheiten — es haette gereicht, beim
 * naechsten Umbau eine davon zu vergessen, und die zwei Ansichten listeten verschiedene
 * Angriffe.
 *
 * Erkannt wird am SCHLUESSEL und nicht am Platz. `slot` waere heute gleichwertig (das
 * Schema setzt `.default("none")`, eine Waffe traegt also immer einen), aber der
 * Schluessel kommt aus der Engine und kann gar nicht fehlen — und genau diese Sorte
 * "geht heute auch" hat dieses Projekt schon einmal `equipped` statt `slot` gekostet.
 */
const GRUNDWERT_KEYS: ReadonlySet<string> = new Set(["melee", "ranged"]);

/** Eine Sammelzeile (Nahkampf/Fernkampf) — keine Waffe. */
export const isBaseAttackLine = (line: AttackLine): boolean => GRUNDWERT_KEYS.has(line.key);

/** Nur die Zeilen, hinter denen wirklich ein Gegenstand steht. */
export const weaponAttackLines = (attacks: readonly AttackLine[]): AttackLine[] =>
  attacks.filter((line) => !isBaseAttackLine(line));

/**
 * Die Liste, die der Kampf-Reiter zeigt: angelegte Waffen zuerst, verstaute zuletzt.
 *
 * Der RUECKFALL ist der Teil, der ohne Test still kaputtgeht: wer gar keine Waffe
 * dabei hat (eine frische Figur vor der Ausruestung), saehe sonst eine leere Karte.
 * Dann sind die zwei Grundwerte das Einzige, was es zu sagen gibt — und sie stehen
 * wieder da, samt ihrem Wuerfelknopf.
 *
 * `toSorted` und nicht `sort`: `sheet.attacks` gehoert der Engine, und eine Anzeige,
 * die die Liste ihrer Quelle umdreht, ist die Sorte Nebenwirkung, die man erst drei
 * Ansichten spaeter bemerkt.
 */
export function combatAttackList(attacks: readonly AttackLine[]): AttackLine[] {
  const waffen = weaponAttackLines(attacks);
  if (waffen.length === 0) return attacks.filter(isBaseAttackLine);
  const rang = (line: AttackLine) => (line.slot === "none" ? 1 : 0);
  return waffen.toSorted((a, b) => rang(a) - rang(b));
}
