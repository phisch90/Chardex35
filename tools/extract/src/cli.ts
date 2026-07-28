/**
 * Kommandozeile des Konverters.
 *
 *   pnpm --filter @codex35/extract extract <buch.pdf> [--pack=name] [--only=spells,feats]
 *
 * Erzeugt zwei Dateien in tools/extract/out/ (von Git ausgeschlossen):
 *   <pack>.private.json   → in der App unter „Importieren" einlesen
 *   <pack>-bericht.txt    → was übernommen wurde und was nachzusehen ist
 *
 * Der Bericht geht zusätzlich auf den Bildschirm, damit man nach dem Lauf sofort
 * sieht, ob sich das Einlesen gelohnt hat.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KINDS, buildImportFile, buildReport, convertPdf, type Kind } from "./convert.js";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../out");

interface Args {
  pdf: string;
  pack: string;
  outDir: string;
  kinds: Kind[];
}

export function parseArgs(argv: string[], defaultOut = OUT_DIR): Args {
  const positional: string[] = [];
  const flags = new Map<string, string>();
  for (const arg of argv) {
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (match) flags.set(match[1]!, match[2] ?? "");
    else positional.push(arg);
  }

  const pdf = positional[0];
  if (pdf === undefined) {
    throw new Error(
      "Kein PDF angegeben.\n" +
        "  pnpm --filter @codex35/extract extract <buch.pdf> [--pack=name] [--only=spells,feats,classes]",
    );
  }

  const only = flags.get("only");
  const kinds =
    only === undefined || only === ""
      ? [...KINDS]
      : only.split(",").map((part) => {
          const kind = part.trim().toLowerCase();
          if (!KINDS.includes(kind as Kind)) {
            throw new Error(`--only=${kind}? Möglich sind: ${KINDS.join(", ")}`);
          }
          return kind as Kind;
        });

  return {
    pdf,
    pack: flags.get("pack") ?? `${slug(basename(pdf).replace(/\.pdf$/i, ""))}-privat`,
    outDir: flags.get("out") ?? defaultOut,
    kinds,
  };
}

/** Dateinamen-taugliche Kurzform („Complete Arcane" → „complete-arcane"). */
export function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[äöü]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue" })[c] ?? c)
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "buch"
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date().toISOString();

  console.log(`Lese ${args.pdf} …`);
  const result = await convertPdf(resolve(args.pdf), {
    sourcePack: args.pack,
    now,
    kinds: args.kinds,
  });

  const report = buildReport(result, basename(args.pdf));
  await mkdir(args.outDir, { recursive: true });
  const jsonPath = join(args.outDir, `${args.pack}.private.json`);
  const reportPath = join(args.outDir, `${args.pack}-bericht.txt`);
  await writeFile(jsonPath, buildImportFile(result.entities, now), "utf8");
  await writeFile(reportPath, `${report}\n`, "utf8");

  console.log("");
  console.log(report);
  console.log("");
  console.log(`Import-Datei: ${jsonPath}`);
  console.log(`Bericht:      ${reportPath}`);
  if (result.entities.length === 0) {
    console.log("");
    console.log(
      "Nichts gefunden. Häufigste Ursache: das PDF ist ein Scan ohne Textebene — " +
        "dann hilft nur eine Fassung mit Text (OCR).",
    );
  }
}

// Nur ausführen, wenn direkt gestartet — nicht beim Import aus einem Test.
if (process.argv[1] !== undefined && import.meta.url === `file://${resolve(process.argv[1])}`) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
