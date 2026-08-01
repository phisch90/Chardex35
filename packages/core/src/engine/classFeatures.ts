import type { Entity } from "../schema/entities.js";

/**
 * Was ein Klassenmerkmal eigentlich TUT — auf Deutsch, mit dem englischen Regeltext daneben.
 *
 * Der Anlass, wörtlich: „Bardic Music, Bardic Knowledge, Countersong, Fascinate, Inspire
 * Courage — die sagen mir nichts." Im Assistenten stand bei jeder Klasse eine Liste
 * nackter englischer Namen, teils klein geschrieben, ohne ein Wort dazu.
 *
 * DREI Fundstücke aus den Daten haben den Bau bestimmt:
 *
 * 1. **Der englische Regeltext ist längst da** — nicht an den Merkmalen, sondern im
 *    Abschnitt „Class Features" der Klassenbeschreibung, jedes Merkmal unter einer fetten
 *    Überschrift. Er wird hier GELESEN, nicht abgeschrieben: eine zweite Abschrift wäre
 *    derselbe Text an zwei Stellen, und einer von beiden veraltet.
 *
 * 2. **Beide Quellen benennen dasselbe verschieden.** Die Stufentabelle sagt „Rage 2/day",
 *    „3rd favored enemy", „Trap sense +1"; die Beschreibung sagt „Rage (Ex)",
 *    „Favored Enemy (Ex)", „Trap Sense (Ex)". Also wird normalisiert, und was die Regel
 *    nicht greift, steht als ALIAS ausdrücklich da — nicht als raffiniertere Regel, die
 *    beim nächsten Sonderfall wieder daneben greift.
 *
 * 3. **Die Stufentabelle ist LÜCKENHAFT.** Beim Kleriker steht dort einzig
 *    „Turn or rebuke undead" — keine Domänen, kein spontanes Wirken, keine Aura, obwohl
 *    die Beschreibung alle drei ausführt. Deshalb zeigt die Anzeige zwei Gruppen: was auf
 *    einer Stufe dazukommt, und was die Klasse von Anfang an ausmacht.
 *
 * Die deutschen Sätze stehen als GEMEINSAME Tabelle nach normalisiertem Namen, nicht je
 * Klasse: „Evasion" haben Mönch, Schurke und Waldläufer, „Bonus feat" Kämpfer, Mönch und
 * Magier. Einmal geschrieben, dreimal benutzt — und keine drei Fassungen, die auseinander
 * laufen.
 */

export interface ClassFeatureInfo {
  /** Der Name, wie er in der Stufentabelle steht („Rage 2/day"). Englisch, wie im Buch. */
  name: string;
  /** Normalisiert, für Nachschlagen und Tests. */
  key: string;
  /** Deutscher Name, falls es einen gibt („Kampfrausch"). */
  germanName?: string;
  /** Ein Satz auf Deutsch. Fehlt, solange niemand ihn geschrieben hat. */
  summary?: string;
  /** Der englische SRD-Text aus der Klassenbeschreibung. */
  text?: string;
}

export interface ClassFeatureLevel {
  level: number;
  features: ClassFeatureInfo[];
}

export interface ClassFeatureOverview {
  /** Was auf welcher Stufe dazukommt — nur Stufen, auf denen etwas steht. */
  levels: ClassFeatureLevel[];
  /**
   * Was die Klasse von Anfang an ausmacht: Merkmale, die die Beschreibung ausführt, die
   * aber in keiner Zeile der Stufentabelle stehen. Beim Kleriker sind das die Domänen.
   */
  always: ClassFeatureInfo[];
  /** Merkmale ohne deutschen Satz — für die ehrliche Anzeige „nur englisch". */
  untranslated: string[];
}

/**
 * Name → Nachschlage-Schlüssel.
 *
 * Bewusst OHNE Plural-Regel: „Bonus Feats" zu „bonus feat" zu verkürzen hieße auch
 * „A Thousand Faces" zu „a thousand face" und „Bonus Languages" zu „bonu language" —
 * verstümmelte Schlüssel, die irgendwann kollidieren. Die drei echten Einzahl/Mehrzahl-
 * Fälle stehen unten im ALIAS.
 */
export function featureKey(name: string): string {
  let s = name.toLowerCase().trim();
  s = s.replace(/\((?:ex|su|sp)\)/g, " "); // „Rage (Ex)"
  s = s.replace(/^\d+(?:st|nd|rd|th)\s+/, ""); // „3rd favored enemy"
  s = s.replace(/\s*[+-]\d+.*$/, ""); // „Trap sense +1", „Damage reduction 1/-"
  s = s.replace(/\s*\d+\/(?:day|week|month|encounter).*$/, ""); // „rage 1/day"
  s = s.replace(/\s*\d+d\d+.*$/, ""); // „Sneak attack 1d6"
  s = s.replace(/\s*\d+\s*ft\.?.*$/, ""); // „slow fall 20 ft."
  s = s.replace(/[^a-z' ]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return ALIAS[s] ?? s;
}

/**
 * Was die Normalisierung nicht von selbst trifft. Jede Zeile ist ein Fall aus den echten
 * Daten, nicht eine Vorsichtsmaßnahme: links, wie es dasteht, rechts, was gemeint ist.
 */
const ALIAS: Record<string, string> = {
  // Einzahl/Mehrzahl zwischen Tabelle und Beschreibung.
  "bonus feats": "bonus feat",
  "special abilities": "special ability",
  "bonus languages": "bonus language",
  // Eine Fähigkeit, viele Ausbaustufen.
  "wild shape": "wild shape",
  "wild shape elemental": "wild shape",
  "wild shape huge": "wild shape",
  "wild shape large": "wild shape",
  "wild shape plant": "wild shape",
  "wild shape tiny": "wild shape",
  "ki strike adamantine": "ki strike",
  "ki strike lawful": "ki strike",
  "ki strike magic": "ki strike",
  "slow fall any distance": "slow fall",
  // Kleriker und Paladin nennen dasselbe verschieden.
  "turn undead": "turn or rebuke undead",
  // Die Beschreibung führt Begleiter und Reittier in einem eigenen Abschnitt aus.
  "animal companion basics": "animal companion",
  "familiar basics": "familiar",
  "familiar ability descriptions": "familiar",
  "paladin's mount basics": "special mount",
  "deity domains and domain spells": "domains",
};

/* ------------------------------------------------------------------------- *
 * Der englische Text: aus der Klassenbeschreibung gelesen
 * ------------------------------------------------------------------------- */

/**
 * Liest den Abschnitt „Class Features" der Beschreibung und gibt je Merkmal den Text.
 *
 * Die Beschreibung ist Markdown aus dem SRD: `**Rage (Ex):** Text …`. Der Abschnitt vor
 * „Class Features" (Ausrichtung, Trefferwürfel, die Stufentabelle) wird übersprungen —
 * dort stehen dieselben Fettschriften für etwas anderes („Hit Die:", „Fort Save").
 */
export function classFeatureTexts(klass: Entity): Map<string, { heading: string; text: string }> {
  const out = new Map<string, { heading: string; text: string }>();
  const description = klass.description;
  if (description === undefined) return out;

  const start = description.indexOf("Class Features");
  if (start < 0) return out;
  const body = description.slice(start);

  /*
    ZWEI Ebenen, und die zweite ist die wichtigere.

    Fett (`**Bardic Music:**`) sind die Hauptmerkmale. Was er tatsächlich nicht verstand —
    Countersong, Fascinate, Inspire Courage — steht im SRD als KURSIVER Unterabschnitt
    INNERHALB von Bardic Music (`*Countersong (Su):*`). Nur die fette Ebene zu lesen hieße:
    der Barde bekommt vier Regeltexte, und die fünf Namen aus seiner Beschwerde bleiben
    ohne. Also beide Ebenen, in einem Durchgang, damit die Abschnittsgrenzen stimmen.
  */
  const pattern = /(?:\*\*([^*\n]{2,80}?):\*\*|(?<!\*)\*([^*\n]{3,80}?):\*(?!\*))/g;
  const marks: { heading: string; from: number; to: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const heading = (match[1] ?? match[2])?.trim();
    if (heading === undefined || heading === "") continue;
    marks.push({ heading, from: match.index + match[0].length, to: body.length });
  }
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i];
    if (mark === undefined) continue;
    const next = marks[i + 1];
    // Bis zur nächsten Überschrift — der letzte Abschnitt bis zum Ende.
    const text = body.slice(mark.from, next?.from === undefined ? undefined : next.from)
      .replace(/\*{1,2}[^*\n]{2,80}?:\*{1,2}\s*$/, "")
      .trim();
    const key = featureKey(mark.heading);
    if (key === "" || out.has(key)) continue; // Der erste Treffer gewinnt.
    out.set(key, { heading: mark.heading, text });
  }
  return out;
}

/* ------------------------------------------------------------------------- *
 * Die deutschen Sätze — eine Tabelle für alle Klassen
 * ------------------------------------------------------------------------- */

interface German {
  name: string;
  summary: string;
}

/**
 * Ein Satz je Merkmal, in eigenen Worten über SRD-Mechanik — keine Abschrift aus seinen
 * Büchern. Der englische Name bleibt vorn (seine Entscheidung), der deutsche steht daneben
 * fürs Verstehen.
 */
const GERMAN: Record<string, German> = {
  // ---- Für alle Klassen ------------------------------------------------
  "weapon and armor proficiency": {
    name: "Waffen- und Rüstungsvertrautheit",
    summary: "Womit die Klasse ohne Malus umgehen kann — alles andere trifft schlechter.",
  },
  spells: {
    name: "Zauber",
    summary: "Wie die Klasse zaubert: woher die Zauber kommen, wie viele pro Tag, welches Attribut zählt.",
  },
  "bonus feat": {
    name: "Bonustalent",
    summary: "Ein zusätzliches Talent, oben drauf zu dem, das jeder auf dieser Stufe bekommt.",
  },
  "bonus language": {
    name: "Bonussprache",
    summary: "Zusätzliche Sprachen, die diese Klasse lernen darf — beim Kleriker die seines Glaubens.",
  },

  // ---- Kleriker --------------------------------------------------------
  aura: {
    name: "Aura",
    summary: "Deine Gesinnung ist spürbar: Zauber wie Detect Evil zeigen dich als das, was du bist.",
  },
  domains: {
    name: "Domänen",
    summary: "Zwei Domänen deiner Gottheit: jede gibt eine Fähigkeit und je Zaubergrad einen eigenen Zauberplatz.",
  },
  "spontaneous casting": {
    name: "Spontanes Wirken",
    summary: "Einen vorbereiteten Zauber gegen Heilen (oder als Böser gegen Verursachen) desselben Grades tauschen.",
  },
  "chaotic evil good and lawful spells": {
    name: "Gesinnungszauber",
    summary: "Zauber mit einem Gesinnungs-Deskriptor kannst du nur wirken, wenn er zu dir passt.",
  },
  "turn or rebuke undead": {
    name: "Untote vertreiben",
    summary: "Untote in Sichtweite vertreiben oder als Böser befehligen — mehrmals am Tag, gerechnet aus CHA.",
  },

  // ---- Barde -----------------------------------------------------------
  "bardic music": {
    name: "Bardenmusik",
    summary: "Deine Auftritte wirken wie Magie: eine bestimmte Anzahl am Tag, je nach Stufe und Perform-Rängen.",
  },
  "bardic knowledge": {
    name: "Bardenwissen",
    summary: "Ein Wurf auf allerlei Halbwissen — Gerüchte, Legenden, wem dieses Wappen gehört.",
  },
  countersong: {
    name: "Gegengesang",
    summary: "Mit Musik gegen Klang-Magie ansingen: dein Perform-Wurf ersetzt den Rettungswurf der Betroffenen.",
  },
  fascinate: {
    name: "Faszinieren",
    summary: "Ein Zuhörer sitzt gebannt still, solange du weiterspielst — ein Angriff bricht es sofort.",
  },
  "inspire courage": {
    name: "Mut einflößen",
    summary: "Verbündete in Hörweite bekommen einen Bonus gegen Furcht sowie auf Angriff und Schaden.",
  },
  "inspire competence": {
    name: "Können einflößen",
    summary: "Ein Verbündeter bekommt +2 auf Fertigkeitswürfe, solange du ihn begleitest.",
  },
  suggestion: {
    name: "Suggestion",
    summary: "Einem Faszinierten einen Vorschlag machen, den er für seine eigene Idee hält.",
  },
  "mass suggestion": {
    name: "Massensuggestion",
    summary: "Wie Suggestion, aber an alle, die du gleichzeitig faszinierst.",
  },
  "inspire greatness": {
    name: "Größe einflößen",
    summary: "Ein Verbündeter erhält zusätzliche Trefferwürfel, Angriffsbonus und Fortitude.",
  },
  "inspire heroics": {
    name: "Heldenmut einflößen",
    summary: "Ein Verbündeter bekommt einen großen Bonus auf Rettungswürfe und Rüstungsklasse.",
  },
  "song of freedom": {
    name: "Lied der Freiheit",
    summary: "Ein Lied, das wie Break Enchantment wirkt — Verzauberungen lösen sich.",
  },
  illiteracy: {
    name: "Analphabetismus",
    summary: "Nur der Barbar: er kann von Haus aus nicht lesen, kann es aber gegen Fertigkeitspunkte lernen.",
  },

  // ---- Barbar ----------------------------------------------------------
  rage: {
    name: "Kampfrausch",
    summary: "Mehr STR und CON, mehr Trefferpunkte, besserer Will — dafür schlechtere RK und kein Feingefühl.",
  },
  "greater rage": {
    name: "Großer Kampfrausch",
    summary: "Der Rausch wird stärker: mehr Attributsbonus und ein besserer Rettungswurf.",
  },
  "tireless rage": {
    name: "Unermüdlicher Rausch",
    summary: "Nach dem Rausch bist du nicht mehr erschöpft.",
  },
  "mighty rage": {
    name: "Mächtiger Kampfrausch",
    summary: "Die stärkste Stufe des Rausches.",
  },
  "fast movement": {
    name: "Schnelle Bewegung",
    summary: "+10 Fuß Bewegungsweite, solange du keine schwere Rüstung und keine schwere Last trägst.",
  },
  "damage reduction": {
    name: "Schadensreduzierung",
    summary: "Jeder Treffer verliert einige Punkte Schaden — gegen viele kleine Treffer viel wert.",
  },
  "indomitable will": {
    name: "Unbezähmbarer Wille",
    summary: "Im Rausch zusätzlich +4 auf Will gegen Verzauberungen.",
  },
  "trap sense": {
    name: "Fallengespür",
    summary: "Bonus auf Reflex und RK gegen Fallen — es wächst mit der Stufe.",
  },
  "uncanny dodge": {
    name: "Instinktives Ausweichen",
    summary: "Du behältst deinen DEX-Bonus auf die RK, auch wenn du überrascht wirst.",
  },
  "improved uncanny dodge": {
    name: "Verbessertes instinktives Ausweichen",
    summary: "Dazu: dich hinterrücks anzugreifen gelingt nur jemandem, der deutlich erfahrener ist.",
  },

  // ---- Druide ----------------------------------------------------------
  "animal companion": {
    name: "Tiergefährte",
    summary: "Ein Tier begleitet dich und wird mit deiner Stufe stärker; es hört auf dich wie ein Freund.",
  },
  "nature sense": {
    name: "Natursinn",
    summary: "+2 auf Knowledge (nature) und Survival.",
  },
  "wild empathy": {
    name: "Tierempathie",
    summary: "Die Haltung eines Tieres verbessern — wie Diplomacy, nur für Tiere.",
  },
  "woodland stride": {
    name: "Waldläuferschritt",
    summary: "Unterholz und Dornen bremsen dich nicht mehr.",
  },
  "trackless step": {
    name: "Spurloser Schritt",
    summary: "In der Wildnis hinterlässt du keine Spuren, denen man folgen könnte.",
  },
  "resist nature's lure": {
    name: "Naturzauber widerstehen",
    summary: "+4 auf Rettungswürfe gegen Fähigkeiten von Feen.",
  },
  "wild shape": {
    name: "Wildform",
    summary: "In ein Tier verwandeln — mit der Stufe größer, öfter am Tag und später auch Pflanze oder Elementar.",
  },
  "venom immunity": {
    name: "Giftimmunität",
    summary: "Gift wirkt bei dir nicht mehr.",
  },
  "a thousand faces": {
    name: "Tausend Gesichter",
    summary: "Dein eigenes Aussehen nach Belieben ändern, wie Alter Self.",
  },
  "timeless body": {
    name: "Zeitloser Körper",
    summary: "Das Alter nimmt dir keine Attributspunkte mehr; die Lebensspanne bleibt.",
  },

  // ---- Mönch -----------------------------------------------------------
  "unarmed strike": {
    name: "Waffenloser Schlag",
    summary: "Deine Hände sind Waffen: mehr Schaden als bei jedem anderen, und immer bewaffnet.",
  },
  "flurry of blows": {
    name: "Schlaghagel",
    summary: "Ein zusätzlicher Angriff in der vollen Attacke, dafür alle mit Malus.",
  },
  "greater flurry": {
    name: "Großer Schlaghagel",
    summary: "Noch ein Angriff mehr im Schlaghagel.",
  },
  "ac bonus": {
    name: "RK-Bonus",
    summary: "Ohne Rüstung zählt WIS auf die RK, dazu ein Bonus, der mit der Stufe steigt.",
  },
  evasion: {
    name: "Ausweichen",
    summary: "Ein geglückter Reflex-Wurf bedeutet gar keinen Schaden statt halbem.",
  },
  "improved evasion": {
    name: "Verbessertes Ausweichen",
    summary: "Auch ein misslungener Reflex-Wurf kostet nur noch halben Schaden.",
  },
  "still mind": {
    name: "Ruhiger Geist",
    summary: "+2 auf Rettungswürfe gegen Verzauberungen.",
  },
  "ki strike": {
    name: "Ki-Schlag",
    summary: "Dein Schlag gilt als magisch, später als gesinnt und als Adamant — gegen Wesen, die Normales abwehren.",
  },
  "slow fall": {
    name: "Sanfter Fall",
    summary: "An einer Wand entlang fällst du eine gewisse Höhe ohne Schaden, später beliebig weit.",
  },
  "purity of body": {
    name: "Reinheit des Körpers",
    summary: "Immun gegen alle natürlichen Krankheiten.",
  },
  "wholeness of body": {
    name: "Körperliche Ganzheit",
    summary: "Dich selbst heilen, eine bestimmte Menge Trefferpunkte am Tag.",
  },
  "diamond body": {
    name: "Diamantkörper",
    summary: "Immun gegen Gift jeder Art.",
  },
  "abundant step": {
    name: "Überfluss-Schritt",
    summary: "Einmal am Tag ein kurzer Sprung durch den Raum, wie Dimension Door.",
  },
  "diamond soul": {
    name: "Diamantseele",
    summary: "Zauberresistenz, die mit deiner Stufe wächst.",
  },
  "quivering palm": {
    name: "Bebende Handfläche",
    summary: "Einmal in mehreren Tagen: ein Schlag, der später auf deinen Befehl tödlich wirkt.",
  },
  // „Timeless body" haben Druide UND Mönch — der Satz steht oben beim Druiden und gilt
  // für beide. Hier stand einmal eine zweite Fassung; der Test auf ungenutzte Schlüssel
  // hat sie gefunden.
  "tongue of the sun and moon": {
    name: "Zunge von Sonne und Mond",
    summary: "Du kannst mit jedem Lebewesen sprechen, das eine Sprache hat.",
  },
  "empty body": {
    name: "Leerer Körper",
    summary: "Kurz körperlos werden, wie Etherealness.",
  },
  "perfect self": {
    name: "Vollkommenes Selbst",
    summary: "Du zählst als Außenweltler: manche Effekte, die auf Menschen wirken, greifen nicht mehr.",
  },

  // ---- Paladin ---------------------------------------------------------
  "aura of good": {
    name: "Aura des Guten",
    summary: "Deine gute Gesinnung strahlt so stark wie die eines Klerikers gleicher Stufe.",
  },
  "detect evil": {
    name: "Böses entdecken",
    summary: "Nach Belieben spüren, ob etwas in der Nähe böse ist.",
  },
  "smite evil": {
    name: "Böses niederstrecken",
    summary: "Ein angesagter Angriff gegen einen Bösen: CHA auf den Angriff, Stufe auf den Schaden.",
  },
  "divine grace": {
    name: "Göttliche Gnade",
    summary: "Dein CHA-Bonus kommt auf alle drei Rettungswürfe.",
  },
  "lay on hands": {
    name: "Handauflegen",
    summary: "Heilen mit der Hand: am Tag so viele Punkte wie Stufe × CHA-Bonus.",
  },
  "aura of courage": {
    name: "Aura des Mutes",
    summary: "Du bist immun gegen Furcht, Verbündete in der Nähe bekommen +4 dagegen.",
  },
  "divine health": {
    name: "Göttliche Gesundheit",
    summary: "Immun gegen alle Krankheiten, auch magische.",
  },
  "special mount": {
    name: "Besonderes Reittier",
    summary: "Ein gerufenes Streitross, das mit deiner Stufe stärker wird.",
  },
  "remove disease": {
    name: "Krankheit heilen",
    summary: "Krankheit heilen wie der Zauber, einige Male in der Woche.",
  },
  "code of conduct": {
    name: "Ehrenkodex",
    summary: "Rechtschaffen gut bleiben, nicht lügen, nicht hinterrücks angreifen — sonst verlierst du alles.",
  },
  associates: {
    name: "Gefährten",
    summary: "Mit Bösen reist ein Paladin nicht; auf Dauer schadet es seinem Stand.",
  },

  // ---- Waldläufer ------------------------------------------------------
  "favored enemy": {
    name: "Bevorzugter Feind",
    summary: "Gegen eine gewählte Art: Bonus auf Schaden und aufs Aufspüren; mit der Stufe kommen weitere dazu.",
  },
  track: {
    name: "Spurenlesen",
    summary: "Du hast Track als Bonustalent — Spuren mit Survival verfolgen.",
  },
  endurance: {
    name: "Ausdauer",
    summary: "Endurance als Bonustalent: +4 auf alles, was langes Durchhalten prüft.",
  },
  "combat style": {
    name: "Kampfstil",
    summary: "Bogen oder zwei Waffen: du bekommst das passende Talent, ohne seine Voraussetzung zu erfüllen.",
  },
  "improved combat style": {
    name: "Verbesserter Kampfstil",
    summary: "Die nächste Stufe deines gewählten Kampfstils.",
  },
  "combat style mastery": {
    name: "Meisterschaft im Kampfstil",
    summary: "Die letzte Stufe deines gewählten Kampfstils.",
  },
  "hide in plain sight": {
    name: "Verstecken in aller Öffentlichkeit",
    summary: "In der Wildnis kannst du dich verstecken, auch wenn dir jemand zusieht.",
  },
  camouflage: {
    name: "Tarnung",
    summary: "In natürlicher Umgebung brauchst du keine Deckung mehr, um Hide zu benutzen.",
  },
  "swift tracker": {
    name: "Schneller Spurenleser",
    summary: "Spuren verfolgen in normalem Tempo, ohne Malus.",
  },

  // ---- Schurke ---------------------------------------------------------
  "sneak attack": {
    name: "Hinterhältiger Angriff",
    summary: "Zusatzschaden, wenn das Ziel keinen DEX-Bonus hat oder du es flankierst — steigt alle zwei Stufen.",
  },
  trapfinding: {
    name: "Fallen finden",
    summary: "Nur du kannst magische Fallen suchen und jede Falle entschärfen, egal wie schwer.",
  },
  "special ability": {
    name: "Besondere Fähigkeit",
    summary: "Auf hohen Stufen wählst du selbst: von Crippling Strike bis Defensive Roll.",
  },

  // ---- Zauberer und Magier ---------------------------------------------
  "summon familiar": {
    name: "Vertrauten rufen",
    summary: "Ein magisches Tier bindet sich an dich, gibt einen kleinen Vorteil und wird mit dir stärker.",
  },
  familiar: {
    name: "Vertrauter",
    summary: "Was ein Vertrauter kann: eigene Werte aus deinen, ein Bonus für dich, und er versteht deine Sprache.",
  },
  "scribe scroll": {
    name: "Schriftrolle verfassen",
    summary: "Scribe Scroll als Bonustalent: Zauber auf Rollen schreiben und später daraus wirken.",
  },
  spellbooks: {
    name: "Zauberbuch",
    summary: "Ein Magier bereitet nur vor, was in seinem Buch steht — verliert er es, verliert er die Zauber.",
  },
};

/* ------------------------------------------------------------------------- *
 * Zusammenführen
 * ------------------------------------------------------------------------- */

function infoFor(
  name: string,
  texts: Map<string, { heading: string; text: string }>,
): ClassFeatureInfo {
  const key = featureKey(name);
  const german = GERMAN[key];
  const found = texts.get(key);
  return {
    name,
    key,
    ...(german !== undefined ? { germanName: german.name, summary: german.summary } : {}),
    ...(found !== undefined ? { text: found.text } : {}),
  };
}

/**
 * Alle Merkmale einer Klasse, nach Stufe geordnet, plus die, die überall gelten.
 *
 * `levels` folgt der Stufentabelle: Index 0 ist Stufe 1 (so liegt es im Pack). `always`
 * sind die Merkmale, die nur die Beschreibung kennt — beim Kleriker die Domänen und das
 * spontane Wirken. Ohne diese zweite Gruppe wäre der Kleriker im Assistenten eine Klasse
 * mit genau einem Merkmal.
 */
export function classFeatureOverview(klass: Entity | undefined): ClassFeatureOverview | undefined {
  if (klass === undefined || klass.kind !== "class") return undefined;
  const texts = classFeatureTexts(klass);

  const levels: ClassFeatureLevel[] = [];
  const seen = new Set<string>();
  const untranslated: string[] = [];

  klass.data.levels.forEach((row, index) => {
    const features = (row.features ?? []).map((feature) => {
      const info = infoFor(feature.name, texts);
      seen.add(info.key);
      if (info.summary === undefined) untranslated.push(feature.name);
      return info;
    });
    if (features.length > 0) levels.push({ level: index + 1, features });
  });

  /*
    Die zweite Gruppe entsteht NUR aus Schlüsseln, für die ein deutscher Satz existiert.

    Der Parser ist eine Textquelle, kein Urteil darüber, was ein Merkmal ist. Sobald er
    auch kursive Marken liest (nötig für Countersong und Fascinate), findet er beim Druiden
    auch `*Class Level:*` und `*Bonus HD:*` — das sind SPALTENKÖPFE der Tiergefährten-
    Tabelle. Als Merkmale aufgeführt hätten sie „Class Level — nur englisch" ergeben.

    Die Entscheidung liegt deshalb bei zwei geprüften Quellen: der Stufentabelle (Daten)
    und der deutschen Tabelle (von Hand durchgesehen). Was in keiner von beiden steht,
    erscheint nicht. Ein echtes Merkmal ohne deutschen Satz fehlt damit lieber ganz, als
    dass daneben Tabellenschrott steht.
  */
  const always: ClassFeatureInfo[] = [];
  for (const [key, found] of texts) {
    if (seen.has(key)) continue;
    const german = GERMAN[key];
    if (german === undefined) continue;
    always.push({
      name: found.heading,
      key,
      germanName: german.name,
      summary: german.summary,
      text: found.text,
    });
  }

  return { levels, always, untranslated };
}

/** Für Tests und Werkzeuge: welche Schlüssel hat die deutsche Tabelle? */
export function germanFeatureKeys(): string[] {
  return Object.keys(GERMAN);
}
