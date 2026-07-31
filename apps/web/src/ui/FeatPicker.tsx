import { useMemo, useState } from "react";
import {
  displayName,
  featEligibility,
  type DerivedSheet,
  type Entity,
  type FeatEligibility,
} from "@codex35/core";
import { S } from "../strings.js";
import { Chip, GhostButton, SearchInput } from "./bits.js";
import { FeatText } from "./FeatText.js";
import { featBonuses, featOneLiner } from "./featSummary.js";

/**
 * Talente AUSWÄHLEN, und zwar mit offenen Karten.
 *
 * Sein Auftrag, wörtlich: „Es muss klar sein, welche Vorraussetzungen die Talente
 * haben. Dann sollte es auch verhindert werden, dass ich ein Talent wählen kann für
 * das ich die Mindestanforderungen nicht erfülle. Grundsätzlich sollte einfach bei der
 * Wahl der Talente klar sein was der Effekt und Bonus sind."
 *
 * Vorher gab es DREI Talentauswahlen mit eigenem Code — im Assistenten, im
 * Stufenaufstieg und im Talente-Reiter. Alle drei zeigten nur Name und Erklärung,
 * keine einzige die Voraussetzungen, und alle drei schnitten nach 60 Einträgen ab.
 * Dieselbe Lage wie bei der Ausrüstung, die schon einmal mit einem gemeinsamen
 * `ItemPicker` gelöst wurde.
 *
 * Drei Entscheidungen, die er getroffen hat:
 *
 * 1. **Gesperrt, aber mit Notausgang.** Nicht erfüllte Talente stehen unten und sind
 *    nicht direkt antippbar; wer eines doch will, bestätigt eine Rückfrage. Der
 *    Grundsatz dieses Projekts bleibt damit gewahrt — „der DM hat Recht, nicht die
 *    App" —, ohne dass man versehentlich Unerlaubtes nimmt.
 * 2. **Zwei Abschnitte**, nicht ausgegraut dazwischen und nicht versteckt.
 * 3. **Ein Satz je Zeile**, der Rest beim Antippen.
 *
 * Dazu eine Entscheidung, die die Daten aufgedrängt haben: **131 der 327 Talente sind
 * EPISCHE** (Stufe 21+). Sie sind standardmäßig aus — ohne das wäre die Hälfte der
 * Liste für seine Stufe-7-Runde bedeutungslos. Derselbe Schalter wie beim
 * Gegenstands-Blätterer.
 */

/** Woran man ein episches Talent erkennt — die Art trägt es als Wort. */
function isEpic(feat: Entity): boolean {
  return feat.kind === "feat" && /epic/i.test(feat.data.featType);
}

/** Die Art ohne den Epik-Zusatz („Metamagic, Epic" → „Metamagic"). */
function baseType(feat: Entity): string {
  if (feat.kind !== "feat") return "General";
  const parts = feat.data.featType.split(",").map((p) => p.trim()).filter((p) => !/^epic$/i.test(p));
  return parts[0] ?? "Epic";
}

export function FeatPicker(props: {
  compendium: ReadonlyMap<string, Entity>;
  /**
   * Der abgeleitete Bogen. Fehlt er (im Assistenten, solange Volk oder Klasse nicht
   * stehen), wird NICHT gesperrt — geraten wird nicht, und es steht dabei, warum.
   */
  sheet: DerivedSheet | undefined;
  /** Schon gewählte Talent-IDs. */
  chosen: string[];
  onPick: (feat: Entity) => void;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [showEpic, setShowEpic] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [askId, setAskId] = useState<string | null>(null);

  const skillName = (id: string) => {
    const entity = props.compendium.get(id);
    return entity ? displayName(entity) : undefined;
  };

  const all = useMemo(
    () =>
      [...props.compendium.values()]
        .filter((e) => e.kind === "feat" && !e.deletedAt)
        .sort((a, b) => displayName(a).localeCompare(displayName(b))),
    [props.compendium],
  );

  /** Die Arten, die WIRKLICH vorkommen — auch aus eigenen Büchern. */
  const types = useMemo(() => {
    const seen = new Set<string>();
    for (const feat of all) if (!isEpic(feat)) seen.add(baseType(feat));
    return [...seen].sort((a, b) => (S.feats.types[a] ?? a).localeCompare(S.feats.types[b] ?? b));
  }, [all]);

  const chosenSet = new Set(props.chosen);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((feat) => showEpic || !isEpic(feat))
      .filter((feat) => type === null || baseType(feat) === type)
      .filter((feat) => {
        if (q === "") return true;
        // Deutsch UND englisch durchsuchen: er kennt manche Talente nur unter dem
        // einen Namen, manche nur unter dem anderen.
        const german = feat.localized?.de?.name ?? "";
        const summary = feat.localized?.de?.summary ?? "";
        return (
          feat.name.toLowerCase().includes(q) ||
          german.toLowerCase().includes(q) ||
          summary.toLowerCase().includes(q)
        );
      })
      .map((feat) => ({
        feat,
        eligibility:
          props.sheet === undefined
            ? ({ lines: [], eligible: true, missing: [], unverifiable: [] } as FeatEligibility)
            : featEligibility(feat, props.sheet, props.compendium),
      }));
  }, [all, query, type, showEpic, props.sheet, props.compendium]);

  const eligible = rows.filter((r) => r.eligibility.eligible);
  const blocked = rows.filter((r) => !r.eligibility.eligible);

  const row = (entry: (typeof rows)[number]) => {
    const { feat, eligibility } = entry;
    const stackable = feat.kind === "feat" && feat.data.stackable;
    const already = chosenSet.has(feat.id);
    const open = openId === feat.id;
    const asking = askId === feat.id;

    const pick = () => {
      props.onPick(feat);
      setAskId(null);
    };

    return (
      <li key={feat.id} className={`py-2 ${eligibility.eligible ? "" : "opacity-70"}`}>
        <div className="flex items-start justify-between gap-2">
          {/* Die ganze Zeile klappt auf — das Ziel ist groß, weil am Tisch mit dem
              Daumen getippt wird. */}
          <button
            onClick={() => setOpenId(open ? null : feat.id)}
            className="min-w-0 flex-1 text-left"
            aria-expanded={open}
          >
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="text-sm font-medium">{displayName(feat)}</span>
              {already && (
                <span className="text-[10px] uppercase tracking-wide text-amber-400/80">
                  {stackable ? S.feats.againOk : S.feats.already}
                </span>
              )}
            </div>
            <OneLiner feat={feat} />
            <Marks eligibility={eligibility} feat={feat} skillName={skillName} />
          </button>

          {!already || stackable ? (
            eligibility.eligible ? (
              <GhostButton onClick={pick}>{S.actions.add}</GhostButton>
            ) : (
              <GhostButton onClick={() => setAskId(asking ? null : feat.id)}>
                {S.actions.add}
              </GhostButton>
            )
          ) : null}
        </div>

        {/*
          Der Notausgang. Bewusst als Rückfrage an der Zeile und nicht als Dialog:
          er soll sehen, WAS fehlt, während er bestätigt.
        */}
        {asking && (
          <div className="mt-1.5 rounded-lg border border-amber-800/60 bg-amber-950/20 p-2">
            <p className="text-[11px] leading-snug text-amber-200">
              {S.feats.overrideAsk(eligibility.missing)}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-slate-400">
              {S.feats.overrideNote}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <GhostButton onClick={pick}>{S.feats.overrideYes}</GhostButton>
              <GhostButton onClick={() => setAskId(null)}>{S.feats.overrideNo}</GhostButton>
            </div>
          </div>
        )}

        {open && (
          <div className="mt-1 border-l-2 border-slate-700 pl-2">
            <FeatText entity={feat} />
            {eligibility.lines.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {eligibility.lines.map((line, i) => (
                  <li key={i} className="text-[11px] leading-snug">
                    {line.checkable ? (
                      <span className={line.met ? "text-emerald-400" : "text-amber-400"}>
                        {line.met ? "✓" : "✗"} {line.label}
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        ? {line.label} — {S.feats.unverifiable}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {eligibility.unverifiable.length > 0 && (
              <p className="mt-1 text-[10px] leading-snug text-slate-600">
                {S.feats.unverifiableHint}
              </p>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-2">
      <SearchInput value={query} onChange={setQuery} placeholder={S.actions.search} />

      <div className="flex flex-wrap gap-1.5">
        <Chip active={type === null} onClick={() => setType(null)}>
          {S.feats.allTypes}
        </Chip>
        {types.map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(t)}>
            {S.feats.types[t] ?? t}
          </Chip>
        ))}
        <Chip active={showEpic} onClick={() => setShowEpic(!showEpic)}>
          {S.feats.showEpic}
        </Chip>
      </div>
      {showEpic && <p className="text-[10px] text-slate-500">{S.feats.epicHint}</p>}
      {props.sheet === undefined && (
        <p className="text-[11px] text-amber-400/80">{S.feats.noSheetYet}</p>
      )}

      {rows.length === 0 && <p className="py-4 text-center text-sm text-slate-500">{S.feats.noMatches}</p>}

      {eligible.length > 0 && (
        <div>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-400/80">
            {S.feats.eligible} ({eligible.length})
          </h3>
          <ul className="divide-y divide-slate-800">{eligible.map(row)}</ul>
        </div>
      )}

      {/*
        Nicht erfüllte unten in einem eigenen Abschnitt — seine Wahl. Nicht
        ausgeblendet: er will sehen, was später kommt und was dafür fehlt.
      */}
      {blocked.length > 0 && (
        <div className="pt-1">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            {S.feats.blocked} ({blocked.length})
          </h3>
          <ul className="divide-y divide-slate-800">{blocked.map(row)}</ul>
        </div>
      )}
    </div>
  );
}

/** Der eine Satz. Bei englischem Text steht dabei, dass er englisch ist. */
function OneLiner({ feat }: { feat: Entity }) {
  const { text, german } = featOneLiner(feat);
  if (text === "") return null;
  return (
    <p className={`mt-0.5 text-xs leading-snug ${german ? "text-slate-300" : "text-slate-400"}`}>
      {text}
      {!german && <span className="ml-1 text-[10px] text-slate-600">({S.feats.onlyEnglish})</span>}
    </p>
  );
}

/**
 * Die Marken unter dem Satz: was es bringt, und was es braucht.
 *
 * Erfüllte Voraussetzungen stehen NICHT dran — sonst trägt jede Zeile fünf Marken,
 * von denen vier nichts zu sagen haben. Vollständig sind sie beim Aufklappen.
 */
function Marks(props: {
  feat: Entity;
  eligibility: FeatEligibility;
  skillName: (id: string) => string | undefined;
}) {
  const bonuses = featBonuses(props.feat, props.skillName);
  const { missing, unverifiable } = props.eligibility;
  if (bonuses.length === 0 && missing.length === 0 && unverifiable.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {bonuses.map((text) => (
        <span
          key={text}
          className="rounded bg-emerald-950/50 px-1.5 py-0.5 text-[10px] text-emerald-300"
        >
          {text}
        </span>
      ))}
      {missing.map((text) => (
        <span
          key={text}
          className="rounded bg-amber-950/50 px-1.5 py-0.5 text-[10px] text-amber-300"
        >
          {S.feats.requires} {text}
        </span>
      ))}
      {unverifiable.length > 0 && (
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
          ? {S.feats.unverifiable}
        </span>
      )}
    </div>
  );
}
