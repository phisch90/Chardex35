import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "@tanstack/react-router";
import type { HouseRules } from "@codex35/core";
import { S } from "../strings.js";
import { db } from "../db/db.js";
import { SettingsRepo } from "../db/repo.js";
import { AppSettingsRepo } from "../db/appSettings.js";
import { useAppSettings, useHouseRules } from "../lib/hooks.js";
import { buildExport, downloadExport, importEnvelope, type ImportResult } from "../lib/transfer.js";
import { Card, GhostButton, PrimaryButton, SectionTitle } from "../ui/bits.js";
import { SyncCard } from "./SyncCard.js";
import { SYNC_SETTINGS_KEY, isSyncConfigured, parseSyncSettings } from "../sync/syncSettings.js";

const oglText = Object.values(
  import.meta.glob("../../../../packs/srd/OGL.txt", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>,
)[0];

export function SettingsPage() {
  const houseRules = useHouseRules();
  const appSettings = useAppSettings();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showLicense, setShowLicense] = useState(false);
  const syncRow = useLiveQuery(() => db.settings.get(SYNC_SETTINGS_KEY), []);
  const syncConnected = syncRow !== undefined && isSyncConfigured(parseSyncSettings(syncRow.value));

  useEffect(() => {
    navigator.storage
      ?.persisted?.()
      .then(setPersisted)
      .catch(() => setPersisted(null));
  }, []);

  const setRule = (patch: Partial<HouseRules>) =>
    void SettingsRepo.setHouseRules({ ...houseRules, ...patch });

  const onImportFile = async (file: File) => {
    setImportError(null);
    setImportResult(null);
    try {
      const raw: unknown = JSON.parse(await file.text());
      setImportResult(await importEnvelope(raw));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{S.nav.settings}</h1>

      {/* Das große Logo hat hier Platz — auf einem App-Symbol wären drei
          Gesichter und die Wortmarke bei 60 px nur Matsch. */}
      <div className="flex flex-col items-center gap-1 py-2">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt={S.appName}
          width={160}
          height={160}
          className="h-40 w-40 rounded-2xl"
        />
        <p className="text-xs text-slate-500">{S.settings.tagline}</p>
      </div>

      <Card>
        <SectionTitle>{S.settings.features}</SectionTitle>
        <Toggle
          label={S.settings.diceEnabled}
          hint={S.settings.diceEnabledHint}
          checked={appSettings.diceEnabled}
          onChange={(v) => void AppSettingsRepo.set({ ...appSettings, diceEnabled: v })}
        />
        <Toggle
          label={S.settings.encumbrance}
          hint={S.settings.encumbranceHint}
          checked={!houseRules.ignoreEncumbrance}
          onChange={(v) => setRule({ ignoreEncumbrance: !v })}
        />
      </Card>

      <Card>
        <SectionTitle>{S.settings.houseRules}</SectionTitle>
        <Toggle
          label={S.settings.maxHpL1}
          checked={houseRules.maxHpFirstLevel}
          onChange={(v) => setRule({ maxHpFirstLevel: v })}
        />
        <Toggle
          label={S.settings.fractional}
          checked={houseRules.fractionalBabAndSaves}
          onChange={(v) => setRule({ fractionalBabAndSaves: v })}
        />
        <Toggle
          label={S.settings.xpPenalty}
          checked={houseRules.multiclassXpPenalty}
          onChange={(v) => setRule({ multiclassXpPenalty: v })}
        />
      </Card>

      <SyncCard />

      <Card>
        <SectionTitle>{S.settings.exportTitle}</SectionTitle>
        <p className="mb-2 text-xs text-slate-400">{S.settings.dataPrivacy}</p>
        <div className="flex flex-wrap items-center gap-2">
          <PrimaryButton onClick={() => void buildExport().then(downloadExport)}>
            {S.settings.exportAll}
          </PrimaryButton>
          <label className="cursor-pointer rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
            {S.settings.importFile}
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImportFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Aus der alten App umsteigen?{" "}
          <Link to="/import" className="text-amber-400 underline decoration-dotted">
            {S.import.title}
          </Link>
        </p>
        {importResult && (
          <p className="mt-2 text-xs text-emerald-400">
            Import: {importResult.charactersAdded + importResult.charactersUpdated} Charaktere,{" "}
            {importResult.entitiesAdded + importResult.entitiesUpdated} Homebrew-Einträge übernommen
            ({importResult.charactersSkipped + importResult.entitiesSkipped} übersprungen).
          </p>
        )}
        {importError && <p className="mt-2 text-xs text-red-400">Import fehlgeschlagen: {importError}</p>}
      </Card>

      <Card>
        <SectionTitle>{S.settings.storage}</SectionTitle>
        <p className={`text-sm ${persisted ? "text-emerald-400" : "text-amber-400"}`}>
          {persisted === null ? "…" : persisted ? S.settings.persisted : S.settings.notPersisted}
        </p>
        {/* Läuft der Abgleich, liegt die Kopie ohnehin außerhalb des Geräts —
            dann ist die Warnung oben nur noch die halbe Wahrheit. */}
        {syncConnected && (
          <p className="mt-1 text-xs text-slate-400">
            Der Geräte-Abgleich hält zusätzlich eine Kopie in deinem privaten Gist. Ein
            Browser, der hier aufräumt, kostet dich damit keinen Charakter.
          </p>
        )}
      </Card>

      <Card>
        <SectionTitle>{S.settings.license}</SectionTitle>
        <p className="mb-2 text-xs text-slate-400">
          Das mitgelieferte Kompendium ist Open Game Content aus dem D&D 3.5 System Reference
          Document, genutzt unter der Open Game License v1.0a. Dieses Werk ist inoffiziell und
          weder von Wizards of the Coast noch von Lion's Den unterstützt.
        </p>
        <GhostButton onClick={() => setShowLicense(!showLicense)}>
          {showLicense ? "Lizenztext ausblenden" : "Lizenztext anzeigen"}
        </GhostButton>
        {showLicense && (
          <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap rounded bg-slate-950 p-2 text-[10px] leading-snug text-slate-400">
            {oglText ?? "OGL.txt liegt nicht im Build (ETL noch nicht gelaufen)."}
          </pre>
        )}
      </Card>
    </div>
  );
}

function Toggle(props: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="min-w-0">
        <span className="text-sm">{props.label}</span>
        {props.hint && <span className="block text-xs text-slate-500">{props.hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="h-5 w-9 shrink-0 accent-amber-500"
      />
    </label>
  );
}
