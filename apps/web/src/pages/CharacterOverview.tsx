import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  applyHpChange,
  displayName,
  effectiveTrackerMax,
  spellsForCaster,
  type Character,
  type DerivedSheet,
  type Entity,
  type SpellcastingBlock,
} from "@codex35/core";
import { S } from "../strings.js";
import { CharacterRepo } from "../db/repo.js";
import { useCharacter, useCompendium, useHouseRules, useSheet } from "../lib/hooks.js";
import { reportSaveFailure } from "../lib/saveError.js";
import { HpPad } from "../ui/HpPad.js";
import { ItemName } from "../ui/ItemName.js";
import { Card, SectionTitle, fmtMod } from "../ui/bits.js";
import { useAccentAttribute } from "../ui/classAccents.js";

/**
 * Die Übersicht — Martins Wunsch, über Philipp: „Eine Übersicht pro Charakter. Wo
 * auf einer Seite, gerne mit scrolling aber ohne Seiten Wechsel, relevante Infos
 * zusammen gefasst werden. Dies ist aus DM Perspektive nützlich. Dann könnte ich
 * mir jeden von euch als Charakter anlegen und würde eine schnelle Übersicht
 * erhalten."
 *
 * Gefragt und entschieden: im ⋯-Menü · ALLES kompakt · nur lesen, AUSSER den HP.
 *
 * Drei Entscheidungen, die man beim Lesen sonst für Zufall hält:
 *
 * - **Gerechnet wird hier nichts.** Jede Zahl kommt fertig aus `sheet` — dieselbe
 *   Quelle wie die sieben Reiter. Eine zweite Rechnung wäre eine zweite Wahrheit,
 *   und genau auf dieser Seite fiele ein Widerspruch am ehesten auf.
 * - **Nur lesen, mit EINER Ausnahme.** Die HP sind der Handgriff, den ein DM am
 *   Tisch wirklich braucht — dasselbe Feld wie am Bogen (`HpPad`), derselbe
 *   Schreibweg. Alles andere bleibt Auskunft: ein zweiter Schreibweg für Ränge
 *   und Talente wäre eine zweite Fehlerquelle.
 * - **Leere Abschnitte sagen das** („Keine Ränge vergeben.") statt zu fehlen — ein
 *   Abschnitt, der stumm verschwindet, sieht wie ein Fehler aus.
 */
export function CharacterOverviewPage() {
  const { charId } = useParams({ strict: false }) as { charId: string };
  const character = useCharacter(charId);
  const sheet = useSheet(character);
  const compendium = useCompendium();
  const houseRules = useHouseRules();
  const [hpPadOpen, setHpPadOpen] = useState(false);
  // Dieselbe Klassenfarbe wie am Bogen — die Seite zeigt denselben Charakter.
  useAccentAttribute(character);

  if (character === undefined) return <p className="text-slate-400">{S.misc.loading}</p>;
  if (character === null) return <p className="text-slate-400">Charakter nicht gefunden.</p>;
  if (!sheet || !compendium) return <p className="text-slate-400">{S.misc.loading}</p>;

  const save = (mutate: (c: Character) => void) => {
    const write = () => CharacterRepo.mutate(character.id, mutate);
    void write().catch((error: unknown) => reportSaveFailure(character.name, error, write));
  };

  const race = compendium.get(character.raceId);
  const hpRatio = sheet.hp.max > 0 ? sheet.hp.current / sheet.hp.max : 0;
  const ranked = sheet.skills.filter((skill) => skill.ranks > 0);
  const equipped = character.inventory.filter((row) => row.slot !== "none");
  const attackLines = sheet.attacks.filter((a) => a.key !== "melee" && a.key !== "ranged");
  const coins = (["pp", "gp", "sp", "cp"] as const).filter((c) => character.money[c] > 0);

  /* Die zwölf Kacheln von „Auf einen Blick" — als stille Werte, ohne Aufschlüsselung. */
  const melee = sheet.attacks.find((a) => a.key === "melee");
  const ranged = sheet.attacks.find((a) => a.key === "ranged");
  const tiles: [string, string][] = [
    [S.sheet.ac, `${sheet.ac.total.total}`],
    [S.sheet.touch, `${sheet.ac.touch.total}`],
    [S.sheet.flatFooted, `${sheet.ac.flatFooted.total}`],
    [S.saves.fort ?? "fort", fmtMod(sheet.saves.fort.total)],
    [S.saves.ref ?? "ref", fmtMod(sheet.saves.ref.total)],
    [S.saves.will ?? "will", fmtMod(sheet.saves.will.total)],
    [S.sheet.bab, fmtMod(sheet.bab)],
    ...(melee ? ([[S.sheet.melee, fmtMod(melee.attack.total)]] as [string, string][]) : []),
    ...(ranged ? ([[S.sheet.ranged, fmtMod(ranged.attack.total)]] as [string, string][]) : []),
    [S.sheet.init, fmtMod(sheet.init.total)],
    [S.sheet.speed, `${sheet.speedFt.total} ft`],
    [S.sheet.grapple, fmtMod(sheet.grapple.total)],
  ];

  return (
    <div className="space-y-3">
      <Link
        to="/charaktere/$charId"
        params={{ charId: character.id }}
        className="inline-block rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
      >
        ← {S.overview.toSheet}
      </Link>

      <header>
        <h1 className="text-xl font-bold">{character.name}</h1>
        <p className="text-sm text-slate-400">
          {sheet.classLevels.map((c) => `${c.className} ${c.level}`).join(" / ")} · {S.sheet.level}{" "}
          {sheet.totalLevel}
          {sheet.ecl !== sheet.totalLevel && ` (ECL ${sheet.ecl})`}
          {race !== undefined && ` · ${displayName(race)}`}
          {character.playerName !== undefined && character.playerName !== "" && (
            <span className="text-slate-500"> · {character.playerName}</span>
          )}
        </p>
        <p className="text-[11px] text-slate-500">{S.overview.readOnly}</p>
      </header>

      {/* Die HP — dasselbe Feld wie am Bogen, die eine änderbare Stelle hier. */}
      <button onClick={() => setHpPadOpen(true)} className="block w-full text-left" aria-label={S.hpPad.open}>
        <div className="relative h-7 overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
          <div
            className={`absolute inset-y-0 left-0 transition-[width] ${
              hpRatio <= 0.25 ? "bg-red-800/70" : hpRatio <= 0.5 ? "bg-amber-700/60" : "bg-emerald-800/60"
            }`}
            style={{ width: `${Math.max(0, Math.min(100, hpRatio * 100))}%` }}
          />
          <div className="relative flex h-full items-center justify-between px-2 text-sm font-bold tabular-nums">
            <span>
              {S.sheet.hp} {sheet.hp.current}/{sheet.hp.max}
              {sheet.hp.temp > 0 && <span className="text-sky-300"> +{sheet.hp.temp}</span>}
              {sheet.hp.nonlethal > 0 && (
                <span className="text-amber-300"> ({sheet.hp.nonlethal} nichttödl.)</span>
              )}
            </span>
            <span className="text-xs font-medium text-slate-300">± {S.hpPad.open}</span>
          </div>
        </div>
      </button>
      {sheet.hp.state !== "ok" && (
        <p
          className={`rounded-lg border px-2 py-1 text-[11px] font-medium leading-snug ${
            sheet.hp.state === "dead"
              ? "border-slate-600 bg-slate-800 text-slate-200"
              : "border-rose-700/70 bg-rose-950/50 text-rose-200"
          }`}
        >
          {S.dying.line(sheet.hp.state, sheet.hp.deadAt, sheet.hp.saveZoneDownTo)}
        </p>
      )}
      {character.conditionIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {character.conditionIds.map((id) => {
            const condition = compendium.get(id);
            return (
              <span
                key={id}
                className="rounded-full border border-amber-700 bg-amber-950/60 px-2 py-0.5 text-[11px] font-medium text-amber-300"
              >
                {condition ? displayName(condition) : id}
              </span>
            );
          })}
        </div>
      )}

      {/* Attribute + die zwölf Werte — dieselben Zahlen wie „Auf einen Blick". */}
      <Card>
        <SectionTitle>{S.overview.abilities}</SectionTitle>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {(["str", "dex", "con", "int", "wis", "cha"] as const).map((ab) => (
            <div key={ab} className="rounded-lg bg-slate-800/60 px-1.5 py-1 text-center">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                {S.abilities[ab]}
              </div>
              <div className="text-sm font-semibold tabular-nums">
                {sheet.abilities[ab].score.total}{" "}
                <span className="text-xs font-normal text-slate-400">
                  ({fmtMod(sheet.abilities[ab].mod)})
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {tiles.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-800/60 px-1.5 py-1 text-center">
              <div className="truncate text-[10px] uppercase tracking-wide text-slate-500">
                {label}
              </div>
              <div className="text-sm font-semibold tabular-nums">{value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Angriffe mit Schaden — die Zeilen des Kampf-Reiters, ohne Knöpfe. */}
      <Card>
        <SectionTitle>{S.sheet.attacks}</SectionTitle>
        <ul className="divide-y divide-slate-800 text-sm">
          {attackLines.map((line) => (
            <li key={line.key} className="flex flex-wrap items-baseline gap-x-2 py-1.5">
              <span className="min-w-0 flex-1 font-medium">
                {line.label}
                {line.slot !== undefined && line.slot !== "none" && (
                  <span className="ml-1.5 rounded bg-slate-800 px-1 py-0.5 text-[10px] font-normal text-slate-400">
                    {S.sheet.equipMark[line.slot]}
                  </span>
                )}
              </span>
              <span className="tabular-nums">{line.bonuses.map(fmtMod).join("/")}</span>
              <span className="text-slate-300">{line.damageText}</span>
              <span className="text-xs text-slate-500">
                {S.sheet.critical} {line.critical}
              </span>
            </li>
          ))}
          {attackLines.length === 0 && (
            <li className="py-1.5 text-slate-500">{S.overview.attacksNone}</li>
          )}
        </ul>
      </Card>

      {/* Fertigkeiten mit Rängen — die ganze Liste steht am Bogen. */}
      <Card>
        <SectionTitle>{S.overview.skillsTitle}</SectionTitle>
        {ranked.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 text-sm">
            {ranked.map((skill) => (
              <div key={skill.key} className="flex items-baseline justify-between gap-2 border-b border-slate-800/60 py-1">
                <span className="min-w-0 truncate">{skill.name}</span>
                <span className="font-semibold tabular-nums">{fmtMod(skill.total.total)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{S.overview.skillsNone}</p>
        )}
      </Card>

      {sheet.spellcasting.map((block) => (
        <SpellsSummary
          key={block.classId}
          block={block}
          character={character}
          compendium={compendium}
        />
      ))}

      {/* Talente — mit Auswahl und Herkunft, wie am Talente-Reiter. */}
      <Card>
        <SectionTitle>
          {S.sheet.tabs.feats} ({sheet.featSlots.used}/{sheet.featSlots.available})
        </SectionTitle>
        <ul className="text-sm">
          {character.feats.map((feat, index) => {
            const entity = compendium.get(feat.featId);
            const origin =
              feat.origin?.source ??
              (feat.origin?.level !== undefined ? S.feats.originLevel(feat.origin.level) : undefined);
            return (
              <li key={index} className="flex flex-wrap items-baseline gap-x-1.5 py-0.5">
                <span className="font-medium">{entity ? displayName(entity) : feat.featId}</span>
                {feat.choice !== undefined && feat.choice !== "" && (
                  <span className="text-slate-400">({feat.choice})</span>
                )}
                {origin !== undefined && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {origin}
                  </span>
                )}
              </li>
            );
          })}
          {character.feats.length === 0 && (
            <li className="py-0.5 text-slate-500">{S.overview.featsNone}</li>
          )}
        </ul>
      </Card>

      {/* Angelegt + Traglast + Geld — was am Körper zählt. */}
      <Card>
        <SectionTitle>{S.sheet.equipped}</SectionTitle>
        <ul className="text-sm">
          {equipped.map((row) => {
            const item = row.itemId !== undefined ? compendium.get(row.itemId) : undefined;
            return (
              <li key={row.id} className="flex items-baseline gap-2 py-0.5">
                <span className="w-8 shrink-0 rounded bg-slate-800 px-1 py-0.5 text-center text-[10px] text-slate-400">
                  {S.sheet.equipMark[row.slot]}
                </span>
                <span className="min-w-0 flex-1">
                  {row.customName ?? (item !== undefined ? <ItemName entity={item} /> : row.itemId)}
                  {row.qty > 1 && <span className="text-slate-500"> ×{row.qty}</span>}
                </span>
              </li>
            );
          })}
          {equipped.length === 0 && <li className="py-0.5 text-slate-500">{S.overview.gearNone}</li>}
        </ul>
        <div className="mt-1.5 flex flex-wrap gap-x-3 border-t border-slate-800 pt-1.5 text-xs text-slate-400">
          {!houseRules.ignoreEncumbrance && (
            <span>
              {sheet.encumbrance.loadLb} lb — {S.sheet.encumbrance[sheet.encumbrance.level]}
            </span>
          )}
          {coins.length > 0 && (
            <span>{coins.map((c) => `${character.money[c]} ${c}`).join(" · ")}</span>
          )}
        </div>
      </Card>

      {/* Zähler — die Tagesfähigkeiten, mit lebender Grenze (Extra Turning zählt mit). */}
      {character.trackers.length > 0 && (
        <Card>
          <SectionTitle>{S.trackers.title}</SectionTitle>
          <ul className="text-sm">
            {character.trackers.map((tracker) => (
              <li key={tracker.id} className="flex items-baseline justify-between gap-2 py-0.5">
                <span className="min-w-0 truncate">{tracker.name}</span>
                <span className="font-semibold tabular-nums">
                  {tracker.kind === "roll"
                    ? (tracker.formula ?? "—")
                    : S.overview.trackerOf(tracker.value, effectiveTrackerMax(tracker, sheet))}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Notizen zuletzt — am Tisch liest man erst die Zahlen. */}
      <Card>
        <SectionTitle>{S.sheet.tabs.notes}</SectionTitle>
        {character.notes.trim() === "" ? (
          <p className="text-sm text-slate-500">{S.overview.notesNone}</p>
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
            {character.notes}
          </div>
        )}
      </Card>

      <HpPad
        open={hpPadOpen}
        onClose={() => setHpPadOpen(false)}
        onApply={(mode, amount) => save((c) => void (c.hp = applyHpChange(c.hp, mode, amount)))}
        hp={{
          current: sheet.hp.current,
          max: sheet.hp.max,
          damage: character.hp.damage,
          temp: character.hp.temp,
          nonlethal: character.hp.nonlethal,
        }}
        computedMax={sheet.hp.computedMax}
        overrideMax={character.hp.overrideMax}
        onSetMax={(value) =>
          save((c) => {
            if (value === null) delete c.hp.overrideMax;
            else c.hp.overrideMax = value;
          })
        }
        dying={{
          state: sheet.hp.state,
          text: S.dying.line(sheet.hp.state, sheet.hp.deadAt, sheet.hp.saveZoneDownTo),
          stabilized: character.hp.stabilized,
          onToggleStabilized: () => save((c) => void (c.hp.stabilized = !c.hp.stabilized)),
        }}
      />
    </div>
  );
}

/**
 * Ein Zauberblock in Kurzform: Slots je Grad und die Namen — vorbereitete beim
 * Vorbereiter, bekannte beim Spontanzauberer. Die Grade kommen aus
 * `spellsForCaster`, derselben Funktion wie im Zauber-Reiter: eine zweite
 * Zuordnung „welcher Zauber hat hier welchen Grad" wäre eine zweite Wahrheit.
 */
function SpellsSummary({
  block,
  character,
  compendium,
}: {
  block: SpellcastingBlock;
  character: Character;
  compendium: Map<string, Entity>;
}) {
  const state = character.spellState[block.classId];
  const entries = spellsForCaster(compendium, block);
  const nameOf = (spellId: string) =>
    entries.find((e) => e.spellId === spellId)?.spell?.name ?? spellId;

  const levels = block.slots.filter((slot) => slot.total !== null);
  return (
    <Card>
      <SectionTitle>
        {S.sheet.tabs.spells} — {block.className}
      </SectionTitle>
      <p className="text-xs text-slate-400">
        {S.sheet.casterLevel} {block.casterLevel.total} · {S.spells.dc} {block.dcBase} +{" "}
        {S.spells.level}
        {block.domains.length > 0 &&
          ` · ${S.spells.domains}: ${block.domains.map((d) => d.name.replace(/ Domain$/, "")).join(", ")}`}
        {character.deity !== undefined && character.deity !== "" && (
          <span> · {S.spells.deity}: {character.deity}</span>
        )}
      </p>
      <ul className="mt-1.5 space-y-1 text-sm">
        {levels.map((slot) => {
          const total = slot.total ?? 0;
          const used = state?.usedSlots[slot.level] ?? 0;
          /*
            Beim Vorbereiter stehen die VORBEREITETEN Namen des Grads, beim
            Spontanzauberer die BEKANNTEN — das ist jeweils die Liste, die der DM
            wissen will.
          */
          const names =
            block.model === "prepared"
              ? (state?.prepared ?? [])
                  .filter((p) => p.slotLevel === slot.level)
                  .map((p) => nameOf(p.spellId))
              : entries
                  .filter((e) => e.level === slot.level && (state?.known ?? []).includes(e.spellId))
                  .map((e) => e.spell?.name ?? e.spellId);
          return (
            <li key={slot.level} className="flex flex-wrap items-baseline gap-x-2">
              <span className="shrink-0 font-medium">
                {S.spells.level} {slot.level}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-slate-400">
                {S.overview.slotsFree(Math.max(0, total - used), total)}
              </span>
              {names.length > 0 && (
                <span className="min-w-0 text-xs text-slate-300">{names.join(", ")}</span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
