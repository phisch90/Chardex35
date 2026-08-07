import type { Ability } from "../schema/common.js";
import type { DerivedSheet } from "./types.js";

/**
 * Zähler-Vorschläge aus Klassen und Stufe.
 *
 * Die App kennt die Regeln dieser Mechaniken nicht — sie führt nur Striche mit.
 * Aber WELCHE Striche jemand braucht, steht in seinen Klassen, und die Obergrenze
 * ergibt sich meist aus Stufe und einem Attribut. Das von Hand abzutippen ist
 * genau die Arbeit, die eine App übernehmen soll.
 *
 * Bewusst nur Mechaniken mit EINDEUTIGER Formel. Alles, wo die Zahl vom Tisch
 * oder von Domänen abhängt, bleibt draußen — ein falscher Vorschlag ist
 * schlimmer als keiner.
 */
export interface TrackerSuggestion {
  /** Stabiler Schlüssel, damit ein Vorschlag nicht doppelt angeboten wird. */
  key: string;
  name: string;
  max: number;
  /** Woher die Zahl kommt — steht in der Oberfläche unter dem Vorschlag. */
  note: string;
  /**
   * Wann sich dieser Zähler von allein füllt — falls der Vorschlag es WEISS.
   *
   * Ohne diese Angabe fällt `refillOf` auf „short" zurück (siehe dort), und das ist
   * für einen Tageszähler richtig. Für die Aktionspunkte wäre es falsch: Martins
   * Antwort ist „Reset bei Stufenaufstieg", und eine kurze Pause darf sie nicht
   * auffüllen. Ein Vorschlag, der die Antwort kennt, gibt sie deshalb mit — und die
   * beiden Stellen, die aus einem Vorschlag einen Zähler machen, schreiben sie
   * ausdrücklich an den Zähler. Am Zähler ist es dann eine Eingabe, keine Ableitung.
   */
  refill?: readonly TrackerRefillKind[];
  /**
   * In welchen Reiter der Zähler gehört. Gesetzt wird das nicht am Vorschlag, sondern
   * aus `SUGGESTION_CATEGORY` (siehe dort) — hier steht nur das Ergebnis.
   *
   * Wer aus einem Vorschlag einen Zähler macht, schreibt es ausdrücklich an den
   * Zähler; dort ist es dann eine Eingabe. Ohne Angabe gilt „general". Geraten wird
   * nie aus dem NAMEN — das wäre die versteckte Regel, die bei jedem eigenen Zähler
   * vorbeigeht.
   */
  category?: TrackerCategory;
}

/**
 * Wo ein Zähler am Bogen steht — die vier Bereiche, die er gewählt hat.
 *
 * Die Reihenfolge hier IST die Reihenfolge der Knöpfe in der Oberfläche, und die Werte
 * sind die des Charakter-Schemas: eine zweite Liste in der Anzeige wären zwei
 * Wahrheiten, und ein fünfter Bereich müsste dann an zwei Stellen dazu.
 */
export const TRACKER_CATEGORIES = ["general", "combat", "spells", "gear"] as const;
export type TrackerCategory = (typeof TRACKER_CATEGORIES)[number];

/**
 * Welcher Vorschlag in welchen Bereich gehört — die eine Wahrheit dazu.
 *
 * Sie steht als Tabelle und nicht als `category:` an jedem Vorschlag, weil sie ZWEI
 * Leser hat: die Vorschläge selbst und der Rückfall in `categoryOf` für Zähler, die
 * aus einem Vorschlag entstanden sind, bevor es dieses Feld gab (der Fight-Club-Import
 * schreibt genau solche). Zwei Listen wären zwei Wahrheiten, und die eine würde beim
 * nächsten neuen Vorschlag vergessen.
 *
 * Was hier NICHT steht, ist „general" — der Rückfall. Ein Eintrag „action-points:
 * general" wäre Lärm.
 */
const SUGGESTION_CATEGORY: Readonly<Record<string, TrackerCategory>> = {
  "turn-undead": "combat",
  "smite-evil": "combat",
  "bardic-music": "combat",
  rage: "combat",
  "stunning-fist": "combat",
  "wild-shape": "spells",
};

/**
 * In welchem Bereich der Zähler steht. `undefined` heißt „nie gesagt".
 *
 * Der Leser statt eines Schema-Standardwerts, aus demselben Grund wie bei `refillOf`:
 * so bleibt das Feld optional, und keine Stelle, die einen Zähler als Literal baut,
 * muss es kennen. Und der Rückfall ist der Platz, an dem bisher ALLE Zähler standen —
 * damit verschiebt dieses Feld auf einem gespeicherten Bogen nichts.
 */
export function categoryOf(tracker: {
  category?: TrackerCategory | undefined;
  suggestedFrom?: string | undefined;
}): TrackerCategory {
  if (tracker.category !== undefined) return tracker.category;
  /*
    Nie gesagt, aber aus einem Vorschlag entstanden? Dann weiß die App den Bereich —
    dieselbe Bauart wie der Rückfall in `refillOf`. Das ist kein Raten am NAMEN:
    `suggestedFrom` ist eine harte Herkunft und übersteht jede Umbenennung.

    Damit landet auch ein Zähler aus dem Fight-Club-Import im richtigen Reiter, ohne
    dass jemand ihn umstellt — und genau das war der Auftrag: „Turn Undead ist ja was
    für die Kampf Seite."
  */
  if (tracker.suggestedFrom !== undefined) {
    const known = SUGGESTION_CATEGORY[tracker.suggestedFrom];
    if (known !== undefined) return known;
  }
  return "general";
}

const CLASS_IDS = {
  cleric: "srd:class:cleric",
  paladin: "srd:class:paladin",
  bard: "srd:class:bard",
  barbarian: "srd:class:barbarian",
  monk: "srd:class:monk",
  druid: "srd:class:druid",
  sorcerer: "srd:class:sorcerer",
} as const;

const FEAT_IDS = {
  /** Der Mönch trägt es ab Stufe 1, andere wählen es — die Zahl unterscheidet sich. */
  stunningFist: "srd:feat:stunning-fist",
} as const;

function levelOf(sheet: DerivedSheet, classId: string): number {
  return sheet.classLevels.find((c) => c.classId === classId)?.level ?? 0;
}

function abilityMod(sheet: DerivedSheet, ability: Ability): number {
  return sheet.abilities[ability]?.mod ?? 0;
}

const signed = (value: number): string => `${value >= 0 ? "+" : ""}${value}`;

/**
 * Die WIRKLICHE Obergrenze eines Zählers.
 *
 * Ein Zähler aus einem Vorschlag folgt dem Vorschlag — sonst ist sein `max` eine
 * Momentaufnahme vom Anlegen und veraltet beim nächsten Stufenaufstieg oder beim
 * nächsten Talent. Genau daran ist Extra Turning gescheitert: die vier
 * zusätzlichen Versuche standen korrekt in `sheet.extraUses`, aber der Zähler
 * „Untote vertreiben" behielt seinen alten Wert, und der Vorschlag wurde nicht
 * mehr angeboten, weil es den Zähler ja schon gab.
 *
 * Ein selbst gesetzter Wert (`maxManual`) gewinnt immer — wer die Grenze anfasst,
 * meint es so.
 */
export function effectiveTrackerMax(
  tracker: { max?: number | undefined; suggestedFrom?: string | undefined; maxManual?: boolean },
  sheet: DerivedSheet,
): number | undefined {
  if (tracker.maxManual === true) return tracker.max;
  if (tracker.suggestedFrom === undefined) return tracker.max;
  const live = suggestTrackers(sheet).find((s) => s.key === tracker.suggestedFrom);
  return live?.max ?? tracker.max;
}

/**
 * WANN ein Zähler sich von allein füllt. Mehrere gleichzeitig möglich.
 *
 * Die Liste ist seine, um zwei Einträge gekürzt: „Begegnung kann weg / Neuer Tag
 * auch raus." Geblieben sind die lange Rast, seine Hausregel-Pause und der
 * Stufenaufstieg — letzterer ist der präziseste, weil die App genau weiß, wann er
 * passiert.
 */
export const TRACKER_REFILL_KINDS = ["long", "short", "levelUp"] as const;
export type TrackerRefillKind = (typeof TRACKER_REFILL_KINDS)[number];

/** Was zurücksetzen bedeutet: auf voll oder auf 0. */
export type TrackerResetTo = "max" | "zero";

/**
 * Die Bedingungen eines Zählers als MENGE — die eine Stelle, die das entscheidet.
 *
 * Drei Dinge laufen hier zusammen, und jedes einzelne hätte sonst eine zweite
 * Fassung irgendwo in der Oberfläche:
 *
 * 1. **Der Altbestand.** Die erste Fassung des Feldes ist ausgeliefert und steht auf
 *    seinem Gerät als `"long" | "short" | "never"`. Sie wird hier übersetzt, nicht
 *    in einer Wanderung — ein Datenbank-Umbau für drei Werte wäre mehr Risiko als
 *    Nutzen, und ein zweites Feld daneben wären zwei Wahrheiten.
 * 2. **Der Rückfall.** `undefined` heißt „nie gesagt": dann gilt die alte Ableitung
 *    aus `suggestedFrom` (aus einem Vorschlag der App entstanden = eine Fähigkeit
 *    pro Tag). Ohne ihn hätte die Umstellung sein „Untote vertreiben" stillgelegt,
 *    und zwar unbemerkt — eine Rast, die nichts füllt, sieht aus wie eine Rast.
 * 3. **Die Folgerung.** Wer sich nach einer kurzen Pause füllt, füllt sich nach acht
 *    Stunden auch. Das steht HIER und nicht in der Oberfläche, damit man den Zustand
 *    „nur kurze Pause, aber nicht die lange Rast" gar nicht herstellen kann.
 */
export function refillOf(tracker: {
  refill?: readonly TrackerRefillKind[] | "long" | "short" | "never" | undefined;
  suggestedFrom?: string | undefined;
}): Set<TrackerRefillKind> {
  const out = new Set<TrackerRefillKind>();
  const raw = tracker.refill;

  if (raw === undefined) {
    // Nie gesagt: die alte Ableitung. „short", weil die kurze Pause die Tageszähler
    // bisher mitgefüllt hat — das war seine Entscheidung.
    if (tracker.suggestedFrom !== undefined) out.add("short");
  } else if (typeof raw === "string") {
    // Die ausgelieferte erste Fassung.
    if (raw === "long" || raw === "short") out.add(raw);
  } else {
    for (const kind of raw) out.add(kind);
  }

  // Kurze Pause schließt die lange Rast ein.
  if (out.has("short")) out.add("long");
  return out;
}

/** Füllt sich der Zähler bei DIESER Gelegenheit? */
export function refillsAt(
  tracker: Parameters<typeof refillOf>[0],
  when: TrackerRefillKind,
): boolean {
  return refillOf(tracker).has(when);
}

/**
 * Worauf zurückgesetzt wird. `undefined` = „max", weil das das bisherige Verhalten
 * ist — und ein stiller Wechsel auf 0 hätte jeden bestehenden Zähler geleert.
 */
export function resetToOf(tracker: { resetTo?: TrackerResetTo | undefined }): TrackerResetTo {
  return tracker.resetTo ?? "max";
}

/** Woher die Zahl kommt — für die Zeile unter dem Zähler. */
export function trackerMaxNote(
  tracker: { suggestedFrom?: string | undefined; maxManual?: boolean },
  sheet: DerivedSheet,
): string | undefined {
  if (tracker.maxManual === true || tracker.suggestedFrom === undefined) return undefined;
  return suggestTrackers(sheet).find((s) => s.key === tracker.suggestedFrom)?.note;
}

export function suggestTrackers(sheet: DerivedSheet): TrackerSuggestion[] {
  const out: TrackerSuggestion[] = [];
  const cha = abilityMod(sheet, "cha");

  /**
   * Talente, die dieselbe Mechanik aufwerten, kommen aus den DATEN
   * (`extraUses` am Talent), nicht aus einer Namensliste hier — sonst zählt
   * Extra Turning mit und ein Homebrew-Talent nicht.
   */
  const push = (suggestion: TrackerSuggestion) => {
    // Der Bereich kommt aus der Tabelle oben — nicht an jedem Vorschlag wiederholt.
    const withCategory: TrackerSuggestion = {
      ...suggestion,
      ...(SUGGESTION_CATEGORY[suggestion.key] === undefined
        ? {}
        : { category: SUGGESTION_CATEGORY[suggestion.key] }),
    };
    suggestion = withCategory;
    const extra = sheet.extraUses[suggestion.key] ?? 0;
    if (extra === 0) {
      out.push(suggestion);
      return;
    }
    out.push({
      ...suggestion,
      max: Math.max(1, suggestion.max + extra),
      note: `${suggestion.note} · ${signed(extra)} aus Talenten`,
    });
  };

  /*
    Aktionspunkte — die einzige Mechanik hier, die an KEINER Klasse hängt: „Actionpoints
    hat jeder 6", und Martins Antwort auf den Nachschub: „Reset bei Stufenaufstieg."

    Deshalb steht der Vorschlag vor allen Klassenblöcken (die Reihenfolge hier ist die
    Anzeigereihenfolge) und trägt seine Bedingung selbst. Er geht trotzdem durch `push`:
    schreibt sein Tisch später ein Talent, das mehr Punkte gibt, hebt `extraUses` die
    Grenze von allein — dieselbe Lehre wie bei Extra Turning.
  */
  push({
    key: "action-points",
    name: "Aktionspunkte",
    max: 6,
    note: "Hausregel am Tisch: jeder hat 6 · zurück beim Stufenaufstieg",
    refill: ["levelUp"],
  });

  // Untote vertreiben: 3 + CHA-Modifikator pro Tag (Kleriker, Paladin ab Stufe 4).
  const cleric = levelOf(sheet, CLASS_IDS.cleric);
  const paladin = levelOf(sheet, CLASS_IDS.paladin);
  if (cleric > 0 || paladin >= 4) {
    push({
      key: "turn-undead",
      name: "Untote vertreiben",
      max: Math.max(1, 3 + cha),
      note: `3 + CHA-Modifikator (${signed(cha)}) pro Tag`,
    });
  }

  // Böses niederstrecken: 1/Tag ab Stufe 1, +1 auf Stufe 5, 10, 15, 20.
  if (paladin >= 1) {
    const smites = 1 + Math.floor(paladin / 5);
    push({
      key: "smite-evil",
      name: "Böses niederstrecken",
      max: smites,
      note: `Paladin ${paladin}: 1 + je 5 Stufen`,
    });
  }

  // Bardenmusik: einmal pro Bardenstufe und Tag.
  const bard = levelOf(sheet, CLASS_IDS.bard);
  if (bard > 0) {
    push({
      key: "bardic-music",
      name: "Bardenmusik",
      max: bard,
      note: `einmal je Bardenstufe (${bard}) pro Tag`,
    });
  }

  // Raserei: 1/Tag, +1 auf Stufe 4, 8, 12, 16, 20.
  const barbarian = levelOf(sheet, CLASS_IDS.barbarian);
  if (barbarian > 0) {
    push({
      key: "rage",
      name: "Raserei",
      max: 1 + Math.floor(barbarian / 4),
      note: `Barbar ${barbarian}: 1 + je 4 Stufen`,
    });
  }

  /**
   * Betäubender Schlag. Der Mönch bekommt das Talent auf Stufe 1 geschenkt und
   * darf einmal je MÖNCHSSTUFE plus einmal je vier Stufen anderer Klassen. Wer
   * das Talent regulär gewählt hat, darf einmal je vier Stufen — das ist die
   * Zahl aus dem Talenttext.
   */
  const monk = levelOf(sheet, CLASS_IDS.monk);
  const hasStunningFist = sheet.featIds.includes(FEAT_IDS.stunningFist);
  if (monk > 0) {
    const other = Math.max(0, sheet.totalLevel - monk);
    push({
      key: "stunning-fist",
      name: "Betäubender Schlag",
      max: monk + Math.floor(other / 4),
      note:
        other >= 4
          ? `Mönch ${monk} + je 4 Stufen anderer Klassen (${other})`
          : `einmal je Mönchsstufe (${monk}) pro Tag`,
    });
  } else if (hasStunningFist && Math.floor(sheet.totalLevel / 4) > 0) {
    push({
      key: "stunning-fist",
      name: "Betäubender Schlag",
      max: Math.floor(sheet.totalLevel / 4),
      note: `Talent: einmal je 4 Stufen (Stufe ${sheet.totalLevel})`,
    });
  }

  // Tiergestalt: 1/Tag ab Stufe 5, mehr auf 6, 10, 14, 18.
  const druid = levelOf(sheet, CLASS_IDS.druid);
  if (druid >= 5) {
    // 5.: 1× · 6.: 2× · 7.: 3× · 10.: 4× · 14.: 5× · 18.: 6×
    const uses = druid >= 18 ? 6 : druid >= 14 ? 5 : druid >= 10 ? 4 : druid >= 7 ? 3 : druid >= 6 ? 2 : 1;
    push({
      key: "wild-shape",
      name: "Tiergestalt",
      max: uses,
      note: `Druide ${druid}: ${uses}× pro Tag`,
    });
  }

  // Klassenfähigkeiten mit „X/day“ im Namen sind aus dem Datensatz eindeutig.
  for (const feature of sheet.features) {
    const match = /(\d+)\s*\/\s*day/i.exec(feature.name);
    if (!match?.[1]) continue;
    const key = `feature:${feature.key}`;
    if (out.some((entry) => entry.key === key)) continue;
    push({
      key,
      name: feature.name,
      max: Number.parseInt(match[1], 10),
      note: `${feature.className} Stufe ${feature.level}`,
    });
  }

  return out;
}
