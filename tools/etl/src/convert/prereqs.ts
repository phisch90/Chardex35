/**
 * Die Regeln selbst stehen in core (`import/prerequisites.ts`) — dort, wo auch
 * der Konverter für eigene Buchinhalte sie liest. Hier bleiben nur die dünnen
 * Hüllen, die den ConvertContext auf das schmale Lookup-Interface abbilden.
 */
import {
  parsePrerequisiteFragment as parseFragment,
  parsePrerequisites as parseLine,
  resolveFeatId as resolveFeat,
  resolveSkillId as resolveSkill,
  type Prerequisite,
} from "@codex35/core";
import type { ConvertContext } from "../context.js";

export function resolveSkillId(ctx: ConvertContext, rawName: string): string | undefined {
  return resolveSkill(ctx, rawName);
}

export function resolveFeatId(ctx: ConvertContext, rawName: string): string | undefined {
  return resolveFeat(ctx, rawName);
}

export function parsePrerequisiteFragment(ctx: ConvertContext, fragment: string): Prerequisite {
  return parseFragment(ctx, fragment);
}

export function parsePrerequisites(
  ctx: ConvertContext,
  raw: string | null | undefined,
): Prerequisite[] {
  return parseLine(ctx, raw);
}
