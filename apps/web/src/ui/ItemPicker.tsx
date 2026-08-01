import { useMemo, useState } from "react";
import {
  ITEM_GROUPS,
  groupItems,
  isEpicItem,
  itemSubgroupOf,
  scrollInfo,
  type Entity,
  type ItemEntity,
  type ItemGroup,
} from "@codex35/core";
import { S } from "../strings.js";
import { Chip, GhostButton, SearchInput } from "./bits.js";
import { buildItemSearchIndex, groupForQuery, searchItems } from "./itemSearch.js";
import { ItemName, ItemText } from "./ItemName.js";
import { itemSummary } from "./itemSummary.js";

/**
 * Gegenstände AUSWÄHLEN, indem man blättert — nicht indem man rät.
 *
 * Der Anlass, wörtlich: „wenn ich den englischen Begriff nicht genau kenne finde
 * ich nichts. Daher will ich Einblick in das ganze Inventar bekommen das laut
 * Regelwerk zur Verfügung steht. Gruppiert nach Kategorie […] Ich finde in der
 * Liste nämlich keine Rüstungen (Armor)."
 *
 * Vorher gab es nur eine Suche: sie zeigte erst ab zwei getippten Buchstaben
 * etwas, dann höchstens 20 Treffer, unsortiert. „armor" lieferte unter den ersten
 * 20 keine einzige Rüstung, weil die zwölf echten „Banded mail", „Full plate"
 * und „Chain shirt" heißen. Blättern war gar nicht vorgesehen.
 *
 * Jetzt: zwölf Gruppen mit Anzahl auf einem Bildschirm, ein Tap in die Gruppe,
 * eine Ebene Untergruppen wo es hilft. Rüstung & Schilde sind damit 18 Zeilen
 * ohne ein einziges getipptes Zeichen. Die Suche bleibt und greift ab dem ersten
 * Zeichen — sie ist nur nicht mehr die einzige Tür.
 */

/** Wie viele Treffer je Gruppe die Suche zeigt, bevor sie auf die Gruppe verweist. */
const HITS_PER_GROUP = 8;

export function ItemPicker({
  compendium,
  onPick,
  startGroup,
}: {
  compendium: Map<string, Entity>;
  onPick: (entity: ItemEntity) => void;
  /** Wo die Auswahl aufschlägt — im Assistenten sinnvollerweise die Ausrüstung. */
  startGroup?: ItemGroup;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<ItemGroup | null>(startGroup ?? null);
  const [subgroup, setSubgroup] = useState<string | null>(null);
  const [showEpic, setShowEpic] = useState(false);

  const grouped = useMemo(() => groupItems(compendium), [compendium]);
  const index = useMemo(
    () => buildItemSearchIndex([...grouped.values()].flat()),
    [grouped],
  );
  const epicCount = useMemo(
    () => [...grouped.values()].flat().filter(isEpicItem).length,
    [grouped],
  );

  /** Episches ist ausgeblendet, aber gezählt — verschwiegen wird nichts. */
  const visible = (list: ItemEntity[]) => (showEpic ? list : list.filter((e) => !isEpicItem(e)));

  const q = query.trim();
  const searchHits = useMemo(() => (q === "" ? [] : searchItems(index, q)), [index, q]);
  const queryGroup = q === "" ? undefined : groupForQuery(q);

  // --- Suche: Treffer nach Gruppe, jede mit ihrer Zahl ----------------------
  if (q !== "") {
    return (
      <div className="space-y-2">
        <SearchInput value={query} onChange={setQuery} placeholder={S.actions.search} />
        {/*
          Ein Gruppentreffer steht ZUERST. Ohne ihn ist „trank" eine Suche ohne
          Ergebnis, obwohl es 85 Tränke gibt — keiner von ihnen hat das Wort im
          Namen.
        */}
        {queryGroup !== undefined && (
          <button
            onClick={() => {
              setGroup(queryGroup);
              setSubgroup(null);
              setQuery("");
            }}
            className="w-full rounded-lg border border-amber-700/60 bg-amber-950/30 px-2.5 py-2 text-left text-sm text-amber-200"
          >
            {S.items.groupHit(
              S.items.groups[queryGroup] ?? queryGroup,
              visible(grouped.get(queryGroup) ?? []).length,
            )}
          </button>
        )}
        {searchHits.map(({ group: hitGroup, items }) => {
          const shown = visible(items);
          if (shown.length === 0) return null;
          return (
            <section key={hitGroup}>
              <div className="flex items-baseline justify-between border-b border-slate-700 pb-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {S.items.groups[hitGroup] ?? hitGroup}
                </span>
                <span className="text-[11px] text-slate-500">{shown.length}</span>
              </div>
              <ul className="divide-y divide-slate-800">
                {shown.slice(0, HITS_PER_GROUP).map((entity) => (
                  <ItemRow key={entity.id} entity={entity} onPick={onPick} />
                ))}
              </ul>
              {shown.length > HITS_PER_GROUP && (
                <GhostButton
                  onClick={() => {
                    setGroup(hitGroup);
                    setSubgroup(null);
                    setQuery("");
                  }}
                >
                  {S.items.moreInGroup(shown.length - HITS_PER_GROUP)}
                </GhostButton>
              )}
            </section>
          );
        })}
        {searchHits.length === 0 && queryGroup === undefined && (
          <p className="py-2 text-sm text-slate-500">{S.compendium.empty}</p>
        )}
        <EpicToggle count={epicCount} on={showEpic} onToggle={() => setShowEpic(!showEpic)} />
      </div>
    );
  }

  // --- Gruppenliste ---------------------------------------------------------
  if (group === null) {
    return (
      <div className="space-y-2">
        <SearchInput value={query} onChange={setQuery} placeholder={S.actions.search} />
        <ul className="divide-y divide-slate-800">
          {ITEM_GROUPS.map((key) => {
            const count = visible(grouped.get(key) ?? []).length;
            if (count === 0) return null;
            return (
              <li key={key}>
                <button
                  onClick={() => {
                    setGroup(key);
                    setSubgroup(null);
                  }}
                  className="flex w-full items-center gap-2 py-2 text-left text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{S.items.groups[key] ?? key}</span>
                  <span className="shrink-0 font-mono text-[11px] text-slate-500">{count}</span>
                  <span className="shrink-0 text-slate-600">›</span>
                </button>
              </li>
            );
          })}
        </ul>
        <EpicToggle count={epicCount} on={showEpic} onToggle={() => setShowEpic(!showEpic)} />
      </div>
    );
  }

  // --- Innerhalb einer Gruppe ----------------------------------------------
  const all = visible(grouped.get(group) ?? []);
  const subgroups = [...new Set(all.map((e) => itemSubgroupOf(e)).filter((s) => s !== undefined))];
  const list = subgroup === null ? all : all.filter((e) => itemSubgroupOf(e) === subgroup);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <GhostButton
          onClick={() => {
            if (subgroup !== null) setSubgroup(null);
            else setGroup(null);
          }}
        >
          ‹ {subgroup !== null ? (S.items.groups[group] ?? group) : S.items.allGroups}
        </GhostButton>
        <span className="text-xs font-semibold text-slate-300">
          {subgroup !== null
            ? (S.items.subgroups[subgroup] ?? subgroup)
            : (S.items.groups[group] ?? group)}
        </span>
        <span className="font-mono text-[11px] text-slate-500">{list.length}</span>
      </div>
      <SearchInput value={query} onChange={setQuery} placeholder={S.actions.search} />

      {/* Untergruppen als Chips — nur wo es mehr als eine gibt. */}
      {subgroup === null && subgroups.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {subgroups.map((key) => (
            <Chip key={key} onClick={() => setSubgroup(key!)}>
              {S.items.subgroups[key!] ?? key} {all.filter((e) => itemSubgroupOf(e) === key).length}
            </Chip>
          ))}
        </div>
      )}

      <ul className="divide-y divide-slate-800">
        {list.map((entity) => (
          <ItemRow
            key={entity.id}
            entity={entity}
            onPick={onPick}
            scroll={group === "scroll" ? scrollInfo(entity, compendium) : undefined}
          />
        ))}
        {list.length === 0 && <li className="py-2 text-sm text-slate-500">{S.compendium.empty}</li>}
      </ul>
    </div>
  );
}

function EpicToggle({
  count,
  on,
  onToggle,
}: {
  count: number;
  on: boolean;
  onToggle: () => void;
}) {
  /*
    Mit ZAHL. Ein Schalter, der sagt, wie viel er wegnimmt, ist keine
    verschwiegene Abschneidung — ein stiller Filter wäre einer.
  */
  return (
    <Chip active={on} onClick={onToggle}>
      {S.items.epicToggle(count)}
    </Chip>
  );
}

function ItemRow({
  entity,
  onPick,
  scroll,
}: {
  entity: ItemEntity;
  onPick: (entity: ItemEntity) => void;
  scroll?: { grade: number; tradition: "arcane" | "divine" } | undefined;
}) {
  /*
    Die Erklärung ist EINGEKLAPPT. Ausgeklappt wären es bei 78 Waffen 78 Absätze
    auf einem Handy-Bildschirm — man würde nicht mehr vergleichen können, und
    genau dafür ist die Liste da. Ein Tipp auf den Namen zeigt sie.
  */
  const [open, setOpen] = useState(false);
  const summary = itemSummary(entity);
  const scrollText =
    scroll === undefined
      ? undefined
      : S.items.scrollGrade(
          scroll.grade,
          scroll.tradition === "arcane" ? S.items.arcane : S.items.divine,
        );
  return (
    <li className="py-1.5">
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm">
            <ItemName entity={entity} />
          </div>
          {(scrollText !== undefined || summary !== "") && (
            <div className="truncate text-[11px] text-slate-500">
              {[scrollText, summary].filter((p) => p !== undefined && p !== "").join(" · ")}
            </div>
          )}
        </button>
        <GhostButton onClick={() => onPick(entity)}>{S.actions.add}</GhostButton>
      </div>
      {open && <ItemText entity={entity} />}
    </li>
  );
}
