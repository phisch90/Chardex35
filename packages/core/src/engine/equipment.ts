import type { ItemEntity } from "../schema/entities.js";

/**
 * Wohin am Körper gehört ein Gegenstand? Nur so grob, wie die Regeln es
 * verlangen: 3.5 kennt keine Ausrüstungs-Slots wie ein Computerspiel, aber es
 * kennt „eine Rüstung" und „ein Schild".
 */
export type ItemSlot = "armor" | "shield" | "weapon" | "other";

export function itemSlot(entity: ItemEntity | undefined | null): ItemSlot {
  if (!entity) return "other";
  if (entity.data.armor) return entity.data.armor.kind === "shield" ? "shield" : "armor";
  if (entity.data.weapon) return "weapon";
  return "other";
}

export interface EquipCandidate {
  id: string;
  slot: ItemSlot;
  equipped: boolean;
}

/**
 * Was muss ausgezogen werden, damit `id` angelegt werden kann?
 *
 * Eine zweite Rüstung über der ersten geht nicht, und zwei Schilde hat niemand
 * — die App darf beides deshalb nicht gleichzeitig zählen, sonst stimmt die RK
 * nicht und niemand sieht, warum. Waffen bleiben unbegrenzt: zwei Waffen
 * gleichzeitig zu führen ist ein normaler Fall (Zweiwaffenkampf), und wie viele
 * Hände frei sind, entscheidet der Tisch.
 */
export function conflictingEquipIds(items: EquipCandidate[], id: string): string[] {
  const target = items.find((item) => item.id === id);
  if (!target) return [];
  if (target.slot !== "armor" && target.slot !== "shield") return [];
  return items
    .filter((item) => item.id !== id && item.equipped && item.slot === target.slot)
    .map((item) => item.id);
}
