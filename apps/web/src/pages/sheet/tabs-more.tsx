import { useMemo, useState } from "react";
import {
  BONUS_TYPES,
  allowedSlots,
  conflictingEquipIds,
  displayName,
  isStatPath,
  cycleEquipSlot,
  itemKind,
  proficiencyFor,
  weaponSuggestions,
  type BonusType,
  type EquipSlot,
  type ItemEntity,
  type ItemKind,
  type StatPath,
} from "@codex35/core";
import { S } from "../../strings.js";
import { Icon } from "../../ui/icons.js";
import { toPortraitDataUrl } from "../../lib/image.js";
import { FeatText } from "../../ui/FeatText.js";
import { FeatPicker } from "../../ui/FeatPicker.js";
import { FeatModifiers } from "../../ui/FeatModifiers.js";
import { describeModifier } from "../../ui/modifierTargets.js";
import { UndoBar, useUndo } from "../../ui/UndoBar.js";
import { ConfirmDeleteButton } from "../../ui/ConfirmDelete.js";
import { useAllEntities, useCompendium, useHouseRules } from "../../lib/hooks.js";
import { reportSaveFailure } from "../../lib/saveError.js";
import { Card, Chip, GhostButton, SearchInput, SectionTitle, fmtMod } from "../../ui/bits.js";
import { EquipMark } from "../../ui/EquipMark.js";
import { ArmorCostCard } from "../../ui/ArmorCostCard.js";
import { HandsCard } from "./Hands.js";
import { ItemName, ItemText } from "../../ui/ItemName.js";
import { itemLabel, itemSummary } from "../../ui/itemSummary.js";
import { ItemPicker } from "../../ui/ItemPicker.js";
import { ItemEditor } from "../../ui/ItemEditor.js";
import { CompendiumRepo } from "../../db/repo.js";
import type { TabProps } from "./index.js";

export function InventoryTab({ character, sheet, editMode, save }: TabProps) {
  const entities = useAllEntities();
  const compendium = useCompendium();
  const { ignoreEncumbrance } = useHouseRules();
  // Für den Modifikator-Editor an den Zeilen: die Fertigkeiten zum Auswählen.
  const skillEntities = (entities ?? []).filter((e) => e.kind === "skill" && !e.deletedAt);
  const skillName = (id: string) => skillEntities.find((sk) => sk.id === id)?.name;
  const [query, setQuery] = useState("");
  // Löschen nur im Bearbeiten-Modus (Schalter im Kopf des Bogens) — ein
  // Fehlgriff im Kampf soll keine Ausrüstung kosten.
  const undo = useUndo();
  /*
    Der Editor für eigene Gegenstände. `null` = zu, `undefined`-Eintrag = neu
    anlegen, eine Entity = die bearbeiten. `usedBy` wird beim Öffnen EINMAL
    geholt, weil es nur ein Satz zur Einordnung ist und keine laufende Anzeige.
  */
  const [editor, setEditor] = useState<
    { entity?: ItemEntity | undefined; usedBy?: { count: number; names: string[] } } | null
  >(null);
  /*
    Welche Zeile ihre Erklärung zeigt — EINE, nicht jede. Alle ausgeklappt wäre
    aus einer Gepäckliste ein Aufsatz geworden; im Kampf will er die Zeile sehen,
    nicht den Text. Ein Tipp auf den Namen klappt auf, der nächste woanders klappt
    hier zu.
  */
  const [explainId, setExplainId] = useState<string | null>(null);

  /*
    Übung und Aufbau-Vorschläge auch HIER, nicht nur im Assistenten: nachgetragen
    wird meistens am fertigen Bogen. Beides ist eine FOLGE aus Klassen, Volk und
    Talenten — gerechnet, nichts davon gespeichert.
  */
  const proficiency = useMemo(
    () =>
      proficiencyFor(
        character.levels.map((level) => level.classId),
        character.raceId === "" ? undefined : character.raceId,
      ),
    [character.levels, character.raceId],
  );
  const suggestions = useMemo(() => {
    if (compendium === undefined) return undefined;
    const hits = weaponSuggestions(
      character.feats,
      character.raceId === "" ? undefined : character.raceId,
      compendium,
    );
    return new Map(hits.map((h) => [h.itemId, h.why]));
  }, [character.feats, character.raceId, compendium]);

  const openEditorFor = (entity: ItemEntity) => {
    setEditor({ entity });
    void CompendiumRepo.countCharactersUsing(entity.id).then((usedBy) =>
      setEditor((current) => (current?.entity?.id === entity.id ? { entity, usedBy } : current)),
    );
  };
  const q = query.trim().toLowerCase();
  const results =
    q.length >= 2
      ? (entities ?? [])
          .filter((e) => e.kind === "item" && !e.deletedAt && e.name.toLowerCase().includes(q))
          .slice(0, 20)
      : [];

  /*
    Behälter: welche Zeile ist einer, und wer liegt in wem.

    Die Verschachtelung folgt der ZEILE und nicht einem eigenen Abschnitt — ein
    Behälter zeigt seinen Inhalt unter sich, wo er auch steht. Ein eigener Abschnitt
    hätte den Rucksack von seinem Inhalt getrennt, sobald er selbst angelegt wird.
  */
  const containerIds = new Set(
    character.inventory.filter((row) => row.container !== undefined).map((row) => row.id),
  );
  /**
   * In welchem Behälter die Zeile liegt — oder `undefined` für „am Körper".
   *
   * Eine Kennung ins Leere gilt als „am Körper", genau wie in der Engine: der
   * Behälter kann gelöscht worden sein, und dann darf sein Inhalt nicht mit
   * verschwinden. Und ein Behälter liegt nie in einem anderen (kein Kreis möglich).
   */
  const parentOf = (row: (typeof character.inventory)[number]) =>
    row.container === undefined && row.containerId !== undefined && containerIds.has(row.containerId)
      ? row.containerId
      : undefined;
  const childrenOf = (id: string) => character.inventory.filter((row) => parentOf(row) === id);
  /** Was der Behälter laut Engine trägt — gerechnet wird dort, nicht hier. */
  const loadOf = (id: string) => sheet.encumbrance.containers.find((c) => c.id === id);

  // Angelegt zuerst, wie in Fight Club — was am Körper hängt, zählt im Kampf.
  // Wer in einem Behälter liegt, erscheint NUR dort: sonst stünde er zweimal da.
  const equipped = character.inventory.filter(
    (row) => row.slot !== "none" && parentOf(row) === undefined,
  );
  const stowed = character.inventory.filter(
    (row) => row.slot === "none" && parentOf(row) === undefined,
  );
  /** Alle Behälter — für die Knopfreihe „Einpacken:" an jeder Zeile. */
  const containers = character.inventory.filter((row) => row.container !== undefined);

  /**
   * Umsortieren: mit dem NACHBARN tauschen, nicht an eine Stelle springen.
   *
   * Getauscht wird mit dem nächsten Geschwister — also der nächsten Zeile im
   * selben Behälter (oder im selben Gepäck). Ohne diese Einschränkung würde ein
   * Tap auf ↓ am letzten Rucksack-Inhalt die Zeile aus dem Rucksack heraus in eine
   * fremde Gruppe schieben, und das sieht wie ein Fehler aus.
   *
   * Geschoben wird über die Kennung und nie über den Listenindex: die angezeigten
   * Listen sind gefiltert und gruppiert.
   */
  const siblingsOf = (row: (typeof character.inventory)[number]) => {
    const parent = parentOf(row);
    return character.inventory.filter(
      (other) => parentOf(other) === parent && (parent !== undefined || other.slot === "none"),
    );
  };
  const moveRow = (row: (typeof character.inventory)[number], direction: -1 | 1) => {
    const siblings = siblingsOf(row);
    const at = siblings.findIndex((other) => other.id === row.id);
    const neighbour = siblings[at + direction];
    if (neighbour === undefined) return;
    save((c) => {
      const here = c.inventory.findIndex((r) => r.id === row.id);
      const there = c.inventory.findIndex((r) => r.id === neighbour.id);
      const a = c.inventory[here];
      const b = c.inventory[there];
      if (a === undefined || b === undefined) return;
      c.inventory[here] = b;
      c.inventory[there] = a;
    });
  };

  const entityOf = (row: { itemId?: string | undefined }) => {
    const hit = row.itemId ? entities?.find((e) => e.id === row.itemId) : undefined;
    return hit?.kind === "item" ? hit : undefined;
  };
  const kindOf = (row: { itemId?: string | undefined }): ItemKind => itemKind(entityOf(row));

  /**
   * Fehlt die Rüstung, obwohl der Import die RK künstlich hochhält?
   *
   * Beides zusammen ist eindeutig: ein Ausgleichs-Modifikator auf die RK bedeutet
   * „hier steckt Ausrüstung, die wir nicht kennen", und wenn dazu kein
   * Rüstungs-Gegenstand angelegt ist, sieht man in der Liste schlicht nichts.
   * Genau daran hat Philipp gemerkt, dass etwas fehlt — die App hat dazu bisher
   * geschwiegen.
   */
  /**
   * Der Ausgleich, den der Fight-Club-Import auf die RK setzt, weil im Export
   * keine Ausrüstung steht. Er ist eine KRÜCKE, und Krücken müssen weg, sobald
   * das Echte da ist.
   */
  const acCompensation = character.miscModifiers.filter(
    (m) => m.target === "ac" && /Fight-Club/i.test(m.note ?? ""),
  );
  const missingArmor =
    acCompensation.length > 0 && !character.inventory.some((row) => row.slot === "armor");

  /**
   * Jetzt zählt beides: die echte Rüstung UND der Ausgleich.
   *
   * Der Fall, den Philipp gemeldet hat — sein Bogen stand auf RK 19 statt 16,
   * weil er Schild und Leder nachgetragen hatte und der Import-Ausgleich weiter
   * mitzählte. Schlimmer noch: der Ausgleich ist als RÜSTUNGS-Bonus eingetragen
   * und war höher als das Leder, hat es also verdrängt — in der Aufschlüsselung
   * stand „Leather" durchgestrichen, und das versteht niemand von allein.
   *
   * Die App kann das nicht selbst entscheiden (vielleicht steckt im Ausgleich
   * noch ein Ring, der wirklich fehlt), also fragt sie — mit den Zahlen daneben.
   */
  const doubleCountedAc =
    acCompensation.length > 0 &&
    character.inventory.some(
      (row) => row.slot !== "none" && entityOf(row)?.data.armor !== undefined,
    );
  /** Was der Ausgleich gerade verdrängt — genau die durchgestrichenen Zeilen. */
  const suppressedByCompensation = sheet.ac.total.contributions.filter(
    (c) => !c.applied && (c.bonusType === "armor" || c.bonusType === "shield"),
  );

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
      const target = cycleEquipSlot(
        entityOf(item),
        c.inventory.map((r) => ({ id: r.id, slot: r.slot })),
        id,
      );
      item.slot = target;
      if (target === "none") return;
      /*
        Angelegt heißt aus dem Behälter heraus. Aus einem geschlossenen Rucksack
        kämpft niemand, und wichtiger: die Liste „Angelegt" treibt den Kampf-Reiter
        — eine Zeile, die dort fehlt, weil sie im Rucksack steckt, wäre eine
        Angriffszeile, die auf dem Bogen nicht auftaucht.
      */
      delete item.containerId;
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
    const isContainer = row.container !== undefined;
    const inside = isContainer ? childrenOf(row.id) : [];
    const contents = isContainer ? loadOf(row.id) : undefined;
    /*
      Umsortieren nur, wo es eine Reihenfolge GIBT: im Gepäck und in einem
      Behälter. Die angelegten Zeilen sind nach Körperstelle gruppiert — dort wäre
      ein ↑ ein Knopf ohne Wirkung, und ein Knopf ohne Wirkung ist schlimmer als
      keiner (dieselbe Lehre wie beim Neuladen-Knopf der Versionsmarke).
    */
    const hasOrder = parentOf(row) !== undefined || row.slot === "none";
    const siblings = hasOrder ? siblingsOf(row) : [];
    const at = siblings.findIndex((other) => other.id === row.id);
    const canMove = editMode && siblings.length > 1;
    // Was das Stück bringt, gehört an das Stück — sonst muss man raten, warum
    // die RK sich beim Ablegen ändert. Jetzt auch bei Waffen (Schaden, Kritisch).
    // Ohne Preis und Gewicht: die Zeile führt ihr eigenes Gewicht mal der Menge.
    const wirkung = itemSummary(entity, { money: false });
    return (
      <li key={row.id} className="py-1.5 text-sm">
        <div className="flex items-center gap-2">
        <EquipMark slot={row.slot} onClick={() => cycleSlot(row.id)} />
        {/*
          Der Name ist antippbar: darunter kommt die deutsche Erklärung. Vorher
          war die Zeile stumm — bei „Tanglefoot bag" stand nur „50 gp · 4 lb", und
          was das Ding tut, musste man außerhalb der App nachschlagen.
        */}
        <button
          onClick={() => setExplainId(explainId === row.id ? null : row.id)}
          className="min-w-0 flex-1 text-left"
          title={S.items.explain}
        >
          <div className="truncate">
            <ItemName entity={entity} customName={row.customName} />
          </div>
          <div className="text-xs text-slate-500">
            {[
              row.qty > 1 ? `×${row.qty}` : "",
              wirkung,
              !ignoreEncumbrance && weight ? `${weight * row.qty} lb` : "",
              /*
                Was im Behälter liegt, steht AM Behälter — sonst müsste man den
                Inhalt selbst zusammenzählen, um zu wissen, was der Rucksack
                kostet. Gerechnet hat das die Engine (`encumbrance.containers`).
              */
              contents !== undefined && !ignoreEncumbrance
                ? contents.rows === 0
                  ? S.sheet.container.empty
                  : S.sheet.container.contents(contents.rows, contents.contentLb)
                : "",
            ]
              .filter((p) => p !== "")
              .join(" · ")}
          </div>
        </button>
        {/*
          Die Marke „Behälter" steht auch OHNE Bearbeiten-Modus da: dass eine Zeile
          etwas enthält, ist eine Eigenschaft des Bogens und keine Einstellung. Der
          Sack der Bewahrung sagt dazu, warum sein Inhalt nicht wiegt — eine Zahl,
          die anders ausfällt als erwartet, braucht ihren Grund daneben.

          IM Bearbeiten-Modus steht sie NICHT hier, und das ist ein Fund vom Bild:
          diese Zeile trägt dort schon Menge (−/1/+), ✎ und ✕, und mit Marke und ↑↓
          dazu blieb bei 390 px vom Namen ein „T…" übrig — die Kleinzeile brach in
          ein Wort pro Zeile, das ✕ stand halb außerhalb. Beim Bearbeiten sagen die
          Knöpfe darunter ohnehin, dass es ein Behälter ist („Kein Behälter"), also
          kostet die Auslassung keine Auskunft. Kein `check()` hätte das gemeldet.
        */}
        {isContainer && !editMode && (
          <span className="shrink-0 rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
            {row.container?.weightless === true
              ? S.sheet.container.weightlessMark
              : S.sheet.container.mark}
          </span>
        )}
        {/*
          Die Menge stand hier als −/+ neben jeder Zeile und nahm den Platz von
          etwas Wichtigerem ein. Philipp: „dass man mehr als ein Kurzschwert dabei
          hat, ist nicht so relevant, das muss nicht so prominent da." Also: die
          Zahl steht als „×3" beim Gewicht, und geändert wird sie im
          Bearbeiten-Modus.
        */}
        {editMode && (
          <>
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
          </>
        )}
        {/*
          Eigene Gegenstände lassen sich hier ändern — SRD-Einträge nicht. Der
          Knopf steht nur an Zeilen, die auf einen selbst angelegten oder
          importierten Gegenstand zeigen: ein Regelwerks-Eintrag ist für alle
          Bögen gleich und wird nicht am eigenen Bogen umgeschrieben.
        */}
        {editMode && entity?.source === "homebrew" && (
          <GhostButton title={S.items.editor.edit} onClick={() => openEditorFor(entity)}>
            ✎
          </GhostButton>
        )}
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
        </div>
        {explainId === row.id && <ItemText entity={entity} />}
        {/*
          Eigene Boni AM GEGENSTAND — „die dann auch wirklich rechnen", wörtlich
          sein Wunsch. Die Engine wendet `extraEffects` an Inventarzeilen schon
          lange an (engine/effects.ts); es fehlte nur die Eingabe. Es ist derselbe
          Editor wie an den Talenten, mit einem entscheidenden Unterschied:
          `activation: "equipped"`. Mit dem Standardwert „passive" würde der Bonus
          auch aus dem Rucksack wirken.

          Gespeichert wird über `row.id`, nie über den Listenindex: diese Liste ist
          gefiltert und zusätzlich nach Art gruppiert, der Index träfe die falsche
          Zeile.
        */}
        {editMode && (
          <FeatModifiers
            entity={entity}
            own={row.extraEffects}
            skills={skillEntities}
            editMode={editMode}
            activation="equipped"
            onChange={(next) =>
              save((c) => {
                const item = c.inventory.find((r) => r.id === row.id);
                if (item) item.extraEffects = next;
              })
            }
          />
        )}
        {!editMode && row.extraEffects.length > 0 && (
          <div className="text-[11px] text-amber-300/80">
            {row.extraEffects
              .map((e) => `${describeModifier(e.target, e.bonusType, skillName)} ${fmtMod(Number(e.value) || 0)}`)
              .join(" · ")}
          </div>
        )}
        {/*
          Behälter-Bedienung, nur im Bearbeiten-Modus: aus einer Zeile einen
          Behälter machen, ihn gewichtslos stellen, oder eine Zeile einpacken.

          Die Ziele stehen als KNÖPFE da und nicht in einem Textfeld — die App
          kennt ihre Behälter, und wer die Möglichkeiten kennt, lässt nicht
          abtippen (die Lehre aus dem `prompt()` bei den Teilgebieten). Bei keinem
          einzigen Behälter erscheint die Reihe gar nicht: eine Auswahl mit einer
          Möglichkeit ist keine.
        */}
        {editMode && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {/*
              ↑ ↓ stehen HIER und nicht oben in der Zeile — dieselbe Lehre wie bei
              der Marke: die obere Zeile ist bei 390 px voll. Diese Reihe umbricht.
            */}
            {canMove && (
              <>
                <Chip
                  title={S.sheet.container.up}
                  dimmed={at <= 0}
                  onClick={() => moveRow(row, -1)}
                >
                  ↑
                </Chip>
                <Chip
                  title={S.sheet.container.down}
                  dimmed={at < 0 || at >= siblings.length - 1}
                  onClick={() => moveRow(row, 1)}
                >
                  ↓
                </Chip>
              </>
            )}
            {isContainer ? (
              <>
                <Chip
                  active={row.container?.weightless === true}
                  title={S.sheet.container.weightlessHint}
                  onClick={() =>
                    save((c) => {
                      const item = c.inventory.find((r) => r.id === row.id);
                      if (item?.container === undefined) return;
                      item.container.weightless = !item.container.weightless;
                    })
                  }
                >
                  {S.sheet.container.weightless}
                </Chip>
                <Chip
                  title={S.sheet.container.unmakeHint}
                  onClick={() =>
                    save((c) => {
                      const item = c.inventory.find((r) => r.id === row.id);
                      if (item === undefined) return;
                      delete item.container;
                      /*
                        Der Inhalt bleibt und liegt danach am Körper. Die Zeiger
                        werden dabei WIRKLICH gelöscht und nicht bloß ins Leere
                        zeigen gelassen: eine Kennung auf eine Zeile, die es noch
                        gibt, aber kein Behälter mehr ist, wäre ein Widerspruch in
                        den Daten — und aus Widersprüchen zwischen zwei Feldern hat
                        dieses Projekt schon einmal einen Fehler bezahlt.
                      */
                      for (const other of c.inventory) {
                        if (other.containerId === row.id) delete other.containerId;
                      }
                    })
                  }
                >
                  {S.sheet.container.unmake}
                </Chip>
              </>
            ) : (
              <>
                <Chip
                  title={S.sheet.container.makeHint}
                  onClick={() =>
                    save((c) => {
                      const item = c.inventory.find((r) => r.id === row.id);
                      if (item === undefined) return;
                      item.container = { weightless: false };
                      // Ein Behälter liegt nie in einem anderen (siehe engine/carry.ts).
                      delete item.containerId;
                    })
                  }
                >
                  {S.sheet.container.make}
                </Chip>
                {containers.length > 0 && (
                  <>
                    <span className="text-[11px] text-slate-500">{S.sheet.container.putInto}</span>
                    <Chip
                      active={parentOf(row) === undefined}
                      onClick={() =>
                        save((c) => {
                          const item = c.inventory.find((r) => r.id === row.id);
                          if (item !== undefined) delete item.containerId;
                        })
                      }
                    >
                      {S.sheet.container.onBody}
                    </Chip>
                    {containers.map((holder) => (
                      <Chip
                        key={holder.id}
                        active={parentOf(row) === holder.id}
                        onClick={() =>
                          save((c) => {
                            const item = c.inventory.find((r) => r.id === row.id);
                            if (item === undefined) return;
                            item.containerId = holder.id;
                            // Was eingepackt ist, ist nicht angelegt — die
                            // Gegenrichtung zu `cycleSlot`.
                            item.slot = "none";
                          })
                        }
                      >
                        {itemLabel(holder, entityOf(holder))}
                      </Chip>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
        {/*
          Der Inhalt steht UNTER seinem Behälter und eingerückt — die
          Verschachtelung folgt der Zeile, nicht einem eigenen Abschnitt. So bleibt
          der Rucksack bei seinem Inhalt, auch wenn er selbst getragen wird.
        */}
        {isContainer && (
          <ul className="mt-1 divide-y divide-slate-800 border-l-2 border-slate-700 pl-2">
            {inside.map(renderRow)}
            {inside.length === 0 && (
              <li className="py-1 text-xs text-slate-600">{S.sheet.container.empty}</li>
            )}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      {/*
        Geld GANZ OBEN. Vorher stand der Block unter der Gegenstandsliste und
        unter „Hinzufügen" — bei einem Charakter mit 15 Zeilen war er außer Sicht,
        und seit die Zeilen eine Marke und eine Wirkungszeile tragen, sind sie
        deutlich höher. Philipp hat ihn schlicht nicht mehr gefunden.
      */}
      <Card>
        <SectionTitle>{S.sheet.money}</SectionTitle>
        {/*
          Raster, keine Zeile: bei 390 px Breite lief das vierte Feld (CP) rechts
          aus dem Bild. Vier gleich breite Spalten passen immer.
        */}
        <div className="grid grid-cols-4 gap-2">
          {(["pp", "gp", "sp", "cp"] as const).map((coin) => (
            <label key={coin} className="flex items-center gap-1">
              <span className="w-5 shrink-0 text-[11px] uppercase text-slate-500">{coin}</span>
              <input
                type="number"
                inputMode="numeric"
                value={character.money[coin]}
                onChange={(e) =>
                  save((c) => void (c.money[coin] = Math.max(0, e.target.valueAsNumber || 0)))
                }
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 text-right text-sm tabular-nums"
              />
            </label>
          ))}
        </div>
      </Card>

      {/* Wählen, was in welcher Hand liegt — statt sich durch Marken zu tippen. */}
      <HandsCard character={character} save={save} entities={entities ?? []} />

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
        {/*
          Der Fight-Club-Export enthält KEINE Ausrüstung — nur Angriffszeilen.
          Deshalb hat ein importierter Charakter gar kein Rüstungs- und kein
          Schild-Objekt, und in der Liste ist einfach nichts zu sehen. Der
          Ausgleichs-Modifikator hält die RK auf dem Importwert; das ist der
          verlässliche Hinweis darauf, dass hier etwas fehlt.
        */}
        {missingArmor && (
          <p className="mt-1 rounded-lg border border-amber-800/60 bg-amber-950/30 p-2 text-xs text-amber-300">
            {S.sheet.noArmorHint}
          </p>
        )}
        {/*
          Der Gegenfall, und der wichtigere: die Rüstung IST jetzt da, und der
          Ausgleich zählt weiter mit. Das ist keine Warnung, die man wegklicken
          kann — es ist eine falsche Zahl auf dem Bogen, und sie muss mit einem
          Tap wegzubekommen sein.
        */}
        {doubleCountedAc && (
          <div className="mt-1 rounded-lg border border-rose-800/60 bg-rose-950/30 p-2 text-xs text-rose-200">
            <p className="font-semibold">{S.sheet.acDoubleTitle}</p>
            <ul className="mt-1 space-y-0.5 font-mono text-[11px]">
              {acCompensation.map((m) => (
                <li key={m.id}>
                  {fmtMod(m.value)} — {m.note}
                </li>
              ))}
            </ul>
            <p className="mt-1 leading-snug">
              {S.sheet.acDoubleHint(
                suppressedByCompensation.map((c) => c.source),
                sheet.ac.total.total,
              )}
            </p>
            <div className="mt-1.5">
              <GhostButton
                danger
                onClick={() => {
                  const removed = character.miscModifiers.filter((m) =>
                    acCompensation.some((c) => c.id === m.id),
                  );
                  save(
                    (c) =>
                      void (c.miscModifiers = c.miscModifiers.filter(
                        (m) => !removed.some((r) => r.id === m.id),
                      )),
                  );
                  /*
                    Rücknahme angeboten, statt vorher zu fragen. Löschen ist hier
                    das Richtige und die Zahlen stehen daneben — aber es sind seine
                    Daten, und ein Fehlgriff darf nicht bedeuten, dass er den
                    Importwert nachrechnen muss.
                  */
                  undo.offer(S.sheet.acDoubleUndo, () =>
                    save((c) => {
                      for (const m of removed) {
                        if (!c.miscModifiers.some((x) => x.id === m.id)) c.miscModifiers.push(m);
                      }
                    }),
                  );
                }}
              >
                {S.sheet.acDoubleRemove}
              </GhostButton>
            </div>
          </div>
        )}
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
            {/*
              Woraus die Zahl besteht — aber nur, wenn es etwas zu erklären GIBT.
              Ohne Münzgewicht und ohne magischen Behälter ist die Summe das
              Gepäck, und ein Satz, der das wiederholt, ist genau der Satz, der
              nicht gelesen wird.
            */}
            {sheet.encumbrance.coinLb > 0 && (
              <span className="w-full text-slate-500">
                {S.sheet.loadParts(sheet.encumbrance.itemsLb, sheet.encumbrance.coinLb)}
              </span>
            )}
            {sheet.encumbrance.weightlessLb > 0 && (
              <span className="w-full text-slate-500">
                {S.sheet.loadWeightless(sheet.encumbrance.weightlessLb)}
              </span>
            )}
          </div>
        )}
      </Card>

      {/*
        Was die Rüstung KOSTET — direkt unter dem, was angelegt ist, und nicht im
        Werte-Reiter. Hier stellt sich die Frage („soll ich die Vollplatte
        anlegen?"), und hier steht die Antwort: dieselbe Nachbarschaft wie bei der
        Traglast eine Zeile darüber.
      */}
      <ArmorCostCard sheet={sheet} />

      <Card>
        <SectionTitle>{S.actions.add}</SectionTitle>
        {/*
          Blättern statt raten. Vorher stand hier eine reine Suche: erst ab zwei
          getippten Buchstaben, dann 20 unsortierte Treffer — und „armor" lieferte
          darunter keine einzige Rüstung, weil die zwölf echten „Banded mail",
          „Full plate" und „Chain shirt" heißen. Die Regeln dahinter (welche Gruppe,
          welche Untergruppe, welcher Grad bei Schriftrollen) stehen in
          `packages/core/src/compendium/items.ts`, nicht hier.
        */}
        {compendium === undefined ? (
          <p className="text-sm text-slate-500">{S.misc.loading}</p>
        ) : (
          <ItemPicker
            compendium={compendium}
            proficiency={proficiency}
            suggestions={suggestions}
            onPick={(item) =>
              save((c) =>
                void c.inventory.push({
                  id: crypto.randomUUID(),
                  itemId: item.id,
                  qty: 1,
                  slot: "none",
                  extraEffects: [],
                }),
              )
            }
          />
        )}
        {/*
          Hier stand „+ Freier Gegenstand": zwei Systemdialoge für Name und
          Gewicht, und heraus kam eine Zeile ohne Wirkung. Eine eigene Rüstung war
          damit nicht anzulegen (DEX-Grenze und Fertigkeits-Malus fehlten), eine
          eigene Waffe bekam keine Angriffszeile — genau seine Lücke: „die dann
          auch wirklich rechnen".

          Jetzt entsteht ein echter Gegenstand mit echten Werten. Bestehende freie
          Zeilen (nur `customName`) funktionieren weiter; sie werden nur nicht mehr
          neu angeboten, damit es nicht zwei Wege für dieselbe Sache gibt.
        */}
        <GhostButton onClick={() => setEditor({})}>{S.items.editor.addOwn}</GhostButton>
      </Card>

      {compendium !== undefined && (
        <ItemEditor
          open={editor !== null}
          compendium={compendium}
          existing={editor?.entity}
          usedBy={editor?.usedBy}
          /*
            Löschen gibt es nur für EIGENE Typen und nur beim Bearbeiten. Beim
            Anlegen existiert noch nichts, und SRD-Einträge sind unveränderlich —
            `CompendiumRepo.remove` wirft dort ohnehin.
          */
          {...(editor?.entity !== undefined && editor.entity.source === "homebrew"
            ? {
                onRemove: () => {
                  const entity = editor.entity!;
                  const write = () => CompendiumRepo.remove(entity);
                  void write().catch((error: unknown) =>
                    reportSaveFailure(entity.name, error, write),
                  );
                },
              }
            : {})}
          onClose={() => setEditor(null)}
          onSave={(entity) => {
            /*
              Anlegen legt den Gegenstand ins Regal UND ins Gepäck — sonst hätte er
              etwas gebaut, das nirgends auftaucht. Ändern schreibt nur das Regal;
              die Inventarzeile zeigt schon darauf, und `saveHomebrew` zählt die
              rev hoch, damit der Abgleich die Änderung als neuer erkennt.
            */
            const isNew = editor?.entity === undefined;
            /*
              Hier stand ein nacktes `void`: ein eigener Gegenstand, dessen
              Speichern fehlschlug, verschwand mit dem Editor, ohne dass jemand
              etwas sagte — und das ist ein Stück Arbeit, keine Zahl.
            */
            const write = () =>
              isNew
                ? CompendiumRepo.createHomebrew(entity).then(() =>
                    save((c) =>
                      void c.inventory.push({
                        id: crypto.randomUUID(),
                        itemId: entity.id,
                        qty: 1,
                        slot: "none",
                        extraEffects: [],
                      }),
                    ),
                  )
                : CompendiumRepo.saveHomebrew(entity);
            void write().catch((error: unknown) => reportSaveFailure(entity.name, error, write));
          }}
        />
      )}
    </div>
  );
}

export function FeatsTab({ character, sheet, editMode, save }: TabProps) {
  const entities = useAllEntities();
  const compendium = useCompendium();
  const skillEntities = (entities ?? []).filter((e) => e.kind === "skill" && !e.deletedAt);
  // Talente sind Stufenaufstiege in Papierform — die dürfen nicht auf einen Tap
  // verschwinden. Ändern und Löschen nur im Bearbeiten-Modus.
  const undo = useUndo();

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
                  {/*
                    Eigene Modifikatoren — der Weg, wie ein Talent aus einem
                    eigenen Buch (oder eine Hausregel) überhaupt etwas bewirkt.
                    300 der 327 SRD-Talente bringen von sich aus keine Zahl mit.
                  */}
                  <FeatModifiers
                    entity={entity}
                    own={feat.extraEffects}
                    skills={skillEntities}
                    editMode={editMode}
                    onChange={(next) =>
                      save((c) => {
                        const row = c.feats[index];
                        if (row) row.extraEffects = next;
                      })
                    }
                  />
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
                      <Icon name="combat" size={17} />
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
        {/*
          Derselbe Blätterer wie im Assistenten und im Stufenaufstieg.

          Hier stand eine Suche, die erst ab zwei getippten Zeichen etwas zeigte und
          dann 20 Treffer — blättern war gar nicht vorgesehen. Genau das hat er bei
          der Ausrüstung schon einmal beanstandet, und dazu fehlte jedes Wort über
          die Voraussetzungen.
        */}
        {compendium !== undefined && (
          <FeatPicker
            compendium={compendium}
            sheet={sheet}
            chosen={character.feats.map((f) => f.featId)}
            onPick={(feat) => save((c) => void c.feats.push({ featId: feat.id, extraEffects: [] }))}
          />
        )}
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
  { path: "hp.max", label: "Max. HP" },
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
