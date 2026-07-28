import type { Database } from "./parse-sql.js";
import { Warnings } from "./util.js";

/** Gemeinsamer Konverter-Kontext: geparster Dump + Lookups + Warnungssammler. */
export interface ConvertContext {
  db: Database;
  /** lowercase Skill-Name → Entity-ID (z.B. "move silently" → srd:skill:move-silently). */
  skillIdByName: Map<string, string>;
  /** lowercase Feat-Name → Entity-ID (alle Feats des Dumps, auch psionische). */
  featIdByName: Map<string, string>;
  /** lowercase Domänen-Namen (aus der domain-Tabelle). */
  domainNames: Set<string>;
  warnings: Warnings;
}

/**
 * Kommasplit, der Klammern respektiert. Die Regel steht in core — hier nur
 * weiterreichen, damit die vorhandenen Importe im ETL unverändert bleiben.
 */
export { splitTopLevel } from "@codex35/core";
