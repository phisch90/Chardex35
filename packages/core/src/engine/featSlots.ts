import { warDomainGrant } from "../compendium/deity.js";
import { fighterBonusVerdict } from "../compendium/fighterBonus.js";
import { displayName } from "../schema/entities.js";
import type { Character } from "../schema/character.js";
import type { ResolvedCharacter, TimelineResult } from "./internal.js";
import { baseFeatSlots } from "./tables.js";

/**
 * WOHER die Talentplätze dieses Bogens kommen — Platz für Platz.
 *
 * Sein Auftrag: „man kann doch jetzt mal den Charakter zurückgehen und sehen,
 * okay, drei Fighter, Mensch und vier Kleriker. Da raus kann man doch herleiten,
 * wie viele Talente ich habe … Und in der Zukunft, jedes Mal, wenn man ein neues
 * Talent auswählt, dann steht drin, dass es vom Level-up zu Klasse Rang x y
 * kommt oder was anderes als Quelle hat."
 *
 * Er hat recht, und es ist genau die Trennung dieses Projekts: die LISTE der
 * Plätze ist eine FOLGE aus Volk, Klassen und Stufen — gerechnet, nie
 * gespeichert. Gespeichert wird nur, WELCHER Platz zu welchem Talent gehört
 * (`feats[].origin`), und das ist eine Eingabe: die App kann seine Spielhistorie
 * nicht kennen.
 *
 * Damit fällt nebenbei das Freitextfeld weg, in das man „Stufe 47" tippen
 * konnte. Wo die App die Möglichkeiten KENNT, gehört jede einzelne als Knopf hin
 * — dieselbe Regel wie bei den Fertigkeits-Teilgebieten und der Waffenwahl.
 */
export type FeatSlotKind = "level" | "race" | "class" | "granted" | "other";

export interface FeatSlotSource {
  kind: FeatSlotKind;
  /**
   * Was am Talent steht und im Auswähler auf dem Knopf: „Stufe 3", „Human",
   * „Fighter 2", „War Domain (Dol Arrah)".
   */
  label: string;
  /**
   * Was in `feats[].origin` geschrieben wird, wenn dieser Platz gewählt wird.
   *
   * Genau EINES der beiden Felder ist gesetzt — so bleibt die Anzeige die, die
   * es schon gibt (Quelle gewinnt, sonst „Stufe N"), und das Schema muss sich
   * nicht ändern. Ein Feld, das schon ausgeliefert ist, wird benutzt und nicht
   * umgebaut.
   */
  origin: NonNullable<Character["feats"][number]["origin"]>;
  /**
   * Auf welcher CHARAKTERSTUFE dieser Platz entsteht.
   *
   * Nötig, weil die Reihenfolge der Liste nicht die zeitliche ist: „Stufe 1 · Stufe 3 ·
   * Stufe 6 · Human · Fighter 1 · Fighter 2" — das Bonustalent des Menschen und der
   * erste Kämpfer-Platz entstehen beide auf Stufe 1. Ohne diese Zahl ist „vorher" nicht
   * entscheidbar, und genau das braucht die Prüfung, ob ein Talent seinen Vorgänger
   * schon haben KONNTE.
   */
  charLevel: number;
  /** Bei `kind: "class"`: welche Klasse den Platz gibt — für die Bonustalent-Liste. */
  classId?: string;
}

/**
 * Erkennt einen Platz und eine eingetragene Herkunft als dasselbe.
 *
 * Exportiert, weil die Anzeige es auch braucht (welcher Knopf ist der aktive,
 * welcher Platz ist von einem anderen Talent belegt). Ein zweiter Vergleich in
 * der Oberfläche wären zwei Wahrheiten darüber, was „derselbe Platz" heißt — und
 * dann leuchtet ein Knopf, der nicht gemeint ist.
 */
export function sameOrigin(
  a: Character["feats"][number]["origin"],
  b: Character["feats"][number]["origin"],
): boolean {
  return (a?.level ?? null) === (b?.level ?? null) && (a?.source ?? "") === (b?.source ?? "");
}

/**
 * Die Plätze in der Reihenfolge, in der sie im Spiel entstehen.
 *
 * `totalAvailable` ist die Zahl, die `deriveSheetValues` ohnehin rechnet
 * (`baseFeatSlots` + alle `feats.slots`-Effekte + der gewährte). Sie kommt
 * herein, damit die Liste nie WENIGER hergibt als die Zahl: gewährt irgendwann
 * ein Gegenstand oder ein Talent einen Platz, taucht er hier als „andere
 * Quelle" auf, statt still zu fehlen. Zwei Zählungen, die auseinanderlaufen,
 * wären genau der Fehler, den diese App überall vermeidet — der Test hält
 * deshalb `available === sources.length` fest.
 */
export function featSlotSources(
  resolved: ResolvedCharacter,
  timeline: TimelineResult,
  totalAvailable: number,
): FeatSlotSource[] {
  const { character, race } = resolved;
  const sources: FeatSlotSource[] = [];

  /*
    1. Die Plätze aus der CHARAKTERSTUFE: der erste auf Stufe 1, dann jeder
       dritte (PHB S. 87). Abgeleitet aus `baseFeatSlots` und nicht aus einer
       zweiten Formel — sonst stünde die Regel zweimal da.
  */
  for (let level = 1; level <= timeline.totalLevel; level++) {
    if (baseFeatSlots(level) > baseFeatSlots(level - 1)) {
      sources.push({ kind: "level", label: `Stufe ${level}`, origin: { level }, charLevel: level });
    }
  }

  /*
    2. Das Bonustalent des VOLKES (Mensch). Gelesen wird der Effekt und nicht der
       Name: ein eigenes Volk aus seinen Büchern zählt damit von allein mit.
  */
  if (race !== null) {
    const fromRace =
      race.effects.filter((e) => e.target === "feats.slots").length +
      race.data.traits.reduce(
        (n, trait) => n + trait.effects.filter((e) => e.target === "feats.slots").length,
        0,
      );
    for (let i = 0; i < fromRace; i++) {
      sources.push({
        kind: "race",
        label: displayName(race),
        origin: { source: displayName(race) },
        /* Das Bonustalent des Volkes gibt es ab dem ersten Tag. */
        charLevel: 1,
      });
    }
  }

  /*
    3. Die Bonustalente der KLASSEN, aus der Timeline — also mit der
       KLASSENstufe, auf der sie entstehen. Genau seine Formulierung („Klasse
       Rang x y"): bei einem Mehrklassler sagt „Fighter 2" mehr als „Stufe 5".
  */
  /*
    Auf welcher CHARAKTERstufe steht die n-te Stufe einer Klasse? Das ist die Position in
    `character.levels`, an der diese Klasse zum n-ten Mal auftaucht — bei einem
    Mehrklassler ist „Cleric 1" eben Charakterstufe 4 und nicht 1. Einmal vorab gezählt,
    damit die Schleife darunter nur noch nachschlägt.
  */
  const charLevelOfClassLevel = new Map<string, number>();
  const gesehen = new Map<string, number>();
  character.levels.forEach((lvl, idx) => {
    const n = (gesehen.get(lvl.classId) ?? 0) + 1;
    gesehen.set(lvl.classId, n);
    charLevelOfClassLevel.set(`${lvl.classId}#${n}`, idx + 1);
  });

  for (const feature of timeline.features) {
    const n = feature.effects.filter((e) => e.target === "feats.slots").length;
    for (let i = 0; i < n; i++) {
      const label = `${feature.className} ${feature.level}`;
      sources.push({
        kind: "class",
        label,
        origin: { source: label },
        charLevel: charLevelOfClassLevel.get(`${feature.classId}#${feature.level}`) ?? feature.level,
        classId: feature.classId,
      });
    }
  }

  /*
    4. Der gewährte Weapon Focus der War-Domäne. Dieselbe Bedingung wie am
       Hinweis und am Talentplatz — `warDomainGrant` ist die eine Stelle.
  */
  const grant = warDomainGrant(resolved.deity, character.domains);
  if (grant !== null) {
    const label = `War Domain (${grant.deityName})`;
    /*
      Der geschenkte Focus haengt an der Domaenenwahl, also am Kleriker-Start. Die genaue
      Stufe weiss die App nicht — sie ist hier die Gesamtstufe, damit dieser Platz in der
      Reihenfolge NIE vor einem anderen liegt und niemandem einen Vorgaenger verbaut.
    */
    sources.push({ kind: "granted", label, origin: { source: label }, charLevel: timeline.totalLevel });
  }

  /*
    5. Und was übrig bleibt, wird BENANNT statt verschwiegen. Ohne das könnte die
       Liste kürzer sein als die Zahl daneben — und der Auswähler hätte für einen
       Platz, den der Bogen wirklich hat, keinen Knopf.
  */
  while (sources.length < totalAvailable) {
    sources.push({
      kind: "other",
      label: "andere Quelle",
      origin: { source: "andere Quelle" },
      charLevel: timeline.totalLevel,
    });
  }

  return sources;
}

/**
 * Welche Herkunft gehört an welches Talent — der Vorschlag der App.
 *
 * Sein Auftrag: „Du kannst ja den bisherigen sechs Talenten einfach eine Quelle
 * zuordnen, sodass diese sechs einfach verteilt sind."
 *
 * Die Regel ist bewusst schlicht: was schon eine Herkunft trägt, behält sie (und
 * belegt damit seinen Platz), der Rest bekommt die freien Plätze in der
 * Reihenfolge, in der sie entstehen. Mehr kann die App nicht wissen — seine
 * Spielhistorie steht nirgends —, und mehr soll sie nicht behaupten: der
 * Auswähler am Talent bleibt daneben, damit er jede Zeile richtigstellen kann.
 *
 * Rückgabe ist AUSGERICHTET auf `feats` (gleiche Länge). `undefined` heißt „für
 * dieses Talent gibt es keinen freien Platz mehr" — das passiert genau dann,
 * wenn mehr Talente als Plätze da sind, und dafür gibt es die eigene Warnung.
 */
export function assignFeatOrigins(
  /**
   * Die Talente mit ihrer Herkunft, wie sie JETZT am Bogen stehen — `origin:
   * undefined` je Zeile ohne Angabe.
   *
   * Seit der Vorschlag die REGELN mitliest, braucht er die Kennung: ob ein Platz
   * passt, hängt am Talent (Kämpfer-Bonusliste, Voraussetzungen). Vorher stand hier
   * nur die Herkunft, und genau deshalb legte der Knopf Extra Turning auf Fighter 1.
   */
  current: readonly { featId: string; origin: Character["feats"][number]["origin"] }[],
  sources: readonly FeatSlotSource[],
  /**
   * Welche ANDEREN Talente ein Talent voraussetzt. Hereingereicht statt hier
   * nachgeschlagen, weil dieses Modul bewusst kein Kompendium hat — dieselbe Trennung
   * wie überall in der Engine. Ohne Angabe wird die Reihenfolge nicht geprüft.
   */
  benoetigteTalente: (featId: string) => readonly string[] = () => [],
): (FeatSlotSource["origin"] | undefined)[] {
  const belegt = sources.map((slot) =>
    current.some((f) => f.origin !== undefined && sameOrigin(f.origin, slot.origin)),
  );
  /*
    Zwei Talente mit derselben Herkunft (zwei „Fighter 2" von Hand eingetragen)
    belegen nur EINEN Platz — der zweite gilt als unbelegt und bekommt einen
    neuen Vorschlag. Sonst wäre ein Tippfehler nicht mehr auflösbar.
  */
  const nochFrei = sources.filter((_, i) => !belegt[i]);
  const vergeben = new Set<number>();
  return current.map((feat) => {
    if (feat.origin !== undefined) return feat.origin;
    /*
      Der erste freie Platz, der auch PASST — nicht einfach der erste freie. Das ist
      der ganze Unterschied zur alten Fassung: sie verteilte der Reihe nach und legte
      damit Extra Turning auf einen Kämpfer-Bonusplatz, den es nicht haben darf.

      Findet sich kein passender, bleibt die Zeile LEER statt falsch. Ein Vorschlag,
      der die Regel bricht, ist schlechter als keiner — den Rest trägt er selbst ein,
      und der Auswähler am Talent sagt ihm dabei, was nicht passt.
    */
    let fallback: number | undefined;
    for (let i = 0; i < nochFrei.length; i++) {
      if (vergeben.has(i)) continue;
      const slot = nochFrei[i]!;
      if (featFitsSlot(feat.featId, slot, current, sources, benoetigteTalente) === null) {
        vergeben.add(i);
        return slot.origin;
      }
      fallback ??= i;
    }
    void fallback;
    return undefined;
  });
}

/**
 * Passt dieses Talent auf diesen Platz?
 *
 * Der Anlass steht in seinem Bogen: der Knopf „Herkunft zuordnen" legte **Extra Turning
 * auf Fighter 1** — und das ist kein Bonustalent des Kämpfers. Die App konnte es nicht
 * wissen, weil die Liste nirgends stand; jetzt steht sie in `compendium/fighterBonus.ts`.
 *
 * **Geprüft wird nur, was wirklich belegbar ist**, und das ist Absicht. Eine Prüfung, die
 * rät, meldet irgendwann an der falschen Stelle — davon hat dieses Projekt genug bezahlt.
 * Zwei Dinge sind hart:
 *
 * 1. **Die Bonustalent-Liste des Kämpfers.** Steht das Talent nicht darauf, darf es nicht
 *    auf einem seiner Bonusplätze sitzen.
 * 2. **Die Reihenfolge bei Talent-Voraussetzungen.** Cleave setzt Power Attack voraus —
 *    also kann Cleave nicht auf einem Platz sitzen, der VOR dem von Power Attack entsteht.
 *    Dafür ist `charLevel` am Platz da.
 *
 * Was NICHT geprüft wird: Voraussetzungen im Fließtext („Ability to turn or rebuke
 * creatures" bei Extra Turning). Ob er auf Stufe 3 schon vertreiben konnte, steht in
 * keinem Feld — die App sagt dazu nichts, statt etwas zu erfinden. Genau so hält es
 * `featEligibility` mit `unverifiable` schon heute.
 *
 * Und wie überall: **gewarnt, nicht gesperrt.** Die Rückgabe ist ein Grund, keine Sperre.
 */
export interface SlotFitProblem {
  /** Was nicht passt — fertig formulierter Satz für die Oberfläche. */
  reason: string;
}

export function featFitsSlot(
  featId: string,
  slot: FeatSlotSource,
  /** Alle Talente des Bogens mit ihrer eingetragenen Herkunft — für die Reihenfolge. */
  belegung: readonly { featId: string; origin: Character["feats"][number]["origin"] }[],
  /** Die Plätze, damit eine eingetragene Herkunft auf ihre Stufe zurückgeführt werden kann. */
  sources: readonly FeatSlotSource[],
  /** Voraussetzungen je Talent-Kennung: welche ANDEREN Talente es braucht. */
  benoetigteTalente: (featId: string) => readonly string[],
): SlotFitProblem | null {
  /* 1. Kämpfer-Bonusplatz. */
  if (slot.kind === "class" && slot.classId === "srd:class:fighter") {
    const verdict = fighterBonusVerdict(featId);
    if (verdict.kind === "no") {
      return {
        reason: `steht nicht auf der Bonustalent-Liste des Kämpfers (${slot.label})`,
      };
    }
  }

  /*
    2. Die Reihenfolge. Ein Talent kann nicht früher genommen worden sein als das, was es
       voraussetzt — und „früher" heißt hier CHARAKTERSTUFE, nicht Position in der Liste.
       Trägt der Vorgänger noch gar keine Herkunft, ist nichts zu prüfen: dann weiß die
       App die Reihenfolge nicht und behauptet sie auch nicht.
  */
  for (const vorgaengerId of benoetigteTalente(featId)) {
    const vorgaenger = belegung.find((f) => f.featId === vorgaengerId);
    if (vorgaenger?.origin === undefined) continue;
    const vorgaengerSlot = sources.find((s) => sameOrigin(s.origin, vorgaenger.origin));
    if (vorgaengerSlot === undefined) continue;
    if (slot.charLevel < vorgaengerSlot.charLevel) {
      return {
        reason: `setzt ein Talent voraus, das erst auf ${vorgaengerSlot.label} dazukam`,
      };
    }
  }

  return null;
}
