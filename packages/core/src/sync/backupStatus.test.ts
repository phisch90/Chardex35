import { describe, expect, it } from "vitest";
import { backupStatus, type BackupInput } from "./backupStatus.js";

/**
 * Der Anlass steht im Modul: die Startbildschirm-App auf iOS hatte einen eigenen,
 * leeren Speicher, und nichts in der Oberfläche hatte je gesagt, dass es nur
 * diese eine Kopie gibt. Hier ist festgehalten, wann gewarnt wird — und wann
 * bewusst nicht, damit die Warnung nicht zum Dauerrauschen wird.
 */
const NOW = "2026-07-27T12:00:00Z";
const input = (patch: Partial<BackupInput> = {}): BackupInput => ({
  now: NOW,
  characterCount: 1,
  syncConnected: false,
  lastSyncAt: "",
  lastExportAt: "",
  ...patch,
});

const daysAgo = (days: number) =>
  new Date(Date.parse(NOW) - days * 86_400_000).toISOString();

describe("backupStatus", () => {
  it("warnt, wenn es nur diesen einen Speicher gibt", () => {
    const status = backupStatus(input());
    expect(status.tone).toBe("warnung");
    expect(status.message).toContain("NUR in diesem Browser-Speicher");
    expect(status.ageDays).toBeNull();
  });

  it("schweigt ohne Charaktere — es gibt nichts zu verlieren", () => {
    expect(backupStatus(input({ characterCount: 0 })).tone).toBe("ok");
  });

  it("ist zufrieden mit einem frischen Abgleich", () => {
    const status = backupStatus(input({ syncConnected: true, lastSyncAt: daysAgo(1) }));
    expect(status.tone).toBe("ok");
    expect(status.message).toContain("gestern");
    expect(status.ageDays).toBe(1);
  });

  it("mahnt einen eingeschlafenen Abgleich", () => {
    expect(backupStatus(input({ syncConnected: true, lastSyncAt: daysAgo(8) })).tone).toBe("hinweis");
    // Genau an der Grenze noch in Ordnung.
    expect(backupStatus(input({ syncConnected: true, lastSyncAt: daysAgo(7) })).tone).toBe("ok");
  });

  it("mahnt einen eingerichteten, aber nie gelaufenen Abgleich", () => {
    const status = backupStatus(input({ syncConnected: true }));
    expect(status.tone).toBe("hinweis");
    expect(status.message).toContain("noch nie");
  });

  it("nimmt eine frische Export-Datei als Sicherung an", () => {
    const status = backupStatus(input({ lastExportAt: daysAgo(3) }));
    expect(status.tone).toBe("ok");
    expect(status.message).toContain("vor 3 Tagen");
  });

  it("wird bei einer alten Export-Datei zum Hinweis", () => {
    expect(backupStatus(input({ lastExportAt: daysAgo(15) })).tone).toBe("hinweis");
    expect(backupStatus(input({ lastExportAt: daysAgo(14) })).tone).toBe("ok");
  });

  it("nimmt für das Alter die jüngste Kopie, egal woher", () => {
    const status = backupStatus(
      input({ syncConnected: true, lastSyncAt: daysAgo(9), lastExportAt: daysAgo(2) }),
    );
    // Der Abgleich ist eingeschlafen — aber die Datei von vorgestern zählt.
    expect(status.ageDays).toBe(2);
  });

  it("verträgt kaputte Zeitstempel, statt NaN anzuzeigen", () => {
    const status = backupStatus(input({ lastExportAt: "irgendwas" }));
    expect(status.tone).toBe("warnung");
    expect(status.ageDays).toBeNull();
  });

  it("sagt heute, wenn es heute passiert ist", () => {
    expect(backupStatus(input({ lastExportAt: NOW })).message).toContain("heute");
  });
});
