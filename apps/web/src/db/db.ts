import Dexie, { type Table } from "dexie";
import type { Character, Entity } from "@codex35/core";

export interface SettingRow {
  key: string;
  value: unknown;
}

/**
 * Local-first: alles liegt in IndexedDB. Dokumente tragen rev + Tombstones
 * (deletedAt) — das ist der Sync-Seam für später, es gibt keinen Server in v1.
 */
class Codex35DB extends Dexie {
  entities!: Table<Entity, string>;
  characters!: Table<Character, string>;
  settings!: Table<SettingRow, string>;

  constructor() {
    /*
      Der Datenbank-Name bleibt „codex35" — der Projektname vor der Umbenennung
      auf Chardex35. Ein anderer Name zeigt auf eine ANDERE, leere IndexedDB:
      alle vorhandenen Charaktere wären auf einen Schlag unsichtbar. Umbenennen
      geht nur mit Kopier-Migration, und dafür gibt es keinen Grund — der Name
      steht nirgends in der Oberfläche.
    */
    super("codex35");
    this.version(1).stores({
      entities: "id, kind, source, name, sourcePack",
      characters: "id, name, updatedAt",
      settings: "key",
    });
  }
}

export const db = new Codex35DB();
