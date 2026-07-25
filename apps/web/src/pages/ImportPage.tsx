import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  displayName,
  importFightClubXml,
  type ImportIssue,
  type ImportResultPc,
} from "@codex35/core";
import { S } from "../strings.js";
import { CharacterRepo } from "../db/repo.js";
import { useCompendium, useHouseRules } from "../lib/hooks.js";
import { Card, GhostButton, PrimaryButton, SectionTitle, fmtMod } from "../ui/bits.js";

export function ImportPage() {
  const navigate = useNavigate();
  const compendium = useCompendium();
  const houseRules = useHouseRules();
  const [results, setResults] = useState<ImportResultPc[] | null>(null);
  const [fileIssues, setFileIssues] = useState<ImportIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    setError(null);
    setResults(null);
    if (!compendium) return;
    try {
      const xml = await file.text();
      const { results: parsed, issues } = importFightClubXml(xml, compendium, {
        idFactory: () => crypto.randomUUID(),
        houseRules,
      });
      setFileIssues(issues);
      setResults(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const apply = async () => {
    if (!results || results.length === 0) return;
    setBusy(true);
    for (const result of results) await CharacterRepo.insert(result.character);
    setBusy(false);
    if (results.length === 1) {
      void navigate({ to: "/charaktere/$charId", params: { charId: results[0]!.character.id } });
    } else {
      void navigate({ to: "/" });
    }
  };

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">{S.import.title}</h1>

      <Card>
        <p className="mb-3 text-xs leading-relaxed text-slate-400">{S.import.hint}</p>
        <label className="inline-block cursor-pointer rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500">
          📂 {S.import.pick}
          <input
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {!compendium && <p className="mt-2 text-xs text-slate-500">{S.misc.loading}</p>}
      </Card>

      {error && (
        <Card className="border-red-800/60">
          <p className="text-sm text-red-400">
            {S.import.failed}: {error}
          </p>
        </Card>
      )}

      {fileIssues.map((issue, i) => (
        <Card key={i} className="border-amber-800/60">
          <p className="text-sm text-amber-300">{issue.message}</p>
        </Card>
      ))}

      {results?.length === 0 && (
        <Card>
          <p className="text-sm text-slate-400">{S.import.nothing}</p>
        </Card>
      )}

      {results?.map((result) => (
        <ImportPreview key={result.character.id} result={result} />
      ))}

      {results && results.length > 0 && (
        <div className="flex justify-between">
          <Link to="/">
            <GhostButton>{S.actions.cancel}</GhostButton>
          </Link>
          <PrimaryButton disabled={busy} onClick={() => void apply()}>
            ✓ {S.import.apply} ({results.length})
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

function ImportPreview({ result }: { result: ImportResultPc }) {
  const compendium = useCompendium();
  const { character, issues, comparisons } = result;
  const race = compendium?.get(character.raceId);
  const classSummary = new Map<string, number>();
  for (const level of character.levels) {
    classSummary.set(level.classId, (classSummary.get(level.classId) ?? 0) + 1);
  }
  const classText = [...classSummary.entries()]
    .map(([id, count]) => {
      const cls = compendium?.get(id);
      return `${cls ? displayName(cls) : id} ${count}`;
    })
    .join(" / ");

  const errors = issues.filter((i) => i.severity === "error");
  const notes = issues.filter((i) => i.severity !== "error");

  return (
    <Card>
      <div className="mb-2">
        <div className="text-base font-semibold">{character.name}</div>
        <div className="text-sm text-slate-400">
          {race ? displayName(race) : "Volk unbekannt"} · {classText} · {S.sheet.level}{" "}
          {character.levels.length}
          {character.hp.overrideMax !== undefined &&
            ` · ${S.sheet.hp} ${character.hp.overrideMax - character.hp.damage}/${character.hp.overrideMax}`}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {character.feats.length} Talente · {Object.keys(character.skillRanks).length} Fertigkeiten
          mit Rängen · {character.inventory.length} Gegenstände
        </div>
      </div>

      {errors.length > 0 && (
        <ul className="mb-2 list-inside list-disc space-y-0.5 text-xs text-red-400">
          {errors.map((issue, i) => (
            <li key={i}>{issue.message}</li>
          ))}
        </ul>
      )}

      <SectionTitle>{S.import.comparison}</SectionTitle>
      {comparisons.length === 0 ? (
        <p className="text-xs text-emerald-400">{S.import.matches}</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {comparisons.map((c, i) => (
            <li key={i}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-300">{c.label}</span>
                <span className="font-mono text-slate-500">
                  {fmtMod(c.imported)}
                  {c.status !== "match" && ` → ${fmtMod(c.derived)}`}
                </span>
                <span
                  className={`shrink-0 font-medium ${
                    c.status === "match"
                      ? "text-emerald-400"
                      : c.status === "reconciled"
                        ? "text-sky-400"
                        : "text-amber-400"
                  }`}
                >
                  {c.status === "match"
                    ? `✓ ${S.import.matchLabel}`
                    : c.status === "reconciled"
                      ? S.import.reconciled
                      : S.import.reportedOnly}
                </span>
              </div>
              {c.hint && <div className="text-[10px] leading-snug text-slate-500">{c.hint}</div>}
            </li>
          ))}
        </ul>
      )}

      {notes.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-400">
            {S.import.notes} ({notes.length})
          </summary>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-slate-400">
            {notes.map((issue, i) => (
              <li key={i}>{issue.message}</li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
