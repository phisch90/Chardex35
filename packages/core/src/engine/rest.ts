import type { Character } from "../schema/character.js";
import type { DerivedSheet } from "./types.js";
import { effectiveTrackerMax, refillOf, resetToOf } from "./trackers.js";
import { spellcraftExhaustionOf } from "./spellcraftCasting.js";

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
    | "erst nach acht Stunden"
    /* Füllt sich nur beim Stufenaufstieg — dann hilft keine Rast. */
    | "nur beim Stufenaufstieg";
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
  /**
   * Spellcraft-Ermuedung, die die lange Rast zuruecksetzt (Martins Hausregel) —
   * 0 heisst: nichts zurueckzusetzen. Die kurze Pause laesst sie in Ruhe, wie die
   * Zauberplaetze: das Blatt sagt ausdruecklich "resets to 12 after a long rest".
   */
  spellcraftExhaustion: number;
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
    if (refill.size === 0) {
      skipped.push({ name: tracker.name, reason: "eigene Mechanik" });
      continue;
    }
    /*
      Die kurze Pause füllt nur, was ausdrücklich dafür markiert ist. Sie ist eine
      Hausregel seines Tisches — im Regelwerk füllen sich Fähigkeiten pro Tag erst
      nach acht Stunden —, und deshalb darf sie nicht stillschweigend alles
      mitnehmen, was sich nach einer Nacht füllt.
    */
    const when = scope === "short" ? "short" : "long";
    if (!refill.has(when)) {
      skipped.push({
        name: tracker.name,
        // Nur nach dem Aufstieg? Dann hilft auch die lange Rast nicht.
        reason: when === "short" ? "erst nach acht Stunden" : "nur beim Stufenaufstieg",
      });
      continue;
    }

    const line = resetLine(tracker, sheet);
    if (line === "keine Grenze" || line === "schon so") {
      skipped.push({
        name: tracker.name,
        reason: line === "keine Grenze" ? "keine Grenze" : "schon voll",
      });
      continue;
    }
    trackers.push(line);
  }

  /*
    Die Spellcraft-Ermuedung setzt NUR die lange Rast zurueck. Sie steht im Plan
    als Zahl, damit die Ansage sie nennen kann ("Ermuedung 5 -> 0") — eine Rast,
    die still etwas zuruecksetzt, was die Ansage nicht genannt hat, waere dieselbe
    Falle wie ein Zaehler, der ungefragt mitrastet.
  */
  const spellcraftExhaustion = scope === "full" ? spellcraftExhaustionOf(character) : 0;

  return {
    scope,
    slots,
    trackers,
    skipped,
    spellcraftExhaustion,
    nothingToDo: slots.length === 0 && trackers.length === 0 && spellcraftExhaustion === 0,
  };
}

/**
 * Was der STUFENAUFSTIEG an den Zählern ändert.
 *
 * Eigene Funktion und nicht ein dritter `RestScope`, weil ein Aufstieg keine Rast
 * ist: er füllt keine Zauberplätze, und er passiert nicht am Spielabend, sondern
 * dazwischen. Was er mit den Zählern teilt, ist genau eine Sache — dieselbe
 * Rechnung „von wo, auf was" (`resetLine`).
 *
 * WICHTIG ist der übergebene Bogen: das muss der Bogen NACH dem Aufstieg sein.
 * Ein Zähler, dessen Grenze aus der Stufe folgt („einmal je Bardenstufe"), soll auf
 * die NEUE Grenze gehen — sonst wäre das genau der eingefrorene Wert, an dem Extra
 * Turning schon einmal gescheitert ist.
 */
export function planLevelUpRefill(
  character: Character,
  sheetAfter: DerivedSheet,
): RestTrackerLine[] {
  const out: RestTrackerLine[] = [];
  for (const tracker of character.trackers) {
    if (tracker.kind !== "counter") continue;
    if (!refillOf(tracker).has("levelUp")) continue;
    const line = resetLine(tracker, sheetAfter);
    if (typeof line !== "string") out.push(line);
  }
  return out;
}

/** Genau diese Zeilen ausführen — nichts anderes. */
export function applyTrackerLines(character: Character, lines: readonly RestTrackerLine[]): void {
  for (const line of lines) {
    const tracker = character.trackers.find((t) => t.id === line.id);
    if (tracker !== undefined) tracker.value = line.to;
  }
}

/**
 * Eine Zeile für EINEN Zähler: von wo, auf was — oder warum nichts passiert.
 *
 * Steht hier und nicht zweimal, weil der Stufenaufstieg dieselbe Rechnung braucht.
 * Und `resetToOf` entscheidet die RICHTUNG: „auf voll" ist richtig für „Untote
 * vertreiben: 7 von 7", aber verkehrt für einen Zähler, den er als VERBRAUCHT führt
 * — der gehört auf 0.
 */
export function resetLine(
  tracker: { id: string; name: string; value: number } & Parameters<typeof effectiveTrackerMax>[0] &
    Parameters<typeof resetToOf>[0],
  sheet: DerivedSheet,
): RestTrackerLine | "keine Grenze" | "schon so" {
  const to = resetToOf(tracker);
  if (to === "zero") {
    // Auf 0 braucht keine Obergrenze — es gibt nichts zu wissen außer der Null.
    return tracker.value === 0
      ? "schon so"
      : { id: tracker.id, name: tracker.name, from: tracker.value, to: 0 };
  }
  // Die WIRKLICHE Grenze, nicht das gespeicherte `max` — daran ist Extra Turning
  // schon einmal gescheitert.
  const max = effectiveTrackerMax(tracker, sheet);
  if (max === undefined) return "keine Grenze";
  if (tracker.value >= max) return "schon so";
  return { id: tracker.id, name: tracker.name, from: tracker.value, to: max };
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
  // `delete` statt 0: das Feld ist optional, und ein ausgeruhter Bogen soll so
  // aussehen wie einer, der die Regel nie benutzt hat.
  if (plan.spellcraftExhaustion > 0) delete character.spellcraftExhaustion;
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
  /** Die Ermuedung vor der Rast — 0 heisst: war keine da, nichts wiederherstellen. */
  spellcraftExhaustion: number;
}

export function snapshotForRest(character: Character, plan: RestPlan): RestUndo {
  return {
    usedSlots: plan.slots.map((line) => ({
      classId: line.classId,
      usedSlots: [...(character.spellState[line.classId]?.usedSlots ?? [])],
    })),
    trackers: plan.trackers.map((line) => ({ id: line.id, value: line.from })),
    spellcraftExhaustion: plan.spellcraftExhaustion,
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
  if (undo.spellcraftExhaustion > 0) character.spellcraftExhaustion = undo.spellcraftExhaustion;
}
