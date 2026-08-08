import type { Ability } from "../schema/common.js";
import type { DerivedSheet } from "./types.js";

/**
 * Schritt für Schritt durch eine Tagesfähigkeit — „so dass ich das korrekt ausführe".
 *
 * Sein Auftrag, wörtlich: „bei Turn undead hätte ich gerne einen Button der sagt
 * ‚wirken' dann öffnet sich eine infobox, die die Fähigkeit Schritt für Schritt durch
 * geht. Ich glaub Ziele auswählen, würfeln, schaden etc." Gefragt, für welche Fähigkeiten,
 * hat er entschieden: auch Niederstrecken, Wut und Bardenmusik.
 *
 * **Warum das in den KERN gehört und nicht in die Oberfläche:** jeder Schritt trägt echte
 * Zahlen dieses Bogens — die Probe ist `1d20+3`, weil sein CHA-Modifikator +3 ist, und der
 * Vertreibungsschaden ist `2d6+8`, weil er Kleriker 5 mit CHA +3 ist. Eine Anleitung mit
 * Platzhaltern wäre eine Bedienungsanleitung; eine mit seinen Zahlen ist ein Handgriff.
 * Und was Zahlen rechnet, gehört an die Stelle, die geprüft wird.
 *
 * **Was hier NICHT passiert: buchen.** Die Anleitung sagt im letzten Schritt, was der
 * Einsatz kostet — abgezogen wird er von der Oberfläche, mit Ansage und mit Rücknahme.
 * Dieselbe Trennung wie zwischen `planRest` und `applyRest`: was er gelesen hat, passiert
 * danach.
 */
export interface GuideStep {
  /** Kurze Überschrift des Schritts — „Ziele", „Probe", „Wirkung". */
  title: string;
  text: string;
  /**
   * Ein Würfelausdruck, den der Bogen wirklich werfen kann.
   *
   * Er muss durch `parseDice` gehen — sonst hätte der Knopf daneben nichts zu tun, und
   * genau so ist in diesem Projekt schon einmal ein toter Würfelknopf entstanden (krumme
   * Zahlen aus halben Fertigkeitsrängen). Der Test dazu prüft nicht den Text, sondern die
   * STRECKE: was hier steht, muss `parseDice` lesen können.
   */
  roll?: string;
  /** Was der Wurf bedeutet — steht als Beschriftung am Ergebnis. */
  rollLabel?: string;
}

export interface AbilityGuide {
  /** Derselbe Schlüssel wie beim Zähler-Vorschlag (`suggestedFrom`). */
  key: string;
  title: string;
  steps: GuideStep[];
  /**
   * Was ein Einsatz kostet, in seinen Worten — steht im letzten Schritt UND am Knopf,
   * der ihn bucht. Eine Zahl, die nur am Knopf steht, liest im Kampf niemand.
   */
  cost: string;
}

const CLASS_IDS = {
  cleric: "srd:class:cleric",
  paladin: "srd:class:paladin",
  bard: "srd:class:bard",
  barbarian: "srd:class:barbarian",
} as const;

function levelOf(sheet: DerivedSheet, classId: string): number {
  return sheet.classLevels.find((c) => c.classId === classId)?.level ?? 0;
}

function abilityMod(sheet: DerivedSheet, ability: Ability): number {
  return sheet.abilities[ability]?.mod ?? 0;
}

const signed = (value: number): string => `${value >= 0 ? "+" : ""}${value}`;

/**
 * Der Würfelausdruck für einen Wurf mit Modifikator — und `+0` fällt weg.
 *
 * `1d20+0` ist kein Fehler, sieht aber nach einem aus. Ein Minus bleibt stehen, weil es
 * eine Auskunft ist.
 */
function d20With(modifier: number): string {
  return modifier === 0 ? "1d20" : `1d20${signed(modifier)}`;
}

/**
 * Die Tabelle „Turning Undead" des SRD, als Rechnung statt als Tabelle.
 *
 * Das Ergebnis der Vertreibungsprobe sagt, wie stark der stärkste Untote sein darf, den
 * es trifft — relativ zur Vertreibungsstufe. Die Tabelle des Buches ist eine Treppe in
 * Dreierschritten, und genau so steht sie hier:
 *
 *   ≤ 0 → Stufe − 4 · 1–3 → − 3 · 4–6 → − 2 · 7–9 → − 1 · 10–12 → Stufe
 *   13–15 → + 1 · 16–18 → + 2 · 19–21 → + 3 · 22+ → + 4
 *
 * Ausgeschrieben als neun Zeilen wäre sie eine Fehlerquelle beim Abtippen; als Rechnung
 * ist sie eine Zeile mit einem Test daneben, der die Ränder von BEIDEN Seiten prüft.
 */
export function turningTableOffset(checkResult: number): number {
  if (checkResult <= 0) return -4;
  if (checkResult >= 22) return 4;
  /*
    1–3 → −3, 4–6 → −2 … Die Treppe beginnt bei 1 und steigt alle drei Punkte. `floor`
    statt `round`: bei 3 gilt noch die untere Stufe, und ein Punkt zu viel wäre am Tisch
    ein Untoter zu viel.
  */
  return Math.floor((checkResult - 1) / 3) - 3;
}

/**
 * Die Anleitung zu einer Fähigkeit — oder `undefined`, wenn es für sie keine gibt.
 *
 * `undefined` und keine leere Anleitung: die Oberfläche zeigt den „Wirken"-Knopf nur
 * dann, wenn wirklich etwas dahintersteht. Ein Knopf, der eine leere Box öffnet, ist die
 * Fehlerfamilie „etwas verspricht und tut nichts" — und die kostet dieses Projekt sonst
 * beim nächsten selbstgebauten Zähler.
 */
export function abilityGuide(key: string, sheet: DerivedSheet): AbilityGuide | undefined {
  switch (key) {
    case "turn-undead":
      return turnUndead(sheet);
    case "smite-evil":
      return smiteEvil(sheet);
    case "rage":
      return rage(sheet);
    case "bardic-music":
      return bardicMusic(sheet);
    default:
      return undefined;
  }
}

function turnUndead(sheet: DerivedSheet): AbilityGuide {
  const cha = abilityMod(sheet, "cha");
  /*
    Die Vertreibungsstufe ist die KLERIKERstufe; ein Paladin vertreibt ab Stufe 4 mit
    seiner Paladinstufe − 3. Das steht wörtlich so im SRD, und es ist der Grund, warum
    hier nicht einfach die Gesamtstufe steht: ein Kleriker 3 / Kämpfer 5 vertreibt wie
    ein Kleriker 3 und nicht wie eine Stufe-8-Figur.
  */
  const cleric = levelOf(sheet, CLASS_IDS.cleric);
  const paladin = levelOf(sheet, CLASS_IDS.paladin);
  const stufe = cleric > 0 ? cleric : Math.max(0, paladin - 3);
  const schaden = `2d6${signed(stufe + cha)}`;
  return {
    key: "turn-undead",
    title: "Untote vertreiben",
    cost: "1 Versuch",
    steps: [
      {
        title: "Ziele",
        text: "Alle Untoten in 60 ft, die dich sehen oder hören können. Wer volle Deckung hat, zählt nicht — und du suchst dir die Ziele nicht aus: es trifft von den Nächsten aus nach außen.",
      },
      {
        title: "Vertreibungsprobe",
        text: `1d20 + CHA-Modifikator (${signed(cha)}). Das Ergebnis sagt, wie stark der STÄRKSTE Untote sein darf, den es trifft — gemessen an deiner Vertreibungsstufe ${stufe}: bei 10–12 genau ${stufe} HD, je drei Punkte darüber eins mehr, darunter eins weniger.`,
        roll: d20With(cha),
        rollLabel: "Vertreibungsprobe",
      },
      {
        title: "Wie viele",
        text: `${schaden} — so viele HD Untote insgesamt (Stufe ${stufe} + CHA ${signed(cha)}). Angerechnet werden die NIEDRIGSTEN zuerst; reicht der Rest für den nächsten nicht mehr, bleibt er stehen.`,
        roll: schaden,
        rollLabel: "Vertreibungsschaden in HD",
      },
      {
        title: "Wirkung",
        text: `Vertriebene fliehen 10 Runden lang, so weit sie können. Ist deine Vertreibungsstufe mindestens doppelt so hoch wie ihre HD — also ab ${Math.floor(stufe / 2)} HD und darunter —, werden sie stattdessen VERNICHTET.`,
      },
    ],
  };
}

function smiteEvil(sheet: DerivedSheet): AbilityGuide {
  const cha = abilityMod(sheet, "cha");
  const paladin = levelOf(sheet, CLASS_IDS.paladin);
  /*
    Nur ein POSITIVER CHA-Modifikator kommt auf den Angriff — „add your Charisma bonus
    (if any)". Ein Malus zählt hier nicht; wer das übersieht, macht aus einer Fähigkeit
    eine Strafe.
  */
  const angriff = Math.max(0, cha);
  return {
    key: "smite-evil",
    title: "Böses niederstrecken",
    cost: "1 Einsatz",
    steps: [
      {
        title: "Vorher ansagen",
        text: "Du sagst es AN, bevor du würfelst. Ist das Ziel nicht böse, ist der Einsatz trotzdem verbraucht — deshalb steht dieser Schritt zuerst.",
      },
      {
        title: "Angriff",
        text:
          angriff > 0
            ? `Ein Angriff, mit +${angriff} extra aus deinem CHA-Modifikator.`
            : "Ein Angriff. Dein CHA-Modifikator ist nicht positiv, also kommt hier nichts dazu — nur ein Bonus zählt, ein Malus nicht.",
      },
      {
        title: "Schaden",
        text: `Trifft er, kommen +${paladin} Schaden dazu (1 je Paladinstufe).`,
      },
    ],
  };
}

function rage(sheet: DerivedSheet): AbilityGuide {
  const barbar = levelOf(sheet, CLASS_IDS.barbarian);
  const con = abilityMod(sheet, "con");
  /*
    Die Stufen der Wut: gewöhnlich +4/+4 und +2 auf Willen, ab Stufe 11 „Greater Rage"
    (+6/+6, +3) und ab 20 „Mighty Rage" (+8/+8, +4). Die Dauer rechnet mit dem ERHÖHTEN
    CON-Modifikator, und das ist die Stelle, an der man sich beim Nachrechnen am Tisch
    verzählt: aus CON 14 (+2) wird in der Wut CON 18 (+4), also 3 + 4 = 7 Runden.
  */
  const stufe = barbar >= 20 ? 8 : barbar >= 11 ? 6 : 4;
  const willen = barbar >= 20 ? 4 : barbar >= 11 ? 3 : 2;
  const conInWut = con + stufe / 2;
  const runden = 3 + conInWut;
  return {
    key: "rage",
    title: "Wut",
    cost: "1 Einsatz",
    steps: [
      {
        title: "Anfangen",
        text: "Eine freie Handlung, aber nur in deinem Zug — und nicht, wenn du erschöpft bist.",
      },
      {
        title: "Was sich ändert",
        text: `STR +${stufe}, CON +${stufe}, Willen +${willen}. Dafür RK −2, und Fertigkeiten auf DEX, INT oder CHA gehen nicht (außer Balance, Escape Artist, Intimidate und Ride).`,
      },
      {
        title: "Wie lange",
        text: `${runden} Runden: 3 + dein CON-Modifikator IN der Wut (${signed(con)} wird zu ${signed(conInWut)}). Du kannst vorher aufhören.`,
      },
      {
        title: "Danach",
        text:
          barbar >= 17
            ? "Ab Stufe 17 bist du danach NICHT erschöpft (Tireless Rage)."
            : "Danach bist du für den Rest der Begegnung erschöpft: STR −2, DEX −2, kein Laufen, keine zweite Wut.",
      },
    ],
  };
}

function bardicMusic(sheet: DerivedSheet): AbilityGuide {
  const bard = levelOf(sheet, CLASS_IDS.bard);
  /*
    Inspire Courage ist der Fall, der am Tisch fast immer gemeint ist — und der einzige,
    dessen Zahl mit der Stufe wächst: +1, ab Bard 8 +2, ab 14 +3, ab 20 +4.
  */
  const mut = bard >= 20 ? 4 : bard >= 14 ? 3 : bard >= 8 ? 2 : 1;
  /*
    Was diese Stufe überhaupt hergibt. Die Rangschwelle für Perform steht dabei, weil sie
    die zweite Bedingung ist — eine Liste, die nur die Stufe prüft, verspricht mehr, als
    der Bogen kann. Geprüft wird sie NICHT: die App warnt, sie sperrt nicht (der DM hat
    recht, nicht die App).
  */
  const kann = [
    "Countersong und Fascinate (Perform 3 Ränge)",
    `Inspire Courage (Perform 3): +${mut} auf Angriff und Waffenschaden, +${mut} gegen Verzauberung und Furcht`,
    ...(bard >= 3 ? ["Inspire Competence (Perform 6): +2 auf eine Fertigkeit"] : []),
    ...(bard >= 6 ? ["Suggestion (Perform 9)"] : []),
    ...(bard >= 9 ? ["Inspire Greatness (Perform 12)"] : []),
    ...(bard >= 12 ? ["Song of Freedom (Perform 15)"] : []),
    ...(bard >= 15 ? ["Inspire Heroics (Perform 18)"] : []),
    ...(bard >= 18 ? ["Mass Suggestion (Perform 21)"] : []),
  ];
  return {
    key: "bardic-music",
    title: "Bardenmusik",
    cost: "1 Einsatz",
    steps: [
      {
        title: "Was du anstimmst",
        text: `Auf Stufe ${bard} stehen dir offen: ${kann.join(" · ")}. Die Ränge in Perform sind die zweite Bedingung — die App rechnet sie nicht nach.`,
      },
      {
        title: "Anstimmen",
        text: "Eine Standard-Handlung. Singen, spielen oder rezitieren — und wer dich nicht hört, den erreicht es nicht.",
      },
      {
        title: "Wirkung",
        text: `Inspire Courage hält, solange du weiterspielst, und noch 5 Runden danach. Es ist ein MORAL-Bonus: er stapelt nicht mit einem zweiten aus derselben Quelle.`,
      },
    ],
  };
}
