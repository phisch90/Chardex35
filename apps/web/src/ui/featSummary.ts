import { fmtMod } from "./bits.js";
import { describeModifier } from "./modifierTargets.js";
import type { Entity } from "@codex35/core";

/**
 * Die EINE Zeile unter dem Talentnamen — und die Marken mit dem Bonus.
 *
 * Der Anlass, wörtlich: „Grundsätzlich sollte einfach bei der Wahl der Talente klar
 * sein was der Effekt und Bonus sind."
 *
 * In der Liste stand bisher der vollständige `FeatText`. Bei den 175 Talenten mit
 * deutscher Kurzfassung war das ein Satz, bei den anderen 152 der ganze englische
 * Regelabsatz — und damit war die Liste eine Textwand, in der die eine Zeile, auf
 * die es ankommt, unterging. Gefragt und entschieden: „Ein Satz, Rest beim
 * Antippen."
 *
 * Der vollständige Text ist nicht weg, er ist einen Tap entfernt (`FeatText`).
 */

/** Ein Satz. Deutsch, wenn es einen gibt, sonst der erste Satz des Originals. */
export function featOneLiner(entity: Entity): { text: string; german: boolean } {
  if (entity.kind !== "feat") return { text: "", german: true };

  const german = entity.localized?.de?.summary;
  if (german !== undefined && german.trim() !== "") {
    return { text: german.trim(), german: true };
  }

  /*
    Aus dem englischen Regeltext den ersten Satz. Das `**Benefit:** `-Präfix steht
    in den SRD-Daten mit drin und wäre in einer Kurzzeile nur Lärm.

    Abgeschnitten wird am Satzende, nicht nach n Zeichen: „Sie erhalten +2 auf" ist
    schlimmer als ein Satz, der zwei Zeilen braucht. Die Regel dazu steht seit der
    ersten Runde in `FeatText` — „eine halbe Regel ist am Spieltisch schlimmer als
    keine" —, und deshalb liegt der ganze Text auch weiterhin einen Tap entfernt.
  */
  const raw = entity.data.benefit ?? entity.description ?? "";
  const plain = raw
    .replace(/\*\*[^*]+:\*\*\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain === "") return { text: "", german: false };

  // Satzende: Punkt, Frage- oder Ausrufezeichen gefolgt von Leerraum. Abkürzungen
  // wie „5-ft." kommen vor, deshalb muss ein Großbuchstabe folgen.
  const end = /[.!?](?=\s+[A-Z(])/.exec(plain);
  const first = end === null ? plain : plain.slice(0, end.index + 1);
  return { text: first, german: false };
}

/**
 * Die Boni, die die Engine wirklich rechnet — als kurze Marken.
 *
 * Das ist die zweite Hälfte seines Satzes („was der Effekt und Bonus sind"): der
 * Regeltext sagt, WAS passiert, diese Marken sagen, welche Zahl davon in seinem
 * Bogen ankommt. Ein Talent ohne Marken wirkt nicht auf Werte — Cleave gibt einen
 * zusätzlichen Angriff, keinen Bonus, und das soll man unterscheiden können.
 *
 * `describeModifier` ist derselbe Übersetzer, den der Modifikator-Editor benutzt.
 * Eine zweite Tabelle daneben würde auseinanderlaufen.
 */
export function featBonuses(
  entity: Entity,
  skillName?: (id: string) => string | undefined,
): string[] {
  if (entity.kind !== "feat") return [];
  const out: string[] = [];
  for (const effect of entity.effects) {
    // Reine Schalter („flag:weaponFinesse") sind keine Zahl, die man anzeigen kann —
    // ihre Wirkung steht im Text.
    if (effect.target.startsWith("flag:")) continue;
    /*
      Ein Effekt mit Formel statt Zahl (`value` darf laut Schema ein String sein)
      wird von der Engine bis Phase 3 ignoriert. Ihn hier als Bonus zu zeigen wäre
      eine Zahl, die im Bogen nicht ankommt — genau das, was diese Marken vermeiden
      sollen.
    */
    if (typeof effect.value !== "number") continue;

    /*
      Zwei Beschriftungen aus dem Gegenstands-Zusammenhang taugen am Talent nicht.

      `describeModifier` nennt `attack.self` „Nur dieser Gegenstand: Angriff" — richtig
      im Editor eines Schwertes, an Weapon Specialization aber Kauderwelsch. Und wo
      Ziel und Bonusart nicht als Paar in der Tabelle stehen, hängt sie die Art an:
      aus „+2 Schaden" wurde „+2 Nur dieser Gegenstand: Schaden (untyped)". „Untyped"
      ist der Standardfall und sagt einem Leser nichts.
    */
    const label =
      effect.scope === "chosenItem" && SELF_LABEL[effect.target] !== undefined
        ? SELF_LABEL[effect.target]!
        : describeModifier(effect.target, effect.bonusType, skillName).replace(/ \(untyped\)$/, "");
    const scoped = effect.scope === "chosenItem" ? " (gewählte Waffe)" : "";
    out.push(`${fmtMod(effect.value)} ${label}${scoped}`);
  }
  return out;
}

/** Kurzform für die zwei Ziele, die nur mit einem gewählten Gegenstand wirken. */
const SELF_LABEL: Record<string, string> = {
  "attack.self": "Angriff",
  "damage.self": "Schaden",
};
