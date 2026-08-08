import type { BonusType, StatPath } from "@codex35/core";

/**
 * Die Auswahlliste für einen eigenen Modifikator — nachgebaut nach dem Rad, das
 * Fight Club unter „Modifiers" zeigt.
 *
 * Zwei Entscheidungen stecken hier drin:
 *
 * 1. EINE Liste statt zwei Feldern. Fight Club mischt Ziel und Bonusart in einen
 *    Eintrag: „AC" steht neben „Dodge Bonus", „Natural Armor" und „Deflection
 *    Modifier". Das ist klüger als es aussieht — die Bonusart entscheidet in 3.5
 *    darüber, ob ein Bonus überhaupt in die Summe geht (nur der höchste je Art,
 *    außer Ausweichen). Wer sie separat wählen muss, wählt sie irgendwann falsch,
 *    und dann fehlt ein Bonus, ohne dass etwas darauf hinweist.
 *
 * 2. Kein Eintrag, den die Engine nicht rechnen kann. Fight Club hat „Flat-Footed
 *    AC", „Touch AC" und „Armor Penalty" als eigene Ziele; hier entstehen diese
 *    Werte aus der Rechnung (Touch = ohne Rüstung/Schild, auf dem falschen Fuß =
 *    ohne Ausweichen). Ein Eintrag dafür wäre ein Knopf, der nichts tut. Ebenso
 *    fehlen „Combat Maneuver Bonus/Defense" — das ist Pathfinder, nicht 3.5.
 */
export interface ModifierTarget {
  key: string;
  label: string;
  path: StatPath;
  bonusType: BonusType;
  group: string;
}

const G = {
  attack: "Angriff & Schaden",
  ac: "Rüstungsklasse",
  saves: "Rettungswürfe",
  other: "Sonstiges",
  ability: "Attribute",
  skill: "Fertigkeiten",
} as const;

export const MODIFIER_TARGETS: ModifierTarget[] = [
  // --- Angriff & Schaden ---------------------------------------------------
  { key: "attack.all", label: "Angriff (alle)", path: "attack.all", bonusType: "untyped", group: G.attack },
  { key: "attack.melee", label: "Angriff Nahkampf", path: "attack.melee", bonusType: "untyped", group: G.attack },
  { key: "attack.ranged", label: "Angriff Fernkampf", path: "attack.ranged", bonusType: "untyped", group: G.attack },
  { key: "damage.all", label: "Schaden (alle)", path: "damage.all", bonusType: "untyped", group: G.attack },
  { key: "damage.melee", label: "Schaden Nahkampf", path: "damage.melee", bonusType: "untyped", group: G.attack },
  { key: "damage.ranged", label: "Schaden Fernkampf", path: "damage.ranged", bonusType: "untyped", group: G.attack },
  /*
    Die zwei wichtigsten Einträge für einen GEGENSTAND — und die einzigen, die es
    nur dort gibt. Ohne sie trägt man das „+1" eines Langschwerts als
    „Angriff (alle)" ein, und dann wird JEDE Waffe des Charakters besser. Das
    fällt nicht auf, weil die Zahl plausibel aussieht.
  */
  { key: "attack.self", label: "Nur dieser Gegenstand: Angriff", path: "attack.self", bonusType: "enhancement", group: G.attack },
  { key: "damage.self", label: "Nur dieser Gegenstand: Schaden", path: "damage.self", bonusType: "enhancement", group: G.attack },

  // --- RK: die Bonusart steckt im Eintrag ----------------------------------
  { key: "ac.untyped", label: "RK (ohne Art)", path: "ac", bonusType: "untyped", group: G.ac },
  { key: "ac.dodge", label: "RK: Ausweichen", path: "ac", bonusType: "dodge", group: G.ac },
  { key: "ac.natural", label: "RK: natürliche Rüstung", path: "ac", bonusType: "natural", group: G.ac },
  { key: "ac.deflection", label: "RK: Ablenkung", path: "ac", bonusType: "deflection", group: G.ac },
  { key: "ac.armor", label: "RK: Rüstung", path: "ac", bonusType: "armor", group: G.ac },
  { key: "ac.shield", label: "RK: Schild", path: "ac", bonusType: "shield", group: G.ac },

  // --- Rettungswürfe -------------------------------------------------------
  { key: "save.all", label: "Alle Rettungswürfe", path: "save.all", bonusType: "untyped", group: G.saves },
  { key: "save.fort", label: "Zähigkeit (Fort)", path: "save.fort", bonusType: "untyped", group: G.saves },
  { key: "save.ref", label: "Reflex", path: "save.ref", bonusType: "untyped", group: G.saves },
  { key: "save.will", label: "Willen", path: "save.will", bonusType: "untyped", group: G.saves },

  // --- Sonstiges -----------------------------------------------------------
  { key: "init", label: "Initiative", path: "init", bonusType: "untyped", group: G.other },
  { key: "hp.max", label: "Max. Trefferpunkte", path: "hp.max", bonusType: "untyped", group: G.other },
  { key: "speed.land", label: "Bewegung", path: "speed.land", bonusType: "untyped", group: G.other },
  { key: "grapple", label: "Grapple", path: "grapple", bonusType: "untyped", group: G.other },
  { key: "dc.spells", label: "Zauber-SG", path: "dc.spells", bonusType: "untyped", group: G.other },
  { key: "cl", label: "Zauberstufe", path: "cl", bonusType: "untyped", group: G.other },
  { key: "feats.slots", label: "Talent-Plätze", path: "feats.slots", bonusType: "untyped", group: G.other },
  {
    key: "skills.pointsPerLevel",
    label: "Fertigkeitspunkte je Stufe",
    path: "skills.pointsPerLevel",
    bonusType: "untyped",
    group: G.other,
  },

  // --- Attribute -----------------------------------------------------------
  { key: "ability.str", label: "STR", path: "ability.str", bonusType: "untyped", group: G.ability },
  { key: "ability.dex", label: "DEX", path: "ability.dex", bonusType: "untyped", group: G.ability },
  { key: "ability.con", label: "CON", path: "ability.con", bonusType: "untyped", group: G.ability },
  { key: "ability.int", label: "INT", path: "ability.int", bonusType: "untyped", group: G.ability },
  { key: "ability.wis", label: "WIS", path: "ability.wis", bonusType: "untyped", group: G.ability },
  { key: "ability.cha", label: "CHA", path: "ability.cha", bonusType: "untyped", group: G.ability },

  // --- Fertigkeiten --------------------------------------------------------
  { key: "skill.all", label: "Alle Fertigkeiten", path: "skill.all", bonusType: "untyped", group: G.skill },
];

/** Der Sonderfall: EINE Fertigkeit. Das Ziel entsteht erst mit der Auswahl. */
export const SINGLE_SKILL_KEY = "skill.one";

export const MODIFIER_GROUPS = [...new Set(MODIFIER_TARGETS.map((t) => t.group))];

/** Ziel + Bonusart → Anzeigename. Für die Zeilen, die schon existieren. */
export function describeModifier(
  target: string,
  bonusType: string,
  skillName?: (id: string) => string | undefined,
): string {
  if (target.startsWith("skill:")) {
    /*
      NUR das Präfix abschneiden, nicht am Doppelpunkt trennen: die Skill-ID
      enthält selbst Doppelpunkte („skill:srd:skill:listen"). Ein split(":")
      lieferte „srd", und am Bogen stand bei Alertness „srd +2 · srd +2".
    */
    const rest = target.slice("skill:".length);
    const [id = "", subtype] = rest.split("#");
    const name = skillName?.(id) ?? id;
    return subtype === undefined ? name : `${name} (${subtype})`;
  }
  const hit = MODIFIER_TARGETS.find((t) => t.path === target && t.bonusType === bonusType);
  if (hit) return hit.label;
  // Unbekannte Kombination (z.B. aus einem Import): ehrlich den Pfad zeigen,
  // statt eine Beschriftung zu erfinden, die nicht stimmt.
  const byPath = MODIFIER_TARGETS.find((t) => t.path === target);
  return byPath ? `${byPath.label} (${bonusType})` : `${target} (${bonusType})`;
}
