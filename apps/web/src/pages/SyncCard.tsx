import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db.js";
import { Card, GhostButton, PrimaryButton, SectionTitle } from "../ui/bits.js";
import { useSyncStatus } from "../sync/SyncGate.js";
import { connectSync, disconnectSync, syncNow, type SyncReport } from "../sync/sync.js";
import { gistUrl } from "../sync/gist.js";
import {
  SYNC_SETTINGS_KEY,
  SyncSettingsRepo,
  guessDeviceName,
  isSyncConfigured,
  parseSyncSettings,
} from "../sync/syncSettings.js";

/** Direktlink auf ein Token mit GENAU der einen nötigen Berechtigung. */
const TOKEN_URL = "https://github.com/settings/tokens/new?scopes=gist&description=Chardex35";

export function SyncCard() {
  const row = useLiveQuery(() => db.settings.get(SYNC_SETTINGS_KEY), []);
  const settings = row === undefined ? null : parseSyncSettings(row.value);
  const connected = settings !== null && isSyncConfigured(settings);

  return (
    <Card>
      <SectionTitle>Geräte-Abgleich</SectionTitle>
      {connected && settings ? (
        <Connected
          gistId={settings.gistId}
          auto={settings.auto}
          deviceName={settings.deviceName}
        />
      ) : (
        <Setup />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Noch nicht eingerichtet
// ---------------------------------------------------------------------------

function Setup() {
  const [token, setToken] = useState("");
  const [device, setDevice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SyncReport | null>(null);

  useEffect(() => {
    setDevice(guessDeviceName(navigator.userAgent));
  }, []);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      setReport(await connectSync(token, device));
      setToken("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-400">
        Damit liegen deine Charaktere in einem <strong>privaten Gist</strong> in deinem
        GitHub-Konto. Jedes Gerät, auf dem du dasselbe Token einträgst, zieht sich den Stand
        automatisch — beim Öffnen der App und nach jeder Änderung.
      </p>

      <ol className="ml-4 list-decimal space-y-1 text-xs text-slate-400">
        <li>
          <a
            href={TOKEN_URL}
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 underline decoration-dotted"
          >
            Token bei GitHub anlegen
          </a>{" "}
          — der Link setzt schon alles: nur die Berechtigung <code>gist</code>, sonst nichts.
          Ablaufdatum nach Geschmack; danach musst du es neu eintragen.
        </li>
        <li>Token kopieren (GitHub zeigt es nur einmal) und hier einfügen.</li>
        <li>
          Auf dem iPad dieselben Schritte — dasselbe Token genügt, die App findet die Ablage
          von allein.
        </li>
      </ol>

      <label className="block">
        <span className="text-xs text-slate-400">Token</span>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="github_pat_… oder ghp_…"
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs text-slate-400">Name dieses Geräts</span>
        <input
          value={device}
          onChange={(e) => setDevice(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-[11px] text-slate-500">
          Steht nur im Namen von Konfliktkopien, falls du denselben Bogen auf beiden Geräten
          gleichzeitig änderst.
        </span>
      </label>

      <PrimaryButton onClick={() => void connect()} disabled={busy || token.trim() === ""}>
        {busy ? "verbinde …" : "Verbinden"}
      </PrimaryButton>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {report && <ReportLine report={report} />}

      <p className="border-t border-slate-800 pt-2 text-[11px] leading-relaxed text-slate-500">
        Das Token bleibt auf diesem Gerät (es steht in keiner Export-Datei). Es darf alle
        Gists deines Kontos lesen und schreiben — mehr nicht, keine Repos. Gibst du ein Gerät
        weg, trenne hier vorher die Verbindung und lösche das Token bei GitHub.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Eingerichtet
// ---------------------------------------------------------------------------

function Connected(props: { gistId: string; auto: boolean; deviceName: string }) {
  const status = useSyncStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sync = async () => {
    setBusy(true);
    setError(null);
    try {
      await syncNow();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("Verbindung trennen? Die Charaktere bleiben auf diesem Gerät.")) return;
    await disconnectSync();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span
          className={
            status.state === "error"
              ? "text-red-400"
              : status.state === "syncing"
                ? "text-slate-300"
                : "text-emerald-400"
          }
        >
          {status.state === "error" ? "⚠" : status.state === "syncing" ? "⟳" : "✓"}
        </span>
        <span>
          {status.state === "syncing"
            ? "gleicht gerade ab …"
            : status.state === "error"
              ? "letzter Abgleich fehlgeschlagen"
              : `abgeglichen ${relativeTime(status.lastSyncAt)}`}
        </span>
      </div>

      {(error ?? status.message) !== "" && status.state === "error" && (
        <p className="text-xs text-red-400">{error ?? status.message}</p>
      )}
      {status.lastReport && <ReportLine report={status.lastReport} />}

      <div className="flex flex-wrap items-center gap-2">
        <PrimaryButton onClick={() => void sync()} disabled={busy || status.state === "syncing"}>
          Jetzt abgleichen
        </PrimaryButton>
        <GhostButton danger onClick={() => void disconnect()}>
          Verbindung trennen
        </GhostButton>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-slate-800 pt-2">
        <span className="min-w-0">
          <span className="text-sm">Von allein abgleichen</span>
          <span className="block text-xs text-slate-500">
            Beim Öffnen der App, bei Rückkehr in den Vordergrund und wenige Sekunden nach jeder
            Änderung.
          </span>
        </span>
        <input
          type="checkbox"
          checked={props.auto}
          onChange={(e) => void SyncSettingsRepo.patch({ auto: e.target.checked })}
          className="h-5 w-9 shrink-0 accent-amber-500"
        />
      </label>

      <label className="block">
        <span className="text-xs text-slate-400">Name dieses Geräts</span>
        <input
          value={props.deviceName}
          onChange={(e) => void SyncSettingsRepo.patch({ deviceName: e.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm"
        />
      </label>

      <p className="text-[11px] text-slate-500">
        Ablage:{" "}
        <a
          href={gistUrl(props.gistId)}
          target="_blank"
          rel="noreferrer"
          className="text-amber-400 underline decoration-dotted"
        >
          privater Gist
        </a>{" "}
        — eine JSON-Datei je Charakter. Du kannst dort jederzeit nachsehen.
      </p>
    </div>
  );
}

function ReportLine({ report }: { report: SyncReport }) {
  const parts: string[] = [];
  if (report.pulled > 0) parts.push(`${report.pulled} geholt`);
  if (report.pushed > 0) parts.push(`${report.pushed} hochgeschrieben`);
  if (parts.length === 0) parts.push("alles war schon gleich");

  return (
    <div className="space-y-1 text-xs">
      <p className="text-slate-400">{parts.join(", ")}.</p>
      {report.conflicts.length > 0 && (
        <p className="text-amber-400">
          Gleichzeitig geändert — als Kopie gesichert, nichts verloren:{" "}
          {report.conflicts.join(", ")}.
        </p>
      )}
      {report.tooBig.length > 0 && (
        <p className="text-amber-400">
          Zu groß für die Ablage (meist ein Porträt): {report.tooBig.join(", ")}. Bleibt lokal
          erhalten.
        </p>
      )}
      {report.skipped.length > 0 && (
        <p className="text-amber-400">Nicht lesbar: {report.skipped.join(", ")}.</p>
      )}
    </div>
  );
}

/** „gerade eben", „vor 5 Min", „vor 3 Std", „am 12.07.". */
export function relativeTime(iso: string, now = new Date()): string {
  if (iso === "") return "noch nie";
  const then = new Date(iso);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (Number.isNaN(seconds)) return "noch nie";
  if (seconds < 45) return "gerade eben";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std`;
  return `am ${then.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}`;
}
