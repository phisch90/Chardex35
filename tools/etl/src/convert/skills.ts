import type { SkillEntity } from "@codex35/core";
import type { ConvertContext } from "../context.js";
import { requireTable } from "../parse-sql.js";
import { htmlToText, slugify } from "../util.js";

const ABILITY_MAP: Record<string, "str" | "dex" | "con" | "int" | "wis" | "cha"> = {
  Str: "str",
  Dex: "dex",
  Con: "con",
  Int: "int",
  Wis: "wis",
  Cha: "cha",
};

interface SynergyDef {
  to: string;
  condition?: string;
  /** Nur dieses Teilgebiet der Quell-Fertigkeit gibt die Synergie. */
  from?: string;
  /** Nur dieses Teilgebiet der Ziel-Fertigkeit bekommt sie. */
  toSubtype?: string;
}

/**
 * PHB-3.5-Synergietabelle, hart kodiert (Quelle: PHB Kap. 4 / SRD "Skill Synergies").
 * Knowledge ist bei Andargor EIN generischer Skill; die Teilgebiets-Synergien
 * hängen deshalb an srd:skill:knowledge mit `from` = Teilgebiet, damit 5 Ränge
 * Knowledge (arcana) Spellcraft helfen und 5 Ränge Knowledge (religion) nicht.
 * Nicht abbildbar (kein Skill-Ziel): Handle Animal→wild empathy,
 * Knowledge (history)→bardic knowledge, Knowledge (religion)→turn undead.
 */
const SYNERGIES: Record<string, SynergyDef[]> = {
  bluff: [
    { to: "diplomacy" },
    { to: "intimidate" },
    { to: "sleight-of-hand" },
    { to: "disguise", condition: "when acting in character (feinting/bluffing while observed)" },
  ],
  craft: [{ to: "appraise", condition: "related to items made with your Craft skill" }],
  "decipher-script": [{ to: "use-magic-device", condition: "involving scrolls" }],
  "escape-artist": [{ to: "use-rope", condition: "involving bindings" }],
  "handle-animal": [{ to: "ride" }],
  jump: [{ to: "tumble" }],
  knowledge: [
    { to: "spellcraft", from: "arcana" },
    {
      to: "search",
      from: "architecture and engineering",
      condition: "to find secret doors or hidden compartments",
    },
    { to: "survival", from: "dungeoneering", condition: "when underground" },
    {
      to: "survival",
      from: "geography",
      condition: "to keep from getting lost or to avoid natural hazards",
    },
    { to: "gather-information", from: "local" },
    { to: "survival", from: "nature", condition: "in aboveground natural environments" },
    { to: "diplomacy", from: "nobility and royalty" },
    { to: "survival", from: "the planes", condition: "when on other planes" },
  ],
  profession: [{ to: "use-rope", from: "sailor", condition: "aboard a ship" }],
  search: [{ to: "survival", condition: "when following tracks" }],
  "sense-motive": [{ to: "diplomacy" }],
  spellcraft: [{ to: "use-magic-device", condition: "involving scrolls" }],
  survival: [{ to: "knowledge", toSubtype: "nature" }],
  tumble: [{ to: "balance" }, { to: "jump" }],
  "use-magic-device": [{ to: "spellcraft", condition: "to decipher spells on scrolls" }],
  "use-rope": [
    { to: "climb", condition: "involving ropes" },
    { to: "escape-artist", condition: "involving rope bonds" },
  ],
};

/**
 * Teilgebiete aus dem SRD. Knowledge ist abschließend, Craft/Perform/Profession
 * sind Beispiele — eigene Teilgebiete kann man im Bogen jederzeit anlegen.
 */
const SUBTYPES: Record<string, string[]> = {
  knowledge: [
    "arcana",
    "architecture and engineering",
    "dungeoneering",
    "geography",
    "history",
    "local",
    "nature",
    "nobility and royalty",
    "religion",
    "the planes",
  ],
  craft: [
    "alchemy",
    "armorsmithing",
    "blacksmithing",
    "bowmaking",
    "carpentry",
    "leatherworking",
    "painting",
    "sculpting",
    "shipmaking",
    "stonemasonry",
    "trapmaking",
    "weaponsmithing",
  ],
  perform: [
    "act",
    "comedy",
    "dance",
    "keyboard instruments",
    "oratory",
    "percussion instruments",
    "sing",
    "string instruments",
    "wind instruments",
  ],
  profession: [
    "apothecary",
    "cook",
    "driver",
    "farmer",
    "herbalist",
    "hunter",
    "innkeeper",
    "miner",
    "sailor",
    "scribe",
    "siege engineer",
    "stablehand",
    "tanner",
    "teamster",
  ],
};

function section(title: string, html: string | null | undefined): string {
  const text = htmlToText(html);
  if (text === "") return "";
  return `**${title}:** ${text}`;
}

export function convertSkills(ctx: ConvertContext): SkillEntity[] {
  const table = requireTable(ctx.db, "skill");
  const out: SkillEntity[] = [];
  const usedSlugs = new Set<string>();

  const rows = [...table.rows].sort((a, b) => Number(a.id) - Number(b.id));
  for (const row of rows) {
    const name = row.name ?? "";
    const psionic = row.psionic === "Yes";
    // Psionik ist außerhalb des Scopes (wie Klassen/Feats/Powers) — die
    // psionischen Skills erzeugten u.a. ein doppeltes "Concentration" in der UI.
    if (psionic) continue;
    let slug = slugify(name);
    if (usedSlugs.has(slug)) {
      slug = `${slug}-2`;
      ctx.warnings.add(`skill: Namenskollision "${name}" → Slug ${slug}`);
    }
    usedSlugs.add(slug);

    const keyRaw = row.key_ability ?? "None";
    const keyAbility = ABILITY_MAP[keyRaw] ?? null;
    if (keyAbility === null && keyRaw !== "None") {
      ctx.warnings.add(`skill ${name}: unbekannte key_ability "${keyRaw}" → null`);
    }

    const descriptionParts = [
      htmlToText(row.description),
      section("Check", row.skill_check),
      section("Action", row.action),
      section("Try Again", row.try_again),
      section("Special", row.special),
      section("Restriction", row.restriction),
      section("Synergy", row.synergy),
      section("Untrained", row.untrained),
    ].filter((p) => p !== "");

    const tags: string[] = [];
    if (psionic) tags.push("psionic");
    if (row.subtype) tags.push("subtypes");

    out.push({
      id: `srd:skill:${slug}`,
      kind: "skill",
      name,
      source: "srd",
      schemaVersion: 1,
      rev: 1,
      updatedAt: "",
      tags,
      description: descriptionParts.join("\n\n"),
      effects: [],
      data: {
        keyAbility,
        trainedOnly: row.trained === "Yes",
        acpApplies: row.armor_check === "Yes",
        acpDouble: name === "Swim",
        // „Speak Language" trägt im Dump zwar ein Teilgebiet, ist aber keine
        // Probe-Fertigkeit — Sprachen führt der Bogen als Notiz, nicht als Rang.
        subtyped: slug in SUBTYPES,
        subtypeSuggestions: SUBTYPES[slug] ?? [],
        synergies: [],
      },
    });
  }

  // Synergien in zweitem Durchgang (alle Ziel-IDs existieren dann sicher).
  const idBySlug = new Map(out.map((s) => [s.id.split(":")[2]!, s.id]));
  for (const skill of out) {
    const slug = skill.id.split(":")[2]!;
    for (const syn of SYNERGIES[slug] ?? []) {
      const toId = idBySlug.get(syn.to);
      if (!toId) {
        ctx.warnings.add(`skill ${skill.name}: Synergieziel "${syn.to}" nicht gefunden`);
        continue;
      }
      skill.data.synergies.push({
        toSkillId: toId,
        bonus: 2,
        ...(syn.condition ? { condition: syn.condition } : {}),
        ...(syn.from ? { fromSubtype: syn.from } : {}),
        ...(syn.toSubtype ? { toSubtype: syn.toSubtype } : {}),
      });
    }
  }

  return out;
}
