import { useMemo, useState } from "react";
import {
  BONUS_TYPES,
  allowedSlots,
  assignFeatOrigins,
  conflictingEquipIds,
  sameOrigin,
  deityOf,
  displayName,
  featNeedsWeaponChoice,
  isStatPath,
  isWeaponEntity,
  equipTap,
  itemKind,
  proficiencyFor,
  warDomainGrant,
  weaponSuggestions,
  type BonusType,
  type EquipSlot,
  type FeatSlotSource,
  type ItemEntity,
  type ItemKind,
  type StatPath,
} from "@codex35/core";
import { S } from "../../strings.js";
import { Icon } from "../../ui/icons.js";
import { toPortraitDataUrl } from "../../lib/image.js";
import { FeatText } from "../../ui/FeatText.js";
import { FeatPicker } from "../../ui/FeatPicker.js";
import { FeatWeaponPicker } from "../../ui/FeatWeaponPicker.js";
import { FeatModifiers } from "../../ui/FeatModifiers.js";
import { describeModifier } from "../../ui/modifierTargets.js";
import { UndoBar, useUndo } from "../../ui/UndoBar.js";
import { useDragSort } from "../../ui/useDragSort.js";
import { ConfirmDeleteButton } from "../../ui/ConfirmDelete.js";
import { useAllEntities, useCompendium, useHouseRules } from "../../lib/hooks.js";
import { reportSaveFailure } from "../../lib/saveError.js";
import {
  BottomSheet,
  Card,
  Chip,
  GhostButton,
  SearchInput,
  SectionTitle,
  fmtMod,
} from "../../ui/bits.js";
import { EquipMark } from "../../ui/EquipMark.js";
import { ArmorCostCard } from "../../ui/ArmorCostCard.js";
import { TrackersCard } from "./Trackers.js";
import { ItemName, ItemText } from "../../ui/ItemName.js";
import { RuleHint } from "../../ui/RuleHint.js";
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
    Welche Zeile ihr Platz-Menue offen hat — der lange Druck auf die Marke.

    Die KENNUNG und nicht die Zeile: nach dem Setzen soll das Menue die neue Marke zeigen
    und nicht den Stand von damals. Dieselbe Regel wie ueberall in diesem Projekt.
  */
  const [slotMenu, setSlotMenu] = useState<string | null>(null);
  /* Ist das Hinzufuegen-Blatt offen? Zu ist der Normalfall — man traegt oefter, als man kauft. */
  const [addOpen, setAddOpen] = useState(false);

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
        /*
          Die Lieblingswaffe der Gottheit, wenn die War-Domäne gewählt ist: ihr
          Granted Power gewährt die Übung mit. Ohne das stünde am Bogen eines
          reinen Klerikers „Weapon Focus geschenkt" und daneben „ohne Übung" —
          zwei Sätze über dieselbe Waffe, die sich widersprechen.
        */
        compendium === undefined
          ? []
          : (() => {
              const grant = warDomainGrant(deityOf(character, compendium), character.domains);
              return grant === null ? [] : [grant.weaponId];
            })(),
      ),
    [character.levels, character.raceId, character.deityRef, character.domains, compendium],
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
  const childrenOf = (id: string) => inOrder.filter((row) => parentOf(row) === id);
  /** Was der Behälter laut Engine trägt — gerechnet wird dort, nicht hier. */
  const loadOf = (id: string) => sheet.encumbrance.containers.find((c) => c.id === id);

  /**
   * Gehören diese zwei Zeilen in dieselbe Gruppe — also darf ein Zug sie tauschen?
   *
   * Dieselbe Frage wie `siblingsOf` weiter unten, nur über Kennungen: gleicher Behälter,
   * und beide entweder abgelegt oder beide angelegt. Ohne das schiebt ein Zug die Zeile
   * aus ihrem Rucksack heraus, und das sieht wie ein Fehler aus.
   */
  const sameGroup = (aId: string, bId: string) => {
    const a = character.inventory.find((row) => row.id === aId);
    const b = character.inventory.find((row) => row.id === bId);
    if (a === undefined || b === undefined) return false;
    return parentOf(a) === parentOf(b) && (a.slot === "none") === (b.slot === "none");
  };

  /*
    ZIEHEN zum Umsortieren — sein Wort: „Umsortieren per Ziehen, gerne."

    Der Hook bekommt ALLE Kennungen des Gepäcks und nicht eine Liste je Behälter: Hooks
    dürfen nicht in einer Schleife stehen, und drei Behälter wären vier Aufrufe. Die
    Gruppengrenze steckt deshalb in `canSwap` — getauscht wird nur unter Geschwistern,
    genau wie bei den ↑↓-Knöpfen, die als Rückweg BLEIBEN (mit einer Maus oder einem
    Vorleseprogramm ist ein Zug kein Ersatz für einen Knopf).

    Geschrieben wird EINMAL beim Loslassen: die Liste wird nach der neuen Reihenfolge
    aufgebaut, und zwar über die Kennungen und nie über Indizes — die angezeigten Listen
    sind gefiltert und gruppiert.
  */
  const drag = useDragSort(
    character.inventory.map((row) => row.id),
    (order) =>
      save((c) => {
        const byId = new Map(c.inventory.map((row) => [row.id, row]));
        const next = order.map((id) => byId.get(id)).filter((row) => row !== undefined);
        // Sicherheitsnetz: kommt eine Zeile in der Reihenfolge nicht vor (sie wurde
        // während des Zugs gelöscht oder ist neu), bleibt sie erhalten statt zu
        // verschwinden. Ein Umsortieren darf niemals Daten kosten.
        for (const row of c.inventory) if (!order.includes(row.id)) next.push(row);
        c.inventory = next;
      }),
    { canSwap: (a, b) => sameGroup(a, b) },
  );

  /*
    Die Reihenfolge der ANZEIGE: während eines Zugs die Vorschau des Hooks, sonst die
    gespeicherte. Gerendert wird immer aus dieser Liste, damit die Vorschau überall
    gleich ankommt — im Gepäck und in jedem Behälter.
  */
  const byId = new Map(character.inventory.map((row) => [row.id, row]));
  const inOrder = drag.order
    .map((id) => byId.get(id))
    .filter((row): row is (typeof character.inventory)[number] => row !== undefined);

  // Angelegt zuerst, wie in Fight Club — was am Körper hängt, zählt im Kampf.
  // Wer in einem Behälter liegt, erscheint NUR dort: sonst stünde er zweimal da.
  const equipped = inOrder.filter((row) => row.slot !== "none" && parentOf(row) === undefined);
  const stowed = inOrder.filter((row) => row.slot === "none" && parentOf(row) === undefined);
  /** Alle Behälter — für die Knopfreihe „Einpacken:" an jeder Zeile. */
  const containers = character.inventory.filter((row) => row.container !== undefined);

  /**
   * Umsortieren mit den Knöpfen: mit dem NACHBARN tauschen, nicht an eine Stelle springen.
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
    return inOrder.filter(
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
  /**
   * EIN Griff — sein Auftrag: „dass ich nicht erst etwas ablegen muss, um etwas Neues
   * anzulegen."
   *
   * Wohin und was dafuer weichen muss, entscheidet `equipTap` im Kern; hier wird nur
   * geschrieben und ANGESAGT. Die Ansage ist kein Schmuck: ein Tipp, der still ein Schild
   * ablegt, kostet RK, und das faellt am Tisch erst auf, wenn man getroffen wird. Die
   * Ruecknahme steht in derselben Leiste wie beim Loeschen.
   */
  const legeAn = (id: string) => {
    const row = character.inventory.find((r) => r.id === id);
    if (row === undefined) return;
    const vorher = character.inventory.map((r) => ({ id: r.id, slot: r.slot, containerId: r.containerId }));
    const plan = equipTap(
      entityOf(row),
      character.inventory.map((r) => ({ id: r.id, slot: r.slot })),
      id,
    );
    setzeSlot(id, plan.slot);
    if (plan.displaced.length === 0) return;
    const namen = plan.displaced.flatMap((otherId: string) => {
      const other = character.inventory.find((r) => r.id === otherId);
      return other === undefined ? [] : [itemLabel(other, entityOf(other))];
    });
    undo.offer(S.sheet.equipDisplaced(namen), () =>
      save((c) => {
        for (const alt of vorher) {
          const jetzt = c.inventory.find((r) => r.id === alt.id);
          if (jetzt === undefined) continue;
          jetzt.slot = alt.slot;
          if (alt.containerId === undefined) delete jetzt.containerId;
          else jetzt.containerId = alt.containerId;
        }
      }),
    );
  };

  /** Einen bestimmten Platz setzen — der Weg aus dem langen Druck. */
  const setzeSlot = (id: string, target: EquipSlot) =>
    save((c) => {
      const item = c.inventory.find((r) => r.id === id);
      if (!item) return;
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
    const wirdGezogen = drag.dragging === row.id;
    return (
      /*
        `data-drag-id` ist die Spur, an der der Zug die Zeile unter dem Finger erkennt
        (`elementFromPoint` → `closest`). Sie steht am `li` und nicht am Anfasser: gesucht
        ist die ZEILE, über der der Finger schwebt, nicht deren Griff.
      */
      <li
        key={row.id}
        data-drag-id={row.id}
        className={`py-1.5 text-sm ${wirdGezogen ? "rounded-lg bg-amber-950/40 ring-1 ring-amber-700/60" : ""}`}
      >
        <div className="flex items-center gap-2">
        <EquipMark
          slot={row.slot}
          onClick={() => legeAn(row.id)}
          onLongPress={() => setSlotMenu(row.id)}
        />
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
            {/*
              Der ANFASSER. Er ist bewusst kein `<button>`: erstens ist „der erste Knopf
              einer Gepäckzeile ist die Anlege-Marke" eine Regel, an der mehrere
              Teststrecken hängen, und zweitens ist ein Griff kein Knopf — ein Tap darauf
              tut nichts. Die Tastatur kommt über die ↑↓-Chips daneben zum Ziel, die
              genau dafür bleiben.

              `touch-action: none` steht NUR hier (aus dem Hook): dadurch scrollt die
              Liste überall sonst weiter, und die Wischgeste für den Reiterwechsel bleibt
              unberührt. Das war der Grund, warum diese Runde vorher Knöpfe hatte.
            */}
            {canMove && (
              <span
                {...drag.handleProps(row.id)}
                aria-hidden="true"
                title={S.sheet.container.drag}
                /*
                  Etwas größer als ein Chip: der Griff ist das einzige Ziel, das man
                  TREFFEN muss, bevor man zieht — mit dem Daumen am Tisch. Gefunden hat
                  das der Blick aufs Bild (26×22 px waren knapp), nicht eine Prüfung.
                */
                className="cursor-grab select-none rounded-full border border-slate-600 px-3 py-1.5 text-sm leading-none text-slate-400 active:cursor-grabbing"
              >
                ⠿
              </span>
            )}
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
                            // Gegenrichtung zu `legeAn`.
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

      {/*
        Zähler mit Bereich „Ausrüstung": Fackeln, Rationen, Ladungen eines Zauberstabs.
        Verbrauch gehört zu dem, was man mit sich trägt.
      */}
      <TrackersCard {...{ character, sheet, editMode, save }} category="gear" />

      {/*
        HINZUFUEGEN steckt hinter EINEM Knopf — sein Auftrag: „das kann man auf jeden Fall
        schmaler machen, weil so oft fuegt man jetzt keine neuen Waffen hinzu … dass man
        wirklich erst, wenn man den Button drueckt, die ganzen Optionen beziehungsweise die
        Kategorien erst erscheinen. Das kann man ja auch quasi in soner Art Pop-up Menue
        machen."

        Vorher stand der ganze Blaetterer offen im Reiter: Suchfeld, neun aufklappbare
        Kategorien und der Knopf fuer eigene Gegenstaende — jedes Mal, auch wenn man nur
        nachsehen wollte, was man traegt. Geblieben ist eine Zeile.
      */}
      <Card padding="p-2">
        <GhostButton onClick={() => setAddOpen(true)}>{S.sheet.addGear}</GhostButton>
      </Card>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title={S.sheet.addGear}>
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
        <GhostButton
          onClick={() => {
            setAddOpen(false);
            setEditor({});
          }}
        >
          {S.items.editor.addOwn}
        </GhostButton>
      </BottomSheet>

      {/*
        Der lange Druck: die Plaetze einzeln — seine Wahl, seit der Haende-Kasten weg ist.

        Gebaut aus der FRISCHEN Zeile, nicht aus einem festgehaltenen Objekt: nach dem
        Setzen zeigt das Blatt sofort den neuen Stand. Und die Liste kommt aus
        `allowedSlots` im Kern — waere sie hier ausgeschrieben, stuende die Regel
        „ein Schild geht nur in die Schildhand" ein zweites Mal da.
      */}
      {(() => {
        const row = character.inventory.find((r) => r.id === slotMenu);
        if (row === undefined) return null;
        const entity = entityOf(row);
        const plaetze: EquipSlot[] = ["none", ...allowedSlots(entity)];
        return (
          <BottomSheet open onClose={() => setSlotMenu(null)} title={itemLabel(row, entity)}>
            <p className="mb-2 text-xs text-slate-500">{S.sheet.equipMenuTitle}</p>
            <div className="flex flex-wrap gap-2">
              {plaetze.map((platz) => (
                <Chip
                  key={platz}
                  active={row.slot === platz}
                  onClick={() => {
                    setzeSlot(row.id, platz);
                    setSlotMenu(null);
                  }}
                >
                  {S.sheet.equipSlot[platz] ?? platz}
                </Chip>
              ))}
            </div>
          </BottomSheet>
        );
      })()}

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

      {/*
        Geld GANZ UNTEN — sein Wort: der Kasten kann nach unten geschoben werden.

        Er stand einmal ganz OBEN, und der Grund dafuer steht noch im Aufschrieb: unter der
        Gegenstandsliste hatte Philipp ihn nicht mehr gefunden. Inzwischen ist der Reiter ein
        anderer — das Gepaeck ist geordnet, das Hinzufuegen steckt hinter einem Knopf, und was
        oben Platz wegnimmt, faellt auf. Geld zaehlt man nach dem Abenteuer, nicht im Kampf.
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
  /** Der Reihenindex des Talents, dessen Waffe gerade gewechselt wird. */
  const [weaponForIndex, setWeaponForIndex] = useState<number | null>(null);
  /*
    Die Liste weiterer Talente ist ZU, bis er sie aufmacht — sein Auftrag: „Erst mal
    nur die Talente anzeigen, die man auch hat. Die Liste von weiteren Talenten sollte
    unten dann aufklappbar sein und nicht direkt drunter angeflanscht."
  */
  const [addOpen, setAddOpen] = useState(false);

  /*
    Die Waffen, die dieser Charakter wirklich trägt. Der Name kommt aus der ZEILE
    (eine eigene Waffe heißt am Bogen anders als im Kompendium), die Kennung aus dem
    Kompendium — der Bonus gilt für den Waffen-TYP.
  */
  const ownWeapons = character.inventory
    .map((row) => {
      const item = row.itemId ? entities?.find((e) => e.id === row.itemId) : undefined;
      return isWeaponEntity(item) && item !== undefined
        ? { id: item.id, name: row.customName ?? displayName(item) }
        : null;
    })
    .filter((entry): entry is { id: string; name: string } => entry !== null);

  /*
    Hinzufügen nur, wenn auch ein Punkt dafür da ist — sein Auftrag: „dass man nur was
    hinzufügen kann, wenn man auch einen Punkt dafür frei hat oder über bearbeiten wenn
    man was wechseln darf". Ein Talent-Slot aus einem eigenen Buch zählt dabei von
    allein mit: `featSlots.available` summiert JEDE Quelle von `feats.slots`, auch die
    aus Homebrew-Klassen.
  */
  const slotsLeft = sheet.featSlots.available - sheet.featSlots.used;
  const mayAdd = slotsLeft > 0 || editMode;

  /** Eine Herkunft setzen oder wegnehmen — `undefined` heißt „keine Angabe". */
  const setOrigin = (index: number, origin: FeatSlotSource["origin"] | undefined) =>
    save((c) => {
      const f = c.feats[index];
      if (!f) return;
      if (origin === undefined) delete f.origin;
      else f.origin = { ...origin };
    });

  /*
    Sein Auftrag: „Du kannst ja den bisherigen sechs Talenten einfach eine Quelle
    zuordnen, sodass diese sechs einfach verteilt sind." Die Verteilung selbst steht im
    KERN (`assignFeatOrigins`) — dieselbe Funktion benutzen der Assistent und der
    Stufenaufstieg, sonst wären es drei Regeln für dieselbe Frage.

    Der Knopf steht nur da, wenn es etwas zu tun GIBT: ein Knopf, der bei jedem Blick
    auf den Reiter „0 Zeilen" verteilt, ist Lärm.
  */
  const ohneHerkunft = character.feats.filter((f) => f.origin === undefined).length;
  const assignOrigins = () => {
    const vorschlag = assignFeatOrigins(
      character.feats.map((f) => f.origin),
      sheet.featSlots.sources,
    );
    const vorher = structuredClone(character.feats);
    let gesetzt = 0;
    save((c) => {
      vorschlag.forEach((origin, i) => {
        const f = c.feats[i];
        if (f === undefined || origin === undefined || f.origin !== undefined) return;
        f.origin = { ...origin };
        gesetzt++;
      });
    });
    undo.offer(
      S.feats.originAssigned(Math.min(gesetzt || ohneHerkunft, ohneHerkunft)),
      () => save((c) => void (c.feats = vorher)),
      "zugeordnet",
    );
  };

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle>
          {S.sheet.tabs.feats} ({sheet.featSlots.used}/{sheet.featSlots.available})
        </SectionTitle>
        <UndoBar pending={undo.pending} onUndo={undo.undo} onDismiss={undo.dismiss} />
        {/*
          EINMAL über der Liste statt an jeder Zeile: bei sieben Talenten wäre der
          Satz siebenmal da, und ein Satz, der immer dasteht, wird nicht gelesen.
        */}
        {editMode && (
          <>
            <p className="mb-1 text-[11px] leading-snug text-slate-500">{S.feats.originHint}</p>
            {/*
              Der Vorschlag für alles, was noch nichts trägt. Nur da, wenn es etwas zu
              verteilen GIBT — ein Knopf, der bei jedem Blick „0 Zeilen" verteilt, ist
              Lärm. Der Hinweis steht DARUNTER und nicht darüber: er erklärt den Knopf,
              und ein Satz über der falschen Sache ist schlimmer als keiner (im
              Punktekauf schon einmal bezahlt).
            */}
            {ohneHerkunft > 0 && (
              <div className="mb-2">
                <GhostButton onClick={assignOrigins}>{S.feats.originAssign}</GhostButton>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  {S.feats.originAssignHint(ohneHerkunft)}
                </p>
              </div>
            )}
          </>
        )}
        {/*
          Kräftigere Linie und mehr Luft — sein Auftrag: „Die Talente in der Talente
          Seite bitte deutlicher voneinander trennen mit 'ner leichten Trennlinie oder
          so oder etwas mehr Abstand." Beides, denn jedes Talent trägt inzwischen
          Erklärtext, Marken und im Bearbeiten-Modus eine Knopfreihe; bei `py-2` und
          `slate-800` liefen zwei Talente optisch ineinander.
        */}
        <ul className="divide-y divide-slate-700">
          {character.feats.map((feat, index) => {
            const entity = entities?.find((e) => e.id === feat.featId);
            // Talente wie Weapon Focus wirken nur mit einer bestimmten Waffe.
            // Ohne Zuordnung liegt der Bonus brach, also hier sichtbar machen.
            const needsItem = featNeedsWeaponChoice(entity);
            const chosen = feat.choiceRef
              ? entities?.find((e) => e.id === feat.choiceRef)
              : undefined;
            /** Sprechender Name für Meldungen — inklusive der Auswahl. */
            const label =
              (entity ? displayName(entity) : feat.featId) +
              (feat.choice ? ` (${feat.choice})` : "");
            /*
              Die Herkunft — sein Auftrag: „die Talente [sollen] die Info zeigen woher
              sie kommen." Eine QUELLE gewinnt vor der Stufe: „War Domain (Kord)" sagt
              mehr als „Stufe 1", und genau die Unterscheidung wollte er (Bonus fest
              gegen selbst gewählt).
            */
            const originLabel =
              feat.origin?.source ??
              (feat.origin?.level !== undefined ? S.feats.originLevel(feat.origin.level) : undefined);
            return (
              <li key={index} className="flex items-start justify-between gap-2 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{entity ? displayName(entity) : feat.featId}</span>
                  {feat.choice && <span className="text-slate-400"> ({feat.choice})</span>}
                  {originLabel !== undefined && (
                    <span className="ml-1.5 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 align-middle text-[10px] text-slate-400">
                      {originLabel}
                    </span>
                  )}
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
                  {/*
                    Der freie Text steht NUR an Talenten ohne Waffenbezug (Skill Focus,
                    eigene Talente aus seinen Büchern) — dort kennt die App die
                    Möglichkeiten nicht. Er schreibt DURCH und speichert nicht erst beim
                    Verlassen: ein Feld, das seinen Wert zwischenlagert, verliert Tippen.
                  */}
                  {editMode && !needsItem && (
                    <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                      {S.feats.choiceLabel}
                      <input
                        value={feat.choice ?? ""}
                        placeholder={S.feats.choicePlaceholder}
                        onChange={(e) => {
                          const next = e.target.value;
                          save((c) => {
                            const f = c.feats[index];
                            if (f) f.choice = next === "" ? undefined : next;
                          });
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                      />
                    </label>
                  )}
                  {/*
                    Die Herkunft wird GEWÄHLT, nicht getippt. Hier standen zwei
                    Freitextfelder (Stufe, Quelle) — in die konnte man „Stufe 47"
                    schreiben, und man musste selbst wissen, welche Plätze der Bogen
                    überhaupt hat. Die App weiß das: `sheet.featSlots.sources` rechnet
                    sie aus Stufen, Volk, Klassen-Bonustalenten und Gewährtem aus. Wo
                    die App die Möglichkeiten KENNT, gehört jede als Knopf hin.
                  */}
                  {editMode && (
                    <div className="mt-1.5">
                      <div className="text-[11px] text-slate-500">{S.feats.originPick}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Chip active={feat.origin === undefined} onClick={() => setOrigin(index, undefined)}>
                          {S.feats.originNone}
                        </Chip>
                        {sheet.featSlots.sources.map((slot, si) => {
                          const isMine = sameOrigin(feat.origin, slot.origin);
                          /*
                            Ein Platz gehört einem Talent. „belegt" steht dran, statt
                            den Knopf zu sperren: gewarnt statt gesperrt, und wer
                            zwei Zeilen tauschen will, kommt sonst nicht durch.
                          */
                          const takenByOther =
                            !isMine &&
                            character.feats.some(
                              (other, oi) => oi !== index && sameOrigin(other.origin, slot.origin),
                            );
                          return (
                            <Chip
                              key={`${slot.label}-${si}`}
                              active={isMine}
                              onClick={() => setOrigin(index, slot.origin)}
                            >
                              {slot.label}
                              {takenByOther && (
                                <span className="ml-1 text-[10px] text-slate-500">
                                  ({S.feats.originTaken})
                                </span>
                              )}
                            </Chip>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  {/*
                    Die Waffe wechselt man nur im Bearbeiten-Modus — sein Auftrag:
                    „man [soll] nicht einfach im Bogen die Waffe ändern können, sondern
                    das muss man einmal machen, wenn man das Talent auswählt. Und
                    ansonsten kann man es nur ändern, wenn man im Bearbeiten Modus ist."
                    Gewählt wird beim Hinzufügen (im `FeatPicker`); hier steht der
                    Rückweg, nicht der Hauptweg.
                  */}
                  {needsItem && editMode && (
                    <GhostButton
                      title={S.feats.changeWeapon}
                      onClick={() => setWeaponForIndex(index)}
                    >
                      <Icon name="combat" size={17} />
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
      </Card>

      {/*
        WEITERE Talente stehen in einer EIGENEN Karte und zugeklappt — sein Auftrag:
        „Erst mal nur die Talente anzeigen, die man auch hat. Die Liste von weiteren
        Talenten sollte unten dann aufklappbar sein und nicht direkt drunter
        angeflanscht." Vorher hing der ganze Blätterer (Suche, sieben Marken, zwei
        Abschnitte, 196 Zeilen) unmittelbar unter seinen sechs eigenen Talenten in
        derselben Karte — man scrollte an der eigenen Liste vorbei, ohne es zu merken.
      */}
      <Card>
        {mayAdd ? (
          <>
            <GhostButton onClick={() => setAddOpen(!addOpen)}>
              {addOpen ? "▾" : "▸"} {S.feats.addOpen}
              {slotsLeft > 0 ? ` (${S.feats.slotsFree(slotsLeft)})` : ""}
            </GhostButton>
            {/*
              Im Bearbeiten-Modus darf man auch ohne freien Platz etwas dazunehmen —
              dann steht dabei, WARUM es geht. Sonst sieht ein Knopf, der eigentlich
              gesperrt sein müsste, nach einem Fehler aus.
            */}
            {slotsLeft <= 0 && (
              <p className="mt-1.5 text-xs text-slate-500">{S.feats.editUnlocked}</p>
            )}
            {addOpen && compendium !== undefined && (
              <div className="mt-2">
                {/*
                  Derselbe Blätterer wie im Assistenten und im Stufenaufstieg — samt
                  Waffenfrage bei Weapon Focus, die dort im Picker sitzt und nicht in
                  dieser Ansicht.
                */}
                <FeatPicker
                  compendium={compendium}
                  sheet={sheet}
                  chosen={character.feats.map((f) => f.featId)}
                  ownWeapons={ownWeapons}
                  onPick={(feat, choice) =>
                    save((c) =>
                      void c.feats.push({
                        featId: feat.id,
                        extraEffects: [],
                        ...(choice ? { choiceRef: choice.choiceRef, choice: choice.choice } : {}),
                      }),
                    )
                  }
                />
              </div>
            )}
          </>
        ) : (
          /*
            Kein Platz — und die App sagt es, statt den Abschnitt stumm verschwinden zu
            lassen. Seine Wahl; der Grund ist die Fehlerfamilie „etwas weiß es, und
            etwas anderes kann es nicht": ein Weg, der ohne Wort fehlt, sieht wie ein
            Defekt aus.
          */
          <p className="text-xs text-slate-500">
            {S.feats.noSlots(sheet.featSlots.used, sheet.featSlots.available)}
          </p>
        )}
      </Card>

      {/*
        Die Waffe eines schon gewählten Talents wechseln — nur aus dem
        Bearbeiten-Modus heraus erreichbar (der Knopf steht dort).
      */}
      {weaponForIndex !== null && compendium !== undefined && (
        <FeatWeaponPicker
          feat={entities?.find((e) => e.id === character.feats[weaponForIndex]?.featId)}
          compendium={compendium}
          own={ownWeapons}
          current={character.feats[weaponForIndex]?.choiceRef}
          onPick={(choiceRef, name) => {
            const at = weaponForIndex;
            save((c) => {
              const f = c.feats[at];
              if (!f) return;
              f.choiceRef = choiceRef;
              f.choice = name;
            });
            setWeaponForIndex(null);
          }}
          onClose={() => setWeaponForIndex(null)}
        />
      )}

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
              {/*
                Die Klassenfähigkeit erklärt sich — und genau das ist der Text, den er
                nicht immer lesen will („ich kenne die Fähigkeiten meines Charakters").
                Ausgeblendet steht ein ▸ mit dem NAMEN der Fähigkeit da; ohne den Namen
                stünde bei zwölf Fähigkeiten zwölfmal dasselbe Zeichen untereinander.
              */}
              {feature.description && (
                <RuleHint label={feature.name} className="mt-0.5">
                  {feature.description}
                </RuleHint>
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
