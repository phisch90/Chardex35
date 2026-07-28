import { useState } from "react";
import {
  BONUS_TYPES,
  allowedSlots,
  conflictingEquipIds,
  displayName,
  isStatPath,
  itemKind,
  nextSlot,
  type BonusType,
  type EquipSlot,
  type ItemKind,
  type StatPath,
} from "@codex35/core";
import { S } from "../../strings.js";
import { toPortraitDataUrl } from "../../lib/image.js";
import { FeatText } from "../../ui/FeatText.js";
import { UndoBar, useUndo } from "../../ui/UndoBar.js";
import { ConfirmDeleteButton } from "../../ui/ConfirmDelete.js";
import { useAllEntities, useHouseRules } from "../../lib/hooks.js";
import { Card, Chip, GhostButton, SearchInput, SectionTitle, fmtMod } from "../../ui/bits.js";
import { EquipMark } from "../../ui/EquipMark.js";
import { itemLabel, itemSummary } from "../../ui/itemSummary.js";
import type { TabProps } from "./index.js";

export function InventoryTab({ character, sheet, editMode, save }: TabProps) {
  const entities = useAllEntities();
  const { ignoreEncumbrance } = useHouseRules();
  const [query, setQuery] = useState("");
  // Löschen nur im Bearbeiten-Modus (Schalter im Kopf des Bogens) — ein
  // Fehlgriff im Kampf soll keine Ausrüstung kosten.
  const undo = useUndo();
  const q = query.trim().toLowerCase();
  const results =
    q.length >= 2
      ? (entities ?? [])
          .filter((e) => e.kind === "item" && !e.deletedAt && e.name.toLowerCase().includes(q))
          .slice(0, 20)
      : [];

  // Angelegt zuerst, wie in Fight Club — was am Körper hängt, zählt im Kampf.
  const equipped = character.inventory.filter((row) => row.slot !== "none");
  const stowed = character.inventory.filter((row) => row.slot === "none");

  const entityOf = (row: { itemId?: string | undefined }) => {
    const hit = row.itemId ? entities?.find((e) => e.id === row.itemId) : undefined;
    return hit?.kind === "item" ? hit : undefined;
  };
  const kindOf = (row: { itemId?: string | undefined }): ItemKind => itemKind(entityOf(row));

  /**
   * Ein Tap auf die Marke rückt einen Platz weiter: nicht angelegt → erster
   * erlaubter Platz → … → wieder ab. Welche Plätze erlaubt sind, sagt der
   * Gegenstand (Schild nur Schildhand, Zweihänder nur beidhändig).
   *
   * Verdrängt wird, was körperlich im Weg ist: eine Rüstung über der anderen geht
   * nicht, und zwei Hände sind zwei Hände. Vorher waren Waffen unbegrenzt — fünf
   * angelegte Zweihänder ergaben fünf Angriffszeilen auf dem Bogen.
   */
  const cycleSlot = (id: string) =>
    save((c) => {
      const item = c.inventory.find((r) => r.id === id);
      if (!item) return;
      const target = nextSlot(entityOf(item), item.slot);
      item.slot = target;
      if (target === "none") return;
      const verdrängt = conflictingEquipIds(
        c.inventory.map((r) => ({ id: r.id, slot: r.slot })),
        id,
        target,
      );
      for (const otherId of verdrängt) {
        const other = c.inventory.find((r) => r.id === otherId);
        if (other) other.slot = "none";
      }
    });

  const renderRow = (row: (typeof character.inventory)[number]) => {
    const entity = entityOf(row);
    const name = itemLabel(row, entity);
    const weight = row.weightLbOverride ?? entity?.data.weightLb ?? 0;
    // Was das Stück bringt, gehört an das Stück — sonst muss man raten, warum
    // die RK sich beim Ablegen ändert. Jetzt auch bei Waffen (Schaden, Kritisch).
    const wirkung = itemSummary(entity);
    return (
      <li key={row.id} className="flex items-center gap-2 py-1.5 text-sm">
        <EquipMark slot={row.slot} onClick={() => cycleSlot(row.id)} />
        <div className="min-w-0 flex-1">
          <div className="truncate">{name}</div>
          <div className="text-xs text-slate-500">
            {[
              wirkung,
              !ignoreEncumbrance && weight ? `${weight * row.qty} lb` : "",
              row.extraEffects.length > 0 ? "verzaubert" : "",
            ]
              .filter((p) => p !== "")
              .join(" · ")}
          </div>
        </div>
        <GhostButton
          onClick={() =>
            save((c) => {
              const item = c.inventory.find((r) => r.id === row.id);
              if (item) item.qty = Math.max(1, item.qty - 1);
            })
          }
        >
          −
        </GhostButton>
        <span className="w-6 text-center font-mono">{row.qty}</span>
        <GhostButton
          onClick={() =>
            save((c) => {
              const item = c.inventory.find((r) => r.id === row.id);
              if (item) item.qty += 1;
            })
          }
        >
          +
        </GhostButton>
        {editMode && (
          <ConfirmDeleteButton
            label={name}
            onConfirm={() => {
              const snapshot = structuredClone(row);
              const at = character.inventory.findIndex((r) => r.id === row.id);
              save((c) => void (c.inventory = c.inventory.filter((r) => r.id !== row.id)));
              // An dieselbe Stelle zurück — eine Rücknahme soll die Liste nicht
              // umsortieren.
              undo.offer(name, () =>
                save((c) => {
                  if (!c.inventory.some((r) => r.id === snapshot.id)) {
                    c.inventory.splice(at < 0 ? c.inventory.length : at, 0, snapshot);
                  }
                }),
              );
            }}
          />
        )}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle>
          {S.sheet.equipped} ({equipped.length})
        </SectionTitle>
        <UndoBar pending={undo.pending} onUndo={undo.undo} onDismiss={undo.dismiss} />
        {/*
          Nach Art gruppiert, und links an jeder Zeile der PLATZ. Vorher war alles
          eine Liste mit einem Knopf „Anlegen"/„Ablegen": daraus ging hervor, ob
          etwas angelegt ist, nicht wo — und der Platz entscheidet über Werte.
        */}
        <p className="text-[11px] text-slate-500">{S.sheet.equipLegend}</p>
        {equipped.length === 0 && <p className="py-2 text-sm text-slate-500">Nichts angelegt.</p>}
        {(["armor", "shield", "weapon", "other"] as const).map((slot) => {
          const rows = equipped.filter((row) => kindOf(row) === slot);
          if (rows.length === 0) return null;
          return (
            <div key={slot} className="mt-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {S.sheet.slots2[slot]}
              </div>
              <ul className="divide-y divide-slate-800">{rows.map(renderRow)}</ul>
            </div>
          );
        })}

        <div className="mt-3">
          <SectionTitle>
            {S.sheet.stowed} ({stowed.length})
          </SectionTitle>
          <ul className="divide-y divide-slate-800">
            {stowed.map(renderRow)}
            {stowed.length === 0 && <li className="py-2 text-sm text-slate-500">Leer.</li>}
          </ul>
        </div>
        {/*
          Traglast direkt unter der Liste, mit den Grenzen — genau hier stellt sich
          die Frage („passt das noch rein?"), und nicht zwei Reiter weiter.
        */}
        {!ignoreEncumbrance && (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-slate-800 pt-2 text-xs">
            <span className="text-slate-300">
              {sheet.encumbrance.loadLb} lb — {S.sheet.encumbrance[sheet.encumbrance.level]}
            </span>
            <span className="text-slate-500">
              leicht bis {sheet.encumbrance.lightMaxLb} · mittel bis{" "}
              {sheet.encumbrance.mediumMaxLb} · schwer bis {sheet.encumbrance.heavyMaxLb}
            </span>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>{S.actions.add}</SectionTitle>
        <SearchInput value={query} onChange={setQuery} placeholder={S.actions.search} />
        <ul className="mt-1 divide-y divide-slate-800">
          {results.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
              <span className="truncate">{displayName(item)}</span>
              <GhostButton
                onClick={() => {
                  save((c) =>
                    void c.inventory.push({
                      id: crypto.randomUUID(),
                      itemId: item.id,
                      qty: 1,
                      slot: "none",
                      extraEffects: [],
                    }),
                  );
                  setQuery("");
                }}
              >
                {S.actions.add}
              </GhostButton>
            </li>
          ))}
        </ul>
        <GhostButton
          onClick={() => {
            const name = prompt("Name des Gegenstands?");
            if (!name) return;
            const weight = ignoreEncumbrance
              ? 0
              : Number(prompt("Gewicht in lb?", "0") ?? 0) || 0;
            save((c) =>
              void c.inventory.push({
                id: crypto.randomUUID(),
                customName: name,
                weightLbOverride: weight,
                qty: 1,
                slot: "none",
                extraEffects: [],
              }),
            );
          }}
        >
          + Freier Gegenstand
        </GhostButton>
      </Card>

      <Card>
        <SectionTitle>Geld</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          {(["pp", "gp", "sp", "cp"] as const).map((coin) => (
            <label key={coin} className="flex flex-col gap-1">
              <span className="text-xs uppercase text-slate-400">{coin}</span>
              <input
                type="number"
                value={character.money[coin]}
                onChange={(e) =>
                  save((c) => void (c.money[coin] = Math.max(0, e.target.valueAsNumber || 0)))
                }
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
              />
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function FeatsTab({ character, sheet, editMode, save }: TabProps) {
  const entities = useAllEntities();
  const [query, setQuery] = useState("");
  // Talente sind Stufenaufstiege in Papierform — die dürfen nicht auf einen Tap
  // verschwinden. Ändern und Löschen nur im Bearbeiten-Modus.
  const undo = useUndo();
  const q = query.trim().toLowerCase();
  const results =
    q.length >= 2
      ? (entities ?? [])
          .filter((e) => e.kind === "feat" && !e.deletedAt && e.name.toLowerCase().includes(q))
          .slice(0, 20)
      : [];

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle>
          {S.sheet.tabs.feats} ({sheet.featSlots.used}/{sheet.featSlots.available})
        </SectionTitle>
        <UndoBar pending={undo.pending} onUndo={undo.undo} onDismiss={undo.dismiss} />
        <ul className="divide-y divide-slate-800">
          {character.feats.map((feat, index) => {
            const entity = entities?.find((e) => e.id === feat.featId);
            // Talente wie Weapon Focus wirken nur mit einer bestimmten Waffe.
            // Ohne Zuordnung liegt der Bonus brach, also hier sichtbar machen.
            const needsItem =
              entity?.kind === "feat" && entity.effects.some((e) => e.scope === "chosenItem");
            const chosen = feat.choiceRef
              ? entities?.find((e) => e.id === feat.choiceRef)
              : undefined;
            /** Sprechender Name für Meldungen — inklusive der Auswahl. */
            const label =
              (entity ? displayName(entity) : feat.featId) +
              (feat.choice ? ` (${feat.choice})` : "");
            return (
              <li key={index} className="flex items-start justify-between gap-2 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{entity ? displayName(entity) : feat.featId}</span>
                  {feat.choice && <span className="text-slate-400"> ({feat.choice})</span>}
                  {/* Erklärung direkt am Talent, vollständig — nicht erst nach
                      einem Sprung ins Kompendium. */}
                  <FeatText entity={entity} />
                  {needsItem && (
                    <div className="text-xs">
                      {chosen ? (
                        <span className="text-emerald-500">
                          ✓ wirkt mit {displayName(chosen)}
                        </span>
                      ) : (
                        <span className="text-amber-400">
                          ⚠ keiner Waffe zugeordnet — der Bonus wirkt nicht
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  {needsItem && (
                    <GhostButton
                      title="Waffe zuordnen"
                      onClick={() => {
                        // Nur was im Inventar liegt — der Bonus gilt für eine
                        // Waffe, die der Charakter auch führt.
                        const options = character.inventory
                          .map((row) => {
                            const item = row.itemId
                              ? entities?.find((e) => e.id === row.itemId)
                              : undefined;
                            return item?.kind === "item" && item.data.weapon
                              ? { id: item.id, name: row.customName ?? displayName(item) }
                              : null;
                          })
                          .filter((o): o is { id: string; name: string } => o !== null);
                        if (options.length === 0) {
                          alert("Keine Waffe im Inventar, die zugeordnet werden könnte.");
                          return;
                        }
                        const list = options.map((o, i) => `${i + 1}. ${o.name}`).join("\n");
                        const answer = prompt(
                          `Für welche Waffe gilt ${entity ? displayName(entity) : "das Talent"}?\n\n${list}\n\n(Nummer eingeben, leer = keine)`,
                          options.findIndex((o) => o.id === feat.choiceRef) >= 0
                            ? String(options.findIndex((o) => o.id === feat.choiceRef) + 1)
                            : "",
                        );
                        if (answer === null) return;
                        const pick = options[Number(answer.trim()) - 1];
                        save((c) => {
                          const f = c.feats[index];
                          if (!f) return;
                          if (pick) {
                            f.choiceRef = pick.id;
                            if (!f.choice) f.choice = pick.name;
                          } else {
                            delete f.choiceRef;
                          }
                        });
                      }}
                    >
                      ⚔
                    </GhostButton>
                  )}
                  {editMode && (
                    <GhostButton
                      title="Auswahl ändern"
                      onClick={() => {
                        const choice = prompt("Auswahl (z.B. Langschwert)?", feat.choice ?? "");
                        if (choice !== null) {
                          save((c) => {
                            const f = c.feats[index];
                            if (f) f.choice = choice || undefined;
                          });
                        }
                      }}
                    >
                      ✎
                    </GhostButton>
                  )}
                  {editMode && (
                    <ConfirmDeleteButton
                      label={label}
                      onConfirm={() => {
                        const snapshot = structuredClone(feat);
                        save((c) => void c.feats.splice(index, 1));
                        undo.offer(label, () => save((c) => void c.feats.splice(index, 0, snapshot)));
                      }}
                    />
                  )}
                </div>
              </li>
            );
          })}
          {character.feats.length === 0 && <li className="py-2 text-sm text-slate-500">Keine.</li>}
        </ul>
        <SearchInput value={query} onChange={setQuery} placeholder={S.actions.search} />
        <ul className="mt-1 divide-y divide-slate-800">
          {/* Erklärung schon in der Trefferliste: man soll wissen, was man
              wählt, bevor man es wählt. */}
          {results.map((feat) => (
            <li key={feat.id} className="flex items-start justify-between gap-2 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{displayName(feat)}</span>
                <FeatText entity={feat} />
              </div>
              <GhostButton onClick={() => save((c) => void c.feats.push({ featId: feat.id }))}>
                {S.actions.add}
              </GhostButton>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionTitle>{S.sheet.features}</SectionTitle>
        <ul className="divide-y divide-slate-800">
          {sheet.features.map((feature) => (
            <li key={feature.key} className="py-1.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>
                  {feature.name}
                  <span className="ml-1 text-xs text-slate-500">
                    ({feature.className} {feature.level})
                  </span>
                </span>
                {feature.toggleable && (
                  <Chip
                    active={feature.active}
                    onClick={() =>
                      save((c) => {
                        // Alle Toggle-Effekt-Keys dieses Features gemeinsam schalten.
                        const keys = [0, 1, 2, 3, 4]
                          .map((i) => `${feature.key}.${i}`);
                        const active = keys.some((k) => c.toggledEffectKeys.includes(k));
                        c.toggledEffectKeys = active
                          ? c.toggledEffectKeys.filter((k) => !keys.includes(k))
                          : [...c.toggledEffectKeys, ...keys];
                      })
                    }
                  >
                    {feature.active ? "aktiv" : "aus"}
                  </Chip>
                )}
              </div>
              {feature.description && (
                <p className="mt-0.5 text-xs text-slate-500">{feature.description}</p>
              )}
            </li>
          ))}
          {sheet.features.length === 0 && <li className="py-2 text-sm text-slate-500">Keine.</li>}
        </ul>
      </Card>
    </div>
  );
}

const MISC_TARGETS: { path: StatPath; label: string }[] = [
  { path: "ac", label: "RK" },
  { path: "attack.all", label: "Alle Angriffe" },
  { path: "attack.melee", label: "Nahkampf-Angriff" },
  { path: "attack.ranged", label: "Fernkampf-Angriff" },
  { path: "damage.all", label: "Schaden" },
  { path: "save.all", label: "Alle Saves" },
  { path: "save.fort", label: "Fortitude" },
  { path: "save.ref", label: "Reflex" },
  { path: "save.will", label: "Will" },
  { path: "init", label: "Initiative" },
  { path: "hp.max", label: "Max. TP" },
  { path: "speed.land", label: "Bewegung" },
  { path: "skill.all", label: "Alle Fertigkeiten" },
  { path: "ability.str", label: "Stärke" },
  { path: "ability.dex", label: "Geschicklichkeit" },
  { path: "ability.con", label: "Konstitution" },
];

export function NotesTab({ character, save }: TabProps) {
  const entities = useAllEntities();
  const conditions = (entities ?? []).filter((e) => e.kind === "condition" && !e.deletedAt);
  const [notes, setNotes] = useState(character.notes);

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle>{S.sheet.portrait}</SectionTitle>
        <div className="flex items-center gap-3">
          {character.portrait && (
            <img src={character.portrait} alt="" className="h-20 w-20 rounded-xl object-cover" />
          )}
          <label className="cursor-pointer rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
            Bild wählen…
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                // Verkleinern, bevor es in den Charakter wandert: ein iPad-Foto
                // wäre sonst mehrere Megabyte in jedem Export und Abgleich.
                void toPortraitDataUrl(file).then((dataUrl) =>
                  save((c) => void (c.portrait = dataUrl)),
                );
                e.target.value = "";
              }}
            />
          </label>
          {character.portrait && (
            <GhostButton danger onClick={() => save((c) => void (c.portrait = undefined))}>
              {S.actions.remove}
            </GhostButton>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle>{S.sheet.conditions}</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {conditions.map((condition) => {
            const active = character.conditionIds.includes(condition.id);
            return (
              <Chip
                key={condition.id}
                active={active}
                onClick={() =>
                  save((c) => {
                    c.conditionIds = active
                      ? c.conditionIds.filter((id) => id !== condition.id)
                      : [...c.conditionIds, condition.id];
                  })
                }
              >
                {displayName(condition)}
              </Chip>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle>{S.sheet.miscMods}</SectionTitle>
        <ul className="divide-y divide-slate-800">
          {character.miscModifiers.map((mod) => (
            <li key={mod.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
              <span>
                {MISC_TARGETS.find((t) => t.path === mod.target)?.label ?? mod.target}{" "}
                <span className="font-mono">{fmtMod(mod.value)}</span>
                {mod.note && <span className="text-slate-400"> — {mod.note}</span>}
              </span>
              <GhostButton
                danger
                onClick={() =>
                  save((c) => void (c.miscModifiers = c.miscModifiers.filter((m) => m.id !== mod.id)))
                }
              >
                ✕
              </GhostButton>
            </li>
          ))}
        </ul>
        <MiscModifierForm
          onAdd={(target, bonusType, value, note) =>
            save((c) =>
              void c.miscModifiers.push({ id: crypto.randomUUID(), target, bonusType, value, note }),
            )
          }
        />
      </Card>

      {/* Benannte Abschnitte: Gottheit, Familie, Hausregel-Formeln … */}
      <Card>
        <SectionTitle>{S.notes.sections}</SectionTitle>
        {character.noteSections.length === 0 && (
          <p className="mb-2 text-xs text-slate-500">{S.notes.emptySections}</p>
        )}
        <ul className="space-y-2">
          {character.noteSections.map((section) => (
            <li key={section.id}>
              <details className="rounded-lg border border-slate-700 bg-slate-900/60">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                  {section.title}
                </summary>
                <div className="px-3 pb-3">
                  <textarea
                    defaultValue={section.body}
                    rows={Math.min(14, Math.max(3, section.body.split("\n").length + 1))}
                    onBlur={(e) =>
                      save((c) => {
                        const target = c.noteSections.find((s) => s.id === section.id);
                        if (target) target.body = e.target.value;
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm"
                  />
                  <div className="mt-1 flex justify-end gap-1">
                    <GhostButton
                      onClick={() => {
                        const title = prompt(S.notes.sectionTitle, section.title);
                        if (!title?.trim()) return;
                        save((c) => {
                          const target = c.noteSections.find((s) => s.id === section.id);
                          if (target) target.title = title.trim();
                        });
                      }}
                    >
                      ✎
                    </GhostButton>
                    <GhostButton
                      danger
                      onClick={() =>
                        save(
                          (c) =>
                            void (c.noteSections = c.noteSections.filter((s) => s.id !== section.id)),
                        )
                      }
                    >
                      ✕
                    </GhostButton>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <div className="mt-2">
          <GhostButton
            onClick={() => {
              const title = prompt(S.notes.sectionTitle);
              if (!title?.trim()) return;
              save((c) =>
                void c.noteSections.push({ id: crypto.randomUUID(), title: title.trim(), body: "" }),
              );
            }}
          >
            + {S.notes.addSection}
          </GhostButton>
        </div>
      </Card>

      <Card>
        <SectionTitle>{S.notes.freeText}</SectionTitle>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => save((c) => void (c.notes = notes))}
          rows={6}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm"
          placeholder="Kurznotizen im Spiel, offene Fragen an den DM…"
        />
      </Card>
    </div>
  );
}

function MiscModifierForm(props: {
  onAdd: (target: StatPath, bonusType: BonusType, value: number, note: string) => void;
}) {
  const [target, setTarget] = useState<string>("ac");
  const [bonusType, setBonusType] = useState<BonusType>("untyped");
  const [value, setValue] = useState(1);
  const [note, setNote] = useState("");

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 text-sm">
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5"
      >
        {MISC_TARGETS.map((t) => (
          <option key={t.path} value={t.path}>
            {t.label}
          </option>
        ))}
      </select>
      <select
        value={bonusType}
        onChange={(e) => setBonusType(e.target.value as BonusType)}
        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5"
      >
        {BONUS_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.valueAsNumber || 0)}
        className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5"
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notiz (z.B. Rage, Bull's Strength)"
        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5"
      />
      <GhostButton
        onClick={() => {
          if (isStatPath(target)) props.onAdd(target, bonusType, value, note);
          setNote("");
        }}
      >
        {S.actions.add}
      </GhostButton>
    </div>
  );
}
