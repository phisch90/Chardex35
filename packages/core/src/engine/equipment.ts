import type { EquipSlot } from "../schema/character.js";
import type { ItemEntity } from "../schema/entities.js";

/**
 * Was für ein Ding ist das? Nur so grob, wie die Regeln es verlangen: 3.5 kennt
 * keine Ausrüstungs-Slots wie ein Computerspiel, aber es kennt „eine Rüstung",
 * „ein Schild" und „zwei Hände".
 */
export type ItemKind = "armor" | "shield" | "weapon" | "other";

export function itemKind(entity: ItemEntity | undefined | null): ItemKind {
  if (!entity) return "other";
  if (entity.data.armor) return entity.data.armor.kind === "shield" ? "shield" : "armor";
  if (entity.data.weapon) return "weapon";
  return "other";
}

/**
 * Welche Plätze kommen für diesen Gegenstand überhaupt in Frage?
 *
 * Das ist die Liste, durch die ein Tap auf die Slot-Marke wandert. Sie ist
 * absichtlich kurz: was nicht in Frage kommt, soll man auch nicht durchtippen
 * müssen. Ein Schild geht in die Schildhand — deshalb steht am Schild „OH" und
 * nicht „S".
 *
 * Eine EINHÄNDIGE Waffe kann in beiden Händen geführt werden; das ist kein
 * Sonderfall, sondern der Normalfall beim Zuschlagen mit dem Langschwert, und
 * genau daran hängt der doppelte Power-Attack-Schaden.
 */
export function allowedSlots(entity: ItemEntity | undefined | null): EquipSlot[] {
  const kind = itemKind(entity);
  if (kind === "armor") return ["armor"];
  if (kind === "shield") return ["offHand"];
  if (kind === "weapon") {
    const handedness = entity?.data.weapon?.handedness ?? "one";
    if (handedness === "two") return ["bothHands"];
    if (handedness === "ranged") return ["bothHands", "mainHand"];
    return ["mainHand", "offHand", "bothHands"];
  }
  return ["worn"];
}

/**
 * Der nächste Zustand, wenn man auf die Marke tippt: nicht angelegt → erster
 * erlaubter Platz → nächster → … → wieder nicht angelegt.
 */
export function nextSlot(entity: ItemEntity | undefined | null, current: EquipSlot): EquipSlot {
  const cycle: EquipSlot[] = ["none", ...allowedSlots(entity)];
  const index = cycle.indexOf(current);
  // Unbekannter Zustand (z.B. „worn" am Altbestand einer Rüstung): einmal
  // ablegen, danach läuft der Ring wieder rund.
  if (index === -1) return "none";
  return cycle[(index + 1) % cycle.length]!;
}

/**
 * Unbewaffneter Schlag oder natürliche Waffe?
 *
 * Die eine Ausnahme, die Power Attack bei leichten Waffen doch Schaden gibt.
 * `weapon.category` taugt dafür nicht — das ist in den Packs die
 * Vertrautheits-Klasse (simple/martial/exotic), und der unbewaffnete Schlag
 * steht dort als „simple" wie ein Dolch. Deshalb: die SRD-Kennung, die
 * Waffenart „natural" (die das Schema kennt) und das Schlagwort „natural" für
 * eigene Einträge.
 */
export function isNaturalOrUnarmed(entity: ItemEntity | undefined | null): boolean {
  if (!entity) return false;
  if (entity.id === "srd:item:unarmed-strike") return true;
  if (entity.data.weapon?.category === "natural") return true;
  return entity.tags.includes("natural");
}

export interface EquipCandidate {
  id: string;
  slot: EquipSlot;
}

/**
 * Ein Tap auf die Marke — aber mit Rücksicht auf die andere Hand.
 *
 * `nextSlot` allein läuft stur die Liste durch, und die beginnt bei der
 * Haupthand. Wer neben dem Kurzschwert einen Dolch antippt, wirft damit erst das
 * Kurzschwert aus der Hand und landet erst beim zweiten Tap in der Schildhand —
 * am Ende hält die Figur nur den Dolch. Genau das ist beim Prüfen passiert, und
 * genau das wollte Philipp nicht („erste und zweite Hand equippen, zum Beispiel
 * Kurzschwert und Dolch").
 *
 * Deshalb: erst den nächsten Platz nehmen, der FREI ist. Ist keiner frei, dann
 * eben verdrängen — dann ist es eine bewusste Entscheidung und kein Nebeneffekt.
 */
export function cycleEquipSlot(
  entity: ItemEntity | undefined | null,
  items: EquipCandidate[],
  id: string,
): EquipSlot {
  const current = items.find((item) => item.id === id)?.slot ?? "none";
  const cycle: EquipSlot[] = ["none", ...allowedSlots(entity)];
  const start = cycle.indexOf(current);
  if (start === -1) return "none"; // Altbestand („worn" an einer Rüstung): einmal ablegen

  for (let step = 1; step <= cycle.length; step++) {
    const candidate = cycle[(start + step) % cycle.length]!;
    if (candidate === "none") return candidate;
    if (conflictingEquipIds(items, id, candidate).length === 0) return candidate;
  }
  // Alles belegt: den nächsten Platz nehmen und verdrängen.
  return cycle[(start + 1) % cycle.length]!;
}

/** Wie viele Hände belegt dieser Platz? */
function handsUsed(slot: EquipSlot): number {
  if (slot === "mainHand" || slot === "offHand") return 1;
  if (slot === "bothHands") return 2;
  return 0;
}

/**
 * Was muss weg, damit `id` auf `desired` kann?
 *
 * Zwei Regeln, beide körperlich und nicht verhandelbar:
 *
 *  - EINE Rüstung. Eine zweite über der ersten ginge nicht, und die App darf
 *    beide nicht gleichzeitig zählen — sonst stimmt die RK und niemand sieht,
 *    warum.
 *  - ZWEI Hände. Vorher waren Waffen absichtlich unbegrenzt, „wie viele Hände
 *    frei sind, entscheidet der Tisch". Das war zu großzügig: fünf angelegte
 *    Zweihänder erzeugten fünf Angriffszeilen auf dem Bogen. Zweiwaffenkampf
 *    bleibt möglich — dafür sind Haupt- und Schildhand ja getrennt.
 *
 * Verdrängt wird immer nur, was im Weg IST; die Reihenfolge ist zuletzt-zuerst,
 * damit ein gerade angelegter Gegenstand nicht den vorherigen still verdrängt,
 * wenn beides zusammen passt.
 */
export function conflictingEquipIds(
  items: EquipCandidate[],
  id: string,
  desired: EquipSlot,
): string[] {
  const others = items.filter((item) => item.id !== id);

  if (desired === "armor") {
    return others.filter((item) => item.slot === "armor").map((item) => item.id);
  }

  const needed = handsUsed(desired);
  if (needed === 0) return [];

  const inHands = others.filter((item) => handsUsed(item.slot) > 0);

  // Derselbe Platz ist immer belegt — zwei Waffen in derselben Hand gibt es nicht.
  const sameSlot = inHands.filter((item) => item.slot === desired);
  // Beidhändig belegt jede Hand, kollidiert also mit allem.
  const twoHanded = inHands.filter((item) => item.slot === "bothHands" && item.slot !== desired);

  const mustGo = new Map<string, true>();
  for (const item of [...sameSlot, ...twoHanded]) mustGo.set(item.id, true);

  // Reicht das? Sonst weitere Hände frei machen, von hinten.
  const remaining = inHands.filter((item) => !mustGo.has(item.id));
  let free = 2 - remaining.reduce((sum, item) => sum + handsUsed(item.slot), 0);
  for (const item of [...remaining].reverse()) {
    if (free >= needed) break;
    mustGo.set(item.id, true);
    free += handsUsed(item.slot);
  }

  return items.filter((item) => mustGo.has(item.id)).map((item) => item.id);
}
