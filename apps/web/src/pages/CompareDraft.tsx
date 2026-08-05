import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  countDiffEntries,
  deriveSheet,
  diffSheets,
  displayName,
  type Character,
  type Entity,
  type SheetDiffEntry,
} from "@codex35/core";
import { CharacterRepo } from "../db/repo.js";
import { useCharacter, useCompendium, useHouseRules } from "../lib/hooks.js";
import { Card, GhostButton, PrimaryButton, SectionTitle } from "../ui/bits.js";

/**
 * „Was ändert sich denn wirklich?" — Original und Entwurf nebeneinander.
 *
 * Gezeigt wird ausschließlich, was sich unterscheidet. Der Rest ist gleich,
 * und ihn mit aufzulisten würde die Antwort im Rauschen begraben.
 */
export function CompareDraftPage() {
  const { charId } = useParams({ from: "/charaktere/$charId/vergleich" });
  const navigate = useNavigate();
  const draft = useCharacter(charId);
  const origin = useCharacter(draft?.draftOf ?? "");
  const compendium = useCompendium();
  const houseRules = useHouseRules();
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => {
    if (!draft || !origin || !compendium) return null;
    return diffSheets(
      deriveSheet(origin, compendium, houseRules),
      deriveSheet(draft, compendium, houseRules),
    );
  }, [draft, origin, compendium, houseRules]);

  const choices = useMemo(
    () => (draft && origin && compendium ? diffChoices(origin, draft, compendium) : []),
    [draft, origin, compendium],
  );

  if (draft === undefined) return <p className="text-slate-400">…</p>;
  if (draft === null) return <p className="text-slate-400">Entwurf nicht gefunden.</p>;
  if (draft.draftOf === undefined) {
    return (
      <div className="space-y-3">
        <p className="text-slate-400">
          {draft.name} ist ein eigenständiger Charakter, kein Entwurf — es gibt nichts zu
          vergleichen.
        </p>
        <Link to="/charaktere/$charId" params={{ charId }} className="text-amber-400 underline">
          Zum Bogen
        </Link>
      </div>
    );
  }
  if (origin === null) {
    return (
      <div className="space-y-3">
        <p className="text-amber-400">
          Das Original zu diesem Entwurf gibt es nicht mehr. Mach ihn eigenständig, dann bleibt
          er dir erhalten.
        </p>
        <GhostButton onClick={() => void CharacterRepo.promoteDraft(draft)}>
          Eigenständig machen
        </GhostButton>
      </div>
    );
  }

  const total = groups === null ? 0 : countDiffEntries(groups);

  const apply = async () => {
    setBusy(true);
    try {
      await CharacterRepo.applyDraft(draft);
      await navigate({ to: "/charaktere/$charId", params: { charId: draft.draftOf as string } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 pb-14 md:pb-0">
      <div>
        <h1 className="text-xl font-bold">Was ändert sich?</h1>
        <p className="text-sm text-slate-400">
          {origin?.name ?? "Original"} <span className="text-slate-500">→</span> {draft.name}
        </p>
      </div>

      {groups === null && <p className="text-slate-400">rechnet …</p>}

      {groups !== null && total === 0 && choices.length === 0 && (
        <Card>
          <p className="text-sm text-slate-300">
            Kein einziger Unterschied. Der Entwurf steht auf demselben Stand wie das Original —
            bau ihn um, dann erscheint hier, was das bewirkt.
          </p>
        </Card>
      )}

      {groups !== null && (total > 0 || choices.length > 0) && (
        <p className="text-xs text-slate-500">
          {total + choices.length} Unterschied{total + choices.length === 1 ? "" : "e"}. Alles
          nicht Genannte bleibt gleich.
        </p>
      )}

      {/* Sonst sucht man den Fehler in der App: mit festem TP-Maximum bewegt
          sich bei einer neuen Stufe genau der Wert nicht, den man zuerst
          nachschaut. */}
      {draft.hp.overrideMax !== undefined && draft.levels.length !== origin?.levels.length && (
        <Card>
          <p className="text-xs text-amber-400">
            Die maximalen Trefferpunkte sind bei diesem Bogen <strong>fest eingetragen</strong> (
            {draft.hp.overrideMax}) — daher ändert die neue Stufe sie nicht. Im Reiter „Werte"
            unter HP auf „berechnen lassen" stellen, damit die Engine sie ausrechnet.
          </p>
        </Card>
      )}

      {choices.length > 0 && (
        <Card>
          <SectionTitle>Gewählt</SectionTitle>
          <ul className="space-y-1">
            {choices.map((entry) => (
              <li key={entry.label} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                <span
                  className={entry.after === "neu" ? "text-emerald-400" : "text-red-400"}
                >
                  {entry.after === "neu" ? "+ neu" : "entfällt"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {groups?.map((group) => (
        <Card key={group.title}>
          <SectionTitle>{group.title}</SectionTitle>
          <ul className="divide-y divide-slate-800">
            {group.entries.map((entry) => (
              <DiffRow key={entry.label} entry={entry} />
            ))}
          </ul>
        </Card>
      ))}

      <Card>
        <SectionTitle>Und nun?</SectionTitle>
        <p className="mb-2 text-xs text-slate-400">
          Übernehmen schreibt den Entwurf auf {origin?.name ?? "das Original"} — gleiche ID,
          gleiche Trefferpunkt-Lage, der Entwurf verschwindet. Der Abgleich sieht damit eine
          Änderung am bekannten Charakter, keinen zweiten.
        </p>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={() => void apply()} disabled={busy}>
            Übernehmen
          </PrimaryButton>
          <Link
            to="/charaktere/$charId"
            params={{ charId }}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Entwurf weiterbauen
          </Link>
        </div>
      </Card>
    </div>
  );
}

function DiffRow({ entry }: { entry: SheetDiffEntry }) {
  const better = entry.delta === undefined ? null : entry.delta > 0;
  const afterClass = `font-semibold tabular-nums ${
    better === null ? "text-slate-200" : better ? "text-emerald-400" : "text-red-400"
  }`;

  // Zahlen passen in eine Zeile. Textwerte („5/3/2/—/—/…", Klassenlisten) sind
  // zu lang dafür — die haben in einer Zeile das Label auf null gedrückt.
  if (entry.delta === undefined) {
    return (
      <li className="py-1.5 text-sm">
        <div className="text-slate-300">{entry.label}</div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5 text-xs">
          <span className="tabular-nums text-slate-500">{entry.before}</span>
          <span className="text-slate-600">→</span>
          <span className={afterClass}>{entry.after}</span>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-baseline justify-between gap-2 py-1.5 text-sm">
      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
      <span className="shrink-0 tabular-nums text-slate-500">{entry.before}</span>
      <span className="shrink-0 text-slate-600">→</span>
      <span className={`shrink-0 ${afterClass}`}>{entry.after}</span>
      {entry.delta !== 0 && (
        <span
          className={`w-10 shrink-0 text-right text-xs tabular-nums ${
            entry.delta > 0 ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
        </span>
      )}
    </li>
  );
}

/**
 * Getroffene ENTSCHEIDUNGEN vergleichen (Talente, bekannte Zauber) — die
 * stehen im Charakter, nicht im abgeleiteten Bogen, und brauchen das
 * Kompendium für lesbare Namen.
 */
function diffChoices(
  before: Character,
  after: Character,
  compendium: Map<string, Entity>,
): SheetDiffEntry[] {
  const name = (id: string) => {
    const entity = compendium.get(id);
    return entity ? displayName(entity) : id;
  };

  const featLabel = (feat: { featId: string; choice?: string | undefined }) =>
    feat.choice === undefined ? name(feat.featId) : `${name(feat.featId)} (${feat.choice})`;

  const beforeFeats = new Set(before.feats.map(featLabel));
  const afterFeats = new Set(after.feats.map(featLabel));

  const beforeSpells = new Set<string>();
  const afterSpells = new Set<string>();
  for (const [state, into] of [
    [before.spellState, beforeSpells],
    [after.spellState, afterSpells],
  ] as const) {
    for (const [classId, block] of Object.entries(state)) {
      for (const spellId of block.known) into.add(`${name(spellId)} (${name(classId)})`);
    }
  }

  const out: SheetDiffEntry[] = [];
  for (const label of [...afterFeats].filter((f) => !beforeFeats.has(f)).sort()) {
    out.push({ label: `Talent: ${label}`, before: "—", after: "neu" });
  }
  for (const label of [...beforeFeats].filter((f) => !afterFeats.has(f)).sort()) {
    out.push({ label: `Talent: ${label}`, before: "vorhanden", after: "entfällt" });
  }
  for (const label of [...afterSpells].filter((s) => !beforeSpells.has(s)).sort()) {
    out.push({ label: `Zauber: ${label}`, before: "—", after: "neu" });
  }
  for (const label of [...beforeSpells].filter((s) => !afterSpells.has(s)).sort()) {
    out.push({ label: `Zauber: ${label}`, before: "vorhanden", after: "entfällt" });
  }
  return out;
}
