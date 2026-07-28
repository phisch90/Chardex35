import type { Prerequisite } from "../schema/entities.js";

/**
 * Voraussetzungs-TEXT in die Prerequisite-Union übersetzen: „Str 13", „base
 * attack bonus +4", „Hide 8 ranks", „Power Attack".
 *
 * Liegt in core, weil zwei Wege denselben Text lesen: der SRD-Konverter (aus dem
 * Datenbank-Dump) und der Konverter für eigene Buchinhalte (aus PDF-Text). Zwei
 * Fassungen dieser Regeln würden garantiert auseinanderlaufen — und dann hinge
 * es an der Herkunft eines Talents, ob „Str 13" als Attributs-Voraussetzung
 * erkannt wird oder als Fließtext danebensteht.
 *
 * Was nicht erkannt wird, fällt bewusst auf `custom` zurück: die App zeigt den
 * Text dann an und warnt pauschal, statt eine Voraussetzung zu erfinden.
 */

const ABILITY_NAMES: Record<string, "str" | "dex" | "con" | "int" | "wis" | "cha"> = {
  str: "str", strength: "str",
  dex: "dex", dexterity: "dex",
  con: "con", constitution: "con",
  int: "int", intelligence: "int",
  wis: "wis", wisdom: "wis",
  cha: "cha", charisma: "cha",
};

const CLASS_LEVEL_RE = /^(barbarian|bard|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|wizard) level (\d+)(?:st|nd|rd|th)?$/i;

/** Tippfehler/Varianten in den Quellen → kanonischer Skill-Name. */
const SKILL_ALIASES: Record<string, string> = {
  "handle animals": "handle animal",
};

/**
 * Was zum Auflösen von Namen gebraucht wird — bewusst schmal, damit jeder
 * Aufrufer das aus seiner eigenen Quelle füllen kann (Dump, Packs, Datenbank).
 */
export interface NameLookup {
  /** lowercase Skill-Name → Entity-ID („move silently" → srd:skill:move-silently). */
  skillIdByName: Map<string, string>;
  /** lowercase Feat-Name → Entity-ID. */
  featIdByName: Map<string, string>;
}

/** Skill-Namen („Knowledge (arcana)", „Perform (dance)") auf Skill-ID auflösen. */
export function resolveSkillId(lookup: NameLookup, rawName: string): string | undefined {
  const name = rawName.trim();
  const key = name.toLowerCase();
  const direct = lookup.skillIdByName.get(SKILL_ALIASES[key] ?? key);
  if (direct) return direct;
  // Generisches Pendant: Klammerzusatz abwerfen („Craft (alchemy)" → „Craft").
  const base = name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return lookup.skillIdByName.get(SKILL_ALIASES[base] ?? base);
}

/** Feat-Namen auflösen; Klammerzusatz fällt aufs Basistalent zurück („Spell Focus (Conjuration)" → Spell Focus). */
export function resolveFeatId(lookup: NameLookup, rawName: string): string | undefined {
  const name = rawName.trim();
  const direct = lookup.featIdByName.get(name.toLowerCase());
  if (direct) return direct;
  const base = name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (base !== name) return lookup.featIdByName.get(base.toLowerCase());
  return undefined;
}

/** Ein Textfragment („Str 13", „base attack bonus +4", „Dodge") in die Prerequisite-Union übersetzen. */
export function parsePrerequisiteFragment(lookup: NameLookup, fragment: string): Prerequisite {
  const text = fragment.trim().replace(/[.;]+$/, "").trim();

  const ability = /^([A-Za-z]+)\s+(\d+)\+?$/.exec(text);
  if (ability) {
    const ab = ABILITY_NAMES[ability[1]!.toLowerCase()];
    if (ab) return { type: "minAbility", ability: ab, value: parseInt(ability[2]!, 10) };
  }

  const bab = /^base attack bonus \+?(\d+)$/i.exec(text);
  if (bab) return { type: "minBab", value: parseInt(bab[1]!, 10) };

  const casterLevel = /^caster level (\d+)(?:st|nd|rd|th)?$/i.exec(text);
  if (casterLevel) return { type: "minCasterLevel", value: parseInt(casterLevel[1]!, 10) };

  const classLevel = CLASS_LEVEL_RE.exec(text);
  if (classLevel) {
    return {
      type: "classLevel",
      classId: `srd:class:${classLevel[1]!.toLowerCase()}`,
      level: parseInt(classLevel[2]!, 10),
    };
  }

  const ranks = /^(.+?)\s+(\d+)\s+ranks?$/i.exec(text);
  if (ranks) {
    const skillId = resolveSkillId(lookup, ranks[1]!);
    if (skillId) return { type: "minSkillRanks", skillId, ranks: parseInt(ranks[2]!, 10) };
  }

  const featId = resolveFeatId(lookup, text);
  if (featId) return { type: "hasFeat", featId };

  return { type: "custom", text };
}

/**
 * Ganze Voraussetzungs-Zeile parsen. Kommagetrennt, klammer-bewusst;
 * ungematchte Nachbar-Fragmente werden probeweise wieder zusammengefügt
 * (Feat-Namen mit Komma wie „Blindsight, 5-Ft. Radius").
 */
export function parsePrerequisites(
  lookup: NameLookup,
  raw: string | null | undefined,
): Prerequisite[] {
  if (raw == null) return [];
  const plain = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (plain === "" || plain === "-" || plain === "—") return [];

  const fragments = splitTopLevel(plain);
  const out: Prerequisite[] = [];
  for (let i = 0; i < fragments.length; i++) {
    let parsed = parsePrerequisiteFragment(lookup, fragments[i]!);
    if (parsed.type === "custom" && i + 1 < fragments.length) {
      const joined = `${fragments[i]}, ${fragments[i + 1]}`;
      const joinedParsed = parsePrerequisiteFragment(lookup, joined);
      if (joinedParsed.type !== "custom") {
        parsed = joinedParsed;
        i++;
      }
    }
    out.push(parsed);
  }
  return out;
}

/**
 * Kommasplit, der Klammern respektiert: „Knowledge (all skills, taken
 * individually), Ride" → 2 Teile.
 */
export function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim() !== "") parts.push(current.trim());
  return parts.filter((p) => p !== "");
}
