import { warDomainGrant } from "../compendium/deity.js";
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
      sources.push({ kind: "level", label: `Stufe ${level}`, origin: { level } });
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
      sources.push({ kind: "race", label: displayName(race), origin: { source: displayName(race) } });
    }
  }

  /*
    3. Die Bonustalente der KLASSEN, aus der Timeline — also mit der
       KLASSENstufe, auf der sie entstehen. Genau seine Formulierung („Klasse
       Rang x y"): bei einem Mehrklassler sagt „Fighter 2" mehr als „Stufe 5".
  */
  for (const feature of timeline.features) {
    const n = feature.effects.filter((e) => e.target === "feats.slots").length;
    for (let i = 0; i < n; i++) {
      const label = `${feature.className} ${feature.level}`;
      sources.push({ kind: "class", label, origin: { source: label } });
    }
  }

  /*
    4. Der gewährte Weapon Focus der War-Domäne. Dieselbe Bedingung wie am
       Hinweis und am Talentplatz — `warDomainGrant` ist die eine Stelle.
  */
  const grant = warDomainGrant(resolved.deity, character.domains);
  if (grant !== null) {
    const label = `War Domain (${grant.deityName})`;
    sources.push({ kind: "granted", label, origin: { source: label } });
  }

  /*
    5. Und was übrig bleibt, wird BENANNT statt verschwiegen. Ohne das könnte die
       Liste kürzer sein als die Zahl daneben — und der Auswähler hätte für einen
       Platz, den der Bogen wirklich hat, keinen Knopf.
  */
  while (sources.length < totalAvailable) {
    sources.push({ kind: "other", label: "andere Quelle", origin: { source: "andere Quelle" } });
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
   * Die Herkünfte, wie sie JETZT an den Talenten stehen — `undefined` je Zeile
   * ohne Angabe. Bewusst nur die Herkünfte und nicht die Talente: der Assistent
   * hat einen Entwurf, dessen Zeilen das Feld gar nicht kennen, und die Funktion
   * braucht vom Talent nichts weiter.
   */
  current: readonly (Character["feats"][number]["origin"] | undefined)[],
  sources: readonly FeatSlotSource[],
): (FeatSlotSource["origin"] | undefined)[] {
  const belegt = sources.map((slot) =>
    current.some((origin) => origin !== undefined && sameOrigin(origin, slot.origin)),
  );
  /*
    Zwei Talente mit derselben Herkunft (zwei „Fighter 2" von Hand eingetragen)
    belegen nur EINEN Platz — der zweite gilt als unbelegt und bekommt einen
    neuen Vorschlag. Sonst wäre ein Tippfehler nicht mehr auflösbar.
  */
  const frei = sources.filter((_, i) => !belegt[i]);
  let next = 0;
  return current.map((origin) => {
    if (origin !== undefined) return origin;
    return next < frei.length ? frei[next++]!.origin : undefined;
  });
}
