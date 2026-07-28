/**
 * Ein PDF einlesen → Import-Datei + Prüfbericht.
 *
 * Die Ausgabe ist absichtlich dasselbe Format, das die App beim „Importieren"
 * ohnehin liest (ein Export-Envelope mit `homebrewEntities`). Damit braucht es
 * für eigene Buchinhalte keinen zweiten Weg in die App: Datei erzeugen,
 * importieren, fertig.
 *
 * Der Prüfbericht ist der wichtigere Teil. Ein Konverter, der stillschweigend
 * das Beste hofft, ist wertlos — man merkt den Fehler erst am Spieltisch. Also
 * steht in jeder Zeile, was übernommen wurde, was nur als Text mitkam und was
 * gar nicht gelesen werden konnte.
 */
import { CURRENT_EXPORT_FORMAT_VERSION, canonicalJson, type Entity } from "@codex35/core";
import { loadSrdIndex, type SrdIndex } from "./lookup.js";
import { CLASS_ANCHORS, parseClass } from "./parse/classes.js";
import { FEAT_ANCHORS, parseFeat } from "./parse/feats.js";
import { SPELL_ANCHORS, SPELL_SKIP_ABOVE, parseSpell } from "./parse/spells.js";
import { type Line } from "./pdf.js";
import { readRulebook } from "./read.js";
import { segmentEntries, type RawEntry } from "./segment.js";
import { type LevelTable } from "./table.js";

export const KINDS = ["spells", "feats", "classes"] as const;
export type Kind = (typeof KINDS)[number];

export interface ConvertOptions {
  /** Name des Pakets, unter dem die Einträge in der App auftauchen. */
  sourcePack: string;
  /** Zeitstempel — als Parameter, damit derselbe Lauf dieselbe Datei ergibt. */
  now: string;
  /** Was gesucht werden soll. Leer = alles. */
  kinds?: Kind[];
}

export interface EntryReport {
  kind: Kind;
  name: string;
  page: number;
  inferred: string[];
  warnings: string[];
}

export interface ConvertResult {
  entities: Entity[];
  reports: EntryReport[];
  /** Einträge, die gar nicht übernommen werden konnten. */
  failed: { name: string; reason: string }[];
  /** Namen, die in mehreren Durchgängen auftauchten. */
  collisions: string[];
}

export async function convertPdf(path: string, options: ConvertOptions): Promise<ConvertResult> {
  const index = loadSrdIndex();
  const book = await readRulebook(path);
  return convertLines(index, book.lines, book.tables, options);
}

/** Der eigentliche Weg, ohne Datei — so ist er prüfbar. */
export function convertLines(
  index: SrdIndex,
  clean: Line[],
  tables: LevelTable[],
  options: ConvertOptions,
): ConvertResult {
  const kinds = options.kinds ?? [...KINDS];

  const entities: Entity[] = [];
  const reports: EntryReport[] = [];
  const failed: { name: string; reason: string }[] = [];
  const collisions: string[] = [];
  const seen = new Set<string>();

  /*
    Reihenfolge: Klassen, dann Zauber, dann Talente — vom spezifischsten
    Ankerfeld zum allgemeinsten. Taucht ein Name zweimal auf, gewinnt der
    spezifischere Durchgang, und die Doppelung steht im Bericht.
  */
  const passes: {
    kind: Kind;
    anchors: string[];
    skipAbove?: RegExp;
    parse: (entry: RawEntry) => { entity: Entity; inferred: string[]; warnings: string[] };
  }[] = [];

  if (kinds.includes("classes")) {
    passes.push({
      kind: "classes",
      anchors: CLASS_ANCHORS,
      parse: (entry) => {
        const table = tableFor(tables, entry);
        return parseClass(index, entry, table, {
          sourcePack: options.sourcePack,
          now: options.now,
          // Prestigeklassen gehen bis Stufe 5 oder 10, Basisklassen bis 20. Die
          // Tabelle sagt das, also muss es nicht geraten werden.
          prestige: table !== null && table.rows.size <= 10,
        });
      },
    });
  }
  if (kinds.includes("spells")) {
    passes.push({
      kind: "spells",
      anchors: SPELL_ANCHORS,
      skipAbove: SPELL_SKIP_ABOVE,
      parse: (entry) =>
        parseSpell(index, entry, { sourcePack: options.sourcePack, now: options.now }),
    });
  }
  if (kinds.includes("feats")) {
    passes.push({
      kind: "feats",
      anchors: FEAT_ANCHORS,
      parse: (entry) =>
        parseFeat(index, entry, { sourcePack: options.sourcePack, now: options.now }),
    });
  }

  for (const pass of passes) {
    const entries = segmentEntries(clean, {
      anchors: pass.anchors,
      ...(pass.skipAbove === undefined ? {} : { skipAbove: pass.skipAbove }),
    });
    for (const entry of entries) {
      const key = entry.name.toLowerCase();
      if (seen.has(key)) {
        collisions.push(entry.name);
        continue;
      }
      try {
        const parsed = pass.parse(entry);
        seen.add(key);
        entities.push(parsed.entity);
        reports.push({
          kind: pass.kind,
          name: parsed.entity.name,
          page: entry.page,
          inferred: parsed.inferred,
          warnings: parsed.warnings,
        });
      } catch (error) {
        // Ein unlesbarer Eintrag darf den Lauf nicht abbrechen — er kommt in den
        // Bericht, und die anderen 200 Einträge sind trotzdem da.
        failed.push({ name: entry.name, reason: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  return { entities, reports, failed, collisions };
}

/**
 * Die Stufentabelle, die zu einem Klassen-Eintrag gehört: die auf derselben oder
 * der nächsten Seite. Im Buch steht die Tabelle beim Klassentext — steht sie
 * woanders, ist eine falsche Zuordnung schlimmer als keine.
 */
function tableFor(tables: LevelTable[], entry: RawEntry): LevelTable | null {
  return tables.find((t) => t.page === entry.page || t.page === entry.page + 1) ?? null;
}

/** Die Datei, die die App importieren kann. */
export function buildImportFile(entities: Entity[], now: string): string {
  return canonicalJson({
    formatVersion: CURRENT_EXPORT_FORMAT_VERSION,
    exportedAt: now,
    app: "chardex35",
    characters: [],
    homebrewEntities: entities,
  });
}

const KIND_LABEL: Record<Kind, string> = {
  spells: "Zauber",
  feats: "Talent",
  classes: "Klasse",
};

/** „1 Klasse", „6 Klassen" — der Bericht wird gelesen, nicht geparst. */
function countLabel(kind: Kind, count: number): string {
  if (count === 1) return `1 ${KIND_LABEL[kind]}`;
  const plural = { spells: "Zauber", feats: "Talente", classes: "Klassen" }[kind];
  return `${count} ${plural}`;
}

/**
 * Prüfbericht in normalem Deutsch. Kein Fachjargon, keine Stacktraces: was ist
 * drin, was muss man nachsehen, was fehlt.
 */
export function buildReport(result: ConvertResult, source: string): string {
  const out: string[] = [];
  out.push(`Prüfbericht — ${source}`);
  out.push("");

  const counts = new Map<Kind, number>();
  for (const report of result.reports) {
    counts.set(report.kind, (counts.get(report.kind) ?? 0) + 1);
  }
  const summary = [...KINDS]
    .filter((kind) => (counts.get(kind) ?? 0) > 0)
    .map((kind) => countLabel(kind, counts.get(kind)!))
    .join(", ");
  out.push(`Gelesen: ${summary === "" ? "nichts" : summary}`);

  const withWarnings = result.reports.filter((r) => r.warnings.length > 0);
  out.push(
    `Ohne Anmerkung übernommen: ${result.reports.length - withWarnings.length} von ${result.reports.length}`,
  );

  if (result.failed.length > 0) {
    out.push("");
    out.push(`NICHT übernommen (${result.failed.length}):`);
    for (const item of result.failed) out.push(`  • ${item.name}: ${item.reason}`);
  }

  if (withWarnings.length > 0) {
    out.push("");
    out.push(`Bitte nachsehen (${withWarnings.length}):`);
    for (const report of withWarnings) {
      out.push(`  ${report.name} (${KIND_LABEL[report.kind]}, Seite ${report.page})`);
      for (const warning of report.warnings) out.push(`    • ${warning}`);
    }
  }

  const derived = result.reports.filter((r) => r.inferred.length > 0);
  if (derived.length > 0) {
    out.push("");
    out.push(`Aus dem Text geschlossen — stimmt meistens, prüfen lohnt (${derived.length}):`);
    for (const report of derived) {
      out.push(`  ${report.name}: ${report.inferred.join(" · ")}`);
    }
  }

  if (result.collisions.length > 0) {
    out.push("");
    out.push(`Doppelte Namen, nur einmal übernommen: ${result.collisions.join(", ")}`);
  }

  out.push("");
  out.push(
    "Hinweis: Die Ausgabedatei enthält Inhalte aus deinem Buch und bleibt deshalb " +
      "außerhalb des Repos (tools/extract/out/ ist von Git ausgeschlossen).",
  );
  return out.join("\n");
}
