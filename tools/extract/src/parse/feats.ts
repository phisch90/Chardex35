/**
 * Talent-Einträge → Homebrew-Entities.
 *
 * Grundhaltung: lieber ein Talent ohne mechanische Wirkung übernehmen als eine
 * Wirkung erfinden. Ein erratener Effekt verändert stillschweigend Werte auf dem
 * Charakterbogen — und ein falscher Bonus, den niemand bemerkt, ist schlimmer
 * als ein fehlender, der beim Spielen auffällt. Alles Abgeleitete landet deshalb
 * im Prüfbericht.
 */
import {
  parsePrerequisites,
  resolveSkillId,
  type Effect,
  type Entity,
  type Prerequisite,
} from "@codex35/core";
import type { SrdIndex } from "../lookup.js";
import { field, type RawEntry } from "../segment.js";

export interface ParsedFeat {
  entity: Entity;
  /** Was aus Text geschlossen wurde und geprüft werden sollte. */
  inferred: string[];
  /** Was nicht übernommen werden konnte. */
  warnings: string[];
}

/** Feldnamen, an denen ein Talent-Eintrag erkennbar ist. */
export const FEAT_ANCHORS = ["Prerequisite", "Prerequisites", "Benefit"];

/**
 * „+2 bonus on all Hide checks and Move Silently checks" → zwei Effekte.
 *
 * Der EINZIGE Satzbau, aus dem hier Wirkung abgeleitet wird. Er ist im 3.5-Stil
 * völlig regelmäßig, und das Ergebnis ist nachprüfbar. Alles andere („du darfst
 * einmal pro Runde …") ist Prosa und bleibt Prosa.
 */
export function deriveSkillBonusEffects(
  index: SrdIndex,
  text: string,
): { effects: Effect[]; note: string } | null {
  const match = /\+(\d+)\s+bonus\s+on\s+(?:all\s+)?(.+?)(?:\.|$)/i.exec(text);
  if (!match) return null;
  const value = parseInt(match[1]!, 10);
  const names = match[2]!
    .split(/\s*,\s*|\s+and\s+/i)
    .map((part) => part.replace(/\bchecks?\b/gi, "").trim())
    .filter((part) => part !== "");

  const effects: Effect[] = [];
  const resolved: string[] = [];
  for (const name of names) {
    const skillId = resolveSkillId(index, name);
    if (skillId === undefined) return null; // ein unbekannter Name → gar nichts raten
    effects.push({ target: `skill:${skillId}`, bonusType: "untyped", value, activation: "passive" });
    resolved.push(name);
  }
  if (effects.length === 0) return null;
  return { effects, note: `+${value} auf ${resolved.join(", ")} (aus dem Text abgeleitet)` };
}

export function parseFeat(
  index: SrdIndex,
  entry: RawEntry,
  options: { sourcePack: string; now: string },
): ParsedFeat {
  const inferred: string[] = [];
  const warnings: string[] = [];

  const prereqText = field(entry, "Prerequisite", "Prerequisites");
  const prerequisites: Prerequisite[] = parsePrerequisites(index, prereqText);
  const unresolved = prerequisites.filter((p) => p.type === "custom");
  for (const p of unresolved) {
    if (p.type === "custom") {
      warnings.push(`Voraussetzung nicht maschinell prüfbar, steht als Text: „${p.text}"`);
    }
  }

  const benefit = field(entry, "Benefit");
  const normalText = field(entry, "Normal");
  const specialText = field(entry, "Special");
  const description = [
    `${entry.name}${entry.bracket === undefined ? "" : ` [${entry.bracket}]`}`,
    ...(prereqText === undefined ? [] : [`**Prerequisites:** ${prereqText}`]),
    ...(benefit === undefined ? [] : [`**Benefit:** ${benefit}`]),
    ...(normalText === undefined ? [] : [`**Normal:** ${normalText}`]),
    ...(specialText === undefined ? [] : [`**Special:** ${specialText}`]),
    ...entry.body,
  ].join("\n\n");

  if (benefit === undefined) warnings.push(`kein „Benefit"-Absatz gefunden`);

  // Mehrfach nehmbar: im 3.5-Stil steht das wörtlich im Special-Absatz.
  const stackable = /multiple times|effects? stack/i.test(specialText ?? "");
  if (stackable) inferred.push("mehrfach wählbar (laut Special-Absatz)");

  // Auswahl nötig („Weapon Focus (Langschwert)"): nur wenn der Text es sagt.
  const requiresChoice = /\bchoose\b|\bselect a\b/i.test(benefit ?? "");
  if (requiresChoice) inferred.push(`verlangt eine Auswahl (der Text sagt „choose")`);

  const derived = benefit === undefined ? null : deriveSkillBonusEffects(index, benefit);
  if (derived) inferred.push(derived.note);
  else if (benefit !== undefined) {
    warnings.push("ohne mechanische Wirkung übernommen — Effekte bei Bedarf von Hand ergänzen");
  }

  const entity: Entity = {
    id: crypto.randomUUID(),
    name: entry.name,
    kind: "feat",
    source: "homebrew",
    sourcePack: options.sourcePack,
    schemaVersion: 1,
    rev: 1,
    updatedAt: options.now,
    tags: [],
    description,
    effects: derived?.effects ?? [],
    data: {
      prerequisites,
      featType: entry.bracket ?? "General",
      stackable,
      requiresChoice,
      extraUses: [],
      ...(benefit === undefined ? {} : { benefit }),
      ...(normalText === undefined ? {} : { normalText }),
      ...(specialText === undefined ? {} : { specialText }),
    },
  };

  return { entity, inferred, warnings };
}
