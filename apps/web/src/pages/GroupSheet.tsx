import { useMemo } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ABILITIES,
  deriveSheet,
  displayName,
  makeWorkCopy,
  resolveCompendium,
  type Character,
  type DerivedSheet,
  type Entity,
  type Shelf,
} from "@codex35/core";
import { S } from "../strings.js";
import { useAllEntities, useHouseRules } from "../lib/hooks.js";
import { useCachedShelves, useGroupSettings } from "../group/useGroup.js";
import { db } from "../db/db.js";
import { BackButton } from "../ui/BackButton.js";
import { Card, GhostButton, SectionTitle, StatButton, fmtMod } from "../ui/bits.js";

/**
 * Der Bogen eines Mitspielers — nur lesen.
 *
 * Bewusst eine EIGENE Ansicht und nicht der übliche Bogen mit gesperrten Knöpfen.
 * Zwei Gründe, und der zweite ist der wichtigere:
 *
 *  1. Am Tisch schaut man in einen fremden Bogen, um EINE Zahl zu finden: wie hoch
 *     ist seine RK, wie viele Trefferpunkte hat er noch, was hat er auf Spot.
 *     Alles auf einmal sichtbar ist dafür besser als sieben Reiter.
 *  2. Der übliche Bogen hat an vierzig Stellen Knöpfe, die schreiben. Sie einzeln
 *     zu sperren hieße, den Bogen umzubauen, der Philipps tägliches Werkzeug ist —
 *     und ein Knopf, der aus Versehen doch schreibt, würde in einen fremden Bogen
 *     schreiben. Was es nicht gibt, kann nicht danebengehen.
 */
export function GroupSheetPage() {
  const { gistId, charId } = useParams({ strict: false }) as { gistId: string; charId: string };
  const navigate = useNavigate();
  const shelves = useCachedShelves();
  const entities = useAllEntities();
  const houseRules = useHouseRules();
  const group = useGroupSettings();

  const found = useMemo(() => {
    const cached = shelves?.find((entry) => entry.gistId === gistId);
    if (!cached || !entities) return undefined;
    const character = cached.shelf.characters.find((row) => row.id === charId);
    if (!character) return null;
    return { shelf: cached.shelf, character };
  }, [shelves, entities, gistId, charId]);

  const sheet = useMemo(() => {
    if (!found || !entities) return undefined;
    return deriveForeign(found.character, found.shelf, entities, houseRules);
  }, [found, entities, houseRules]);

  const back = () => void navigate({ to: "/" });

  /**
   * Arbeitskopie anlegen und hineinspringen.
   *
   * `put` und nicht `add`: ein zweites Bearbeiten trifft absichtlich dieselbe
   * Kopie (gleiche Kennung). Wer den Bogen erneut öffnet, will weitermachen, nicht
   * neben der halbfertigen Fassung eine zweite anfangen.
   */
  const editForPlayer = async () => {
    if (!found) return;
    const copy = makeWorkCopy(found.character, {
      gistId,
      owner: found.shelf.owner,
      now: new Date().toISOString(),
    });
    await db.characters.put(copy);
    await navigate({ to: "/charaktere/$charId", params: { charId: copy.id } });
  };

  if (shelves === undefined || entities === undefined) {
    return <p className="text-slate-400">{S.misc.loading}</p>;
  }
  if (found === null || found === undefined || !sheet) {
    return (
      <div className="space-y-3">
        <BackButton fallback={back} />
        <p className="text-slate-400">{S.group.sheetGone}</p>
      </div>
    );
  }

  const { character, shelf } = found;
  const hpRatio = sheet.hp.max > 0 ? sheet.hp.current / sheet.hp.max : 0;

  return (
    <div className="space-y-3">
      <BackButton fallback={back} />

      {/* Immer zuerst: das ist nicht dein Bogen. Sonst tippt man los und wundert
          sich, dass nichts passiert. */}
      <div className="rounded-lg border border-sky-800/60 bg-sky-950/40 px-3 py-2 text-xs text-sky-200">
        {S.group.readOnlyHint(shelf.owner === "" ? S.group.unknownOwner : shelf.owner)}
      </div>

      {/*
        Der Weg für den Spielleiter: eine Arbeitskopie im eigenen Bestand, mit dem
        gewohnten Bogen bearbeiten, dann abschicken. Direkt hier zu schreiben geht
        nicht — den Schlüssel zu seinem Regal haben wir nicht, und genau das ist
        der Sinn der Sache.
      */}
      {group.iAmGamemaster && (
        <GhostButton onClick={() => void editForPlayer()}>{S.group.editForeign}</GhostButton>
      )}

      <header>
        <h1 className="text-xl font-bold">{character.name}</h1>
        <p className="text-sm text-slate-400">
          {sheet.classLevels.map((c) => `${c.className} ${c.level}`).join(" / ")} · {S.sheet.level}{" "}
          {sheet.totalLevel}
          {sheet.ecl !== sheet.totalLevel && ` (ECL ${sheet.ecl})`}
        </p>
        {character.playerName !== undefined && character.playerName !== "" && (
          <p className="text-xs text-slate-500">{character.playerName}</p>
        )}
      </header>

      <div className="relative h-7 overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
        <div
          className={`absolute inset-y-0 left-0 ${
            hpRatio <= 0.25 ? "bg-red-800/70" : hpRatio <= 0.5 ? "bg-amber-700/60" : "bg-emerald-800/60"
          }`}
          style={{ width: `${Math.max(0, Math.min(100, hpRatio * 100))}%` }}
        />
        <div className="relative flex h-full items-center px-2 text-sm font-bold tabular-nums">
          {S.sheet.hp} {sheet.hp.current}/{sheet.hp.max}
          {sheet.hp.temp > 0 && <span className="text-sky-300"> +{sheet.hp.temp}</span>}
          {sheet.hp.nonlethal > 0 && (
            <span className="text-amber-300"> ({sheet.hp.nonlethal} nichttödl.)</span>
          )}
        </div>
      </div>

      {character.conditionIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {character.conditionIds.map((id) => (
            <span
              key={id}
              className="rounded-full border border-amber-700 bg-amber-950/60 px-2 py-0.5 text-[11px] font-medium text-amber-300"
            >
              {id.split(":").pop()}
            </span>
          ))}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap gap-2">
          <StatButton big label="RK" value={String(sheet.ac.total.total)} />
          <StatButton label="TOUCH" value={String(sheet.ac.touch.total)} />
          <StatButton label="FLAT-FOOTED" value={String(sheet.ac.flatFooted.total)} />
          <StatButton label={S.sheet.init} value={fmtMod(sheet.init.total)} />
          <StatButton label="GAB" value={fmtMod(sheet.bab)} />
          <StatButton label={S.sheet.grapple} value={fmtMod(sheet.grapple.total)} />
          <StatButton label={S.sheet.speed} value={`${sheet.speedFt.total} ft`} />
        </div>
      </Card>

      <Card>
        <SectionTitle>Rettungswürfe</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {(["fort", "ref", "will"] as const).map((key) => (
            <StatButton key={key} big label={S.saves[key] ?? key} value={fmtMod(sheet.saves[key].total)} />
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Attribute</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {ABILITIES.map((ability) => (
            <StatButton
              key={ability}
              label={ability.toUpperCase()}
              value={fmtMod(sheet.abilities[ability].mod)}
              sub={String(sheet.abilities[ability].score.total)}
            />
          ))}
        </div>
      </Card>

      {sheet.attacks.length > 0 && (
        <Card>
          <SectionTitle>{S.sheet.attacks}</SectionTitle>
          <ul className="divide-y divide-slate-800 text-sm">
            {sheet.attacks.map((attack) => (
              <li key={attack.key} className="py-1.5">
                <div className="font-medium">
                  {attack.label}
                  {attack.slot !== undefined && attack.slot !== "none" && (
                    <span className="ml-1.5 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                      {S.sheet.slotMark[attack.slot]}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {/* Die beiden Sammelzeilen (Nahkampf/Fernkampf) haben keinen
                      Schaden — dort stand „+8 / +3 · — · —". Ein Gedankenstrich ist
                      keine Angabe. */}
                  {[
                    attack.bonuses.map(fmtMod).join(" / "),
                    attack.damageText,
                    attack.critical,
                  ]
                    .filter((part) => part !== "" && part !== "—")
                    .join(" · ")}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {sheet.spellcasting.length > 0 && (
        <Card>
          <SectionTitle>{S.sheet.tabs.spells}</SectionTitle>
          {sheet.spellcasting.map((block) => {
            const state = character.spellState[block.classId];
            return (
              <div key={block.classId} className="mb-2 last:mb-0">
                <div className="text-sm font-medium">
                  {block.className}{" "}
                  <span className="text-xs text-slate-400">
                    CL {block.casterLevel.total} · SG {block.dcBase}+Grad
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  {/* `total: null` heißt „diesen Grad gibt es noch nicht" — als
                      0/0 anzuzeigen wäre eine andere Aussage. */}
                  {block.slots
                    .filter((slot) => slot.total !== null)
                    .map((slot) => `${slot.level}: ${Math.max(0, slot.total! - slot.used)}/${slot.total}`)
                    .join(" · ")}
                </div>
                {state !== undefined && state.prepared.length > 0 && (
                  <div className="mt-0.5 text-xs text-slate-500">
                    {S.group.prepared}: {state.prepared.length}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <Card>
        <SectionTitle>{S.sheet.tabs.skills}</SectionTitle>
        <ul className="text-sm">
          {sheet.skills
            .filter((skill) => skill.ranks > 0)
            .map((skill) => (
              <li key={skill.key} className="flex justify-between gap-2 py-0.5">
                <span className="truncate">{skill.name}</span>
                <span className="shrink-0 font-mono tabular-nums">
                  {skill.usable ? fmtMod(skill.total.total) : "—"}
                  <span className="ml-1 text-xs text-slate-500">({skill.ranks})</span>
                </span>
              </li>
            ))}
        </ul>
        {sheet.skills.every((skill) => skill.ranks === 0) && (
          <p className="text-xs text-slate-500">{S.group.noRanks}</p>
        )}
      </Card>

      {character.feats.length > 0 && (
        <Card>
          <SectionTitle>{S.sheet.tabs.feats}</SectionTitle>
          <p className="text-sm text-slate-300">
            {character.feats
              .map((feat) => {
                const entity = entities.find((e) => e.id === feat.featId);
                const name = entity ? displayName(entity) : feat.featId.split(":").pop();
                return feat.choice === undefined || feat.choice === "" ? name : `${name} (${feat.choice})`;
              })
              .join(" · ")}
          </p>
        </Card>
      )}

      <Card>
        <SectionTitle>{S.sheet.equipped}</SectionTitle>
        <ul className="text-sm">
          {character.inventory
            .filter((row) => row.slot !== "none")
            .map((row) => {
              const entity = row.itemId ? entities.find((e) => e.id === row.itemId) : undefined;
              return (
                <li key={row.id} className="flex justify-between gap-2 py-0.5">
                  <span className="truncate">
                    {row.customName ?? (entity ? displayName(entity) : "—")}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {S.sheet.slotMark[row.slot]}
                  </span>
                </li>
              );
            })}
        </ul>
        <p className="mt-1 text-xs text-slate-500">
          {S.sheet.money}: {character.money.pp} PP · {character.money.gp} GP · {character.money.sp} SP ·{" "}
          {character.money.cp} CP
        </p>
        <p className="text-xs text-slate-500">
          {sheet.encumbrance.loadLb} lb — {S.sheet.encumbrance[sheet.encumbrance.level]}
        </p>
      </Card>
    </div>
  );
}

/**
 * Der abgeleitete Bogen eines Fremden.
 *
 * Zwei Dinge müssen aus dem Regal kommen und nicht von hier: sein eigenes
 * Regelwerk und seine Hausregeln. Ohne das erste fehlen seine Klassen und Talente,
 * ohne das zweite stehen bei mir andere Zahlen als bei ihm — und dann ist die
 * Ansicht schlimmer als keine.
 *
 * Sein Regelwerk gewinnt bei gleicher Kennung: es ist SEIN Bogen, und wenn wir
 * dieselbe eigene Klasse unterschiedlich gepflegt haben, gilt für seine Figur
 * seine Fassung.
 */
function deriveForeign(
  character: Character,
  shelf: Shelf,
  mine: Entity[],
  myHouseRules: ReturnType<typeof useHouseRules>,
): DerivedSheet {
  const merged = new Map<string, Entity>();
  for (const entity of mine) merged.set(entity.id, entity);
  for (const entity of shelf.homebrewEntities) merged.set(entity.id, entity);
  return deriveSheet(
    character,
    resolveCompendium([...merged.values()]),
    shelf.houseRules ?? myHouseRules,
  );
}
