/**
 * Deutsche Erklärungen zu den SRD-Talenten.
 *
 * Bewusst NUR die Erklärung, nicht der Name: die App zeigt Talent- und
 * Fertigkeitsnamen englisch wie das Regelwerk, und der Fight-Club-Import trifft
 * seine Einträge über den englischen Namen. Ein deutscher Name hier würde beides
 * auseinanderlaufen lassen.
 *
 * Es sind sinngemäße Zusammenfassungen der Mechanik, keine Übersetzungen des
 * OGL-Textes — der englische Originaltext bleibt am Eintrag stehen und ist im
 * Kompendium weiter nachlesbar. Fertigkeitsnamen bleiben englisch, weil sie in
 * der Oberfläche so heißen (Listen, Spot, …).
 *
 * Schlüssel = Slug hinter `srd:feat:`. Fehlt ein Slug, zeigt die App den
 * englischen Text mit Hinweis an — unvollständig ist also erlaubt.
 */
export const FEATS_DE: Record<string, string> = {
  // --- Fertigkeits-Paare (die „+2 auf zwei Fertigkeiten"-Familie) ----------
  acrobatic: "+2 auf Jump und Tumble.",
  agile: "+2 auf Balance und Escape Artist.",
  alertness: "+2 auf Listen und Spot.",
  "animal-affinity": "+2 auf Handle Animal und Ride.",
  athletic: "+2 auf Climb und Swim.",
  deceitful: "+2 auf Disguise und Forgery.",
  "deft-hands": "+2 auf Sleight of Hand und Use Rope.",
  diligent: "+2 auf Appraise und Decipher Script.",
  investigator: "+2 auf Gather Information und Search.",
  "magical-aptitude": "+2 auf Spellcraft und Use Magic Device.",
  negotiator: "+2 auf Diplomacy und Sense Motive.",
  "nimble-fingers": "+2 auf Disable Device und Open Lock.",
  persuasive: "+2 auf Bluff und Intimidate.",
  "self-sufficient": "+2 auf Heal und Survival.",
  stealthy: "+2 auf Hide und Move Silently.",

  // --- Rüstung & Schild ---------------------------------------------------
  "armor-proficiency-light":
    "Du bist mit leichter Rüstung vertraut: deren Rüstungsmalus gilt nur noch für Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Sleight of Hand und Tumble. Ohne Vertrautheit zählt der Malus auf alle Fertigkeitswürfe mit Stärke oder Geschicklichkeit.",
  "armor-proficiency-medium":
    "Wie Armor Proficiency (Light), aber für mittelschwere Rüstung. Setzt die leichte Vertrautheit voraus.",
  "armor-proficiency-heavy":
    "Wie Armor Proficiency (Light), aber für schwere Rüstung. Setzt die mittelschwere Vertrautheit voraus.",
  "shield-proficiency":
    "Du kannst Schilde ohne Malus auf Angriffswürfe führen. Ohne Vertrautheit gilt der Rüstungsmalus des Schildes auch auf Angriffe.",
  "tower-shield-proficiency":
    "Du kannst Turmschilde führen, ohne dafür einen Malus auf Angriffswürfe zu erhalten.",

  // --- Waffenvertrautheit -------------------------------------------------
  "simple-weapon-proficiency":
    "Du bist mit allen einfachen Waffen vertraut. Ohne Vertrautheit gibt es −4 auf Angriffswürfe mit der Waffe.",
  "martial-weapon-proficiency":
    "Wähle eine Kriegswaffe. Mit dieser Waffe greifst du ohne den Malus von −4 für Unvertrautheit an. Das Talent gilt je Waffe einmal.",
  "exotic-weapon-proficiency":
    "Wähle eine exotische Waffe. Mit dieser Waffe greifst du normal an, statt den Malus für Unvertrautheit zu erhalten. Das Talent gilt je Waffe einmal.",

  // --- Angriff und Verteidigung im Nahkampf -------------------------------
  dodge:
    "Du bestimmst zu Beginn deiner Aktion einen Gegner und erhältst gegen dessen Angriffe +1 Ausweich-Bonus auf die RK. Das Ziel darfst du in jeder Aktion neu wählen. Verlierst du deinen GE-Bonus auf die RK (z.B. auf dem falschen Fuß), fällt auch dieser Bonus weg.",
  mobility:
    "+4 Ausweich-Bonus auf die RK gegen Gelegenheitsangriffe, die du dadurch auslöst, dass du aus einem bedrohten Feld herausgehst.",
  "spring-attack":
    "Bei einer vollen Aktion darfst du dich bewegen, angreifen und weiterlaufen — die Gesamtstrecke bleibt dein Bewegungswert. Der Gegner, den du angreifst, bekommt für diese Bewegung keinen Gelegenheitsangriff.",
  "combat-expertise":
    "Bei einer Angriffs- oder vollen Angriffsaktion im Nahkampf darfst du bis zu −5 auf deine Angriffswürfe nehmen und denselben Betrag als Ausweich-Bonus auf die RK legen. Höchstens so viel, wie dein Grundangriffsbonus beträgt. Die Verschiebung gilt bis zu deiner nächsten Aktion.",
  "improved-disarm":
    "Entwaffnen löst keinen Gelegenheitsangriff aus, und du erhältst +4 auf den entsprechenden vergleichenden Angriffswurf.",
  "improved-feint":
    "Du kannst im Nahkampf mit einer Standard-Aktion täuschen statt mit einer vollen Aktion.",
  "improved-trip":
    "Umwerfen löst keinen Gelegenheitsangriff aus, du erhältst +4 auf den Stärke-Vergleich, und nach einem gelungenen Umwerfen darfst du sofort einen weiteren Nahkampfangriff gegen dasselbe Ziel führen.",
  "combat-reflexes":
    "Du darfst zusätzliche Gelegenheitsangriffe in Höhe deines GE-Bonus führen und auch dann, wenn du auf dem falschen Fuß stehst.",
  cleave:
    "Bringst du eine Kreatur mit einem Nahkampfangriff zu Fall, erhältst du sofort einen weiteren Nahkampfangriff gegen einen anderen Gegner in Reichweite. Höchstens einmal pro Runde.",
  "great-cleave": "Wie Cleave, aber ohne Begrenzung auf einmal pro Runde.",
  "power-attack":
    "Bei einer Angriffs- oder vollen Angriffsaktion darfst du bis zu deinem Grundangriffsbonus von den Angriffswürfen abziehen und denselben Betrag auf den Nahkampfschaden legen. Mit zweihändig geführten Waffen zählt der Schadensbonus doppelt; bei leichten Waffen gar nicht.",
  "improved-bull-rush":
    "Ansturm löst keinen Gelegenheitsangriff aus, und du erhältst +4 auf den Stärke-Vergleich.",
  "improved-overrun":
    "Der Gegner darf einem Überrennen nicht ausweichen, und du erhältst +4 auf den Stärke-Vergleich.",
  "improved-sunder":
    "Das Zerschlagen einer Waffe oder eines Schildes löst keinen Gelegenheitsangriff aus, und du erhältst +4 auf den vergleichenden Angriffswurf.",
  "improved-grapple":
    "Ein Ringkampf-Versuch löst keinen Gelegenheitsangriff aus, und du erhältst +4 auf Ringkampf-Würfe.",
  "improved-unarmed-strike":
    "Du gelt als immer bewaffnet: du löst mit unbewaffneten Angriffen keine Gelegenheitsangriffe aus und kannst selbst Gelegenheitsangriffe führen. Der Schaden gilt als nichttödlich, kann aber mit −4 auf den Angriff als tödlich erklärt werden.",
  "deflect-arrows":
    "Einmal pro Runde darfst du einen Fernangriff, der dich treffen würde, abwehren und nimmst keinen Schaden. Du musst eine Hand frei haben und den Angriff bemerken; Geschosse von Belagerungswaffen und außergewöhnlich große Projektile gehen nicht.",
  "snatch-arrows":
    "Statt ein Geschoss nur abzuwehren, fängst du es auf und kannst es (wenn es eine Waffe ist, die du werfen kannst) im selben Zug als freie Aktion zurückwerfen.",
  "blind-fight":
    "Verfehlst du im Nahkampf wegen Sichtschutz, darfst du den Prozentwurf einmal wiederholen. Unsichtbare Angreifer haben im Nahkampf gegen dich keinen Vorteil, und schwieriges Gelände halbiert deine Geschwindigkeit nicht, wenn du blind kämpfst.",
  diehard:
    "Bei −1 bis −9 Trefferpunkten wirst du automatisch stabil und verlierst nicht jede Runde einen weiteren Trefferpunkt. Du darfst weiter handeln wie außer Gefecht (eine Standard- oder Bewegungsaktion pro Runde, anstrengende Handlungen kosten 1 TP).",
  endurance:
    "+4 auf Würfe gegen Erschöpfung: Swim gegen nichttödlichen Schaden, KO-Würfe beim Rennen und Gewaltmarsch, Hunger, Durst, Hitze und Kälte, sowie gegen Ersticken. Du darfst außerdem in Rüstung schlafen, ohne müde zu werden.",
  toughness: "+3 Trefferpunkte. Das Talent lässt sich mehrfach nehmen.",
  "great-fortitude": "+2 auf alle Fortitude-Rettungswürfe.",
  "iron-will": "+2 auf alle Will-Rettungswürfe.",
  "lightning-reflexes": "+2 auf alle Reflex-Rettungswürfe.",
  "improved-initiative": "+4 auf Initiative.",
  run:
    "Du rennst mit fünffacher statt vierfacher Geschwindigkeit (in schwerer Rüstung vierfach statt dreifach) und behältst beim Rennen deinen GE-Bonus auf die RK. Beim Weitsprung mit Anlauf erhältst du +4 auf Jump.",
  "eyes-in-the-back-of-your-head":
    "Angreifer erhalten den üblichen Flankier-Bonus von +2 nicht gegen dich. Wirkt nicht, wenn du deinen GE-Bonus auf die RK ohnehin verlierst.",
  "fleet-of-foot":
    "Beim Rennen oder Ansturm darfst du eine einzige Richtungsänderung von bis zu 90 Grad machen. Nicht in mittelschwerer oder schwerer Rüstung und nicht bei mittlerer oder schwerer Last.",

  // --- Fernkampf ----------------------------------------------------------
  "point-blank-shot":
    "+1 auf Angriff und Schaden mit Fernwaffen gegen Ziele innerhalb von 30 Fuß.",
  "precise-shot":
    "Du kannst ohne den üblichen Malus von −4 in einen Nahkampf hineinschießen.",
  "improved-precise-shot":
    "Deckung und Sichtschutz des Ziels durch Kreaturen im Weg werden ignoriert (totale Deckung und totaler Sichtschutz weiterhin nicht), und beim Schuss in einen Ringkampf triffst du immer den gewünschten Gegner.",
  "rapid-shot":
    "Bei einer vollen Angriffsaktion mit einer Fernwaffe erhältst du einen zusätzlichen Angriff, dafür alle Fernangriffe in dieser Runde mit −2.",
  "manyshot":
    "Als Standard-Aktion schießt du zwei oder mehr Pfeile gleichzeitig auf ein Ziel in bis zu 30 Fuß. Die Zahl steigt mit dem Grundangriffsbonus; alle Pfeile nutzen einen Angriffswurf mit steigendem Malus.",
  "far-shot":
    "Bei Schusswaffen steigt der Entfernungsschritt um die Hälfte, bei Wurfwaffen verdoppelt er sich.",
  "shot-on-the-run":
    "Bei einer vollen Aktion darfst du dich bewegen, einen Fernangriff führen und weiterlaufen.",
  "mounted-archery":
    "Der Malus für Fernangriffe vom Reittier halbiert sich: −2 statt −4 im Schritt, −4 statt −8 in schnellerer Gangart.",

  // --- Reiten -------------------------------------------------------------
  "mounted-combat":
    "Einmal pro Runde darfst du bei einem Treffer gegen dein Reittier einen Ride-Wurf gegen die Angriffs-SG versuchen; gelingt er, geht der Angriff daneben.",
  "ride-by-attack":
    "Bei einem Ansturm zu Pferd darfst du nach dem Angriff weiterreiten. Insgesamt bis zum Doppelten der Reittier-Geschwindigkeit, und der Angegriffene erhält keinen Gelegenheitsangriff.",
  "spirited-charge":
    "Bei einem Ansturm zu Pferd verdoppelst du den Schaden (mit einer Lanze verdreifachst du ihn).",
  trample:
    "Beim Überrennen zu Pferd darf der Gegner nicht ausweichen, und dein Reittier fügt ihm bei gelungenem Angriff Hufschaden zu.",

  // --- Zauber-Handwerk (nicht Metamagie) ----------------------------------
  "combat-casting":
    "+4 auf Concentration-Würfe, um in der Defensive, im Ringkampf oder festgehalten zu zaubern.",
  "spell-penetration":
    "+2 auf Zauberstufen-Würfe, um Zauberresistenz zu überwinden.",
  "greater-spell-penetration": "Weitere +2 auf Würfe gegen Zauberresistenz (kumulativ mit Spell Penetration).",
  "spell-focus":
    "Wähle eine Zauberschule. Der Rettungswurf-SG deiner Zauber dieser Schule steigt um 1. Das Talent gilt je Schule einmal.",
  "greater-spell-focus":
    "Weitere +1 auf den SG einer bereits fokussierten Zauberschule (kumulativ mit Spell Focus).",
  "spell-mastery":
    "Wähle eine Anzahl Zauber gleich deinem IN-Bonus. Diese Zauber kannst du als Magier auch ohne Zauberbuch vorbereiten.",
  "eschew-materials":
    "Zauber mit materiellen Komponenten von höchstens 1 GM Wert kannst du ohne diese Komponente wirken.",
  "augment-summoning":
    "Kreaturen, die du mit einem summon-Zauber herbeirufst, erhalten für die Dauer +4 Erweiterungsbonus auf Stärke und Konstitution.",
  "natural-spell":
    "In Tiergestalt (Wild Shape) kannst du weiter zaubern: Verbale und gestische Komponenten sowie Materialkomponenten ersetzt du durch entsprechende Laute und Bewegungen.",
  "extra-turning":
    "Vier zusätzliche Versuche pro Tag, Untote zu vertreiben oder zu befehligen. Mehrfach nehmbar.",
  "extra-music": "Vier zusätzliche Einsätze der Bardenmusik pro Tag.",
  "divine-might":
    "Als freie Aktion opferst du einen Versuch, Untote zu vertreiben, und legst für eine ganze Runde deinen CH-Bonus auf deinen Waffenschaden.",
  "divine-vengeance":
    "Du opferst einen Vertreiben-Versuch und fügst deinen gelungenen Nahkampfangriffen gegen Untote bis zum Ende deiner nächsten Aktion je 2W6 heilige Energie zu.",

  // --- Metamagie ----------------------------------------------------------
  "empower-spell":
    "Alle veränderlichen Zahlenwerte des Zaubers steigen um die Hälfte. Rettungswürfe und vergleichende Würfe nicht. Braucht einen Zauberplatz zwei Grade höher.",
  "maximize-spell":
    "Alle veränderlichen Zahlenwerte werden zum Höchstwert. Braucht einen Zauberplatz drei Grade höher.",
  "extend-spell":
    "Die Wirkungsdauer verdoppelt sich. Wirkt nicht bei Konzentration, sofortiger oder dauerhafter Wirkung. Braucht einen Zauberplatz einen Grad höher.",
  "enlarge-spell":
    "Die Reichweite eines Zaubers mit Reichweite kurz, mittel oder weit verdoppelt sich. Braucht einen Zauberplatz einen Grad höher.",
  "widen-spell":
    "Ein Flächenzauber wirkt auf die doppelte Fläche in jeder Richtung. Braucht einen Zauberplatz drei Grade höher.",
  "heighten-spell":
    "Der Zauber gilt als von höherem Grad — Rettungswurf-SG und alles vom Grad Abhängige steigen mit. Braucht den Zauberplatz des gewählten höheren Grades.",
  "quicken-spell":
    "Der Zauber kostet nur eine schnelle Aktion; höchstens ein beschleunigter Zauber pro Runde. Braucht einen Zauberplatz vier Grade höher.",
  "silent-spell":
    "Der Zauber braucht keine verbale Komponente. Braucht einen Zauberplatz einen Grad höher.",
  "still-spell":
    "Der Zauber braucht keine gestische Komponente. Braucht einen Zauberplatz einen Grad höher.",
  "energy-substitution":
    "Wähle eine Energieart (Säure, Kälte, Elektrizität, Feuer, Schall). Zauber mit einem dieser Deskriptoren kannst du auf deine gewählte Art umstellen, ohne den Zaubergrad zu erhöhen.",
  "disguise-spell":
    "Du verbirgst das Zaubern in Musik oder Auftritt, sodass andere es kaum bemerken. Braucht einen Zauberplatz einen Grad höher.",

  // --- Gegenstände herstellen --------------------------------------------
  "brew-potion":
    "Du kannst Tränke aus Zaubern bis Grad 3 herstellen, die auf Kreaturen wirken. Ein Trank braucht einen Tag, kostet die Hälfte des Grundpreises an Material und 1/25 an EP.",
  "scribe-scroll":
    "Du kannst Schriftrollen jedes Zaubers herstellen, den du kennst. Ein Tag je 1.000 GM Grundpreis, Material die Hälfte, EP 1/25.",
  "craft-wand":
    "Du kannst Zauberstäbe (Wands) aus Zaubern bis Grad 4 herstellen. Grundpreis = Zauberstufe × Zaubergrad × 750 GM.",
  "craft-rod": "Du kannst Ruten herstellen, deren Voraussetzungen du erfüllst.",
  "craft-staff": "Du kannst Stäbe (Staffs) herstellen, deren Voraussetzungen du erfüllst.",
  "craft-magic-arms-and-armor":
    "Du kannst magische Waffen, Rüstungen und Schilde herstellen und aufwerten. Ein Tag je 1.000 GM des magischen Anteils.",
  "craft-wondrous-item":
    "Du kannst wundersame Gegenstände herstellen, deren Voraussetzungen du erfüllst.",
  "craft-construct":
    "Du kannst Konstrukte erschaffen, deren Voraussetzungen du erfüllst.",
  "forge-ring": "Du kannst magische Ringe herstellen, deren Voraussetzungen du erfüllst.",

  // --- Sonstiges Allgemeine ----------------------------------------------
  leadership:
    "Du gewinnst einen Gefolgsmann (Cohort) und eine Zahl einfacher Anhänger. Wie viele und wie mächtig, richtet sich nach deiner Führungswertung aus Stufe, Ruf und Verhalten.",
  "skill-focus":
    "Wähle eine Fertigkeit: +3 auf alle Würfe damit. Das Talent gilt je Fertigkeit einmal.",
  "ability-focus":
    "Wähle einen besonderen Angriff der Kreatur: der Rettungswurf-SG dagegen steigt um 2.",
  "empower-spell-like-ability":
    "Wähle eine zauberähnliche Fähigkeit der Kreatur: sie kann diese dreimal täglich verstärkt einsetzen (wie Empower Spell).",
  "quicken-spell-like-ability":
    "Wähle eine zauberähnliche Fähigkeit der Kreatur: sie kann diese dreimal täglich als schnelle Aktion einsetzen.",
  "awesome-blow":
    "Mit einer Standard-Aktion und −4 auf den Angriffswurf: triffst du einen körperlichen Gegner, der kleiner ist als du, wird er bei misslungenem Reflex-Rettungswurf 10 Fuß weit geschleudert und liegt danach am Boden.",
  "flyby-attack":
    "Die Kreatur darf im Flug ihre Bewegung unterbrechen, eine Standard-Aktion ausführen und weiterfliegen.",
  "multiattack":
    "Die Sekundärangriffe der Kreatur erhalten nur −2 statt −5.",
  "improved-multiattack":
    "Die Sekundärangriffe der Kreatur erhalten überhaupt keinen Malus mehr.",
  "multiweapon-fighting":
    "Für Kreaturen mit mehr als zwei Armen: der Malus für das Kämpfen mit mehreren Waffen sinkt auf −2 für den Haupt- und −6 für jeden weiteren Angriff.",
  "blindsight-5-ft-radius":
    "Über Gehör und Erschütterungen erkennst du die Position von Gegnern bis 5 Fuß Entfernung. Unsichtbarkeit und Dunkelheit spielen dabei keine Rolle.",
  "cloak-dance":
    "Mit einer Bewegungsaktion verschleierst du deine Position und hast bis zu deiner nächsten Runde Sichtschutz. Mit einer vollen Aktion wirst du vollständig verborgen.",

  // --- Waffen-Spezialisierung (die Kämpfer-Kette) ------------------------
  "weapon-focus":
    "Wähle eine Waffenart (auch unbewaffneter Angriff, Ringkampf oder — als Zauberwirker — Strahl). Mit dieser Waffe erhältst du +1 auf alle Angriffswürfe. Das Talent gilt je Waffenart einmal.",
  "greater-weapon-focus":
    "Weitere +1 auf Angriffswürfe mit einer Waffe, für die du schon Weapon Focus hast (zusammen also +2).",
  "weapon-specialization":
    "Wähle eine Waffe, für die du Weapon Focus hast: +2 auf alle Schadenswürfe mit dieser Waffe. Braucht Kämpfer-Stufe 4.",
  "greater-weapon-specialization":
    "Weitere +2 auf Schadenswürfe mit einer Waffe, für die du schon Weapon Specialization hast (zusammen also +4). Braucht Kämpfer-Stufe 12.",
  "improved-critical":
    "Wähle eine Waffenart: ihr Bedrohungsbereich verdoppelt sich (aus 20 wird 19–20, aus 19–20 wird 17–20). Kumuliert NICHT mit Wirkungen wie einer keen-Waffe.",
  "power-critical":
    "Mit der gewählten Waffe erhältst du +4 auf den Wurf, einen kritischen Treffer zu bestätigen.",
  "weapon-finesse":
    "Mit einer leichten Waffe, einem Rapier, einer Peitsche oder einer Stachelkette darfst du deinen GE- statt deinen ST-Modifikator auf Angriffswürfe nehmen.",

  // --- Zwei Waffen -------------------------------------------------------
  "two-weapon-fighting":
    "Du kämpfst mit einer Waffe in jeder Hand und erhältst einen Zusatzangriff mit der zweiten. Die Mali sinken auf −2/−2 (mit leichter Zweitwaffe) statt −6/−10.",
  "improved-two-weapon-fighting":
    "Ein zweiter Angriff mit der Nebenhandwaffe, dieser mit −5.",
  "greater-two-weapon-fighting":
    "Ein dritter Angriff mit der Nebenhandwaffe, dieser mit −10.",
  "two-weapon-defense":
    "Mit zwei Waffen oder einer Doppelwaffe erhältst du +1 Schildbonus auf die RK; beim defensiven Kampf oder in totaler Verteidigung +2.",
  "improved-shield-bash":
    "Beim Schildstoß behältst du den Schildbonus auf deine RK.",

  // --- Weitere Kampf-Talente --------------------------------------------
  "quick-draw":
    "Waffe ziehen kostet nur eine freie Aktion statt einer Bewegungsaktion; eine versteckte Waffe eine Bewegungsaktion. Wurfwaffen darfst du mit voller Angriffsrate werfen.",
  "whirlwind-attack":
    "Bei einer vollen Angriffsaktion verzichtest du auf deine normalen Angriffe und führst statt dessen je einen Nahkampfangriff mit vollem Grundangriffsbonus gegen jeden Gegner in Reichweite.",
  "stunning-fist":
    "Vor dem Angriffswurf angekündigt: ein von deinem unbewaffneten Angriff getroffener Gegner muss einen Fortitude-Rettungswurf (SG 10 + halbe Stufe + WE-Bonus) bestehen, sonst ist er eine Runde betäubt. Einsätze pro Tag begrenzt.",
  "knock-down":
    "Fügst du im Nahkampf 10 oder mehr Schaden zu, folgt als freie Aktion ein Umwerf-Versuch gegen dasselbe Ziel.",
  "hold-the-line":
    "Gegen einen anstürmenden Gegner, der ein von dir bedrohtes Feld betritt, erhältst du einen Gelegenheitsangriff — unmittelbar bevor sein Ansturm-Angriff abgehandelt wird.",
  "stand-still":
    "Statt eines Gelegenheitsangriffs auf einen sich entfernenden Gegner darfst du ihn festnageln: gelingt dir der Schadenswurf gegen seinen Reflex-Rettungswurf, endet seine Bewegung.",
  "sidestep-charge":
    "+4 Ausweich-Bonus auf die RK gegen Ansturm-Angriffe. Verfehlt dich ein anstürmender Gegner, erhältst du sofort einen Gelegenheitsangriff gegen ihn.",
  "reckless-offense":
    "Bei einer Angriffs- oder vollen Angriffsaktion im Nahkampf darfst du −4 auf die RK nehmen und dafür +2 auf die Angriffswürfe legen.",
  "superior-expertise":
    "Bei Combat Expertise darf die Verschiebung bis zu deinem vollen Grundangriffsbonus gehen, nicht nur bis −5.",
  "sharp-shooting":
    "Deckung gibt deinen Zielen nur noch +2 auf die RK statt +4. Gegen totale Deckung hilft es nicht.",
  "rapid-reload":
    "Wähle eine Armbrust-Art: Nachladen kostet nur noch eine freie Aktion (Hand- und leichte Armbrust) bzw. eine Bewegungsaktion (schwere Armbrust).",
  "greater-manyshot":
    "Bei Manyshot darfst du die Pfeile auf verschiedene Ziele verteilen statt alle auf eines.",
  "improved-turning":
    "Du vertreibst oder befehligst Untote, als wärst du in der entsprechenden Klasse eine Stufe höher.",
  track:
    "Du kannst mit einem Survival-Wurf Spuren finden und verfolgen. Ohne dieses Talent lassen sich Spuren nur mit Search finden, und nur Feld für Feld.",
  "jack-of-all-trades":
    "Du darfst jede Fertigkeit ungeübt einsetzen, auch solche, die normalerweise Ausbildung verlangen.",
  "open-minded":
    "Du erhältst sofort 5 zusätzliche Fertigkeitspunkte, frei verteilbar nach den üblichen Regeln.",
  "improved-counterspell":
    "Beim Gegenzaubern genügt ein Zauber derselben Schule, der mindestens einen Grad höher ist als der Zielzauber.",
  "improved-familiar":
    "Du darfst deinen Vertrauten aus einer erweiterten Liste wählen (etwa Quasit, Imp oder Pseudodrache), sobald du überhaupt einen neuen Vertrauten erhalten könntest.",
  "improved-natural-armor": "Der natürliche Rüstungsbonus der Kreatur steigt um 1.",
  "improved-natural-attack":
    "Wähle eine natürliche Angriffsform: ihr Schadenswürfel steigt eine Stufe, als wäre die Kreatur eine Größenkategorie größer.",
  hover:
    "Die fliegende Kreatur kann mit einer Bewegungsaktion auf der Stelle schweben und danach mit halber Geschwindigkeit in jede Richtung fliegen, auch senkrecht.",
  wingover:
    "Die fliegende Kreatur darf einmal pro Runde als freie Aktion um bis zu 180 Grad wenden, unabhängig von ihrer Manövrierfähigkeit.",
  "improved-flyby-attack":
    "Ist die Standard-Aktion beim Flyby Attack ein Nahkampfangriff, löst das Verlassen der bedrohten Felder des Ziels keinen Gelegenheitsangriff aus.",
  snatch:
    "Trifft die Kreatur mit Klaue oder Biss, darf sie damit einen Ringkampf beginnen, als hätte sie „improved grab“.",
  "improved-multiweapon-fighting":
    "Für Kreaturen mit mehreren Armen: ein zweiter Angriff mit jeder zusätzlichen Waffe, dieser mit −5.",
  "greater-multiweapon-fighting":
    "Bis zu drei zusätzliche Angriffe mit jeder weiteren Waffe, der dritte jeweils mit −10.",
  "plant-defiance":
    "Du kannst Pflanzenkreaturen vertreiben wie ein guter Kleriker Untote (aber nicht vernichten).",
  "plant-control":
    "Du kannst Pflanzenkreaturen befehligen wie ein böser Kleriker Untote.",

  // --- Metamagie (Rest) --------------------------------------------------
  "persistent-spell":
    "Ein beharrlicher Zauber wirkt 24 Stunden. Nur bei Reichweite „persönlich“ oder festen Reichweiten. Braucht einen Zauberplatz sechs Grade höher.",
  "repeat-spell":
    "Der Zauber wirkt zu Beginn deiner nächsten Runde automatisch ein zweites Mal, von derselben Stelle auf dieselbe Fläche. Braucht einen Zauberplatz drei Grade höher.",
  "reach-spell":
    "Ein Zauber mit Reichweite „Berührung“ wirkt auf bis zu 30 Fuß; er wird zum Strahl und braucht einen Fernkampf-Berührungsangriff. Braucht einen Zauberplatz zwei Grade höher.",
  "sacred-spell":
    "Die Hälfte des Schadens stammt direkt aus göttlicher Macht und lässt sich nicht durch Energieschutz mindern. Braucht einen Zauberplatz einen Grad höher.",
  "subdual-substitution":
    "Ein Zauber mit Säure-, Kälte-, Elektrizitäts-, Feuer- oder Schall-Deskriptor richtet stattdessen nichttödlichen Schaden an. Braucht einen Zauberplatz einen Grad höher.",

  // --- Psionik (aus dem SRD mitgeliefert) --------------------------------
  "wild-talent":
    "Du gilst als psionischer Charakter und erhältst einen kleinen Vorrat an Kraftpunkten.",
  "psionic-affinity": "+2 auf Psicraft und Use Psionic Device.",
  "force-of-will":
    "Einmal pro Runde darfst du gegen eine psionische Wirkung, die einen Reflex- oder Fortitude-Rettungswurf erlaubt, stattdessen einen Will-Rettungswurf machen.",
  "mental-resistance":
    "Gegen psionische Angriffe ohne Energieart hast du Schadensreduzierung 3/−, und Attributsschaden aus psionischer Quelle wird gemindert.",
  "mind-over-body":
    "Attributsschaden heilt schneller: pro Tag 1 + dein KO-Bonus an Attributspunkten.",
  "rapid-metabolism":
    "Du heilst pro Tag deine normale Rate zuzüglich des doppelten KO-Bonus — auch ohne zu ruhen.",
  "hostile-mind":
    "Wirkt jemand eine Telepathie-Kraft auf dich, erleidet er selbst Schaden.",
  "psionic-hole":
    "Ein Gegner, der dich im Nahkampf trifft, verliert sofort seinen psionischen Fokus.",
  "imprint-stone": "Du kannst Kraftsteine herstellen, die psionische Kräfte speichern.",
  "scribe-tattoo":
    "Du kannst psionische Tätowierungen herstellen, die Kräfte bis Grad 3 speichern.",
  autonomous: "+2 auf Autohypnosis und Knowledge (psionics).",
  "closed-mind": "+2 auf Rettungswürfe gegen psionische Kräfte.",
  "chaotic-mind":
    "Gegner verlieren gegen dich ihre Erkenntnis-Boni (Insight) auf Angriff, RK und Fertigkeitswürfe.",
  "antipsionic-magic":
    "+2 auf Zauberstufen-Würfe, um die Kraftresistenz psionischer Kreaturen zu überwinden.",
  "deadly-precision":
    "Bei den Zusatzwürfeln eines hinterhältigen Angriffs darfst du jede gewürfelte 1 einmal neu würfeln.",
  "craft-dorje": "Du kannst Dorjes herstellen — Kristallstäbe, die psionische Kräfte mit Ladungen entfalten.",
  "craft-psicrown": "Du kannst Psikronen mit mehreren psionischen Wirkungen herstellen.",
  "craft-psionic-arms-and-armor": "Du kannst psionische Waffen, Rüstungen und Schilde herstellen.",
  "craft-psionic-construct": "Du kannst psionische Konstrukte erschaffen.",
  "craft-cognizance-crystal": "Du kannst Erkenntniskristalle herstellen, die Kraftpunkte speichern.",
  "craft-universal-item": "Du kannst universelle psionische Gegenstände herstellen.",
};
