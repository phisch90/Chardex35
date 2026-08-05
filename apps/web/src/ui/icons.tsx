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
  | "levelUp"
  /*
    Die elf KLASSENZEICHEN. Ihre Namen sind genau die Schlüssel der Klassenthemen
    (`ui/classAccents.ts`) — dieselbe Regel wie bei den Reitern: der Schlüssel IST der Name
    des Zeichens, also braucht es keine Zuordnungstabelle, die man vergessen kann.
  */
  | "wild"
  | "verspielt"
  | "fromm"
  | "natur"
  | "stahl"
  | "ruhe"
  | "edel"
  | "faehrte"
  | "schatten"
  | "funke"
  | "zeichen"
  /*
    Die sieben VÖLKER als Kopf. Ihre Namen sind die Kennung aus den Packs in
    Binnenschreibweise (`srd:race:half-orc` → `halfOrc`), siehe `ui/raceIcon.ts` —
    dieselbe Regel wie oben: der Schlüssel IST der Name des Zeichens.
  */
  | "human"
  | "dwarf"
  | "elf"
  | "gnome"
  | "halfElf"
  | "halfOrc"
  | "halfling";

/**
 * Eine Form. Jede in einem 24×24-Feld.
 *
 * Es gibt ZWEI Macharten, und das ist keine Beliebigkeit, sondern seine Entscheidung:
 *
 *  - **Striche** (`d`, dazu `dots` für die wenigen Stellen, an denen eine Fläche hilft):
 *    so sind die 32 Zeichen der Bedienung gezeichnet. Bei 18–20 px ist ein Strich das,
 *    was noch lesbar bleibt.
 *  - **Fläche** (`solid`): EIN Pfad mit `fill-rule="evenodd"`, Details AUSGESTANZT. So
 *    sind die sieben Volk-Köpfe gezeichnet.
 *
 * Warum die Köpfe anders sind: sein Urteil über die Strich-Fassung war dreimal „zu simpel,
 * sehen nicht gut aus" — und er hatte recht. Meine ersten fünf Vorschläge waren alle
 * dieselbe dünne Zeichnung mit Dekoration (Fläche darunter, dicker, Ring drumherum), also
 * dieselbe Art in anderer Dosis. Erst ein Blatt mit drei ARTEN hat es entschieden: gefüllt
 * wie eine Prägung · drei Tonstufen · viele Zierlinien. Seine Wahl war die Prägung, und
 * der Grund war messbar am Blatt: die Kachel zeigt 40 px, und das ist die einzige der
 * drei, die dort nicht zerfällt. Die Tonstufen wurden bei 40 px ein grauer Klumpen, die
 * Zierlinien liefen zusammen.
 *
 * Was die Fläche billig macht: sie braucht keine zweite Farbe und keine Deckkraft. Ein
 * Pfad in `currentColor`, Löcher statt heller Töne — damit dreht der Kopf auf hellem
 * Papier von allein mit, und die Klassenfarbe färbt ihn wie jedes andere Zeichen. Eine
 * Fassung mit Tonstufen hätte je Papier anders gewirkt; genau das hat die Messung an den
 * verbrauchten Zauberpunkten schon einmal gezeigt.
 */
export type IconShape = {
  /** Striche. LEER bei den Zeichen, die als Fläche gezeichnet sind. */
  d: string[];
  dots?: [number, number, number][];
  /** Eine gefüllte Fläche mit ausgestanzten Details. Schließt `d` aus. */
  solid?: string;
};

export const ICON_SHAPES: Record<IconName, IconShape> = {
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

  /* ----------------------------------------------------------------------
     Die elf KLASSENZEICHEN — für das Wasserzeichen am Bogen und für den
     Porträt-Platzhalter auf der Startseite.
     ----------------------------------------------------------------------
     Sein Auftrag: „evtl. ein passendes Symbol welches wie ein Wasserzeichen an
     manchen Stellen vorkommt."

     Gezeichnet für ZWEI Größen: groß als Wasserzeichen (rund 120 px) und klein
     als Platzhalter (30 px). Deshalb dieselbe Sparsamkeit wie bei den Reitern —
     was bei 30 px zu Matsch wird, ist als Wasserzeichen auch nur Dekoration. */

  /*
    Barbar — der SCHÄDEL.

    Fünf Anläufe, und jeder war auf dem Blatt etwas anderes als gemeint:

      1. Stiel mit kleinem Blatt        → eine FAHNE (Mast mit Lappen)
      2. Doppelaxt, kleine Blätter      → eine FLIEGE am Mast
      3. Doppelaxt, große Blätter       → ein AUGE auf einem Stiel (die zwei Linsen
                                          teilen Anfang und Ende und verschmelzen)
      4. Einschneidig, großes Blatt     → wieder eine FAHNE

    Der vierte Versuch hat es erklärt: **ein Stiel mit einer Fläche daran IST eine Fahne**,
    ganz egal, wie das Blatt geschnitten ist. Eine Axt braucht Tiefe und einen Winkel, die
    ein 24er-Strichfeld nicht hergibt.

      5. Zwei Hörner                    → ein SPROSS — und damit auch noch dem Blatt des
                                          Druiden zum Verwechseln ähnlich

    Ein Schädel kann nichts davon sein: die runde Kalotte, zwei Augen und drei Zähne
    lesen bei 30 px genauso wie bei 110. Für „wild" sagt er außerdem mehr als ein
    Werkzeug — die Klasse ist nicht durch ihre Waffe definiert.

    Lehre, und sie hat mich fünf Fassungen gekostet: **wenn drei Anläufe dasselbe
    Missverständnis erzeugen, liegt es am MOTIV und nicht an der Ausführung.** Ein Stiel
    mit einer Fläche daran IST eine Fahne, ganz egal, wie das Blatt geschnitten ist.
  */
  wild: {
    d: [
      "M12 3.2c-4.3 0-7.4 2.9-7.4 7 0 2.5 1.2 4.7 3.1 6v4.4h8.6v-4.4c1.9-1.3 3.1-3.5 3.1-6 0-4.1-3.1-7-7.4-7z",
      "M9.6 16.6v4",
      "M12 16.6v4.6",
      "M14.4 16.6v4",
    ],
    dots: [
      [9.3, 10.2, 1.7],
      [14.7, 10.2, 1.7],
    ],
  },

  /* Barde — die Laute: runder Korpus, langer Hals, zwei Saiten. */
  verspielt: {
    d: [
      "M10.6 13.4a4.1 4.1 0 1 0 5.1 5.1 4.1 4.1 0 0 0-5.1-5.1z",
      "M14.4 13.1L19.6 5",
      "M18.3 3.6l2.3 2.3",
      "M12.4 15.4l3.4 3.4",
    ],
  },

  /* Kleriker — die Sonne: Scheibe und Strahlen. Ein heiliges Zeichen, kein Kreuz. */
  fromm: {
    d: [
      "M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8z",
      "M12 2.4v2.6",
      "M12 19v2.6",
      "M2.4 12h2.6",
      "M19 12h2.6",
      "M5.2 5.2l1.9 1.9",
      "M16.9 16.9l1.9 1.9",
      "M18.8 5.2l-1.9 1.9",
      "M7.1 16.9l-1.9 1.9",
    ],
  },

  /*
    Druide — das Blatt: Umriss, Mittelrippe, vier Adern.

    Erste Fassung war eine schmale Sichel mit einer Rippe darin — und las sich als FEDER,
    nicht als Blatt. Was ein Blatt ausmacht, sind die ADERN, die von der Rippe abgehen;
    eine Feder hat sie nicht.
  */
  natur: {
    d: [
      "M12 3.4c3.8 3.2 5.7 6.3 5.7 9.1 0 3.4-2.4 6.3-5.7 8.5-3.3-2.2-5.7-5.1-5.7-8.5 0-2.8 1.9-5.9 5.7-9.1z",
      "M12 7.2v12.6",
      "M12 11.6l3.4-2.7",
      "M12 11.6L8.6 8.9",
      "M12 15.8l3-2.5",
      "M12 15.8l-3-2.5",
    ],
  },

  /* Kämpfer — der Schild mit Querband. Gerade Linien, nichts Verspieltes. */
  stahl: {
    d: [
      "M12 2.8l8 3.2v6.4c0 4.7-3.2 8.4-8 9.8-4.8-1.4-8-5.1-8-9.8V6z",
      "M4.4 11.4h15.2",
    ],
  },

  /* Mönch — die Lotusblüte: drei Blätter, ruhig und offen. */
  ruhe: {
    d: [
      "M12 4.2c2 2.4 3 4.8 3 7.2s-1 4.8-3 7.2c-2-2.4-3-4.8-3-7.2s1-4.8 3-7.2z",
      "M9.6 9.4C7 9.4 5 10.6 3.6 13c1.4 2.4 3.6 3.9 6.6 4.4",
      "M14.4 9.4c2.6 0 4.6 1.2 6 3.6-1.4 2.4-3.6 3.9-6.6 4.4",
      "M4 20.2h16",
    ],
  },

  /* Paladin — der Schild mit heraldischem Kreuz. Das Edelste der elf. */
  edel: {
    d: [
      "M12 2.8l8 3.2v6.4c0 4.7-3.2 8.4-8 9.8-4.8-1.4-8-5.1-8-9.8V6z",
      "M12 7v10",
      "M7.6 11h8.8",
    ],
  },

  /* Waldläufer — Bogen und Pfeil. Die Fährte, nicht der Kampf. */
  faehrte: {
    d: [
      "M6.6 3.4c5.6 1.6 9.6 5.6 11.2 11.2",
      "M6.6 3.4C4.8 9.6 8.2 15.8 14.4 17.6",
      "M4 20l14.6-14.6",
      "M14.6 5.4h4v4",
    ],
  },

  /*
    Schurke — die Maske: ein Band über den Augen, unten in zwei Spitzen auslaufend.

    Erste Fassung hatte einen Stiel unter der Maske und enge Augen — das las sich als
    Käfergesicht. Der Stiel ist weg, die Augen stehen weiter, und die Unterkante läuft
    in der Mitte zusammen: so sitzt sie auf einem Gesicht.
  */
  schatten: {
    d: [
      "M3.4 8.8c2.7-1.3 5.6-2 8.6-2s5.9.7 8.6 2v2.4c0 3.1-2.5 5.6-5.6 5.6-1.4 0-2.4-.7-3-1.9-.6 1.2-1.6 1.9-3 1.9-3.1 0-5.6-2.5-5.6-5.6z",
    ],
    dots: [
      [7.6, 11, 1.5],
      [16.4, 11, 1.5],
    ],
  },

  /* Hexenmeister — die Flamme. Angeboren, nicht gelernt. */
  funke: {
    d: [
      "M12 2.4c4.4 4.2 6.6 7.7 6.6 10.6a6.6 6.6 0 0 1-13.2 0c0-2.9 2.2-6.4 6.6-10.6z",
      "M12 11.4c1.8 1.9 2.7 3.4 2.7 4.6a2.7 2.7 0 0 1-5.4 0c0-1.2.9-2.7 2.7-4.6z",
    ],
  },

  /* Magier — der Spitzhut. Man erkennt ihn sofort, und das ist bei einem
     Wasserzeichen die ganze Aufgabe. */
  zeichen: {
    d: [
      "M12 2.6l4.6 12.2h-9.2z",
      "M4 16.2c2.4-1 5-1.4 8-1.4s5.6.4 8 1.4l-1.2 3.6c-2.2-.8-4.5-1.2-6.8-1.2s-4.6.4-6.8 1.2z",
      "M9.4 9.6h5.2",
    ],
  },

  /* ----------------------------------------------------------------------
     Die sieben VÖLKER — je ein KOPF, für die Kacheln der Volkauswahl.
     ----------------------------------------------------------------------
     Sein Auftrag: „die Volkauswahl als Kacheln mit jeweils einem Piktogramm des
     Kopfes (wie bei BG3) der jeweiligen Rasse."

     Unterschieden wird im UMRISS, nicht im Detail — bei 40 px (der Kachelgröße) liest
     man die Silhouette und nicht die Frisur. Die Reihe ist deshalb eine Reihe von
     UMRISSEN: schlicht (Mensch) · kurze Spitzohren (Halb-Elf) · lange Spitzohren (Elf) ·
     breiter Bart (Zwerg) · große Rundohren (Gnom) · Locken oben (Halbling) · schwerer
     Kiefer mit Hauern (Halb-Ork).

     Vier Anläufe, und jeder Fehlschlag war dieselbe Sorte Missverständnis — eine FLÄCHE
     an der falschen Stelle wird etwas anderes:

       Mensch   1. Haaransatz bis an den Umriss        → BADEKAPPE
       Elf      1. Ohren bis x=2,6 und so dick wie der Kopf → FLÜGEL
       Zwerg    1. ein durchgehender Umriss             → AFFENGESICHT (kein Bart zu sehen)
                2. Schnurrbart als ∩-Bogen             → trauriger MUND
                3. Nase plus Schnurrbart               → SCHNAUZE
       Gnom     1. spitzes V unter dem Kinn            → MÖHRE
                2. breiter Kinnbart                    → offener MUND
                3. große Nase                          → SCHLÜSSELLOCH, mit den Ohren ein AFFE
                4. Zipfelmütze                         → HELM
       Halb-Ork 1. Mundlinie plus zwei Hauer           → EIMER im Mund
                2. gebogene Hauer außen an den Wangen  → WANGENFALTEN
                3. Braue über die ganze Breite         → MÜTZENSCHIRM

     Daraus die zwei Regeln, die am Ende alle sieben gerettet haben: **in der Mitte des
     Gesichts steht nichts** (dort entsteht sofort eine Schnauze), und **was Haar sein
     soll, darf den Umriss nicht berühren** (sonst ist es eine Kappe). Der Gnom hat
     deshalb nur Ohren, der Zwerg nur Bart und Schnurrbart, und der Halb-Ork zwei kurze
     Brauenstriche statt einer Linie.

     Gegengeprüft gegen die zwei Klassenzeichen, die selbst Gesichter sind: der
     Barbaren-Schädel (`wild`) und die Schurkenmaske (`schatten`) — sie stehen im
     Assistenten einen Schritt weiter und dürfen sich nicht verwechseln lassen.
     Gefunden hat das alles ein Blatt mit allen sieben in 30/40/56/110 px, kein Test. */

  /*
    Gezeichnet als FLÄCHE mit ausgestanzten Details (siehe `IconShape`): ein Pfad je Kopf,
    `fill-rule="evenodd"`. Was innen liegt, wird zum Loch — Augen, Haaransatz,
    Schnurrbart, Braue, Hauer. Was außen anliegt, ist wieder Fläche: die Ohren.

    Die Augen sitzen bei allen sieben an derselben Stelle und in derselben Größe. Das ist
    Absicht: unterschieden wird im UMRISS, nicht im Gesicht — sonst sieht jeder Kopf nach
    einer anderen Hand aus.
  */

  /* Mensch — schlichte Fläche, der Haaransatz nur als schmale Kerbe. Der Nullpunkt der
     Reihe: wer keine Ohren, keinen Bart und keine Locken hat, ist ein Mensch. */
  human: {
    d: [],
    solid:
      "M12 2.3c-3.4 0-5.8 2.5-5.8 6 0 4.3 2.6 7.9 5.8 7.9s5.8-3.6 5.8-7.9c0-3.5-2.4-6-5.8-6z" +
      "M8 6.7c.9-1.5 2.3-2.3 4-2.3s3.1.8 4 2.3c-1.2-.7-2.5-1.1-4-1.1s-2.8.4-4 1.1z" +
      "M9.9 8.55a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1z" +
      "M14.1 8.55a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1z",
  },

  /* Zwerg — Schädeldecke und Bart sind EINE Fläche mit einem Einzug an den Schläfen; der
     Schnurrbart ist ausgestanzt und trennt Gesicht von Bart. In der Strich-Fassung hat
     genau diese Trennung fünf Anläufe gebraucht: ohne sie war es ein Affengesicht. */
  dwarf: {
    d: [],
    solid:
      "M12 2.2c-3.6 0-6.2 2.5-6.2 6.1 0 1.1.2 2.1.6 3-1.1.5-1.7 1.5-1.7 3 0 4.3 3.4 7.9 7.3 7.9s7.3-3.6 7.3-7.9c0-1.5-.6-2.5-1.7-3 .4-.9.6-1.9.6-3 0-3.6-2.6-6.1-6.2-6.1z" +
      "M12 12.2c-1.5 1-3.1 1.6-4.9 1.9 1.3 1.2 3 1.9 4.9 1.9s3.6-.7 4.9-1.9c-1.8-.3-3.4-.9-4.9-1.9z" +
      "M9.9 7.8a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" +
      "M14.1 7.8a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
  },

  /* Elf — schmaler Kopf, die langen Ohren sind Fläche und liegen außen an. Als Strich
     waren sie bei dieser Länge Flügel; als Fläche mit Spitze sind sie Ohren. */
  elf: {
    d: [],
    solid:
      "M12 2.5c-3 0-5.2 2.4-5.2 5.9 0 4.3 2.3 7.9 5.2 7.9s5.2-3.6 5.2-7.9c0-3.5-2.2-5.9-5.2-5.9z" +
      "M7.1 11.2L3 4.3l4.3 3.7z" +
      "M16.9 11.2l4.1-6.9-4.3 3.7z" +
      "M8 6.9c1-1.7 2.4-2.6 4-2.6s3 .9 4 2.6c-1.2-.9-2.5-1.3-4-1.3s-2.8.4-4 1.3z" +
      "M10 8.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" +
      "M14 8.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
  },

  /* Gnom — kleiner Kopf, große Ohren. Als Scheiben lasen sie sich auf dem Blatt als
     KOPFHÖRER; jetzt sind sie oben spitz und nach außen geneigt, also Ohren. */
  gnome: {
    d: [],
    solid:
      "M12 4c-2.9 0-5 2.3-5 5.6 0 4 2.2 7.2 5 7.2s5-3.2 5-7.2c0-3.3-2.1-5.6-5-5.6z" +
      "M7.2 8.5C5 7.4 3.1 8.3 2.8 10.2c-.3 1.9 1.1 3.4 3.5 3.7-.5-1.9-.5-3.7.9-5.4z" +
      "M16.8 8.5c2.2-1.1 4.1-.2 4.4 1.7.3 1.9-1.1 3.4-3.5 3.7.5-1.9.5-3.7-.9-5.4z" +
      "M9.9 9.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" +
      "M14.1 9.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
  },

  /* Halb-Elf — der Kopf des Menschen, die Ohren halb so lang wie beim Elfen, das Haar
     seitlich gestrichen. Zwei Unterschiede, weil einer zu wenig ist: er muss sich vom
     Elfen UND vom Menschen unterscheiden. */
  halfElf: {
    d: [],
    solid:
      "M12 2.3c-3.4 0-5.8 2.5-5.8 6 0 4.3 2.6 7.9 5.8 7.9s5.8-3.6 5.8-7.9c0-3.5-2.4-6-5.8-6z" +
      "M6.9 11L4.2 7.1l2.7 1.5z" +
      "M17.1 11l2.7-3.9-2.7 1.5z" +
      "M7.6 7.6C8.8 4.9 13 4.2 16 6.5c-1.4-.5-2.9-.6-4.4-.2-1.5.3-2.8 1-3.9 1.9z" +
      "M9.9 8.55a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1z" +
      "M14.1 8.55a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1z",
  },

  /* Halb-Ork — der breiteste Kopf, schwerer Kiefer. Braue und Hauer sind ausgestanzt:
     zwei kurze Schrägen über den Augen (eine durchgehende Linie war ein Mützenschirm)
     und zwei Dreiecke am Kiefer (mit einer Mundlinie dazwischen war es ein Eimer). */
  halfOrc: {
    d: [],
    solid:
      "M12 2.4c-3.7 0-6.3 2.4-6.3 6 0 2.8.7 4.9 1.9 6.4 1.2 1.4 2.7 2.2 4.4 2.2s3.2-.8 4.4-2.2c1.2-1.5 1.9-3.6 1.9-6.4 0-3.6-2.6-6-6.3-6z" +
      "M7.4 7.2l3.1 1.2-.5 1.3-3.1-1.2z" +
      "M16.6 7.2l-3.1 1.2.5 1.3 3.1-1.2z" +
      "M9.4 15.2l1-3.4 1 3.4z" +
      "M13.6 15.2l1-3.4 1 3.4z" +
      "M9.9 9.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" +
      "M14.1 9.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
  },

  /* Halbling — die Locken sind Teil der Fläche und müssen DEUTLICH sein: als flache
     Wellen las sich der Kopf auf dem Blatt als Helm. Drei Bögen, dazu die Ohren. */
  halfling: {
    d: [],
    solid:
      "M12 2.4c-1.7 0-3 1.1-3.3 2.6-.4-.2-.8-.3-1.2-.3-1.6 0-2.9 1.3-2.9 2.9 0 1 .5 1.9 1.3 2.4-.1.7-.2 1.4-.2 2.1 0 4.2 2.4 7.6 5.3 7.6s5.3-3.4 5.3-7.6c0-.7-.1-1.4-.2-2.1.8-.5 1.3-1.4 1.3-2.4 0-1.6-1.3-2.9-2.9-2.9-.4 0-.8.1-1.2.3C15 3.5 13.7 2.4 12 2.4z" +
      "M6.8 10.4c-1.6-.3-2.7.6-2.7 1.9s1.1 2.2 2.7 1.9c-.4-1.3-.4-2.5 0-3.8z" +
      "M17.2 10.4c1.6-.3 2.7.6 2.7 1.9s-1.1 2.2-2.7 1.9c.4-1.3.4-2.5 0-3.8z" +
      "M9.9 10.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" +
      "M14.1 10.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
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
      {/*
        Die FLÄCHE zuerst, und mit `stroke="none"`: sie trägt ihre Form selbst. Ein Strich
        darum herum würde die ausgestanzten Details wieder zulaufen lassen — bei 40 px sind
        die Augenlöcher 1,7 px groß, ein Strich von 1,6 schließt sie zu.

        `fillRule="evenodd"` ist der ganze Trick: was innen liegt, wird zum Loch. Ohne diese
        Regel (Standard ist `nonzero`) hinge es an der DREHRICHTUNG der Teilpfade, ob ein
        Auge ein Loch wird — und die sieht man beim Zeichnen nicht.
      */}
      {shape.solid !== undefined && (
        <path d={shape.solid} fill="currentColor" fillRule="evenodd" stroke="none" />
      )}
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
