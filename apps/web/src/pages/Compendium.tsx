import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  classCategory,
  displayName,
  isEpicClass,
  type ClassCategory,
  type ClassEntity,
  type Entity,
  type EntityKind,
  type SpellEntity,
} from "@codex35/core";
import { S } from "../strings.js";
import { useAllEntities, useCompendium } from "../lib/hooks.js";
import { reportSaveFailure } from "../lib/saveError.js";
import { CompendiumRepo } from "../db/repo.js";
import { BackButton } from "../ui/BackButton.js";
import { Card, Chip, SearchInput, fmtMod } from "../ui/bits.js";

const BROWSABLE: EntityKind[] = ["class", "race", "feat", "spell", "item", "skill", "condition"];

/** Wie viele Zeilen die Liste höchstens rendert (Zauber und Gegenstände sind zu viele). */
const LIST_LIMIT = 300;

export function CompendiumPage() {
  const params = useParams({ strict: false }) as { kind?: string };
  const kind = (BROWSABLE as string[]).includes(params.kind ?? "") ? (params.kind as EntityKind) : "class";
  const entities = useAllEntities();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"all" | "srd" | "homebrew">("all");
  /*
    Der Rückweg zum Löschen. Gelöscht heißt in dieser App MARKIERT, nicht entfernt
    (`CompendiumRepo.remove` setzt `deletedAt`) — aber bisher zeigte das niemand an,
    und damit war ein Löschen faktisch endgültig. Ein Schalter ohne Rückweg ist hier
    dasselbe wie Löschen, und selbstgebaute Gegenstände sind Arbeit.
  */
  const [showDeleted, setShowDeleted] = useState(false);

  const deletedCount =
    entities?.filter((e) => e.kind === kind && e.deletedAt !== undefined).length ?? 0;
  /*
    Der WIRKSAME Schalter, nicht der gemerkte. Im gebauten Bogen gesehen: holt man den
    letzten gelöschten Eintrag zurück, verschwindet der Knopf (es gibt nichts mehr zu
    zeigen) — der Zustand blieb aber an, und das Kompendium stand leer da, ohne
    sichtbaren Filter und ohne Weg zurück.

    Genau die Falle, die beim Talentfilter im Kommentar steht: ein Filter, den man
    nicht sieht, ist der Grund, warum eine leere Liste wie ein Fehler aussieht.
  */
  const onlyDeleted = showDeleted && deletedCount > 0;

  /*
    Erst Art + Suche, DANN die Quelle — in dieser Reihenfolge, weil an den
    Quellen-Knöpfen die Trefferzahlen stehen sollen.

    Der Anlass: „der SRD-Knopf funktioniert nicht". Er tat genau, was er sollte —
    nur besteht das Kompendium zu 100 % aus SRD, also änderte „nur SRD" nichts
    Sichtbares und sah kaputt aus. Ein Filter muss zeigen, wie viel er
    wegnimmt, sonst ist er von einem toten Knopf nicht zu unterscheiden.
  */
  const matching = useMemo(() => {
    if (!entities) return undefined;
    const q = query.trim().toLowerCase();
    return entities
      /*
        NUR die Gelöschten, wenn der Schalter an ist — nicht „auch die Gelöschten".
        Erst im gebauten Bogen gesehen: eingereiht zwischen 1866 Gegenständen ist ein
        gelöschter Eintrag unauffindbar, und die Liste hört ohnehin bei 300 auf. Ein
        Rückweg, den man nicht findet, ist keiner.
      */
      .filter((e) =>
        e.kind === kind &&
        (onlyDeleted ? e.deletedAt !== undefined : e.deletedAt === undefined),
      )
      .filter(
        (e) =>
          !q ||
          e.name.toLowerCase().includes(q) ||
          (e.localized?.de?.name ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entities, kind, query, onlyDeleted]);

  const srdCount = matching?.filter((e) => e.source === "srd").length ?? 0;
  const homebrewCount = matching?.filter((e) => e.source === "homebrew").length ?? 0;
  const selected = matching?.filter((e) => source === "all" || e.source === source);
  const list = selected?.slice(0, LIST_LIMIT);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">{S.nav.compendium}</h1>
      <div className="flex flex-wrap gap-2">
        {BROWSABLE.map((k) => (
          <Link key={k} to="/kompendium/$kind" params={{ kind: k }}>
            <Chip active={k === kind}>{S.compendium.kinds[k]}</Chip>
          </Link>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder={S.actions.search} />
        </div>
        <Chip active={source === "srd"} onClick={() => setSource(source === "srd" ? "all" : "srd")}>
          {S.compendium.sourceSrd} {srdCount}
        </Chip>
        <Chip
          active={source === "homebrew"}
          onClick={() => setSource(source === "homebrew" ? "all" : "homebrew")}
        >
          {S.compendium.sourceHomebrew} {homebrewCount}
        </Chip>
      </div>

      {/*
        Nur zeigen, wenn es etwas zu zeigen gibt: ein Schalter, der bei jedem
        Kompendium-Besuch „0" daneben hat, ist Lärm.
      */}
      {deletedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={onlyDeleted} onClick={() => setShowDeleted(!showDeleted)}>
            {S.compendium.showDeleted} {deletedCount}
          </Chip>
          {onlyDeleted && (
            <span className="text-[11px] text-slate-500">{S.compendium.deletedHint}</span>
          )}
        </div>
      )}

      {/* Solange es kein eigenes Homebrew gibt, trennen die Knöpfe nichts. Das
          gehört dahin geschrieben, statt es als wirkungslosen Tap zu erleben. */}
      {matching !== undefined && homebrewCount === 0 && (
        <p className="text-xs text-slate-500">{S.compendium.allSrd}</p>
      )}

      {list === undefined && <p className="text-slate-400">{S.misc.loading}</p>}
      {list?.length === 0 && (
        <p className="py-8 text-center text-slate-400">
          {source === "homebrew" ? S.compendium.emptyHomebrew : S.compendium.empty}
        </p>
      )}

      {/* Die Liste hört bei 300 auf. Bisher schwieg sie dabei — und ein
          Kompendium, das ohne Hinweis unvollständig ist, ist schlimmer als
          eines, das seine Grenze nennt. */}
      {selected !== undefined && list !== undefined && selected.length > list.length && (
        <p className="text-xs text-amber-300/90">
          {S.compendium.capped(list.length, selected.length)}
        </p>
      )}

      {/* Klassen kommen in Gruppen: die 5 NPC-Klassen (Commoner, Warrior …)
          zwischen den spielbaren zu haben, war nur Rauschen. */}
      {list !== undefined && kind === "class"
        ? CLASS_GROUPS.map((group) => {
            const members = list.filter((e) => classCategory(e) === group);
            if (members.length === 0) return null;
            return (
              <div key={group}>
                <h2 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {S.compendium.classGroups[group]} ({members.length})
                </h2>
                <p className="mb-1 text-xs text-slate-500">{S.compendium.classGroupHints[group]}</p>
                <EntityList entities={members} kind={kind} />
              </div>
            );
          })
        : list !== undefined && <EntityList entities={list} kind={kind} />}
    </div>
  );
}

/** Reihenfolge der Klassen-Gruppen: erst das, was Spieler:innen wählen. */
const CLASS_GROUPS: ClassCategory[] = ["base", "prestige", "npc"];

function EntityList({ entities, kind }: { entities: Entity[]; kind: EntityKind }) {
  return (
    <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/50">
      {entities.map((entity) => (
        <li key={entity.id} className={entity.deletedAt === undefined ? "" : "opacity-60"}>
          {/*
            Zurückholen steht NEBEN dem Link, nicht darin: ein Knopf in einem Link
            öffnet beim Tap auch den Link. Dasselbe Muster wie der ⋯-Knopf an der
            Charakterkarte.
          */}
          {entity.deletedAt !== undefined && (
            <div className="flex items-center justify-between gap-2 px-3 pt-2">
              <span className="text-[11px] text-slate-500">{S.compendium.deletedMark}</span>
              <button
                onClick={() => {
                  const write = () => CompendiumRepo.restore(entity);
                  void write().catch((error: unknown) =>
                    reportSaveFailure(entity.name, error, write),
                  );
                }}
                className="shrink-0 rounded border border-emerald-700 px-2 py-0.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-950/50"
              >
                {S.compendium.restore}
              </button>
            </div>
          )}
          <Link
            to="/kompendium/$kind/$entityId"
            params={{ kind, entityId: entity.id }}
            className="flex items-baseline justify-between gap-2 px-3 py-2.5 hover:bg-slate-800/60"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{displayName(entity)}</div>
              {entity.localized?.de?.name && (
                <div className="truncate text-xs text-slate-500">{entity.name}</div>
              )}
              {shortInfo(entity) && (
                <div className="truncate text-xs text-slate-400">{shortInfo(entity)}</div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {entity.kind === "class" && isEpicClass(entity) && (
                <span className="rounded bg-violet-900/60 px-1.5 py-0.5 text-[10px] text-violet-300">
                  {S.compendium.epic}
                </span>
              )}
              {entity.source === "homebrew" && (
                <span className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] text-emerald-300">
                  HB
                </span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function shortInfo(entity: Entity): string {
  switch (entity.kind) {
    case "spell": {
      const levels = Object.entries(entity.data.levels)
        .map(([list, level]) => `${list} ${level}`)
        .join(", ");
      return [entity.data.school, levels].filter(Boolean).join(" · ");
    }
    case "class":
      return `W${entity.data.hitDie} · ${entity.data.levels.length} ${S.sheet.level}n`;
    case "item": {
      const bits: string[] = [entity.data.category];
      if (entity.data.costGp !== undefined) bits.push(`${entity.data.costGp} gp`);
      if (entity.data.weightLb) bits.push(`${entity.data.weightLb} lb`);
      return bits.join(" · ");
    }
    case "feat":
      return entity.data.featType;
    case "condition":
      return entity.data.summary ?? "";
    default:
      return "";
  }
}

export function EntityDetailPage() {
  const { entityId, kind } = useParams({ strict: false }) as { entityId: string; kind?: string };
  const navigate = useNavigate();
  const compendium = useCompendium();
  const entity = compendium?.get(entityId);

  /*
    Ohne Verlauf zurück ins Kompendium — und zwar in die Art, aus der dieser
    Eintrag stammt. Die Art steht im Pfad, nicht am Eintrag: wer eine Klasse
    öffnet, will zur Klassenliste, nicht auf die Startseite des Kompendiums.
  */
  const list = () =>
    void navigate({
      to: "/kompendium/$kind",
      params: { kind: (BROWSABLE as string[]).includes(kind ?? "") ? kind! : "class" },
    });

  if (!compendium)
    return (
      <div className="space-y-3">
        <BackButton fallback={list} />
        <p className="text-slate-400">{S.misc.loading}</p>
      </div>
    );
  if (!entity)
    return (
      <div className="space-y-3">
        <BackButton fallback={list} />
        <p className="text-slate-400">{S.compendium.empty}</p>
      </div>
    );

  return (
    <div className="space-y-3">
      <BackButton fallback={list} />
      <div>
        <h1 className="text-xl font-bold">{displayName(entity)}</h1>
        <p className="text-sm text-slate-400">
          {entity.localized?.de?.name ? `${entity.name} · ` : ""}
          {S.compendium.kinds[entity.kind]} ·{" "}
          {entity.source === "srd" ? S.compendium.sourceSrd : S.compendium.sourceHomebrew}
          {entity.sourcePack ? ` · ${entity.sourcePack}` : ""}
        </p>
      </div>

      {entity.kind === "spell" && <SpellHeader entity={entity} />}
      {entity.kind === "class" && <ClassTable entity={entity} />}

      {entity.localized?.de?.summary && (
        <Card className="text-sm text-amber-100/90">{entity.localized.de.summary}</Card>
      )}

      {(entity.localized?.de?.description ?? entity.description) && (
        <Card>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
            {entity.localized?.de?.description ?? entity.description}
          </div>
        </Card>
      )}

      {entity.effects.length > 0 && (
        <Card>
          <div className="mb-1 text-xs font-semibold uppercase text-slate-400">Effekte</div>
          <ul className="space-y-1 text-sm">
            {entity.effects.map((effect, i) => (
              <li key={i} className="font-mono text-xs">
                {effect.target} {typeof effect.value === "number" ? fmtMod(effect.value) : effect.value}{" "}
                ({effect.bonusType}){effect.condition ? ` — ${effect.condition}` : ""}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function SpellHeader({ entity }: { entity: SpellEntity }) {
  const d = entity.data;
  const rows: [string, string | undefined][] = [
    ["Schule", [d.school, d.subschool].filter(Boolean).join(" ") + (d.descriptors.length ? ` [${d.descriptors.join(", ")}]` : "")],
    ["Grad", Object.entries(d.levels).map(([l, v]) => `${l} ${v}`).join(", ")],
    ["Komponenten", d.components],
    ["Zeitaufwand", d.castingTime],
    ["Reichweite", d.range],
    ["Ziel/Bereich", d.target ?? d.area ?? d.effect],
    ["Dauer", d.duration],
    ["Rettungswurf", d.savingThrow],
    ["Zauberresistenz", d.spellResistance],
  ];
  return (
    <Card>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-slate-400">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      {d.summary && <p className="mt-2 text-sm italic text-slate-300">{d.summary}</p>}
    </Card>
  );
}

function ClassTable({ entity }: { entity: ClassEntity }) {
  const d = entity.data;
  const maxSpellLevel = Math.max(0, ...d.levels.map((r) => r.spellsPerDay?.length ?? 0));
  return (
    <Card>
      <div className="mb-2 text-sm text-slate-300">
        W{d.hitDie} · {d.skillPointsPerLevel} + INT Fertigkeitspunkte
        {d.spellcasting && ` · Zauber (${d.spellcasting.ability.toUpperCase()})`}
      </div>
      <div className="table-scroll">
        <table className="w-full min-w-[480px] text-xs">
          <thead className="text-slate-400">
            <tr>
              <th className="px-1 py-1 text-left">Stufe</th>
              <th className="px-1 text-left">BAB</th>
              <th className="px-1">Fort</th>
              <th className="px-1">Ref</th>
              <th className="px-1">Will</th>
              <th className="px-1 text-left">Besonderes</th>
              {maxSpellLevel > 0 &&
                Array.from({ length: maxSpellLevel }, (_, i) => (
                  <th key={i} className="px-1">
                    {i}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {d.levels.map((row, i) => (
              <tr key={i} className="border-t border-slate-800">
                <td className="px-1 py-1">{i + 1}</td>
                <td className="px-1">{fmtMod(row.bab)}</td>
                <td className="px-1 text-center">{fmtMod(row.fort)}</td>
                <td className="px-1 text-center">{fmtMod(row.ref)}</td>
                <td className="px-1 text-center">{fmtMod(row.will)}</td>
                <td className="px-1">{row.features.map((f) => f.name).join(", ")}</td>
                {maxSpellLevel > 0 &&
                  Array.from({ length: maxSpellLevel }, (_, level) => (
                    <td key={level} className="px-1 text-center">
                      {row.spellsPerDay?.[level] ?? "—"}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
