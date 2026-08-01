import { canonicalJson, type Character } from "../schema/character.js";
import { conflictCopyName } from "../sync/merge.js";
import type { ShelfOrder } from "./shelf.js";

/**
 * Was passiert, wenn der Spielleiter einen fremden Bogen bearbeitet.
 *
 * Die Aufteilung, um die sich hier alles dreht: DER SPIELLEITER BESITZT DEN
 * AUFBAU, DER SPIELER BESITZT DEN SPIELZUSTAND.
 *
 * Aufbau ist, was zwischen den Abenden entsteht — Stufen, Talente, Ränge,
 * Ausrüstung, Geld, bekannte Zauber. Spielzustand ist, was während des Abends
 * passiert — Schaden, verbrauchte Zauberplätze, Zähler, Zustände, Kampfoptionen.
 *
 * Ohne diese Trennung wäre die Funktion unbrauchbar: der Spielleiter trägt
 * morgens die neue Stufe ein, der Spieler hat den ganzen Abend Trefferpunkte
 * mitgeführt, und beim nächsten Abgleich steht der Bogen wieder auf voll. Ein
 * Werkzeug, das die Arbeit des Abends wegwirft, benutzt niemand zweimal.
 */

/**
 * Felder, die dem Spieler gehören. Sie werden aus dem ÖRTLICHEN Bogen übernommen,
 * auch wenn im Auftrag etwas anderes steht.
 *
 * `hp` und `spellState` stehen hier nicht, weil sie halb und halb sind — sie
 * werden weiter unten Feld für Feld zusammengeführt.
 */
const PLAY_STATE_FIELDS = [
  "conditionIds",
  "toggledEffectKeys",
  "combatOptions",
  // Notizen sind die des Spielers. Was der Spielleiter mitteilen will, steht im
  // Auftrag selbst (`note`) und nicht in dessen Notizfeld.
  "notes",
  "noteSections",
  /*
    „Passt so" gehört dem, der auf den Bogen schaut — es ist eine Entscheidung über
    die ANZEIGE, keine Regel. Damit zählt es auch nicht zum Aufbau (die Schleife
    unten überspringt diese Felder), und ein weggetippter Hinweis legt keine
    Rettungskopie an. Genau der Fehler, den das Porträt schon einmal gemacht hat.
  */
  "mutedWarnings",
] as const satisfies readonly (keyof Character)[];

/**
 * Der Fingerabdruck des AUFBAUS — ohne Spielzustand und ohne Buchhaltung.
 *
 * Er reist im Auftrag mit und beantwortet die eine Frage, die sonst offen bliebe:
 * hat der Spieler seinen Bogen zwischenzeitlich SELBST umgebaut? Die `rev` allein
 * sagt das nicht, denn sie steigt auch, wenn er nur Schaden einträgt — und dafür
 * eine Rettungskopie anzulegen wäre Lärm.
 */
export function buildFingerprint(character: Character): string {
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(character)) {
    if (key === "id" || key === "rev" || key === "updatedAt" || key === "deletedAt") continue;
    if ((PLAY_STATE_FIELDS as readonly string[]).includes(key)) continue;
    /*
      Das Bild und die Entwurfs-Markierung zählen NICHT als Aufbau.

      Ein Test hat das aufgedeckt: der Spieler hatte seinem Charakter ein eigenes
      Porträt gegeben, und der nächste Auftrag legte deswegen eine Rettungskopie an
      — wegen eines Bildes. Eine Kopie soll Arbeit retten, und ein Bild ist Sache
      des Geschmacks, keine Regel. Wer sein Bild wechselt, hat nicht am Bogen
      gebaut. Welches Bild gewinnt, regelt die Zusammenführung weiter unten.
    */
    if (key === "portrait" || key === "draftOf") continue;
    /*
      Die Kampagne zählt aus demselben Grund nicht als Aufbau: Name und Farbe sind
      Ordnung und Geschmack, keine Regel. Ohne diese Zeile hätte ein Farbwechsel den
      nächsten Auftrag eine Rettungskopie anlegen lassen — genau der Porträt-Fehler
      eine Zeile weiter oben, nur mit einer Farbe statt einem Bild.
    */
    if (key === "campaign") continue;
    if (key === "hp") {
      // Nur das Maximum gehört zum Aufbau; Schaden und temporäre Punkte nicht.
      rest[key] = { overrideMax: (value as Character["hp"]).overrideMax ?? null };
      continue;
    }
    if (key === "spellState") {
      // Bekannte Zauber sind Aufbau, verbrauchte Plätze und Vorbereitetes nicht.
      const known: Record<string, string[]> = {};
      for (const [classId, state] of Object.entries(value as Character["spellState"])) {
        known[classId] = state.known;
      }
      rest[key] = known;
      continue;
    }
    if (key === "trackers") {
      // Welche Zähler es gibt und wie hoch sie reichen, ist Aufbau; ihr Stand nicht.
      rest[key] = (value as Character["trackers"]).map((t) => ({ ...t, value: 0 }));
      continue;
    }
    rest[key] = value;
  }
  return canonicalJson(rest, 0);
}

export type OrderOutcome =
  /** Angewendet, der Spieler hatte nebenher nichts am Aufbau geändert. */
  | { outcome: "angewendet"; next: Character }
  /** Angewendet — und der eigene Umbau des Spielers als Kopie gerettet. */
  | { outcome: "angewendet-mit-kopie"; next: Character; rescue: Character }
  /** Der Auftrag ändert nichts, was hier noch nicht so wäre. */
  | { outcome: "nichts-zu-tun" }
  /** Kein solcher Bogen auf diesem Gerät — der Auftrag gilt jemand anderem. */
  | { outcome: "unbekannt" }
  /** Der Auftrag will etwas, das ein Auftrag nicht darf. */
  | { outcome: "abgelehnt"; reason: string };

/**
 * Führt einen Auftrag mit dem örtlichen Bogen zusammen.
 *
 * Rein: keine Uhr, keine Zufallszahl, kein Datenbankzugriff. Tag und Gerätename
 * kommen von außen, damit dieselbe Eingabe immer dasselbe Ergebnis hat — sonst
 * ließe sich die Kopier-Regel nicht prüfen.
 */
export function applyOrder(
  order: ShelfOrder,
  local: Character | undefined,
  context: { now: string; day: string; from: string },
): OrderOutcome {
  if (local === undefined) return { outcome: "unbekannt" };

  /*
    Ein Auftrag darf keinen Bogen löschen. Der Spielleiter kann sagen „du bist
    Stufe 8" — aber „dein Charakter existiert nicht mehr" ist eine Entscheidung,
    die niemand aus der Ferne für einen anderen trifft. Wer wirklich löschen will,
    tut es an seinem eigenen Gerät, mit der Gefahrenzone und dem Namen zum
    Abtippen.
  */
  if (order.character.deletedAt !== undefined) {
    return {
      outcome: "abgelehnt",
      reason: "Ein Auftrag kann keinen Bogen löschen. Löschen geht nur am eigenen Gerät.",
    };
  }
  if (local.deletedAt !== undefined) {
    return {
      outcome: "abgelehnt",
      reason: "Dieser Bogen ist hier gelöscht. Ein Auftrag holt ihn nicht zurück.",
    };
  }

  const next = mergeOrderIntoLocal(order.character, local);

  // Nichts zu tun? Dann auch keine neue rev — sonst schaukeln sich zwei Geräte
  // bei jedem Abgleich gegenseitig hoch.
  if (buildFingerprint(next) === buildFingerprint(local)) return { outcome: "nichts-zu-tun" };

  const playerChangedBuild =
    order.baseFingerprint !== "" && buildFingerprint(local) !== order.baseFingerprint;

  const stamped: Character = {
    ...next,
    id: local.id,
    rev: Math.max(local.rev, order.character.rev) + 1,
    updatedAt: context.now,
  };

  if (!playerChangedBuild) return { outcome: "angewendet", next: stamped };

  /*
    Beide haben am Aufbau gearbeitet. Der Spielleiter gewinnt — das ist die
    Absprache, sonst bräuchte es diese Funktion nicht. Aber die Arbeit des
    Spielers wird nicht weggeworfen, sondern liegt danach als eigener Bogen
    daneben, mit derselben Beschriftung wie beim Geräte-Abgleich. Wer schon
    einmal eine Konfliktkopie gesehen hat, weiß sofort, was das ist.
  */
  const rescue: Character = {
    ...local,
    id: `${local.id}--sl-${order.id}`,
    name: conflictCopyName(local.name, context.from, context.day),
    rev: 1,
    updatedAt: context.now,
  };
  // Eine Rettungskopie ist ein eigener Bogen, kein Entwurf von etwas.
  delete rescue.draftOf;
  return { outcome: "angewendet-mit-kopie", next: stamped, rescue };
}

/**
 * Der Bogen des Spielleiters, aber mit dem Spielzustand des Spielers.
 *
 * Ausgelagert, weil hier die eigentliche Regel steht — `applyOrder` drumherum ist
 * nur Buchhaltung und Entscheidung.
 */
function mergeOrderIntoLocal(fromOrder: Character, local: Character): Character {
  const out: Character = { ...fromOrder };

  for (const field of PLAY_STATE_FIELDS) {
    // Der Zugriff über den Index braucht die Umleitung über unknown, weil die
    // Feldnamen erst zur Laufzeit bekannt sind.
    (out as unknown as Record<string, unknown>)[field] = (
      local as unknown as Record<string, unknown>
    )[field];
  }

  out.hp = {
    ...local.hp,
    ...(fromOrder.hp.overrideMax === undefined ? {} : { overrideMax: fromOrder.hp.overrideMax }),
  };
  if (fromOrder.hp.overrideMax === undefined) delete out.hp.overrideMax;

  /*
    Ein Bild, das der Spieler selbst gesetzt hat, überlebt einen Auftrag ohne
    Bild. Andersherum gewinnt das Bild aus dem Auftrag: wenn der Spielleiter
    eines mitschickt, hat er es absichtlich getan.
  */
  if (fromOrder.portrait === undefined && local.portrait !== undefined) {
    out.portrait = local.portrait;
  }

  // Entwurfs-Markierungen sind rein örtlich — ein Auftrag macht aus einem Bogen
  // keinen Entwurf und umgekehrt.
  if (local.draftOf === undefined) delete out.draftOf;
  else out.draftOf = local.draftOf;

  out.spellState = {};
  for (const [classId, fromState] of Object.entries(fromOrder.spellState)) {
    const mine = local.spellState[classId];
    out.spellState[classId] = {
      known: fromState.known,
      prepared: mine?.prepared ?? fromState.prepared,
      usedSlots: mine?.usedSlots ?? fromState.usedSlots,
    };
  }

  const myTrackerValue = new Map(local.trackers.map((t) => [t.id, t.value]));
  out.trackers = fromOrder.trackers.map((tracker) => {
    const mine = myTrackerValue.get(tracker.id);
    /*
      Ein NEUER Zähler kommt voll an. Das ist der Fall „du hast Stufe 8 und damit
      Untote vertreiben": mit Stand 0 anzukommen wäre falsch, denn niemand hat ihn
      benutzt.
    */
    return mine === undefined ? tracker : { ...tracker, value: mine };
  });

  return out;
}
