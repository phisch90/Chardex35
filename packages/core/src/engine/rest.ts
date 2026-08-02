import type { Character } from "../schema/character.js";
import type { DerivedSheet } from "./types.js";
import { effectiveTrackerMax, refillOf } from "./trackers.js";

/**
 * Die Rast — an EINER Stelle, mit Ansage.
 *
 * Vorher gab es nur den Mond oben rechts in jedem Zauberblock: ein Tap, und alle
 * verbrauchten Plätze DIESER Klasse waren wieder da. Philipps Einwand, wörtlich:
 * „Mond überall entfernen. Rasten soll irgendwo anders zentral sein nicht ein
 * Button den man versehentlich drückt ohne zu wissen was passiert ist."
 *
 * Er hat in beidem recht. Der Knopf saß dort, wo bei anderen Karten das
 * Aktionsmenü sitzt, und ein Fehlgriff kostete den ganzen Zaubertag. Und als Rast
 * war er ohnehin falsch: ein Kleriker/Magier hat zwei davon, jeder füllt nur
 * seinen eigenen Block, und die Tageszähler musste man daneben von Hand
 * hochtippen.
 *
 * Deshalb zwei Funktionen und nicht eine:
 *
 *   `planRest`  — rechnet, WAS passieren würde, mit Zahlen.
 *   `applyRest` — führt GENAU diesen Plan aus.
 *
 * Die Trennung ist der Punkt: was er vorher gelesen hat, ist danach passiert. Ein
 * „Rast anwenden", das selbst nochmal rechnet, könnte etwas anderes tun als die
 * Vorschau angezeigt hat — und dann wäre die Ansage wertlos.
 *
 * Was eine Rast anfassen darf, ist nicht Geschmackssache: `group/orders.ts` legt
 * fest, was SPIELZUSTAND ist und was AUFBAU. Wörtlich dort: „Spielzustand ist,
 * was während des Abends passiert — Schaden, verbrauchte Zauberplätze, Zähler,
 * Zustände, Kampfoptionen." Genau diese Felder darf sie ändern. Alles, was in den
 * Fingerabdruck des Spielleiter-Auftrags eingeht (Grenzen, bekannte Zauber,
 * Domänen, Stufen, Ausrüstung), ist tabu — sonst legt der nächste Auftrag eine
 * Rettungskopie an, nur weil jemand geschlafen hat.
 *
 * **Was sie nicht tut: TP heilen.** Gefragt und beantwortet — er will, dass die
 * Rast TP gar nicht anfasst („weiter nichts anfassen"), und temporäre TP sollen
 * eine Nacht überdauern („bleiben stehen"). Das deckt sich mit dem, was das
 * Programm rechnen kann: die 3.5-Regel „1 TP pro Stufe pro Nachtruhe" steht hier
 * nirgends, und False Life überdauert ab Stufe 9 ohnehin eine ganze Nacht. TP
 * trägt er im TP-Rechner nach; ein Test hält fest, dass die Rast sie nicht anrührt.
 */

export interface RestSlotLine {
  classId: string;
  className: string;
  /** Wie viele verbrauchte Plätze wieder frei werden. */
  freed: number;
}

export interface RestTrackerLine {
  id: string;
  name: string;
  from: number;
  to: number;
}

export interface RestSkippedLine {
  name: string;
  /**
   * Warum dieser Zähler in Ruhe bleibt. Steht in der Ansage — ein Zähler, der
   * stillschweigend nicht mitrastet, ist schlimmer als einer, der es begründet.
   */
  reason:
    | "eigene Mechanik"
    | "keine Grenze"
    | "schon voll"
    /* Füllt sich, aber erst nach acht Stunden — bei der kurzen Pause. */
    | "erst nach acht Stunden";
}

/**
 * Wie lang geruht wird.
 *
 * `full` ist die Nachtruhe: Zauberplätze und Tageszähler. `short` ist die kurze
 * Pause und lässt die Zauberplätze ausdrücklich in Ruhe — Philipps Wort dazu:
 * „Ja, ohne Zauberplätze."
 *
 * Im Regelwerk gibt es die kurze Pause so nicht; dort füllen sich Fähigkeiten pro
 * Tag erst nach acht Stunden. Das ist eine Hausregel seines Tisches, und die
 * gewinnt — der DM hat Recht, nicht die App.
 */
export type RestScope = "full" | "short";

export interface RestPlan {
  scope: RestScope;
  slots: RestSlotLine[];
  trackers: RestTrackerLine[];
  skipped: RestSkippedLine[];
  /** Nichts zu tun — dann muss die Oberfläche auch nichts anbieten. */
  nothingToDo: boolean;
}

/**
 * Was eine Rast an DIESEM Bogen ändern würde.
 *
 * Rein: sie liest, sie schreibt nichts. Damit ist sie testbar, und die Ansage in
 * der Oberfläche ist dieselbe Rechnung wie die Ausführung.
 */
export function planRest(
  character: Character,
  sheet: DerivedSheet,
  scope: RestScope = "full",
): RestPlan {
  const slots: RestSlotLine[] = [];
  // Bei der kurzen Pause bleibt diese Liste leer — und weil `applyRest` nur
  // ausführt, was im Plan steht, kann sie die Plätze gar nicht anfassen.
  if (scope === "full") {
    for (const block of sheet.spellcasting) {
      const used = character.spellState[block.classId]?.usedSlots ?? [];
      const freed = used.reduce((sum, value) => sum + (value ?? 0), 0);
      if (freed > 0) slots.push({ classId: block.classId, className: block.className, freed });
    }
  }

  const trackers: RestTrackerLine[] = [];
  const skipped: RestSkippedLine[] = [];
  for (const tracker of character.trackers) {
    /*
      Nur echte Zähler. Ein `value`-Zähler ist ein Merkzettel mit einer festen
      Zahl, ein `roll`-Zähler hält den LETZTEN WÜRFELWURF — den auf ein Maximum
      zu setzen würde einen Wurf erfinden, den niemand gemacht hat.
    */
    if (tracker.kind !== "counter") continue;

    /*
      „Füllt sich bei der Rast" steht jetzt IM ZÄHLER (`refill`) — seine Antwort war
      „ja, bzw soll man das selber einstellen können."

      Vorher entschied hier `suggestedFrom`: aus einem Vorschlag der App entstanden
      = füllt sich. Das war eine Folge als Ersatz für eine Eingabe. Bei
      „Aktionspunkte" kannte die App die Regel nicht und sagte das — obwohl SEIN
      Tisch sie kennt, und er es also nur eintragen können müsste.

      `refillOf` trägt den Rückfall auf die alte Ableitung für alles, was schon
      gespeichert ist. Und es ist EINE Funktion, die auch die Oberfläche fragt:
      sonst füllt sich am Bogen etwas, das die Ansage vorher nicht genannt hat.
    */
    const refill = refillOf(tracker);
    if (refill === "never") {
      skipped.push({ name: tracker.name, reason: "eigene Mechanik" });
      continue;
    }
    /*
      Die kurze Pause füllt nur, was ausdrücklich dafür markiert ist. Sie ist eine
      Hausregel seines Tisches — im Regelwerk füllen sich Fähigkeiten pro Tag erst
      nach acht Stunden —, und deshalb darf sie nicht stillschweigend alles
      mitnehmen, was sich nach einer Nacht füllt.
    */
    if (scope === "short" && refill !== "short") {
      skipped.push({ name: tracker.name, reason: "erst nach acht Stunden" });
      continue;
    }

    // Die WIRKLICHE Grenze, nicht das gespeicherte `max` — daran ist Extra
    // Turning schon einmal gescheitert.
    const max = effectiveTrackerMax(tracker, sheet);
    if (max === undefined) {
      skipped.push({ name: tracker.name, reason: "keine Grenze" });
      continue;
    }
    if (tracker.value >= max) {
      skipped.push({ name: tracker.name, reason: "schon voll" });
      continue;
    }
    trackers.push({ id: tracker.id, name: tracker.name, from: tracker.value, to: max });
  }

  return {
    scope,
    slots,
    trackers,
    skipped,
    nothingToDo: slots.length === 0 && trackers.length === 0,
  };
}

/**
 * Den Plan ausführen — auf einem Entwurf, der danach gespeichert wird.
 *
 * Mutiert, weil die Schreibwege der App so gebaut sind (`CharacterRepo.mutate`
 * gibt einen Entwurf herein). Angefasst wird ausschließlich, was im Plan steht:
 * ein Zähler, der in der Ansage nicht vorkam, bewegt sich hier auch nicht.
 */
export function applyRest(character: Character, plan: RestPlan): void {
  for (const line of plan.slots) {
    const state = character.spellState[line.classId];
    if (state !== undefined) state.usedSlots = [];
  }
  for (const line of plan.trackers) {
    const tracker = character.trackers.find((t) => t.id === line.id);
    // Über die Kennung, nie über den Listenindex — die Liste kann sich zwischen
    // Ansage und Ausführung geändert haben (Abgleich vom iPad).
    if (tracker !== undefined) tracker.value = line.to;
  }
}

/**
 * Die Momentaufnahme für die Rücknahme.
 *
 * Nur die Felder, die die Rast anfasst — eine ganze Kopie des Charakters würde
 * beim Zurücknehmen auch alles andere überschreiben, was in der Zwischenzeit
 * passiert ist (ein Treffer, ein gewirkter Zauber auf dem iPad).
 */
export interface RestUndo {
  usedSlots: { classId: string; usedSlots: number[] }[];
  trackers: { id: string; value: number }[];
}

export function snapshotForRest(character: Character, plan: RestPlan): RestUndo {
  return {
    usedSlots: plan.slots.map((line) => ({
      classId: line.classId,
      usedSlots: [...(character.spellState[line.classId]?.usedSlots ?? [])],
    })),
    trackers: plan.trackers.map((line) => ({ id: line.id, value: line.from })),
  };
}

export function undoRest(character: Character, undo: RestUndo): void {
  for (const entry of undo.usedSlots) {
    const state = character.spellState[entry.classId];
    if (state !== undefined) state.usedSlots = [...entry.usedSlots];
  }
  for (const entry of undo.trackers) {
    const tracker = character.trackers.find((t) => t.id === entry.id);
    if (tracker !== undefined) tracker.value = entry.value;
  }
}
