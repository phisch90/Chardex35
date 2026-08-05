import { ABILITIES, type Ability, type Size } from "../schema/common.js";
import {
  CURRENT_SCHEMA_VERSION,
  characterSchema,
  type Character,
  type EquipSlot,
  type HouseRules,
} from "../schema/character.js";
import { displayName, skillKey, type Entity } from "../schema/entities.js";
import { buildHomebrewItem } from "../compendium/homebrewItem.js";
import { allowedSlots, deriveSheet } from "../engine/index.js";
import {
  applyFullExtras,
  isFullFightClubExport,
  parseFullFightClubXml,
} from "./fightclubFull.js";

/**
 * Importer für Charakter-Exporte der App „Fight Club" (Lion's Den), 3.5-Edition:
 * `<characters version="3"><pc>…</pc></characters>`.
 *
 * Der Export enthält überwiegend ABGELEITETE Werte (RK, Angriffsboni, Saves),
 * unser Modell speichert aber rohe Entscheidungen. Der Importer rekonstruiert
 * daher, was rekonstruierbar ist (Volk, Klassenstufen, Attribute, Ränge,
 * Talente, Waffen) und behandelt den Rest so:
 *
 * - **TP** werden als `overrideMax` + Schaden übernommen (exakte Kontinuität).
 * - **RK und Rettungswürfe** werden über EINEN manuellen Ausgleichsmodifikator
 *   auf den Importwert gebracht — dort sitzt typischerweise Ausrüstung, die der
 *   Export nicht mitliefert. Der Modifikator ist im Bogen sichtbar und löschbar.
 * - **Alles andere** (BAB, Ringkampf, Initiative, Angriffsboni, Fertigkeits-
 *   summen) wird NICHT verbogen: Abweichungen erscheinen als Bericht, damit man
 *   sieht, wo eine Regel-Interpretation auseinandergeht.
 */

export interface ImportIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
}

export interface FightClubAction {
  name: string;
  attack?: string | undefined;
  damage?: string | undefined;
  critical?: string | undefined;
}

export interface FightClubPc {
  name: string;
  raceClass: string;
  size?: string | undefined;
  /** Endwerte inklusive Volksmodifikatoren. */
  abilities: Partial<Record<Ability, number>>;
  hp?: { current: number; max: number } | undefined;
  ac?: number | undefined;
  touch?: number | undefined;
  flatFooted?: number | undefined;
  init?: number | undefined;
  bab?: number | undefined;
  grapple?: number | undefined;
  saves: { fort?: number | undefined; ref?: number | undefined; will?: number | undefined };
  speed?: string | undefined;
  featTokens: string[];
  skills: { name: string; ranks: number; total: number | undefined }[];
  /** Zeilen, die keiner Fertigkeit zuzuordnen waren — gehen nie stillschweigend verloren. */
  unparsedSkills: string[];
  actions: FightClubAction[];
  /**
   * Der ECHTE Platz am Körper, je Gegenstandsname — nur im vollständigen Export.
   *
   * Im Statblock-Export gibt es ihn nicht, deshalb rät der Importer dort: erste
   * Waffe in die Hand, Rest in den Rucksack. Wo die Datei es weiß, hat Raten
   * nichts zu suchen — dann steht die Rüstung als Rüstung da und der Schild in der
   * Schildhand, so wie Philipp es in Fight Club eingestellt hat.
   */
  slotByName?: Record<string, EquipSlot> | undefined;
}

// ---------------------------------------------------------------------------
// XML-Extraktion — tolerant und DOM-frei (läuft im Browser, in Node und in Tests)
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

function blocks(xml: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi");
  return [...xml.matchAll(pattern)].map((m) => m[1] ?? "");
}

function tagText(block: string, tag: string): string | undefined {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const match = pattern.exec(block);
  if (!match) return undefined;
  const text = decodeEntities(match[1] ?? "").trim();
  return text === "" ? undefined : text;
}

function tagNumber(block: string, tag: string): number | undefined {
  const text = tagText(block, tag);
  if (text === undefined) return undefined;
  const match = /[+-]?\d+/.exec(text);
  return match ? Number(match[0]) : undefined;
}

/**
 * Trennt eine Komma-Liste, ohne Kommas INNERHALB von Klammern zu zerreißen:
 * „Weapon Focus (Sword, short), Dodge" → 2 Einträge, nicht 3.
 */
function splitList(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of list) {
    if (char === "(" || char === "[") depth++;
    else if (char === ")" || char === "]") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      out.push(current);
      current = "";
    } else current += char;
  }
  out.push(current);
  return out.map((entry) => entry.trim()).filter((entry) => entry !== "");
}

/**
 * Zerlegt „Bluff (1) +1" — Skill-Namen dürfen selbst Klammern enthalten.
 * Fight Club lässt die Rangangabe weg, wenn keine Ränge investiert sind
 * („Listen +11"); solche Zeilen dürfen NICHT verloren gehen.
 */
function parseSkillToken(token: string): { name: string; ranks: number; total: number | undefined } | null {
  const trimmed = token.trim();
  const withRanks = /^(.+?)\s*\((\d+(?:[.,]\d+)?)\)\s*([+-]\s*\d+)?$/.exec(trimmed);
  if (withRanks) {
    const totalText = withRanks[3]?.replace(/\s+/g, "");
    return {
      name: (withRanks[1] ?? "").trim(),
      ranks: Number((withRanks[2] ?? "0").replace(",", ".")),
      total: totalText ? Number(totalText) : undefined,
    };
  }
  const withoutRanks = /^(.+?)\s*([+-]\s*\d+)$/.exec(trimmed);
  if (withoutRanks) {
    return {
      name: (withoutRanks[1] ?? "").trim(),
      ranks: 0,
      total: Number((withoutRanks[2] ?? "0").replace(/\s+/g, "")),
    };
  }
  return null;
}

export function parseFightClubXml(xml: string): { pcs: FightClubPc[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const version = /<characters(?:\s[^>]*)?\sversion="([^"]*)"/i.exec(xml)?.[1];
  if (version !== undefined && version !== "3") {
    issues.push({
      severity: "info",
      code: "fc-version",
      message: `Datei meldet Fight-Club-Version „${version}" — erwartet wird 3 (3.5-Edition). Import wird versucht.`,
    });
  }

  // Fight Club GM exportiert Spieler- und NSC-Blöcke.
  const pcBlocks = [...blocks(xml, "pc"), ...blocks(xml, "npc")];
  if (pcBlocks.length === 0) {
    issues.push({
      severity: "error",
      code: "fc-no-characters",
      message: "Keine <pc>- oder <npc>-Einträge in der Datei gefunden.",
    });
    return { pcs: [], issues };
  }

  const pcs = pcBlocks.map((block): FightClubPc => {
    // Aktionen zuerst herausnehmen: sie enthalten ein eigenes <name>, das sonst
    // (bei ungewöhnlicher Feld-Reihenfolge) als Charaktername gelesen würde.
    const head = block.replace(/<action(?:\s[^>]*)?>[\s\S]*?<\/action>/gi, "");

    const abilities: Partial<Record<Ability, number>> = {};
    for (const ability of ABILITIES) {
      const value = tagNumber(head, ability);
      if (value !== undefined) abilities[ability] = value;
    }

    // Vorzeichen erlauben: bei sterbenden Charakteren sind die aktuellen TP
    // negativ („-3/62"), und genau diesen Zustand soll der Import erhalten.
    const hpText = tagText(head, "hp");
    const hpMatch = hpText ? /(-?\d+)\s*\/\s*(\d+)/.exec(hpText) : null;
    const hpSingle = hpText && !hpMatch ? /(-?\d+)/.exec(hpText) : null;

    const featTokens = splitList(tagText(head, "feats") ?? "");

    const skillTokens = splitList(tagText(head, "skills") ?? "");
    const skills = skillTokens
      .map(parseSkillToken)
      .filter((s): s is NonNullable<typeof s> => s !== null);
    const unparsedSkills = skillTokens.filter((t) => parseSkillToken(t) === null);

    const actions = blocks(block, "action").map((actionBlock) => ({
      name: tagText(actionBlock, "name") ?? "",
      attack: tagText(actionBlock, "attack"),
      damage: tagText(actionBlock, "damage"),
      critical: tagText(actionBlock, "critical"),
    }));

    return {
      name: tagText(head, "name") ?? "Unbenannt",
      raceClass: tagText(head, "raceClass") ?? "",
      size: tagText(head, "size"),
      abilities,
      hp: hpMatch
        ? { current: Number(hpMatch[1]), max: Number(hpMatch[2]) }
        : hpSingle
          ? { current: Number(hpSingle[1]), max: Number(hpSingle[1]) }
          : undefined,
      ac: tagNumber(head, "ac"),
      touch: tagNumber(head, "touch"),
      flatFooted: tagNumber(head, "flat"),
      init: tagNumber(head, "init"),
      bab: tagNumber(head, "bab"),
      grapple: tagNumber(head, "grapple"),
      saves: {
        fort: tagNumber(head, "fort"),
        ref: tagNumber(head, "ref"),
        will: tagNumber(head, "will"),
      },
      speed: tagText(head, "speed"),
      featTokens,
      skills,
      unparsedSkills,
      actions: actions.filter((a) => a.name !== ""),
    };
  });

  return { pcs, issues };
}

// ---------------------------------------------------------------------------
// Namens-Zuordnung gegen das Kompendium
// ---------------------------------------------------------------------------

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,.'’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface NameIndex {
  /** normalisierter Name → kanonische ID */
  exact: Map<string, string>;
  /** absteigend nach Länge, für Präfix-Zuordnung („Weapon Focus Kurzschwert") */
  byLength: { normalized: string; id: string }[];
}

function buildIndex(compendium: Map<string, Entity>, kind: Entity["kind"]): NameIndex {
  const exact = new Map<string, string>();
  const byLength: { normalized: string; id: string }[] = [];
  for (const [id, entity] of compendium) {
    if (entity.kind !== kind || entity.deletedAt) continue;
    // Overrides liegen unter eigener UND Ziel-ID — nur die kanonische nutzen.
    if (id !== (entity.overrides ?? entity.id)) continue;
    for (const variant of new Set([normalize(entity.name), normalize(displayName(entity))])) {
      if (!exact.has(variant)) exact.set(variant, id);
      byLength.push({ normalized: variant, id });
    }
  }
  byLength.sort((a, b) => b.normalized.length - a.normalized.length);
  return { exact, byLength };
}

/** Exakter Treffer, sonst längster Namens-Präfix; liefert den Restteil mit. */
function matchName(index: NameIndex, raw: string): { id: string; rest: string } | null {
  const needle = normalize(raw);
  const direct = index.exact.get(needle);
  if (direct) return { id: direct, rest: "" };
  for (const candidate of index.byLength) {
    if (needle === candidate.normalized) return { id: candidate.id, rest: "" };
    if (needle.startsWith(`${candidate.normalized} `)) {
      // Restteil aus dem ORIGINAL schneiden, damit die Schreibweise erhalten bleibt.
      const rest = raw.trim().slice(candidate.normalized.length).replace(/^[\s(]+|[\s)]+$/g, "");
      return { id: candidate.id, rest };
    }
  }
  return null;
}

/**
 * „Human Fighter 3/Cleric 4" → Volk + Klassenstufen.
 * Ist das Volk unbekannt (Nicht-SRD-Rasse, Monster-NSC wie „Ogre Barbarian 2"),
 * wird sein Name als `unknownRace` zurückgegeben, damit der Import daraus ein
 * Platzhalter-Volk anlegen kann.
 */
export function parseRaceClass(
  raceClass: string,
  compendium: Map<string, Entity>,
): {
  raceId: string | null;
  unknownRace: string | null;
  classLevels: { classId: string; level: number }[];
  unmatched: string[];
} {
  const raceIndex = buildIndex(compendium, "race");
  const classIndex = buildIndex(compendium, "class");
  const unmatched: string[] = [];

  let rest = raceClass.trim();
  let raceId: string | null = null;
  // Längster Rassenname am Anfang der Zeile.
  for (const candidate of raceIndex.byLength) {
    if (normalize(rest) === candidate.normalized) {
      raceId = candidate.id;
      rest = "";
      break;
    }
    if (normalize(rest).startsWith(`${candidate.normalized} `)) {
      raceId = candidate.id;
      rest = rest.slice(candidate.normalized.length).trim();
      break;
    }
  }

  const classLevels: { classId: string; level: number }[] = [];
  let unknownRace: string | null = null;
  const segments = rest.split("/");
  segments.forEach((part, index) => {
    const token = part.trim();
    if (token === "") return;
    const match = /^(.*?)\s+(\d+)$/.exec(token);
    const namePart = (match?.[1] ?? token).trim();
    const level = match ? Number(match[2]) : 1;

    const direct = matchName(classIndex, namePart);
    if (direct && direct.rest === "") {
      classLevels.push({ classId: direct.id, level });
      return;
    }

    // Unbekanntes Volk klebt am ersten Segment („Ogre Barbarian 2"): den
    // Klassennamen von rechts wachsen lassen, der Vorlauf ist der Volksname.
    if (raceId === null && index === 0) {
      const words = namePart.split(/\s+/);
      for (let start = 1; start < words.length; start++) {
        const candidate = matchName(classIndex, words.slice(start).join(" "));
        if (candidate && candidate.rest === "") {
          unknownRace = words.slice(0, start).join(" ");
          classLevels.push({ classId: candidate.id, level });
          return;
        }
      }
    }
    unmatched.push(token);
  });

  return { raceId, unknownRace, classLevels, unmatched };
}

const FC_SIZE_MAP: Record<string, Size> = {
  F: "fine",
  D: "diminutive",
  T: "tiny",
  S: "small",
  M: "medium",
  L: "large",
  H: "huge",
  G: "gargantuan",
  C: "colossal",
};

/**
 * Platzhalter-Volk für Nicht-SRD-Rassen: übernimmt Größe und Bewegung aus dem
 * Export, aber KEINE Attributsmodifikatoren — die stecken schon in den
 * exportierten Endwerten. Wird als normales Homebrew-Volk gespeichert und ist
 * damit später editierbar.
 */
function buildPlaceholderRace(name: string, pc: FightClubPc, id: string): Entity {
  const speed = pc.speed ? /(\d+)/.exec(pc.speed)?.[1] : undefined;
  return {
    id,
    kind: "race",
    name,
    source: "homebrew",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    rev: 1,
    updatedAt: "",
    tags: ["import", "platzhalter"],
    description:
      `Platzhalter aus dem Fight-Club-Import („${pc.raceClass}"). Attributsmodifikatoren sind ` +
      "bewusst leer, weil sie in den importierten Attributswerten bereits enthalten sind. " +
      "Trage Volksmerkmale hier nach, sobald du sie brauchst.",
    effects: [],
    data: {
      size: (pc.size ? FC_SIZE_MAP[pc.size.trim().toUpperCase()] : undefined) ?? "medium",
      speedFt: speed ? Number(speed) : 30,
      abilityMods: {},
      favoredClassId: "any",
      traits: [],
      la: 0,
    },
  };
}

/** Name → ID-Bestandteil („Templer Schwert" → „templer-schwert"). */
function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "waffe"
  );
}

/**
 * Waffe aus einer Aktionszeile als Homebrew-Gegenstand — für eigene Namen
 * („Templer Schwert"), die im SRD nicht stehen. Ohne das läge die Waffe nur als
 * Notiz im Rucksack und tauchte im Kampf-Reiter gar nicht auf.
 *
 * Der Griff (ein-/zweihändig) lässt sich aus dem Export nicht ablesen; wir
 * nehmen einhändig an, weil der Schadensbonus dann nicht zu hoch ausfällt, und
 * sagen es in der Beschreibung.
 */
/**
 * Wohin gehört ein importierter Gegenstand?
 *
 * Die FC-Datei sagt es nicht — sie listet Angriffszeilen, keine Hände. Genommen
 * wird deshalb der erste Platz, der für die Art überhaupt in Frage kommt: Waffe
 * in die Haupthand, Rüstung an den Körper, Schild in die Schildhand. Das ist eine
 * ANNAHME, aber eine, die man mit einem Tap ändert — und sie ist besser als
 * „irgendwie angelegt", weil daran die Führungsart und damit Power Attack hängt.
 */
function importSlot(entity: Entity | undefined): EquipSlot {
  if (entity === undefined || entity.kind !== "item") return "worn";
  return allowedSlots(entity)[0] ?? "worn";
}

function buildHomebrewWeapon(action: FightClubAction, id: string): Entity {
  const critical = action.critical ?? "";
  const rangeMatch = /^(\d+)(?:\s*[-–]\s*(\d+))?/.exec(critical);
  const multMatch = /x\s*(\d+)/i.exec(critical);
  const low = rangeMatch?.[1];
  // Fight Club schreibt „19/x2" für 19–20; eine einzelne Zahl unter 20 ist die
  // untere Grenze des Bereichs, nicht der einzige Wert.
  const critRange =
    low === undefined
      ? "20"
      : rangeMatch?.[2] !== undefined
        ? `${low}-${rangeMatch[2]}`
        : Number(low) < 20
          ? `${low}-20`
          : "20";
  /*
    Über `buildHomebrewItem`, nicht als Objektliteral. Vorher stand hier eine
    handgeschriebene Entity mit `schemaVersion`, `rev`, `updatedAt`, `tags`,
    `critRange`, `critMult`, `category` und `handedness` von Hand — genau die
    Bauform, die in CLAUDE.md als Fehlerfamilie steht. Als `weapon.strDamage`
    ins Schema kam, hätte dieses Literal es still nicht mitbekommen.
  */
  return buildHomebrewItem({
    id,
    name: action.name,
    kind: "weapon",
    tags: ["import", "waffe"],
    description:
      `Aus dem Fight-Club-Import („${action.name}"). Schaden und Kritischer Treffer stehen ` +
      "so im Export; als einhändige Kriegswaffe angenommen, weil der Export das nicht " +
      `verrät.${action.attack ? ` Angriffsbonus im Original: ${action.attack}.` : ""} ` +
      "Gewicht, Preis und Schadensart kannst du nachtragen.",
    weapon: {
      // Der Export nennt den Schaden inklusive Attributsbonus („1d6+2"); die
      // App rechnet den selbst dazu, also bleibt hier nur der Würfel.
      damage: /^\s*(\d+d\d+|\d+)/.exec(action.damage ?? "")?.[1] ?? "1d6",
      critRange,
      critMult: multMatch ? `x${multMatch[1]}` : "x2",
      category: "martial",
      handedness: "one",
    },
  });
}

/**
 * Deutsche Waffennamen, wie sie die Gruppe in Talent-Auswahlen schreibt, auf
 * SRD-Slugs. Nur dadurch wirkt „Weapon Focus (Kurzschwert)" auf das Kurzschwert
 * — der Auswahltext allein passt zu keinem englischen Eintrag.
 */
const GERMAN_WEAPON_ALIASES: Record<string, string> = {
  kurzschwert: "sword-short",
  langschwert: "longsword",
  breitschwert: "longsword",
  zweihänder: "greatsword",
  zweihandschwert: "greatsword",
  bastardschwert: "bastard-sword",
  dolch: "dagger",
  streitkolben: "mace-heavy",
  morgenstern: "morningstar",
  kriegshammer: "warhammer",
  handaxt: "handaxe",
  streitaxt: "battleaxe",
  großaxt: "greataxe",
  speer: "shortspear",
  langspeer: "longspear",
  hellebarde: "halberd",
  stab: "quarterstaff",
  keule: "club",
  sichel: "sickle",
  rapier: "rapier",
  krummsäbel: "scimitar",
  kurzbogen: "shortbow",
  langbogen: "longbow",
  armbrust: "crossbow-light",
  schwerearmbrust: "crossbow-heavy",
  peitsche: "whip",
  kettenhemd: "chain-shirt",
};

// ---------------------------------------------------------------------------
// Abbildung auf einen Charakter
// ---------------------------------------------------------------------------

export interface ImportComparison {
  label: string;
  imported: number;
  derived: number;
  /** true = absoluter Wert (RK), false = Modifikator (Saves, BAB, …). */
  absolute?: boolean | undefined;
  /**
   * `match` – App rechnet denselben Wert (Vertrauensbeweis),
   * `reconciled` – Differenz per sichtbarem Modifikator angeglichen,
   * `reported` – Differenz bleibt bestehen und wird nur erklärt.
   */
  status: "match" | "reconciled" | "reported";
  hint?: string | undefined;
}

export interface ImportResultPc {
  character: Character;
  /** Beim Import erzeugte Homebrew-Einträge (z.B. Platzhalter-Völker). */
  entities: Entity[];
  issues: ImportIssue[];
  comparisons: ImportComparison[];
}

/**
 * Baut aus einem Fight-Club-Eintrag einen Charakter. `idFactory` und
 * `houseRules` werden injiziert, damit die Funktion pur und testbar bleibt.
 */
export function mapFightClubPc(
  pc: FightClubPc,
  compendium: Map<string, Entity>,
  options: { idFactory: () => string; houseRules?: HouseRules },
): ImportResultPc {
  const issues: ImportIssue[] = [];
  const { idFactory } = options;

  const { raceId, unknownRace, classLevels, unmatched } = parseRaceClass(pc.raceClass, compendium);
  const entities: Entity[] = [];
  let effectiveRaceId = raceId;

  if (raceId === null && unknownRace !== null) {
    // Kein SRD-Volk, aber der Name ist erkennbar → Platzhalter-Volk anlegen,
    // damit der Bogen vollständig rechnet und später editierbar bleibt.
    const placeholderId = idFactory();
    entities.push(buildPlaceholderRace(unknownRace, pc, placeholderId));
    effectiveRaceId = placeholderId;
    issues.push({
      severity: "info",
      code: "race-placeholder",
      message: `„${unknownRace}" ist kein SRD-Volk — als Homebrew-Platzhalter angelegt (Größe und Bewegung aus dem Export übernommen, Volksmerkmale kannst du später nachtragen).`,
    });
  } else if (raceId === null) {
    issues.push({
      severity: "error",
      code: "race-unmatched",
      message: `Volk aus „${pc.raceClass}" nicht erkannt — der Bogen rechnet ohne Volksboni.`,
    });
  }
  for (const token of unmatched) {
    issues.push({
      severity: "error",
      code: "class-unmatched",
      message: `Klasse „${token}" nicht im Kompendium gefunden — diese Stufen fehlen im Bogen.`,
    });
  }
  if (classLevels.length === 0) {
    issues.push({
      severity: "error",
      code: "no-classes",
      message: "Keine Klassenstufen erkannt — Stufe, BAB und Rettungswürfe bleiben leer.",
    });
  }

  // Attribute: der Export nennt ENDWERTE, unser Modell speichert Basiswerte.
  const race = raceId ? compendium.get(raceId) : undefined;  // Platzhalter: keine Mods
  const racialMods = race?.kind === "race" ? race.data.abilityMods : {};
  const base: Record<Ability, number> = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  for (const ability of ABILITIES) {
    const final = pc.abilities[ability];
    if (final === undefined) {
      issues.push({
        severity: "warning",
        code: "ability-missing",
        message: `Attribut ${ability.toUpperCase()} fehlt im Export — auf 10 gesetzt.`,
      });
      continue;
    }
    base[ability] = final - (racialMods[ability] ?? 0);
  }

  const levels = classLevels.flatMap(({ classId, level }) =>
    Array.from({ length: level }, () => ({ classId, hpRoll: "avg" as const })),
  );

  // Talente: „Weapon Focus Kurzschwert" → Talent + Auswahl.
  const featIndex = buildIndex(compendium, "feat");
  const feats: Character["feats"] = [];
  for (const token of pc.featTokens) {
    const hit = matchName(featIndex, token);
    if (!hit) {
      issues.push({
        severity: "warning",
        code: "feat-unmatched",
        message: `Talent „${token}" nicht im Kompendium — als Notiz übernommen.`,
      });
      continue;
    }
    feats.push(
      hit.rest === ""
        ? { featId: hit.id, extraEffects: [] }
        : { featId: hit.id, choice: hit.rest, extraEffects: [] },
    );
  }
  const unmatchedFeats = pc.featTokens.filter((t) => matchName(featIndex, t) === null);

  // Fertigkeitsränge.
  const skillIndex = buildIndex(compendium, "skill");
  const skillRanks: Record<string, number> = {};
  const skillSubtypes: Character["skillSubtypes"] = [];
  const skillTotals = new Map<string, number>();
  /** Wie viele Export-Zeilen auf denselben Rang-Schlüssel fielen. */
  const skillSources = new Map<string, number>();
  for (const entry of pc.skills) {
    const hit = matchName(skillIndex, entry.name);
    if (!hit) {
      issues.push({
        severity: "warning",
        code: "skill-unmatched",
        message: `Fertigkeit „${entry.name}" nicht im Kompendium — Ränge nicht übernommen.`,
      });
      continue;
    }
    const entity = compendium.get(hit.id);
    const subtyped = entity?.kind === "skill" && entity.data.subtyped;
    // „Knowledge (Religion)" → Teilgebiet in SRD-Schreibweise, damit die
    // Synergien greifen; unbekannte Teilgebiete bleiben wie exportiert.
    let subtype: string | undefined;
    if (subtyped && hit.rest !== "") {
      const suggestions = entity.kind === "skill" ? entity.data.subtypeSuggestions : [];
      subtype =
        suggestions.find((s) => s.toLowerCase() === hit.rest.toLowerCase()) ?? hit.rest;
      if (!skillSubtypes.some((s) => s.skillId === hit.id && s.subtype === subtype)) {
        skillSubtypes.push({ skillId: hit.id, subtype });
      }
    }
    const key = skillKey(hit.id, subtype);
    const previous = skillRanks[key];
    if (hit.rest !== "" && !subtyped) {
      issues.push({
        severity: "info",
        code: "skill-subtype",
        message:
          previous === undefined
            ? `„${entry.name}": diese Fertigkeit kennt keine Teilgebiete — die Ränge liegen auf der Grundfertigkeit.`
            : `„${entry.name}" trifft auf dieselbe Fertigkeit wie ein anderes Teilgebiet — es gilt der höchste Rangwert (${Math.max(previous, entry.ranks)}), alle Originalwerte stehen in den Notizen.`,
      });
    }
    // Teilgebiete NICHT summieren: 8 Ränge Knowledge (Arkana) + 5 Ränge
    // Knowledge (Religion) sind regeltechnisch zwei Fertigkeiten, niemals 13
    // Ränge auf einer. Fallen zwei Zeilen doch auf denselben Schlüssel (Skill
    // ohne Teilgebiete), gilt das Maximum — es sprengt das Rangmaximum nicht.
    skillRanks[key] = Math.max(previous ?? 0, entry.ranks);
    skillSources.set(key, (skillSources.get(key) ?? 0) + 1);
    if (entry.total !== undefined && (previous === undefined || entry.ranks >= previous)) {
      skillTotals.set(key, entry.total);
    }
  }
  for (const token of pc.unparsedSkills) {
    issues.push({
      severity: "warning",
      code: "skill-unparsed",
      message: `Fertigkeitszeile „${token}" war nicht lesbar — bitte im Bogen nachtragen.`,
    });
  }

  /*
    Waffen aus den Aktionszeilen ins Inventar.

    Fight Clubs <action>-Zeilen sind ANGRIFFE, die der Charakter machen kann —
    nicht das, was er gerade in der Hand hält. Wer sie alle als „angelegt"
    übernimmt, bekommt genau das, was Philipp auf seinem Bogen gesehen hat:
    Kurzschwert, Templer Schwert und Dolch alle mit der Marke 1H, dazu ein
    Zweihänder — vier Waffen in zwei Händen, und vier Angriffszeilen.

    Deshalb: die ERSTE Waffe in die Haupthand, alles Weitere in den Rucksack. Ein
    Tap auf die Marke rückt eine Waffe in die Hand, wenn sie dort hingehört.
  */
  const itemIndex = buildIndex(compendium, "item");
  const stowedByCapacity: string[] = [];
  let handTaken = false;
  const inventory: Character["inventory"] = pc.actions.map((action) => {
    const hit = matchName(itemIndex, action.name);
    const entity = hit && hit.rest === "" ? compendium.get(hit.id) : undefined;
    const place = (item: Entity | undefined, label: string): EquipSlot => {
      // Steht der Platz in der Datei, wird nicht geraten.
      const known = pc.slotByName?.[label];
      if (known !== undefined) return known;
      if (handTaken) {
        stowedByCapacity.push(label);
        return "none";
      }
      const slot = importSlot(item);
      // Nur Hände sind knapp; Ringe und Amulette („worn") stören einander nicht.
      if (slot !== "worn") handTaken = true;
      return slot;
    };
    if (hit && hit.rest === "") {
      return {
        id: idFactory(),
        itemId: hit.id,
        qty: 1,
        slot: place(entity, action.name),
        extraEffects: [],
      };
    }
    // Eigene Namen („Templer Schwert") werden zu Homebrew-Waffen, damit sie im
    // Kampf-Reiter als Angriff auftauchen und nicht bloß als Notiz im Rucksack.
    const weapon = buildHomebrewWeapon(action, `homebrew:item:${slugifyName(action.name)}`);
    entities.push(weapon);
    return {
      id: idFactory(),
      itemId: weapon.id,
      qty: 1,
      slot: place(weapon, action.name),
      extraEffects: [],
    };
  });
  if (stowedByCapacity.length > 0) {
    issues.push({
      severity: "info",
      code: "weapons-stowed",
      message:
        `Im Rucksack statt in der Hand: ${stowedByCapacity.join(", ")}. ` +
        `Fight Club listet alle möglichen Angriffe; zwei Hände hat der Charakter trotzdem nur. ` +
        `Ein Tap auf die Marke links nimmt eine Waffe in die Hand.`,
    });
  }
  /*
    Talent-Auswahlen auf Gegenstände verweisen — erst jetzt, weil die
    Homebrew-Waffen aus den Aktionszeilen dazugehören. Ohne diesen Verweis
    wirkt „Weapon Focus (Kurzschwert)" nicht: der deutsche Auswahltext passt zu
    keinem englischen SRD-Namen.
  */
  const inventoryItems = inventory
    .map((row) => (row.itemId !== undefined ? compendium.get(row.itemId) ?? entities.find((e) => e.id === row.itemId) : undefined))
    .filter((e): e is Entity => e !== undefined && e.kind === "item");
  for (const feat of feats) {
    if (feat.choice === undefined) continue;
    const wanted = normalize(feat.choice);
    const alias = GERMAN_WEAPON_ALIASES[wanted.replace(/\s+/g, "")];
    const candidates = [
      alias !== undefined ? `srd:item:${alias}` : undefined,
      ...inventoryItems.filter((e) => normalize(e.name) === wanted).map((e) => e.id),
      matchName(itemIndex, feat.choice)?.id,
    ].filter((id): id is string => id !== undefined);
    const resolved = candidates.find(
      (id) => compendium.has(id) || entities.some((e) => e.id === id),
    );
    if (resolved !== undefined) {
      feat.choiceRef = resolved;
      continue;
    }
    // Nur melden, wenn dadurch wirklich ein Bonus liegen bleibt.
    const entity = compendium.get(feat.featId);
    const losesBonus =
      entity?.kind === "feat" && entity.effects.some((e) => e.scope === "chosenItem");
    if (losesBonus) {
      const featName = entity ? displayName(entity) : feat.featId;
      issues.push({
        severity: "warning",
        code: "feat-choice-unresolved",
        message: `${featName} („${feat.choice}"): keine Waffe dieses Namens gefunden — der Bonus wirkt erst, wenn du die Waffe im Bogen zuordnest.`,
      });
    }
  }

  for (const action of pc.actions) {
    const hit = matchName(itemIndex, action.name);
    if (!hit || hit.rest !== "") {
      issues.push({
        severity: "info",
        code: "item-unmatched",
        message: `Waffe „${action.name}" steht nicht im SRD — als Homebrew-Waffe angelegt (Schaden und Kritischer Treffer aus dem Export, einhändig angenommen).`,
      });
    }
  }

  // Herkunft als eigener, aufklappbarer Notiz-Abschnitt statt als Textwand.
  const noteSections: Character["noteSections"] = [
    {
      id: idFactory(),
      title: "Aus Fight Club importiert",
      body: [
        `Original: ${pc.raceClass}${pc.speed ? ` · ${pc.speed}` : ""}`,
        ...(pc.skills.length > 0
          ? [
              "",
              "Fertigkeiten im Original:",
              ...pc.skills.map(
                (s) =>
                  `  ${s.name} (${s.ranks})${s.total !== undefined ? ` ${s.total >= 0 ? "+" : ""}${s.total}` : ""}`,
              ),
            ]
          : []),
        ...(unmatchedFeats.length > 0
          ? ["", `Nicht zugeordnete Talente: ${unmatchedFeats.join(", ")}`]
          : []),
        ...(pc.actions.some((a) => a.attack || a.damage)
          ? [
              "",
              "Angriffe im Original:",
              ...pc.actions
                .filter((a) => a.attack || a.damage)
                .map(
                  (a) =>
                    `  ${a.name}: ${a.attack ?? ""} ${a.damage ?? ""}${a.critical ? ` (${a.critical})` : ""}`.trim(),
                ),
            ]
          : []),
      ].join("\n"),
    },
  ];

  let character = characterSchema.parse({
    id: idFactory(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    rev: 1,
    updatedAt: "",
    name: pc.name,
    raceId: effectiveRaceId ?? "",
    abilities: { method: "rolled", base, levelUps: [] },
    levels,
    skillRanks,
    skillSubtypes,
    feats,
    inventory,
    hp: pc.hp
      ? { damage: Math.max(0, pc.hp.max - pc.hp.current), nonlethal: 0, temp: 0, overrideMax: pc.hp.max }
      : { damage: 0, nonlethal: 0, temp: 0 },
    noteSections,
    notes: "",
  });

  // --- Abgleich: RK und Rettungswürfe ausgleichen, alles andere berichten ---
  const sheet = deriveSheet(character, compendium, options.houseRules);
  const comparisons: ImportComparison[] = [];
  const miscModifiers: Character["miscModifiers"] = [];

  /**
   * Ausgleich NUR wenn Volk und Klassen sauber zugeordnet wurden. Sonst wäre
   * die Differenz keine fehlende Ausrüstung, sondern die fehlende halbe Klasse —
   * ein Modifikator würde den Fehler zudecken statt ihn zu zeigen.
   */
  const mappingBroken = issues.some((i) => i.severity === "error");

  const reconcile = (
    label: string,
    imported: number | undefined,
    derived: number,
    target: "save.fort" | "save.ref" | "save.will",
  ) => {
    if (imported === undefined) return;
    const delta = imported - derived;
    if (delta === 0) {
      comparisons.push({ label, imported, derived, status: "match" });
      return;
    }
    if (mappingBroken) {
      comparisons.push({
        label,
        imported,
        derived,
        status: "reported",
        hint: "Kein Ausgleich, solange Volk oder Klassen nicht zugeordnet sind.",
      });
      return;
    }
    comparisons.push({
      label,
      imported,
      derived,
      status: "reconciled",
      hint: `Ausrüstung steckt nicht im Export — als „Sonstiges"-Modifikator eingetragen und jederzeit löschbar.`,
    });
    miscModifiers.push({
      id: idFactory(),
      target,
      // `resistance` wird später von einem echten Resistenz-Umhang überdeckt
      // statt addiert (3.5-Stacking).
      bonusType: "resistance",
      value: delta,
      note: "Fight-Club-Import (fehlende Ausrüstung)",
    });
  };

  /**
   * Die RK wird über die Berührungs-RK aufgeteilt: was auch gegen Berührung
   * zählt (Ablenkung, Klassenboni wie beim Mönch), kommt als `deflection`, der
   * Rest als `armor`. So stimmen RK UND Berührungs-RK — und echte Rüstung
   * überdeckt den Platzhalter später, statt sich zu addieren.
   */
  if (pc.ac !== undefined) {
    const acDelta = pc.ac - sheet.ac.total.total;
    if (acDelta === 0) {
      comparisons.push({ label: "RK", imported: pc.ac, derived: sheet.ac.total.total, status: "match", absolute: true });
    } else if (mappingBroken) {
      comparisons.push({
        label: "RK",
        imported: pc.ac,
        derived: sheet.ac.total.total,
        status: "reported",
        absolute: true,
        hint: "Kein Ausgleich, solange Volk oder Klassen nicht zugeordnet sind.",
      });
    } else {
      const touchDelta =
        pc.touch !== undefined ? Math.max(0, Math.min(acDelta, pc.touch - sheet.ac.touch.total)) : 0;
      const armorDelta = acDelta - touchDelta;
      comparisons.push({
        label: "RK",
        imported: pc.ac,
        derived: sheet.ac.total.total,
        status: "reconciled",
        absolute: true,
        hint: `Ausrüstung steckt nicht im Export — als „Sonstiges"-Modifikator eingetragen und jederzeit löschbar.`,
      });
      if (armorDelta !== 0) {
        miscModifiers.push({
          id: idFactory(),
          target: "ac",
          bonusType: "armor",
          value: armorDelta,
          note: "Fight-Club-Import (Rüstung/Schild)",
        });
      }
      if (touchDelta !== 0) {
        miscModifiers.push({
          id: idFactory(),
          target: "ac",
          bonusType: "deflection",
          value: touchDelta,
          note: "Fight-Club-Import (gilt auch gegen Berührung)",
        });
      }
    }
  }
  reconcile("Fortitude", pc.saves.fort, sheet.saves.fort.total, "save.fort");
  reconcile("Reflex", pc.saves.ref, sheet.saves.ref.total, "save.ref");
  reconcile("Will", pc.saves.will, sheet.saves.will.total, "save.will");

  const report = (
    label: string,
    imported: number | undefined,
    derived: number,
    opts: { always?: boolean; hint?: string } = {},
  ) => {
    if (imported === undefined) return;
    if (imported === derived) {
      if (opts.always) comparisons.push({ label, imported, derived, status: "match" });
      return;
    }
    comparisons.push({ label, imported, derived, status: "reported", hint: opts.hint });
  };

  // Aus den Klassentabellen abgeleitet — hier wäre ein Ausgleich Selbstbetrug.
  report("BAB", pc.bab, sheet.bab, { always: true });
  report("Ringkampf", pc.grapple, sheet.grapple.total, { always: true });
  report("Initiative", pc.init, sheet.init.total, {
    always: true,
    hint: `Die App zählt Talent-Boni wie „Improved Initiative" mit; Fight Club listet hier oft nur den DEX-Modifikator.`,
  });
  for (const [key, total] of skillTotals) {
    // Fielen zwei Export-Zeilen doch auf denselben Schlüssel, ist der Wert
    // nicht vergleichbar — es gilt dann nur der höchste Rang.
    if ((skillSources.get(key) ?? 1) > 1) continue;
    const line = sheet.skills.find((s) => s.key === key);
    if (line) report(line.name, total, line.total.total);
  }

  if (pc.flatFooted !== undefined) {
    issues.push({
      severity: "info",
      code: "ac-flatfooted",
      message: `RK auf dem falschen Fuß im Original: ${pc.flatFooted}. Die App rechnet sie selbst aus (Fight Club zählt dort teils situative Boni wie Ausweichen mit, die wir bewusst nur situativ führen).`,
    });
  }

  if (miscModifiers.length > 0) {
    character = { ...character, miscModifiers };
  }
  if (pc.hp) {
    issues.push({
      severity: "info",
      code: "hp-override",
      message: `TP aus dem Export übernommen (${pc.hp.current}/${pc.hp.max}) — als festes Maximum gesetzt, im Bogen änderbar.`,
    });
  }

  return { character, entities, issues, comparisons };
}

/** Komfort: komplette Datei → Charaktere mit Bericht. */
export function importFightClubXml(
  xml: string,
  compendium: Map<string, Entity>,
  options: { idFactory: () => string; houseRules?: HouseRules },
): { results: ImportResultPc[]; issues: ImportIssue[] } {
  /*
    Fight Club exportiert auf ZWEI Wege, und beide sehen von außen gleich aus
    („eine XML-Datei aus Fight Club"). Der Unterschied ist trotzdem der ganze
    Charakter: der Statblock liefert fertige Zahlen ohne Ausrüstung, der
    vollständige Export den ganzen Bogen mit Rüstung, Geld, Zählern und Notizen.

    Ohne diese Weiche lief der vollständige Export durch den Statblock-Leser und
    ergab einen fast leeren Charakter — nur der Name kam an, weil `<name>` in
    beiden Formaten so heißt. Ein Import, der stillschweigend fast nichts
    übernimmt, ist schlimmer als einer, der sich weigert.
  */
  if (isFullFightClubExport(xml)) {
    const { pcs, issues } = parseFullFightClubXml(xml);
    const results = pcs.map((pc) =>
      applyFullExtras(mapFightClubPc(pc, compendium, options), pc, compendium, options.idFactory),
    );
    return { results, issues };
  }

  const { pcs, issues } = parseFightClubXml(xml);
  const results = pcs.map((pc) => mapFightClubPc(pc, compendium, options));
  return { results, issues };
}
