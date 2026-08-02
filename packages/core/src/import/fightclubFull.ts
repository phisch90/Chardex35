import { ABILITIES, type Ability } from "../schema/common.js";
import { characterSchema, type Character } from "../schema/character.js";
import type { Entity } from "../schema/entities.js";
import { buildHomebrewItem } from "../compendium/homebrewItem.js";
import type { FightClubAction, FightClubPc, ImportIssue, ImportResultPc } from "./fightclub.js";

/**
 * Der ZWEITE Fight-Club-Export: `<pc version="3"><character>…`.
 *
 * Fight Club kann auf zwei Wege exportieren, und sie haben fast nichts
 * gemeinsam:
 *
 *  - **Statblock** (`<characters><pc>`): was der Spielleiter sieht. Fertige
 *    Zahlen — „ac 16", „hp 36/62", Talente als Komma-Liste, Angriffe als
 *    `<action>`. Ausrüstung fehlt vollständig.
 *  - **Vollständig** (`<pc><character>`): der ganze Bogen. Attribute als
 *    Zahlenliste, Klassen mit Stufentabelle, jede Fertigkeit einzeln mit Rang,
 *    jeder Gegenstand mit Platz am Körper, Behälter, Zähler, Notizen,
 *    vorbereitete Zauber.
 *
 * Der Statblock war das Einzige, was ich hatte, und der Importer hat darauf
 * aufgebaut: fehlende Rüstung wurde über einen sichtbaren Ausgleichsmodifikator
 * ausgeglichen, weil sie im Export nicht vorkommt. Mit dieser Datei ist der
 * Umweg unnötig — die Rüstung steht drin, mit Platz und Bonus.
 *
 * Warum das ein eigenes Modul ist und kein Schalter im alten: hier wird nichts
 * rekonstruiert. Die Werte sind roh, und rohe Werte gehen einen anderen Weg
 * durchs Modell als abgeleitete.
 */

// ---------------------------------------------------------------------------
// Die Zahlen-Schlüssel von Fight Club
// ---------------------------------------------------------------------------

/**
 * `<slot>` am Gegenstand — wo er am Körper steckt.
 *
 * Abgelesen an einem echten Bogen: Leather Armor 5, Shield Heavy Wooden 4,
 * Sword Short 2, Amulett 1, alles im Rucksack ohne `slot`. Das deckt sich mit
 * den Marken, die Fight Club anzeigt (A / OH / 1H) und die wir übernommen haben.
 *
 * 3 ist die begründete Annahme für „Waffe in der zweiten Hand": 2 und 4 sind
 * belegt, und zwischen Haupthand und Schild gehört sie hin. Sollte es anders
 * sein, landet die Waffe in der Schildhand statt in der Haupthand — ein
 * sichtbarer, mit einem Tap behebbarer Fehler, kein stiller.
 */
const FC_SLOT: Record<string, "worn" | "mainHand" | "offHand" | "armor"> = {
  "1": "worn",
  "2": "mainHand",
  "3": "offHand",
  "4": "offHand",
  "5": "armor",
};

/** `<ability>` an einer Fertigkeit und der Index in `<abilities>`. */
const FC_ABILITY: Record<string, Ability> = {
  "1": "str",
  "2": "dex",
  "3": "con",
  "4": "int",
  "5": "wis",
  "6": "cha",
};

/**
 * `<modifier><type>` — nur die drei, die in echten Bögen vorkommen und
 * eindeutig sind.
 *
 * Bewusst kurz: einen Zahlenschlüssel zu raten heißt, einen falschen Bonus
 * einzutragen, und ein falscher Bonus ist schlimmer als ein fehlender. Was hier
 * nicht steht, wird gemeldet statt geraten.
 */
const FC_MODIFIER: Record<string, { target: string; label: string }> = {
  "1": { target: "attack", label: "Angriff" },
  "12": { target: "ac", label: "RK" },
  "20": { target: "init", label: "Initiative" },
};

/**
 * Fight-Club-Zähler, die bei uns aus der Klasse FOLGEN — und deshalb der Regel
 * folgen sollen statt der Zahl aus dem Export.
 *
 * Der Anlass ist Philipps eigener Bogen: dort stand „Turn Undead (1d6+2)" auf 8,
 * während seine eigene Notiz die Formel nennt (3 + CHA + 4 vom Talent) und damit
 * bei CHA 10 auf 7 kommt. Gefragt, welche Zahl gilt, hat er geantwortet: **7**.
 * Die 8 war ein alter Stand, der in Fight Club hängen geblieben ist — genau die
 * Sorte eingefrorener Wert, die wir bei den Zählern gerade abgeschafft haben.
 *
 * Alles, was hier NICHT steht, kommt als „von Hand gesetzt" an und bleibt
 * unangetastet: „Action Points" und „Restore Spell Points" gibt es im SRD nicht,
 * für die kennen wir keine Formel, und eine erfundene wäre schlimmer als seine Zahl.
 *
 * Der Vergleich läuft über den Anfang des Namens, weil Fight Club Zusätze anhängt
 * („Turn Undead (1d6+2)").
 */
const DERIVED_TRACKERS: { prefix: string; key: string }[] = [
  { prefix: "turn undead", key: "turn-undead" },
  { prefix: "rebuke undead", key: "turn-undead" },
  { prefix: "smite evil", key: "smite-evil" },
  { prefix: "bardic music", key: "bardic-music" },
  { prefix: "rage", key: "rage" },
  { prefix: "wild shape", key: "wild-shape" },
  { prefix: "stunning fist", key: "stunning-fist" },
];

/**
 * Gehört dieser Zähler zu einem Vorschlag, den die App selbst rechnet?
 *
 * Dann wird er daran gehängt (`suggestedFrom`) und folgt der Regel — auch beim
 * nächsten Stufenaufstieg und beim nächsten Talent.
 */
export function derivedTrackerKey(label: string): string | undefined {
  const clean = label.toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
  /*
    An der WORTGRENZE vergleichen, nicht am nackten Anfang. Ein Test hat den Fehlgriff
    sofort gefangen: „Ragebringer Aufladungen" fing mit „rage" an und wäre als
    Barbaren-Raserei gelesen worden — samt einer Grenze, die die App aus der
    Barbarenstufe rechnet, die es gar nicht gibt.
  */
  return DERIVED_TRACKERS.find(
    (entry) => clean === entry.prefix || clean.startsWith(`${entry.prefix} `),
  )?.key;
}

/** Namen, unter denen Fight Club Münzen als Gegenstand führt. */
const COIN_NAMES: Record<string, "pp" | "gp" | "sp" | "cp"> = {
  "platinum pieces": "pp",
  "gold pieces": "gp",
  "silver pieces": "sp",
  "copper pieces": "cp",
};

// ---------------------------------------------------------------------------
// Was der vollständige Export zusätzlich hergibt
// ---------------------------------------------------------------------------

export interface FullItem {
  name: string;
  /** Wo am Körper — schon auf unsere Plätze übersetzt. */
  slot: "none" | "worn" | "mainHand" | "offHand" | "armor";
  qty: number;
  weightLb?: number | undefined;
  costGp?: number | undefined;
  /** Rüstungs-/Schildbonus, wenn angegeben. */
  armorClass?: number | undefined;
  /**
   * Schadenswürfel — NUR gesetzt, wenn es wirklich eine Waffe ist.
   *
   * Fight Club schreibt „1d4" an JEDEN Gegenstand, auch an Wegzehrung, an einen
   * Auftragszettel und an eine Schaufel. Wer `damage` als „ist eine Waffe" liest,
   * bekommt ein Gepäck voller Waffen — deshalb steht hier nichts, wo nichts ist.
   */
  damage?: string | undefined;
  critDie?: number | undefined;
  critMult?: number | undefined;
  /**
   * Sieht das nach einer Waffe aus?
   *
   * Entschieden an den Angaben, die nur Waffen haben: Kritischer Bereich,
   * Multiplikator, Waffeneigenschaften. An Hikes Bogen trennt das die vier
   * echten Waffen sauber von Schaufel, Amulett und Wegzehrung.
   */
  looksLikeWeapon: boolean;
  /** Rüstung oder Schild — `armorClass` haben nur diese beiden. */
  looksLikeArmor: boolean;
  /** Eigener Text am Gegenstand (Eigenbau-Beschreibung). */
  text?: string | undefined;
  /** Boni am Gegenstand, soweit der Schlüssel bekannt ist. */
  modifiers: { target: string; label: string; value: number }[];
  /** Boni mit unbekanntem Schlüssel — werden gemeldet, nicht geraten. */
  unknownModifiers: { type: string; value: number }[];
  /** Name des Behälters, falls er in einem lag. */
  container?: string | undefined;
}

export interface FullTracker {
  label: string;
  value: number;
  max: number;
  /** `resetType 1` = füllt sich bei der Rast. */
  perDay: boolean;
}

export interface FullClass {
  name: string;
  level: number;
  /** Zauberplätze je Grad, wie Fight Club sie rechnet (Grundtabelle). */
  slots?: number[] | undefined;
  slotsCurrent?: number[] | undefined;
  /** Gesetzt, wenn die Klasse zaubert. */
  spellAbility?: Ability | undefined;
}

/** Die Felder, die nur der vollständige Export liefert. */
export interface FightClubFullExtras {
  xp?: number | undefined;
  classes: FullClass[];
  items: FullItem[];
  money: { pp: number; gp: number; sp: number; cp: number };
  trackers: FullTracker[];
  notes: { title: string; text: string }[];
  /** Vorbereitete Zauber, je Grad. */
  prepared: { name: string; level: number; count: number }[];
  /** Boni aus Talenten, soweit der Schlüssel bekannt ist. */
  featModifiers: { feat: string; target: string; label: string; value: number }[];
}

export type FightClubFullPc = FightClubPc & { full: FightClubFullExtras };

// ---------------------------------------------------------------------------
// XML — dieselbe Bauart wie im alten Modul: tolerant, ohne DOM
// ---------------------------------------------------------------------------

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

/** Blöcke EINER Ebene — verschachtelte gleiche Tags werden mitgezählt. */
function blocks(xml: string, tag: string): string[] {
  const open = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "gi");
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = open.exec(xml)) !== null) {
    const start = match.index + match[0].length;
    let depth = 1;
    let at = start;
    const scan = new RegExp(`<(/?)${tag}(?:\\s[^>]*)?>`, "gi");
    scan.lastIndex = start;
    let step: RegExpExecArray | null;
    while ((step = scan.exec(xml)) !== null) {
      depth += step[1] === "/" ? -1 : 1;
      if (depth === 0) {
        at = step.index;
        break;
      }
    }
    if (depth !== 0) break;
    out.push(xml.slice(start, at));
    open.lastIndex = at;
  }
  return out;
}

/**
 * Der Text eines direkten Kindes — NICHT eines beliebig tiefen.
 *
 * Das ist der Unterschied, der hier zählt: `<character>` enthält 313 `<spell>`
 * mit eigenem `<name>`, und ein gieriges „such das erste name" hätte den
 * Charakter „Control Weather" genannt.
 */
function childText(block: string, tag: string): string | undefined {
  const stripped = stripNested(block);
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const match = pattern.exec(stripped);
  if (!match) return undefined;
  const text = decodeEntities(match[1] ?? "").trim();
  return text === "" ? undefined : text;
}

/**
 * Entfernt die großen Unterbäume, die eigene `<name>`-Felder mitbringen.
 *
 * Ohne das müsste jede Abfrage wissen, welche Kinder es gibt. Mit dem Ausschnitt
 * bleibt genau die Ebene übrig, auf der man sucht.
 */
const NESTED = [
  "class",
  "item",
  "container",
  "skill",
  "feat",
  "tracker",
  "note",
  "spell",
  "race",
  "imageData",
  /*
    `modifier` muss mit heraus, und das ist an echten Daten aufgefallen: ein
    Kurzschwert trägt `<modifier><type>1</type><value>1</value></modifier>` für
    den Meisterarbeits-Bonus. Ohne diesen Ausschnitt las „was kostet der
    Gegenstand" den Wert 1 aus dem Bonus — das Schwert kostete plötzlich 1 Gold.
  */
  "modifier",
];

function stripNested(block: string, keep: string[] = []): string {
  let out = block;
  for (const tag of NESTED) {
    if (keep.includes(tag)) continue;
    out = out.replace(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?</${tag}>`, "gi"), "");
    // Selbstschließende und leere Formen.
    out = out.replace(new RegExp(`<${tag}(?:\\s[^>]*)?/>`, "gi"), "");
  }
  return out;
}

function childNumber(block: string, tag: string): number | undefined {
  const text = childText(block, tag);
  if (text === undefined) return undefined;
  const match = /[+-]?\d+(?:[.,]\d+)?/.exec(text);
  return match ? Number(match[0].replace(",", ".")) : undefined;
}

/** „5,3,2,0,0," → [5,3,2,0,0]. Leere Felder fallen weg, nicht auf 0. */
function numberList(text: string | undefined): number[] | undefined {
  if (text === undefined) return undefined;
  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  if (parts.length === 0) return undefined;
  return parts.map((part) => Number(part)).map((value) => (Number.isFinite(value) ? value : 0));
}

/**
 * „19-20/x3" aus `critDie` und `critMult`.
 *
 * Fight Club schreibt den ANFANG des kritischen Bereichs (19), nicht den Bereich
 * — „19" allein hieße bei uns „nur die 19 trifft kritisch". Und ein fehlender
 * Multiplikator ist ×2, nicht keiner.
 */
function criticalText(item: { critDie?: number | undefined; critMult?: number | undefined }): string | undefined {
  if (item.critDie === undefined && item.critMult === undefined) return undefined;
  const from = item.critDie ?? 20;
  const range = from >= 20 ? "20" : `${from}-20`;
  return `${range}/x${item.critMult ?? 2}`;
}

// ---------------------------------------------------------------------------
// Nachbearbeitung: was nur der vollständige Export hergibt
// ---------------------------------------------------------------------------

/**
 * Trägt Geld, EP, Ausrüstung, Zähler und Notizen nach.
 *
 * Bewusst ein Schritt NACH dem gemeinsamen Mapper und nicht in ihm: der Mapper
 * rekonstruiert aus abgeleiteten Werten, hier werden rohe Angaben nur
 * durchgeschrieben. Zwei Aufgaben in einer Funktion hätten aus jeder Änderung an
 * einer davon ein Risiko für die andere gemacht.
 */
export function applyFullExtras(
  result: ImportResultPc,
  pc: FightClubFullPc,
  compendium: Map<string, Entity>,
  idFactory: () => string,
): ImportResultPc {
  const character: Character = structuredClone(result.character);
  const entities = [...result.entities];
  const issues = [...result.issues];
  const { full } = pc;

  character.money = { ...full.money };
  if (full.xp !== undefined) character.xp = full.xp;

  // --- Ausrüstung, die keine Waffe ist ---------------------------------------
  const itemIndex = buildItemIndex(compendium);
  const alreadyThere = new Set(
    character.inventory
      .map((row) => (row.itemId === undefined ? row.customName : compendium.get(row.itemId)?.name))
      .filter((name): name is string => name !== undefined)
      .map((name) => name.toLowerCase()),
  );

  for (const item of full.items) {
    if (item.looksLikeWeapon) continue; // die kamen über die Angriffszeilen
    if (alreadyThere.has(item.name.toLowerCase())) continue;

    const matchedId = lookupItem(itemIndex, item.name);
    if (matchedId !== undefined) {
      character.inventory.push({
        id: idFactory(),
        itemId: matchedId,
        qty: item.qty,
        slot: item.slot,
        extraEffects: [],
      });
      continue;
    }

    /*
      Eigenbau. Rüstung und Schild bekommen einen echten Eintrag mit ihrem Bonus —
      sonst rechnet die RK nicht und wir wären wieder beim Ausgleichsmodifikator.
      Alles andere wird ein Gegenstand ohne Wirkung, aber MIT seinem Text: „Iron
      Concecration" ist eine halbe Seite Eigenbau, und die darf nicht verschwinden.
    */
    const entity = buildFullItem(item, `homebrew:item:${slugName(item.name)}`);
    entities.push(entity);
    character.inventory.push({
      id: idFactory(),
      itemId: entity.id,
      qty: item.qty,
      slot: item.slot,
      extraEffects: [],
    });
  }

  const unknownMods = full.items.flatMap((item) =>
    item.unknownModifiers.map((mod) => `${item.name} (Art ${mod.type}, ${mod.value >= 0 ? "+" : ""}${mod.value})`),
  );
  if (unknownMods.length > 0) {
    issues.push({
      severity: "warning",
      code: "fc-full-unknown-modifier",
      message: `Diese Boni aus Fight Club kenne ich nicht und habe sie NICHT übernommen: ${unknownMods.join(", ")}. Trag sie bei Bedarf als eigenen Modifikator nach — geraten hätte ich sonst eine falsche Zahl.`,
    });
  }

  // --- Zähler ----------------------------------------------------------------
  /*
    Zähler kommen als `maxManual: true` an, und das ist eine bewusste Entscheidung.

    Sie sind SEINE Zahlen, keine abgeleiteten: „Action Points 6" und „Restore
    Spell Points" gibt es im SRD nicht, und bei „Turn Undead" steht in seinem Bogen
    8, während die Regel 3 + CHA + 4 = 7 ergibt. Welche Zahl gilt, entscheidet der
    Tisch — nicht der Import. Als abgeleitet markiert würde sein Wert beim nächsten
    Öffnen auf unseren überschrieben, und das wäre genau der Fehler, den wir gerade
    behoben haben, nur mit umgekehrtem Vorzeichen.
  */
  for (const tracker of full.trackers) {
    if (character.trackers.some((existing) => existing.name === tracker.label)) continue;
    const derived = derivedTrackerKey(tracker.label);
    if (derived !== undefined) {
      /*
        Diesen Zähler rechnet die App selbst. Er hängt am Vorschlag und folgt damit
        der Regel — die Zahl aus dem Export wird BEWUSST nicht als Grenze
        übernommen. Der aktuelle Stand kommt mit: wie viele Einsätze heute noch übrig
        sind, weiß nur der Export.
      */
      character.trackers.push({
        id: idFactory(),
        name: tracker.label,
        kind: "counter",
        value: tracker.value,
        maxManual: false,
        suggestedFrom: derived,
      });
      if (tracker.max > 0) {
        issues.push({
          severity: "info",
          code: "fc-full-tracker-derived",
          message: `„${tracker.label}" stand in Fight Club auf ${tracker.max} — die App rechnet die Grenze jetzt selbst aus Klasse, Attribut und Talenten und hält sie damit beim nächsten Aufstieg von allein aktuell. Stimmt die Zahl bei dir nicht, kannst du sie im Bogen von Hand überschreiben.`,
        });
      }
      continue;
    }
    character.trackers.push({
      id: idFactory(),
      name: tracker.label,
      kind: "counter",
      value: tracker.value,
      max: tracker.max,
      maxManual: true,
      /*
        `resetType 1` heißt in Fight Club „füllt sich bei der Rast". Das stand hier
        vorher als SATZ im Notizfeld — lesbar für ihn, aber unerreichbar für jede
        Regel: `planRest` konnte damit nichts anfangen und entschied stattdessen
        danach, ob der Zähler aus einem Vorschlag der App entstand. Ein importierter
        „Aktionspunkte"-Zähler rastete deshalb nicht mit, obwohl in der Datei stand,
        dass er es tut.

        Jetzt landet es im Feld — und zwar als "short", weil das der Wert ist, den
        seine anderen Tageszähler haben: seine kurze Pause füllt sie mit („Kurze
        Pause (nur Tageszähler)"). Ein importierter Zähler soll sich verhalten wie
        einer, den die App selbst vorgeschlagen hätte. Auf acht Stunden beschränken
        kann er ihn am Zähler.
      */
      ...(tracker.perDay ? { refill: "short" as const } : {}),
    });
  }

  // --- Notizen ---------------------------------------------------------------
  for (const note of full.notes) {
    const title = note.title === "" ? "Aus Fight Club" : note.title;
    if (character.noteSections.some((section) => section.title === title)) continue;
    character.noteSections.push({ id: idFactory(), title, body: note.text });
  }

  // --- Domänen ---------------------------------------------------------------
  /*
    Fight Club kennt für Domänen kein Feld — sie stehen in einer NOTIZ:
    `<note><title>Domains</title><text>Heal / War</text></note>`. In seinem Bogen
    ist das die einzige Spur, und als reiner Notiztext hätten sie weder Zauber
    noch den Domänenplatz ausgelöst.

    Die Notiz bleibt trotzdem stehen. Sie ist sein Text, und sie kann mehr
    enthalten als die zwei Namen; still umzuschreiben, was er selbst geschrieben
    hat, ist keine Aufgabe eines Importeurs.
  */
  const domainNote = full.notes.find((note) => /^domains?$/i.test(note.title.trim()));
  if (domainNote !== undefined) {
    const classId = character.levels
      .map((level) => level.classId)
      .find((id) => domainPick(compendium.get(id)) > 0);
    if (classId !== undefined) {
      const read = readDomainNote(buildDomainIndex(compendium), domainNote.text);
      for (const listId of read.ids) {
        if (character.domains.some((d) => d.classId === classId && d.spellListId === listId)) continue;
        character.domains.push({ classId, spellListId: listId });
      }
      if (read.names.length > 0) {
        issues.push({
          severity: "info",
          code: "fc-full-domains",
          message: `Domänen aus deiner Notiz übernommen: ${read.names.join(", ")}. Damit hast du deren Zauber zur Auswahl und je Zaubergrad einen Platz mehr.`,
        });
      } else if (read.unmatched.length > 0) {
        issues.push({
          severity: "info",
          code: "fc-full-domains-unmatched",
          message: `In deiner Notiz „Domains" habe ich keine Domäne erkannt (gelesen: ${read.unmatched.join(", ")}). Wähl sie im Zauber-Reiter von Hand — geraten hätte ich sonst die falsche Zauberliste.`,
        });
      }
    }
  }

  // --- Vorbereitete Zauber ---------------------------------------------------
  const casterClassId = character.levels
    .map((level) => level.classId)
    .find((classId) => compendium.get(classId)?.kind === "class" && hasSpellcasting(compendium.get(classId)));
  if (full.prepared.length > 0 && casterClassId !== undefined) {
    const spellIndex = buildSpellIndex(compendium);
    const state = character.spellState[casterClassId] ?? { known: [], prepared: [], usedSlots: [] };
    const missing: string[] = [];
    for (const entry of full.prepared) {
      const spellId = spellIndex.get(normalizeName(entry.name));
      if (spellId === undefined) {
        missing.push(entry.name);
        continue;
      }
      for (let i = 0; i < entry.count; i++) {
        state.prepared.push({ spellId, slotLevel: entry.level });
      }
      if (!state.known.includes(spellId)) state.known.push(spellId);
    }
    character.spellState[casterClassId] = state;
    if (missing.length > 0) {
      issues.push({
        severity: "info",
        code: "fc-full-spell-unmatched",
        message: `Vorbereitet, aber im Regelwerk nicht gefunden: ${missing.join(", ")}. Trag sie im Zauber-Reiter nach.`,
      });
    }
  }

  return { ...result, character: characterSchema.parse(character), entities, issues };
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugName(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "gegenstand"
  );
}

/**
 * Namen aus dem Kompendium, in beiden Schreibweisen.
 *
 * Fight Club schreibt „Shield, Heavy Wooden", das SRD-Pack „Heavy Wooden Shield".
 * Ohne die gedrehte Form fände nur eines von beiden seinen Eintrag — und der
 * Schild landete als Eigenbau ohne Rüstungsbonus im Gepäck.
 */
/**
 * Einen Fight-Club-Namen im Kompendium finden.
 *
 * Vier Anläufe, alle aus echten Fehlschlägen entstanden. Der wichtigste: Fight
 * Club schreibt „Leather Armor", das SRD-Pack nur „Leather" — ohne das
 * abgeschnittene „Armor" landete Hikes Rüstung als Eigenbau ohne Rüstungsbonus im
 * Gepäck, und die RK war um 2 zu niedrig.
 */
function lookupItem(index: Map<string, string>, name: string): string | undefined {
  const candidates = [name];
  const comma = name.indexOf(",");
  if (comma > 0) {
    candidates.push(`${name.slice(comma + 1).trim()} ${name.slice(0, comma).trim()}`);
  }
  for (const base of [...candidates]) {
    const shorter = base.replace(/\s+(armor|armour|shield)$/i, "").trim();
    if (shorter !== base && shorter !== "") candidates.push(shorter);
  }
  for (const candidate of candidates) {
    const hit = index.get(normalizeName(candidate));
    if (hit !== undefined) return hit;
  }
  return undefined;
}

function buildItemIndex(compendium: Map<string, Entity>): Map<string, string> {
  const index = new Map<string, string>();
  for (const entity of compendium.values()) {
    if (entity.kind !== "item" || entity.deletedAt !== undefined) continue;
    const add = (name: string) => {
      const key = normalizeName(name);
      if (key !== "" && !index.has(key)) index.set(key, entity.id);
    };
    add(entity.name);
    const comma = entity.name.indexOf(",");
    if (comma > 0) {
      add(`${entity.name.slice(comma + 1).trim()} ${entity.name.slice(0, comma).trim()}`);
    }
  }
  // Und dieselbe Drehung von der anderen Seite: „Shield, Heavy Wooden" → „Heavy
  // Wooden Shield" wird unten beim Suchen ebenfalls probiert.
  return index;
}

function buildSpellIndex(compendium: Map<string, Entity>): Map<string, string> {
  const index = new Map<string, string>();
  for (const entity of compendium.values()) {
    if (entity.kind !== "spell" || entity.deletedAt !== undefined) continue;
    const key = normalizeName(entity.name);
    if (!index.has(key)) index.set(key, entity.id);
  }
  return index;
}

function hasSpellcasting(entity: Entity | undefined): boolean {
  return entity?.kind === "class" && entity.data.spellcasting !== undefined;
}

function domainPick(entity: Entity | undefined): number {
  if (entity?.kind !== "class") return 0;
  return entity.data.spellcasting?.domains?.pick ?? 0;
}

/**
 * Die Domänen aus einem handgeschriebenen Notizfeld lesen.
 *
 * ZEILENWEISE, und eine Zeile zählt nur, wenn sie AUSSCHLIESSLICH aus
 * Domänennamen besteht. Der Grund steht in seiner echten Notiz:
 *
 *     Heal / war
 *     1 — Cure light wounds / magic weapon
 *     2 — Cure moderate wounds / spiritual weapon
 *
 * Die erste Zeile sind die Domänen, die anderen sind seine Merkliste der
 * Domänenzauber je Grad. Ein Leser, der die ganze Notiz in einen Topf wirft,
 * meldet vier erfundene Domänen — genau das tat die erste Fassung, und in der
 * App standen vier Hinweiszeilen Unsinn.
 *
 * Nur eine Zeile pro Domäne ist ebenso erlaubt („Fire\nWater"): beide Zeilen
 * bestehen dann komplett aus Namen.
 */
function readDomainNote(
  index: Map<string, string>,
  text: string,
): { ids: string[]; names: string[]; unmatched: string[] } {
  const ids: string[] = [];
  const names: string[] = [];
  let firstLine: string[] = [];
  for (const line of text.split("\n")) {
    const parts = line
      .split(/[/,;&]| und /i)
      .map((part) => part.trim())
      .filter((part) => part !== "");
    if (parts.length === 0) continue;
    if (firstLine.length === 0) firstLine = parts;
    const hits = parts.map((part) => lookupDomain(index, part));
    if (hits.some((hit) => hit === undefined)) continue;
    parts.forEach((part, i) => {
      const id = hits[i]!;
      if (ids.includes(id)) return;
      ids.push(id);
      names.push(part);
    });
  }
  /*
    Ungelesenes wird nur gemeldet, wenn GAR NICHTS erkannt wurde. Steht die
    Domäne drin, ist der Rest der Notiz sein Text und niemandes Sache — ihn als
    „unbekannte Domäne" zu melden macht aus einer Hilfe eine Belästigung.
  */
  return { ids, names, unmatched: ids.length === 0 ? firstLine : [] };
}

/**
 * Domänen-Zauberlisten nach Namen, OHNE das Wort „Domain".
 *
 * Die Packs nennen sie „War Domain", er schreibt „War" — und „Heal" für die
 * Domäne, die „Healing" heißt. Deshalb ein Namensregister mit anschließendem
 * Anfangsvergleich, kein Gleichheitstest.
 */
function buildDomainIndex(compendium: Map<string, Entity>): Map<string, string> {
  const index = new Map<string, string>();
  for (const [id, entity] of compendium) {
    if (entity.kind !== "spelllist" || entity.deletedAt !== undefined) continue;
    if (id !== entity.id) continue;
    if (!entity.tags.includes("domain")) continue;
    const key = normalizeName(entity.name.replace(/\s+domain$/i, ""));
    if (!index.has(key)) index.set(key, entity.id);
  }
  return index;
}

/**
 * Einen geschriebenen Domänennamen einer Liste zuordnen.
 *
 * Genauer Treffer zuerst, dann ein Anfang, der NUR EINE Domäne trifft. „Ma"
 * passt auf Madness und Magic — dann wird nichts gewählt und der Name
 * gemeldet. Eine geratene Domäne wären neun falsche Zauber, und die fallen
 * niemandem auf, bis sie am Spieltisch gebraucht werden.
 */
function lookupDomain(index: Map<string, string>, name: string): string | undefined {
  const key = normalizeName(name.replace(/\s+domain$/i, ""));
  if (key === "") return undefined;
  const exact = index.get(key);
  if (exact !== undefined) return exact;
  const starts = [...index.entries()].filter(([listName]) => listName.startsWith(key));
  return starts.length === 1 ? starts[0]![1] : undefined;
}

/**
 * Ein Eigenbau-Gegenstand aus einer Fight-Club-Zeile.
 *
 * Rüstung und Schild bekommen ihren Bonus als echte Daten — ohne den rechnet die
 * RK nicht, und dann wären wir wieder beim Ausgleichsmodifikator. Ob Schild oder
 * Rüstung, entscheidet der Platz: Fight Club steckt den Schild in die Schildhand.
 */
function buildFullItem(item: FullItem, id: string): Entity {
  /*
    Was hier GERATEN wird, und warum es so bleibt: der Export nennt nur den
    RK-Wert. Ob leichte, mittlere oder schwere Rüstung, wie hoch die DEX-Grenze
    ist und welcher Fertigkeits-Malus gilt, steht nicht darin. Geraten wird
    deshalb die freundlichste Annahme — leicht, keine DEX-Grenze, kein Malus —,
    denn eine erfundene Grenze würde stillschweigend Fertigkeiten und RK senken.

    Nachtragen kann er das jetzt selbst: der Eigenbau-Editor im Ausrüstungs-
    Reiter zeigt genau diese Felder an einem importierten Stück.
  */
  const armor =
    item.armorClass === undefined
      ? undefined
      : {
          kind: item.slot === "offHand" ? ("shield" as const) : ("light" as const),
          acBonus: item.armorClass,
          maxDex: null,
          acp: 0,
          asf: 0,
        };
  return buildHomebrewItem({
    id,
    name: item.name,
    kind: armor === undefined ? "gear" : armor.kind === "shield" ? "shield" : "armor",
    ...(item.text === undefined ? {} : { description: item.text }),
    ...(item.weightLb === undefined ? {} : { weightLb: item.weightLb }),
    ...(item.costGp === undefined ? {} : { costGp: item.costGp }),
    ...(armor === undefined ? {} : { armor }),
  });
}

// ---------------------------------------------------------------------------
// Erkennung
// ---------------------------------------------------------------------------

/**
 * Ist das der vollständige Export?
 *
 * Am Wurzel-Element festgemacht und nicht an einem Feld: `<pc version="3">` mit
 * einem `<character>` darin ist eindeutig, und ein Fehlurteil hier schickt die
 * Datei durch den falschen Leser — mit einem fast leeren Charakter als Ergebnis.
 * Genau das passierte vorher.
 */
export function isFullFightClubExport(xml: string): boolean {
  return /<pc(?:\s[^>]*)?>\s*<character(?:\s[^>]*)?>/i.test(xml);
}

// ---------------------------------------------------------------------------
// Lesen
// ---------------------------------------------------------------------------

export function parseFullFightClubXml(xml: string): {
  pcs: FightClubFullPc[];
  issues: ImportIssue[];
} {
  const issues: ImportIssue[] = [];
  const characters = blocks(xml, "character");
  if (characters.length === 0) {
    issues.push({
      severity: "error",
      code: "fc-full-no-character",
      message: "Kein <character>-Block in der Datei gefunden.",
    });
    return { pcs: [], issues };
  }

  const pcs = characters.map((block) => readCharacter(block, issues));
  return { pcs, issues };
}

function readCharacter(block: string, issues: ImportIssue[]): FightClubFullPc {
  const head = stripNested(block);
  const name = childText(head, "name") ?? "Unbenannt";

  /*
    Attribute stehen als eine Zahlenliste, und das erste Feld ist NICHT Stärke.
    Abgeglichen mit demselben Charakter aus dem Statblock-Export: die Liste
    „10,15,13,12,8,11,10" gehört zu STR 15, DEX 13, CON 12, INT 8, WIS 11,
    CHA 10 — Feld 0 ist ein Platzhalter. Wer hier um eins verschiebt, bekommt
    einen Charakter mit vertauschten Attributen, und das fällt erst am Tisch auf.
  */
  const abilities: Partial<Record<Ability, number>> = {};
  const abilityList = numberList(childText(head, "abilities"));
  if (abilityList !== undefined) {
    if (abilityList.length < 7) {
      issues.push({
        severity: "warning",
        code: "fc-full-abilities",
        message: `${name}: die Attributsliste hat nur ${abilityList.length} Felder (erwartet 7). Fehlende Attribute bleiben leer.`,
      });
    }
    ABILITIES.forEach((ability, index) => {
      const value = abilityList[index + 1];
      if (value !== undefined) abilities[ability] = value;
    });
  }

  const hpMax = childNumber(head, "hpMax");
  const hpCurrent = childNumber(head, "hpCurrent");

  const classes: FullClass[] = blocks(block, "class").map((classBlock) => {
    const classHead = stripNested(classBlock);
    const spellAbility = childText(classHead, "spellAbility");
    return {
      name: childText(classHead, "name") ?? "?",
      level: childNumber(classHead, "level") ?? 1,
      /*
        Zauberplätze nur bei Zauberklassen lesen. Der Fighter in diesem Bogen
        trägt „3,1,0,…" — das sind keine Zauber, und sie als solche zu nehmen
        hätte einem Kämpfer Zauberplätze gegeben.
      */
      ...(spellAbility === undefined
        ? {}
        : {
            slots: numberList(childText(classHead, "slots")),
            slotsCurrent: numberList(childText(classHead, "slotsCurrent")),
            spellAbility: FC_ABILITY[spellAbility],
          }),
    };
  });

  const raceBlock = blocks(block, "race")[0];
  const raceName = raceBlock === undefined ? undefined : childText(stripNested(raceBlock), "name");
  /*
    Der gemeinsame Mapper liest „Volk Klasse N / Klasse M" — mit Schrägstrich
    zwischen den Klassen, so wie der Statblock-Export es schreibt. Ohne ihn war
    „Human Fighter 3 Cleric 4" EINE unbekannte Klasse, und der Bogen kam ohne
    Stufe, ohne GAB und ohne Rettungswürfe an.
  */
  const raceClass = [
    raceName,
    classes.map((c) => `${c.name} ${c.level}`).join(" / "),
  ]
    .filter((part) => part !== undefined && part !== "")
    .join(" ");

  /*
    Talente: je ein <feat> mit Name und Beschreibungstext — aber NUR die direkt am
    Charakter.

    Das war der zweite Fund an echten Daten: Klassen und Volk bringen eigene
    `<feat>`-Blöcke mit, und ohne diesen Ausschnitt kamen „Languages", „Weapon and
    Armor Proficiency", „Aura (Ex)", „Spontaneous Casting" und „Turn or Rebuke
    Undead (Su)" als gewählte Talente an — elf erfundene Einträge neben den sechs
    echten. Klassenfähigkeiten entstehen bei uns aus der Klasse selbst.
  */
  const characterOnly = block
    .replace(/<class(?:\s[^>]*)?>[\s\S]*?<\/class>/gi, "")
    .replace(/<race(?:\s[^>]*)?>[\s\S]*?<\/race>/gi, "");
  const featBlocks = blocks(characterOnly, "feat");
  const featTokens: string[] = [];
  const featModifiers: FightClubFullExtras["featModifiers"] = [];
  for (const featBlock of featBlocks) {
    const featHead = stripNested(featBlock);
    const featName = childText(featHead, "name");
    if (featName === undefined) continue;
    /*
      Die Klassen bringen ihre eigenen „feat"-Blöcke mit (Waffenkenntnis,
      Bonustalente) — das sind Klassenfähigkeiten, keine gewählten Talente. Sie
      stecken im <class>-Baum und sind hier schon herausgeschnitten; was übrig
      bleibt, stammt vom Charakter und aus dem Volk.
    */
    featTokens.push(featName);
    for (const mod of blocks(featBlock, "modifier")) {
      const type = childText(mod, "type");
      const value = childNumber(mod, "value");
      if (type === undefined || value === undefined) continue;
      const known = FC_MODIFIER[type];
      if (known) featModifiers.push({ feat: featName, ...known, value });
    }
  }

  // Fertigkeiten: je ein <skill>. Der Name trägt die Ränge in Klammern („Bluff (1)"),
  // aber <rank> ist die Zahl, auf die es ankommt.
  const skills: FightClubPc["skills"] = [];
  const unparsedSkills: string[] = [];
  for (const skillBlock of blocks(block, "skill")) {
    const raw = childText(skillBlock, "name");
    if (raw === undefined) continue;
    const rank = childNumber(skillBlock, "rank") ?? 0;
    if (rank === 0) continue;
    // „Bluff (1)" → „Bluff"; das angehängte „U" markiert untrainiert.
    const clean = raw.replace(/\s*\(\d+(?:[.,]\d+)?\)\s*$/, "").replace(/\s+U$/, "").trim();
    if (clean === "") {
      unparsedSkills.push(raw);
      continue;
    }
    skills.push({ name: clean, ranks: rank, total: undefined });
  }

  // Gegenstände: direkt am Charakter und in Behältern.
  const items: FullItem[] = [];
  const money = { pp: 0, gp: 0, sp: 0, cp: 0 };
  const readItem = (itemBlock: string, container?: string) => {
    const itemHead = stripNested(itemBlock, ["imageData"]);
    const itemName = childText(itemHead, "name");
    if (itemName === undefined) return;

    const qty = childNumber(itemHead, "quantity") ?? 1;
    const coin = COIN_NAMES[itemName.toLowerCase()];
    if (coin !== undefined) {
      // Münzen sind bei Fight Club Gegenstände in einem Beutel. Als Zeilen im
      // Gepäck wären sie Rauschen — sie gehören auf die Geld-Karte.
      money[coin] += qty;
      return;
    }

    const modifiers: FullItem["modifiers"] = [];
    const unknownModifiers: FullItem["unknownModifiers"] = [];
    for (const mod of blocks(itemBlock, "modifier")) {
      const type = childText(mod, "type");
      const value = childNumber(mod, "value");
      if (type === undefined || value === undefined) continue;
      const known = FC_MODIFIER[type];
      if (known) modifiers.push({ ...known, value });
      else unknownModifiers.push({ type, value });
    }

    /*
      Was in einem Behälter liegt, ist NICHT angelegt.

      Fight Club schreibt allem im Beutel `slot 1`, und wörtlich genommen hätte
      Hike seine Wegzehrung und einen Auftragszettel „getragen" am Körper. Ein
      Behälter IST der Rucksack — und beide Behälter tragen `ignore: 1`, Fight
      Club rechnet ihren Inhalt selbst nicht mit.
    */
    const slotCode = container === undefined ? childText(itemHead, "slot") : undefined;
    const critDie = childNumber(itemHead, "critDie");
    const critMult = childNumber(itemHead, "critMult");
    const property = childText(itemHead, "property");
    const armorClass = childNumber(itemHead, "armorClass");
    const looksLikeWeapon =
      critDie !== undefined || critMult !== undefined || property !== undefined;

    items.push({
      name: itemName,
      slot: slotCode === undefined ? "none" : (FC_SLOT[slotCode] ?? "none"),
      qty,
      weightLb: childNumber(itemHead, "weight"),
      costGp: childNumber(itemHead, "value"),
      armorClass,
      ...(looksLikeWeapon ? { damage: childText(itemHead, "damage") } : {}),
      critDie,
      critMult,
      looksLikeWeapon,
      looksLikeArmor: armorClass !== undefined,
      text: childText(itemHead, "text"),
      modifiers,
      unknownModifiers,
      ...(container === undefined ? {} : { container }),
    });
  };

  // Zuerst die Behälter, dann die freien Gegenstände: sonst würden die
  // Gegenstände IN den Behältern doppelt gelesen.
  const containerBlocks = blocks(block, "container");
  for (const containerBlock of containerBlocks) {
    const containerName = childText(stripNested(containerBlock, ["imageData"]), "name") ?? "Behälter";
    for (const inner of blocks(containerBlock, "item")) readItem(inner, containerName);
  }
  let loose = block;
  for (const containerBlock of containerBlocks) loose = loose.replace(containerBlock, "");
  for (const itemBlock of blocks(loose, "item")) readItem(itemBlock);

  const trackers: FullTracker[] = blocks(block, "tracker").map((trackerBlock) => ({
    label: childText(trackerBlock, "label") ?? "Zähler",
    value: childNumber(trackerBlock, "value") ?? 0,
    max: childNumber(trackerBlock, "formula") ?? childNumber(trackerBlock, "value") ?? 0,
    perDay: childText(trackerBlock, "resetType") === "1",
  }));

  const notes = blocks(block, "note")
    .map((noteBlock) => ({
      title: childText(noteBlock, "title") ?? "",
      text: childText(noteBlock, "text") ?? "",
    }))
    .filter((note) => note.title !== "" || note.text !== "");

  /*
    Vorbereitete Zauber stehen an der Klasse, mit <prepared> als ANZAHL. Die
    Liste enthält daneben die ganze Klassenliste (300+ Einträge) — nur die
    vorbereiteten sind eine Aussage über diesen Charakter.
  */
  const prepared: FightClubFullExtras["prepared"] = [];
  for (const classBlock of blocks(block, "class")) {
    for (const spellBlock of blocks(classBlock, "spell")) {
      const count = childNumber(spellBlock, "prepared");
      if (count === undefined || count <= 0) continue;
      prepared.push({
        name: childText(spellBlock, "name") ?? "?",
        level: childNumber(spellBlock, "level") ?? 0,
        count,
      });
    }
  }

  /*
    Waffen gehen als „Aktionen" weiter — genau der Weg, den der Statblock-Import
    schon nimmt. Damit entstehen Angriffszeilen, Eigenbau-Waffen werden angelegt
    und „Weapon Focus (Kurzschwert)" findet seinen Gegenstand, ohne dass hier
    irgendetwas davon nachgebaut wird.
  */
  const actions: FightClubAction[] = items
    .filter((item) => item.looksLikeWeapon)
    .map((item) => ({
      name: item.name,
      damage: item.damage,
      critical: criticalText(item),
    }));

  /*
    Der Platz steht in der Datei — für Waffen UND für Rüstung und Schild. Der
    Statblock-Import muss raten (erste Waffe in die Hand); hier wäre Raten falsch.
  */
  const slotByName: Record<string, "none" | "worn" | "mainHand" | "offHand" | "armor"> = {};
  for (const item of items) slotByName[item.name] = item.slot;

  return {
    name,
    raceClass,
    abilities,
    slotByName,
    ...(hpMax === undefined
      ? {}
      : { hp: { current: hpCurrent ?? hpMax, max: hpMax } }),
    saves: {},
    featTokens,
    skills,
    unparsedSkills,
    actions,
    full: {
      xp: childNumber(head, "xp"),
      classes,
      items,
      money,
      trackers,
      notes,
      prepared,
      featModifiers,
    },
  };
}
