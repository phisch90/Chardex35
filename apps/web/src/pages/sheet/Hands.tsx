import { allowedSlots, conflictingEquipIds, displayName, type Entity } from "@codex35/core";
import { S } from "../../strings.js";
import { Card, SectionTitle } from "../../ui/bits.js";
import { itemSummary } from "../../ui/itemSummary.js";
import type { TabProps } from "./index.js";

/**
 * Was trage ich WO — als Auswahl, nicht als Rätsel.
 *
 * Die Marken an den Gegenständen bleiben (schnell, ein Tap). Aber Philipps Bitte
 * war wörtlich „ich möchte wählen können, was ich in 1H und OH halte", und das ist
 * etwas anderes: hier steht die Frage („Haupthand: was?"), nicht die Antwort
 * verteilt über fünfzehn Zeilen. Bei mehreren Waffen im Gepäck ist Durchtippen
 * genau der Umweg, den er nicht will.
 *
 * Drei Zeilen, weil es am Körper drei Plätze gibt, um die man sich im Kampf
 * kümmert: Rüstung, Haupthand, Schildhand. Ringe und Amulette hängen nicht davon
 * ab, welche Hand frei ist — die bleiben in der Liste.
 */
export function HandsCard({
  character,
  save,
  entities,
}: {
  character: TabProps["character"];
  save: TabProps["save"];
  entities: Entity[];
}) {
  const itemOf = (row: (typeof character.inventory)[number]) => {
    const hit = row.itemId ? entities.find((e) => e.id === row.itemId) : undefined;
    return hit?.kind === "item" ? hit : undefined;
  };
  const label = (row: (typeof character.inventory)[number]) => {
    const entity = itemOf(row);
    return row.customName ?? (entity ? displayName(entity) : "—");
  };

  /**
   * Name + das eine Kennzeichen, das beim Wählen hilft — der Schaden.
   *
   * Die ganze Zusammenfassung („1d6 Schaden · krit. 19-20/x2 · 2 lb") passt nicht
   * in ein zugeklapptes Auswahlfeld und wurde mitten im Wort abgeschnitten.
   * Kritischer Bereich und Gewicht entscheiden nicht, welche Waffe man zieht;
   * dafür steht sie in der Liste unten vollständig.
   */
  const optionText = (row: (typeof character.inventory)[number]) => {
    const damage = itemSummary(itemOf(row)).split(" · ")[0] ?? "";
    return damage === "" ? label(row) : `${label(row)} — ${damage}`;
  };

  /** Alles im Gepäck, das auf diesen Platz darf. */
  const candidates = (slot: "armor" | "mainHand" | "offHand") =>
    character.inventory.filter((row) => allowedSlots(itemOf(row)).includes(slot));

  /**
   * Wer belegt den Platz gerade? Eine beidhändig geführte Waffe belegt BEIDE
   * Hände — sie muss in beiden Zeilen auftauchen, sonst behauptet die Karte, die
   * Schildhand sei frei, während dort ein Zweihänder liegt.
   */
  const holderOf = (slot: "armor" | "mainHand" | "offHand") =>
    character.inventory.find(
      (row) =>
        row.slot === slot || (slot !== "armor" && row.slot === "bothHands"),
    );

  const place = (slot: "armor" | "mainHand" | "offHand", id: string) =>
    save((c) => {
      // Erst den Platz leer machen: was dort liegt (auch beidhändig), geht ab.
      for (const row of c.inventory) {
        if (row.slot === slot || (slot !== "armor" && row.slot === "bothHands")) {
          row.slot = "none";
        }
      }
      if (id === "") return;
      const target = c.inventory.find((r) => r.id === id);
      if (!target) return;
      target.slot = slot;
      for (const otherId of conflictingEquipIds(
        c.inventory.map((r) => ({ id: r.id, slot: r.slot })),
        id,
        slot,
      )) {
        const other = c.inventory.find((r) => r.id === otherId);
        if (other) other.slot = "none";
      }
    });

  const rows = ["armor", "mainHand", "offHand"] as const;

  return (
    <Card>
      <SectionTitle>{S.sheet.hands}</SectionTitle>
      <div className="space-y-2">
        {rows.map((slot) => {
          const holder = holderOf(slot);
          const zweihändig = holder?.slot === "bothHands";
          const options = candidates(slot);
          return (
            <label key={slot} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-slate-500">
                {S.sheet.handsRows[slot]}
              </span>
              <select
                value={zweihändig ? "" : (holder?.id ?? "")}
                onChange={(e) => place(slot, e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
              >
                <option value="">
                  {zweihändig ? S.sheet.handsTwoHanded(label(holder!)) : S.sheet.handsFree}
                </option>
                {options.map((row) => (
                  <option key={row.id} value={row.id}>
                    {optionText(row)}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{S.sheet.handsHint}</p>
    </Card>
  );
}
