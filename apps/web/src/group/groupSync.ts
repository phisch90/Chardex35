import {
  applyOrder,
  buildShelf,
  characterSchema,
  pendingOrders,
  type Character,
  type Shelf,
} from "@codex35/core";
import { db } from "../db/db.js";
import { hydrateCharacterRow, hydrateEntityRow } from "../db/repo.js";
import { SyncError } from "../sync/gist.js";
import { SyncSettingsRepo } from "../sync/syncSettings.js";
import { cacheShelf, loadGroupSettings, mutateGroupSettings } from "./groupStore.js";
import { findOrCreateShelfGist, readShelf, writeShelf } from "./shelfGist.js";

/**
 * Der Ablauf der Gruppe: eigenes Regal hinstellen, fremde abholen, Aufträge
 * anwenden.
 *
 * Es gibt bewusst KEINEN Wecker im Hintergrund. Wer ohne eigenen GitHub-Zugang
 * mitliest, hat 60 Abrufe je Stunde — bei vier Mitspielern wäre ein
 * Fünf-Minuten-Takt nach zwanzig Minuten am Limit und die Gruppe stünde eine
 * Stunde ohne Daten da. Abgeholt wird deshalb beim Öffnen und auf Knopfdruck.
 */

export interface GroupReport {
  at: string;
  /** Bögen, die in der Gruppe angekommen sind. */
  read: number;
  /** Regale, die sich nicht öffnen ließen — je mit Grund. */
  failed: { label: string; message: string }[];
  /** Angewendete Aufträge des Spielleiters. */
  ordersApplied: string[];
  /** Aufträge, die eine Rettungskopie nötig machten. */
  rescued: string[];
  /** Abgelehnte Aufträge — je mit Grund. */
  ordersRefused: { characterId: string; reason: string }[];
}

const emptyReport = (at: string): GroupReport => ({
  at,
  read: 0,
  failed: [],
  ordersApplied: [],
  rescued: [],
  ordersRefused: [],
});

/** Der Token dient beim LESEN nur dem Abruf-Limit, nicht der Berechtigung. */
async function readToken(): Promise<string> {
  const sync = await SyncSettingsRepo.get();
  return sync.token;
}

/**
 * Das eigene Regal hinstellen oder aktualisieren.
 *
 * Legt die Ablage beim ersten Mal an. Ohne freigegebene Bögen wird trotzdem
 * geschrieben — ein leeres Regal ist die richtige Antwort auf „ich habe alles
 * wieder zurückgezogen", und stillschweigend das alte stehen zu lassen wäre
 * falsch.
 */
export async function publishShelf(): Promise<{ gistId: string; shared: number }> {
  const settings = await loadGroupSettings();
  const sync = await SyncSettingsRepo.get();
  if (sync.token === "") {
    throw new SyncError(
      "Zum Freigeben brauchst du einen eigenen GitHub-Zugang — das ist derselbe, den der Geräte-Abgleich benutzt. Lesen geht ohne, Schreiben nicht.",
    );
  }

  const gistId = settings.myGistId === "" ? await findOrCreateShelfGist(sync.token) : settings.myGistId;

  const characters = (await db.characters.toArray()).map(hydrateCharacterRow);
  const homebrew = (await db.entities.where("source").equals("homebrew").toArray()).map(hydrateEntityRow);
  const houseRulesRow = await db.settings.get("houseRules");

  const shelf = buildShelf({
    owner: settings.myName,
    gamemaster: settings.iAmGamemaster,
    characters,
    sharedCharacterIds: settings.sharedCharacterIds,
    homebrewEntities: homebrew,
    ...(houseRulesRow?.value === undefined ? {} : { houseRules: houseRulesRow.value as never }),
    orders: settings.iAmGamemaster ? await outgoingOrders() : [],
    now: new Date().toISOString(),
  });

  await writeShelf(sync.token, gistId, shelf, settings.myPassphrase);
  if (settings.myGistId !== gistId) {
    await mutateGroupSettings((s) => void (s.myGistId = gistId));
  }
  return { gistId, shared: shelf.characters.length };
}

/**
 * Offene Aufträge, die ich als Spielleiter ausgestellt habe.
 *
 * Sie liegen in den Einstellungen und nicht im Charakter: es sind Nachrichten an
 * jemand anderen, keine Eigenschaft einer Figur. Beim Veröffentlichen wandern sie
 * mit ins Regal.
 */
export async function outgoingOrders() {
  const settings = await loadGroupSettings();
  return settings.outgoingOrders;
}

/** Alle abonnierten Regale abholen und dabei Aufträge anwenden. */
export async function refreshGroup(): Promise<GroupReport> {
  const now = new Date().toISOString();
  const report = emptyReport(now);
  const settings = await loadGroupSettings();
  if (settings.subscriptions.length === 0) return report;

  const token = await readToken();

  /*
    Nacheinander, nicht gleichzeitig. Ohne eigenen Zugang zählt jeder Abruf gegen
    60 je Stunde; vier Regale parallel abzuholen würde beim Fehlschlag auch noch
    vier Meldungen auf einmal ergeben, und man wüsste nicht, welches Kennwort
    falsch war.
  */
  for (const subscription of settings.subscriptions) {
    const label = subscription.label === "" ? subscription.gistId.slice(0, 7) : subscription.label;
    try {
      const { shelf, serverUpdatedAt } = await readShelf(
        subscription.gistId,
        subscription.passphrase,
        token,
      );
      await cacheShelf({ gistId: subscription.gistId, fetchedAt: now, serverUpdatedAt, shelf });
      report.read += shelf.characters.length;

      const applied = await applyOrdersFrom(shelf, subscription.gistId, now);
      report.ordersApplied.push(...applied.applied);
      report.rescued.push(...applied.rescued);
      report.ordersRefused.push(...applied.refused);

      await mutateGroupSettings((s) => {
        const mine = s.subscriptions.find((entry) => entry.gistId === subscription.gistId);
        if (mine) mine.lastReadAt = now;
      });
    } catch (error) {
      report.failed.push({
        label,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return report;
}

/**
 * Aufträge eines Regals anwenden.
 *
 * Jeder Auftrag wird EINZELN in einer Transaktion geschrieben und erst danach als
 * angewendet vermerkt. Bricht es mitten in einer Liste ab, ist der Rest beim
 * nächsten Abholen noch offen — nichts wird doppelt angewendet und nichts
 * übersprungen.
 */
async function applyOrdersFrom(
  shelf: Shelf,
  gistId: string,
  now: string,
): Promise<{ applied: string[]; rescued: string[]; refused: { characterId: string; reason: string }[] }> {
  const settings = await loadGroupSettings();
  const subscription = settings.subscriptions.find((entry) => entry.gistId === gistId);
  const out = {
    applied: [] as string[],
    rescued: [] as string[],
    refused: [] as { characterId: string; reason: string }[],
  };
  if (!subscription) return out;

  const day = now.slice(0, 10);
  const from = shelf.owner === "" ? "Spielleiter" : shelf.owner;

  for (const order of pendingOrders(shelf, subscription)) {
    const row = await db.characters.get(order.characterId);
    const local: Character | undefined = row ? hydrateCharacterRow(row) : undefined;
    const result = applyOrder(order, local, { now, day, from });

    if (result.outcome === "unbekannt") {
      /*
        Nicht mein Bogen. Der Auftrag bleibt OFFEN und wird nicht abgehakt: bekommt
        man den Charakter später (weil man ihn übernimmt), soll er noch greifen.
      */
      continue;
    }
    if (result.outcome === "abgelehnt") {
      out.refused.push({ characterId: order.characterId, reason: result.reason });
      // Abgehakt, sonst meldet dieselbe Ablehnung sich bei jedem Abholen erneut.
      await markApplied(gistId, order.id);
      continue;
    }
    if (result.outcome === "nichts-zu-tun") {
      await markApplied(gistId, order.id);
      continue;
    }

    await db.transaction("rw", db.characters, async () => {
      await db.characters.put(characterSchema.parse(result.next));
      if (result.outcome === "angewendet-mit-kopie") {
        await db.characters.put(characterSchema.parse(result.rescue));
      }
    });
    await markApplied(gistId, order.id);
    out.applied.push(result.next.name);
    if (result.outcome === "angewendet-mit-kopie") out.rescued.push(result.rescue.name);
  }
  return out;
}

async function markApplied(gistId: string, orderId: string): Promise<void> {
  await mutateGroupSettings((settings) => {
    const subscription = settings.subscriptions.find((entry) => entry.gistId === gistId);
    if (subscription && !subscription.appliedOrderIds.includes(orderId)) {
      subscription.appliedOrderIds.push(orderId);
    }
  });
}
