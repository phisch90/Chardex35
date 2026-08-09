/**
 * Alle deutschen UI-Strings zentral — der Tisch-Jargon (deutsche Labels,
 * englische Regelbegriffe wie in der Gruppen-Excel) ist hier einstellbar.
 */
export const S = {
  appName: "Chardex35",

  nav: {
    characters: "Charaktere",
    compendium: "Kompendium",
    dice: "Würfel",
    settings: "Einstellungen",
  },

  /*
    Englische Regelkürzel, keine deutschen. „GE-Modifikator" war eine
    Eigenerfindung, die man erst übersetzen muss; DEX steht so in den Büchern, in
    der Gruppen-Excel und in Fight Club. Seine Entscheidung.
  */
  abilities: {
    str: "STR",
    dex: "DEX",
    con: "CON",
    int: "INT",
    wis: "WIS",
    cha: "CHA",
  } as Record<string, string>,
  abilityNames: {
    str: "Stärke",
    dex: "Geschicklichkeit",
    con: "Konstitution",
    int: "Intelligenz",
    wis: "Weisheit",
    cha: "Charisma",
  } as Record<string, string>,

  saves: { fort: "Fortitude", ref: "Reflex", will: "Will" } as Record<string, string>,

  sheet: {
    tabs: {
      stats: "Werte",
      combat: "Kampf",
      skills: "Fertigkeiten",
      spells: "Zauber",
      inventory: "Ausrüstung",
      feats: "Talente",
      notes: "Notizen",
    },
    /** Kurzformen für die mobile Reiter-Leiste (sieben Reiter nebeneinander). */
    tabsShort: {
      stats: "Werte",
      combat: "Kampf",
      skills: "Fert.",
      spells: "Zauber",
      inventory: "Ausr.",
      feats: "Talente",
      notes: "Notiz",
    },
    hp: "HP",
    hpMax: "max.",
    damage: "Schaden",
    nonlethal: "Nichttödlich",
    temp: "Temp. HP",
    ac: "RK",
    touch: "Touch",
    flatFooted: "Flat-Footed",
    touchHint: "Gegen Berührungsangriffe: Rüstung, Schild und natürliche Rüstung zählen nicht.",
    flatFootedHint: "Überrascht, vor der ersten Aktion: kein DEX-Bonus, kein Ausweichen.",
    init: "Initiative",
    speed: "Bewegung",
    /*
      Die Überschrift der Übersicht ganz oben im Werte-Reiter. Sein Auftrag: „Dass man
      einfach auf einen Blick hat, wenn der DM fragt, wie hoch der Rüstungswert ist,
      dass man das sofort sehen kann."
    */
    glance: "Auf einen Blick",
    /*
      Die vier Gruppen der Übersicht. Sein Einwand nach der ersten Fassung: „die Kacheln
      aber bitte noch etwas klarer differenzieren, zum Beispiel die zusammen und nicht
      alles mehr oder weniger durcheinander."
    */
    glanceGroups: {
      defense: "Verteidigung",
      saves: "Rettungswürfe",
      attack: "Angriff",
      /*
        „Bewegung & Grapple" und nicht „Bewegung & Ringen": seit der Wert unten Grapple
        heißt, stünde über ihm sonst das deutsche Wort für dieselbe Sache — ein Wert mit
        zwei Namen, genau wie damals GAB gegen BAB. Dass die Überschrift dabei halb
        deutsch bleibt, ist kein Bruch, sondern die Regel dieser App: deutsche
        Oberfläche, englische Regelbegriffe mittendrin („Volle Attacke aus BAB +6").
      */
      moves: "Bewegung & Grapple",
    },
    /**
     * BAB und nicht GAB. Sein Wort: „Wir spielen bei 6bab mit zwei Angriffen. Bitte auch
     * immer bab nennen." Damit ist die Abkürzung entschieden — und sie war ohnehin die
     * einzige richtige: Regelkürzel bleiben englisch (DEX statt GE), und die Engine nennt
     * den Wert längst „BAB" (`derive.ts`, die Aufschlüsselung des Angriffs). Am Bogen
     * stand trotzdem „GAB", in den Einstellungen „Fraktionale BAB/Saves" — ein Wert mit
     * zwei Namen, und keiner der beiden war überall.
     */
    bab: "BAB",
    /*
      Grapple und nicht Ringkampf — sein Wort: „Ringkampf in EN lassen." Dieselbe
      Entscheidung wie GAB → BAB und TP → HP, und aus demselben Grund: Regelbegriffe
      bleiben englisch, weil sie so in seinen Büchern, in der Gruppen-Excel und in Fight
      Club stehen. Die Schranke dazu steht in `strings.test.ts`.
    */
    grapple: "Grapple",
    /*
      Was ein Tipp auf die Marke verdraengt hat — angesagt, nie still.

      Sein Auftrag war der eine Griff („dass ich nicht erst etwas ablegen muss"), und
      genau deshalb muss die Folge dastehen: ein Tipp auf den Zweihaender legt Waffe UND
      Schild ab, und ein stilles Schild weniger kostet RK. Die Ruecknahme steht daneben.
    */
    equipDisplaced: (namen: string[]) =>
      namen.length === 1
        ? `${namen[0]} ins Gepäck gelegt`
        : `${namen.join(" und ")} ins Gepäck gelegt`,
    /** Der lange Druck auf die Marke: die Plätze einzeln. */
    equipMenuTitle: "Wohin?",
    level: "Stufe",
    xp: "EP",
    nextLevel: "nächste Stufe",
    attacks: "Angriffe",
    /*
      „+8 / +3" sagt niemandem etwas, der es nicht schon weiß. Auf dem Handy
      steht der kurze Hinweis, auf breiten Schirmen (iPad) gleich der ganze Satz
      — sein Wunsch: „kann in der iPad-Version gerne schon danebenstehen".

      Und der BAB steht dazu, in BEIDEN Fassungen. Sein Auftrag: „Bitte auch immer bab
      nennen." Er hat auch den besseren Grund dafür: die Reihe „+9/+4" kommt aus dem BAB
      und nicht aus der Zahl, die daneben steht — wer wissen will, WARUM es zwei Angriffe
      sind, muss den BAB sehen. Bei +9 aus BAB 6 ist das der Unterschied zwischen einem
      Angriff und zwei.
    */
    /*
      Der BAB kommt als fertige Zeichenkette und nicht als Zahl: `fmtMod` steht in
      `ui/bits.tsx` bei den Bauteilen, und diese Datei soll keine React-Datei importieren.
      Die Boni daneben (`mods`) werden aus demselben Grund vom Aufrufer formatiert.
    */
    /**
     * Die Zeile ÜBER der Angriffsliste, sichtbar ohne Tap.
     *
     * Sein Auftrag: „Außer dem sollen wir das mit dem zweifachen Angriff deutlicher
     * aufnehmen sobald der Char einen BAB 6 erreicht." Klein an jeder Waffe stand es
     * schon; einmal deutlich stand es nirgends — und wer ab Stufe 6 einen Angriff pro
     * Runde zu wenig macht, verliert die Hälfte seines Schadens.
     */
    fullAttack: (n: number, bab: string, mods: string[]) =>
      `Volle Attacke: ${n} Angriffe pro Runde aus BAB ${bab} — ${mods.join(" / ")}. Ein einzelner Angriff nutzt ${mods[0]}.`,
    iterativeShort: (n: number, bab: string) =>
      `${n} Angriffe pro Runde (BAB ${bab}) — antippen erklärt es`,
    /*
     * Hier stand am Ende noch „Euer Tisch spielt die Reihe ab BAB +6." — sein Wort dazu:
     * „Das „euer Tisch…" kann raus." Er hat recht, und der Grund ist mehr als Kürze: der
     * Satz erzählte ihm eine Regel, die er selbst gesetzt hat, an einer Stelle, an der er
     * eine ZAHL sucht. Am Tisch liest man diese Zeile mitten im Kampf.
     */
    iterativeHint: (mods: string[], bab: string) =>
      `Volle Attacke aus BAB ${bab}: ${mods.length} Angriffe hintereinander mit ${mods.join(" und ")} — jeder weitere liegt 5 niedriger. Ein einzelner Angriff (Standard-Aktion) nutzt immer ${mods[0]}.`,
    damage2: "Schaden",
    critical: "Krit.",
    ranks: "Ränge",
    maxRanks: "max.",
    classSkill: "Klassenfertigkeit",
    melee: "Nahkampf",
    ranged: "Fernkampf",
    equipped: "Angelegt",
    /*
      Hieß „Rucksack", und das ging nicht mehr: seit eine Zeile wirklich ein
      Rucksack sein kann, stünde die Überschrift „Rucksack" über einem Abschnitt,
      in dem ein Rucksack liegt. Ein Wort für zwei Sachen ist genau der Fehler, den
      „Zauberplätze" gegen „Fertigkeitsränge" schon einmal vermieden hat.
    */
    stowed: "Im Gepäck",
    /*
      Der Knopf, hinter dem der Blätterer steckt — und er sagt WAS er hinzufügt.
      Vorher stand dort das allgemeine „Hinzufügen" aus `actions`: in einer Reihe
      von Karten, die alle nur ihre Überschrift tragen, ist ein Knopf ohne Gegenstand
      eine Frage. Sein Wort: „Mach daraus bitte Ausrüstung hinzufügen."
      Eigene Zeichenkette und nicht `actions.add` umbenannt — das steht an sieben
      weiteren Stellen (Talent, Zauber, Domäne, Teilgebiet, Modifikator), und dort
      wäre „Ausrüstung" schlicht falsch.
    */
    addGear: "Ausrüstung hinzufügen",
    /** Behälter im Gepäck: Rucksack, Gürteltasche, Sack der Bewahrung. */
    container: {
      /** Die Marke am Kopf einer Behälterzeile. */
      mark: "Behälter",
      /** Knopf im Bearbeiten-Modus: aus einer Zeile einen Behälter machen. */
      make: "Als Behälter",
      makeHint: "Andere Zeilen können darin liegen.",
      /** Und zurück — der Inhalt bleibt, er liegt danach am Körper. */
      unmake: "Kein Behälter",
      unmakeHint: "Der Inhalt bleibt und liegt danach am Körper.",
      /** Wohin eine Zeile gehört. „Am Körper" ist der Zustand ohne Behälter. */
      onBody: "Am Körper",
      putInto: "Einpacken:",
      /** Was darin liegt — Menge und Gewicht. */
      contents: (rows: number, lb: number) =>
        `${rows} ${rows === 1 ? "Sache" : "Sachen"} · ${lb} lb Inhalt`,
      empty: "leer",
      /** Der Sack der Bewahrung: der Inhalt zählt nicht in die Traglast. */
      weightless: "Inhalt wiegt nichts",
      weightlessHint:
        "Für den Sack der Bewahrung und den Praktischen Umhängebeutel: der Inhalt zählt nicht in die Traglast, der Beutel selbst schon.",
      weightlessMark: "Inhalt zählt nicht",
      /** Bewegen im Bearbeiten-Modus. */
      drag: "Ziehen zum Umsortieren",
      up: "Nach oben",
      down: "Nach unten",
    },
    /** Gruppen in der Ausrüstung — nach Körperstelle, nicht alles in einem Topf. */
    slots2: {
      armor: "Rüstung",
      shield: "Schild",
      weapon: "Waffen",
      other: "Sonstiges",
    } as Record<string, string>,
    /**
     * Die Marken in der Ausrüstungsliste — kurz, weil sie in einen Kreis passen
     * müssen. Bewusst dieselben Kürzel wie in Fight Club: A, 1H, OH. Wer von dort
     * kommt, muss nichts neu lernen, und die Regelkürzel bleiben englisch (wie bei
     * DEX statt GE).
     */
    equipMark: {
      none: "—",
      armor: "A",
      mainHand: "1H",
      offHand: "OH",
      bothHands: "2H",
      worn: "E",
    } as Record<string, string>,
    /** Langform für die Erklärzeile und den Vorlese-Text. */
    equipSlot: {
      none: "nicht angelegt",
      armor: "als Rüstung getragen",
      mainHand: "in der Haupthand",
      offHand: "in der Schildhand",
      bothHands: "in beiden Händen",
      worn: "getragen",
    } as Record<string, string>,
    equipLegend: "A Rüstung · 1H Haupthand · OH Schildhand · 2H beidhändig · E getragen",
    money: "Geld",
    /** Wenn ein RK-Ausgleich aus dem Import da ist, aber keine Rüstung angelegt. */
    noArmorHint:
      `Keine Rüstung angelegt. Der Fight-Club-Export enthält keine Ausrüstung — deine Rüstung und dein Schild sind deshalb nie mitgekommen. Trag sie unten unter „Hinzufügen“ ein; danach rechnet die App die RK selbst und der Ausgleichs-Modifikator kann weg.`,
    /*
      Der Fall, den Philipp mit einem Bildschirmfoto gemeldet hat: RK 19 statt 16,
      weil er Schild und Leder nachgetragen hatte und der Import-Ausgleich weiter
      mitzählte. Der Text nennt die Zahlen und sagt, was verschwindet — eine
      Warnung ohne Zahlen wäre hier wertlos.
    */
    acDoubleTitle: "Deine RK zählt gerade doppelt",
    acDoubleHint: (suppressed: string[], total: number) =>
      suppressed.length > 0
        ? `Die App hat beim Import nicht gewusst, was du trägst, und die RK mit diesen Zeilen auf den Wert aus Fight Club gehoben. Jetzt ist die echte Ausrüstung eingetragen — und der Ausgleich ist als Rüstungsbonus so hoch, dass er ${suppressed.join(" und ")} verdrängt (darum steht das durchgestrichen). Deine RK steht auf ${total}. Nimm den Ausgleich weg, dann rechnet die App nur noch mit dem, was du wirklich trägst.`
        : `Die App hat beim Import nicht gewusst, was du trägst, und die RK mit diesen Zeilen auf den Wert aus Fight Club gehoben. Jetzt ist die echte Ausrüstung eingetragen und beides zählt zusammen — deine RK steht auf ${total}. Nimm den Ausgleich weg, dann rechnet die App nur noch mit dem, was du wirklich trägst.`,
    acDoubleRemove: "Ausgleich entfernen",
    acDoubleUndo: "RK-Ausgleich",
    equipHint: "Auf die Marke tippen wechselt den Platz.",
    /*
      „Was deine Rüstung kostet" — die Kehrseite des RK-Bonus.

      Die Karte stand seit der Ausrüstungs-Runde als offener Punkt da. Der Grund,
      warum sie eine eigene Karte ist und nicht eine Zeile: die Rüstung kostet an
      VIER Stellen, und alle vier standen bisher woanders — die DEX-Grenze klein im
      Namen einer RK-Zeile, der Malus in fünfzehn Fertigkeitszeilen, die Bremse in
      der Bewegung, und die arkane Störung nirgends.

      Die Zahlen selbst kommen aus `sheet.armorCost` und werden hier nicht gerechnet.
    */
    armorCost: {
      title: "Was deine Rüstung kostet",
      /** Steht statt der Karte, solange nichts angelegt ist. */
      nothing: "Nichts angelegt — deine Rüstung kostet dich gerade nichts.",
      /** Sie ist da und kostet trotzdem nichts (leichte Rüstung, hohe STR). */
      free: "Kostet dich nichts: die Grenzen greifen bei deinen Werten nicht.",
      maxDex: "Höchster DEX-Bonus",
      /**
       * Was die Grenze WIRKLICH kostet. 0 heißt: sie steht da und greift nicht.
       *
       * Das Vorzeichen kommt FERTIG herein (`fmtMod`) und wird hier nicht gesetzt.
       * Zuerst stand hier ein typografisches Minus, weil die Erklärtexte der App
       * eines benutzen — direkt unter der Zahl `-8` aus `fmtMod` standen damit zwei
       * verschiedene Minuszeichen auf EINER Karte. Gefunden hat das der Lauf im
       * gebauten Bogen, und die Antwort ist die übliche: eine Stelle entscheidet.
       */
      dexLost: (lost: string) => `${lost} auf die RK, weil dein DEX-Bonus abgeschnitten wird`,
      dexFine: "greift bei deinem DEX nicht",
      acp: "Rüstungsmalus",
      /** Die betroffenen Fertigkeiten, das Teuerste zuerst. */
      acpSkills: "Trifft",
      acpDoubleHint: "Swim zählt ihn doppelt (SRD).",
      speed: "Bewegung",
      speedLine: (from: number, to: number) => `${from} ft → ${to} ft`,
      /*
        „gehen schief" gehört in die BESCHRIFTUNG und nicht in den Wert: gilt die
        Zahl an diesem Bogen nicht, wird sie durchgestrichen — und ein
        durchgestrichener Satz ist kaum zu lesen, eine durchgestrichene Zahl sofort.
      */
      asf: "Arkane Zauber gehen schief",
      asfLine: (pct: number) => `${pct} %`,
      /** Sie steht in der Rüstung und betrifft diesen Bogen nicht. */
      asfNotHere: "betrifft diesen Bogen nicht — nur Barde, Hexenmeister und Magier zahlen sie",
      /** Woher die Grenze kommt: die Rüstung, die Last, oder beide gleich scharf. */
      from: { armor: "aus der Rüstung", load: "aus der Last", both: "aus Rüstung und Last" } as Record<
        string,
        string
      >,
      /** Ein Stück mit seinen eigenen Zahlen, für die Zeile darunter. */
      piece: (name: string, acBonus: number) => `${name} (+${acBonus} RK)`,
    },
    hands: "Rüstung und Hände",
    /** Die drei Plätze, um die man sich im Kampf kümmert — als Frage, nicht als Zustand. */
    handsRows: { armor: "Rüstung", mainHand: "Haupthand", offHand: "Schildhand" } as Record<
      string,
      string
    >,
    handsFree: "— frei —",
    handsTwoHanded: (name: string) => `${name} (beidhändig)`,
    handsHint:
      "Eine beidhändig geführte Waffe belegt beide Hände. Am Gegenstand selbst wechselt ein Tap auf die Marke den Platz.",
    /** Für die Nur-Lesen-Ansicht: dieselben Kürzel wie an den Gegenständen. */
    slotMark: {
      none: "—",
      armor: "A",
      mainHand: "1H",
      offHand: "OH",
      bothHands: "2H",
      worn: "E",
    } as Record<string, string>,
    skillFilter: { all: "Alle", trained: "Trainiert", class: "Klasse" } as Record<string, string>,
    subtype: "Teilgebiet",
    addSubtype: "Teilgebiet anlegen",
    /**
     * Der Auswähler statt des alten `prompt()`. Sein Urteil dazu: „Find ich ja irgendwie
     * sehr unprofessionell, dass man da dann das Ganze abtippen soll, was man auswählt."
     */
    subtypeFor: (skill: string) => `${skill} — Teilgebiet wählen`,
    subtypeOwn: "oder ein eigenes",
    subtypeTaken: "hast du schon",
    conditions: "Zustände",
    features: "Klassenfähigkeiten",
    miscMods: "Sonstige Modifikatoren",
    encumbrance: { light: "Leichte Last", medium: "Mittlere Last", heavy: "Schwere Last", overloaded: "Überladen!" } as Record<string, string>,
    /*
      Woraus die Last besteht. Vorher stand dort eine Zahl und sonst nichts — und
      sobald die Münzen mitzählen oder ein Sack der Bewahrung etwas herausnimmt, ist
      eine nackte Summe die Sorte Auskunft, die man nicht nachrechnen kann. Genau
      dieselbe Frage wie bei der Rüstungskarte: nicht die Zahl, sondern ihr Preis.
    */
    loadParts: (itemsLb: number, coinLb: number) =>
      coinLb > 0 ? `davon ${itemsLb} lb Gepäck und ${coinLb} lb Münzen` : "",
    loadWeightless: (lb: number) => `${lb} lb liegen gewichtslos im Behälter`,
    slots: "Slots",
    dcBase: "SG-Basis",
    casterLevel: "Zauberstufe",
    breakdownSuppressed: "wirkt nicht",
    portrait: "Porträt",
    /** Der Punkt an einer Attributs-Kachel und was er bedeutet. */
    abilityDotHint: "• = da kommt etwas dazu (Volk, Talent, Gegenstand) — antippen zeigt, was.",
    abilityHasBonus: "Grundwert plus alles, was darauf wirkt.",
    editModeOn: "Bearbeiten: Name, Ränge, Talente, Ausrüstung, Zähler",
    /* Die zwei Zeilen im ⋯-Blatt — dort wird ein- UND ausgeschaltet. */
    editHint: "Name, Ränge, Talente, Ausrüstung und Zähler ändern.",
    editStop: "Bearbeiten beenden",
    /* Kurzform für die rote Leiste unten — dort ist die Zelle so schmal wie ein Reiter. */
    editStopShort: "Fertig",
    editStopHint: "Zurück zum Lesen — am Tisch ändert dann kein Fehlgriff etwas.",
    identity: "Name und Spieler:in",
    characterName: "Name des Charakters",
    playerPlaceholder: "wer spielt ihn?",
    nameEmptyHint: "Ohne Namen geht es nicht — beim Verlassen kommt der alte zurück.",
  },

  actions: {
    create: "Anlegen",
    save: "Speichern",
    cancel: "Abbrechen",
    send: "Abschicken",
    delete: "Löschen",
    edit: "Bearbeiten",
    add: "Hinzufügen",
    remove: "Entfernen",
    back: "Zurück",
    next: "Weiter",
    done: "Fertig",
    roll: "Würfeln",
    export: "Exportieren",
    import: "Importieren",
    search: "Suchen…",
    equip: "Anlegen",
    unequip: "Ablegen",
    levelUp: "Stufenaufstieg",
  },

  wizard: {
    title: "Neuer Charakter",
    /*
      Klasse VOR den Attributen — seine Entscheidung, wörtlich: „Vielleicht hätte ich
      auch gerne zuerst Klasse, also Volk, Klasse und dann die Attribute, weil dann
      kann man ein bisschen schauen, wenn man würfelt, dass man die Attribute der
      Rasse und Klasse anpasst."

      Die Reihenfolge hier ist die Wahrheit: `STEP` in `CharacterWizard.tsx` benennt
      dieselben Positionen, damit im Code keine nackten Zahlen stehen.
    */
    /**
     * Nach SCHLÜSSEL, nicht als Liste: der Zauberschritt gibt es nur für Klassen, die
     * sich festlegen müssen, und dann darf eine Namensliste nicht nach Stelle passen
     * müssen. Die Nummer davor rechnet die Oberfläche aus den sichtbaren Schritten.
     */
    stepName: {
      race: "Volk",
      klass: "Klasse",
      abilities: "Attribute",
      skills: "Fertigkeiten",
      feats: "Talente",
      domains: "Domänen",
      spells: "Zauber",
      gear: "Ausrüstung",
      trackers: "Zähler",
      done: "Fertig",
    } as Record<string, string>,
    name: "Name",
    playerName: "Spieler:in",
    hpRoll: "HP-Wurf",
    pointsLeft: "Punkte übrig",
    slotsLeft: "Slots übrig",
    /** Steht in der haftenden Leiste, wenn kein Talent-Slot mehr frei ist. */
    noSlotsLeft: "Keine Talent-Slots mehr frei",
    /** Zu viel gewählt — der DM hat Recht, aber es soll dastehen. */
    tooMany: (over: number) => `${over} zu viel gewählt`,
    /** Warum ein Reiter noch nicht angetippt werden kann. */
    needRaceAndClass: "Erst Volk und Klasse wählen",
    summary: "Der Bogen, wie er wird",
    /** Zauberschritt — nur für Klassen, die sich festlegen müssen. */
    spellsFor: (klass: string) => `Zauber für deinen ${klass}`,
    knownHint: "wähle, was du kennst",
    spellbookHint: "dein Zauberbuch",
    /** Zählerschritt. */
    trackersTitle: "Zähler für den Tisch",
    trackersHint:
      "Angehakt kommt mit. Die Obergrenze rechnet die App weiter mit — steigst du auf oder nimmst ein passendes Talent, wächst sie von allein.",
    trackersNone: "Aus dieser Klasse kennt die App keinen Zähler.",
    trackersOwn: "Eigener Zähler",
    trackersOwnName: "Wofür?",
    trackersOwnMax: "Obergrenze (0 = offen)",
    trackersAdd: "Zähler anlegen",
    /**
     * Unter dem Eingabefeld eines Attributs. Hieß „final" — englisch in einer deutschen
     * Oberfläche, und seine Frage dazu war berechtigt.
     */
    abilityResult: (total: number, mod: string) => `ergibt ${total} (${mod})`,
    standardArray: "Standardreihe (15/14/13/12/10/8)",
    /*
      Ohne Würfel-Emoji: das Zeichen steht als gezeichneter W20 daneben (`ui/icons.tsx`).
      Ein Zeichen gehört in die Ansicht und nicht in den Text — sonst kann es seine Farbe
      nicht vom Knopf nehmen, und in einer Meldung oder einem Export steht plötzlich ein
      Bildchen mitten im Satz.
    */
    rollAll: "Alle würfeln (4W6, niedrigster fällt)",
    /*
      Punktekauf im Attributs-Schritt — nur sichtbar, wenn in den Einstellungen ein
      Budget steht. Ohne Budget steht hier gar nichts, das ist seine Entscheidung.

      Drei Sätze für drei Zustände, und dass es DREI sind, ist der Kern: „passt" ist
      genauso eine Auskunft wie „zu viel" und „übrig". Wer nur überzogen meldet,
      lässt liegengebliebene Punkte unbemerkt — dieselbe Falle wie einst bei den
      Fertigkeitspunkten und den Talent-Slots.
    */
    /*
      ACHTUNG, zwei Sorten Punkte in einem Assistenten: `pointsLeft` weiter oben sind die
      FERTIGKEITSpunkte, diese hier sind die ATTRIBUTSpunkte. Deshalb tragen sie den
      Bereich im Namen — der erste Anlauf hieß auch `pointsLeft` und kollidierte still
      im Objekt, weil ein Literal mit zwei gleichen Schlüsseln der spätere gewinnt.
      Gefunden hat das `tsc`, nicht der Test.
    */
    abilityPointsUsed: (spent: number, budget: number) => `Punkte: ${spent} von ${budget}`,
    abilityPointsFits: "passt genau",
    abilityPointsLeft: (left: number) =>
      left === 1 ? "1 Punkt übrig" : `${left} Punkte übrig`,
    abilityPointsOver: (over: number) =>
      over === 1 ? "1 Punkt zu viel" : `${over} Punkte zu viel`,
    /** Der Preis am einzelnen Feld — damit man sieht, was der nächste Punkt kostet. */
    abilityPointsCost: (cost: number) => (cost === 1 ? "1 Punkt" : `${cost} Punkte`),
    abilityPointsSpread: "Auf Budget verteilen",
    /** Was der Knopf tut — und was er NICHT tut. */
    abilityPointsSpreadHint:
      "Verteilt das Budget nach der Empfehlung für deine Klasse. Er kauft nur, was den Modifikator wirklich verbessert; ein Restpunkt bleibt deshalb manchmal stehen.",
    /** NPC-Klassen sind kein Spielerfutter — aber erreichbar, für Gefolge und NSCs. */
    showNpcClasses: "auch NPC-Klassen",
  },

  /**
   * Klassenmerkmale im Assistenten. Der englische Name steht vorn (seine Entscheidung —
   * so heißt es in seinen Büchern und in Fight Club), der deutsche daneben.
   */
  classFeatures: {
    /** Merkmale, die die Klassenbeschreibung ausführt, die Stufentabelle aber nicht kennt. */
    always: "Gilt immer",
    byLevel: "Auf welcher Stufe",
    level: (level: number) => `Stufe ${level}`,
    showText: "englischen Regeltext zeigen",
    hideText: "Regeltext ausblenden",
    noGerman: "nur englisch — deutsche Erklärung fehlt noch",
  },

  /**
   * Empfehlungen im Assistenten und beim Stufenaufstieg. Sie EMPFEHLEN — der Satz
   * `disclaimer` steht mit Absicht dabei: an seinem Tisch entscheidet der DM, nicht die App.
   */
  advice: {
    abilityTitle: (who: string) => `Für ${who} zählt`,
    fromValue: (min: number) => `ab ${min}`,
    /** Marke am Eingabefeld eines wichtigen Attributs. */
    matters: "wichtig",
    /** Am Feld, wenn der ENDWERT unter dem empfohlenen Mindestwert liegt. */
    below: (min: number) => `unter ${min}`,
    disclaimer: "Nur ein Vorschlag — spielbar ist jede Verteilung.",
    skillTitle: (klass: string) => `Empfohlen für ${klass}`,
    /** Marke an einer empfohlenen Fertigkeitszeile. */
    suggested: "empfohlen",
    subtypeHint: (subtype: string) => `am besten ${subtype}`,
  },

  settings: {
    tagline: "D&D 3.5 mit Homebrew — alles auf deinem Gerät",
    features: "Funktionen",
    diceEnabled: "Würfeln in der App",
    diceEnabledHint: "Aus: keine Würfel-Knöpfe am Bogen und kein Würfel-Reiter.",
    encumbrance: "Gewicht & Traglast",
    encumbranceHint: "Aus: keine Gewichtsangaben, und die Last bremst weder Bewegung noch Geschicklichkeit.",
    coinWeight: "Münzen wiegen etwas",
    coinWeightHint:
      "Regel des Buches: 50 Münzen sind ein Pfund, egal welche Sorte. Aus, bis du es einschaltest — an ist es sofort auf jedem Bogen zu sehen (500 gp sind 10 lb, und das kann eine leichte Last zur mittleren machen).",
    houseRules: "Hausregeln",
    fractional: "Fraktionale BAB/Saves (Unearthed Arcana)",
    maxHpL1: "Volle HP auf Stufe 1",
    deathAtNegCon: "Tod erst beim negativen CON-Wert",
    deathAtNegConHint:
      "Eure Hausregel: bei CON 14 ist die Figur erst bei −14 HP tot. Zwischen 0 und dem negativen CON-Modifikator stabilisiert eine Fortitude-Probe gegen SG 10.",
    deathAtMinus10Hint: "Regel des Buches: tot bei −10 HP, egal wie zäh die Figur ist.",
    /*
      Punktekauf für die Attribute. Der Text sagt bewusst, WO gezählt wird — im
      Assistenten und nicht am Bogen: eure bestehenden Bögen sind gewürfelt, und eine
      Warnung dort wäre eine Meldung für eine Regel, unter der sie nie entstanden sind.
    */
    pointBuy: "Punktekauf für die Attribute",
    pointBuyHint:
      "Statt zu würfeln bekommt jeder dasselbe Budget und kauft seine Grundwerte: 8 ist gratis, 14 kostet 6, 18 kostet 16 Punkte.",
    pointBuyOff: "Aus",
    pointBuyOwn: "eigenes",
    pointBuyOffHint:
      "Es wird gewürfelt — die App zählt keine Punkte und sagt dazu nichts. Bestehende Bögen bleiben unangetastet.",
    pointBuyOnHint: (budget: number) =>
      `Der Assistent zählt beim Attributs-Schritt mit und meldet beide Richtungen: zu viel ausgegeben und noch übrig. Gewarnt, nicht gesperrt — ${budget} Punkte sind eure Vorgabe, nicht die des Programms. Fertige Bögen fasst das nicht an.`,
    /*
      „Leichte Waffe" ist absichtlich im Namen: der Schalter ist sonst nicht auffindbar,
      wenn man ihn braucht — und man braucht ihn genau dann, wenn man mit Kurzschwert oder
      Dolch kämpft und sich über den fehlenden Schaden wundert.
    */
    powerAttackLight: "Power Attack zählt auch mit leichter Waffe",
    powerAttackLightOnHint:
      "Eure Hausregel: der Schadensbonus gilt auf jede Nahkampfwaffe — mit Kurzschwert und Power Attack 4 sind das +4 Schaden. Der Angriffsmalus ist derselbe.",
    powerAttackLightOffHint:
      "Regel des Buches: mit einer leichten Waffe (Kurzschwert, Dolch) gibt Power Attack keinen Schaden — der Angriffsmalus gilt trotzdem. Unbewaffnet und natürliche Waffen sind davon ausgenommen.",
    /** Martins Hausregel: Zaubern über eine Spellcraft-Probe statt eines Platzes. */
    spellcraftCasting: "Zaubern per Spellcraft-Probe",
    spellcraftCastingOnHint:
      "Eure Hausregel: statt eines Zauberplatzes geht eine Spellcraft-Probe gegen DC 12 + Grad. Jede Probe erhöht den DC um den Grad (Ermüdung); die Rast (8 Stunden) setzt auf 12 zurück. Der Knopf dafür steht im Zauber-Reiter am Grad.",
    spellcraftCastingOffHint:
      "Aus: im Zauber-Reiter steht kein Probe-Knopf, gewirkt wird nur über Plätze. Eine schon angesammelte Ermüdung bleibt gespeichert und verschwindet mit der nächsten Rast.",
    exportTitle: "Export / Import",
    exportAll: "Alles exportieren (JSON)",
    importFile: "JSON importieren",
    storage: "Speicher",
    persisted: "Speicher ist persistent",
    notPersisted: "Speicher NICHT garantiert persistent — Export als Backup empfohlen!",
    license: "Lizenz (OGL)",
    dataPrivacy:
      "Alle Daten liegen nur lokal auf diesem Gerät (IndexedDB). Teilen per Export/Import.",
    /*
      Die Falle, in die ich ihn geschickt habe: auf iOS hat die
      Startbildschirm-App einen eigenen Speicher, und das Löschen des Symbols
      nimmt ihn mit. Das gehört sichtbar in die App, nicht in eine Chat-Nachricht.
    */
    iosWarning:
      "iPhone/iPad: Safari und die Startbildschirm-App haben GETRENNTE Speicher — was du in einem anlegst, fehlt im anderen. Und löschst du das Symbol vom Startbildschirm, nimmt iOS die dortigen Daten mit. Vorher exportieren oder den Geräte-Abgleich einrichten, der beide Seiten zusammenhält.",
  },

  /*
    Versionsanzeige. Auf dem iPhone ist einer Startbildschirm-App nicht
    anzusehen, welchen Stand sie geladen hat — und der Service Worker meldet ein
    Update verzögert und auf iOS unzuverlässig. Deshalb fragt die App selbst nach
    und sagt es hier.
  */
  version: {
    outdated: "⟳ neuere Version verfügbar — tippen zum Neuladen",
    /** Kurzform für die enge Kopfzeile. */
    outdatedShort: "⟳ Update",
    currentHint: "Das ist der veröffentlichte Stand.",
    unknownHint: "Nicht geprüft (offline?) — das ist der geladene Stand.",
    title: "Version",
  },

  /*
    Kampfoptionen: Rundenweise Entscheidungen. Angeboten wird nur, was der
    Charakter laut Talenten darf — ein Schalter für etwas Unerlaubtes ist keine
    Hilfe, sondern eine Falle.
  */
  /**
   * Die Gruppe. Wortwahl bewusst ohne Fachjargon: „Regal" statt Gist, „Kennwort"
   * statt Passphrase, „Auftrag" statt Patch. Philipp ist kein Programmierer, und
   * seine Mitspieler noch weniger.
   */
  group: {
    title: "Gruppe",
    hint: "Jeder Bogen liegt bei dem, der ihn spielt. Ihr sieht euch gegenseitig, aber niemand kann einen fremden Bogen ändern.",

    // Eigenes Regal
    mine: "Mein Regal",
    myName: "Mein Name in der Gruppe",
    myNamePlaceholder: "z.B. Philipp",
    iAmGamemaster: "Ich leite die Gruppe",
    iAmGamemasterHint:
      "Nur als Spielleiter kannst du fremde Bögen bearbeiten. Die anderen müssen das in ihrer App zusätzlich erlauben.",
    passphrase: "Kennwort für mein Regal",
    passphraseHint:
      "Gib es zusammen mit dem Link weiter — beides zusammen sind die Zugangsdaten. Ohne Kennwort könnte jeder mit dem Link mitlesen, auch dein eigenes Regelwerk.",
    passphraseMissing: "Ohne Kennwort ist dein Regal für jeden lesbar, der den Link hat.",
    share: "Freigeben",
    shared: (count: number) => `${count} ${count === 1 ? "Bogen" : "Bögen"} freigegeben`,
    publish: "Regal aktualisieren",
    publishing: "wird geschrieben …",
    publishedAt: (when: string) => `zuletzt geschrieben ${when}`,
    copyInvite: "Einladung kopieren",
    inviteCopied: "Einladung kopiert — jetzt einfügen und abschicken.",
    inviteText: (name: string, link: string, passphrase: string) =>
      `${name} lädt dich in Chardex35 ein.\n\nLink: ${link}\nKennwort: ${passphrase}\n\nIn der App unter Einstellungen → Gruppe → „Regal abonnieren" eintragen.`,
    noneShared: "Noch nichts freigegeben. Wähle unten aus, welche Bögen die Gruppe sehen darf.",

    // Abos
    subscriptions: "Regale der anderen",
    add: "Regal abonnieren",
    addLink: "Link oder Kennung",
    addLinkPlaceholder: "https://gist.github.com/… oder die Kennung",
    addPassphrase: "Kennwort",
    addLabel: "Name (freiwillig)",
    acceptOrders: "Darf meine Bögen bearbeiten",
    acceptOrdersHint:
      "Nur für den Spielleiter. Dann kommen seine Änderungen an deinen Charakteren bei dir an — Trefferpunkte, verbrauchte Zauber und Notizen bleiben aber deine.",
    badLink: "Darin steckt keine Kennung. Kopiere den ganzen Link.",
    duplicate: "Dieses Regal ist schon abonniert.",
    refresh: "Abholen",
    refreshing: "wird abgeholt …",
    remove: "Abo entfernen",
    lastRead: (when: string) => `abgeholt ${when}`,
    neverRead: "noch nicht abgeholt",
    empty: "Noch keine Regale abonniert. Lass dir von den anderen Link und Kennwort schicken.",
    readReport: (chars: number, orders: number) =>
      orders === 0
        ? `${chars} ${chars === 1 ? "Bogen" : "Bögen"} abgeholt.`
        : `${chars} ${chars === 1 ? "Bogen" : "Bögen"} abgeholt, ${orders} ${orders === 1 ? "Änderung" : "Änderungen"} vom Spielleiter übernommen.`,
    rescuedHint: (names: string[]) =>
      `Du hattest an ${names.length === 1 ? "einem Bogen" : `${names.length} Bögen`} selbst gebaut. Der Spielleiter gewinnt, dein Stand liegt als Kopie daneben: ${names.join(", ")}`,

    // Fremde Bögen
    otherSheets: "In der Gruppe",
    readOnlyHint: (owner: string) => `Bogen von ${owner} — nur lesen. Änderungen macht nur ${owner} selbst.`,
    unknownOwner: "einem Mitspieler",
    sheetGone: "Dieser Bogen ist nicht mehr im Regal. Hol die Regale neu ab.",
    prepared: "vorbereitet",
    noRanks: "Keine Fertigkeitsränge eingetragen.",
    openSheet: "Bogen ansehen",

    // Spielleiter
    editForeign: "Für den Spieler bearbeiten",
    orderNote: "Ein Satz dazu (freiwillig)",
    orderNotePlaceholder: "z.B. Stufe 8 und der Ring aus der Gruft",
    orderQueued: (name: string) =>
      `Änderung für ${name} vorgemerkt. Sie geht mit dem nächsten „Regal aktualisieren" raus und kommt bei ihm an, sobald seine App abholt.`,
    pendingOrders: (count: number) =>
      `${count} ${count === 1 ? "Änderung" : "Änderungen"} wartet auf das nächste Aktualisieren.`,
    needToken:
      "Zum Freigeben brauchst du einen eigenen GitHub-Zugang — denselben wie beim Geräte-Abgleich. Mitlesen geht ohne.",
  },

  /**
   * Die Kampagne. Eigener Abschnitt, weil sie an vier Stellen auftaucht
   * (Startseite, Bogen, ⋯-Menü, Assistent) — dasselbe Muster wie `group`.
   *
   * „Kampagne" und nicht „Gruppe": Gruppe ist in dieser App schon vergeben (die
   * Regale der Mitspieler). Zwei Wörter für zwei Dinge, die sich überschneiden, aber
   * nicht dasselbe sind — dieselben Leute können zwei Kampagnen spielen.
   */
  /**
   * Die Talentwahl.
   *
   * Sein Auftrag, wörtlich: „Es muss klar sein, welche Vorraussetzungen die Talente
   * haben. Dann sollte es auch verhindert werden, dass ich ein Talent wählen kann für
   * das ich die Mindestanforderungen nicht erfülle. Grundsätzlich sollte einfach bei
   * der Wahl der Talente klar sein was der Effekt und Bonus sind."
   */
  feats: {
    eligible: "Kannst du nehmen",
    blocked: "Noch nicht erfüllt",
    /** Steht an einem Talent, das er schon hat. */
    already: "schon gewählt",
    /** Mehrfach wählbare Talente (Toughness) dürfen wieder vorkommen. */
    againOk: "mehrfach möglich",
    requires: "Braucht",
    /*
      Voraussetzung, die die App nicht prüfen kann.

      Vorher stand an der Zeile nur „? kann ich nicht prüfen", und er hat zu Recht
      gefragt: „Dann versteh ich noch nicht ganz, was Du mit Fragezeichen kann ich
      nicht prüfen als Tag meinst." Das Fragezeichen ohne Bezug sagt nichts — jetzt
      steht die Voraussetzung SELBST in der Marke, mit dem Grund davor.
    */
    unverifiable: "ungeprüft",
    /** Die Marke an der Zeile: der Voraussetzungstext, als ungeprüft gekennzeichnet. */
    unverifiableMark: (text: string) => `ungeprüft: ${text}`,
    unverifiableHint:
      "Diese Voraussetzung steht im Regelwerk als Satz und nicht als Zahl — ich kann sie nicht nachrechnen und sperre deshalb nicht. Du weißt, ob sie passt.",
    /** Nur zeigen, was gewählt werden kann — sein Wunsch beim Blättern. */
    onlyEligible: "nur wählbare",
    noSheetYet: "Voraussetzungen kann ich erst prüfen, wenn Volk und Klasse stehen.",
    /** Die Rückfrage beim Notausgang. */
    overrideAsk: (missing: string[]) =>
      `Es fehlt: ${missing.join(", ")}. Trotzdem nehmen?`,
    overrideYes: "Ja, mein DM erlaubt es",
    overrideNo: "Nein",
    /** Der Hinweis, dass die Warnung am Bogen bleibt. */
    overrideNote: "Der Bogen weist danach weiter darauf hin — gewollt.",
    showEpic: "Epische zeigen",
    epicHint: "Epische Talente gibt es ab Stufe 21.",
    /*
      Dass ein Tap den Text aufklappt, wusste bisher nur die App. Der Knopf umfasst die
      ganze Zeile („das Ziel ist groß, weil am Tisch mit dem Daumen getippt wird"), aber
      ohne ein Zeichen daran sieht eine Zeile aus wie Text und nicht wie ein Knopf —
      Philipps Wort dazu: es „sollte klar sein, dass beim Tippen auf ein Talent die
      Textbeschreibung ausgeklappt wird". Der Satz steht deshalb über der Liste UND jede
      Zeile trägt das ▸, das sich beim Aufklappen dreht.
    */
    tapHint: "Tippe auf ein Talent — darunter steht, was es tut.",
    allTypes: "Alle",
    noMatches: "Kein Talent passt dazu.",
    /** Talentarten — englisch aus den Daten, deutsch beschriftet. */
    types: {
      General: "Allgemein",
      Metamagic: "Metamagie",
      "Item Creation": "Gegenstände",
      Divine: "Göttlich",
      Wild: "Wildform",
      Special: "Besonders",
      Epic: "Episch",
    } as Record<string, string>,
    onlyEnglish: "nur englisch",
    more: "mehr zeigen",
    less: "weniger zeigen",
    /*
      Der Filter nach WIRKUNG — sein Wunsch war „nach Bonus filtern". Die Kategorien
      sind die Werte, die am Bogen stehen; die Zuordnung ist Handarbeit, weil nur 27
      der 327 Talente einen eingetragenen Effekt tragen.

      Die Reihe steht eingeklappt, weil vierzehn Marken auf dem Handy drei Zeilen
      füllen. Ist ein Filter aktiv, steht er AM Knopf — ein Filter, den man nicht
      sieht, ist der Grund, warum eine Liste unerklärlich leer aussieht.
    */
    bonusFilter: "Wirkung",
    bonusActive: (label: string) => `Wirkung: ${label}`,
    bonusHint:
      "Wonach das Talent den Bogen verbessert. Handverlesen für alle 175 Talente bis Stufe 20; epische erben ihr Vorbild.",
    bonusNone: "keine",
    bonusEmpty: "Dazu passt hier kein Talent — Art oder Suche ändern.",
    /*
      Beim Aufklappen steht dabei, unter welchen Filtern das Talent auftaucht. Die
      Zuordnung ist Handarbeit, also muss sie nachprüfbar sein — sonst filtert die
      App nach einer Meinung, die niemand ansehen kann.
    */
    bonusAffects: "Wirkt auf",
    bonusKinds: {
      attack: "Angriff",
      damage: "Schaden",
      ac: "RK",
      save: "Rettung",
      skill: "Fertigkeiten",
      spell: "Zauber",
      hp: "HP",
      initiative: "Initiative",
      speed: "Bewegung",
      action: "Handlungen",
      proficiency: "Übung",
      craft: "Herstellen",
      special: "Besonderes",
    } as Record<string, string>,

    /*
      Die Waffenwahl am Talent — sein Auftrag: „bei den Weapon Fokus sollte man nicht
      einfach im Bogen die Waffe ändern können, sondern das muss man einmal machen,
      wenn man das Talent auswählt."
    */
    chooseWeaponFor: (feat: string) => (feat === "" ? "Für welche Waffe?" : `${feat}: für welche Waffe?`),
    chooseWeaponHint:
      "Gewählt wird die Waffenart, nicht das einzelne Stück — du darfst sie also auch nehmen, bevor du sie besitzt. Später ändern geht nur im Bearbeiten-Modus.",
    weaponsCarried: "Im Gepäck",
    weaponsAll: "Alle Waffen",
    weaponPick: "Wählen",
    /** Steht an einer Waffe, die auch oben im Gepäck-Abschnitt steht. */
    weaponPickCarried: "Wählen (im Gepäck)",
    weaponPicked: "✓ gewählt",
    noWeaponMatches: "Keine Waffe passt dazu.",
    /** Der Knopf an einem Talent, dem die Waffe fehlt oder das sie wechseln soll. */
    changeWeapon: "Waffe ändern",
    /*
      Die Liste zum Hinzufügen — sein Auftrag: „Erst mal nur die Talente anzeigen, die
      man auch hat. Die Liste von weiteren Talenten sollte unten dann aufklappbar sein
      und nicht direkt drunter angeflanscht."
    */
    addOpen: "Talent hinzufügen",
    slotsFree: (n: number) => `${n} ${n === 1 ? "Talent" : "Talente"} frei`,
    /*
      Kein Platz mehr — und die App sagt WARUM, statt den Abschnitt stumm verschwinden
      zu lassen. Ein Abschnitt, der ohne Wort weg ist, sieht wie ein Fehler aus; das ist
      die Familie „etwas weiß es, und etwas anderes kann es nicht" in ihrer leisen Form.
    */
    noSlots: (used: number, available: number) =>
      `Kein Talent frei — ${used} von ${available} gewählt. Tauschen geht im Bearbeiten-Modus.`,
    /** Im Bearbeiten-Modus darf man auch ohne freien Platz etwas dazunehmen. */
    editUnlocked: "Bearbeiten-Modus: du kannst tauschen.",
    /** Der freie Text an einem Talent ohne Waffenbezug (Skill Focus, eigene Talente). */
    choiceLabel: "Auswahl",
    choicePlaceholder: "z.B. Spot",
    /*
      Die HERKUNFT eines Talents — sein Auftrag: „die Talente [sollen] die Info zeigen
      woher sie kommen. Also ob die als Bonus fest gewählt wurden oder in welchem Level
      ich sie dazu genommen hab." Neue Wahlen tragen die Stufe von allein; bestehende
      Bögen tragen nichts (Fehlerfamilie 1) und werden im Bearbeiten-Modus nachgetragen.
    */
    originLevel: (n: number) => `Stufe ${n}`,
    originTitle: "Herkunft",
    originLevelLabel: "Stufe",
    originSourceLabel: "oder Quelle",
    originSourcePlaceholder: "z.B. Bonus (Mensch)",
    originHint:
      "In welcher Stufe das Talent gewählt wurde — oder seine feste Quelle (Bonus-Talent von Volk, Klasse, Domäne). Steht eine Quelle da, zeigt der Bogen sie.",
  },

  campaign: {
    label: "Kampagne",
    placeholder: "z.B. Die Zinnen von Karrath",
    hint: "Sortiert die Startseite und färbt die Karten. Leer lassen ist in Ordnung.",
    color: "Farbe dieser Kampagne",
    none: "Ohne Kampagne",
    existing: "Schon vorhanden",
    /** Steht unter der Farbreihe, sobald der Wechsel mehr als diesen einen Bogen trifft. */
    alsoAffects: (names: string[]) =>
      `Gilt auch für ${names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} und ${names[names.length - 1]}`} — die Farbe gehört der Kampagne, nicht dem einzelnen Bogen.`,
    /**
     * Zwei Geräte haben verschiedene Farben geschrieben. Das ist der Preis dafür,
     * dass die Farbe am Bogen hängt und mitreist — es soll dastehen, nicht
     * verschwiegen werden.
     */
    mixed: "Auf diesem Gerät stehen zwei Farben für diese Kampagne. Wähle eine, dann gilt sie für alle.",
    sheets: (count: number) => `${count} ${count === 1 ? "Bogen" : "Bögen"}`,
  },

  combat: {
    title: "Kampfoptionen",
    hint: "Gilt für diese Runde. Die Werte oben ändern sich mit.",
    reset: "alles zurück",
    powerAttack: "Power Attack",
    /*
      Der letzte Halbsatz hängt an der HAUSREGEL, und das ist keine Kosmetik: er stand hier
      als „mit leichter Waffe gar nicht", während die Rechnung seit seiner Entscheidung das
      Gegenteil tut. Ein Erklärtext, der der Rechnung widerspricht, ist schlimmer als
      keiner — man sucht dann den Fehler in der Zahl. Gefunden hat das ein BLICK auf das
      Bild, kein Test.
    */
    powerAttackHint: (bab: number, lightCounts: boolean) =>
      `Vom Angriff auf den Schaden, höchstens ${bab} (dein BAB). Zweihändig zählt der Schaden doppelt, ${
        lightCounts
          ? "mit leichter Waffe einfach (eure Hausregel)."
          : "mit leichter Waffe gar nicht."
      }`,
    combatExpertise: "Kampfgeschick",
    combatExpertiseHint: (max: number) => `Vom Angriff auf die RK, höchstens ${max}.`,
    fightingDefensively: "Defensiv kämpfen (−4 / +2 RK)",
    totalDefense: "Totale Verteidigung (+4 RK, kein Angriff)",
    /** Der Schalter selbst — kurz, weil er neben den anderen Optionen steht. */
    dodge: "Dodge (+1 RK gegen einen Gegner)",
    dodgeTarget: "gegen wen? (freiwillig)",
    dodgePlaceholder: "z.B. Ogerhäuptling",
    twoWeapon: "Mit beiden Waffen angreifen",
    twoWeaponHint:
      "Malus auf beide Hände — wie hoch, hängt daran, ob die Waffe in der zweiten Hand leicht ist und ob du das Talent hast. Steht an den Waffenzeilen.",
    /*
      Was Power Attack mit der WIRKLICH geführten Waffe tut — sein Auftrag: „dennoch würde
      ich gerne bei powerattack eine Anzeige haben, ob es mit der geführten waffe anwendbar
      ist."

      Das ist ein ZUSTAND und keine Erklärung: er sagt nicht, wie die Regel funktioniert,
      sondern was an DIESEM Bogen gerade gilt. Deshalb läuft er NICHT durch `RuleHint` und
      verschwindet auch nicht, wenn er die Kurzbeschreibungen abschaltet. Genau diese
      Auskunft hat ihm einmal gefehlt und wie ein Rechenfehler ausgesehen.

      Die Zahlen kommen fertig aus der Engine (`sheet.powerAttackWeapons`); hier steht nur
      die Formulierung. Eine Regel in einem deutschen Satz wäre eine zweite Wahrheit.
    */
    powerAttackWeapon: (name: string, factor: 0 | 1 | 2, byHouseRule: boolean) =>
      factor === 0
        ? `${name}: bringt keinen Schaden — leichte Waffe. Der Angriffsmalus gilt trotzdem.`
        : factor === 2
          ? `${name}: zählt doppelt (zweihändig geführt).`
          : byHouseRule
            ? `${name}: zählt einfach — leichte Waffe, erlaubt durch eure Hausregel.`
            : `${name}: zählt einfach.`,
    /** Steht davor, damit die Zeile ohne Vorwissen lesbar ist. */
    powerAttackWeaponsTitle: "Mit dem, was du führst:",
    /** Nichts in der Hand — dann ist die Frage nicht zu beantworten, und das sagt sie. */
    powerAttackNoWeapon: "Nichts in der Hand — leg eine Waffe an, dann steht hier, was sie bekommt.",
  },

  /*
    Ausrüstung: die Wege zu den Gegenständen, auf Deutsch — die NAMEN bleiben
    englisch (SRD, so steht es in seinen Büchern und in Fight Club).

    Der Anlass ist sein Satz: „wenn ich den englischen Begriff nicht genau kenne
    finde ich nichts." Übersetzt wird deshalb genau das, wonach man SUCHT
    (Gruppen, Arten, Synonyme), nicht das, was gefunden wird.
  */
  items: {
    groups: {
      weapon: "Waffen",
      armor: "Rüstung & Schilde",
      gear: "Ausrüstung & Werkzeug",
      potion: "Tränke",
      scroll: "Schriftrollen",
      wands: "Zauberstäbe, Zepter & Stäbe",
      ring: "Ringe",
      wondrous: "Wundersame Gegenstände",
      magicGear: "Magische Ausrüstung",
      specialAbility: "Waffen- und Rüstungseigenschaften",
      cursed: "Verfluchtes",
      artifact: "Artefakte",
      other: "Sonstiges",
    } as Record<string, string>,
    subgroups: {
      light: "Leichte Rüstung",
      medium: "Mittlere Rüstung",
      heavy: "Schwere Rüstung",
      shield: "Schilde",
      simple: "Einfache Waffen",
      martial: "Kriegswaffen",
      exotic: "Exotische Waffen",
      wand: "Zauberstäbe",
      rod: "Zepter",
      staff: "Stäbe",
    } as Record<string, string>,
    /** Deutsche Suchwörter → Gruppe. Damit findet „rüstung" die 18 Rüstungen. */
    synonyms: {
      rüstung: "armor",
      ruestung: "armor",
      armor: "armor",
      panzer: "armor",
      schild: "armor",
      shield: "armor",
      waffe: "weapon",
      waffen: "weapon",
      weapon: "weapon",
      schwert: "weapon",
      sword: "weapon",
      bogen: "weapon",
      axt: "weapon",
      trank: "potion",
      tränke: "potion",
      traenke: "potion",
      potion: "potion",
      rolle: "scroll",
      schriftrolle: "scroll",
      scroll: "scroll",
      stab: "wands",
      zauberstab: "wands",
      wand: "wands",
      zepter: "wands",
      rod: "wands",
      ring: "ring",
      ringe: "ring",
      werkzeug: "gear",
      ausrüstung: "gear",
      ausruestung: "gear",
      gear: "gear",
      wundersam: "wondrous",
      verflucht: "cursed",
      artefakt: "artifact",
    } as Record<string, string>,
    epicToggle: (n: number) => `Epische Gegenstände zeigen (${n})`,
    allGroups: "Alle Gruppen",
    groupHit: (label: string, n: number) => `${label} — ${n} Einträge zum Blättern`,
    moreInGroup: (n: number) => `… ${n} weitere in dieser Gruppe zeigen`,
    scrollGrade: (grade: number, tradition: string) => `Grad ${grade}, ${tradition}`,
    arcane: "arkan",
    divine: "göttlich",
    /** Die sechs Sammelrollen, die keinem einzelnen Zauber zuzuordnen sind. */
    scrollUnmapped: "Rollen, deren Zauber ich nicht zuordnen kann",
    scrollMine: "Was ich wirken kann",
    /*
      Deutsche Namen und Erklärungen: sein Wort war „Bitte alle
      Ausrüstungsgegenstände immer auf deutsch im Namen und Erklärung. Englischen
      og namen klein daneben." Die drei Zeilen hier sind der Rest, der nicht am
      Gegenstand selbst steht.
    */
    onlyEnglish: "nur englisch — deutsche Erklärung fehlt noch",
    showOriginal: "englischen Regeltext zeigen",
    hideOriginal: "Regeltext ausblenden",
    /** Der Knopf, der die Erklärung an einer Gepäckzeile auf- und zuklappt. */
    explain: "Was ist das?",
    /*
      Übung und Aufbau-Vorschlag — die zwei Marken in der Auswahl.

      Aus seiner Sprachnachricht: die Liste zeigt 78 Waffen und sagt nicht, ob sein
      Kleriker damit umgehen kann. WARNEN STATT SPERREN: wählbar bleibt alles, die
      Marke sagt nur, was es kostet.
    */
    untrained: {
      weapon: "ohne Übung: −4 Angriff",
      armor: "ohne Übung: Rüstungsmalus auch auf Angriff",
      shield: "ohne Übung: Schildmalus auch auf Angriff",
      material: "erlaubt deine Klasse nicht",
    } as Record<string, string>,
    fits: (why: string) => `passt: ${why}`,
    /** Die Startausrüstung im Assistenten. */
    kitTitle: (className: string) => `Vorschlag für deinen ${className}`,
    kitHint:
      "Waffe, Rüstung und das Werkzeug, ohne das die Klasse nicht arbeitet — dazu Reisegepäck. Alles einzeln abwählbar, und das Geld rechnet die App nicht ab.",
    kitTake: "Übernehmen",
    kitTaken: (n: number) => `${n} Stück übernommen`,
    kitAlready: "Steht schon im Gepäck",
    /** Für die Werte-Karte: worauf wirkt was. */
    acArmor: "Rüstungsbonus. Zählt, solange du die Rüstung anhast. Gegen Berührungsangriffe zählt er nicht mit.",
    acShield: "Schildbonus. Zählt, solange du das Schild in der Schildhand hältst — im Rucksack zählt es nicht.",
    maxDexNone: "Dieses Stück begrenzt deinen DEX-Bonus nicht.",
    maxDexText: (max: number, dex: number) =>
      dex > max
        ? `Von deinem DEX-Bonus zählen höchstens +${max} auf die RK. Dein DEX-Bonus ist +${dex} — du verlierst damit ${dex - max} Punkte RK.`
        : `Von deinem DEX-Bonus zählen höchstens +${max} auf die RK. Dein DEX-Bonus ist +${dex} — du verlierst nichts.`,
    acpLabel: "Fertigkeiten",
    acpText: (value: number) =>
      `${Math.abs(value)} Abzug auf die neun Fertigkeiten, bei denen die Rüstung im Weg ist: Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Sleight of Hand, Swim, Tumble. Bei Swim doppelt, also ${Math.abs(value) * 2}. Die App rechnet das schon mit — du siehst es im Fertigkeiten-Reiter an der Zeile stehen.`,
    asfLabel: "In Rüstung zaubern",
    asfNotYou: (classNames: string[]) =>
      `Betrifft dich nicht. Die Zahl gilt nur für Klassen, deren Zauber in Rüstung misslingen können${
        classNames.length > 0 ? ` (${classNames.join(", ")})` : " (Bard, Sorcerer, Wizard)"
      } — deine nicht.`,
    asfYou: (pct: number, classNames: string[]) =>
      `Jeder Zauber deiner ${classNames.join("/")}-Stufen misslingt zu ${pct} %, solange du das trägst. Die App rechnet diese Zahl NICHT gegen deine Zauber — sie steht hier, damit du am Tisch würfeln kannst (W100, ${pct} oder weniger: der Zauber ist weg).`,
    asfGeneric:
      "Gilt für Bard, Sorcerer und Wizard: deren Zauber misslingen mit dieser Wahrscheinlichkeit, solange man das trägt. Göttliche Zauberer (Cleric, Druid, Paladin, Ranger) sind nicht betroffen.",
    /** Die Karte, die seine Frage „warum und worauf" für SEINEN Bogen beantwortet. */
    loadTitle: "Was deine Rüstung kostet",
    loadNothing: "Du trägst nichts, was dich behindert.",

    /*
      Der Editor für eigene Gegenstände. Sein Wunsch, wörtlich: „außerdem möchte
      ich wie bei FC3 eigene erstellen können und dann diesen Gegenständen auch ggf
      Effekte und Boni hinzufügen können. Die dann auch wirklich rechnen."

      Jede Zahl bekommt einen Satz dazu, der sagt, WORAUF sie wirkt. Sein „Malus
      −2 (hä?, warum und worauf?)" war die Frage, mit der diese ganze Runde anfing.
    */
    editor: {
      addOwn: "+ Eigener Gegenstand",
      titleNew: "Eigener Gegenstand",
      titleEdit: "Gegenstand bearbeiten",
      edit: "Werte bearbeiten",
      kindLabel: "Art",
      kinds: {
        armor: "Rüstung",
        shield: "Schild",
        weapon: "Waffe",
        gear: "Sonstiges",
      } as Record<string, string>,
      kindHints: {
        armor:
          "Zählt auf die RK, sobald du sie anlegst. Trag Bonus, DEX-Grenze und Abzug so ein, wie sie im Buch stehen.",
        shield:
          "Kommt in die Schildhand und zählt dort auf die RK. Bonus und Abzug wie im Buch.",
        weapon:
          "Bekommt eine eigene Angriffszeile im Kampf-Reiter — auch wenn sie im Rucksack liegt.",
        gear: "Kein RK, kein Angriff. Boni trägst du danach an der Zeile im Gepäck ein — die rechnen mit.",
      } as Record<string, string>,
      nameLabel: "Name",
      namePlaceholder: "z.B. Templer Schwert",
      template: "Von einer Vorlage abschreiben",
      templateHint:
        "Nimmt alle Werte eines Regelwerks-Gegenstands als Ausgangspunkt. Du kannst sie danach ändern.",
      templateChosen: (name: string) =>
        `Vorlage: ${name} — Werte übernommen. Talente wie Weapon Focus wirken auch auf diesen Gegenstand, weil er als dieselbe Waffenart gilt.`,
      templateClear: "Vorlage lösen",
      armorKindLabel: "Rüstungsstärke",
      armorKinds: {
        light: "leicht",
        medium: "mittel",
        heavy: "schwer",
      } as Record<string, string>,
      armorKindHint:
        "Mittel und schwer bremsen die Bewegung: 30 ft werden 20 ft, 20 ft werden 15 ft. Die App rechnet das.",
      acBonusLabel: "RK-Bonus",
      acBonusHint: "Was der Gegenstand auf die RK gibt. Vollplatte 8, Kettenhemd 4, schwerer Schild 2.",
      maxDexUnlimited: "DEX unbegrenzt",
      maxDexLabel: "DEX-Grenze",
      maxDexHint:
        "Höchstens so viel DEX-Bonus zählt noch auf die RK. Vollplatte 1, Kettenhemd 4. Schilde haben keine Grenze.",
      acpLabel: "Abzug auf Fertigkeiten",
      acpHint:
        "Zieht von Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Sleight of Hand, Swim und Tumble ab. Bei Swim doppelt. Vollplatte 6, Kettenhemd 2.",
      asfLabel: "In Rüstung zaubern (%)",
      asfHint:
        "Nur für Bard, Sorcerer und Wizard. Die App rechnet es nicht gegen deine Zauber — sie zeigt es an, damit du am Tisch würfeln kannst.",
      damageLabel: "Schaden",
      damagePlaceholder: "1d8",
      damageHint: "Nur der Würfel, ohne deinen Stärkebonus — den rechnet die App dazu.",
      critRangeLabel: "Kritisch ab",
      critRangeHint: `Steht im Buch nur „19", ist das 19-20.`,
      critMultLabel: "Faktor",
      handednessLabel: "Führung",
      handedness: {
        light: "leicht",
        one: "einhändig",
        two: "zweihändig",
        ranged: "Fernkampf",
      } as Record<string, string>,
      handednessHint:
        "Leicht heißt: Kampfgeschick zählt, und der Malus der zweiten Hand ist kleiner. Zweihändig gibt den anderthalbfachen Stärkeschaden.",
      weaponCategoryLabel: "Vertrautheit",
      weaponCategories: {
        simple: "einfache Waffe",
        martial: "Kriegswaffe",
        exotic: "exotische Waffe",
        natural: "natürliche Waffe",
      } as Record<string, string>,
      weaponCategoryHint:
        `Wirkt heute nur bei „natürliche Waffe" — dann rechnet Power Attack anders. Fehlende Übung rechnet die App nicht.`,
      rangeLabel: "Reichweite je Schritt (ft)",
      rangeHint: "Kurzbogen 60, Wurfspeer 30, Dolch geworfen 10.",
      strDamageLabel: "Stärkeschaden",
      strDamageOptions: {
        none: "gar nicht (Armbrust)",
        penaltyOnly: "nur der Malus (Bogen)",
        full: "ganz (Wurfwaffe, Schleuder)",
      } as Record<string, string>,
      strDamageHint:
        "Steht so in den Waffentexten: Armbrüste bekommen nichts, Bögen nur einen Malus für niedrige Stärke, Wurfwaffen und die Schleuder den ganzen Modifikator.",
      damageTypeLabel: "Schadensart",
      damageTypePlaceholder: "piercing",
      weightLabel: "Gewicht (lb)",
      costLabel: "Preis (gp)",
      descriptionLabel: "Beschreibung",
      descriptionHint: "Was steht im Buch dazu? Nur für dich — die App rechnet daraus nichts.",
      more: "Mehr Angaben",
      previewTitle: "So steht es später in der Liste",
      save: "Anlegen und ins Gepäck",
      saveEdit: "Übernehmen",
      cancel: "Abbrechen",
      saveHint: "Landet im Gepäck. Ein Tap auf die Marke legt es an.",
      usedBy: (count: number, names: string[]) =>
        count <= 1
          ? "Dieser Gegenstand liegt nur auf diesem Bogen."
          : `Dieser Gegenstand liegt auf ${count} Bögen auf diesem Gerät (${names.join(", ")}). Deine Änderung gilt für alle.`,
      failed: (message: string) => `Konnte nicht gespeichert werden: ${message}`,
      /*
        LÖSCHEN eigener Gegenstandstypen. Es gab das bewusst nicht, weil ein
        gelöschter Typ jeden Bogen beschädigt, der ihn noch trägt — er verliert RK
        bzw. Angriffszeile und zeigt eine Fehlermeldung. Sein Wort dazu ist jetzt da:
        „ja".

        Gebaut wie bei den Talenten: gesperrt, aber mit Notausgang. Die App nennt die
        betroffenen Bögen namentlich; wer trotzdem will, bestätigt einmal. Der
        Grundsatz dieses Projekts bleibt damit gewahrt — der DM hat Recht, nicht die
        App —, ohne dass ein Fehlgriff einen Bogen kostet.
      */
      remove: "Diesen Typ löschen",
      removeFree: "Kein Bogen trägt ihn — Löschen ist gefahrlos.",
      removeBlocked: (names: string[]) =>
        names.length === 1
          ? `${names[0]} trägt ihn noch. Beim Löschen verliert der Bogen die Werte dieses Stücks und zeigt eine Fehlermeldung.`
          : `${names.join(", ")} tragen ihn noch. Beim Löschen verlieren diese Bögen die Werte dieses Stücks und zeigen eine Fehlermeldung.`,
      removeYes: "Ja, löschen",
      removeAnyway: "Ja, mein DM erlaubt es",
      removeNo: "Nein",
      /** Nach dem Löschen — der Rückweg steht im Kompendium. */
      removeDone: "Gelöscht. Im Kompendium lässt er sich zurückholen.",
      removeHint:
        "Gelöscht heißt hier nur markiert: der Typ verschwindet aus den Listen, bleibt aber im Kompendium unter „Gelöschte zeigen“ und lässt sich zurückholen.",
    },
  },

  /*
    Die Rast. Sein Auftrag, wörtlich: „Rasten soll irgendwo anders zentral sein
    nicht ein Button den man versehentlich drückt ohne zu wissen was passiert
    ist." Deshalb nennt jeder Text hier ZAHLEN — „füllt alles auf" wäre genau die
    Ansage, die er bemängelt hat.
  */
  rest: {
    action: "Rast (8 Stunden)",
    hint: "Gibt die verbrauchten Zauberplätze zurück und füllt deine Tageszähler.",
    /*
      Die kurze Pause. Sein Wort: „Ja, ohne Zauberplätze." Im Regelwerk gibt es sie
      so nicht — dort füllen sich Fähigkeiten pro Tag erst nach acht Stunden. Das
      ist eine Hausregel seines Tisches, und die gewinnt.
    */
    shortAction: "Kurze Pause",
    shortHint: "Füllt nur die Tageszähler. Die Zauberplätze bleiben verbraucht.",
    slotsUntouched: "Zauberplätze bleiben, wie sie sind.",
    nothing: "Nichts aufzufüllen — alle Plätze sind frei und die Zähler voll.",
    /*
      Und der Fall dazwischen, gefunden im gebauten Bogen: es ist nichts aufzufüllen,
      aber NICHT weil alles voll ist — sondern weil die betroffenen Zähler nicht
      mitrasten. Vorher stand dann „alle Plätze sind frei und die Zähler voll", und
      das war schlicht falsch: sein Zähler stand auf 2 von 3.

      Eine Rast, die nichts tut, muss sagen warum. Genau diese Stille hat ihn an
      „Aktionspunkte" gestört.
    */
    nothingSkipped: (lines: string[]) =>
      `Nichts aufzufüllen. ${lines.join(" · ")}`,
    confirmTitle: "Das ändert sich:",
    slotLine: (className: string, freed: number) =>
      `${className}: ${freed} ${freed === 1 ? "verbrauchter Platz wird" : "verbrauchte Plätze werden"} frei`,
    trackerLine: (name: string, from: number, to: number) => `${name}: ${from} → ${to}`,
    /** Martins Spellcraft-Hausregel: die lange Rast setzt die Ermüdung zurück. */
    spellcraftLine: (from: number) => `Spellcraft-Ermüdung: ${from} → 0`,
    skippedTitle: "Bleibt in Ruhe:",
    /*
      Warum ein Zähler in Ruhe bleibt. Die Tabelle MUSS jeden Grund kennen, den
      `RestSkippedLine` kennt — fehlt einer, steht in der Ansage nichts, und ein
      Zähler, der stillschweigend nicht mitrastet, ist genau das, was ihn an
      „Aktionspunkte" gestört hat.

      „eigene Mechanik" hieß früher „die Regel dazu kenne ich nicht". Das stimmt
      nicht mehr: seit er es je Zähler einstellen kann, ist es keine fehlende Regel,
      sondern eine, die er noch nicht gesetzt hat — und der Satz sagt jetzt, wo.
    */
    skippedReasons: {
      "eigene Mechanik": "füllt sich nicht von allein — beim Zähler einstellen",
      "keine Grenze": "keine Obergrenze eingetragen",
      "schon voll": "schon voll",
      "erst nach acht Stunden": "füllt sich erst bei der langen Rast",
      "nur beim Stufenaufstieg": "füllt sich nur beim Stufenaufstieg",
    } as Record<string, string>,
    /*
      Der Satz, der die zwei offenen Regelfragen benennt statt sie zu erfinden:
      1 TP pro Stufe pro Nachtruhe steht nirgends in dieser App, und ob temporäre
      TP eine Nacht überdauern, ist eine Entscheidung für seinen Tisch.
    */
    hpNote: "HP fasse ich nicht an — die trägst du im HP-Rechner nach.",
    confirm: "Rast machen",
    cancel: "Abbrechen",
    doneTitle: "Rast gemacht.",
    undo: "Zurücknehmen",
    undone: "Zurückgenommen.",
  },

  compendium: {
    kinds: {
      race: "Völker",
      class: "Klassen",
      feat: "Talente",
      skill: "Fertigkeiten",
      spell: "Zauber",
      item: "Gegenstände",
      monster: "Monster",
      condition: "Zustände",
      spelllist: "Zauberlisten",
      deity: "Götter",
    } as Record<string, string>,
    sourceSrd: "SRD",
    sourceHomebrew: "Homebrew",
    /*
      Der Rückweg zum Löschen eigener Typen. Gelöscht heißt in dieser App MARKIERT,
      nicht entfernt — aber bis jetzt zeigte das niemand an, und damit war ein
      Löschen faktisch endgültig.
    */
    showDeleted: "Gelöschte zeigen",
    deletedHint: "Gelöschte Einträge sind nur markiert. Sie tauchen in keiner Auswahl auf.",
    deletedMark: "gelöscht",
    restore: "Zurückholen",
    empty: "Nichts gefunden.",
    emptyHomebrew: "Hier liegt noch nichts Eigenes — Homebrew-Einträge erscheinen, sobald du welche anlegst oder importierst.",
    /** Warum „nur SRD" nichts ändert, solange es nichts anderes gibt. */
    allSrd: "Alles hier kommt aus dem SRD — die Quellen-Knöpfe trennen erst etwas, wenn eigene Einträge dazukommen.",
    capped: (shown: number, total: number) =>
      `Zeigt ${shown} von ${total} — tipp einen Namen ins Suchfeld, um den Rest zu erreichen.`,
    classGroups: {
      base: "Basisklassen",
      npc: "NPC-Klassen",
      prestige: "Prestigeklassen",
    } as Record<string, string>,
    classGroupHints: {
      base: "Was Spieler:innen wählen.",
      npc: "Für Bewohner der Welt: Adept, Aristocrat, Commoner, Expert, Warrior. Schwächer gebaut als Spielerklassen.",
      prestige: "Einstieg erst mit erfüllten Voraussetzungen.",
    } as Record<string, string>,
    epic: "episch",

    /*
      Götter — sein Auftrag: „Ich möchte auch gerne die Götter mit reinbringen, sodass
      wir die Domains des clerics korrekt verwenden können." Die App liefert KEINE mit:
      die bekannten Götternamen gehören nicht zum freien SRD (nur die Domänen tun das).
      Sein Tisch legt seine eigenen an — deshalb ist der Bereich von Haus aus leer und
      sagt warum, statt leer auszusehen wie ein Fehler.
    */
    deity: {
      addOwn: "+ Eigene Gottheit",
      titleNew: "Eigene Gottheit",
      titleEdit: "Gottheit bearbeiten",
      emptyHint:
        "Die App liefert keine Götter mit — deren Namen gehören nicht zum freien SRD, nur die Domänen. Legt die Götter eures Tischs hier an: Name, Domänen, Lieblingswaffe. Kleriker wählen dann am Bogen ihre Gottheit, und die App weiß, welche Domänen dazu passen.",
      name: "Name",
      namePlaceholder: "z.B. Der Schmied",
      alignment: "Gesinnung",
      alignmentPlaceholder: "z.B. LG",
      domains: "Domänen",
      domainsHint: "Welche Domänen diese Gottheit anbietet — daraus wählen ihre Kleriker.",
      domainsCount: (n: number) => `${n} gewählt`,
      favoredWeapon: "Lieblingswaffe",
      favoredWeaponHint:
        "Wichtig für die War-Domäne: ihr Weapon Focus gilt für genau diese Waffe.",
      favoredWeaponNone: "keine",
      clearWeapon: "entfernen",
      create: "Anlegen",
      saveChanges: "Übernehmen",
      /** Warum der Anlegen-Knopf noch gesperrt ist — statt eines stummen Knopfs. */
      needName: "Es fehlt noch: der Name.",
      needDomains: "Es fehlt noch: mindestens eine Domäne.",
      edit: "Bearbeiten",
      /** Was ein Löschen für Bögen heißt, die auf diese Gottheit zeigen. */
      removeNote: (names: string[]) =>
        `${names.join(" und ")} ${names.length === 1 ? "zeigt" : "zeigen"} auf diese Gottheit — der Bogen behält seine Domänen, nur die Prüfung dagegen fällt weg.`,
    },
  },

  dice: {
    title: "Würfel",
    history: "Verlauf",
    placeholder: "z.B. 2d6+3",
    invalid: "Ungültiger Ausdruck",
  },

  hpPad: {
    title: "Trefferpunkte ändern",
    heal: "Heilen",
    temp: "Temp.",
    damage: "Schaden",
    nonlethal: "Nichttödl.",
    open: "HP ändern",
    backspace: "Zeichen löschen",
    clear: "leeren",
    errors: {
      syntax: "Ausdruck ist unvollständig",
      "divide-by-zero": "Teilung durch Null",
      overflow: "Zahl ist zu groß",
      "too-complex": "Ausdruck ist zu verschachtelt",
      empty: "",
    } as Record<string, string>,
    rounded: (exact: string) => `${exact} — Bruchteil fällt weg`,
    negative: "unter 0 — kein Effekt",
  },

  /**
   * Sterben — Martins Hausregel in Worten.
   *
   * Jede Zeile nennt die GRENZE als Zahl, weil die Regel zwei verschiedene hat (den
   * CON-Modifikator und den CON-Wert) und man am Tisch sonst rechnet, während jemand
   * blutet. Die Zahlen kommen aus dem Bogen (`sheet.hp.deadAt`, `saveZoneDownTo`), nicht
   * aus einer zweiten Rechnung hier.
   */
  dying: {
    line: (state: string, deadAt: number, saveZoneDownTo: number | undefined): string => {
      const tot = `tot bei ${deadAt}`;
      switch (state) {
        case "saveZone":
          return `Unter 0 — eine Fortitude-Probe gegen SG 10 stabilisiert (bis ${
            saveZoneDownTo ?? 0
          }). Darunter keine Probe mehr, ${tot}.`;
        case "stable":
          return `Stabil — der Verlust ist gestoppt. Neuer Schaden hebt das auf, ${tot}.`;
        case "bleeding":
          return `Sterbend — 1 HP pro Runde, keine Probe mehr möglich. ${
            tot.charAt(0).toUpperCase() + tot.slice(1)
          }.`;
        case "dead":
          return `Tot — bei ${deadAt} HP ist die Grenze erreicht (negativer CON-Wert).`;
        default:
          return "";
      }
    },
    /** Der Knopf im TP-Rechner: eine Runde weiter, während die Figur blutet. */
    roundOn: "Eine Runde weiter: −1 HP",
    stabilizedOn: "Probe geschafft — stabil",
    stabilizedOff: "nicht mehr stabil",
    stabilizedHint: "Fortitude gegen SG 10, oder wie dein DM es entscheidet.",
  },

  trackers: {
    title: "Zähler",
    add: "Zähler anlegen",
    /*
      Die Beispiele stehen JE BEREICH, und das ist kein Schmuck: der alte Satz nannte
      „Untote vertreiben" — und stand nach der Aufteilung auch im Werte-Reiter, wo dieser
      Zähler ausdrücklich NICHT hingehört. Ein Beispiel, das im falschen Reiter steht,
      ist ein Text, der der Sache neben sich widerspricht, und davon hat diese App schon
      einen bezahlt (der Erklärtext zu Power Attack mit leichter Waffe).
    */
    hint: {
      general: "Für eigene Mechaniken: Aktionspunkte, Schicksalspunkte, Glückswürfel …",
      combat: "Für den Kampf: Untote vertreiben, Wutanfälle, Böses niederstrecken, Pfeile …",
      spells: "Für Zauberkram: Tiergestalt, spontane Umwandlungen, Metamagie-Anwendungen …",
      gear: "Für Verbrauch: Fackeln, Rationen, Wasserschläuche, Ladungen eines Stabs …",
    } as Record<string, string>,
    name: "Name",
    kind: "Art",
    kinds: { counter: "Zähler", value: "Fester Wert", roll: "Würfelwurf" } as Record<string, string>,
    /*
      Die Art als AUSGESCHRIEBENE Knopfreihe. Vorher ein Knopf, der durchschaltete und dabei
      nur den ersten Buchstaben zeigte — sein Wort: „diese komische ZFW Button, das soll
      ausgeschrieben sein, dass son son Buttons nebeneinander sein und nicht einer mit am
      einen Buchstaben nur der dann wechselt."
    */
    kindTitle: "Art:",
    kindHints: {
      counter: "Zählt herunter und herauf, mit − und + am Bogen. Kann sich bei einer Rast wieder auffüllen.",
      value: "Eine Zahl, die einfach dasteht — für alles, was du selbst nachträgst.",
      roll: "Ein Würfelausdruck. Der Knopf am Bogen würfelt ihn, und das Ergebnis bleibt stehen.",
    } as Record<string, string>,
    namePlaceholder: "z.B. Aktionspunkte",
    /*
      Der Wirken-Knopf und sein Blatt. Sein Auftrag: „bei Turn undead hätte ich gerne
      einen Button der sagt ‚wirken' dann öffnet sich eine infobox, die die Fähigkeit
      Schritt für Schritt durch geht … So dass ich das korrekt ausführe."

      Der Knopf steht nur an Zählern, für die es wirklich eine Anleitung gibt
      (`abilityGuide` gibt sonst `undefined`) — ein Knopf, der eine leere Box öffnet, wäre
      die Fehlerfamilie „verspricht etwas und tut nichts".
    */
    guide: "Wirken",
    guideSpend: "Fertig",
    /** Sagt die ZAHLEN vorher, wie bei der Rast — nicht bloß „zieht 1 ab". */
    guideSpendHint: (cost: string, left: number) =>
      `Beim Abschließen: ${cost} weg (${left} → ${left - 1}).`,
    guideEmpty: "Nichts mehr übrig — der Zähler steht auf 0.",
    /** Steht im leeren Maximum-Feld, wenn es keine Grenze gibt. */
    maxFree: "keine Grenze",
    value: "Wert",
    max: "Maximum (optional)",
    formula: "Würfelformel (z.B. 1d6+2)",
    reset: "Zurücksetzen",
    // Neutral: dieselbe Karte steht in vier Reitern, und die Beispiele hängen am Bereich.
    empty: "Noch keine Zähler in diesem Bereich.",
    suggestHint: "Aus deinen Klassen ergeben sich diese Zähler:",
    suggestAdd: "anlegen",
    /*
      Füllt sich bei der Rast — jetzt einstellbar, sein Wunsch: „ja, bzw soll man
      das selber einstellen können."

      Der Zustand steht als SATZ unter dem Namen, nicht als Zeichen am Knopf. Ein
      Knopf, der drei Zustände durchtippt, ohne dass einer davon zu lesen ist, ist
      ein Ratespiel — und die Zeile darunter war ohnehin schon da (dort steht die
      Herkunft der Grenze).
    */
    /*
      WANN sich der Zähler füllt. Aus dem Durchtipp-Knopf ist eine Knopfreihe
      geworden: „Es kann ja noch kurze Rast, Tag, Level up als Bedingung für den
      reset geben" — Begegnung und Tag hat er dann gestrichen, geblieben sind drei.
      Ab drei Möglichkeiten rät man beim Durchtippen, welcher Zustand als nächstes
      kommt; und mehrere zugleich („lange Rast ODER Stufenaufstieg") gehen damit
      ohnehin nicht.
    */
    refillTitle: "Füllt sich",
    refillKinds: {
      long: "Lange Rast",
      short: "Kurze Pause",
      levelUp: "Stufenaufstieg",
    } as Record<string, string>,
    /** Der Satz unter dem Namen — aus den gewählten Bedingungen gebaut. */
    refillNone: "füllt sich nicht von allein",
    refillLine: (parts: string[]) => `füllt sich bei: ${parts.join(" · ")}`,
    /*
      Die Folgerung steht dabei, weil sie sonst wie ein Fehler aussieht: wer „Kurze
      Pause" antippt, sieht danach AUCH „Lange Rast" leuchten.
    */
    refillShortImplies: "Die kurze Pause schließt die lange Rast ein.",
    /** WORAUF zurückgesetzt wird. */
    resetToTitle: "Zurück auf",
    resetToKinds: { max: "voll", zero: "0" } as Record<string, string>,
    resetToHint:
      "„voll“ ist richtig für Zähler, die du herunterzählst (7 von 7 Versuchen). „0“ für die, die du hochzählst — verbrauchte Aktionspunkte etwa.",
    /*
      Der Bereich. Sein Befund: „die Zähler gehören nicht auf die Werte Seite. Turn
      Undead ist ja was für die Kampf Seite. Actionpoint dann wieder nicht." Die Namen
      sind die der REITER, damit man nicht übersetzen muss, was wo landet.
    */
    categoryTitle: "steht bei:",
    categories: {
      general: "Werte",
      combat: "Kampf",
      spells: "Zauber",
      gear: "Ausrüstung",
    } as Record<string, string>,
    categoryHint:
      "Der Zähler steht nur in diesem einen Reiter. Nach dem Umstellen ist er hier weg und dort zu finden — gelöscht wird nichts.",
  },

  /*
    Aufräumen nach einem Fehler im Abgleich, der aus einem Charakter eine Reihe
    identischer Kopien gemacht hat. Der Text sagt, was passiert ist und warum das
    Löschen hier gefahrlos ist — nach dem verlorenen Hike hat er ein Recht darauf,
    dass die App bei so etwas nicht schweigt.
  */
  cleanup: {
    title: (n: number) => `${n} identische Konfliktkopien gefunden`,
    why: (name: string) =>
      `Inhaltlich sind sie Zeichen für Zeichen „${name}" — entstanden durch einen Fehler im Geräte-Abgleich, der behoben ist. Kopien mit eigenem Inhalt sind hier NICHT dabei, die bleiben in jedem Fall.`,
    action: (n: number) => `${n} Kopien wegräumen`,
    confirm: (n: number) => `Ja, ${n} Kopien löschen`,
    done: (n: number) => `${n} Konfliktkopien weggeräumt.`,
  },

  /*
    Mehrere Bögen auf einmal wegräumen — sein Auftrag: „Mach mal die Char Liste sauber.
    Schmeiß alle außer Hike raus."

    Gebaut als AUSWAHL und nicht als „alle außer diesem einen": ein Knopf, der alles bis
    auf einen Bogen nimmt, ist bei einem Fehlgriff der teuerste der ganzen App. Angekreuzt
    wird, was weg soll; die Rückfrage nennt jeden Namen einzeln.
  */
  bulk: {
    select: "Auswählen",
    done: "Fertig",
    /** Steht in der Leiste unten, solange ausgewählt wird. */
    count: (n: number, total: number) => `${n} von ${total} ausgewählt`,
    none: "Nichts ausgewählt — tippe die Bögen an, die weg sollen.",
    all: "Alle",
    clear: "Keine",
    delete: (n: number) => `${n} ${n === 1 ? "Bogen" : "Bögen"} löschen`,
    /** Die Rückfrage. */
    confirmTitle: (n: number) => `${n} ${n === 1 ? "Bogen" : "Bögen"} löschen?`,
    /*
      Der Satz, der die Sicherung trägt. Ein Charakter kennt keine Rücknahme und keinen
      Papierkorb — `CharacterRepo.remove` wirft die Zeile weg. Wer das nicht dazuschreibt,
      lässt jemanden auf ein Rückgängig warten, das es nicht gibt.
    */
    noUndo:
      `Das lässt sich nicht rückgängig machen. Die Sicherung ist der einzige Rückweg — sie enthält ALLE Bögen und wird oben über „Charakter-Datei (JSON)“ wieder eingelesen.`,
    backup: "Erst sichern (empfohlen)",
    backupDone: "✓ Sicherung geschrieben",
    backupFailed: "Sicherung hat nicht geklappt — deshalb wird nichts gelöscht.",
    /** Der rote Knopf trägt die Menge, damit man sie noch einmal liest. */
    confirmDelete: (n: number) => `${n} ${n === 1 ? "Bogen" : "Bögen"} endgültig löschen`,
    busy: "lösche …",
    result: (n: number) => `${n} ${n === 1 ? "Bogen" : "Bögen"} gelöscht.`,
  },

  notes: {
    sections: "Abschnitte",
    addSection: "Abschnitt anlegen",
    sectionTitle: "Titel (z.B. Gottheit, Familie, Hausregeln)",
    freeText: "Schnellnotizen",
    emptySections: "Noch keine Abschnitte — gut für Gottheit, Hintergrund oder Hausregel-Formeln.",
  },

  spells: {
    prepared: "Vorbereitet",
    known: "Bekannt",
    spellbook: "Zauberbuch",
    prepare: "Vorbereiten",
    /* Sein Wunsch: Sternchen als Favoriten, und die stehen je Grad oben. */
    favorite: "Als Favorit merken",
    unfavorite: "Favorit entfernen",
    foldedHint: (count: number) =>
      count === 1 ? "1 Zauber — zugeklappt" : `${count} Zauber — zugeklappt`,
    learn: "Lernen",
    cast: "Wirken",
    /*
      Der „−"-Knopf im Grad-Kopf trug bis hierher `rest` und behauptete damit eine
      Rast, obwohl er genau EINEN Platz zurückgibt. Der Mond ist weg, die Rast
      steht zentral im ⋯-Menü — der Knopf braucht seinen eigenen Satz.
    */
    giveBackSlot: "Einen Slot zurückgeben",
    restElsewhere:
      "Rast: oben im ⋯-Menü. Sie füllt die Plätze aller Zauberklassen und deine Tageszähler auf einmal auf und sagt vorher, was sich ändert.",
    browse: "Zauberliste durchsuchen",
    onlySpellbook: "nur Zauberbuch",
    level: "Grad",
    dc: "SG",
    noSlotsLeft: "keine Slots mehr",
    /** Im Zauber-Auswähler: dieser Grad ist voll (Hexenmeister-Grenze je Grad). */
    levelFull: (level: number) => `Grad ${level} ist voll`,
    noneFound: "Kein Zauber gefunden.",
    /*
      „zieht ab" und nicht „zählt hoch": die Anzeige nennt die FREIEN Plätze — die Zahl
      („Slots 3/4") wie die Punkte. Ein Satz, der das Gegenteil sagt, ist genau der Grund
      für seinen Befund gewesen: „Irgendwie Quatsch, dass sich die Zauberplätze füllen wenn
      ich einen Zauber wirke."
    */
    preparedHint:
      "Wirken zieht einen Slot des Grads ab — welcher konkrete Zauber verbraucht ist, merkt ihr euch wie am Tisch üblich.",
    knownLimit: (have: number, max: string) => `${have}/${max} bekannt`,
    slots: "Slots",

    /*
      Zaubern über eine Spellcraft-Probe — Martins Hausregel, von seinem Blatt
      („Spellcasting by Spellcraft (HB)"), Philipps Klärung: „Ermüdung bei jeder
      Nutzung". Die Texte hier sind die ANLEITUNG; gerechnet wird im Kern
      (`engine/spellcraftCasting.ts`).
    */
    craft: {
      /** Der Knopf im Grad-Kopf. Kurz — die Zeile trägt schon Punkte, Zahl und SG. */
      button: "Probe",
      buttonTitle: (dc: number) => `Per Spellcraft wirken (DC ${dc})`,
      title: (level: number) => `Grad ${level} per Spellcraft wirken`,
      intro:
        "Statt einen Platz zu verbrauchen, darfst du eine Spellcraft-Probe ablegen — eure Hausregel. Der Platz bleibt frei; dafür steigt mit jeder Probe die Ermüdung.",
      checkTitle: "Die Probe",
      check: (dc: number, exhaustion: number, level: number) =>
        exhaustion > 0
          ? `Spellcraft gegen DC ${dc} (12 + ${exhaustion} Ermüdung + Grad ${level}).`
          : `Spellcraft gegen DC ${dc} (12 + Grad ${level}).`,
      /** Grad 0 rechnet als 1 — steht nur dort, wo es gilt. */
      levelZero: "Grad-0-Zauber zählen bei dieser Regel als Grad 1.",
      noSkill:
        "Spellcraft ist ohne Ränge nicht nutzbar — ohne Ränge gibt es hier keinen Wurf. Ob ihr es trotzdem erlaubt, entscheidet euer DM.",
      outcomesTitle: "Was der Wurf bedeutet",
      success: "Geschafft: der Zauber wirkt, als hättest du einen Platz benutzt.",
      crit: (from: number) =>
        `Natürliche ${from === 20 ? "20" : `${from}–20`}: kritisch — du wählst eines: kein Rettungswurf · doppelte Wirkungswürfel · im Kampf kein Gelegenheitsangriff.`,
      fail: "Daneben: nichts passiert — im Kampf provoziert der Versuch einen Gelegenheitsangriff.",
      critFail: (damage: number) =>
        `Natürliche 1 (Patzer): wie daneben, und die Magie schlägt zurück — ${damage} Schaden an dich.`,
      bookTitle: "Verbuchen",
      bookHint: (from: number, to: number) =>
        `Jede Probe ermüdet — auch eine geschaffte. Ermüdung ${from} → ${to}; die Rast (8 Stunden) setzt auf 0 zurück.`,
      /** Der normale Fall: geschafft oder daneben — beides kostet nur Ermüdung. */
      book: (from: number, to: number) => `Verbuchen (Ermüdung ${from} → ${to})`,
      /** Der Patzer bucht zusätzlich den Schaden — mit Ansage, wie alles hier. */
      bookCritFail: (damage: number) => `Patzer verbuchen (+${damage} Schaden)`,
      booked: (level: number) => `Spellcraft-Probe Grad ${level}`,
      /** Die Zeile oben im Block, nur wenn Ermüdung da ist. */
      exhaustionLine: (value: number, nextDc: number) =>
        `Spellcraft-Ermüdung: ${value} — Grad-1-Probe ab jetzt DC ${nextDc}. Setzt sich bei der Rast (8 Stunden) zurück.`,
    },

    addToSpellbook: "Zauberbuch erweitern",
    emptySpellbook: "Noch keine Zauber im Buch — unten aus der Klassenliste wählen.",
    noneAtLevel: "Kein Zauber dieses Grades gefunden.",
    another: "noch einmal",
    /** Zustandsmarker in der Zeile, seit die Symbole weg sind. */
    isPrepared: "vorbereitet",
    isKnown: "bekannt",
    unprepare: "Vorbereitung lösen",
    unlearn: "Vergessen",
    removeFromSpellbook: "Aus dem Zauberbuch nehmen",
    domains: "Domänen",
    domainSlot: "Domänenplatz",
    /** Die Marke am Zauber, der nur über die Domäne dazukommt. */
    fromDomain: "Domäne",
    domainsMissing: (have: number, want: number) =>
      `${have} von ${want} gewählt — im Bearbeiten-Modus nachtragen.`,
    domainsHint:
      "Jede Domäne bringt ihre neun Zauber mit und je Zaubergrad einen zusätzlichen Platz. Der Platz gehört einem Domänenzauber.",
    domainRemove: "Domäne entfernen",
    /*
      Die Auswahl selbst. Sie ersetzt das `<select>` mit 36 Namen — dort stand
      nicht, was eine Domäne GEWÄHRT, und genau das ist der Grund, aus dem man
      wählt.
    */
    domainCount: (have: number, want: number) => `Domänen: ${have} von ${want} gewählt`,
    domainFull: "Beide Domänen sind gewählt — erst eine entfernen.",
    domainStepTitle: (className: string) => `Domänen für deinen ${className}`,
    domainStepHint:
      "Jede Domäne bringt eine Fähigkeit und ihre neun Zauber mit, dazu je Zaubergrad einen zusätzlichen Platz. Ein Tipp auf den Namen zeigt die Zauber.",

    /*
      Die Gottheit am Bogen — sein Auftrag: „Ich möchte auch gerne die Götter mit
      reinbringen, sodass wir die Domains des clerics korrekt verwenden können."
      Gewählt wird aus dem Kompendium (eigener Bereich „Götter"), gespeichert als
      Verweis; fremde Domänen bleiben wählbar — gewarnt, nie gesperrt.
    */
    deity: "Gottheit",
    deityNone: "keine gewählt",
    deityRemove: "Gottheit entfernen",
    // Backticks wegen der deutschen Anführungszeichen — die Regel steht in CLAUDE.md.
    deityNoneYet: `Noch keine Götter im Kompendium — dort anlegen (Bereich „Götter"), dann kannst du hier wählen.`,
    deityGo: "Zum Kompendium",
    /** Die Marke an einer Domäne, die die gewählte Gottheit anbietet. */
    deityOffers: (name: string) => `✓ ${name}`,
    /*
      Der feste Bonus der War-Domäne — genau seine Sorge: „ob ich den Bonus fest von
      der war Domain schon hab oder ob ich den vergessen hab." Hinweis mit Knopf,
      seine Wahl: die Zahl wandert erst auf seinen Tipp.
    */
    warHint: (weapon: string) =>
      `Die War-Domäne gewährt dir Weapon Focus (${weapon}) als festen Bonus — es steht noch nicht am Bogen.`,
    warAdd: "Weapon Focus eintragen",
    warGranted: (weapon: string) =>
      `Weapon Focus (${weapon}) steht am Bogen — der feste Bonus der War-Domäne.`,
  },

  import: {
    title: "Aus Fight Club importieren",
    pick: "Fight-Club-XML wählen…",
    hint: "Exportiere in Fight Club deinen Charakter als XML und wähle die Datei hier aus. Die App rekonstruiert Volk, Klassen, Attribute, Ränge, Talente und Waffen; RK und Rettungswürfe werden per sichtbarem Ausgleichs-Modifikator auf die Originalwerte gebracht (fehlende Ausrüstung).",
    found: (n: number) => (n === 1 ? "1 Charakter gefunden" : `${n} Charaktere gefunden`),
    apply: "Übernehmen",
    applied: (n: number) => `${n} Charakter(e) übernommen.`,
    comparison: "Abgleich mit dem Original",
    matchLabel: "stimmt",
    reconciled: "ausgeglichen",
    reportedOnly: "weicht ab",
    matches: "Alle Werte stimmen mit dem Original überein.",
    noValues: "Der Export enthält keine Vergleichswerte (RK, Rettungswürfe, BAB) — nichts zu prüfen.",
    notes: "Hinweise",
    failed: "Datei konnte nicht gelesen werden",
    nothing: "Keine Charaktere in der Datei gefunden.",
  },

  levelUp: {
    /*
      Zähler, die der Aufstieg zurücksetzt. Steht in der Zusammenfassung, bevor er
      „Anwenden" drückt — dieselbe Regel wie bei der Rast: was er gelesen hat,
      passiert danach.
    */
    trackerLine: (name: string, from: number, to: number) =>
      `${name}: ${from} → ${to} (Stufenaufstieg)`,
    title: "Stufenaufstieg",
    /** Ohne Pfeil-Zeichen — der steht daneben als gezeichnetes Zeichen, siehe `rollAll`. */
    ready: "Bereit zum Aufstieg!",
    chooseClass: "Klasse für die neue Stufe",
    /*
      Kein „TP-Wurf" mehr: an seinem Tisch wird nicht gewürfelt (Martin: „volle Hit Die
      der Klasse, kein Wurf"). Die Karte sagt jetzt die Zahl, statt eine Eingabe
      anzubieten, die es nicht mehr gibt.
    */
    hpTitle: "Trefferpunkte für diese Stufe",
    hpFull: (die: number, gain: number) =>
      `Voller Trefferwürfel: W${die} → ${gain >= 0 ? "+" : ""}${gain} HP (mit CON).`,
    hpFullWhy: "Hausregel am Tisch: beim Aufstieg wird nicht gewürfelt.",
    hpNoClass: "Erst eine Klasse wählen.",
    abilityIncrease: "Attributssteigerung (alle 4 Stufen)",
    skills: "Fertigkeitspunkte verteilen",
    feats: "Neues Talent wählen",
    newSpells: "Neue Zauber lernen",
    summary: "Zusammenfassung",
    apply: "Stufe aufsteigen",
    hpDelta: "Trefferpunkte",
    newLevel: "Neue Stufe",
    /**
     * Der Aufstieg sagt VORHER an, dass ab jetzt ein Angriff dazukommt.
     *
     * Sein Auftrag: „Auch beim leveln sollte das erwähnt werden." Dieselbe Sorte Ansage
     * wie bei den Zählern, die der Aufstieg zurücksetzt — was er gelesen hat, passiert
     * danach. Und es steht nur da, wenn die ANZAHL wirklich steigt: bei Stufe 6 → 7
     * ändert sich nichts, und ein Satz, der immer dasteht, wird nicht gelesen.
     */
    moreAttacks: (n: number, bab: string) =>
      `Neu ab dieser Stufe: ${n} Angriffe pro Runde bei voller Attacke (BAB ${bab}).`,
  },

  misc: {
    loading: "Lade…",
    seedRunning: "SRD-Kompendium wird eingerichtet…",
    noCharacters: "Noch keine Charaktere. Leg deinen ersten an!",
    confirmDelete: (name: string) => `„${name}" wirklich löschen?`,
    issues: "Hinweise",
    offlineReady: "App ist offline verfügbar.",
  },

  /*
    Die neue Fassung holen.

    Sein Satz war „Es kommt kein Update". Vorher stand hier ein Browser-Dialog
    („Update verfügbar — neu laden?"), der auf dem iPhone nie aufging: gesucht wurde
    nur beim Laden der Seite, und eine installierte App lädt nie neu. Jetzt eine
    Leiste in der App — dieselbe Entscheidung wie beim Teilgebiet-Auswähler: wo die
    App etwas anzubieten hat, gehört ein Knopf hin und kein Browser-Dialog.
  */
  update: {
    /** Der neue Stand liegt schon auf dem Gerät — ein Tap genügt. */
    ready: "Neue Fassung ist da",
    /** Auf dem Server liegt etwas anderes, heruntergeladen ist es noch nicht. */
    onServer: "Es gibt eine neue Fassung",
    apply: "Jetzt laden",
    busy: "Lädt…",
    dismiss: "Meldung schließen",
    /**
     * Was ein Tap tut. Wichtig ist der zweite Halbsatz: im Notfall wird der
     * Zwischenspeicher geleert, und dann ist die App bis zum nächsten Laden nicht
     * offline benutzbar. Das gehört dazugesagt, bevor er drückt.
     */
    hint:
      "Deine Bögen bleiben unangetastet — sie liegen im Gerät, nicht in der App. Falls nötig wird der Zwischenspeicher geleert; dann braucht die App beim nächsten Start einmal Netz.",
  },

  /*
    „Nicht gespeichert" — die Leiste, die es sagt.

    Bis hierher landete ein fehlgeschlagener Schreibvorgang nur in der Konsole, und
    dazu stand sein Satz seit Monaten als offener Punkt da: auf dem Handy schaut da
    niemand hinein. Was er merkte, war nur, dass ein Tap nichts tat.

    Der Text sagt deshalb ZWEI Dinge, und beide sind wichtig: dass die Änderung NICHT
    drin ist (sonst hält er die Zahl am Bogen für gespeichert), und dass ein zweiter
    Versuch da ist. Ein Band, das nur „Fehler" sagt, macht Angst und ändert nichts.
  */
  saveError: {
    title: (what: string) => `Nicht gespeichert: ${what}`,
    retry: "Nochmal versuchen",
    busy: "Versuche…",
    /** Nach einem geglückten zweiten Versuch — steht kurz da, damit er es sieht. */
    fixed: "Gespeichert.",
    dismiss: "Meldung schließen",
  },

  /*
    „Hast du etwas vergessen?"

    Sein Auftrag: „Wir brauchen eine Warnung wenn man etwas vergessen hat. Wenn man
    zb ein Talent zu wenig oder noch skill Punkte offen sind."

    Die Sätze der Warnungen selbst stehen NICHT hier, sondern in
    `core/engine/validate.ts` — dort, wo die Zahl herkommt. Ein zweiter Ort für
    denselben Satz wären zwei Wahrheiten. Hier steht nur, was die Anzeige drumherum
    braucht.
  */
  open: {
    /** Die Marke auf der Startseite. */
    mark: (count: number) => (count === 1 ? "1 offen" : `${count} offen`),
    markTitle: (lines: string[]) => `Noch offen:\n${lines.join("\n")}`,
    /** „Passt so" — der Hinweis verschwindet, bis mehr offen ist. */
    mute: "passt so",
    muteHint:
      "Der Hinweis ist damit weg. Er kommt wieder, wenn MEHR offen ist als jetzt — ein aufgesparter Talent-Slot bleibt also still, ein zweiter meldet sich.",
    mutedCount: (count: number) =>
      count === 1 ? "1 Hinweis ist abgestellt" : `${count} Hinweise sind abgestellt`,
    unmute: "wieder zeigen",
    /** Die Rückfrage am Ende des Assistenten und des Stufenaufstiegs. */
    confirmTitle: "Da ist noch was offen",
    confirmHint: "Anlegen geht trotzdem — dein DM kann dir Punkte auch später geben.",
    confirmHintLevelUp: "Fertig geht trotzdem — du kannst alles auch später nachtragen.",
    confirmYes: "Trotzdem weiter",
    confirmBack: "Zurück und nachtragen",
    /** Steht am Reiter-Punkt als Vorlese-Text. */
    tabDot: (count: number) => (count === 1 ? "1 Hinweis" : `${count} Hinweise`),
  },
};
