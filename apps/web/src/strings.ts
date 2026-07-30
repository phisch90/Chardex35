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
    hp: "TP",
    hpMax: "max.",
    damage: "Schaden",
    nonlethal: "Nichttödlich",
    temp: "Temp. TP",
    ac: "RK",
    touch: "Touch",
    flatFooted: "Flat-Footed",
    touchHint: "Gegen Berührungsangriffe: Rüstung, Schild und natürliche Rüstung zählen nicht.",
    flatFootedHint: "Überrascht, vor der ersten Aktion: kein DEX-Bonus, kein Ausweichen.",
    init: "Initiative",
    speed: "Bewegung",
    bab: "GAB",
    grapple: "Ringkampf",
    level: "Stufe",
    xp: "EP",
    nextLevel: "nächste Stufe",
    attacks: "Angriffe",
    /*
      „+8 / +3" sagt niemandem etwas, der es nicht schon weiß. Auf dem Handy
      steht der kurze Hinweis, auf breiten Schirmen (iPad) gleich der ganze Satz
      — sein Wunsch: „kann in der iPad-Version gerne schon danebenstehen".
    */
    iterativeShort: (n: number) => `${n} Angriffe pro Runde — antippen erklärt es`,
    iterativeHint: (mods: string[]) =>
      `Volle Attacke: ${mods.length} Angriffe hintereinander mit ${mods.join(" und ")} — jeder weitere liegt 5 niedriger. Ein einzelner Angriff (Standard-Aktion) nutzt immer ${mods[0]}.`,
    damage2: "Schaden",
    critical: "Krit.",
    ranks: "Ränge",
    maxRanks: "max.",
    classSkill: "Klassenfertigkeit",
    melee: "Nahkampf",
    ranged: "Fernkampf",
    equipped: "Angelegt",
    stowed: "Rucksack",
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
    subtypePrompt: "Teilgebiet (z.B. arcana, weaponsmithing):",
    conditions: "Zustände",
    features: "Klassenfähigkeiten",
    miscMods: "Sonstige Modifikatoren",
    encumbrance: { light: "Leichte Last", medium: "Mittlere Last", heavy: "Schwere Last", overloaded: "Überladen!" } as Record<string, string>,
    slots: "Slots",
    dcBase: "SG-Basis",
    casterLevel: "Zauberstufe",
    breakdownSuppressed: "wirkt nicht",
    portrait: "Porträt",
    /** Der Punkt an einer Attributs-Kachel und was er bedeutet. */
    abilityDotHint: "• = da kommt etwas dazu (Volk, Talent, Gegenstand) — antippen zeigt, was.",
    abilityHasBonus: "Grundwert plus alles, was darauf wirkt.",
    editModeOn: "Bearbeiten: Name, Ränge, Talente, Ausrüstung, Zähler",
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
    steps: ["Volk", "Attribute", "Klasse", "Fertigkeiten", "Talente", "Ausrüstung", "Fertig"],
    name: "Name",
    playerName: "Spieler:in",
    hpRoll: "TP-Wurf",
    pointsLeft: "Punkte übrig",
    slotsLeft: "Slots übrig",
    standardArray: "Standardreihe (15/14/13/12/10/8)",
    rollAll: "🎲 Alle würfeln (4W6, niedrigster fällt)",
    /** NPC-Klassen sind kein Spielerfutter — aber erreichbar, für Gefolge und NSCs. */
    showNpcClasses: "auch NPC-Klassen",
  },

  settings: {
    tagline: "D&D 3.5 mit Homebrew — alles auf deinem Gerät",
    features: "Funktionen",
    diceEnabled: "Würfeln in der App",
    diceEnabledHint: "Aus: keine Würfel-Knöpfe am Bogen und kein Würfel-Reiter.",
    encumbrance: "Gewicht & Traglast",
    encumbranceHint: "Aus: keine Gewichtsangaben, und die Last bremst weder Bewegung noch Geschicklichkeit.",
    houseRules: "Hausregeln",
    fractional: "Fraktionale BAB/Saves (Unearthed Arcana)",
    maxHpL1: "Volle TP auf Stufe 1",
    xpPenalty: "Multiclass-EP-Strafe (RAW)",
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

  combat: {
    title: "Kampfoptionen",
    hint: "Gilt für diese Runde. Die Werte oben ändern sich mit.",
    reset: "alles zurück",
    powerAttack: "Power Attack",
    powerAttackHint: (bab: number) =>
      `Vom Angriff auf den Schaden, höchstens ${bab} (dein GAB). Zweihändig zählt der Schaden doppelt, mit leichter Waffe gar nicht.`,
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
    } as Record<string, string>,
    sourceSrd: "SRD",
    sourceHomebrew: "Homebrew",
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
    open: "TP ändern",
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

  trackers: {
    title: "Zähler",
    add: "Zähler anlegen",
    hint: "Für eigene Mechaniken: Aktionspunkte, Untote vertreiben, Schicksalspunkte …",
    name: "Name",
    kind: "Art",
    kinds: { counter: "Zähler", value: "Fester Wert", roll: "Würfelwurf" } as Record<string, string>,
    value: "Wert",
    max: "Maximum (optional)",
    formula: "Würfelformel (z.B. 1d6+2)",
    reset: "Zurücksetzen",
    empty: "Noch keine Zähler. Leg einen an für Aktionspunkte & Co.",
    suggestHint: "Aus deinen Klassen ergeben sich diese Zähler:",
    suggestAdd: "anlegen",
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
    learn: "Lernen",
    cast: "Wirken",
    rest: "Rast (Slots zurücksetzen)",
    browse: "Zauberliste durchsuchen",
    onlySpellbook: "nur Zauberbuch",
    level: "Grad",
    dc: "SG",
    noSlotsLeft: "keine Slots mehr",
    preparedHint:
      "Wirken zählt die Slots des Grads hoch — welcher konkrete Zauber verbraucht ist, merkt ihr euch wie am Tisch üblich.",
    knownLimit: (have: number, max: string) => `${have}/${max} bekannt`,
    slots: "Slots",
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
    pickDomain: "Domäne wählen…",
    domainsMissing: (have: number, want: number) =>
      `${have} von ${want} gewählt — im Bearbeiten-Modus nachtragen.`,
    domainsHint:
      "Jede Domäne bringt ihre neun Zauber mit und je Zaubergrad einen zusätzlichen Platz. Der Platz gehört einem Domänenzauber.",
    domainRemove: "Domäne entfernen",
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
    noValues: "Der Export enthält keine Vergleichswerte (RK, Rettungswürfe, GAB) — nichts zu prüfen.",
    notes: "Hinweise",
    failed: "Datei konnte nicht gelesen werden",
    nothing: "Keine Charaktere in der Datei gefunden.",
  },

  levelUp: {
    title: "Stufenaufstieg",
    ready: "⬆ Bereit zum Aufstieg!",
    chooseClass: "Klasse für die neue Stufe",
    hpRoll: "TP-Wurf für diese Stufe",
    rollHp: "würfeln",
    abilityIncrease: "Attributssteigerung (alle 4 Stufen)",
    skills: "Fertigkeitspunkte verteilen",
    feats: "Neues Talent wählen",
    newSpells: "Neue Zauber lernen",
    summary: "Zusammenfassung",
    apply: "Stufe aufsteigen",
    hpDelta: "Trefferpunkte",
    newLevel: "Neue Stufe",
  },

  misc: {
    loading: "Lade…",
    seedRunning: "SRD-Kompendium wird eingerichtet…",
    noCharacters: "Noch keine Charaktere. Leg deinen ersten an!",
    confirmDelete: (name: string) => `„${name}" wirklich löschen?`,
    issues: "Hinweise",
    updateAvailable: "Update verfügbar — neu laden?",
    offlineReady: "App ist offline verfügbar.",
  },
};
