import type { Entity, ItemEntity } from "../schema/entities.js";

/**
 * Deutsche Namen und Erklärungen für die Ausrüstung.
 *
 * Der Anlass, wörtlich: „Bitte alle Ausrüstungsgegenstände immer auf deutsch im
 * Namen und Erklärung. Englischen og namen klein daneben.“
 *
 * Die Regel dieses Projekts ist: Oberfläche deutsch, REGELINHALTE englisch. Ein
 * Gegenstand ist beides zugleich — „Longsword“ ist ein Ding (also deutsch:
 * Langschwert), „Acid Arrow“ auf einer Schriftrolle ist ein ZAUBERNAME (also
 * englisch, wie DEX und nicht GE). Daraus folgt die Aufteilung:
 *
 *   Dinge          → deutscher Name.            Longsword → Langschwert
 *   Zaubernamen    → englisch, mit deutschem    Acid Arrow (Rolle) →
 *                    Wort davor, das sagt WAS   „Schriftrolle: Acid Arrow“
 *                    das Stück ist.
 *
 * Das deutsche Wort davor ist am Bogen nicht Zierde, sondern nötig: die
 * Gepäckliste gruppiert NICHT nach Art. Dort stand bisher nur „Acid Arrow“ —
 * ohne zu sagen, ob das eine Rolle, ein Trank oder ein Zauberstab ist. Von 734
 * Schriftrollen trägt keine einzige das Wort „scroll“ im Namen.
 *
 * Nichts hiervon wird gespeichert. Der deutsche Name ist eine FOLGE aus dem
 * Eintrag (die Fehlerfamilie dieses Projekts: ein abgeleiteter Wert, der
 * gespeichert wurde). Er wird beim Einrichten des Kompendiums als
 * `localized.de` über die Packs gelegt — `displayName` liest ihn dann überall,
 * und `entity.name` bleibt als englisches Original daneben stehen.
 */

export interface ItemGerman {
  /** Deutscher Anzeigename. */
  name: string;
  /** Ein Satz: was ist das, wofür nimmt man es? Deutsch, ohne Fachjargon. */
  summary?: string;
}

// ===========================================================================
//  Waffen — 78 Einträge
// ===========================================================================
/*
  Die Erklärung wiederholt NICHT, was schon in der Werte-Zeile steht (Schaden,
  kritisch, Reichweite kommen aus `itemSummary`). Sie sagt, was die Zeile nicht
  sagen kann: was für ein Ding das ist und wofür man es nimmt. „1d8, krit. 19-20“
  steht ohnehin daneben — „die Standardklinge, einhändig zu führen“ nicht.
*/
const WEAPONS: Record<string, ItemGerman> = {
  "arrows-20": {
    name: "Pfeile (20)",
    summary: "Munition für Bögen. Ein Bündel von 20; verschossene Pfeile sind zur Hälfte wiederzufinden.",
  },
  "axe-orc-double": {
    name: "Orkische Doppelaxt",
    summary:
      "Ein Schaft mit einer Axt an jedem Ende. Gilt als zwei Waffen: man kann mit beiden Enden angreifen und nimmt dafür die Mali für den Kampf mit zwei Waffen.",
  },
  "axe-throwing": {
    name: "Wurfaxt",
    summary: "Eine kleine Axt zum Werfen. Leicht genug für die zweite Hand.",
  },
  battleaxe: {
    name: "Streitaxt",
    summary: "Die einhändige Axt des Kriegers. Trifft sie kritisch, macht sie dreifachen Schaden.",
  },
  bolas: {
    name: "Bolas",
    summary:
      "Zwei Gewichte an einer Schnur. Man kann damit versuchen, einen Gegner zu Fall zu bringen, ohne ihn zu berühren.",
  },
  "bolts-10": { name: "Bolzen (10)", summary: "Munition für Armbrüste. Zehn Stück." },
  "bolts-5": { name: "Bolzen (5)", summary: "Munition für Armbrüste. Fünf Stück." },
  "bolts-crossbow-10": {
    name: "Armbrustbolzen (10)",
    summary: "Munition für leichte und schwere Armbrüste. Zehn Stück im Köcher.",
  },
  "bullets-sling-10": {
    name: "Schleuderkugeln (10)",
    summary: "Bleikugeln für die Schleuder. Zehn Stück.",
  },
  "chain-spiked": {
    name: "Stachelkette",
    summary:
      "Eine über zwei Meter lange Kette mit Stacheln. Man kann mit ihr auch entwaffnen und zu Fall bringen; Kampfgeschick wirkt auf sie.",
  },
  club: {
    name: "Knüppel",
    summary: "Ein Stück Holz. Kostet nichts, kann jeder führen, und man kann ihn werfen.",
  },
  "crossbow-hand": {
    name: "Handarmbrust",
    summary:
      "Eine Armbrust für eine Hand — klein genug, um sie zu verbergen. Nachladen kostet eine freie Handlung.",
  },
  "crossbow-heavy": {
    name: "Schwere Armbrust",
    summary:
      "Die stärkste Armbrust. Nachladen dauert eine volle Runde, dafür braucht sie keine Stärke: der Bolzen macht immer denselben Schaden.",
  },
  "crossbow-light": {
    name: "Leichte Armbrust",
    summary:
      "Die kleinere Armbrust. Nachladen kostet eine Aktion; jeder kann sie führen, ganz ohne Übung.",
  },
  "crossbow-repeating-heavy": {
    name: "Schwere Repetierarmbrust",
    summary: "Ein Magazin für fünf Bolzen. Fünf Schüsse ohne Nachladen, dann fünf Runden Arbeit.",
  },
  "crossbow-repeating-light": {
    name: "Leichte Repetierarmbrust",
    summary: "Ein Magazin für fünf Bolzen. Fünf Schüsse ohne Nachladen, dann fünf Runden Arbeit.",
  },
  dagger: {
    name: "Dolch",
    summary:
      "Die Waffe, die jeder dabeihat: leicht, werfbar, und man kann sie verbergen. Sticht oder schneidet, wie man will.",
  },
  "dagger-punching": {
    name: "Stoßdolch",
    summary: "Ein Dolch mit Quergriff — man stößt ihn wie einen Faustschlag. Trifft er kritisch, dreifacher Schaden.",
  },
  dart: { name: "Wurfpfeil", summary: "Ein kleiner Wurfspieß. Billig, leicht, in Mengen zu tragen." },
  falchion: {
    name: "Krummsäbel",
    summary: "Eine breite, geschwungene Klinge für zwei Hände. Trifft besonders oft kritisch (ab 18).",
  },
  flail: { name: "Kettenkeule", summary: "Ein Kopf an einer Kette. Kann entwaffnen und zu Fall bringen." },
  "flail-dire": {
    name: "Doppelkettenkeule",
    summary:
      "Zwei Köpfe an einem Schaft. Gilt als zwei Waffen: beide Enden greifen an, mit den Mali für zwei Waffen.",
  },
  "flail-heavy": {
    name: "Schwere Kettenkeule",
    summary: "Die zweihändige Kettenkeule. Kann entwaffnen und zu Fall bringen.",
  },
  gauntlet: {
    name: "Panzerhandschuh",
    summary:
      "Ein Metallhandschuh. Mit ihm gilt der Faustschlag nicht mehr als unbewaffnet — der Gegner bekommt keinen freien Angriff.",
  },
  "gauntlet-spiked": {
    name: "Stachelhandschuh",
    summary:
      "Ein Panzerhandschuh mit Stacheln. Zählt als bewaffneter Angriff und lässt die Hand frei, um etwas zu halten.",
  },
  glaive: {
    name: "Glefe",
    summary: "Eine Klinge auf langem Schaft. Reicht 3 m weit: man trifft, bevor der Gegner heran ist.",
  },
  greataxe: { name: "Große Axt", summary: "Die schwerste Axt. Der höchste Schadenswürfel im Regelwerk und dreifach kritisch." },
  greatclub: { name: "Große Keule", summary: "Ein Baumstamm mit Griff. Zweihändig, billig, wirkungsvoll." },
  greatsword: {
    name: "Zweihänder",
    summary: "Das große Schwert. Zwei Hände, hoher Schaden, kritisch schon ab 19.",
  },
  guisarme: {
    name: "Gisarme",
    summary: "Hakenklinge auf langem Schaft. Reicht 3 m weit und kann Gegner zu Fall bringen.",
  },
  halberd: {
    name: "Halbarte",
    summary: "Axt, Spitze und Haken an einem Schaft. Sticht oder schneidet, und kann zu Fall bringen.",
  },
  "hammer-gnome-hooked": {
    name: "Gnomischer Hakenhammer",
    summary:
      "Hammer an einem Ende, Haken am anderen. Gilt als zwei Waffen; der Haken trifft vierfach kritisch.",
  },
  "hammer-light": {
    name: "Leichter Hammer",
    summary: "Ein Hammer für eine Hand, auch zum Werfen. Leicht genug für die zweite Hand.",
  },
  handaxe: { name: "Handaxt", summary: "Die kleine Axt für eine Hand. Leicht genug für die zweite Hand." },
  javelin: {
    name: "Wurfspeer",
    summary: "Ein Speer, der zum Werfen gebaut ist. Im Nahkampf taugt er kaum — dann gilt er als improvisiert.",
  },
  kama: {
    name: "Kama",
    summary: "Eine Sichel aus dem Osten. Kann zu Fall bringen; Mönche dürfen sie mit ihrer Schlagfolge führen.",
  },
  kukri: {
    name: "Kukri",
    summary: "Ein schweres, geschwungenes Messer. Trifft besonders oft kritisch (ab 18).",
  },
  lance: {
    name: "Lanze",
    summary: "Die Waffe des Reiters. Vom Rücken eines Reittiers doppelter Schaden im Ansturm, und sie reicht 3 m weit.",
  },
  longbow: {
    name: "Langbogen",
    summary:
      "Der große Bogen: weite Reichweite, aber nicht vom Pferd aus zu führen. Ohne Kompositbau zählt Stärke nicht auf den Schaden.",
  },
  "longbow-composite": {
    name: "Kompositlangbogen",
    summary:
      "Ein Langbogen, auf eine bestimmte Stärke gebaut. Der Stärkebonus zählt auf den Schaden — bis zu dem Wert, für den er gebaut ist.",
  },
  longspear: {
    name: "Langspeer",
    summary: "Ein Speer für zwei Hände. Reicht 3 m weit und kann zum Aufspießen anstürmender Gegner aufgestellt werden.",
  },
  longsword: {
    name: "Langschwert",
    summary: "Die Standardklinge: eine Hand am Griff, die andere frei für den Schild.",
  },
  "mace-heavy": { name: "Schwerer Streitkolben", summary: "Ein Kolben für eine Hand. Klerikerwaffe seit immer." },
  "mace-light": { name: "Leichter Streitkolben", summary: "Der kleine Streitkolben. Leicht genug für die zweite Hand." },
  morningstar: {
    name: "Morgenstern",
    summary: "Kolben mit Stacheln — schlägt und sticht zugleich. Die einfachste Waffe, die jeder Kleriker führt.",
  },
  net: {
    name: "Wurfnetz",
    summary:
      "Kein Schaden: ein Treffer verstrickt den Gegner. Danach muss man das Netz erst wieder zusammenlegen (2 Runden).",
  },
  nunchaku: {
    name: "Nunchaku",
    summary: "Zwei Stäbe an einer Kette. Kann entwaffnen; Mönche führen sie mit ihrer Schlagfolge.",
  },
  "pick-heavy": {
    name: "Schwere Spitzhacke",
    summary: "Eine Hacke als Waffe. Trifft sie kritisch, vierfacher Schaden — der höchste Faktor im Regelwerk.",
  },
  "pick-light": {
    name: "Leichte Spitzhacke",
    summary: "Die kleine Hacke. Leicht genug für die zweite Hand, und vierfach kritisch.",
  },
  quarterstaff: {
    name: "Kampfstab",
    summary:
      "Ein Stab, an beiden Enden geführt. Gilt als zwei Waffen; kostet nichts und ist eine einfache Waffe.",
  },
  ranseur: {
    name: "Ranseur",
    summary: "Zweizack auf langem Schaft. Reicht 3 m weit und kann entwaffnen.",
  },
  rapier: {
    name: "Rapier",
    summary:
      "Die Stichklinge des Fechters. Trifft oft kritisch (ab 18) und lässt sich mit Kampfgeschick führen — aber nicht in der zweiten Hand.",
  },
  sai: {
    name: "Sai",
    summary: "Eine Gabelwaffe aus dem Osten. Kann entwaffnen; Mönche führen sie mit ihrer Schlagfolge.",
  },
  sap: {
    name: "Totschläger",
    summary: "Ein Lederbeutel mit Blei. Macht nichttödlichen Schaden — für Gegner, die man lebend will.",
  },
  scimitar: {
    name: "Krummschwert",
    summary: "Eine geschwungene Klinge für eine Hand. Trifft oft kritisch (ab 18).",
  },
  scythe: {
    name: "Sense",
    summary: "Die Bauernsense als Waffe. Kann zu Fall bringen und trifft vierfach kritisch.",
  },
  "shield-heavy": {
    name: "Schwerer Schild (als Waffe)",
    summary:
      "Mit dem Schild zuschlagen. Wer das tut, verliert bis zur nächsten Runde den RK-Bonus des Schildes — das Talent „Improved Shield Bash“ verhindert das.",
  },
  "shield-light": {
    name: "Leichter Schild (als Waffe)",
    summary: "Mit dem leichten Schild zuschlagen. Kostet bis zur nächsten Runde den RK-Bonus des Schildes.",
  },
  shortbow: {
    name: "Kurzbogen",
    summary: "Der kleine Bogen. Auch vom Reittier zu führen; Stärke zählt nicht auf den Schaden.",
  },
  "shortbow-composite": {
    name: "Kompositkurzbogen",
    summary:
      "Ein Kurzbogen, auf eine bestimmte Stärke gebaut. Der Stärkebonus zählt auf den Schaden, bis zu diesem Wert.",
  },
  shortspear: {
    name: "Kurzspeer",
    summary: "Ein Speer für eine Hand, auch zum Werfen.",
  },
  "shuriken-5": {
    name: "Shuriken (5)",
    summary: "Wurfsterne. Sie gelten als Munition, nicht als Waffe — Mönche werfen sie mit ihrer Schlagfolge.",
  },
  siangham: {
    name: "Siangham",
    summary: "Eine Stichwaffe aus dem Osten. Mönche führen sie mit ihrer Schlagfolge.",
  },
  sickle: {
    name: "Sichel",
    summary: "Das Erntewerkzeug als Waffe, Druidenwaffe. Kann zu Fall bringen.",
  },
  sling: {
    name: "Schleuder",
    summary: "Ein Riemen und ein Stein. Kostet nichts, und der Stärkebonus zählt auf den Schaden.",
  },
  spear: {
    name: "Speer",
    summary: "Der Speer für zwei Hände. Auch zu werfen, und zum Aufspießen anstürmender Gegner aufzustellen.",
  },
  "spiked-armor": {
    name: "Stachelrüstung (als Waffe)",
    summary: "Mit den Stacheln der eigenen Rüstung zuschlagen — auch als zweite Waffe.",
  },
  "spiked-shield-heavy": {
    name: "Schwerer Stachelschild (als Waffe)",
    summary: "Ein schwerer Schild mit Stacheln. Schlägt spitz statt stumpf zu.",
  },
  "spiked-shield-light": {
    name: "Leichter Stachelschild (als Waffe)",
    summary: "Ein leichter Schild mit Stacheln. Schlägt spitz statt stumpf zu.",
  },
  "sword-bastard": {
    name: "Bastardschwert",
    summary:
      "Zwischen Langschwert und Zweihänder. Einhändig nur mit Übung (dem Talent „Exotic Weapon Proficiency“), sonst zweihändig.",
  },
  "sword-short": {
    name: "Kurzschwert",
    summary: "Die kurze Klinge. Leicht genug für die zweite Hand — die Waffe des Zweiwaffenkämpfers.",
  },
  "sword-two-bladed": {
    name: "Doppelschwert",
    summary: "Eine Klinge an jedem Ende. Gilt als zwei Waffen, mit den Mali für den Kampf mit zwei Waffen.",
  },
  trident: {
    name: "Dreizack",
    summary: "Der Dreizack für eine Hand. Auch zu werfen und zum Aufstellen gegen Ansturm.",
  },
  "unarmed-strike": {
    name: "Waffenloser Schlag",
    summary:
      "Faust, Knie, Ellbogen. Macht nichttödlichen Schaden und provoziert einen freien Angriff des Gegners — außer beim Mönch oder mit dem Talent „Improved Unarmed Strike“.",
  },
  "urgrosh-dwarven": {
    name: "Zwergischer Urgrosh",
    summary: "Axt und Speerspitze an einem Schaft. Gilt als zwei Waffen und reicht nicht weiter als normal.",
  },
  "waraxe-dwarven": {
    name: "Zwergische Streitaxt",
    summary: "Die Axt der Zwerge: einhändig zu führen, wenn man die Übung dafür hat. Dreifach kritisch.",
  },
  warhammer: { name: "Kriegshammer", summary: "Der einhändige Hammer. Dreifach kritisch." },
  whip: {
    name: "Peitsche",
    summary:
      "Reicht 4,5 m weit, macht aber nur nichttödlichen Schaden und dringt nicht durch Rüstung (ab RK 1 aus Panzerung gar nichts). Kann entwaffnen und zu Fall bringen.",
  },
};

// ===========================================================================
//  Rüstung und Schilde — 18 Einträge
// ===========================================================================
const ARMOR: Record<string, ItemGerman> = {
  padded: {
    name: "Gepolsterte Rüstung",
    summary: "Wattierter Stoff. Die leichteste Rüstung überhaupt: kaum Schutz, aber sie behindert nichts.",
  },
  leather: {
    name: "Lederrüstung",
    summary: "Gekochtes, hartes Leder. Leicht, billig, ohne Malus auf Fertigkeiten.",
  },
  "studded-leather": {
    name: "Nietleder",
    summary: "Leder mit eingesetzten Metallnieten. Die stärkste leichte Rüstung, die niemand tragen lernen muss.",
  },
  "chain-shirt": {
    name: "Kettenhemd",
    summary: "Ein Hemd aus Ringen, unter der Kleidung tragbar. Die beste leichte Rüstung.",
  },
  hide: {
    name: "Fellrüstung",
    summary: "Dicke Tierhäute. Die Rüstung der Wildnis — Druiden dürfen sie tragen, Metall nicht.",
  },
  "scale-mail": {
    name: "Schuppenpanzer",
    summary: "Metallschuppen auf Leder. Mittlere Rüstung: brauchbarer Schutz, spürbare Behinderung.",
  },
  chainmail: {
    name: "Kettenrüstung",
    summary: "Ringgeflecht über den ganzen Körper. Guter Schutz, aber DEX zählt nur noch bis +2.",
  },
  breastplate: {
    name: "Brustplatte",
    summary: "Eine Metallplatte über Brust und Rücken. Von den mittleren Rüstungen die, die am wenigsten behindert.",
  },
  "splint-mail": {
    name: "Schienenpanzer",
    summary: "Metallschienen auf Leder. Schwere Rüstung: DEX zählt gar nicht mehr.",
  },
  "banded-mail": {
    name: "Bandrüstung",
    summary: "Überlappende Metallbänder. Schwerer Schutz, DEX zählt nur noch bis +1.",
  },
  "half-plate": {
    name: "Halbplatte",
    summary: "Platten und Kettengeflecht gemischt. Viel Schutz, aber der Malus auf Fertigkeiten ist −7.",
  },
  "full-plate": {
    name: "Vollplatte",
    summary:
      "Die beste Rüstung des Regelwerks, für den Träger maßgeschmiedet. +8 RK — und 1500 gp, 50 lb sowie eine Stunde Anlegezeit mit Hilfe.",
  },
  buckler: {
    name: "Faustschild",
    summary:
      "Ein kleiner Schild am Arm. Die Hand bleibt frei, auch zum Führen einer Waffe — greift man mit dieser Hand an, fällt der RK-Bonus bis zur nächsten Runde weg.",
  },
  "shield-light-wooden": {
    name: "Leichter Holzschild",
    summary: "Der kleine Holzschild: +1 RK, billig und leicht.",
  },
  "shield-light-steel": {
    name: "Leichter Stahlschild",
    summary: "Der kleine Stahlschild: +1 RK. Die Hand kann noch etwas halten, nur nicht damit angreifen.",
  },
  "shield-heavy-wooden": {
    name: "Schwerer Holzschild",
    summary: "Der große Holzschild: +2 RK. Leichter als Stahl, aber anfällig für Zauber, die Holz treffen.",
  },
  "shield-heavy-steel": {
    name: "Schwerer Stahlschild",
    summary: "Der große Stahlschild: +2 RK, und die Hand ist damit belegt.",
  },
  "shield-tower": {
    name: "Turmschild",
    summary:
      "Ein Schild wie eine Wand: +4 RK, oder man verschanzt sich ganz dahinter (volle Deckung, aber kein Angriff). Malus auf Fertigkeiten −10.",
  },
};

// ===========================================================================
//  Ausrüstung — 166 Einträge
// ===========================================================================
/*
  Hier lohnt die Erklärung am meisten. „Tanglefoot bag“ sagt einem deutschen
  Leser gar nichts, und die Werte-Zeile („50 gp · 4 lb“) auch nicht — was das
  Ding TUT, steht nirgends. Bei Waffen ist der Schaden schon daneben; hier ist
  der Satz die einzige Auskunft.
*/
const GEAR: Record<string, ItemGerman> = {
  "acid-flask": {
    name: "Säure (Fläschchen)",
    summary:
      "Wird als Granate geworfen (Angriff gegen RK 5). Trifft sie: 1d6 Säureschaden, in der Runde danach noch 1d6. Wer nebensteht, nimmt 1 Punkt.",
  },
  "alchemist-s-fire-flask": {
    name: "Alchemistenfeuer (Fläschchen)",
    summary:
      "Geworfene Brandflasche: 1d6 Feuer beim Treffer, danach brennt das Ziel 1d4 Runden weiter (jede Runde 1d6), bis es das Feuer löscht.",
  },
  "ale-gallon": { name: "Bier (Gallone)", summary: "Knapp vier Liter Bier — für die Gruppe." },
  "ale-mug": { name: "Bier (Krug)", summary: "Ein Krug Bier in der Schenke." },
  "antitoxin-vial": {
    name: "Gegengift (Fläschchen)",
    summary: "Getrunken: +5 auf Rettungswürfe gegen Gift, für eine Stunde. Eine Aktion zum Trinken.",
  },
  "armor-spikes": {
    name: "Rüstungsstacheln",
    summary:
      "Stacheln, an eine mittlere oder schwere Rüstung geschmiedet. Man kann damit zuschlagen — auch als zweite Waffe, während beide Hände etwas anderes halten.",
  },
  "artisan-s-outfit": {
    name: "Handwerkerkleidung",
    summary: "Robuste Arbeitskleidung mit vielen Taschen. Was ein Handwerker bei der Arbeit trägt.",
  },
  "backpack-empty": {
    name: "Rucksack (leer)",
    summary: "Ein Lederrucksack mit Riemen. Trägt gut 30 kg — das Gepäck des Abenteurers.",
  },
  "banquet-per-person": {
    name: "Festmahl (je Person)",
    summary: "Ein Festessen, wie es der Adel gibt. Preis für einen Gast.",
  },
  "barding-large-creature": {
    name: "Rossharnisch, großes Tier",
    summary:
      "Rüstung für ein Reittier der Größe Groß (etwa ein Pferd). Kostet das Vierfache der Menschenrüstung und wiegt doppelt so viel.",
  },
  "barding-medium-creature": {
    name: "Rossharnisch, mittelgroßes Tier",
    summary: "Rüstung für ein Reittier der Größe Mittel (etwa ein Pony). Kostet das Doppelte der Menschenrüstung.",
  },
  "barrel-empty": { name: "Fass (leer)", summary: "Ein Holzfass. Fasst etwa 120 Liter." },
  "basket-empty": { name: "Korb (leer)", summary: "Ein Weidenkorb zum Tragen." },
  bedroll: {
    name: "Schlafrolle",
    summary: "Decke und Unterlage, zusammengerollt. Wer damit im Freien schläft, schläft trocken.",
  },
  bell: { name: "Glocke", summary: "Eine kleine Handglocke. Als Alarm an einer Schnur oder Tür brauchbar." },
  "bit-and-bridle": { name: "Trense und Zaumzeug", summary: "Was ein Reittier am Kopf trägt, um gelenkt zu werden." },
  "blanket-winter": {
    name: "Winterdecke",
    summary: "Eine dicke Wolldecke. Hilft gegen Kälteschaden bei Nachtlager im Frost.",
  },
  "block-and-tackle": {
    name: "Flaschenzug",
    summary: "Ein Seilzug mit Rollen. Vervierfacht, was man heben kann, und gibt +5 auf Stärkeproben zum Heben.",
  },
  "bottle-wine-glass": { name: "Weinflasche, Glas", summary: "Eine Glasflasche, etwa 0,7 Liter." },
  "bread-per-loaf": { name: "Brot (je Laib)", summary: "Ein Laib Brot. Eine Mahlzeit." },
  "bucket-empty": { name: "Eimer (leer)", summary: "Ein Holzeimer, etwa 8 Liter." },
  caltrops: {
    name: "Krähenfüße",
    summary:
      "Vierzackige Eisenspitzen, auf den Boden gestreut. Wer hineinläuft, wird angegriffen (RK 10 gegen einen Angriff mit +0); ein Treffer macht 1 Schaden und halbiert die Bewegung.",
  },
  candle: {
    name: "Kerze",
    summary: "Beleuchtet 1,5 m mit schwachem Licht, für eine Stunde. Zum Lesen reicht es kaum.",
  },
  "canvas-sq-yd": { name: "Segeltuch (Quadratmeter)", summary: "Grobes Tuch — für Segel, Zelte und Planen." },
  carriage: {
    name: "Kutsche",
    summary: "Ein gefederter Vierradwagen für vier Personen. Braucht zwei Zugtiere und eine Straße.",
  },
  cart: { name: "Karren", summary: "Ein zweirädriger Wagen. Ein Zugtier zieht ihn, er trägt gut 200 kg." },
  "case-map-or-scroll": {
    name: "Karten- oder Rollenhülse",
    summary: "Eine Lederhülse. Schützt Karten und Schriftrollen vor Nässe und Knick.",
  },
  "chain-10-ft": {
    name: "Kette (3 m)",
    summary: "Eine Eisenkette. Hält 300 kg; zum Sprengen braucht es eine Stärkeprobe gegen SG 26.",
  },
  "chalk-1-piece": { name: "Kreide (1 Stück)", summary: "Ein Stück Kreide. Zum Markieren von Wegen im Verlies." },
  "cheese-hunk-of": { name: "Käse (Stück)", summary: "Ein Stück Käse. Eine Mahlzeit." },
  "chest-empty": { name: "Truhe (leer)", summary: "Eine Holztruhe, etwa 60 Liter. Lässt sich verschließen." },
  "cleric-s-vestments": {
    name: "Priestergewand",
    summary: "Das Gewand für den Gottesdienst — nicht die Rüstung, sondern das Zeichen des Amtes.",
  },
  "coach-cab": {
    name: "Mietkutsche",
    summary: "Eine Fahrt in der Stadt: 3 kp je Meile, außerhalb der Stadt 1 sp je Meile.",
  },
  "cold-weather-outfit": {
    name: "Winterkleidung",
    summary: "Pelzmantel, Handschuhe, Kapuze. Gibt +5 auf Rettungswürfe gegen Kälteschaden.",
  },
  "courtier-s-outfit": {
    name: "Hofkleidung",
    summary:
      "Gute Kleidung für den Hof. Ohne Schmuck im Wert von 50 gp dazu fällt man dort auf — die kosten extra.",
  },
  crowbar: { name: "Brechstange", summary: "Ein Eisenhebel. Gibt +2 auf Stärkeproben, wo Hebeln hilft." },
  "dog-guard": { name: "Wachhund", summary: "Ein abgerichteter Hund, der Wache hält und angreift." },
  "dog-riding": {
    name: "Reithund",
    summary: "Ein großer Hund, den Halblinge und Gnome als Reittier nehmen.",
  },
  "donkey-or-mule": {
    name: "Esel oder Maultier",
    summary: "Das geduldigste Lasttier. Trägt viel, geht überall, und ist billig.",
  },
  "entertainer-s-outfit": {
    name: "Gauklerkleidung",
    summary: "Auffällige Kleidung mit Bändern und Glöckchen. Was ein Barde auf der Bühne trägt.",
  },
  "everburning-torch": {
    name: "Ewige Fackel",
    summary:
      "Eine Fackel mit einem dauerhaften Lichtzauber: Licht wie eine Fackel, für immer, ohne Hitze und ohne Feuer. Kann nicht ausgehen.",
  },
  "explorer-s-outfit": {
    name: "Abenteurerkleidung",
    summary: "Stiefel, Gürtel, Mantel, Hut — die praktische Kleidung für draußen. Was die meisten tragen.",
  },
  "feed-per-day": { name: "Futter (je Tag)", summary: "Hafer und Heu für ein Reittier, ein Tag." },
  "firewood-per-day": { name: "Feuerholz (je Tag)", summary: "Holz für ein Lagerfeuer, eine Nacht." },
  fishhook: { name: "Angelhaken", summary: "Ein Haken aus Knochen oder Eisen. Zum Fischen unterwegs." },
  "fishing-net-25-sq-ft": {
    name: "Fischnetz (2,3 m²)",
    summary: "Ein Netz zum Fischen — keine Waffe (das ist das Wurfnetz).",
  },
  "flask-empty": { name: "Fläschchen (leer)", summary: "Ein Tonfläschchen mit Stopfen, etwa 0,5 Liter." },
  "flint-and-steel": {
    name: "Feuerstein und Stahl",
    summary: "Feuer machen: eine volle Aktion. Ohne das dauert es eine Minute und länger.",
  },
  galley: {
    name: "Galeere",
    summary: "Ein Ruderkriegsschiff mit 200 Ruderern. Fährt 4 Meilen die Stunde, aber nicht auf hoher See.",
  },
  "gauntlet-locked": {
    name: "Verriegelter Panzerhandschuh",
    summary:
      "Ein Handschuh, der um die Waffe geschlossen wird: +10 gegen Entwaffnen, aber Ablegen dauert eine volle Runde und das Greifen mit dieser Hand geht −2.",
  },
  "grappling-hook": {
    name: "Wurfhaken",
    summary: "Ein Haken am Seil. Werfen ist ein Angriff gegen SG 10 plus 2 je 3 m Höhe.",
  },
  hammer: { name: "Hammer", summary: "Ein Schlosserhammer. Zum Einschlagen von Pflöcken, nicht zum Kämpfen." },
  "hireling-trained": {
    name: "Gelernter Gehilfe",
    summary: "Ein bezahlter Fachmann — Schreiber, Schmied, Führer. 3 sp am Tag oder mehr.",
  },
  "hireling-untrained": {
    name: "Ungelernter Gehilfe",
    summary: "Ein Träger oder Handlanger. 1 sp am Tag.",
  },
  "holy-water-flask": {
    name: "Weihwasser (Fläschchen)",
    summary:
      "Geworfen wie eine Granate: 2d4 Schaden an Untoten und bösen Außenweltlichen, 1 Punkt für Nebenstehende. Anderen tut es nichts.",
  },
  "horse-heavy": { name: "Schweres Pferd", summary: "Ein Kaltblut — Zugpferd, kein Kampfpferd." },
  "horse-light": { name: "Leichtes Pferd", summary: "Ein Reitpferd. Trägt einen Reiter samt Gepäck 8 Meilen die Stunde." },
  "horse-pony": { name: "Pony", summary: "Ein kleines Pferd, das Reittier für Halblinge und Gnome." },
  "horse-warhorse-heavy": {
    name: "Schweres Streitross",
    summary: "Ein Kampfpferd für den Ritter: trägt Rossharnisch, greift selbst an und scheut nicht.",
  },
  "horse-warhorse-light": {
    name: "Leichtes Streitross",
    summary: "Ein schnelleres Kampfpferd. Greift selbst an und scheut im Kampf nicht.",
  },
  "horse-warpony": { name: "Kampfpony", summary: "Ein Pony, das für den Kampf abgerichtet ist." },
  "ink-1-oz-vial": { name: "Tinte (Fläschchen)", summary: "Schwarze Tinte. Was ein Zauberer für sein Zauberbuch braucht." },
  inkpen: { name: "Federkiel", summary: "Eine Schreibfeder." },
  "inn-stay-per-day-common": {
    name: "Herberge (je Tag), einfach",
    summary: "Ein Strohbett im Gemeinschaftszimmer, mit Dach.",
  },
  "inn-stay-per-day-good": {
    name: "Herberge (je Tag), gut",
    summary: "Ein eigenes Zimmer mit richtigem Bett.",
  },
  "inn-stay-per-day-poor": {
    name: "Herberge (je Tag), ärmlich",
    summary: "Ein Platz auf dem Boden im Schankraum.",
  },
  "jug-clay": { name: "Krug, Ton", summary: "Ein Tonkrug mit Stopfen, etwa 4 Liter." },
  keelboat: {
    name: "Kielboot",
    summary: "Ein Flussboot, 15 bis 22 m. Fährt Flüsse und Küsten, 1 Meile die Stunde.",
  },
  "ladder-10-foot": { name: "Leiter (3 m)", summary: "Eine Holzleiter. Sperrig, aber sie spart eine Kletterprobe." },
  "lamp-common": {
    name: "Öllampe",
    summary: "Beleuchtet 4,5 m, brennt 6 Stunden mit einem halben Liter Öl. Geht im Wind aus.",
  },
  "lantern-bullseye": {
    name: "Blendlaterne",
    summary: "Wirft einen Lichtkegel 18 m weit. Sechs Stunden mit einem halben Liter Öl.",
  },
  "lantern-hooded": {
    name: "Sturmlaterne",
    summary: "Beleuchtet 9 m rundum und geht im Wind nicht aus. Sechs Stunden mit einem halben Liter Öl.",
  },
  "lock-amazing": { name: "Schloss, hervorragend", summary: "Ein Meisterschloss. Zu öffnen gegen SG 40." },
  "lock-average": { name: "Schloss, mittel", summary: "Ein gewöhnliches Schloss. Zu öffnen gegen SG 25." },
  "lock-good": { name: "Schloss, gut", summary: "Ein gutes Schloss. Zu öffnen gegen SG 30." },
  "lock-very-simple": { name: "Schloss, sehr einfach", summary: "Ein billiges Schloss. Zu öffnen gegen SG 20." },
  longship: {
    name: "Langschiff",
    summary: "Ein Ruderschiff mit Segel, 22 bis 23 m, 40 Ruderer. Auch auf offener See zu fahren.",
  },
  manacles: {
    name: "Handschellen",
    summary: "Fesseln für einen mittelgroßen Gefangenen. Aufbrechen gegen SG 26, Schloss öffnen gegen SG 30.",
  },
  "manacles-masterwork": {
    name: "Meisterhafte Handschellen",
    summary: "Bessere Fesseln: das Schloss öffnet erst gegen SG 40.",
  },
  "meals-per-day-common": { name: "Verpflegung (je Tag), einfach", summary: "Brot, Käse, Suppe — satt wird man." },
  "meals-per-day-good": { name: "Verpflegung (je Tag), gut", summary: "Fleisch, Brot, Wein." },
  "meals-per-day-poor": { name: "Verpflegung (je Tag), ärmlich", summary: "Grütze und Wasser." },
  "meat-chunk-of": { name: "Fleisch (Stück)", summary: "Ein Stück Fleisch. Eine Mahlzeit." },
  messenger: { name: "Bote", summary: "Ein bezahlter Läufer oder Reiter: 2 kp je Meile." },
  "mirror-small-steel": {
    name: "Kleiner Stahlspiegel",
    summary: "Ein polierter Stahlspiegel. Um die Ecke sehen, Blicke abwenden, Signale geben.",
  },
  "monk-s-outfit": {
    name: "Mönchskleidung",
    summary: "Eine schlichte Robe mit Gürtel. Sitzt so, dass sie beim Kämpfen nicht hindert.",
  },
  "mug-tankard-clay": { name: "Becher/Krug, Ton", summary: "Ein Trinkgefäß aus Ton." },
  "noble-s-outfit": {
    name: "Adelskleidung",
    summary: "Seide, Samt, Pelz. Enthält Schmuck im Wert von 100 gp — wer damit auftritt, gilt als von Stand.",
  },
  oar: { name: "Ruder", summary: "Ein Ruder für ein Boot." },
  "oil-1-pint-flask": {
    name: "Öl (halber Liter)",
    summary: "Lampenöl. Angezündet und geworfen macht es 1d3 Feuerschaden, oder es brennt am Boden 2 Runden.",
  },
  "one-pig": { name: "Ein Schwein", summary: "Handelsware: ein Schwein." },
  "one-pound-of-cinnamon-or-one-goat": {
    name: "Ein Pfund Zimt oder eine Ziege",
    summary: "Handelsware im Wert von 1 gp.",
  },
  "one-pound-of-flour-or-one-chicken": {
    name: "Ein Pfund Mehl oder ein Huhn",
    summary: "Handelsware im Wert von 2 kp.",
  },
  "one-pound-of-ginger-or-pepper-or-one-sheep": {
    name: "Ein Pfund Ingwer oder Pfeffer oder ein Schaf",
    summary: "Handelsware im Wert von 2 gp.",
  },
  "one-pound-of-gold": { name: "Ein Pfund Gold", summary: "Handelsware im Wert von 50 gp." },
  "one-pound-of-iron": { name: "Ein Pfund Eisen", summary: "Handelsware im Wert von 1 sp." },
  "one-pound-of-platinum": { name: "Ein Pfund Platin", summary: "Handelsware im Wert von 500 gp." },
  "one-pound-of-saffron-or-cloves-or-one-ox": {
    name: "Ein Pfund Safran oder Gewürznelken oder ein Ochse",
    summary: "Handelsware im Wert von 15 gp.",
  },
  "one-pound-of-salt-or-silver": {
    name: "Ein Pfund Salz oder Silber",
    summary: "Handelsware im Wert von 5 gp.",
  },
  "one-pound-of-tobacco-or-copper": {
    name: "Ein Pfund Tabak oder Kupfer",
    summary: "Handelsware im Wert von 5 sp.",
  },
  "one-pound-of-wheat": { name: "Ein Pfund Weizen", summary: "Handelsware im Wert von 1 kp." },
  "one-square-yard-of-linen": { name: "Ein Quadratmeter Leinen", summary: "Handelsware im Wert von 4 gp." },
  "one-square-yard-of-silk-or-one-cow": {
    name: "Ein Quadratmeter Seide oder eine Kuh",
    summary: "Handelsware im Wert von 10 gp.",
  },
  "paper-sheet": { name: "Papier (Blatt)", summary: "Ein Blatt Papier. Teurer als Pergament, aber glatter." },
  "parchment-sheet": { name: "Pergament (Blatt)", summary: "Ein Blatt Pergament. Was man beschreibt, wenn es halten soll." },
  "peasant-s-outfit": { name: "Bauernkleidung", summary: "Hemd und Hose aus grobem Stoff. Das Billigste, was es gibt." },
  "pick-miner-s": { name: "Bergmannshacke", summary: "Eine Spitzhacke zum Graben. Als Waffe taugt sie schlecht." },
  "pitcher-clay": { name: "Kanne, Ton", summary: "Eine Tonkanne, etwa 2 Liter." },
  piton: {
    name: "Felshaken",
    summary: "Ein Eisenhaken, der in eine Felsspalte geschlagen wird. Ein Seil daran hält den Sturz.",
  },
  "pole-10-foot": {
    name: "Stange (3 m)",
    summary: "Eine Holzstange. Damit tastet man den Boden ab, ohne selbst in die Falle zu treten.",
  },
  "pot-iron": { name: "Kochtopf, Eisen", summary: "Ein Eisentopf zum Kochen am Lagerfeuer." },
  "pouch-belt-empty": {
    name: "Gürteltasche (leer)",
    summary: "Eine kleine Ledertasche am Gürtel. Etwa 1 Liter — für Münzen und Kleinkram.",
  },
  "ram-portable": {
    name: "Tragbarer Rammbock",
    summary: "Ein Balken mit Griffen: +2 auf Stärkeproben zum Eintreten von Türen, und ein zweiter kann mithelfen (+2 mehr).",
  },
  "rations-trail-per-day": {
    name: "Trockenproviant (je Tag)",
    summary: "Dörrfleisch, Nüsse, Zwieback. Verdirbt nicht — das Essen für unterwegs.",
  },
  "road-or-gate-toll": { name: "Weg- oder Torzoll", summary: "Was das Stadttor oder die Brücke kostet." },
  "rope-hempen-50-ft": {
    name: "Hanfseil (15 m)",
    summary: "Ein Seil, das 2 TP hat und 0 Panzerung: mit einer Waffe in zwei Runden durchzutrennen.",
  },
  "rope-silk-50-ft": {
    name: "Seidenseil (15 m)",
    summary: "Halb so schwer wie Hanf und stärker (4 TP). Gibt +2 auf Kletterproben.",
  },
  rowboat: { name: "Ruderboot", summary: "Ein Boot für drei Personen, 2,5 bis 3,5 m. Eine halbe Meile die Stunde." },
  "royal-outfit": {
    name: "Königsgewand",
    summary: "Hermelin, Goldbrokat, Juwelen. Enthält Schmuck im Wert von 5000 gp — man trägt es nicht auf Reisen.",
  },
  "sack-empty": { name: "Sack (leer)", summary: "Ein Leinensack. Fasst gut 15 kg." },
  "saddle-exotic-military": {
    name: "Exotischer Kampfsattel",
    summary:
      "Kampfsattel für ein ungewöhnliches Reittier (Greif, Riesenwolf). Man bleibt darin, auch wenn man bewusstlos wird.",
  },
  "saddle-exotic-pack": {
    name: "Exotischer Packsattel",
    summary: "Lastsattel für ein ungewöhnliches Reittier.",
  },
  "saddle-exotic-riding": {
    name: "Exotischer Reitsattel",
    summary: "Reitsattel für ein ungewöhnliches Reittier.",
  },
  "saddle-military": {
    name: "Kampfsattel",
    summary: "Der Sattel des Ritters: +2 auf Reiten, um darin zu bleiben, und man fällt nicht heraus, wenn man bewusstlos wird.",
  },
  "saddle-pack": { name: "Packsattel", summary: "Ein Lastsattel — hält Gepäck, nicht Reiter." },
  "saddle-riding": { name: "Reitsattel", summary: "Der gewöhnliche Sattel zum Reiten." },
  saddlebags: { name: "Satteltaschen", summary: "Taschen hinter dem Sattel. Fassen zusammen gut 15 kg." },
  "sailing-ship": {
    name: "Segelschiff",
    summary: "Ein Handelsschiff, 23 bis 27 m, für 20 Mann Besatzung. Fährt hohe See, 2 Meilen die Stunde.",
  },
  "scholar-s-outfit": {
    name: "Gelehrtenkleidung",
    summary: "Robe, Gürtel, Mütze — und eine Tasche für Bücher und Schreibzeug.",
  },
  "sealing-wax": { name: "Siegelwachs", summary: "Wachs, um Briefe zu versiegeln." },
  "sewing-needle": { name: "Nähnadel", summary: "Eine Nadel aus Stahl. Nähen, flicken — oder ein Schloss reizen." },
  "shield-spikes": {
    name: "Schildstacheln",
    summary: "Stacheln auf dem Schild. Der Schildschlag macht damit spitzen statt stumpfen Schaden, und mehr davon.",
  },
  "ship-s-passage": { name: "Schiffspassage", summary: "Eine Überfahrt: 1 sp je Meile." },
  "signal-whistle": { name: "Signalpfeife", summary: "Eine Pfeife, weit zu hören. Zum Alarmschlagen." },
  "signet-ring": { name: "Siegelring", summary: "Ein Ring mit Wappen. Damit siegelt man Briefe und weist sich aus." },
  sled: { name: "Schlitten", summary: "Ein Schlitten für Schnee und Eis. Trägt gut 300 kg." },
  sledge: { name: "Vorschlaghammer", summary: "Der große Hammer. Zum Einschlagen, nicht zum Kämpfen." },
  smokestick: {
    name: "Rauchstab",
    summary:
      "Angezündet füllt er in einer Runde einen Würfel von 3 m Kante mit dichtem Rauch, der eine Runde bleibt. Wer darin steht, sieht nichts.",
  },
  "soap-per-lb": { name: "Seife (je Pfund)", summary: "Seife. Auch nützlich, um etwas glatt zu machen." },
  "spade-or-shovel": { name: "Spaten oder Schaufel", summary: "Zum Graben. Als Waffe untauglich." },
  "spell-0-level": {
    name: "Zauberdienst, Grad 0",
    summary: "Was ein Tempel oder Magier für einen Zauber dieses Grades nimmt: 5 gp.",
  },
  "spell-1st-level": { name: "Zauberdienst, Grad 1", summary: "Ein gekaufter Zauber vom Grad 1: 10 gp." },
  "spell-2nd-level": { name: "Zauberdienst, Grad 2", summary: "Ein gekaufter Zauber vom Grad 2: 20 gp." },
  "spell-3rd-level": { name: "Zauberdienst, Grad 3", summary: "Ein gekaufter Zauber vom Grad 3: 30 gp." },
  "spell-4th-level": { name: "Zauberdienst, Grad 4", summary: "Ein gekaufter Zauber vom Grad 4: 40 gp." },
  "spell-5th-level": { name: "Zauberdienst, Grad 5", summary: "Ein gekaufter Zauber vom Grad 5: 50 gp." },
  "spell-6th-level": { name: "Zauberdienst, Grad 6", summary: "Ein gekaufter Zauber vom Grad 6: 60 gp." },
  "spell-7th-level": { name: "Zauberdienst, Grad 7", summary: "Ein gekaufter Zauber vom Grad 7: 70 gp." },
  "spell-8th-level": { name: "Zauberdienst, Grad 8", summary: "Ein gekaufter Zauber vom Grad 8: 80 gp." },
  "spell-9th-level": { name: "Zauberdienst, Grad 9", summary: "Ein gekaufter Zauber vom Grad 9: 90 gp." },
  spyglass: {
    name: "Fernrohr",
    summary: "Zeigt Dinge doppelt so groß. Man sieht damit, was zwei Wegstrecken weiter liegt.",
  },
  "stabling-per-day": { name: "Stallung (je Tag)", summary: "Stall und Futter für ein Reittier, eine Nacht." },
  sunrod: {
    name: "Sonnenstab",
    summary:
      "Ein Eisenstab, der auf einen Schlag hell aufleuchtet: helles Licht 9 m weit, sechs Stunden lang. Kein Feuer, geht nicht im Wind aus.",
  },
  "tanglefoot-bag": {
    name: "Klebebeutel",
    summary:
      "Geworfen (Angriff gegen RK 5). Trifft er, wird das Ziel festgeklebt: −2 auf Angriff, −4 DEX, keine Bewegung wenn der Rettungswurf (Reflex SG 15) misslingt.",
  },
  tent: { name: "Zelt", summary: "Ein Zelt für zwei. In 20 Minuten aufgebaut." },
  thunderstone: {
    name: "Donnerstein",
    summary:
      "Geworfen (auf ein Feld, RK 5): ein Knall, der alle im Umkreis von 3 m für eine Stunde betäubt — Rettungswurf Fortitude SG 15.",
  },
  tindertwig: {
    name: "Zündholz",
    summary: "Ein alchemistisches Streichholz. Feuer machen kostet damit nur eine Standardaktion.",
  },
  torch: {
    name: "Fackel",
    summary:
      "Beleuchtet 6 m, brennt eine Stunde. Als Waffe macht sie 1 Punkt stumpf und 1 Punkt Feuer.",
  },
  "traveler-s-outfit": { name: "Reisekleidung", summary: "Stiefel, Hose, Hemd, Gürtel, Mantel — schlicht und haltbar." },
  "vial-ink-or-potion": {
    name: "Fläschchen (Tinte oder Trank)",
    summary: "Ein Glasfläschchen mit Stopfen, 30 ml. Was man für Tränke und Tinte braucht.",
  },
  wagon: { name: "Wagen", summary: "Ein vierrädriger Lastwagen. Zwei Zugtiere, trägt gut 400 kg." },
  warship: {
    name: "Kriegsschiff",
    summary: "Ein Segelkriegsschiff, 30 m, 60 bis 80 Mann. Trägt Rammsporn und Katapulte.",
  },
  waterskin: { name: "Wasserschlauch", summary: "Ein Lederschlauch, etwa 2 Liter. Wasser für einen Tag." },
  whetstone: { name: "Wetzstein", summary: "Ein Schleifstein. Hält Klingen scharf." },
  "wine-common-pitcher": { name: "Wein, einfach (Kanne)", summary: "Eine Kanne Landwein." },
  "wine-fine-bottle": { name: "Wein, gut (Flasche)", summary: "Eine Flasche guter Wein." },
};

// ===========================================================================
//  Werkzeug und Ausstattung — 20 Einträge
// ===========================================================================
const TOOLS: Record<string, ItemGerman> = {
  "alchemist-s-lab": {
    name: "Alchemistenlabor",
    summary: "Kolben, Brenner, Waagen. Gibt +2 auf Handwerk (Alchemie) — ohne Labor geht es gar nicht.",
  },
  "artisan-s-tools": {
    name: "Handwerkszeug",
    summary: "Das Werkzeug eines Berufs. Ohne es hat man −2 auf Handwerk, damit gar keinen Malus.",
  },
  "artisan-s-tools-masterwork": {
    name: "Meisterhaftes Handwerkszeug",
    summary: "Besonders gutes Werkzeug: +2 auf die Handwerksfertigkeit, für die es gemacht ist.",
  },
  "climber-s-kit": {
    name: "Kletterausrüstung",
    summary: "Haken, Ösen, Gurt, Handschuhe. Gibt +2 auf Klettern.",
  },
  "disguise-kit": {
    name: "Verkleidungsset",
    summary: "Schminke, Haare, Kleiderteile. Gibt +2 auf Verkleiden; reicht für zehn Verkleidungen.",
  },
  "healer-s-kit": {
    name: "Heilerbesteck",
    summary: "Verbände, Salben, Nadeln. Gibt +2 auf Heilkunde; reicht für zehn Anwendungen.",
  },
  "holly-and-mistletoe": {
    name: "Stechpalme und Mistel",
    summary: "Der göttliche Fokus des Druiden. Was er in der Hand hält, um zu zaubern — es kostet nichts.",
  },
  "holy-symbol-silver": {
    name: "Heiliges Symbol, Silber",
    summary: "Das Zeichen der Gottheit in Silber. Der Fokus für Klerikerzauber und zum Bannen von Untoten.",
  },
  "holy-symbol-wooden": {
    name: "Heiliges Symbol, Holz",
    summary: "Dasselbe aus Holz. Wirkt genauso gut wie das silberne — nur billiger.",
  },
  hourglass: { name: "Sanduhr", summary: "Eine Sanduhr. Misst eine Stunde." },
  "magnifying-glass": {
    name: "Lupe",
    summary: "Eine Glaslinse. Gibt +2 auf Schätzen bei kleinen oder feinen Dingen, und kann Feuer entzünden.",
  },
  "musical-instrument-common": {
    name: "Musikinstrument, einfach",
    summary: "Laute, Flöte, Trommel — womit ein Barde auftritt.",
  },
  "musical-instrument-masterwork": {
    name: "Musikinstrument, meisterhaft",
    summary: "Ein besonders gutes Instrument: +2 auf Auftreten mit diesem Instrument.",
  },
  "scale-merchant-s": {
    name: "Kaufmannswaage",
    summary: "Eine kleine Balkenwaage mit Gewichten. Gibt +2 auf Schätzen bei Waren, die man wiegen kann.",
  },
  "spell-component-pouch": {
    name: "Komponentenbeutel",
    summary:
      "Der Beutel mit allen Kleinigkeiten, die Zauber verlangen. Ohne ihn geht kein Zauber, der Material braucht.",
  },
  "spellbook-wizard-s-blank": {
    name: "Zauberbuch (leer)",
    summary:
      "100 Seiten Pergament in Leder. Ein Zauber braucht so viele Seiten, wie sein Grad hat (Grad 0: eine Seite).",
  },
  "thieves-tools": {
    name: "Diebeswerkzeug",
    summary:
      "Dietriche, Feilen, Spiegelchen. Ohne sie hat man −2 auf Mechanismus ausschalten und kann Schlösser gar nicht öffnen.",
  },
  "thieves-tools-masterwork": {
    name: "Meisterhaftes Diebeswerkzeug",
    summary: "Besseres Werkzeug: +2 auf Schlösser öffnen und Mechanismus ausschalten.",
  },
  "tool-masterwork": {
    name: "Meisterhaftes Werkzeug",
    summary: "Gutes Werkzeug für eine Fertigkeit, die kein anderes Set hat: +2 auf diese Fertigkeit.",
  },
  "water-clock": {
    name: "Wasseruhr",
    summary: "Eine Uhr, die auf eine halbe Stunde genau geht. Groß, teuer und nicht zu tragen.",
  },
};

// ===========================================================================
//  Ringe, Zepter, Stäbe — 160 Einträge
// ===========================================================================
/*
  Diese drei Arten heißen im Regelwerk nach ihrer WIRKUNG, nicht nach dem Ding:
  der Eintrag heißt „Climbing“, gemeint ist „Ring of Climbing“. Am Bogen stand
  deshalb bisher nur „Climbing“ im Gepäck — ohne ein Wort darüber, dass es ein
  Ring ist. Der deutsche Name schreibt die Art mit hin.
*/
const RINGS: Record<string, ItemGerman> = {
  "adamant-law": { name: "Ring des unbeugsamen Gesetzes" },
  "animal-friendship": {
    name: "Ring der Tierfreundschaft",
    summary: "Wirkt dreimal am Tag Animal Friendship auf ein Tier.",
  },
  blinking: {
    name: "Ring des Flackerns",
    summary: "Wirkt Blinking auf Befehl: man flackert zwischen den Ebenen und ist schwer zu treffen.",
  },
  "chameleon-power": {
    name: "Ring der Chamäleonhaut",
    summary: "Immer +10 auf Verstecken, und zweimal am Tag ein Wirken von Change Self.",
  },
  "chaotic-fury": { name: "Ring des chaotischen Zorns" },
  climbing: { name: "Ring des Kletterns", summary: "Immer +5 auf Klettern." },
  "climbing-improved": { name: "Ring des Kletterns, verbessert", summary: "Immer +10 auf Klettern." },
  counterspells: {
    name: "Ring der Gegenzauber",
    summary:
      "Ein Zauber bis Grad 6 lässt sich in den Ring legen. Trifft derselbe Zauber den Träger, wird er von allein abgewehrt.",
  },
  "djinni-calling": {
    name: "Ring des Dschinnrufs",
    summary: "Ruft einmal am Tag einen Dschinn, der dem Träger eine Stunde dient.",
  },
  "energy-immunity": { name: "Ring der Energieimmunität" },
  "energy-resistance-greater": {
    name: "Ring der Energieresistenz, groß",
    summary: "Widerstand 30 gegen eine Energieart (Feuer, Kälte, Säure, Blitz oder Schall).",
  },
  "energy-resistance-major": {
    name: "Ring der Energieresistenz, stark",
    summary: "Widerstand 20 gegen eine Energieart.",
  },
  "energy-resistance-minor": {
    name: "Ring der Energieresistenz, klein",
    summary: "Widerstand 10 gegen eine Energieart.",
  },
  "epic-wizardry-ix": {
    name: "Ring der epischen Zauberkunst IX",
    summary: "Verdoppelt die arkanen Zauberplätze des Grades 9 — episch, also erst ab Stufe 21.",
  },
  "epic-wizardry-v": {
    name: "Ring der epischen Zauberkunst V",
    summary: "Verdoppelt die arkanen Zauberplätze des Grades 5 — episch, also erst ab Stufe 21.",
  },
  "epic-wizardry-vi": {
    name: "Ring der epischen Zauberkunst VI",
    summary: "Verdoppelt die arkanen Zauberplätze des Grades 6 — episch, also erst ab Stufe 21.",
  },
  "epic-wizardry-vii": {
    name: "Ring der epischen Zauberkunst VII",
    summary: "Verdoppelt die arkanen Zauberplätze des Grades 7 — episch, also erst ab Stufe 21.",
  },
  "epic-wizardry-viii": {
    name: "Ring der epischen Zauberkunst VIII",
    summary: "Verdoppelt die arkanen Zauberplätze des Grades 8 — episch, also erst ab Stufe 21.",
  },
  evasion: {
    name: "Ring des Ausweichens",
    summary: "Gibt Evasion: bei einem geschafften Reflex-Rettungswurf gar kein Schaden statt halbem.",
  },
  "feather-falling": {
    name: "Ring des Federfalls",
    summary: "Wirkt von allein Feather Fall, sobald der Träger fällt. Ein Sturz tut nichts mehr.",
  },
  "force-shield": {
    name: "Ring des Kraftschilds",
    summary: "Ein unsichtbarer Schild am Arm: +2 RK, ohne eine Hand zu belegen.",
  },
  "freedom-of-movement": {
    name: "Ring der Bewegungsfreiheit",
    summary: "Wirkt dauerhaft Freedom of Movement: nichts kann den Träger festhalten oder verlangsamen.",
  },
  "friend-shield": {
    name: "Ring des Freundschaftsschilds",
    summary: "Ein Paar Ringe: der eine Träger kann die Hälfte des Schadens des anderen auf sich nehmen.",
  },
  "ineffable-evil": { name: "Ring des unaussprechlichen Bösen" },
  "invisibility-ring": {
    name: "Ring der Unsichtbarkeit",
    summary: "Macht den Träger auf Befehl unsichtbar, so oft er will.",
  },
  ironskin: { name: "Ring der Eisenhaut" },
  jumping: { name: "Ring des Springens", summary: "Immer +10 auf Springen." },
  "jumping-improved": { name: "Ring des Springens, verbessert", summary: "Immer +20 auf Springen." },
  "mind-shielding": {
    name: "Ring des Geistesschilds",
    summary: "Kein Zauber kann die Gedanken des Trägers lesen, ihn aufspüren oder seine Gesinnung erkennen.",
  },
  "protection-10": {
    name: "Ring des Schutzes +10",
    summary: "+10 RK als Ablenkungsbonus, jenseits von +5 — episch, also erst ab Stufe 21.",
  },
  "protection-6": {
    name: "Ring des Schutzes +6",
    summary: "+6 RK als Ablenkungsbonus, jenseits von +5 — episch, also erst ab Stufe 21.",
  },
  "protection-7": {
    name: "Ring des Schutzes +7",
    summary: "+7 RK als Ablenkungsbonus, jenseits von +5 — episch, also erst ab Stufe 21.",
  },
  "protection-8": {
    name: "Ring des Schutzes +8",
    summary: "+8 RK als Ablenkungsbonus, jenseits von +5 — episch, also erst ab Stufe 21.",
  },
  "protection-9": {
    name: "Ring des Schutzes +9",
    summary: "+9 RK als Ablenkungsbonus, jenseits von +5 — episch, also erst ab Stufe 21.",
  },
  "protection-ring-1": { name: "Ring des Schutzes +1", summary: "+1 RK, als Ablenkungsbonus — er gilt auch, wenn man überrascht ist." },
  "protection-ring-2": { name: "Ring des Schutzes +2", summary: "+2 RK als Ablenkungsbonus." },
  "protection-ring-3": { name: "Ring des Schutzes +3", summary: "+3 RK als Ablenkungsbonus." },
  "protection-ring-4": { name: "Ring des Schutzes +4", summary: "+4 RK als Ablenkungsbonus." },
  "protection-ring-5": { name: "Ring des Schutzes +5", summary: "+5 RK als Ablenkungsbonus." },
  ram: {
    name: "Ring des Rammbocks",
    summary: "Schlägt aus der Ferne zu wie ein Rammbock — auch zum Aufbrechen von Türen. Drei Ladungen am Tag.",
  },
  "rapid-healing": { name: "Ring der schnellen Heilung" },
  regeneration: {
    name: "Ring der Regeneration",
    summary: "Heilt den Träger von allein: 1 TP je Stunde, und abgetrennte Glieder wachsen nach.",
  },
  "ring-of-elemental-command-water": {
    name: "Ring der Elementarherrschaft (Wasser)",
    summary:
      "Herrschaft über Wasserelementare, dazu Atmen unter Wasser, Schwimmen und Wasserzauber. Für Nicht-Wasserwesen mit einem Fluch behaftet.",
  },
  sequestering: { name: "Ring der Verborgenheit" },
  "shooting-stars": {
    name: "Ring der Sternschnuppen",
    summary: "Nachts unter freiem Himmel: Lichtblitze und Sternenkugeln, die Schaden machen.",
  },
  "spell-storing-major": {
    name: "Ring der Zauberspeicherung, stark",
    summary: "Nimmt Zauber bis zu 10 Graden auf und gibt sie wieder ab.",
  },
  "spell-storing-minor": {
    name: "Ring der Zauberspeicherung, klein",
    summary: "Nimmt Zauber bis zu 3 Graden auf und gibt sie wieder ab.",
  },
  "spell-storing-ring": {
    name: "Ring der Zauberspeicherung",
    summary: "Nimmt Zauber bis zu 5 Graden auf und gibt sie wieder ab — auch von einem fremden Zauberer.",
  },
  "spell-turning": {
    name: "Ring der Zauberumkehr",
    summary: "Wirft Zauber bis zu 7 Graden am Tag auf ihren Verursacher zurück.",
  },
  sustenance: {
    name: "Ring der Nahrung",
    summary: "Der Träger braucht nichts zu essen und zu trinken, und ihm genügen zwei Stunden Schlaf.",
  },
  swimming: { name: "Ring des Schwimmens", summary: "Immer +5 auf Schwimmen." },
  "swimming-improved": { name: "Ring des Schwimmens, verbessert", summary: "Immer +10 auf Schwimmen." },
  telekinesis: {
    name: "Ring der Telekinese",
    summary: "Wirkt Telekinesis auf Befehl: Dinge aus der Ferne bewegen.",
  },
  "three-wishes": {
    name: "Ring der drei Wünsche",
    summary: "Drei Wünsche (Wish). Nach dem dritten wird der Ring zu einem gewöhnlichen Ring.",
  },
  "universal-energy-immunity": { name: "Ring der allumfassenden Energieimmunität" },
  "universal-energy-resistance-greater": { name: "Ring der allumfassenden Energieresistenz, groß" },
  "universal-energy-resistance-minor": {
    name: "Ring der allumfassenden Energieresistenz, klein",
    summary: "Widerstand 10 gegen ALLE fünf Energiearten zugleich.",
  },
  "virtuous-good": { name: "Ring der lauteren Güte" },
  "water-walking": {
    name: "Ring des Wasserlaufens",
    summary: "Der Träger geht über Wasser, Schlamm und Schnee, als wäre es festes Land.",
  },
  weaponbreaking: { name: "Ring des Waffenbrechens" },
  "wizardry-i": {
    name: "Ring der Zauberkunst I",
    summary: "Verdoppelt die Zauberplätze des Grades 1 — für arkane Zauberer.",
  },
  "wizardry-ii": { name: "Ring der Zauberkunst II", summary: "Verdoppelt die arkanen Zauberplätze des Grades 2." },
  "wizardry-iii": { name: "Ring der Zauberkunst III", summary: "Verdoppelt die arkanen Zauberplätze des Grades 3." },
  "wizardry-iv": { name: "Ring der Zauberkunst IV", summary: "Verdoppelt die arkanen Zauberplätze des Grades 4." },
  "x-ray-vision": {
    name: "Ring des Röntgenblicks",
    summary: "Sieht durch Wände und Böden — kostet aber mit jeder Minute Anstrengung.",
  },
};

const RODS: Record<string, ItemGerman> = {
  absorption: {
    name: "Zepter der Absorption",
    summary: "Saugt einen Zauber auf, der den Träger allein trifft, und macht daraus eigene Zauberplätze.",
  },
  alertness: {
    name: "Zepter der Wachsamkeit",
    summary: "+1 RK und Rettungswürfe, dazu Aufmerksamkeit als Talent; aufgestellt wirkt es Wächterzauber.",
  },
  besiegement: { name: "Zepter der Belagerung" },
  cancellation: {
    name: "Zepter der Aufhebung",
    summary: "Berührt einen magischen Gegenstand und nimmt ihm ALLE Magie — einmal, dann ist das Zepter tot.",
  },
  "enemy-detection": {
    name: "Zepter der Feindentdeckung",
    summary: "Zeigt auf Befehl, wo im Umkreis von 18 m Wesen mit feindlicher Absicht stehen.",
  },
  "epic-absorption": { name: "Episches Zepter der Absorption" },
  "epic-cancellation": { name: "Episches Zepter der Aufhebung" },
  "epic-might": { name: "Episches Zepter der Macht" },
  "epic-negation": { name: "Episches Zepter der Auslöschung" },
  "epic-rulership": { name: "Episches Zepter der Herrschaft" },
  "epic-spellcaster": { name: "Episches Zepter des Zauberers" },
  "epic-splendor": { name: "Episches Zepter der Prachtentfaltung" },
  "excellent-magic": { name: "Zepter der vortrefflichen Magie" },
  flailing: {
    name: "Zepter des Dreschflegels",
    summary: "Wird auf Befehl zu einer +3 Kettenkeule; einmal am Tag gibt es dazu +4 RK und Schadensreduktion.",
  },
  "flame-extinguishing": {
    name: "Zepter des Feuerlöschens",
    summary: "Löscht Feuer, von der Fackel bis zum Feuerelementar. Zehn Ladungen.",
  },
  fortification: { name: "Zepter der Befestigung" },
  "immovable-rod": {
    name: "Unbewegliches Zepter",
    summary:
      "Auf Knopfdruck steht es unverrückbar in der Luft und trägt bis 3600 kg. Eine Treppe, ein Riegel, ein Halt aus nichts.",
  },
  invulnerability: { name: "Zepter der Unverwundbarkeit" },
  "lordly-might": {
    name: "Zepter der herrschaftlichen Macht",
    summary: "Sechs Waffen in einer, dazu Kletterhilfe, Wünschelrute und Höhenmesser.",
  },
  "metal-and-mineral-detection": {
    name: "Zepter der Metall- und Mineralsuche",
    summary: "Findet Metall und Erz im Umkreis von 9 m — in welcher Richtung und wie viel.",
  },
  "metamagic-empower-greater": {
    name: "Zepter der Zaubermodifikation: Verstärken, groß",
    summary: "Verstärkt dreimal am Tag einen Zauber bis Grad 9, ohne einen höheren Platz zu kosten.",
  },
  "metamagic-empower-lesser": {
    name: "Zepter der Zaubermodifikation: Verstärken, klein",
    summary: "Verstärkt dreimal am Tag einen Zauber bis Grad 3.",
  },
  "metamagic-empower-normal": {
    name: "Zepter der Zaubermodifikation: Verstärken",
    summary: "Verstärkt dreimal am Tag einen Zauber bis Grad 6.",
  },
  "metamagic-enlarge-greater": {
    name: "Zepter der Zaubermodifikation: Vergrößern, groß",
    summary: "Verdoppelt dreimal am Tag die Reichweite eines Zaubers bis Grad 9.",
  },
  "metamagic-enlarge-lesser": {
    name: "Zepter der Zaubermodifikation: Vergrößern, klein",
    summary: "Verdoppelt dreimal am Tag die Reichweite eines Zaubers bis Grad 3.",
  },
  "metamagic-enlarge-normal": {
    name: "Zepter der Zaubermodifikation: Vergrößern",
    summary: "Verdoppelt dreimal am Tag die Reichweite eines Zaubers bis Grad 6.",
  },
  "metamagic-extend-greater": {
    name: "Zepter der Zaubermodifikation: Verlängern, groß",
    summary: "Verdoppelt dreimal am Tag die Dauer eines Zaubers bis Grad 9.",
  },
  "metamagic-extend-lesser": {
    name: "Zepter der Zaubermodifikation: Verlängern, klein",
    summary: "Verdoppelt dreimal am Tag die Dauer eines Zaubers bis Grad 3.",
  },
  "metamagic-extend-normal": {
    name: "Zepter der Zaubermodifikation: Verlängern",
    summary: "Verdoppelt dreimal am Tag die Dauer eines Zaubers bis Grad 6.",
  },
  "metamagic-maximize-greater": {
    name: "Zepter der Zaubermodifikation: Maximieren, groß",
    summary: "Setzt dreimal am Tag alle Würfel eines Zaubers bis Grad 9 auf ihren Höchstwert.",
  },
  "metamagic-maximize-lesser": {
    name: "Zepter der Zaubermodifikation: Maximieren, klein",
    summary: "Setzt dreimal am Tag alle Würfel eines Zaubers bis Grad 3 auf ihren Höchstwert.",
  },
  "metamagic-maximize-normal": {
    name: "Zepter der Zaubermodifikation: Maximieren",
    summary: "Setzt dreimal am Tag alle Würfel eines Zaubers bis Grad 6 auf ihren Höchstwert.",
  },
  "metamagic-quicken-greater": {
    name: "Zepter der Zaubermodifikation: Beschleunigen, groß",
    summary: "Dreimal am Tag ein Zauber bis Grad 9 als freie Handlung.",
  },
  "metamagic-quicken-lesser": {
    name: "Zepter der Zaubermodifikation: Beschleunigen, klein",
    summary: "Dreimal am Tag ein Zauber bis Grad 3 als freie Handlung.",
  },
  "metamagic-quicken-normal": {
    name: "Zepter der Zaubermodifikation: Beschleunigen",
    summary: "Dreimal am Tag ein Zauber bis Grad 6 als freie Handlung.",
  },
  "metamagic-silent-greater": {
    name: "Zepter der Zaubermodifikation: Lautlos, groß",
    summary: "Dreimal am Tag ein Zauber bis Grad 9 ohne gesprochene Formel.",
  },
  "metamagic-silent-lesser": {
    name: "Zepter der Zaubermodifikation: Lautlos, klein",
    summary: "Dreimal am Tag ein Zauber bis Grad 3 ohne gesprochene Formel.",
  },
  "metamagic-silent-normal": {
    name: "Zepter der Zaubermodifikation: Lautlos",
    summary: "Dreimal am Tag ein Zauber bis Grad 6 ohne gesprochene Formel.",
  },
  negation: {
    name: "Zepter der Auslöschung",
    summary: "Nimmt einem magischen Gegenstand seine Wirkung. Drei Ladungen.",
  },
  nightmares: { name: "Zepter der Albträume" },
  paradise: { name: "Zepter des Paradieses" },
  python: {
    name: "Pythonzepter",
    summary: "Wird auf Befehl zu einer Riesenschlange, die für den Träger kämpft.",
  },
  "restless-death": { name: "Zepter des ruhelosen Todes" },
  rulership: {
    name: "Zepter der Herrschaft",
    summary: "Erhoben gehorchen alle im Umkreis von 36 m — bis zu 300 Stufen wert, insgesamt 500 Runden lang.",
  },
  security: {
    name: "Zepter der Geborgenheit",
    summary: "Bringt die Gruppe für bis zu 200 Tage in ein sicheres Nichts, in dem sie heilt und nicht altert.",
  },
  splendor: {
    name: "Zepter der Prachtentfaltung",
    summary: "+4 CHA, dazu prächtige Kleidung auf Befehl und einmal im Jahr ein ganzes Zeltlager.",
  },
  "the-path": { name: "Zepter des Pfades" },
  "thunder-and-lightning": {
    name: "Zepter von Donner und Blitz",
    summary: "Als Waffe +2, dazu Donnerschlag, Blitzstrahl, Betäubung und Furcht — jeweils einmal am Tag.",
  },
  viper: {
    name: "Vipernzepter",
    summary: "Als Waffe +2, und der Kopf beißt zu wie eine Giftschlange.",
  },
  withering: {
    name: "Zepter des Verwelkens",
    summary: "Ein Treffer lässt Gliedmaßen verdorren: 1d4 Punkte STR und CON, ohne Rettungswurf.",
  },
  wonder: {
    name: "Zepter der Wunder",
    summary: "Bei jedem Einsatz geschieht etwas anderes, gewürfelt aus einer langen Liste. Auch Unerwünschtes.",
  },
  "wyrm-black": {
    name: "Wurmzepter, Schwarz",
    summary: "Zepter in Drachengestalt: Odem aus Säure und Drachenfurcht — episch, also erst ab Stufe 21.",
  },
  "wyrm-blue": {
    name: "Wurmzepter, Blau",
    summary: "Zepter in Drachengestalt: Odem aus Blitz und Drachenfurcht — episch, also erst ab Stufe 21.",
  },
  "wyrm-brass": {
    name: "Wurmzepter, Messing",
    summary: "Zepter in Drachengestalt: Odem aus Feuer und Drachenfurcht — episch, also erst ab Stufe 21.",
  },
  "wyrm-bronze": {
    name: "Wurmzepter, Bronze",
    summary: "Zepter in Drachengestalt: Odem aus Blitz und Drachenfurcht — episch, also erst ab Stufe 21.",
  },
  "wyrm-copper": {
    name: "Wurmzepter, Kupfer",
    summary: "Zepter in Drachengestalt: Odem aus Säure und Drachenfurcht — episch, also erst ab Stufe 21.",
  },
  "wyrm-gold": {
    name: "Wurmzepter, Gold",
    summary: "Zepter in Drachengestalt: Odem aus Feuer und Drachenfurcht — episch, also erst ab Stufe 21.",
  },
  "wyrm-green": {
    name: "Wurmzepter, Grün",
    summary: "Zepter in Drachengestalt: Odem aus Säure und Drachenfurcht — episch, also erst ab Stufe 21.",
  },
  "wyrm-red": {
    name: "Wurmzepter, Rot",
    summary: "Zepter in Drachengestalt: Odem aus Feuer und Drachenfurcht — episch, also erst ab Stufe 21.",
  },
  "wyrm-silver": {
    name: "Wurmzepter, Silber",
    summary: "Zepter in Drachengestalt: Odem aus Kälte und Drachenfurcht — episch, also erst ab Stufe 21.",
  },
  "wyrm-white": {
    name: "Wurmzepter, Weiß",
    summary: "Zepter in Drachengestalt: Odem aus Kälte und Drachenfurcht — episch, also erst ab Stufe 21.",
  },
};

const STAVES: Record<string, ItemGerman> = {
  abjuration: {
    name: "Stab der Abwehrmagie",
    summary: "Shield, Resist Energy, Dispel Magic, Lesser Globe of Invulnerability, Dismissal und Repulsion.",
  },
  charming: { name: "Stab des Bezauberns", summary: "Charm Person und Charm Monster, je eine Ladung." },
  conjuration: {
    name: "Stab der Beschwörung",
    summary: "Mount, Unseen Servant, Stinking Cloud, Minor Creation, Wall of Stone und Summon Monster VI.",
  },
  cosmos: { name: "Stab des Kosmos" },
  defense: {
    name: "Stab der Verteidigung",
    summary: "Shield of Faith, Shield Other, Shield und Globe of Invulnerability.",
  },
  "divination-staff": {
    name: "Stab der Erkenntnis",
    summary: "Detect Secret Doors, Locate Object, Tongues, Locate Creature, Prying Eyes und True Seeing.",
  },
  domination: { name: "Stab der Beherrschung" },
  "earth-and-stone": {
    name: "Stab von Erde und Stein",
    summary: "Passwall und Move Earth — Wände öffnen und Erde verschieben.",
  },
  enchantment: {
    name: "Stab der Verzauberung",
    summary: "Sleep, Hideous Laughter, Suggestion, Crushing Despair, Mind Fog und Greater Heroism.",
  },
  evocation: {
    name: "Stab der Hervorrufung",
    summary: "Magic Missile, Shatter, Fireball, Ice Storm, Wall of Force und Chain Lightning.",
  },
  "fiery-power": { name: "Stab der feurigen Macht" },
  fire: {
    name: "Feuerstab",
    summary: "Burning Hands, Fireball und Wall of Fire.",
  },
  "frost-staff": {
    name: "Froststab",
    summary: "Ice Storm, Wall of Ice und Cone of Cold.",
  },
  healing: {
    name: "Stab der Heilung",
    summary: "Cure Light/Serious/Critical Wounds und Remove Blindness/Deafness — der Stab des Klerikers.",
  },
  illumination: {
    name: "Stab der Erleuchtung",
    summary: "Dancing Lights, Flare, Daylight und Sunburst.",
  },
  illusion: {
    name: "Stab der Illusion",
    summary: "Disguise Self, Mirror Image, Major Image, Rainbow Pattern und Persistent Image.",
  },
  life: {
    name: "Stab des Lebens",
    summary: "Heal und Raise Dead — Tote zurück und Wunden ganz weg.",
  },
  "mighty-force": { name: "Stab der mächtigen Kraft" },
  "nature-s-fury": { name: "Stab des Naturzorns" },
  necromancy: { name: "Epischer Stab der Nekromantie" },
  "necromancy-staff": {
    name: "Stab der Nekromantie",
    summary: "Cause Fear, Ghoul Touch, Halt Undead, Enervation, Waves of Fatigue und Circle of Death.",
  },
  passage: {
    name: "Stab des Durchgangs",
    summary: "Dimension Door, Passwall, Phase Door, Astral Projection und Greater Teleport.",
  },
  "planar-might": { name: "Stab der Ebenenmacht" },
  power: {
    name: "Stab der Macht",
    summary:
      "Magic Missile, Ray of Enfeeblement, Continual Flame, Levitate, Lightning Bolt, Fireball, Cone of Cold, Hold Monster und Globe of Invulnerability — und man kann ihn zerbrechen, um alle Ladungen auf einmal freizusetzen.",
  },
  prism: { name: "Prismenstab" },
  "rapid-barrage": { name: "Stab des schnellen Hagels" },
  "size-alteration": {
    name: "Stab der Größenänderung",
    summary: "Enlarge Person und Reduce Person.",
  },
  spheres: { name: "Stab der Sphären" },
  "swarming-insects": {
    name: "Stab der Insektenschwärme",
    summary: "Summon Swarm und Insect Plague.",
  },
  "the-hierophants": { name: "Stab der Hierophanten" },
  transmutation: {
    name: "Stab der Verwandlung",
    summary: "Expeditious Retreat, Alter Self, Blink, Polymorph, Baleful Polymorph und Disintegrate.",
  },
  walls: { name: "Stab der Wände" },
  winter: { name: "Winterstab" },
  woodlands: {
    name: "Waldstab",
    summary:
      "Charm Animal, Speak with Animals, Barkskin, Summon Nature's Ally, Wall of Thorns, Animate Plants — und als Waffe eine +2 Keule, die in den Boden gepflanzt einen Baum wachsen lässt.",
  },
};

// ===========================================================================
//  Wundersame Gegenstände — 297 Einträge
// ===========================================================================
/**
 * „+2 / +4 / +6“ derselben Sache — eine Regel statt fünf gleicher Einträge.
 *
 * Die Kennungen im Pack heißen `amulet-of-health-2`, `-4`, `-6`. Fünfmal
 * denselben deutschen Satz abzuschreiben heißt fünfmal die Gelegenheit, ihn
 * unterschiedlich zu tippen; der Test prüft trotzdem jede erzeugte Kennung
 * einzeln gegen das Pack.
 */
function plusFamily(
  base: string,
  bonuses: readonly number[],
  name: string,
  summary?: string,
): Record<string, ItemGerman> {
  const out: Record<string, ItemGerman> = {};
  for (const bonus of bonuses) {
    out[`${base}-${bonus}`] =
      summary === undefined ? { name: `${name} +${bonus}` } : { name: `${name} +${bonus}`, summary };
  }
  return out;
}

const WONDROUS: Record<string, ItemGerman> = {
  ...plusFamily(
    "amulet-of-epic-natural-armor",
    [6, 7, 8, 9, 10],
    "Amulett der epischen natürlichen Rüstung",
    "Wie das Amulett der natürlichen Rüstung, nur jenseits von +5 — episch, also erst ab Stufe 21.",
  ),
  ...plusFamily("amulet-of-health", [2, 4, 6], "Amulett der Gesundheit", "Erhöht CON — und damit die Trefferpunkte."),
  ...plusFamily(
    "amulet-of-mighty-fists",
    [1, 2, 3, 4, 5],
    "Amulett der mächtigen Fäuste",
    "Angriff und Schaden aller waffenlosen und natürlichen Angriffe. Das Amulett des Mönchs.",
  ),
  ...plusFamily(
    "amulet-of-natural-armor",
    [1, 2, 3, 4, 5],
    "Amulett der natürlichen Rüstung",
    "Macht die Haut zäher: RK-Bonus, der auch ohne Rüstung gilt und sich mit ihr summiert.",
  ),
  "amulet-of-proof-against-detection-and-location": {
    name: "Amulett gegen Aufspüren und Ortung",
    summary: "Kein Zauber findet den Träger, liest seine Gedanken oder erkennt seine Gesinnung.",
  },
  "amulet-of-the-planes": {
    name: "Amulett der Ebenen",
    summary: "Reisen zwischen den Ebenen — wer es nicht beherrscht, landet an einem Zufallsort.",
  },
  "apparatus-of-the-crab": {
    name: "Krebsapparat",
    summary: "Eine eiserne Tauchkapsel mit Beinen und Scheren. Zwei Personen können darin unter Wasser gehen.",
  },
  "bag-of-holding": {
    name: "Beutel des Fassens",
    summary: "Innen viel größer als außen. Trägt hunderte Kilo bei wenigen Kilo Eigengewicht.",
  },
  "bag-of-tricks-gray": {
    name: "Trickbeutel, Grau",
    summary: "Ein Fellbällchen daraus wird zu einem Tier, das kämpft. Zehnmal die Woche.",
  },
  "bag-of-tricks-rust": {
    name: "Trickbeutel, Rostrot",
    summary: "Wie der graue, nur werden die Tiere größer.",
  },
  "bag-of-tricks-tan": {
    name: "Trickbeutel, Hellbraun",
    summary: "Wie der graue, nur werden die Tiere am größten.",
  },
  "bead-of-force": {
    name: "Kraftperle",
    summary: "Geworfen: 5d6 Schaden im Umkreis von 3 m, und die Getroffenen können in einer Kraftkugel gefangen werden.",
  },
  "belt-monk-s": {
    name: "Mönchsgürtel",
    summary: "Der Träger kämpft wie ein Mönch der 5. Stufe (oder 5 Stufen höher, wenn er selbst Mönch ist).",
  },
  "belt-of-dwarvenkind": {
    name: "Gürtel der Zwergenart",
    summary: "+4 CHA gegenüber Zwergen, +2 CON, Dunkelsicht, Zwergisch — und alle Zwergen-Boni gegen Gift und Zauber.",
  },
  ...plusFamily(
    "belt-of-epic-strength",
    [8, 10, 12],
    "Gürtel der epischen Stärke",
    "Wie der Gürtel der Riesenstärke, nur jenseits von +6 — episch, also erst ab Stufe 21.",
  ),
  ...plusFamily("belt-of-giant-strength", [4, 6], "Gürtel der Riesenstärke", "Erhöht STR — Angriff, Schaden und Traglast."),
  "blessed-book": {
    name: "Gesegnetes Buch",
    summary: "Ein Zauberbuch für 1000 Seiten Zauber, das nichts kostet, um es zu füllen. Wasser und Feuer schaden ihm nicht.",
  },
  "boat-folding": {
    name: "Faltboot",
    summary: "Eine Holzkiste, die sich auf ein Wort in ein Boot oder ein Schiff entfaltet.",
  },
  "boots-of-elvenkind": { name: "Elfenstiefel", summary: "Immer +5 auf Leise bewegen." },
  "boots-of-levitation": {
    name: "Stiefel der Levitation",
    summary: "Wirkt dreimal am Tag Levitate: senkrecht auf und ab schweben.",
  },
  "boots-of-speed": {
    name: "Stiefel der Schnelligkeit",
    summary: "Zehn Runden am Tag Haste: ein Angriff mehr, +1 RK und Angriff, +9 m Bewegung.",
  },
  "boots-of-striding-and-springing": {
    name: "Stiefel des Schreitens und Springens",
    summary: "+3 m Bewegung, dazu +5 auf Springen.",
  },
  "boots-of-swiftness": { name: "Stiefel der Windeseile" },
  "boots-of-teleportation": {
    name: "Stiefel der Teleportation",
    summary: "Dreimal am Tag Teleport — bis zu 30 kg mit.",
  },
  "boots-of-the-winterlands": {
    name: "Stiefel der Winterlande",
    summary: "Über Schnee gehen wie über Land, Widerstand 5 gegen Kälte, keine Spuren.",
  },
  "boots-winged": {
    name: "Geflügelte Stiefel",
    summary: "Dreimal am Tag fliegen, je fünf Minuten.",
  },
  "bottle-of-air": {
    name: "Luftflasche",
    summary: "Eine Flasche, die immer frische Luft nachliefert — unter Wasser und im Rauch.",
  },
  "bowl-of-commanding-water-elementals": {
    name: "Schale zum Befehligen von Wasserelementaren",
    summary: "Mit Wasser gefüllt ruft sie einen großen Wasserelementar, der dem Rufer gehorcht.",
  },
  "bracelet-of-friends": {
    name: "Freundschaftsarmband",
    summary: "Vier Anhänger, an vier Freunde verteilt. Einen abnehmen holt diesen Freund augenblicklich herbei.",
  },
  "bracers-of-archery-greater": {
    name: "Armschienen des Bogenschießens, groß",
    summary: "+2 Angriff und +1 Schaden mit Bögen, dazu Übung mit allen Bögen.",
  },
  "bracers-of-archery-lesser": {
    name: "Armschienen des Bogenschießens, klein",
    summary: "+1 Angriff mit Bögen, dazu Übung mit allen Bögen.",
  },
  ...plusFamily(
    "bracers-of-armor",
    [1, 2, 3, 4, 5, 6, 7, 8],
    "Armschienen der Rüstung",
    "RK wie eine Rüstung, ohne eine zu tragen — wirkt aber nicht zusammen mit echter Rüstung.",
  ),
  ...plusFamily(
    "bracers-of-epic-armor",
    [11, 12, 13, 14, 15],
    "Armschienen der epischen Rüstung",
    "Wie die Armschienen der Rüstung, nur jenseits von +8 — episch, also erst ab Stufe 21.",
  ),
  ...plusFamily(
    "bracers-of-epic-health",
    [8, 10, 12],
    "Armschienen der epischen Gesundheit",
    "Erhöhen CON jenseits von +6 — episch, also erst ab Stufe 21.",
  ),
  "bracers-of-relentless-might": { name: "Armschienen der unerbittlichen Macht" },
  "brazier-of-commanding-fire-elementals": {
    name: "Kohlenpfanne zum Befehligen von Feuerelementaren",
    summary: "Mit Feuer entfacht ruft sie einen großen Feuerelementar, der dem Rufer gehorcht.",
  },
  "brooch-of-shielding": {
    name: "Brosche der Abschirmung",
    summary: "Schluckt 101 Punkte Schaden aus Magic Missile — dann ist sie verbraucht.",
  },
  "broom-of-flying": {
    name: "Flugbesen",
    summary: "Trägt bis 90 kg durch die Luft, 12 m in der Runde, und kommt auf Ruf allein herbei.",
  },
  "cabinet-of-feasting": { name: "Schrank des Festmahls" },
  "candle-of-invocation": {
    name: "Kerze der Anrufung",
    summary: "Vier Stunden Brennzeit: Zauberplätze wie zwei Stufen höher, und ein Gate-Zauber der eigenen Gesinnung.",
  },
  "candle-of-truth": {
    name: "Kerze der Wahrheit",
    summary: "Wirkt eine Stunde Zone of Truth im Umkreis von 1,5 m — dort kann niemand lügen.",
  },
  "cape-of-the-mountebank": {
    name: "Umhang des Gauklers",
    summary: "Einmal am Tag Dimension Door, mit Rauch und Flamme am Abgangs- und Ankunftsort.",
  },
  "carpet-of-flying": {
    name: "Fliegender Teppich",
    summary: "Trägt Personen durch die Luft — je größer der Teppich, desto mehr und desto langsamer.",
  },
  "censer-of-controlling-air-elementals": {
    name: "Räuchergefäß zum Befehligen von Luftelementaren",
    summary: "Mit Weihrauch entzündet ruft es einen großen Luftelementar, der dem Rufer gehorcht.",
  },
  "chaos-diamond": {
    name: "Chaosdiamant",
    summary: "Einmal am Tag je Confusion, Lesser Confusion, Magic Circle Against Law oder Dispel Law.",
  },
  "chime-of-interruption": {
    name: "Glockenspiel der Störung",
    summary: "Sein Klang macht das Sprechen von Zauberformeln im Umkreis von 9 m unmöglich.",
  },
  "chime-of-opening": {
    name: "Glockenspiel des Öffnens",
    summary: "Öffnet Schlösser, Riegel und Deckel auf Klang. Zehn Anwendungen.",
  },
  "circlet-of-blasting-major": {
    name: "Stirnreif der Strahlen, stark",
    summary: "Zweimal am Tag Searing Light — 5d8 gegen Untote.",
  },
  "circlet-of-blasting-minor": {
    name: "Stirnreif der Strahlen, klein",
    summary: "Einmal am Tag Searing Light.",
  },
  "circlet-of-persuasion": {
    name: "Stirnreif der Überzeugung",
    summary: "+3 auf alle Proben, bei denen CHA zählt.",
  },
  "cloak-of-arachnida": {
    name: "Umhang der Arachnida",
    summary: "Spinnenklettern, Immunität gegen Netze, +2 auf Rettungswürfe gegen Spinnengift, und einmal am Tag ein Netz.",
  },
  ...plusFamily("cloak-of-charisma", [2, 4, 6], "Umhang des Charismas", "Erhöht CHA — und damit Auftreten, Diplomatie und beim Kleriker das Bannen."),
  "cloak-of-displacement-major": {
    name: "Umhang der Verschiebung, stark",
    summary: "15 Runden am Tag Displacement: Angriffe gehen zur Hälfte fehl.",
  },
  "cloak-of-displacement-minor": {
    name: "Umhang der Verschiebung, klein",
    summary: "Dauerhaft 20 % Fehlschlagchance für Angriffe gegen den Träger.",
  },
  "cloak-of-elvenkind": { name: "Elfenumhang", summary: "Immer +5 auf Verstecken." },
  ...plusFamily(
    "cloak-of-epic-charisma",
    [8, 10, 12],
    "Umhang des epischen Charismas",
    "Erhöht CHA jenseits von +6 — episch, also erst ab Stufe 21.",
  ),
  ...plusFamily(
    "cloak-of-epic-resistance",
    [6, 7, 8, 9, 10],
    "Umhang der epischen Widerstandskraft",
    "Auf alle drei Rettungswürfe, jenseits von +5 — episch, also erst ab Stufe 21.",
  ),
  "cloak-of-etherealness": {
    name: "Umhang der Ätherform",
    summary: "Dreimal am Tag zehn Minuten körperlos — durch Wände gehen, nicht getroffen werden.",
  },
  ...plusFamily(
    "cloak-of-resistance",
    [1, 2, 3, 4, 5],
    "Umhang der Widerstandskraft",
    "Auf ALLE drei Rettungswürfe. Der erste magische Gegenstand, den fast jeder Charakter kauft.",
  ),
  "cloak-of-the-bat": {
    name: "Fledermausumhang",
    summary: "+5 auf Verstecken, Klettern wie eine Fledermaus, und als Fledermaus fliegen.",
  },
  "cloak-of-the-manta-ray": {
    name: "Mantarochenumhang",
    summary: "Unter Wasser atmen und mit 18 m schwimmen.",
  },
  "crystal-ball": {
    name: "Kristallkugel",
    summary: "Fernsicht (Scrying) auf Orte und Personen, die man kennt.",
  },
  "cube-of-force": {
    name: "Würfel der Kraft",
    summary: "Baut eine Barriere um den Träger — sechs Einstellungen, was hindurch darf und was nicht.",
  },
  "cube-of-frost-resistance": {
    name: "Würfel der Frostresistenz",
    summary: "Eine Schale von 3 m, in der es immer warm ist. Hält Kälte draußen.",
  },
  "cubic-gate": {
    name: "Würfeltor",
    summary: "Sechs Seiten, sechs Ebenen. Öffnet ein Tor dorthin oder holt etwas von dort.",
  },
  darkskull: {
    name: "Dunkelschädel",
    summary: "Ein steinerner Schädel: er entweiht geheiligten Boden und macht ihn zum Altar des Bösen.",
  },
  "decanter-of-endless-water": {
    name: "Karaffe des endlosen Wassers",
    summary: "Süßwasser ohne Ende — auf Befehl ein Rinnsal, ein Strom oder ein Geysir.",
  },
  "deck-of-illusions": {
    name: "Kartenspiel der Illusionen",
    summary: "Eine Karte werfen erschafft die abgebildete Gestalt als Trugbild.",
  },
  "dimensional-shackles": {
    name: "Dimensionale Fesseln",
    summary: "Fesseln, die auch Ebenenreisende halten: kein Teleport, kein Ebenenwechsel.",
  },
  "drums-of-panic": {
    name: "Trommeln der Panik",
    summary: "Ein Paar Kesselpauken. Wer sie hört, flieht (Rettungswurf Will).",
  },
  "dust-of-appearance": {
    name: "Staub der Enthüllung",
    summary: "Macht alles Unsichtbare im Umkreis von 3 m sichtbar — auch Illusionen.",
  },
  "dust-of-disappearance": {
    name: "Staub des Verschwindens",
    summary: "Macht den Bestreuten unsichtbar, und zwar so, dass auch See Invisibility ihn nicht findet.",
  },
  "dust-of-dryness": {
    name: "Staub der Trockenheit",
    summary: "Saugt 400 Liter Wasser auf und wird zu einer Perle, die es wieder freigibt.",
  },
  "dust-of-illusion": {
    name: "Staub der Illusion",
    summary: "Auf das Gesicht gestreut wirkt er wie eine Maske: man sieht aus, wie man will.",
  },
  "dust-of-tracelessness": {
    name: "Staub der Spurlosigkeit",
    summary: "Lässt jede Spur eines Lagers oder Weges verschwinden.",
  },
  "efficient-quiver": {
    name: "Wirksamer Köcher",
    summary: "Drei Fächer: 60 Pfeile, 18 Speere, 6 Bögen oder Stäbe. Wiegt trotzdem nur 2 lb.",
  },
  "efreeti-bottle": {
    name: "Efreetiflasche",
    summary: "Ein Efreeti, der einmal am Tag eine Stunde dient — oder drei Wünsche erfüllt, wenn es der Zufall so will.",
  },
  "elemental-gem": {
    name: "Elementarstein",
    summary: "Zerbrochen ruft er einen großen Elementar, der 20 Minuten für den Träger kämpft.",
  },
  "elixir-of-fire-breath": {
    name: "Elixier des Feueratems",
    summary: "Getrunken: bis zu drei Feuerstöße, je 4d6 Schaden auf 7,5 m.",
  },
  "elixir-of-hiding": { name: "Elixier des Versteckens", summary: "Eine Stunde +10 auf Verstecken." },
  "elixir-of-love": {
    name: "Liebeselixier",
    summary: "Der Trinker verliebt sich in die erste Person, die er sieht — für eine Stunde.",
  },
  "elixir-of-sneaking": { name: "Elixier des Schleichens", summary: "Eine Stunde +10 auf Leise bewegen." },
  "elixir-of-swimming": { name: "Elixier des Schwimmens", summary: "Eine Stunde +10 auf Schwimmen." },
  "elixir-of-truth": {
    name: "Elixier der Wahrheit",
    summary: "Der Trinker kann zehn Minuten lang nicht lügen (Rettungswurf Will SG 13).",
  },
  "elixir-of-vision": {
    name: "Elixier der Sicht",
    summary: "Eine Stunde +10 auf Suchen.",
  },
  "eversmoking-bottle": {
    name: "Immerrauchende Flasche",
    summary: "Entstöpselt füllt sie ein weites Feld mit Rauch, bis sie wieder verschlossen wird.",
  },
  "eyes-of-charming": {
    name: "Augen des Bezauberns",
    summary: "Zwei Linsen: dreimal am Tag Charm Person mit einem Blick.",
  },
  "eyes-of-doom": {
    name: "Augen des Verhängnisses",
    summary: "Doom auf Blick, dreimal am Tag Deathwatch, und einmal in der Woche Fear.",
  },
  "eyes-of-petrification": {
    name: "Augen der Versteinerung",
    summary: "Zweimal am Tag ein Blick, der zu Stein verwandelt (Rettungswurf Fortitude SG 18).",
  },
  "eyes-of-the-eagle": { name: "Adleraugen", summary: "+5 auf Entdecken." },
  "feather-token-anchor": {
    name: "Federmarke: Anker",
    summary: "Hält ein Schiff auf der Stelle, egal welche Strömung.",
  },
  "feather-token-bird": {
    name: "Federmarke: Vogel",
    summary: "Wird zu einem Vogel, der eine Nachricht oder einen Reiter trägt.",
  },
  "feather-token-fan": {
    name: "Federmarke: Fächer",
    summary: "Erzeugt Wind, der ein Schiff treibt oder Rauch fortweht.",
  },
  "feather-token-swan-boat": {
    name: "Federmarke: Schwanenboot",
    summary: "Wird zu einem Boot in Schwanengestalt für acht Passagiere, einen Tag lang.",
  },
  "feather-token-tree": {
    name: "Federmarke: Baum",
    summary: "Wird augenblicklich zu einer großen Eiche — Deckung, Halt oder Hindernis.",
  },
  "feather-token-whip": {
    name: "Federmarke: Peitsche",
    summary: "Eine Peitsche, die eine Stunde von allein kämpft (+10 Angriff, 1d6+1).",
  },
  "figurines-of-wondrous-power": {
    name: "Figürchen der wundersamen Macht",
    summary: "Kleine Tierfiguren, die auf ein Wort zu lebenden Tieren werden und dienen.",
  },
  "gate-key": { name: "Torschlüssel" },
  "gauntlet-of-rust": {
    name: "Rosthandschuh",
    summary: "Berührtes Eisen zerfällt — einmal am Tag wie Rusting Grasp. Was der Träger trägt, bleibt heil.",
  },
  "gauntlets-of-ogre-power": {
    name: "Handschuhe der Ogerkraft",
    summary: "+2 STR — Angriff, Schaden und Traglast.",
  },
  "gem-of-brightness": {
    name: "Stein der Helligkeit",
    summary: "Ein Lichtstrahl, ein Blitz oder ein Blenden. Fünfzig Ladungen.",
  },
  "gem-of-seeing": {
    name: "Stein des Sehens",
    summary: "Durch den Stein gesehen: True Seeing — Unsichtbares, Verwandeltes und Illusionen fallen auf.",
  },
  "glove-of-storing": {
    name: "Handschuh des Verwahrens",
    summary: "Lässt einen Gegenstand aus der Hand verschwinden und auf Wunsch sofort wieder erscheinen.",
  },
  "gloves-of-arrow-snaring": {
    name: "Handschuhe des Pfeilfangens",
    summary: "Zweimal am Tag einen Fernkampfangriff aus der Luft greifen.",
  },
  ...plusFamily("gloves-of-dexterity", [2, 4, 6], "Handschuhe der Geschicklichkeit", "Erhöhen DEX — und damit RK, Initiative und Reflex."),
  ...plusFamily(
    "gloves-of-epic-dexterity",
    [8, 10, 12],
    "Handschuhe der epischen Geschicklichkeit",
    "Erhöhen DEX jenseits von +6 — episch, also erst ab Stufe 21.",
  ),
  "gloves-of-swimming-and-climbing": {
    name: "Handschuhe des Schwimmens und Kletterns",
    summary: "+5 auf Schwimmen und Klettern.",
  },
  "goggles-of-minute-seeing": {
    name: "Brille des genauen Sehens",
    summary: "+5 auf Suchen bei kleinen Dingen — Fallen und Geheimtüren aus der Nähe.",
  },
  "goggles-of-night": {
    name: "Nachtbrille",
    summary: "Dunkelsicht auf 18 m.",
  },
  "golem-manual": {
    name: "Golemhandbuch",
    summary: "Die Anleitung, einen Golem zu bauen — und der halbe Preis dafür.",
  },
  "hand-of-glory": {
    name: "Hand der Herrlichkeit",
    summary: "Eine getrocknete Hand um den Hals: sie trägt zwei Ringe statt der üblichen Zahl, plus drei Zauber am Tag.",
  },
  "hand-of-the-mage": {
    name: "Hand des Magiers",
    summary: "Mage Hand, so oft man will: kleine Dinge aus der Ferne bewegen.",
  },
  "handy-haversack": {
    name: "Handlicher Rucksack",
    summary: "Wie ein Beutel des Fassens, aber sortiert: was man sucht, liegt immer oben.",
  },
  "harp-of-charming": {
    name: "Harfe des Bezauberns",
    summary: "Gespielt wirkt sie Suggestion — einmal je Ladung.",
  },
  "hat-of-disguise": {
    name: "Hut der Verkleidung",
    summary: "Disguise Self auf Befehl: man sieht aus wie jemand anderes.",
  },
  ...plusFamily(
    "headband-of-epic-intellect",
    [8, 10, 12],
    "Stirnband des epischen Verstandes",
    "Erhöht INT jenseits von +6 — episch, also erst ab Stufe 21.",
  ),
  ...plusFamily(
    "headband-of-intellect",
    [2, 4, 6],
    "Stirnband des Verstandes",
    "Erhöht INT — aber keine rückwirkenden Fertigkeitspunkte.",
  ),
  "helm-of-brilliance": {
    name: "Helm der Brillanz",
    summary: "Mit Edelsteinen besetzt: Sonnenlicht, Feuerbälle, brennende Waffen — und gefährlich, wenn er zerbricht.",
  },
  "helm-of-comprehend-languages-and-read-magic": {
    name: "Helm des Sprachverständnisses und Magielesens",
    summary: "Jede Sprache verstehen und jede magische Schrift lesen (mit einer Probe).",
  },
  "helm-of-telepathy": {
    name: "Helm der Telepathie",
    summary: "Gedanken lesen und Gedanken senden; einmal am Tag Suggestion.",
  },
  "helm-of-teleportation": {
    name: "Helm der Teleportation",
    summary: "Dreimal am Tag Teleport.",
  },
  "helm-of-underwater-action": {
    name: "Helm des Unterwasserhandelns",
    summary: "Unter Wasser sehen wie an der Luft, und mit den Linsen auch atmen.",
  },
  "horn-of-blasting": {
    name: "Horn des Zerstörens",
    summary: "Ein Stoß: 2d6 Schall im Kegel, betäubt und lässt Kristall zerspringen.",
  },
  "horn-of-blasting-greater": {
    name: "Horn des Zerstörens, groß",
    summary: "Wie das Horn des Zerstörens, nur mit 10d6 Schaden.",
  },
  "horn-of-fog": { name: "Nebelhorn", summary: "Bläst dichten Nebel, solange man bläst." },
  "horn-of-goodness-evil": {
    name: "Horn des Guten/Bösen",
    summary: "Wirkt Protection from Evil oder from Good — je nachdem, wer bläst. Zehn Minuten.",
  },
  "horn-of-the-tritons": {
    name: "Horn der Tritonen",
    summary: "Beruhigt Wasser, erschreckt Meerwesen oder ruft Tritonen zu Hilfe.",
  },
  "horn-of-valhalla": {
    name: "Horn von Walhalla",
    summary: "Ruft Berserkerkrieger, die eine Stunde kämpfen. Einmal in der Woche.",
  },
  "horseshoes-of-a-zephyr": {
    name: "Hufeisen des Zephyrs",
    summary: "Das Reittier schwebt eine Handbreit über dem Boden: über Wasser, Sumpf und Krähenfüße hinweg.",
  },
  "horseshoes-of-speed": { name: "Hufeisen der Schnelligkeit", summary: "+9 m Bewegung für das Reittier." },
  "horseshoes-of-the-peerless-steed": { name: "Hufeisen des unvergleichlichen Rosses" },
  "incense-of-meditation": {
    name: "Weihrauch der Meditation",
    summary: "Zwei Stunden Vorbereitung damit: alle Zauber des Tages wirken maximiert.",
  },
  "instant-fortress": {
    name: "Sofortfestung",
    summary: "Ein Metallwürfel, der auf ein Wort zu einem Turm mit Zinnen wird. Adamant, kaum zu beschädigen.",
  },
  "ioun-stones": {
    name: "Ioun-Steine",
    summary: "Steine, die um den Kopf kreisen. Je nach Farbe und Form ein anderer dauerhafter Bonus.",
  },
  "iron-bands-of-binding": {
    name: "Eisenbänder der Fesselung",
    summary: "Geworfen umschlingen sie einen Gegner und halten ihn fest.",
  },
  "iron-flask": {
    name: "Eisenflasche",
    summary: "Fängt ein außerweltliches Wesen ein und hält es gefangen — freigelassen dient es eine Stunde.",
  },
  "lantern-of-revealing": {
    name: "Laterne der Enthüllung",
    summary: "Ihr Licht macht Unsichtbares im Umkreis von 7,5 m sichtbar.",
  },
  "lens-of-detection": {
    name: "Linse des Aufspürens",
    summary: "+2 auf Suchen, +5 auf Spurenlesen.",
  },
  "lyre-of-building": {
    name: "Leier des Bauens",
    summary: "Gespielt ersetzt sie hundert Arbeiter — oder schützt ein Bauwerk vor Beschädigung.",
  },
  "mantle-of-epic-spell-resistance": { name: "Mantel der epischen Zauberresistenz" },
  "mantle-of-faith": {
    name: "Mantel des Glaubens",
    summary: "Schadensreduktion 5 gegen alles Böse.",
  },
  "mantle-of-great-stealth": { name: "Mantel der großen Verstohlenheit" },
  "mantle-of-spell-resistance": {
    name: "Mantel der Zauberresistenz",
    summary: "Zauberresistenz 21 — Zauber müssen erst dagegen anwürfeln. Auch die eigenen.",
  },
  ...plusFamily(
    "manual-of-bodily-health",
    [1, 2, 3, 4, 5],
    "Handbuch der Körpergesundheit",
    "48 Stunden Lesen, dann ist CON dauerhaft höher — und das Buch verschwindet.",
  ),
  ...plusFamily(
    "manual-of-gainful-exercise",
    [1, 2, 3, 4, 5],
    "Handbuch der gewinnbringenden Übung",
    "48 Stunden Lesen, dann ist STR dauerhaft höher — und das Buch verschwindet.",
  ),
  ...plusFamily(
    "manual-of-quickness-of-action",
    [1, 2, 3, 4, 5],
    "Handbuch der flinken Bewegung",
    "48 Stunden Lesen, dann ist DEX dauerhaft höher — und das Buch verschwindet.",
  ),
  "marvelous-pigments": {
    name: "Wundersame Farben",
    summary: "Was man damit malt, wird wirklich: eine Tür, eine Truhe, eine Leiter.",
  },
  "mask-of-the-skull": {
    name: "Totenkopfmaske",
    summary: "Einmal am Tag fliegt der Schädel zum Gegner und wirkt einen Todeszauber.",
  },
  "mattock-of-the-titans": {
    name: "Titanenhacke",
    summary: "Eine Hacke, die nur ein Riese führen kann: als Waffe +3, und sie gräbt durch Fels.",
  },
  "maul-of-the-titans": {
    name: "Titanenhammer",
    summary: "Ein Hammer für Riesen: als Waffe +3, und er zerschlägt Türen und Tore auf einen Schlag.",
  },
  "medallion-of-thoughts": {
    name: "Medaillon der Gedanken",
    summary: "Detect Thoughts dreimal am Tag, je zehn Minuten.",
  },
  "mirror-of-life-trapping": {
    name: "Spiegel des Lebensfangs",
    summary: "Wer hineinsieht, wird darin gefangen — bis zu fünfzehn Wesen zugleich.",
  },
  "mirror-of-mental-prowess": {
    name: "Spiegel der Geisteskraft",
    summary: "Gedanken lesen, ferne Orte sehen, und als Tor hindurchsteigen.",
  },
  "mirror-of-opposition": {
    name: "Spiegel der Gegnerschaft",
    summary: "Erschafft ein Doppel des Betrachters, das ihn angreift.",
  },
  "necklace-of-adaptation": {
    name: "Halskette der Anpassung",
    summary: "Immer eigene Atemluft: kein Gas, kein Ertrinken, kein Vakuum.",
  },
  "necklace-of-fireballs": {
    name: "Halskette der Feuerbälle",
    summary: "Kugeln, die als Feuerball geworfen werden — jede mit eigener Stärke.",
  },
  "orb-of-storms": {
    name: "Sturmkugel",
    summary: "Kontrolliert das Wetter: Regen, Sturm, Blitze, und einmal im Jahr ein Erdbeben.",
  },
  "pearl-of-power-1st": {
    name: "Perle der Macht (Grad 1)",
    summary: "Einmal am Tag einen bereits gewirkten Zauber des Grades 1 zurückholen. Für vorbereitende Zauberer.",
  },
  "pearl-of-power-2nd": { name: "Perle der Macht (Grad 2)", summary: "Holt einmal am Tag einen Zauber des Grades 2 zurück." },
  "pearl-of-power-3rd": { name: "Perle der Macht (Grad 3)", summary: "Holt einmal am Tag einen Zauber des Grades 3 zurück." },
  "pearl-of-power-4th": { name: "Perle der Macht (Grad 4)", summary: "Holt einmal am Tag einen Zauber des Grades 4 zurück." },
  "pearl-of-power-5th": { name: "Perle der Macht (Grad 5)", summary: "Holt einmal am Tag einen Zauber des Grades 5 zurück." },
  "pearl-of-power-6th": { name: "Perle der Macht (Grad 6)", summary: "Holt einmal am Tag einen Zauber des Grades 6 zurück." },
  "pearl-of-power-7th": { name: "Perle der Macht (Grad 7)", summary: "Holt einmal am Tag einen Zauber des Grades 7 zurück." },
  "pearl-of-power-8th": { name: "Perle der Macht (Grad 8)", summary: "Holt einmal am Tag einen Zauber des Grades 8 zurück." },
  "pearl-of-power-9th": { name: "Perle der Macht (Grad 9)", summary: "Holt einmal am Tag einen Zauber des Grades 9 zurück." },
  "pearl-of-power-two-spells": {
    name: "Perle der Macht, zwei Zauber",
    summary: "Holt zwei Zauber zurück, zusammen bis Grad 6.",
  },
  "pearl-of-the-sirines": {
    name: "Perle der Sirinen",
    summary: "Unter Wasser atmen, sprechen und mit voller Geschwindigkeit schwimmen.",
  },
  ...plusFamily(
    "periapt-of-epic-wisdom",
    [8, 10, 12],
    "Amulett der epischen Weisheit",
    "Erhöht WIS jenseits von +6 — episch, also erst ab Stufe 21.",
  ),
  "periapt-of-health": {
    name: "Amulett der Gesundheit",
    summary: "Immun gegen Krankheit — auch gegen magische.",
  },
  "periapt-of-proof-against-poison": {
    name: "Amulett gegen Gift",
    summary: "Immun gegen alles Gift.",
  },
  ...plusFamily("periapt-of-wisdom", [2, 4, 6], "Amulett der Weisheit", "Erhöht WIS — beim Kleriker also auch die Zauber."),
  "periapt-of-wound-closure": {
    name: "Amulett des Wundverschlusses",
    summary: "Wunden bluten nicht weiter, und Heilung wirkt doppelt schnell.",
  },
  "phylactery-of-faithfulness": {
    name: "Phylakterium der Gläubigkeit",
    summary: "Warnt, wenn eine Tat der eigenen Gottheit missfällt — bevor man sie tut.",
  },
  "phylactery-of-undead-turning": {
    name: "Phylakterium des Untotenbannens",
    summary: "Bannt Untote wie ein Kleriker vier Stufen höher.",
  },
  "pipes-of-haunting": {
    name: "Pfeifen des Spuks",
    summary: "Ihr Klang setzt Zuhörer in Furcht (Rettungswurf Will SG 13).",
  },
  "pipes-of-pain": {
    name: "Pfeifen des Schmerzes",
    summary: "Der Klang betört zuerst, dann tut er weh: −4 auf alles, solange er anhält.",
  },
  "pipes-of-sounding": {
    name: "Pfeifen des Klangs",
    summary: "Erzeugen jedes Geräusch, das man beschreiben kann — eine Armee, ein Sturm, eine Stimme.",
  },
  "pipes-of-the-sewers": {
    name: "Pfeifen der Kanalisation",
    summary: "Rufen Ratten herbei und lenken sie.",
  },
  "portable-hole": {
    name: "Tragbares Loch",
    summary: "Ein Tuch, ausgebreitet ein Loch von 1,8 m Tiefe. Als Versteck, als Falle, als Lager.",
  },
  "restorative-ointment": {
    name: "Heilende Salbe",
    summary: "Fünf Anwendungen: heilt 1d8+5, oder neutralisiert Gift, oder heilt Krankheit.",
  },
  "ring-gates": {
    name: "Ringtore",
    summary: "Zwei Ringe, beliebig weit auseinander. Was durch den einen geht, kommt aus dem anderen.",
  },
  "robe-of-blending": {
    name: "Robe des Verschmelzens",
    summary: "Passt den Träger seiner Umgebung an: +10 auf Verstecken, und er sieht aus, wie er will.",
  },
  "robe-of-bones": {
    name: "Knochenrobe",
    summary: "Aufgenähte Bilder von Untoten, die auf Befehl als echte Untote herabsteigen und kämpfen.",
  },
  "robe-of-eyes": {
    name: "Robe der Augen",
    summary: "Rundum sehen, Unsichtbares sehen, Dunkelsicht 36 m — aber Light blendet den Träger.",
  },
  "robe-of-scintillating-colors": {
    name: "Robe der schillernden Farben",
    summary: "Farben, die Zuschauer betäuben und blenden. +4 RK, solange sie wirken.",
  },
  "robe-of-stars": {
    name: "Sternenrobe",
    summary: "+1 auf Rettungswürfe, Reisen in die Astralebene, und Sterne, die als Wurfwaffen dienen.",
  },
  "robe-of-the-archmagi": {
    name: "Robe des Erzmagiers",
    summary: "+5 RK, Zauberresistenz 18, +2 auf Rettungswürfe gegen Zauber und +2 auf den SG eigener Zauber.",
  },
  "robe-of-useful-items": {
    name: "Robe der nützlichen Dinge",
    summary: "Aufgenähte Flicken, die abgenommen zum echten Ding werden: eine Leiter, ein Boot, ein Portal.",
  },
  "rope-of-climbing": {
    name: "Seil des Kletterns",
    summary: "Ein 18 m langes Seil, das sich auf Befehl selbst befestigt, knotet und einholt.",
  },
  "rope-of-entanglement": {
    name: "Seil der Verstrickung",
    summary: "Auf Befehl schlingt sich das Seil um einen Gegner und hält ihn fest.",
  },
  "salve-of-slipperiness": {
    name: "Salbe der Glätte",
    summary: "Wie Freedom of Movement: nichts kann greifen, festhalten oder fesseln.",
  },
  "scabbard-of-keen-edges": {
    name: "Scheide der scharfen Schneiden",
    summary: "Dreimal am Tag wird die gezogene Klinge für zehn Minuten Keen — doppelter kritischer Bereich.",
  },
  "scarab-golembane": {
    name: "Skarabäus, Golembann",
    summary: "Findet Golems und lässt Angriffe deren Schadensreduktion durchdringen.",
  },
  "scarab-of-protection": {
    name: "Skarabäus des Schutzes",
    summary: "Zauberresistenz 20 und zwölfmal Schutz gegen Todeszauber und Lebensentzug.",
  },
  "shrouds-of-disintegration": {
    name: "Leichentuch der Auflösung",
    summary: "Verflucht: wer sich darin einwickelt, löst sich auf und lässt nur Staub zurück.",
  },
  silversheen: {
    name: "Silberglanz",
    summary: "Auf eine Waffe gestrichen gilt sie eine Stunde als Silber — gegen Werwesen und andere.",
  },
  "slippers-of-spider-climbing": {
    name: "Schuhe des Spinnenkletterns",
    summary: "Zehn Minuten am Tag an Wänden und Decken gehen.",
  },
  "sovereign-glue": {
    name: "Allerbester Leim",
    summary: "Klebt für immer. Nur das Universallösungsmittel löst ihn wieder.",
  },
  "stone-horse-courser": {
    name: "Steinpferd, Renner",
    summary: "Ein Pferd aus Stein, das auf Befehl lebt und läuft: unermüdlich, aber langsamer als ein echtes.",
  },
  "stone-horse-destrier": {
    name: "Steinpferd, Streitross",
    summary: "Wie der Renner, nur kräftiger und kampfbereit.",
  },
  "stone-of-alarm": {
    name: "Alarmstein",
    summary: "Ein Würfel, der laut schrillt, wenn jemand ohne das Kennwort vorbeigeht.",
  },
  "stone-of-controlling-earth-elementals": {
    name: "Stein zum Befehligen von Erdelementaren",
    summary: "Ruft einmal am Tag einen großen Erdelementar, der dem Träger gehorcht.",
  },
  "stone-of-good-luck-luckstone": {
    name: "Stein des Glücks (Glücksstein)",
    summary: "+1 auf alle Rettungswürfe, Fertigkeitsproben und Attributsproben.",
  },
  "stone-salve": {
    name: "Steinsalbe",
    summary: "Macht Versteinerte wieder lebendig — oder schützt eine Stunde davor.",
  },
  "strand-of-prayer-beads-greater": {
    name: "Gebetsperlenkette, groß",
    summary: "Perlen für Heal, Wind Walk, Summon Monster VII, Righteous Might und Bonus-Zauberplätze.",
  },
  "strand-of-prayer-beads-lesser": {
    name: "Gebetsperlenkette, klein",
    summary: "Perlen für Bless, Cure Serious Wounds und Bonus-Zauberplätze.",
  },
  "strand-of-prayer-beads-standard": {
    name: "Gebetsperlenkette, gewöhnlich",
    summary: "Perlen für Cure Critical Wounds, Holy Smite und Bonus-Zauberplätze.",
  },
  "sustaining-spoon": {
    name: "Nährender Löffel",
    summary: "Füllt eine Schüssel mit fadem Haferschleim, der einen Menschen den Tag über satt hält.",
  },
  ...plusFamily(
    "tome-of-clear-thought",
    [1, 2, 3, 4, 5],
    "Foliant des klaren Denkens",
    "48 Stunden Lesen, dann ist INT dauerhaft höher — und das Buch verschwindet.",
  ),
  ...plusFamily(
    "tome-of-leadership-and-influence",
    [1, 2, 3, 4, 5],
    "Foliant der Führung und des Einflusses",
    "48 Stunden Lesen, dann ist CHA dauerhaft höher — und das Buch verschwindet.",
  ),
  ...plusFamily(
    "tome-of-understanding",
    [1, 2, 3, 4, 5],
    "Foliant des Verstehens",
    "48 Stunden Lesen, dann ist WIS dauerhaft höher — und das Buch verschwindet.",
  ),
  "unguent-of-timelessness": {
    name: "Salbe der Zeitlosigkeit",
    summary: "Was damit eingerieben ist, altert hundertmal langsamer.",
  },
  "universal-solvent": {
    name: "Universallösungsmittel",
    summary: "Löst jeden Klebstoff — auch den allerbesten Leim und Spinnennetze.",
  },
  "vest-of-escape": {
    name: "Weste des Entkommens",
    summary: "Verborgene Werkzeuge: +4 auf Entfesseln, +6 auf Schlösser öffnen.",
  },
  "vestment-druid-s": {
    name: "Druidengewand",
    summary: "Wild Shape einmal mehr am Tag.",
  },
  "well-of-many-worlds": {
    name: "Brunnen der vielen Welten",
    summary: "Ein Tuch, das ein Tor in eine andere Ebene öffnet — wohin, entscheidet der Zufall.",
  },
  "wind-fan": {
    name: "Windfächer",
    summary: "Erzeugt Gust of Wind — kann aber zerreißen, wenn man ihn zu oft benutzt.",
  },
  "wings-of-flying": {
    name: "Flügel des Fliegens",
    summary: "Ein Umhang, der zu Fledermausflügeln wird: fliegen mit 18 m, gute Wendigkeit.",
  },
};

// ===========================================================================
//  Waffen- und Rüstungseigenschaften, magische Einzelstücke — 175 Einträge
// ===========================================================================
/*
  Zwei Sorten in einem Topf, weil das Pack sie unter einer Kategorie führt:

    Eigenschaften (Marke `special-ability`) — „Flaming“, „Keen“, „Holy“. Das
    sind keine Gegenstände, sondern Aufwertungen, die man auf eine Waffe oder
    Rüstung legt. Der deutsche Name sagt das mit: „Eigenschaft: Flammend“.
    Einzelstücke — „Holy Avenger“, „Frost Brand“. Echte Gegenstände mit Namen.
*/
const MAGIC: Record<string, ItemGerman> = {
  "absorbing-shield": {
    name: "Schild der Absorption",
    summary: "Ein +1 Schild, der Berührungsangriffe schluckt — und einmal Disintegrate aufsaugen kann.",
  },
  "acid-resistance": {
    name: "Eigenschaft: Säurewiderstand",
    summary: "Rüstung oder Schild: Widerstand 10 gegen Säure.",
  },
  "acid-resistance-greater": {
    name: "Eigenschaft: Säurewiderstand, groß",
    summary: "Widerstand 30 gegen Säure.",
  },
  "acid-resistance-improved": {
    name: "Eigenschaft: Säurewiderstand, verbessert",
    summary: "Widerstand 20 gegen Säure.",
  },
  "acid-warding": { name: "Eigenschaft: Säureabschirmung" },
  "acidic-blast": { name: "Eigenschaft: Säurestoß" },
  "adamantine-battleaxe": {
    name: "Adamantstreitaxt",
    summary: "Aus Adamant geschmiedet: durchdringt Schadensreduktion und ignoriert die Panzerung von Gegenständen.",
  },
  "adamantine-breastplate": {
    name: "Adamantbrustplatte",
    summary: "Brustplatte aus Adamant: Schadensreduktion 2/— zusätzlich zum RK.",
  },
  "adamantine-dagger": {
    name: "Adamantdolch",
    summary: "Dolch aus Adamant: durchdringt Schadensreduktion und schneidet durch Gegenstände.",
  },
  anarchic: {
    name: "Eigenschaft: Anarchisch",
    summary: "Waffe: +2d6 Schaden gegen alles Rechtschaffene, und sie gilt als chaotisch.",
  },
  "anarchic-power": { name: "Eigenschaft: Anarchische Macht" },
  animated: {
    name: "Eigenschaft: Belebt",
    summary: "Schild: schwebt von allein neben dem Träger — beide Hände bleiben frei.",
  },
  "antimagic-armor": { name: "Antimagische Rüstung" },
  "armor-of-the-abyssal-horde": { name: "Rüstung der abyssischen Horde" },
  "armor-of-the-celestial-battalion": { name: "Rüstung der himmlischen Legion" },
  "arrow-catching": {
    name: "Eigenschaft: Pfeilfang",
    summary: "Schild: zieht Fernkampfangriffe auf sich, die auf Nebenstehende gerichtet sind.",
  },
  "arrow-deflection": {
    name: "Eigenschaft: Pfeilablenkung",
    summary: "Schild: lenkt einmal in der Runde einen Fernkampfangriff ab.",
  },
  "assassin-s-dagger": {
    name: "Assassinendolch",
    summary: "Ein +2 Dolch, der den Todesstoß eines Assassinen um 1 auf den Rettungswurf erschwert.",
  },
  axiomatic: {
    name: "Eigenschaft: Axiomatisch",
    summary: "Waffe: +2d6 Schaden gegen alles Chaotische, und sie gilt als rechtschaffen.",
  },
  "axiomatic-power": { name: "Eigenschaft: Axiomatische Macht" },
  backstabber: { name: "Rückenstecher" },
  "banded-mail-of-luck": {
    name: "Bandrüstung des Glücks",
    summary: "+3 Rüstung, und einmal in der Woche lässt sie einen Gegner seinen Rettungswurf wiederholen — schlechter.",
  },
  bane: {
    name: "Eigenschaft: Fluch",
    summary: "Waffe: gegen eine bestimmte Art von Wesen +2 Angriff und +2d6 Schaden.",
  },
  bashing: {
    name: "Eigenschaft: Schildstoß",
    summary: "Schild: der Schildschlag macht deutlich mehr Schaden, als seine Größe hergibt.",
  },
  blinding: {
    name: "Eigenschaft: Blendend",
    summary: "Schild: blendet auf Befehl alle im Umkreis von 6 m, zweimal am Tag.",
  },
  "breastplate-of-command": {
    name: "Brustplatte des Befehls",
    summary: "+2 Brustplatte, +2 auf CHA-Proben, und Verbündete in der Nähe kämpfen mutiger.",
  },
  "brilliant-energy": {
    name: "Eigenschaft: Strahlende Energie",
    summary: "Waffe: ignoriert Rüstung und Schild ganz — trifft aber keine Gegenstände und keine Untoten.",
  },
  "bulwark-of-the-great-dragon": { name: "Bollwerk des Großen Drachen" },
  "caster-s-shield": {
    name: "Zaubererschild",
    summary: "Ein +1 Schild mit einem Streifen, in den ein Zauber gelegt wird — abrufbar wie eine Schriftrolle.",
  },
  "celestial-armor": {
    name: "Himmlische Rüstung",
    summary: "Ein leuchtendes +3 Kettenhemd: sehr leicht, DEX zählt bis +8, und einmal am Tag Fliegen.",
  },
  chaosbringer: { name: "Chaosbringer" },
  "cold-resistance": {
    name: "Eigenschaft: Kältewiderstand",
    summary: "Rüstung oder Schild: Widerstand 10 gegen Kälte.",
  },
  "cold-resistance-greater": { name: "Eigenschaft: Kältewiderstand, groß", summary: "Widerstand 30 gegen Kälte." },
  "cold-resistance-improved": {
    name: "Eigenschaft: Kältewiderstand, verbessert",
    summary: "Widerstand 20 gegen Kälte.",
  },
  "cold-warding": { name: "Eigenschaft: Kälteabschirmung" },
  "dagger-of-venom": {
    name: "Giftdolch",
    summary: "Ein +1 Dolch, der einmal am Tag Gift auf der Klinge erzeugt (Fortitude SG 14, 1d6 CON).",
  },
  dancing: {
    name: "Eigenschaft: Tanzend",
    summary: "Waffe: kämpft vier Runden von allein weiter, während der Träger die Hände frei hat.",
  },
  "darkwood-buckler": {
    name: "Dunkelholz-Faustschild",
    summary: "Aus Dunkelholz: halb so schwer und ohne Malus auf Fertigkeiten.",
  },
  "darkwood-shield": {
    name: "Dunkelholzschild",
    summary: "Ein schwerer Schild aus Dunkelholz: halb so schwer und ohne Malus auf Fertigkeiten.",
  },
  defending: {
    name: "Eigenschaft: Verteidigend",
    summary: "Waffe: man kann ihren Bonus vom Angriff auf den RK verlegen, Runde für Runde neu.",
  },
  "demon-armor": {
    name: "Dämonenrüstung",
    summary: "+4 Vollplatte mit Klauen, die Krankheit übertragen — aber sie behindert das eigene Zaubern.",
  },
  disruption: {
    name: "Eigenschaft: Zerschmetterung",
    summary: "Stumpfe Waffe: ein Treffer kann einen Untoten auf einen Schlag vernichten (Will SG 14).",
  },
  distance: { name: "Eigenschaft: Weitschuss", summary: "Fernkampfwaffe: doppelte Reichweite." },
  "distant-shot": { name: "Eigenschaft: Fernschuss" },
  "dragonhide-plate": {
    name: "Drachenhautplatte",
    summary: "Vollplatte aus Drachenhaut — ganz ohne Metall, also auch für Druiden.",
  },
  "dragonskin-armor": { name: "Drachenschuppenrüstung" },
  dread: { name: "Eigenschaft: Grauen" },
  "dwarven-plate": {
    name: "Zwergenplatte",
    summary: "Vollplatte aus Zwergenschmiede: 25 lb leichter als eine gewöhnliche.",
  },
  "dwarven-thrower": {
    name: "Zwergenwerfer",
    summary: "Ein Kriegshammer, den ein Zwerg werfen kann: +3 im Wurf, +2d6 Schaden gegen Riesen, kehrt zurück.",
  },
  "electricity-resistance": {
    name: "Eigenschaft: Blitzwiderstand",
    summary: "Rüstung oder Schild: Widerstand 10 gegen Blitz.",
  },
  "electricity-resistance-greater": {
    name: "Eigenschaft: Blitzwiderstand, groß",
    summary: "Widerstand 30 gegen Blitz.",
  },
  "electricity-resistance-improved": {
    name: "Eigenschaft: Blitzwiderstand, verbessert",
    summary: "Widerstand 20 gegen Blitz.",
  },
  "elven-chain": {
    name: "Elfenkette",
    summary: "Ein Kettenhemd aus Elfenhand: gilt als leichte Rüstung, DEX zählt bis +4, Malus nur −2.",
  },
  "elven-greatbow": { name: "Elfischer Großbogen" },
  etherealness: {
    name: "Eigenschaft: Ätherform",
    summary: "Rüstung: dreimal am Tag zehn Minuten körperlos.",
  },
  everdancing: { name: "Eigenschaft: Immertanzend" },
  "everwhirling-chain": { name: "Immerwirbelnde Kette" },
  "exceptional-arrow-deflection": { name: "Eigenschaft: Außergewöhnliche Pfeilablenkung" },
  "fiery-blast": { name: "Eigenschaft: Feuerstoß" },
  finaldeath: { name: "Endtod" },
  "fire-resistance": {
    name: "Eigenschaft: Feuerwiderstand",
    summary: "Rüstung oder Schild: Widerstand 10 gegen Feuer.",
  },
  "fire-resistance-greater": { name: "Eigenschaft: Feuerwiderstand, groß", summary: "Widerstand 30 gegen Feuer." },
  "fire-resistance-improved": {
    name: "Eigenschaft: Feuerwiderstand, verbessert",
    summary: "Widerstand 20 gegen Feuer.",
  },
  "fire-warding": { name: "Eigenschaft: Feuerabschirmung" },
  "flame-tongue": {
    name: "Flammenzunge",
    summary: "Ein +1 Langschwert, das auf Befehl brennt: +1d6 Feuerschaden, und es leuchtet wie eine Fackel.",
  },
  flaming: {
    name: "Eigenschaft: Flammend",
    summary: "Waffe: auf Befehl +1d6 Feuerschaden bei jedem Treffer.",
  },
  "flaming-burst": {
    name: "Eigenschaft: Flammenausbruch",
    summary: "Waffe: +1d6 Feuer bei jedem Treffer, und beim kritischen Treffer noch 1d10 je Faktor obendrauf.",
  },
  "fortification-armor-shield": {
    name: "Eigenschaft: Befestigung",
    summary: "Rüstung oder Schild: eine Chance, dass ein kritischer Treffer oder Hinterhältiger Angriff gar nicht wirkt.",
  },
  frost: { name: "Eigenschaft: Frost", summary: "Waffe: auf Befehl +1d6 Kälteschaden bei jedem Treffer." },
  "frost-brand": {
    name: "Frostbrand",
    summary: "Ein +3 Zweihänder: +1d10 Kälte, Schutz gegen Feuer, und er löscht Flammen im Umkreis von 6 m.",
  },
  "ghost-touch": {
    name: "Eigenschaft: Geisterberührung (Rüstung)",
    summary: "Rüstung: sie schützt auch gegen körperlose Wesen — und wird mit ihm körperlos.",
  },
  "ghost-touch-weapon": {
    name: "Eigenschaft: Geisterberührung (Waffe)",
    summary: "Waffe: trifft körperlose Wesen ohne die halbe Fehlschlagchance.",
  },
  glamered: {
    name: "Eigenschaft: Verglamt",
    summary: "Rüstung: sieht auf Befehl wie gewöhnliche Kleidung aus.",
  },
  "great-invulnerability-10-epic": { name: "Eigenschaft: Große Unverwundbarkeit (10/episch)" },
  "great-invulnerability-10-magic": { name: "Eigenschaft: Große Unverwundbarkeit (10/magisch)" },
  "great-invulnerability-15-magic": { name: "Eigenschaft: Große Unverwundbarkeit (15/magisch)" },
  "great-invulnerability-5-epic": { name: "Eigenschaft: Große Unverwundbarkeit (5/episch)" },
  "great-reflection": { name: "Eigenschaft: Große Spiegelung" },
  "great-spell-resistance-21": { name: "Eigenschaft: Große Zauberresistenz (21)" },
  "great-spell-resistance-23": { name: "Eigenschaft: Große Zauberresistenz (23)" },
  "great-spell-resistance-25": { name: "Eigenschaft: Große Zauberresistenz (25)" },
  "great-spell-resistance-27": { name: "Eigenschaft: Große Zauberresistenz (27)" },
  gripsoul: { name: "Seelengriff" },
  holy: {
    name: "Eigenschaft: Heilig",
    summary: "Waffe: +2d6 Schaden gegen alles Böse, und sie gilt als gut.",
  },
  "holy-avenger": {
    name: "Heiliger Rächer",
    summary: "Das Schwert des Paladins: +5, +2d6 gegen Böses, Zauberresistenz und ein Schutzkreis um den Träger.",
  },
  "holy-devastator": { name: "Heiliger Verheerer" },
  "holy-power": { name: "Eigenschaft: Heilige Macht" },
  "icy-blast": { name: "Eigenschaft: Eisstoß" },
  "icy-burst": {
    name: "Eigenschaft: Eisausbruch",
    summary: "Waffe: +1d6 Kälte bei jedem Treffer, und beim kritischen Treffer noch 1d10 je Faktor obendrauf.",
  },
  "infinite-arrow-deflection": { name: "Eigenschaft: Unendliche Pfeilablenkung" },
  "invulnerability-armor": {
    name: "Eigenschaft: Unverwundbarkeit",
    summary: "Rüstung: Schadensreduktion 5/magisch.",
  },
  "javelin-of-lightning": {
    name: "Blitzwurfspeer",
    summary: "Geworfen wird er zu einem Blitz: 5d6 Schaden auf der ganzen Bahn.",
  },
  keen: {
    name: "Eigenschaft: Geschärft",
    summary: "Schneidende oder stechende Waffe: doppelt so großer kritischer Bereich (aus 19-20 wird 17-20).",
  },
  "ki-focus": {
    name: "Eigenschaft: Ki-Fokus",
    summary: "Waffe: die besonderen Schläge des Mönchs wirken auch durch sie hindurch.",
  },
  "life-drinker": {
    name: "Lebenstrinker",
    summary: "Eine +1 Große Axt, die Stufen raubt — aber auch dem Träger jedes Mal Trefferpunkte kostet.",
  },
  "lightning-blast": { name: "Eigenschaft: Blitzstoß" },
  "lightning-warding": { name: "Eigenschaft: Blitzabschirmung" },
  "lion-s-shield": {
    name: "Löwenschild",
    summary: "Ein +2 Schild mit einem Löwenkopf, der von allein zubeißt (2d6).",
  },
  "luck-blade-0-wishes": {
    name: "Glücksklinge (0 Wünsche)",
    summary: "Ein +2 Kurzschwert: +1 auf alle Rettungswürfe und einmal am Tag einen Würfelwurf wiederholen.",
  },
  "luck-blade-1-wish": { name: "Glücksklinge (1 Wunsch)", summary: "Wie die Glücksklinge, mit einem Wunsch darin." },
  "luck-blade-2-wishes": { name: "Glücksklinge (2 Wünsche)", summary: "Wie die Glücksklinge, mit zwei Wünschen darin." },
  "luck-blade-3-wishes": { name: "Glücksklinge (3 Wünsche)", summary: "Wie die Glücksklinge, mit drei Wünschen darin." },
  "mace-of-ruin": { name: "Streitkolben des Verderbens" },
  "mace-of-smiting": {
    name: "Streitkolben des Niederstreckens",
    summary: "Ein +3 Schwerer Streitkolben: +4 und doppelter Schaden gegen Konstrukte, und er kann sie zerschlagen.",
  },
  "mace-of-terror": {
    name: "Streitkolben des Schreckens",
    summary: "Ein +2 Schwerer Streitkolben, der dreimal am Tag Furcht verbreitet.",
  },
  "masterwork-cold-iron-longsword": {
    name: "Meisterhaftes Langschwert aus Kaltem Eisen",
    summary: "Kaltes Eisen: durchdringt die Schadensreduktion von Dämonen und Feen.",
  },
  merciful: {
    name: "Eigenschaft: Barmherzig",
    summary: "Waffe: +1d6 Schaden, aber ALLES davon nichttödlich — der Gegner fällt, ohne zu sterben.",
  },
  "mighty-cleaving": {
    name: "Eigenschaft: Mächtiges Spalten",
    summary: "Waffe: mit dem Talent Cleave darf man zweimal in der Runde nachschlagen statt einmal.",
  },
  "mighty-disruption": { name: "Eigenschaft: Mächtige Zerschmetterung" },
  "mithral-full-plate-of-speed": {
    name: "Mithral-Vollplatte der Schnelligkeit",
    summary: "+1 Vollplatte aus Mithral: leichter, weniger Malus, und zehn Runden Haste am Tag.",
  },
  "mithral-heavy-shield": {
    name: "Mithral-Schwerschild",
    summary: "Aus Mithral: halbes Gewicht, ein Punkt weniger Malus.",
  },
  "mithral-shirt": {
    name: "Mithralhemd",
    summary: "Ein Kettenhemd aus Mithral: 10 lb, DEX bis +6, Malus 0 — und es gilt als leichte Rüstung.",
  },
  negating: { name: "Eigenschaft: Auslöschend" },
  "nine-lives-stealer": {
    name: "Neunlebenräuber",
    summary: "Ein +2 Langschwert: neunmal kann ein kritischer Treffer den Gegner auf der Stelle töten.",
  },
  oathbow: {
    name: "Schwurbogen",
    summary: "Ein +2 Langbogen: gegen den erklärten Feind +5 Angriff und +2d6 Schaden — dafür eine Woche gegen alle anderen −1.",
  },
  "plate-armor-of-the-deep": {
    name: "Plattenrüstung der Tiefe",
    summary: "+1 Vollplatte, in der man unter Wasser atmen, sehen und sich frei bewegen kann.",
  },
  "quarterstaff-of-alacrity": { name: "Kampfstab der Behändigkeit" },
  "rapier-of-puncturing": {
    name: "Rapier des Durchbohrens",
    summary: "Ein +2 Rapier: dreimal am Tag ein Stich, der 1d6 CON raubt.",
  },
  reflecting: {
    name: "Eigenschaft: Spiegelnd",
    summary: "Schild: wirft einmal am Tag einen Zauber auf seinen Verursacher zurück.",
  },
  returning: {
    name: "Eigenschaft: Zurückkehrend",
    summary: "Wurfwaffe: kommt nach dem Wurf in die Hand zurück, gleich in der nächsten Runde.",
  },
  "rhino-hide": {
    name: "Rhinozeroshaut",
    summary: "+2 Fellrüstung: im Ansturm macht der Träger 2d6 Schaden mehr.",
  },
  "screaming-bolt": {
    name: "Schreiender Bolzen",
    summary: "Ein +2 Bolzen, dessen Schrei alle Gegner in der Nähe in Furcht setzt.",
  },
  seeking: {
    name: "Eigenschaft: Suchend",
    summary: "Fernkampfwaffe: findet ihr Ziel auch um Deckung und Sichtschutz herum.",
  },
  shadow: { name: "Eigenschaft: Schatten", summary: "Rüstung: +5 auf Verstecken." },
  "shadow-greater": { name: "Eigenschaft: Schatten, groß", summary: "Rüstung: +15 auf Verstecken." },
  "shadow-improved": { name: "Eigenschaft: Schatten, verbessert", summary: "Rüstung: +10 auf Verstecken." },
  "shapeshifter-s-armor": { name: "Rüstung des Gestaltwandlers" },
  shatterspike: {
    name: "Splitterdorn",
    summary: "Ein +1 Langschwert, das darauf gebaut ist, andere Waffen zu zerschlagen.",
  },
  "shifter-s-sorrow": {
    name: "Kummer des Wandlers",
    summary: "Eine +1 Zweiklingenwaffe, die gegen Gestaltwandler besonders hart trifft.",
  },
  shock: { name: "Eigenschaft: Schock", summary: "Waffe: auf Befehl +1d6 Blitzschaden bei jedem Treffer." },
  "shocking-burst": {
    name: "Eigenschaft: Schockausbruch",
    summary: "Waffe: +1d6 Blitz bei jedem Treffer, und beim kritischen Treffer noch 1d10 je Faktor obendrauf.",
  },
  "silent-moves": { name: "Eigenschaft: Lautlose Bewegung", summary: "Rüstung: +5 auf Leise bewegen." },
  "silent-moves-greater": {
    name: "Eigenschaft: Lautlose Bewegung, groß",
    summary: "Rüstung: +15 auf Leise bewegen.",
  },
  "silent-moves-improved": {
    name: "Eigenschaft: Lautlose Bewegung, verbessert",
    summary: "Rüstung: +10 auf Leise bewegen.",
  },
  "silver-dagger-masterwork": {
    name: "Meisterhafter Silberdolch",
    summary: "Silber: durchdringt die Schadensreduktion von Werwesen — kostet dafür 1 Punkt Schaden.",
  },
  "slaying-arrow-greater": {
    name: "Todespfeil, groß",
    summary: "Ein Pfeil, der eine bestimmte Art von Wesen auf einen Treffer töten kann (Fortitude SG 23).",
  },
  "sleep-arrow": {
    name: "Schlafpfeil",
    summary: "Ein +1 Pfeil: statt Schaden schläft das Ziel ein (Will SG 11).",
  },
  slick: { name: "Eigenschaft: Glatt", summary: "Rüstung: +5 auf Entfesseln." },
  "slick-greater": { name: "Eigenschaft: Glatt, groß", summary: "Rüstung: +15 auf Entfesseln." },
  "slick-improved": { name: "Eigenschaft: Glatt, verbessert", summary: "Rüstung: +10 auf Entfesseln." },
  "sonic-blast": { name: "Eigenschaft: Schallstoß" },
  "sonic-resistance": {
    name: "Eigenschaft: Schallwiderstand",
    summary: "Rüstung oder Schild: Widerstand 10 gegen Schall.",
  },
  "sonic-resistance-greater": { name: "Eigenschaft: Schallwiderstand, groß", summary: "Widerstand 30 gegen Schall." },
  "sonic-resistance-improved": {
    name: "Eigenschaft: Schallwiderstand, verbessert",
    summary: "Widerstand 20 gegen Schall.",
  },
  "sonic-warding": { name: "Eigenschaft: Schallabschirmung" },
  souldrinker: { name: "Seelentrinker" },
  speed: {
    name: "Eigenschaft: Schnelligkeit",
    summary: "Waffe: ein zusätzlicher Angriff in jeder Runde, mit dem vollen Bonus.",
  },
  "spell-resistance-13": { name: "Eigenschaft: Zauberresistenz (13)", summary: "Rüstung: Zauberresistenz 13." },
  "spell-resistance-15": { name: "Eigenschaft: Zauberresistenz (15)", summary: "Rüstung: Zauberresistenz 15." },
  "spell-resistance-17": { name: "Eigenschaft: Zauberresistenz (17)", summary: "Rüstung: Zauberresistenz 17." },
  "spell-resistance-19": { name: "Eigenschaft: Zauberresistenz (19)", summary: "Rüstung: Zauberresistenz 19." },
  "spell-storing": {
    name: "Eigenschaft: Zauberspeicherung",
    summary: "Waffe: nimmt einen Zauber bis Grad 3 auf und entlädt ihn beim nächsten Treffer.",
  },
  "spined-shield": {
    name: "Dornenschild",
    summary: "Ein +1 Schild, dessen Dornen sich als Geschosse abschießen lassen.",
  },
  stormbrand: { name: "Sturmbrand" },
  "sun-blade": {
    name: "Sonnenklinge",
    summary: "Ein +2 Kurzschwert, das wie ein Langschwert Schaden macht — und gegen Untote als +4 mit doppeltem Schaden.",
  },
  "sword-of-life-stealing": {
    name: "Schwert des Lebensraubs",
    summary: "Ein +2 Langschwert: ein kritischer Treffer raubt eine Stufe und gibt dem Träger 1d6 TP.",
  },
  "sword-of-subtlety": {
    name: "Schwert der Feinheit",
    summary: "Ein +1 Kurzschwert: +4 Angriff und Schaden beim Hinterhältigen Angriff.",
  },
  "sword-of-the-planes": {
    name: "Schwert der Ebenen",
    summary: "Ein +1 Langschwert, das auf anderen Ebenen stärker wird — bis +4.",
  },
  "sylvan-scimitar": {
    name: "Waldkrummschwert",
    summary: "Ein +3 Krummschwert, das im Wald 2d6 Schaden mehr macht.",
  },
  throwing: {
    name: "Eigenschaft: Wurfbereit",
    summary: "Nahkampfwaffe: lässt sich werfen, mit 3 m Reichweitenschritt.",
  },
  thundering: {
    name: "Eigenschaft: Donnernd",
    summary: "Waffe: beim kritischen Treffer 2d8 Schallschaden, und das Ziel kann taub werden.",
  },
  "trident-of-fish-command": {
    name: "Dreizack des Fischbefehls",
    summary: "Befehligt Wassertiere im Umkreis von 18 m — bis zu 14 Trefferwürfel wert.",
  },
  "trident-of-warning": {
    name: "Dreizack der Warnung",
    summary: "Zeigt auf Befehl, wo im Umkreis von 210 m gefährliche Wassertiere sind.",
  },
  "triple-throw": { name: "Eigenschaft: Dreifachwurf" },
  "undead-controlling": {
    name: "Eigenschaft: Untotenbeherrschung",
    summary: "Waffe: beherrscht bis zu 26 Trefferwürfel Untote auf Befehl.",
  },
  "unerring-accuracy": { name: "Eigenschaft: Unfehlbare Treffsicherheit" },
  unholy: {
    name: "Eigenschaft: Unheilig",
    summary: "Waffe: +2d6 Schaden gegen alles Gute, und sie gilt als böse.",
  },
  "unholy-despoiler": { name: "Unheiliger Schänder" },
  "unholy-power": { name: "Eigenschaft: Unheilige Macht" },
  vicious: {
    name: "Eigenschaft: Bösartig",
    summary: "Waffe: +2d6 Schaden am Gegner — und 1d6 am Träger selbst.",
  },
  vorpal: {
    name: "Eigenschaft: Köpfend",
    summary: "Schneidende Waffe: eine natürliche 20 schlägt den Kopf ab. Der Gegner ist tot.",
  },
  "warlord-s-breastplate": { name: "Brustplatte des Kriegsherrn" },
  wild: {
    name: "Eigenschaft: Wild",
    summary: "Rüstung: sie verwandelt sich mit dem Träger und wirkt auch in Tiergestalt weiter.",
  },
  "winged-shield": {
    name: "Geflügelter Schild",
    summary: "Ein +3 Schild, der dreimal am Tag fünf Minuten Fliegen erlaubt.",
  },
  wounding: {
    name: "Eigenschaft: Verwundend",
    summary: "Waffe: jeder Treffer raubt 1 TP dauerhaft — die Wunde blutet weiter.",
  },
};

// ===========================================================================
//  Verfluchtes und Artefakte — 52 Einträge
// ===========================================================================
/*
  Diese Gruppe ist im Blätterer eigens benannt („Verflucht“, „Artefakte“). Die
  Erklärung sagt deshalb, WAS sie tut, auch wenn das unangenehm ist: ein
  verfluchter Gegenstand, dessen Fluch verschwiegen wird, ist eine Falle in der
  eigenen App. Der DM entscheidet, ob der Spieler es weiß — die App verschweigt
  es nicht von sich aus.
*/
const OTHER: Record<string, ItemGerman> = {
  "amulet-of-inescapable-location": {
    name: "Amulett der unentrinnbaren Ortung",
    summary: "Verflucht: sieht aus wie ein Schutzamulett, macht den Träger aber ERST RICHTIG auffindbar.",
  },
  annulus: { name: "Annulus", summary: "Artefakt: der Ring, der Magie aus der Welt tilgt." },
  "armor-of-arrow-attraction": {
    name: "Rüstung der Pfeilanziehung",
    summary: "Verflucht: sieht aus wie +3, zieht aber jeden Fernkampfangriff auf sich (−5 RK dagegen).",
  },
  "armor-of-rage": {
    name: "Rüstung des Zorns",
    summary: "Verflucht: −4 CHA, und Gefährten wenden sich gegen den Träger.",
  },
  "axe-of-the-dwarvish-lords": {
    name: "Axt der Zwergenfürsten",
    summary: "Artefakt: die Streitaxt der zwergischen Könige.",
  },
  "bag-of-devouring": {
    name: "Beutel des Verschlingens",
    summary: "Verflucht: sieht aus wie ein Beutel des Fassens, frisst aber, was hineingelegt wird — auch Hände.",
  },
  "book-of-infinite-spells": {
    name: "Buch der unendlichen Zauber",
    summary: "Artefakt: jede Seite ein Zauber, den jeder wirken kann — aber die Seiten blättern von allein weiter.",
  },
  "boots-of-dancing": {
    name: "Stiefel des Tanzens",
    summary: "Verflucht: im Kampf beginnt der Träger unfreiwillig zu tanzen.",
  },
  "bracers-of-defenselessness": {
    name: "Armschienen der Schutzlosigkeit",
    summary: "Verflucht: wirken erst wie +5 Armschienen, dann −5 RK, sobald es ernst wird.",
  },
  "broom-of-animated-attack": {
    name: "Besen des belebten Angriffs",
    summary: "Verflucht: sieht aus wie ein Flugbesen, wirft aber den Reiter ab und greift ihn an.",
  },
  "cloak-of-poisonousness": {
    name: "Umhang der Giftigkeit",
    summary: "Verflucht: wer ihn umlegt, wird vergiftet — und kann ihn nicht mehr abnehmen.",
  },
  "codex-of-the-infinite-planes": {
    name: "Kodex der unendlichen Ebenen",
    summary: "Artefakt: das Buch, das jede Ebene öffnet — und den Leser dabei zerstört.",
  },
  "crystal-hypnosis-ball": {
    name: "Kristallkugel der Hypnose",
    summary: "Verflucht: sieht aus wie eine Kristallkugel, macht aber den Benutzer dem Schöpfer hörig.",
  },
  "cup-and-talisman-of-the-demigod": {
    name: "Kelch und Talisman des Halbgottes",
    summary: "Artefakt: Kelch und Talisman, die Wasser heiligen und Untote bannen.",
  },
  "deck-of-many-things": {
    name: "Kartenspiel der vielen Dinge",
    summary: "Artefakt: jede gezogene Karte ändert das Schicksal — Reichtum, Stufen, oder der Tod.",
  },
  "dust-of-sneezing-and-choking": {
    name: "Staub des Niesens und Erstickens",
    summary: "Verflucht: sieht aus wie Staub der Enthüllung, erstickt aber alle in der Nähe.",
  },
  "eye-of-the-orc": { name: "Auge des Orks", summary: "Artefakt: der Streitkolben der orkischen Kriegsherren." },
  "flask-of-curses": {
    name: "Flasche der Flüche",
    summary: "Verflucht: geöffnet entlässt sie einen Fluch oder ein feindliches Wesen.",
  },
  "gauntlets-of-fumbling": {
    name: "Handschuhe des Fummelns",
    summary: "Verflucht: wirken erst wie Ogerkraft, lassen dann aber alles fallen — und gehen nicht mehr ab.",
  },
  "golem-armor": { name: "Golemrüstung", summary: "Artefakt: eine Rüstung, die den Träger zum Golem macht." },
  "hammer-of-thunderbolts": {
    name: "Hammer der Donnerkeile",
    summary: "Artefakt: ein Kriegshammer, der Riesen auf einen Schlag tötet — mit Gürtel und Handschuhen zusammen.",
  },
  "helm-of-opposite-alignment": {
    name: "Helm der entgegengesetzten Gesinnung",
    summary: "Verflucht: aufgesetzt kehrt er die Gesinnung des Trägers um. Dauerhaft.",
  },
  "incense-of-obsession": {
    name: "Weihrauch der Besessenheit",
    summary: "Verflucht: sieht aus wie Weihrauch der Meditation, lässt den Zauberer aber selbstsicher und wirkungslos werden.",
  },
  "invulnerable-coat": {
    name: "Unverwundbarer Mantel",
    summary: "Artefakt: ein Kettenhemd, das kaum etwas durchlässt.",
  },
  "iron-gauntlet-of-war": {
    name: "Eiserner Kriegshandschuh",
    summary: "Artefakt: der Handschuh, der Heere führt.",
  },
  "mace-of-blood": {
    name: "Streitkolben des Blutes",
    summary: "Verflucht: er verlangt jede Woche eigenes Blut — und zieht den Träger zum Bösen.",
  },
  "medallion-of-thought-projection": {
    name: "Medaillon der Gedankenübertragung",
    summary: "Verflucht: es liest keine Gedanken, es SENDET die eigenen — an den, den man belauschen wollte.",
  },
  "necklace-of-strangulation": {
    name: "Halskette der Erdrosselung",
    summary: "Verflucht: sie erwürgt den Träger und lässt sich nicht abnehmen.",
  },
  "net-of-snaring": {
    name: "Netz des Fangens",
    summary: "Verflucht: es funktioniert nur unter Wasser — an Land ist es ein gewöhnliches Netz.",
  },
  "periapt-of-foul-rotting": {
    name: "Amulett der übelen Fäulnis",
    summary: "Verflucht: der Träger verfällt — 1 Punkt CON am Tag, bis er es loswird.",
  },
  "philosopher-s-stone": {
    name: "Stein der Weisen",
    summary: "Artefakt: verwandelt Eisen in Gold und Silber, und macht das Elixier des Lebens.",
  },
  "potion-of-poison": {
    name: "Gifttrank",
    summary: "Verflucht: sieht aus wie ein Trank, ist aber Gift (Fortitude SG 16, 1d10 CON).",
  },
  "psicrown-of-the-crystal-mind": {
    name: "Psikrone des Kristallgeistes",
    summary: "Artefakt: die Krone, die Gedankenkräfte bündelt.",
  },
  "ring-of-clumsiness": {
    name: "Ring der Unbeholfenheit",
    summary: "Verflucht: −4 DEX und alle Zauber schlagen fehl. Er sieht aus wie etwas Gutes.",
  },
  "ring-of-nine-facets": {
    name: "Ring der neun Facetten",
    summary: "Artefakt: der Ring, der Gedankenmagie hält.",
  },
  "robe-of-powerlessness": {
    name: "Robe der Machtlosigkeit",
    summary: "Verflucht: angelegt fallen STR und INT auf 3, und man vergisst jeden Zauber.",
  },
  "robe-of-vermin": {
    name: "Robe des Ungeziefers",
    summary: "Verflucht: im Kampf beißt und sticht es unter der Robe — der Träger kann sich nicht sammeln.",
  },
  "scarab-of-death": {
    name: "Skarabäus des Todes",
    summary: "Verflucht: nach einer Woche am Körper gräbt er sich hinein und tötet in sechs Runden.",
  },
  "spear-cursed-backbiter": {
    name: "Speer, verfluchter Rückenbeißer",
    summary: "Verflucht: bei jedem Angriff eine Chance, dass er den Werfer selbst trifft — mit doppeltem Bonus.",
  },
  "sphere-of-annihilation": {
    name: "Sphäre der Vernichtung",
    summary: "Artefakt: eine Kugel aus Nichts. Was sie berührt, hört auf zu sein.",
  },
  "staff-of-the-magi": {
    name: "Stab der Magier",
    summary: "Artefakt: der mächtigste Stab — viele Zauber, Zauberabsorption, und zerbrochen eine Explosion.",
  },
  "stone-of-weight-loadstone": {
    name: "Stein des Gewichts (Bürdestein)",
    summary: "Verflucht: sieht aus wie ein Glücksstein, halbiert aber die Bewegung — und lässt sich schwer loswerden.",
  },
  "sword-berserking": {
    name: "Schwert, berserkernd",
    summary: "Verflucht: ein +2 Zweihänder, der den Träger im Kampf rasend macht — auch gegen Freunde.",
  },
  "talisman-of-pure-good": {
    name: "Talisman des reinen Guten",
    summary: "Artefakt: in der Hand eines guten Klerikers verschlingt er böse Priester.",
  },
  "talisman-of-reluctant-wishes": {
    name: "Talisman der widerwilligen Wünsche",
    summary: "Artefakt: er erfüllt Wünsche — oder verschlingt den, der ihn hält.",
  },
  "talisman-of-the-sphere": {
    name: "Talisman der Sphäre",
    summary: "Artefakt: nur mit ihm lässt sich eine Sphäre der Vernichtung lenken.",
  },
  "talisman-of-ultimate-evil": {
    name: "Talisman des äußersten Bösen",
    summary: "Artefakt: in der Hand eines bösen Klerikers verschlingt er gute Priester.",
  },
  "the-moaning-diamond": {
    name: "Der klagende Diamant",
    summary: "Artefakt: der Diamant, der Stein und Erde formt.",
  },
  "the-orbs-of-dragonkind": {
    name: "Die Kugeln der Drachenart",
    summary: "Artefakt: Kugeln, die Drachen beherrschen — jede für eine Art.",
  },
  "the-saint-s-mace": {
    name: "Der Streitkolben des Heiligen",
    summary: "Artefakt: der Streitkolben, der Untote zerschlägt.",
  },
  "the-shadowstaff": {
    name: "Der Schattenstab",
    summary: "Artefakt: der Stab, der Schatten befehligt — und den Träger blasser werden lässt.",
  },
  "vacuous-grimoire": {
    name: "Leeres Zauberbuch",
    summary: "Verflucht: wer darin liest, verliert dauerhaft INT und WIS. Und es lässt sich kaum vernichten.",
  },
};

// ===========================================================================
//  Nachschlagen
// ===========================================================================

/**
 * Alle Handtabellen unter EINER Kennung. Doppelte Schlüssel wären hier
 * unsichtbar — der spätere gewinnt lautlos —, deshalb prüft der Test die
 * Tabellen auch gegeneinander, nicht nur gegen das Pack.
 */
const BY_ID: Record<string, ItemGerman> = {
  ...WEAPONS,
  ...ARMOR,
  ...GEAR,
  ...TOOLS,
  ...RINGS,
  ...RODS,
  ...STAVES,
  ...WONDROUS,
  ...MAGIC,
  ...OTHER,
};

/**
 * Namen, die auf Deutsch GENAUSO heißen — mit Absicht, nicht aus Versehen.
 *
 * Der Test verlangt sonst, dass jeder deutsche Name sich vom englischen
 * unterscheidet: eine kopierte Zeile fällt dadurch auf. Diese zwölf sind echte
 * Ausnahmen — Lehnwörter aus dem Japanischen (Kama, Kukri, Nunchaku, Sai,
 * Shuriken, Siangham), Fachwörter, die im Deutschen so heißen (Bolas, Rapier,
 * Ranseur, Hammer), ein lateinischer Artefaktname (Annulus) und ein Eigenname
 * (Chaosbringer). Sie hier zu nennen ist eine Entscheidung, kein Versehen.
 */
export const ITEM_GERMAN_SAME_AS_ENGLISH: ReadonlySet<string> = new Set([
  "annulus",
  "bolas",
  "chaosbringer",
  "hammer",
  "kama",
  "kukri",
  "nunchaku",
  "ranseur",
  "rapier",
  "sai",
  "shuriken-5",
  "siangham",
]);

/** Die einzelnen Tabellen, für den Test: welcher Schlüssel steht doppelt? */
export const ITEM_GERMAN_TABLES: Record<string, Record<string, ItemGerman>> = {
  WEAPONS,
  ARMOR,
  GEAR,
  TOOLS,
  RINGS,
  RODS,
  STAVES,
  WONDROUS,
  MAGIC,
  OTHER,
};

/**
 * Die Arten, deren NAME der Zaubername ist. Hier wird nicht übersetzt, sondern
 * ein deutsches Wort davorgesetzt — der Zaubername bleibt englisch, wie jeder
 * Regelbegriff in diesem Projekt.
 */
const SPELL_WRAPPERS: Record<string, { word: string; summary: (spell: string) => string }> = {
  scroll: {
    word: "Schriftrolle",
    summary: (spell) =>
      `Eine Schriftrolle mit dem Zauber ${spell}. Einmal vorlesen, dann ist sie verbraucht — wirken kann sie nur, wer den Zauber auf seiner Klassenliste hat.`,
  },
  wand: {
    word: "Zauberstab",
    summary: (spell) =>
      `Ein Zauberstab, der ${spell} wirkt. 50 Ladungen, eine je Einsatz; benutzen kann ihn nur, wer den Zauber auf seiner Klassenliste hat.`,
  },
  potion: {
    word: "Trank",
    summary: (spell) =>
      `Ein Trank: getrunken wirkt ${spell} auf den Trinker selbst. Eine Aktion, dann ist er leer — trinken kann ihn jeder.`,
  },
};

/** `srd:item:longsword` → `longsword`. Nur SRD-Kennungen; Homebrew bleibt außen. */
function keyOf(entity: Pick<Entity, "id" | "source">): string | undefined {
  if (entity.source !== "srd") return undefined;
  return entity.id.startsWith("srd:item:") ? entity.id.slice("srd:item:".length) : undefined;
}

/**
 * Deutscher Name und Erklärung zu einem Gegenstand — oder `undefined`, wenn es
 * für ihn noch keinen gibt.
 *
 * `undefined` ist eine ehrliche Antwort und keine Lücke, die man mit dem
 * englischen Namen füllt: die Anzeige zeigt dann den englischen Namen und sagt
 * dazu, dass die deutsche Erklärung noch fehlt (wie bei den Talenten).
 */
export function itemGerman(entity: ItemEntity): ItemGerman | undefined {
  const key = keyOf(entity);
  if (key === undefined) return undefined;

  const hand = BY_ID[key];
  if (hand !== undefined) return hand;

  const wrapper = SPELL_WRAPPERS[entity.data.category];
  if (wrapper !== undefined) {
    return { name: `${wrapper.word}: ${entity.name}`, summary: wrapper.summary(entity.name) };
  }
  return undefined;
}

/**
 * Gegenstände OHNE deutschen Namen — die ehrliche Zählung.
 *
 * Der Test hält diese Liste auf null: eine neue Kennung im Pack soll laut
 * auffallen und nicht halb deutsch durchrutschen. Für den Bericht an Philipp
 * ist es dieselbe Zahl.
 */
export function itemsWithoutGerman(entities: readonly Entity[]): string[] {
  const out: string[] = [];
  for (const entity of entities) {
    if (entity.kind !== "item" || entity.deletedAt !== undefined) continue;
    if (keyOf(entity) === undefined) continue;
    if (itemGerman(entity) === undefined) out.push(entity.id);
  }
  return out.sort();
}

/** Gegenstände MIT deutschem Namen, aber ohne Erklärung. Auch das ehrlich gezählt. */
export function itemsWithoutGermanSummary(entities: readonly Entity[]): string[] {
  const out: string[] = [];
  for (const entity of entities) {
    if (entity.kind !== "item" || entity.deletedAt !== undefined) continue;
    const german = itemGerman(entity);
    if (german !== undefined && german.summary === undefined) out.push(entity.id);
  }
  return out.sort();
}

/**
 * Legt die deutschen Namen als `localized.de` über die Packs.
 *
 * Das ist der EINE Ort, an dem es passiert: `displayName` liest `localized.de.name`,
 * und damit stehen Gepäckliste, Auswahl, Angriffszeilen, Hände und die
 * Zusammenfassung des Assistenten in einem Zug auf Deutsch. `entity.name` bleibt
 * unangetastet — das ist der englische Originalname, der klein daneben steht.
 *
 * Ein schon vorhandener deutscher Name gewinnt: wer eine Pack-Zeile von Hand
 * übersetzt hat, soll sie nicht von hier überschrieben bekommen.
 */
export function withGermanItemNames(entities: readonly Entity[]): Entity[] {
  return entities.map((entity) => {
    if (entity.kind !== "item") return entity;
    const german = itemGerman(entity);
    if (german === undefined) return entity;

    const existing = entity.localized?.de;
    if (existing?.name !== undefined && existing.name !== "") return entity;

    return {
      ...entity,
      localized: {
        ...entity.localized,
        de: {
          ...existing,
          name: german.name,
          ...(german.summary !== undefined && existing?.summary === undefined
            ? { summary: german.summary }
            : {}),
        },
      },
    };
  });
}
