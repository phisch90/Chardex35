import type { Ability } from "../schema/common.js";
import { displayName, type Entity } from "../schema/entities.js";

/**
 * Was für diese Volk-Klasse-Kombination zählt.
 *
 * Der Anlass, wörtlich: „eine Empfehlung für diese Kombination, welche Attribute wichtig
 * sind, idealerweise mit einem guten Mindestwert" — und für Fertigkeiten dasselbe, „auch
 * beim Stufenaufstieg". Vorher standen im Assistenten sechs nackte Eingabefelder und
 * darunter alle 36 Fertigkeiten gleichwertig untereinander.
 *
 * **Nichts davon wird gespeichert.** Eine Empfehlung ist eine FOLGE aus Volk und Klasse,
 * also wird sie gerechnet, sobald man sie braucht. Sie an den Charakter zu schreiben wäre
 * die Fehlerfamilie dieses Projekts (ein abgeleiteter Wert, der gespeichert wurde) — und
 * spätestens beim Klassenwechsel stünde die alte Empfehlung noch da.
 *
 * **Zwei Hälften, und die gerechnete trägt den Boden.** Die Handarbeit unten kennt nur die
 * elf Spielerklassen des SRD. Für jede Prestigeklasse, jede NSC-Klasse und alles, was er
 * sich selbst baut, gibt es keinen Eintrag — dort muss trotzdem etwas Sinnvolles
 * herauskommen, also wird zuerst aus den Daten gerechnet (`hitDie`,
 * `skillPointsPerLevel`, `spellcasting.ability`, der BAB-Verlauf) und die Handarbeit
 * ORDNET das anschließend. Sie ersetzt es nicht.
 *
 * **Jeder Mindestwert nennt seinen Grund.** „WIS ab 14" ohne Begründung ist eine
 * Behauptung; „ab 14 gibt es Bonus-Zauberplätze" kann man nachschlagen. Wo der Grund eine
 * echte Talent-Voraussetzung ist (STR 13 für Power Attack, DEX 13 für Dodge, INT 13 für
 * Combat Expertise), steht das Talent im Text — dieselbe Zahl prüft `prereqs.ts` in der
 * Talentwahl.
 *
 * Empfohlen wird, nie gesperrt. Der DM hat Recht, nicht die App.
 */

/** Englische Regelkürzel wie in seinen Büchern — nicht „GE". Gleiche Regel wie prereqs.ts. */
const ABILITY_LABEL: Record<Ability, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

export interface AbilityAdvice {
  ability: Ability;
  /** Warum dieses Attribut zählt — ein Halbsatz, deutsch. */
  why: string;
  /** Ab hier ist es gut. Fehlt, wenn sich keine Zahl begründen lässt. */
  min?: number;
  /** Warum diese Zahl — „ab 14 gibt es Bonus-Zauberplätze". */
  minWhy?: string;
}

export interface SkillAdvice {
  skillId: string;
  why: string;
  /** Bei Sammel-Fertigkeiten („Knowledge") das gemeinte Teilgebiet. */
  subtypeHint?: string;
}

export interface Advice {
  /** Wichtigstes zuerst. Enthält NUR Attribute, die wirklich zählen. */
  abilities: AbilityAdvice[];
  skills: SkillAdvice[];
  /** Was das Volk zu dieser Klasse beiträgt — oder ihr wegnimmt. */
  raceNote?: string;
}

/** Trägt dieses Attribut laut Empfehlung Gewicht? */
export function isKeyAbility(advice: Advice, ability: Ability): boolean {
  return advice.abilities.some((a) => a.ability === ability);
}

export function abilityAdviceFor(advice: Advice, ability: Ability): AbilityAdvice | undefined {
  return advice.abilities.find((a) => a.ability === ability);
}

/* ------------------------------------------------------------------------- *
 * Hälfte 1: aus den Klassendaten gerechnet
 * ------------------------------------------------------------------------- */

/**
 * Steigt der Grundangriffsbonus auf jeder Stufe? Der SRD kennt drei Verläufe: voll
 * (Kämpfer, BAB = Stufe), mittel (drei Viertel) und langsam (die Hälfte). Gerechnet
 * statt aus `template` gelesen, weil `template` optional ist und Homebrew es nicht
 * setzen muss — die Tabelle selbst ist immer da.
 */
function babShare(klass: Entity): number {
  if (klass.kind !== "class") return 0;
  const rows = klass.data.levels;
  const last = rows[rows.length - 1];
  if (last === undefined || rows.length === 0) return 0;
  return last.bab / rows.length;
}

function computedAbilities(klass: Entity): AbilityAdvice[] {
  if (klass.kind !== "class") return [];
  const out: AbilityAdvice[] = [];
  const data = klass.data;

  const casting = data.spellcasting;
  if (casting !== undefined) {
    out.push({
      ability: casting.ability,
      why: "Zauber und ihr Schwierigkeitsgrad",
      min: 14,
      minWhy: "ab 14 gibt es Bonus-Zauberplätze",
    });
  }

  const share = babShare(klass);
  if (share >= 0.95) {
    out.push({
      ability: "str",
      why: "voller Angriffsbonus",
      min: 13,
      minWhy: "STR 13 öffnet Power Attack",
    });
  } else if (share >= 0.7) {
    out.push({ ability: "str", why: "Angriff im Nahkampf" });
  }

  // Trefferpunkte hat jede Klasse — der Würfel sagt, wie sehr es darauf ankommt.
  out.push({
    ability: "con",
    why: `Trefferpunkte (W${data.hitDie})`,
    ...(data.hitDie >= 8 ? { min: 12, minWhy: "ab 12 bringt jede Stufe einen HP mehr" } : {}),
  });

  if (data.skillPointsPerLevel >= 6) {
    out.push({ ability: "int", why: "mehr Fertigkeitspunkte je Stufe" });
  }

  return out;
}

/* ------------------------------------------------------------------------- *
 * Hälfte 2: Handarbeit für die elf Spielerklassen
 * ------------------------------------------------------------------------- */

/**
 * Reihenfolge UND Begründung in EINER Liste — das ist der Punkt.
 *
 * Zuerst standen hier `order: Ability[]` und ein getrenntes, optionales `why`. Wer ein
 * Attribut aufführte, ohne es zu begründen, verlor es stumm: die Zusammenführung ließ es
 * weg, samt Mindestwert. Beim Kämpfer fiel so DEX 13 (Dodge) heraus, ohne eine Spur — die
 * angesagte Menge war nicht die geschriebene (vierte Anzeige-Falle in `CLAUDE.md`).
 *
 * Jetzt verbietet der Typ es: kein Eintrag ohne `why`. Eine Regel, die der Compiler
 * durchsetzt, braucht keinen Test, der sie hinterherprüft.
 */
interface HandWritten {
  /** Wichtigstes zuerst. Was hier steht, gewinnt gegen die Rechnung. */
  abilities: { ability: Ability; why: string; min?: { value: number; why: string } }[];
  /** Die drei bis fünf Fertigkeiten, die die Klasse ausmachen. */
  skills: SkillAdvice[];
}

/**
 * Nach Kennung, nicht nach Namen: `srd:class:cleric`. Ein Name ist übersetzbar und
 * kommt in Homebrew doppelt vor, die Kennung nicht.
 */
const BY_CLASS: Record<string, HandWritten> = {
  "srd:class:barbarian": {
    abilities: [
      {
        ability: "str",
        why: "Schaden im Nahkampf, darauf ist alles gebaut",
        min: { value: 15, why: "der Barbar lebt vom Zuschlagen" },
      },
      { ability: "con", why: "Trefferpunkte (W12) und seine Wut" },
      { ability: "dex", why: "Rüstungsklasse — er trägt keine schwere Rüstung" },
    ],
    skills: [
      { skillId: "srd:skill:survival", why: "die Wildnis, seine Heimat" },
      { skillId: "srd:skill:listen", why: "gute Sinne halten ihn am Leben" },
      { skillId: "srd:skill:climb", why: "Bewegung ohne Umwege" },
      { skillId: "srd:skill:jump", why: "Bewegung ohne Umwege" },
    ],
  },
  "srd:class:bard": {
    abilities: [
      {
        ability: "cha",
        why: "Zauber, Auftritte und alles Gesellschaftliche",
        min: { value: 14, why: "ab 14 gibt es Bonus-Zauberplätze" },
      },
      { ability: "dex", why: "Rüstungsklasse und Bogen" },
      { ability: "int", why: "sechs Fertigkeitspunkte je Stufe wollen INT" },
      { ability: "con", why: "Trefferpunkte (W6)" },
    ],
    skills: [
      { skillId: "srd:skill:perform", why: "seine Musik — ohne sie kein Bardenlied" },
      { skillId: "srd:skill:diplomacy", why: "das Gespräch ist seine Waffe" },
      { skillId: "srd:skill:bluff", why: "das Gespräch ist seine Waffe" },
      { skillId: "srd:skill:knowledge", why: "Bardenwissen deckt alles ab", subtypeHint: "history" },
      { skillId: "srd:skill:concentration", why: "Zaubern, während man getroffen wird" },
    ],
  },
  "srd:class:cleric": {
    abilities: [
      {
        ability: "wis",
        why: "Zauber, ihre Zahl und ihr Schwierigkeitsgrad",
        min: { value: 14, why: "ab 14 gibt es Bonus-Zauberplätze" },
      },
      { ability: "con", why: "Trefferpunkte (W8)", min: { value: 12, why: "ab 12 bringt jede Stufe einen HP mehr" } },
      { ability: "str", why: "er kämpft mit, in schwerer Rüstung" },
      {
        ability: "cha",
        why: "Untote vertreiben (Turn Undead)",
        min: { value: 12, why: "Turn Undead rechnet mit CHA" },
      },
    ],
    skills: [
      { skillId: "srd:skill:concentration", why: "Zaubern, während man getroffen wird" },
      { skillId: "srd:skill:spellcraft", why: "Zauber erkennen" },
      { skillId: "srd:skill:knowledge", why: "sein Glaube und die Untoten", subtypeHint: "religion" },
      { skillId: "srd:skill:heal", why: "auch ohne Zauber helfen" },
    ],
  },
  "srd:class:druid": {
    abilities: [
      {
        ability: "wis",
        why: "Zauber, ihre Zahl und ihr Schwierigkeitsgrad",
        min: { value: 14, why: "ab 14 gibt es Bonus-Zauberplätze" },
      },
      { ability: "con", why: "Trefferpunkte (W8)", min: { value: 12, why: "ab 12 bringt jede Stufe einen HP mehr" } },
      { ability: "dex", why: "Rüstungsklasse in leichter Rüstung" },
    ],
    skills: [
      { skillId: "srd:skill:concentration", why: "Zaubern, während man getroffen wird" },
      { skillId: "srd:skill:survival", why: "die Wildnis ist sein Zuhause" },
      { skillId: "srd:skill:knowledge", why: "Wissen über die Natur", subtypeHint: "nature" },
      { skillId: "srd:skill:handle-animal", why: "sein Tiergefährte" },
    ],
  },
  "srd:class:fighter": {
    abilities: [
      { ability: "str", why: "Angriff und Schaden", min: { value: 15, why: "der Kämpfer lebt vom Treffen" } },
      { ability: "con", why: "Trefferpunkte (W10)", min: { value: 12, why: "ab 12 bringt jede Stufe einen HP mehr" } },
      { ability: "dex", why: "Rüstungsklasse und Bogen", min: { value: 13, why: "DEX 13 öffnet Dodge" } },
      { ability: "int", why: "Kampfgeschick", min: { value: 13, why: "INT 13 öffnet Combat Expertise" } },
    ],
    skills: [
      { skillId: "srd:skill:climb", why: "in Rüstung beweglich bleiben" },
      { skillId: "srd:skill:jump", why: "in Rüstung beweglich bleiben" },
      { skillId: "srd:skill:intimidate", why: "das Einzige, was ihm gesellschaftlich liegt" },
      { skillId: "srd:skill:ride", why: "Kampf zu Pferd" },
    ],
  },
  "srd:class:monk": {
    abilities: [
      {
        ability: "dex",
        why: "seine Rüstungsklasse — er trägt keine Rüstung",
        min: { value: 14, why: "ohne Rüstung ist DEX seine ganze RK" },
      },
      { ability: "wis", why: "kommt bei ihm auf die RK dazu" },
      { ability: "str", why: "sein waffenloser Schlag" },
      { ability: "con", why: "Trefferpunkte (W8)", min: { value: 12, why: "ab 12 bringt jede Stufe einen HP mehr" } },
    ],
    skills: [
      { skillId: "srd:skill:tumble", why: "aus dem Nahkampf heraus, ohne Gegenangriff" },
      { skillId: "srd:skill:balance", why: "Beweglichkeit ist sein Handwerk" },
      { skillId: "srd:skill:listen", why: "gute Sinne" },
      { skillId: "srd:skill:spot", why: "gute Sinne" },
    ],
  },
  "srd:class:paladin": {
    abilities: [
      { ability: "str", why: "Angriff und Schaden", min: { value: 13, why: "STR 13 öffnet Power Attack" } },
      {
        ability: "cha",
        why: "seine Aura, das Handauflegen und Untote vertreiben",
        min: { value: 14, why: "fast alles am Paladin rechnet mit CHA" },
      },
      { ability: "con", why: "Trefferpunkte (W10)", min: { value: 12, why: "ab 12 bringt jede Stufe einen HP mehr" } },
      { ability: "wis", why: "seine wenigen Zauber" },
    ],
    skills: [
      { skillId: "srd:skill:diplomacy", why: "er spricht für seinen Glauben" },
      { skillId: "srd:skill:heal", why: "Handauflegen ist begrenzt" },
      { skillId: "srd:skill:knowledge", why: "sein Glaube", subtypeHint: "religion" },
      { skillId: "srd:skill:ride", why: "sein besonderes Reittier" },
    ],
  },
  "srd:class:ranger": {
    abilities: [
      {
        ability: "dex",
        why: "Bogen und leichte Rüstung",
        min: { value: 13, why: "DEX 13 öffnet Point Blank Shot und Dodge" },
      },
      { ability: "str", why: "wenn er mit zwei Waffen kämpft", min: { value: 13, why: "STR 13 öffnet Power Attack" } },
      { ability: "con", why: "Trefferpunkte (W8)", min: { value: 12, why: "ab 12 bringt jede Stufe einen HP mehr" } },
      { ability: "wis", why: "Aufspüren und seine wenigen Zauber" },
    ],
    skills: [
      { skillId: "srd:skill:survival", why: "Spuren lesen, sein Kernstück" },
      { skillId: "srd:skill:hide", why: "sich in der Wildnis nicht zeigen" },
      { skillId: "srd:skill:move-silently", why: "sich in der Wildnis nicht zeigen" },
      { skillId: "srd:skill:spot", why: "sehen, bevor man gesehen wird" },
      { skillId: "srd:skill:knowledge", why: "seine bevorzugten Feinde", subtypeHint: "nature" },
    ],
  },
  "srd:class:rogue": {
    abilities: [
      {
        ability: "dex",
        why: "Rüstungsklasse, Schleichen und die feinen Handgriffe",
        min: { value: 15, why: "fast alles am Schurken rechnet mit DEX" },
      },
      { ability: "int", why: "acht Fertigkeitspunkte je Stufe wollen INT" },
      { ability: "con", why: "Trefferpunkte (W6)" },
      { ability: "cha", why: "Bluffen und Auftreten" },
    ],
    skills: [
      { skillId: "srd:skill:hide", why: "unsichtbar bleiben" },
      { skillId: "srd:skill:move-silently", why: "unsichtbar bleiben" },
      { skillId: "srd:skill:search", why: "Fallen finden, bevor sie zuschnappen" },
      { skillId: "srd:skill:disable-device", why: "Fallen und Schlösser" },
      { skillId: "srd:skill:tumble", why: "aus dem Nahkampf heraus" },
    ],
  },
  "srd:class:sorcerer": {
    abilities: [
      {
        ability: "cha",
        why: "Zauber, ihre Zahl und ihr Schwierigkeitsgrad",
        min: { value: 15, why: "seine Zauber sind alles, was er hat" },
      },
      {
        ability: "con",
        why: "Trefferpunkte (W4) — er hat wenige",
        min: { value: 12, why: "mit W4 zählt jeder Trefferpunkt" },
      },
      { ability: "dex", why: "Rüstungsklasse — er trägt keine Rüstung" },
    ],
    skills: [
      { skillId: "srd:skill:concentration", why: "Zaubern, während man getroffen wird" },
      { skillId: "srd:skill:spellcraft", why: "Zauber erkennen" },
      { skillId: "srd:skill:bluff", why: "sein CHA zahlt sich auch außerhalb der Zauber aus" },
    ],
  },
  "srd:class:wizard": {
    abilities: [
      {
        ability: "int",
        why: "Zauber, ihre Zahl und ihr Schwierigkeitsgrad",
        min: { value: 15, why: "seine Zauber sind alles, was er hat" },
      },
      {
        ability: "con",
        why: "Trefferpunkte (W4) — er hat wenige",
        min: { value: 12, why: "mit W4 zählt jeder Trefferpunkt" },
      },
      { ability: "dex", why: "Rüstungsklasse — er trägt keine Rüstung" },
    ],
    skills: [
      { skillId: "srd:skill:concentration", why: "Zaubern, während man getroffen wird" },
      { skillId: "srd:skill:spellcraft", why: "Zauber erkennen und ins Buch schreiben" },
      { skillId: "srd:skill:knowledge", why: "sein Fach", subtypeHint: "arcana" },
    ],
  },
};

/* ------------------------------------------------------------------------- *
 * Das Volk
 * ------------------------------------------------------------------------- */

/**
 * Was das Volk zu dieser Klasse sagt — und nur, wenn es etwas zu sagen hat.
 *
 * Genannt wird, was ein Attribut aus der Empfehlung trifft: der Halb-Ork mit CHA −2 ist
 * für einen Kleriker eine echte Nachricht (Turn Undead), für einen Kämpfer keine. Ohne
 * diese Prüfung stünde bei jedem Volk irgendein Satz, und der wäre meistens belanglos.
 */
function raceNote(race: Entity | undefined, abilities: AbilityAdvice[]): string | undefined {
  if (race === undefined || race.kind !== "race") return undefined;
  const mods = race.data.abilityMods;
  const name = displayName(race);

  /*
    Nur die Zahlen, nicht die Gründe. Mit Grund stand hier
    „kostet dich CHA -2 (Untote vertreiben (Turn Undead))" — Klammern in Klammern, und die
    Begründung stand drei Zeilen höher schon in der Liste. Die Notiz beantwortet eine
    andere Frage: welche der Zahlen, auf die es hier ankommt, verschiebt dein Volk?
  */
  const helps: string[] = [];
  const hurts: string[] = [];
  for (const entry of abilities) {
    const mod = mods[entry.ability];
    if (mod === undefined || mod === 0) continue;
    const text = `${ABILITY_LABEL[entry.ability]} ${mod > 0 ? "+" : ""}${mod}`;
    (mod > 0 ? helps : hurts).push(text);
  }
  if (helps.length === 0 && hurts.length === 0) return undefined;

  const parts: string[] = [];
  if (helps.length > 0) parts.push(`bringt dir ${helps.join(" und ")}`);
  if (hurts.length > 0) parts.push(`kostet dich ${hurts.join(" und ")}`);
  return `${name} ${parts.join(", ")} — und beides zählt hier.`;
}

/* ------------------------------------------------------------------------- *
 * Zusammenführen
 * ------------------------------------------------------------------------- */

/**
 * Die Empfehlung für Volk + Klasse. Ohne Klasse gibt es keine — welche Attribute zählen,
 * entscheidet die Klasse, nicht das Volk. Das Volk kommentiert nur (`raceNote`).
 */
export function adviceFor(
  klass: Entity | undefined,
  race: Entity | undefined,
): Advice | undefined {
  if (klass === undefined || klass.kind !== "class") return undefined;

  const hand = BY_CLASS[klass.id];

  /*
    Gibt es Handarbeit, GILT sie — vollständig und in ihrer Reihenfolge. Jeder Eintrag
    trägt seinen Grund schon im Typ, also kann hier keiner mehr stumm herausfallen.
    Der Mindestwert kommt aus der Handarbeit, sonst aus der Rechnung.
  */
  const computed = computedAbilities(klass);
  const computedByAbility = new Map<Ability, AbilityAdvice>();
  for (const entry of computed) {
    // Zwei Gründe für dasselbe Attribut: der erste (der wichtigere) gewinnt.
    if (!computedByAbility.has(entry.ability)) computedByAbility.set(entry.ability, entry);
  }

  const abilities: AbilityAdvice[] =
    hand === undefined
      ? computed
      : hand.abilities.map((entry) => {
          const fallback = computedByAbility.get(entry.ability);
          const min =
            entry.min !== undefined
              ? { min: entry.min.value, minWhy: entry.min.why }
              : fallback?.min !== undefined
                ? { min: fallback.min, ...(fallback.minWhy !== undefined ? { minWhy: fallback.minWhy } : {}) }
                : {};
          return { ability: entry.ability, why: entry.why, ...min };
        });

  const skills = hand?.skills ?? computedSkills(klass);

  return {
    abilities,
    skills,
    ...(() => {
      const note = raceNote(race, abilities);
      return note === undefined ? {} : { raceNote: note };
    })(),
  };
}

/**
 * Ohne Handarbeit: nur das, was aus den Daten wirklich folgt. Welche drei Fertigkeiten
 * eine Prestigeklasse ausmachen, steht in keinem Datenfeld — geraten wäre schlimmer als
 * nichts, denn ein Vorschlag klingt nach Wissen.
 *
 * Hier stand einmal mehr: die Fertigkeiten auf das beste Attribut des Charakters. Das
 * ging über eine erfundene Kennung (`ability:dex`), die es im Kompendium nicht gibt — die
 * Anzeige hätte sie stumm verschluckt. Wer eine Kennung ausgibt, muss eine echte ausgeben.
 */
function computedSkills(klass: Entity): SkillAdvice[] {
  if (klass.kind !== "class") return [];
  if (klass.data.spellcasting === undefined) return [];
  return [{ skillId: "srd:skill:concentration", why: "Zaubern, während man getroffen wird" }];
}

/** Der Vorschlag als Text für eine Zeile: „WIS, dann CON, dann STR". */
export function abilityOrderText(advice: Advice): string {
  return advice.abilities.map((a) => ABILITY_LABEL[a.ability]).join(" · ");
}

export { ABILITY_LABEL as ADVICE_ABILITY_LABEL };
