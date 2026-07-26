import {
  CURRENT_EXPORT_FORMAT_VERSION,
  canonicalJson,
  collectHomebrewClosure,
  exportEnvelopeSchema,
  type Character,
  type Entity,
  type ExportEnvelope,
  type HouseRules,
} from "@codex35/core";
import { db } from "../db/db.js";
import { SettingsRepo, migrateAndParseCharacter, migrateAndParseEntity } from "../db/repo.js";

/**
 * Export: ein kanonisch sortiertes JSON-Envelope. Homebrew wird immer
 * eingebettet, SRD nie (Slugs lösen beim Empfänger auf).
 */
export async function buildExport(): Promise<string> {
  const characters = (await db.characters.toArray()).filter((c) => !c.deletedAt);
  const homebrewEntities = (await db.entities.where("source").equals("homebrew").toArray()).filter(
    (e) => !e.deletedAt,
  );
  const houseRules = await SettingsRepo.getHouseRules();
  const envelope: ExportEnvelope = {
    formatVersion: CURRENT_EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    app: "chardex35",
    characters,
    homebrewEntities,
    houseRules,
  };
  return canonicalJson(envelope);
}

/**
 * Ein einzelner Charakter samt dem Homebrew, das er BRAUCHT (transitiv, inkl.
 * Überschreibungen) — der Weg, um einen Bogen ohne Konto-Einrichtung auf ein
 * zweites Gerät zu bringen: teilen, drüben importieren.
 *
 * BEWUSST synchron und ohne Datenbankzugriff: der Aufrufer hat Charakter und
 * Kompendium ohnehin schon im Speicher, und `navigator.share()` muss auf
 * iOS/iPadOS im selben Zug wie der Fingertipp laufen. Jedes `await` davor
 * riskiert, dass Safari das Teilen-Blatt mit „NotAllowedError" verweigert.
 */
export function buildCharacterExport(
  character: Character,
  allEntities: Entity[],
  houseRules: HouseRules,
): { json: string; filename: string } {
  const homebrew = allEntities.filter((e) => e.source === "homebrew" && !e.deletedAt);
  const envelope: ExportEnvelope = {
    formatVersion: CURRENT_EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    app: "chardex35",
    characters: [character],
    homebrewEntities: collectHomebrewClosure(character, homebrew),
    houseRules,
  };
  return { json: canonicalJson(envelope), filename: `${slugForFile(character.name)}.json` };
}

/** Dateiname aus dem Charakternamen — Umlaute bleiben, Pfadzeichen nicht. */
function slugForFile(name: string): string {
  const stem = name.replace(/[^\p{L}\p{N} _-]+/gu, "").trim().replace(/\s+/g, "-");
  return `chardex35-${stem === "" ? "charakter" : stem.toLowerCase()}`;
}

export function downloadExport(json: string, filename?: string): void {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? `chardex35-export-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export type ShareOutcome = "shared" | "cancelled" | "downloaded";

/**
 * Auf iOS/iPadOS öffnet das das System-Teilen-Blatt: AirDrop aufs iPad,
 * „In Dateien speichern" (iCloud Drive) oder direkt in eine Nachricht. Wo es
 * das nicht gibt (Desktop-Browser), wird schlicht heruntergeladen.
 */
export async function shareOrDownload(
  json: string,
  filename: string,
  title: string,
): Promise<ShareOutcome> {
  const file = new File([json], filename, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] }) === true) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error) {
      // Abbruch durch den Nutzer ist kein Fehler; alles andere (z.B. fehlende
      // Nutzer-Interaktion in Safari) fällt auf den Download zurück.
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  downloadExport(json, filename);
  return "downloaded";
}

export interface ImportResult {
  charactersAdded: number;
  charactersUpdated: number;
  charactersSkipped: number;
  entitiesAdded: number;
  entitiesUpdated: number;
  entitiesSkipped: number;
}

/**
 * Import: Zod-validiert (Trust Boundary), Migrationen laufen eager.
 * Konfliktregel v1: höhere rev gewinnt, gleiche/ältere wird übersprungen.
 *
 * `envelope.houseRules` wird BEWUSST nicht übernommen: Hausregeln gehören dem
 * Tisch, der importiert, nicht dem, der exportiert hat. Sie stehen nur in der
 * Datei, damit man nachlesen kann, unter welchen Regeln die Werte entstanden
 * sind. Einstellen tut man sie in den Einstellungen.
 */
export async function importEnvelope(raw: unknown): Promise<ImportResult> {
  const envelope = exportEnvelopeSchema.parse(raw);
  const result: ImportResult = {
    charactersAdded: 0,
    charactersUpdated: 0,
    charactersSkipped: 0,
    entitiesAdded: 0,
    entitiesUpdated: 0,
    entitiesSkipped: 0,
  };

  await db.transaction("rw", db.characters, db.entities, async () => {
    for (const rawCharacter of envelope.characters) {
      const incoming = migrateAndParseCharacter(rawCharacter);
      const existing = await db.characters.get(incoming.id);
      if (!existing) {
        await db.characters.put(incoming);
        result.charactersAdded++;
      } else if (incoming.rev > existing.rev) {
        await db.characters.put(incoming);
        result.charactersUpdated++;
      } else {
        result.charactersSkipped++;
      }
    }
    for (const rawEntity of envelope.homebrewEntities) {
      const incoming = migrateAndParseEntity(rawEntity);
      if (incoming.source !== "homebrew") continue; // SRD kommt nie per Import.
      const existing = await db.entities.get(incoming.id);
      if (!existing) {
        await db.entities.put(incoming);
        result.entitiesAdded++;
      } else if (incoming.rev > existing.rev) {
        await db.entities.put(incoming);
        result.entitiesUpdated++;
      } else {
        result.entitiesSkipped++;
      }
    }
  });

  return result;
}
