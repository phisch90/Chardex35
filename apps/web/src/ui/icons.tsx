/**
 * Eigene Zeichen statt Emoji.
 *
 * Sein Auftrag: „Kannst du die Emojis durch eigene icons ersetzen?" Ja — und der Grund ist
 * mehr als Geschmack. Bei einem Emoji bestimmt die Schriftart des Geräts die Farbe, nicht
 * die App. Das hat schon einmal wehgetan: der Punkt „hier ist noch etwas offen" saß auf ✨,
 * und ein gelber Punkt auf gelben Funken ist kein Punkt mehr (elfte Falle in CLAUDE.md).
 *
 * Diese Zeichen sind Striche in `currentColor`. Daraus folgt alles, was sie besser macht:
 *
 *  - Der aktive Reiter färbt sein Zeichen MIT — der Druide bekommt ein grünes, der Paladin
 *    ein königsblaues. Bei einem Emoji war das unmöglich.
 *  - Auf dem Nachtbogen sind sie Tinte, nicht bunte Aufkleber.
 *  - Die Warnmarke liegt jetzt auf einer Fläche, deren Farbe wir kennen.
 *  - Und sie kommen aus dem Quelltext: kein Bild, keine Schrift, nichts, was offline fehlen
 *    könnte. Genau die Sorge, die bei den Papieren schon dazugehörte.
 *
 * Gezeichnet für 18–20 px. Deshalb wenige Linien, runde Enden und keine Fläche außer den
 * Punkten: was bei 18 px zu fein ist, wird Matsch, und ein matschiges Zeichen ist schlechter
 * als ein Emoji.
 *
 * Dieselben Formen liegen als Bausteine in Figma (`Chardex35 — Zeichen`), damit er dort
 * nachsehen und ändern kann; die WAHRHEIT steht aber hier, denn das hier wird ausgeliefert.
 */
import type { SVGProps } from "react";

export type IconName =
  // Die sieben Reiter des Bogens
  | "stats"
  | "combat"
  | "skills"
  | "spells"
  | "inventory"
  | "feats"
  | "notes"
  // Die Hauptnavigation
  | "characters"
  | "compendium"
  | "dice"
  | "settings"
  // Das ⋯-Blatt
  | "rest"
  | "pause"
  | "campaign"
  | "accent"
  | "draft"
  | "copy"
  | "share"
  // Im Inhalt: Einlesen, Zauberbuch, Aufstieg
  | "import"
  | "spellbook"
  | "levelUp";

/**
 * Die Formen. Jede in einem 24×24-Feld, jede als Striche — `d` für Linien, `dots` für die
 * wenigen Stellen, an denen eine Fläche hilft (Zielmitte, Schieber-Knöpfe).
 */
export const ICON_SHAPES: Record<IconName, { d: string[]; dots?: [number, number, number][] }> = {
  /* Werte — drei Balken, aufsteigend: ein Wertekasten, kein Diagramm-Symbol. */
  stats: { d: ["M6.5 20.5V14", "M12 20.5V8.5", "M17.5 20.5V4.5"] },

  /*
    Kampf — ein Schwert, aufrecht. Zwei gekreuzte Klingen wären bei 18 px ein Knäuel.

    Erste Fassung war EIN Strich mit einem Querbalken darüber — und sah auf dem Blatt
    aus wie ein Kreuz (†), nicht wie eine Waffe. Die Klinge ist deshalb jetzt eine
    UMRISSFORM mit Spitze: bei 14 px laufen ihre zwei Kanten zusammen und werden ein
    breiter Strich, und der breite Strich gegen die dünne Parierstange ist genau der
    Unterschied, den ein Kreuz nicht hat.
  */
  combat: {
    d: ["M12 3l1.7 2.6v7.9h-3.4V5.6z", "M7.6 13.5h8.8", "M12 13.5v4.4", "M10.1 17.9h3.8"],
  },

  /* Fertigkeiten — Ziel: Ring, Ring, Mitte. */
  skills: {
    d: ["M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z", "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"],
    dots: [[12, 12, 1.3]],
  },

  /* Zauber — ein Funke und ein kleiner zweiter. Kein Stern: der gehört den Talenten. */
  spells: {
    d: [
      "M11 3.6l1.5 4.9 4.9 1.5-4.9 1.5L11 16.4 9.5 11.5 4.6 10l4.9-1.5z",
      "M18 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z",
    ],
  },

  /*
    Ausrüstung — Rucksack: runde Schulter, Deckelnaht, Tasche.

    Erste Fassung hatte einen Bügel oben (die Trageschlaufe) — und damit sah sie aus wie
    ein VORHÄNGESCHLOSS. Der Bügel ist weg; was einen Rucksack ausmacht, ist die Naht
    quer unter dem Deckel, und die kann kein Schloss haben.
  */
  inventory: {
    d: [
      "M6.5 11a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v7.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z",
      "M6.5 12.4h11",
      "M9.5 16.4h5",
    ],
  },

  /* Talente — der Stern, und nur hier. */
  feats: {
    d: ["M12 3.6l2.5 5.3 5.8.8-4.2 4 1 5.7-5.1-2.8-5.1 2.8 1-5.7-4.2-4 5.8-.8z"],
  },

  /* Notizen — Blatt mit umgeknickter Ecke und zwei Zeilen. */
  notes: {
    d: ["M6.5 3.5h7.5l4 4v13h-11.5z", "M14 3.5v4h4", "M9.5 12.5h5", "M9.5 16h5"],
  },

  /* Charaktere — der Schild. Er stand schon vorher hier (🛡️), jetzt als Strich. */
  characters: {
    d: ["M12 3.5l7 2.8v5.6c0 4.1-2.8 7.4-7 8.6-4.2-1.2-7-4.5-7-8.6V6.3z"],
  },

  /* Kompendium — aufgeschlagenes Buch, mit Rücken. */
  compendium: {
    d: [
      "M12 6.5c-2-1.6-4.4-2.2-7-2v12.5c2.6-.2 5 .4 7 2 2-1.6 4.4-2.2 7-2V4.5c-2.6-.2-5 .4-7 2z",
      "M12 6.5V19",
    ],
  },

  /* Würfel — ein W20, kein Kubus: das ist der Würfel, um den es in 3.5 geht. */
  dice: {
    d: ["M12 3.2l7.6 4.4v8.8L12 20.8l-7.6-4.4V7.6z", "M12 7.6l4.4 7.6H7.6z"],
  },

  /* Einstellungen — Schieber. Ein Zahnrad hat bei 18 px sechs Zähne aus Matsch. */
  settings: {
    d: ["M4 8.5h8", "M17 8.5h3", "M4 15.5h3", "M12 15.5h8"],
    dots: [
      [14.5, 8.5, 2.1],
      [9.5, 15.5, 2.1],
    ],
  },

  /* Rast — der Mond. Acht Stunden. */
  rest: { d: ["M20 14.6A8.6 8.6 0 0 1 9.4 4 8.6 8.6 0 1 0 20 14.6z"] },

  /* Kurze Pause — die Tasse. Seine Hausregel hat ihr eigenes Zeichen verdient. */
  pause: {
    d: [
      "M4.5 7.5h11.5V13a5 5 0 0 1-5 5H9.5a5 5 0 0 1-5-5z",
      "M16 9h2a2.5 2.5 0 0 1 0 5h-2",
      "M3.5 21h14",
    ],
  },

  /* Kampagne — das Schildchen mit Loch. */
  campaign: {
    d: ["M20.5 12.6l-8 8-9-9V3.5h7.6z"],
    dots: [[8, 8, 1.4]],
  },

  /* Farbthema — der Tropfen. */
  accent: {
    d: ["M12 3.4s6 6.6 6 10.4a6 6 0 0 1-12 0C6 10 12 3.4 12 3.4z"],
    dots: [[10.2, 14.4, 1.4]],
  },

  /* Entwurf — der Kolben: ein Probelauf, nichts Endgültiges. */
  draft: {
    d: ["M9 3.5h6", "M10 3.5v4.8l-4.4 8.8A2 2 0 0 0 7.4 20.5h9.2a2 2 0 0 0 1.8-3.4L14 8.3V3.5", "M7.6 15.5h8.8"],
  },

  /* Kopie — zwei Blätter. */
  copy: {
    d: ["M8.5 8.5h10.5v12H8.5z", "M5 16.5V3.5h10.5"],
  },

  /* Teilen — Pfeil aus dem Kasten heraus. */
  share: {
    d: ["M12 3.5v9", "M8.6 6.9L12 3.5l3.4 3.4", "M5 13v5.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V13"],
  },

  /* Einlesen — derselbe Kasten, der Pfeil hinein. Das Paar ist Absicht: wer „teilen"
     kennt, liest „einlesen" ohne Beschriftung. */
  import: {
    d: ["M12 3.5v10.5", "M8.4 10.6L12 14.2l3.6-3.6", "M5 15v3.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V15"],
  },

  /*
    Zauberbuch — geschlossenes Buch mit Lesebändchen. Bewusst ANDERS als das Kompendium
    (dort aufgeschlagen): das eine ist die Bibliothek, das andere sein eigenes Buch.

    Erste Fassung war ein Rechteck mit einer Rückenwulst und einer Titelzeile — und las
    sich bei 14 px als TÜR. Was ein Buch von einer Tür unterscheidet, ist das Bändchen:
    es hängt oben heraus und hat eine Kerbe. Die Titelzeile ist dafür weg, sie war bei
    14 px sowieso nur ein Strich zu viel.
  */
  spellbook: {
    d: [
      "M7 4.2a1.7 1.7 0 0 1 1.7-1.7h8.3v19H8.7A1.7 1.7 0 0 1 7 19.8z",
      "M11.4 2.5v6.4l1.7-1.3 1.7 1.3V2.5",
    ],
  },

  /* Stufenaufstieg — der Pfeil nach oben. */
  levelUp: {
    d: ["M12 20.5V5.2", "M6.8 10.4L12 5.2l5.2 5.2"],
  },
};

/**
 * Ein Zeichen. `aria-hidden`, weil daneben immer das Wort steht — ein Zeichen, das sich
 * vorlesen lässt, sagt zweimal dasselbe.
 *
 * Die Strichbreite hängt an der Größe: bei 18 px sind 1,6 Einheiten im 24er-Feld richtig,
 * bei 40 px wäre derselbe Strich zu dick. Deshalb `vector-effect: non-scaling-stroke` NICHT
 * — das würde den Strich beim Skalieren einfrieren und große Zeichen dünn wirken lassen.
 */
export function Icon(props: {
  name: IconName;
  /** Kantenlänge in px. Der Reiter benutzt 20, das ⋯-Blatt 22. */
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const shape = ICON_SHAPES[props.name];
  const size = props.size ?? 20;
  const svgProps: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: props.strokeWidth ?? 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    focusable: false,
  };
  return (
    <svg {...svgProps} className={props.className}>
      {shape.d.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {shape.dots?.map(([cx, cy, r], i) => (
        <circle key={`c${i}`} cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
      ))}
    </svg>
  );
}

/**
 * Ein Zeichen VOR einem Wort, in derselben Zeile.
 *
 * `align-[-0.15em]` ist der ganze Grund für diese Hülle: ein `svg` ist standardmäßig
 * `inline` und sitzt mit seiner UNTERKANTE auf der Schriftlinie — bei 16 px schiebt es die
 * Zeile also um ein paar Pixel auseinander und der Text rutscht nach unten. Dieselbe
 * Rechnung wie in `Layout.tsx`, dort stand sie zuerst.
 */
export function IconInline(props: { name: IconName; size?: number; className?: string }) {
  return (
    <span className={`mr-1.5 inline-flex align-[-0.15em] ${props.className ?? ""}`}>
      <Icon name={props.name} size={props.size ?? 16} />
    </span>
  );
}

/** Für den Figma-Abgleich und den Test: alle Namen in einer Liste. */
export const ICON_NAMES = Object.keys(ICON_SHAPES) as IconName[];
