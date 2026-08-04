# Kompletter Check

Sieben Prüfer haben Engine, Datenmodell, Oberfläche, Abgleich und Handy-Bedienung
durchgesehen, jeder Fund wurde von zwei weiteren Prüfern gegengeprüft und die
wichtigsten habe ich anschließend selbst im Code nachgelesen und nachgerechnet —
unterm Strich bleiben **39 Punkte**: 14 falsche Zahlen und echte Fehler, 9 Stellen,
an denen Daten verloren gehen können, 6 Handy-Themen, 2 Geschwindigkeitssachen und
8 Vorschläge.

---

## Falsche Zahlen und echte Fehler

### 1. Der Kleriker hat auf jedem Zaubergrad einen Platz zu wenig — und kann ihn nicht nachtragen

**Was falsch ist:** Die Klerikertabelle im SRD lautet ab Grad 1 „1+1", „2+1",
„2+1 / 1+1" — das zweite +1 ist der Domänenzauber. In den mitgelieferten Daten steht
nur die erste Zahl, und die Engine hat für den Domänenplatz gar kein Fach.

**Wann es auffällt:** Bei deinem Fighter 3 / Cleric 4 mit WIS 16 steht im
Zauber-Reiter über Grad 1 „Slots 4/4" — richtig sind **5**. Bei Grad 2 steht „3/3"
statt **4**. Ein Kleriker 1 mit WIS 18 bekommt 2 Plätze angezeigt statt 3.
Schlimmer als die Zahl: der Knopf „Vorbereiten" ist beim fünften Grad-1-Zauber
ausgegraut und „Wirken" lässt sich nicht mehr abstreichen — du kannst deinen
Domänenzauber also überhaupt nicht eintragen. Es gibt auch keinen Umweg: für
Zauberplätze existiert keine Möglichkeit, von Hand einen Wert vorzugeben.
Der Stufenaufstiegs-Assistent zeigt es ebenfalls zu niedrig an.

**Zu tun:** Die Zauberplatz-Angabe braucht ein drittes Fach neben „Grundwert" und
„Attributsbonus" — einen eigenen Domänenplatz. Den setzt man am besten als Merkmal
an der Klasse („diese Klasse hat Domänenplätze") und nicht als Zahl in jede
Tabellenzeile, sonst steht dieselbe Information wieder an zwei Orten. Die Sperren im
Zauber-Reiter richten sich danach automatisch. Getrennt gehalten werden muss er,
weil er nur mit einem Zauber der gewählten Domänen belegt werden darf — und welche
zwei Domänen du gewählt hast, speichert die App bisher nirgends.
(`packages/core/src/engine/derive.ts:694`, `packages/core/src/engine/types.ts:79`,
`packs/srd/classes-1.json`, `apps/web/src/pages/sheet/SpellsTab.tsx:82`)

---

### 2. Schleuder und Wurfspeer richten zu wenig Schaden an — und der Würfelknopf würfelt es auch so

**Was falsch ist:** Die Engine unterscheidet nur „Nahkampf" und „Fernkampf" und gibt
auf alles im Fernkampf null Stärkeschaden. Das SRD gibt den Stärkebonus aber auf
jede geworfene Waffe und ausdrücklich auf die Schleuder („Your Strength modifier
applies to damage rolls when you use a sling, just as it does for thrown weapons" —
dieser Satz steht wörtlich in der Beschreibung des Eintrags in deinem eigenen Repo).

**Wann es auffällt:** Kleriker mit STR 18 und Schleuder — die einzige Fernkampfwaffe,
die ein Kleriker überhaupt führen darf. Im Kampf-Reiter steht „Schaden **1d4**",
richtig ist **1d4+4**. Beim Wurfspeer „1d6" statt **1d6+4**. Das ist der Unterschied
zwischen durchschnittlich 2,5 und 6,5 Schaden, also mehr als das Doppelte. Und der
Würfelknopf daneben würfelt buchstäblich `1d4` — du sagst dem Spielleiter jede Runde
eine um 4 zu niedrige Zahl. Die Hinweiszeile unter der Waffe nennt die Ausnahme sogar
(„außer Wurfwaffen/Kompositbögen"), wendet sie aber nicht an.

**Betroffen sind genau fünf Einträge:** Wurfspeer (javelin), Schleuder, Wurfpfeil
(dart), Shuriken und Bolas. Speer, Kurzspeer und Wurfbeil sind *nicht* betroffen —
die zählen in den Daten als Nahkampfwaffen und bekommen ihren Stärkebonus schon
heute. Kompositbögen sind ein eigener, milderer Fall (dort gilt der Bonus bis zur
Stärkeklasse des Bogens).

**Zu tun:** Die Waffendaten brauchen ein eigenes Merkmal „geworfen". Aus den
vorhandenen Angaben lässt sich das nicht ableiten, weil Bögen und Armbrüste dieselbe
Reichweitenangabe tragen. Mit diesem Merkmal wird auch die Gegenrichtung sauber: ein
geworfener Dolch müsste für den *Angriffswurf* Geschicklichkeit nehmen, tut es heute
aber nicht. (`packages/core/src/engine/derive.ts:483` und `:537`,
`packages/core/src/schema/entities.ts:260`, `tools/etl/src/convert/items.ts:16`)

---

### 3. Bewegung: der Zwerg wird zu langsam, der Überladene zu schnell

Zwei Fehler in derselben Rechnung, deshalb ein Punkt.

**Was falsch ist (a):** Bei mittlerer oder schwerer Rüstung und bei mittlerer oder
schwerer Last wird die Bewegung pauschal auf zwei Drittel gekürzt — ohne Ausnahme.
Zwerge sind laut SRD von **beidem** ausdrücklich ausgenommen. Der Text steht sogar in
deinen Daten drin, aber nur als Beschreibung ohne Wirkung, und die Engine hätte auch
keinen Schalter, an dem er hängen könnte.

**Wann es auffällt:** Zwerg mit Vollplatte oder Kettenhemd: die Kachel „Bewegung" im
Kampf-Reiter zeigt **15 ft**, richtig sind **20 ft**, und die aufgeklappte
Erklärung nennt einen Grund, den es nicht gibt („Mittlere/schwere Rüstung −5").
Dasselbe ohne Rüstung mit 100 lb im Rucksack. Zwei Taps weiter listet die App unter
den Volksmerkmalen wörtlich den Satz, dass genau das nicht passieren darf, und die
Volks-Info oben zeigt „20 ft". Die Vergleichsseite Original ↔ Entwurf erfindet
daraus zusätzlich eine Änderung „20 → 15", sobald ein Entwurf Rüstung anlegt.

**Was falsch ist (b):** Die Kürzung fragt nur „mittlere Last" und „schwere Last" ab,
nicht „überladen". Weiter oben in derselben Datei wird „überladen" für die
Geschicklichkeitsgrenze und den Rüstungsmalus korrekt wie „schwer" behandelt — bei
der Bewegung fällt der Fall durchs Raster.

**Wann es auffällt:** Mensch, STR 10, keine Rüstung. Mit 100 lb zeigt der Bogen
**20 ft**. Mit **101 lb** zeigt er **30 ft** — ein Pfund mehr macht dich zehn Fuß
schneller, direkt neben der roten Warnung „Überladen". Nach den Regeln kommt man
über der schweren Last nur noch 5 Fuß je Runde. Auf demselben Bildschirm widerspricht
sich die App: die Rüstungsklasse bleibt bei 11, weil die Last dort korrekt die
Geschicklichkeit auf 1 klemmt („DEX-Modifikator (max. DEX 1)"). Der Bogen sagt also
gleichzeitig „die Last klemmt deine Geschicklichkeit" und „du läufst voll schnell".
Nach dem Fight-Club-Import ist genau das der unmaskierte Fall, weil der Import keine
Rüstung als Gegenstand mitbringt.

**Zu tun:** Für den Zwerg einen echten Schalter im Effekt-Vokabular ergänzen (etwa
„Bewegung ignoriert Rüstung und Last"), ihn im Volksmerkmal „Speed" setzen und in der
Bewegungsrechnung abfragen — nicht auf die Volks-Kennung prüfen, sonst bleiben
selbstgebaute Zwerge und die Zwergen-Platzhalter aus dem Import außen vor. Für den
zweiten Fall „überladen" in dieselbe Liste aufnehmen wie oben bei der
Geschicklichkeitsgrenze und die Beschriftung in der Erklärung von
„Mittlere/schwere Last" auf „Überladen" umstellen. **Achtung:** drei bestehende Tests
erwarten heute die falschen 15 ft für einen Zwerg — die müssen auf ein Volk ohne diese
Ausnahme umgestellt werden. (`packages/core/src/engine/derive.ts:361-380`,
`packs/srd/races.json`, `tools/etl/src/manual/races.ts:90`,
`packages/core/src/engine/engine.test.ts:1049/1059/1068`)

---

### 4. Weapon Finesse wirkt beim Rapier nicht — der klassische Fechter bekommt seinen Bonus nie

**Was falsch ist:** Geschicklichkeit statt Stärke gilt nur, wenn die Waffe als
„leicht" eingetragen ist. Der Talenttext nennt ausdrücklich mehr: „with a light
weapon, **rapier, whip, or spiked chain** …". In den Daten ist der Rapier
„einhändig", die Peitsche „einhändig", die Stachelkette „zweihändig" — bei allen drei
steht der Hinweis auf Weapon Finesse sogar wörtlich in der Beschreibung.

**Wann es auffällt:** Schurke 2, STR 8 (−1), DEX 18 (+4), Talent Weapon Finesse,
Rapier in der Haupthand. Die Angriffszeile zeigt **+0**, richtig ist **+5**. Beim
Antippen nennt die Erklärung sogar die falsche Quelle: „STR-Modifikator −1". Der
Würfelknopf derselben Zeile würfelt `1d20+0` statt `1d20+5`. Der Dolch direkt daneben
zeigt korrekt +5 — der Widerspruch steht auf demselben Bildschirm. Es gibt keine
Warnung.

**Zu tun:** Ein eigenes Merkmal „finessefähig" in die Waffendaten, in der
Aufbereitung für Rapier, Peitsche und Stachelkette gesetzt (Standard: alles Leichte).
Bitte nicht als Namensliste im Code — sonst greift es nicht für Finesse-Waffen aus
deinen privaten Büchern. Und beim Lesen nicht auf den Standardwert vertrauen, sondern
ausdrücklich „falls nicht gesetzt: leicht = ja" schreiben, weil ältere Einträge in der
Gerätedatenbank das neue Merkmal nicht kennen. Der Test, der heute nur Dolch gegen
Langschwert prüft, braucht eine Rapier-Zeile.
(`packages/core/src/engine/derive.ts:444-445`,
`packages/core/src/schema/entities.ts:268`)

---

### 5. Die zweite Hand richtet zu viel Schaden an

**Was falsch ist:** Für den Schadensbonus kennt die Engine nur drei Fälle: Fernkampf
(kein Bonus), zweihändig geführt (Bonus ×1,5), sonst voller Bonus. Eine Waffe im Platz
„Schildhand" verlangt laut SRD nur die **halbe** Stärke, abgerundet.

**Wann es auffällt:** Kämpfer mit STR 18 (+4), Langschwert in der Haupthand,
Kurzschwert in der Schildhand. Die Zeile „Sword, short" zeigt **1d6+4**, richtig ist
**1d6+2**. Der Würfelknopf würfelt entsprechend zu hoch: durchschnittlich 7,5 statt
5,5 Schaden, rund ein Drittel zu viel, bei jedem Treffer einer vollen Attacke. Kein
Hinweis, keine Warnung. Zwei Waffen in den Händen ist der vorgesehene Fall — die
Hände-Karte bietet die Schildhand ausdrücklich zur Auswahl an.

**Zu tun:** Beim Platz „Schildhand" halbieren, mit zwei Feinheiten, sonst entsteht
derselbe Fehlertyp neu: (a) halbiert wird nur ein **Bonus** — ein Stärke-*Malus* zählt
voll („Penalties are not halved"), aus STR 6 (−2) darf also nicht −1 werden; (b)
halbiert wird nur, wenn die Haupthand wirklich eine Waffe hält — liegt die einzige
Waffe in der Schildhand, ist sie die Primärwaffe und bekommt volle Stärke. Die
Erklärungszeile sollte „STR-Modifikator (½ zweite Hand)" heißen, damit sichtbar ist,
warum aus +4 ein +2 wird. Das ist **nicht** der zurückgestellte Punkt: zurückgestellt
sind die Zweiwaffen-Mali −6/−10 auf den *Angriffswurf*, hier geht es um den Schaden.
(`packages/core/src/engine/derive.ts:483`)

---

### 6. Eigene Modifikatoren am Talent Dodge verschwinden lautlos

**Was falsch ist:** Damit „Talent: Dodge" nicht zweimal in der
Rüstungsklassen-Erklärung steht, wird jeder Rüstungsklassen-Effekt übersprungen,
dessen Kennung mit `srd:feat:dodge` beginnt. Gemeint war nur der eine Effekt aus dem
Kompendium. Deine selbst eingetragenen Modifikatoren am Talent bekommen aber
Kennungen derselben Form (`srd:feat:dodge#x.0.0`) und fliegen mit heraus.

**Wann es auffällt:** Fighter 4 / Cleric 3, DEX 14, Kettenhemd und schwerer Stahlschild,
Dodge-Schalter an. Ohne eigenen Modifikator: RK 19. Mit „RK: Ausweichen +1" am Talent
Dodge: weiter **19**, richtig wäre **20**. Mit „RK: natürliche Rüstung +2" am Talent
Dodge: **19** statt **21** (und „auf dem falschen Fuß" 16 statt 18). Derselbe
Modifikator am Talent Mobility eingetragen: **20** bzw. **21**, Zeile sichtbar. Es
verschwindet nicht nur die Zeile, sondern auch der Wert aus der Summe — und damit
auch aus Berührungs-RK und „auf dem falschen Fuß". Keine Meldung.

Besonders verwirrend: ein Modifikator mit anderem Ziel am *selben* Talent kommt an
(„Initiative +2" am Talent Dodge wirkt und ist sichtbar). Du kannst also nicht einmal
die Regel „an Dodge geht nichts" lernen — es geht alles außer Rüstungsklasse, und
Rüstungsklasse ist genau das, wofür man an Dodge etwas einträgt. Im Talente-Reiter
steht deine Zeile dauerhaft sichtbar da, im Kampf-Reiter fehlt sie. Betroffen ist
jede Bonusart, auch solche, die der Schalter unmöglich doppeln könnte.

**Zu tun:** Nicht auf den Kennungs-Anfang prüfen, sondern genau den einen
Kompendium-Effekt ausschließen — oder besser den Effekt schon beim Einsammeln
markieren („gehört dem Schalter") statt ihn später am Text zu erraten. Nebenwirkung
des heutigen Vergleichs in die andere Richtung: ein eigener Eintrag, der Dodge
überschreibt, behält seine eigene Kennung, wird also *nicht* gefiltert — dann ist die
doppelte Dodge-Zeile zurück. (`packages/core/src/engine/derive.ts:306`,
`packages/core/src/engine/effects.ts:81`)

---

### 7. Der Würfelknopf am Zähler würfelt zweimal — gespeichert wird die andere Zahl

**Was falsch ist:** Der Knopf würfelt die Formel erst selbst und ruft danach
zusätzlich den Würfel-Speicher auf, der komplett neu würfelt. Im Würfel-Fenster steht
das Ergebnis des zweiten Wurfs, in den Zähler geschrieben wird das des ersten.

**Wann es auffällt:** Zähler „Vertreiben-Schaden" mit Formel `2d6+5`, einmal 🎲
antippen. Das Würfel-Fenster zeigt groß z.B. **15** samt Einzelwürfeln — genau die
Zahl sagst du dem Spielleiter. Fenster schließen: am Zähler steht **11**. Bei `2d6+5`
stimmen die beiden in weniger als 15 % der Fälle überein, bei `1d6` in einem von
sechs. Der Zähler widerspricht damit dauerhaft der Würfel-Historie unter „Würfel" —
zwei Bildschirme derselben App behaupten zwei Ergebnisse für denselben Tap. Der
Kommentar im Code („Der letzte Wurf bleibt am Zähler sichtbar") beschreibt die
Absicht, nicht das Verhalten: sichtbar bleibt der verworfene Wurf.

**Zu tun:** Nur einen Wurf machen. Der Würfel-Speicher gibt den Eintrag samt Ergebnis
zurück, also dessen Summe in den Zähler schreiben und den eigenen Wurf streichen.
Gleiche Lücke aus der anderen Richtung: „🎲 Nochmal würfeln" im Würfel-Fenster
aktualisiert den Zähler nie. (`apps/web/src/pages/sheet/Trackers.tsx:94-100`,
`apps/web/src/ui/DiceSheet.tsx:27`)

---

### 8. Einen Zauber aus dem Zauberbuch nehmen blockiert dauerhaft einen Platz

**Was falsch ist:** Der rote Knopf entfernt den Zauber nur aus der Liste der
bekannten Zauber. Ein bereits vorbereiteter Eintrag desselben Zaubers bleibt stehen —
unsichtbar, weil die Liste nur noch Zauber zeigt, die im Buch stehen. Gezählt wird er
weiter.

**Wann es auffällt:** Magier 7, Grad 3, drei Plätze, drei vorbereitet. Ein Tap auf
„Aus dem Zauberbuch nehmen": die Liste zeigt jetzt **2** vorbereitete Grad-3-Zauber,
der Kopf zeigt weiter „Slots **3/3**", und „Vorbereiten" ist bei jedem anderen
Grad-3-Zauber ausgegraut. Der Platz ist weg und lässt sich von diesem Bildschirm nicht
zurückholen — „Vorbereitung lösen" gibt es nur an einer Zeile, die es nicht mehr gibt.
Auch die Rast räumt ihn nicht auf. Der einzige Weg zurück: Zauber wieder ins Buch
aufnehmen, dann die Vorbereitung lösen.

Dazu kommt: dieser Knopf ist die einzige zerstörende Aktion des Bogens **ohne**
Rückfrage, ohne Rückgängig-Meldung und ohne Bearbeiten-Modus. Ausrüstung und Talente
haben alle drei. Ein Tap, sofort gespeichert und über den Abgleich auch auf dem iPad.

**Zu tun:** Beim Entfernen aus dem Buch die vorbereiteten Einträge desselben Zaubers
mitentfernen, und den Knopf hinter dieselbe Bestätigung stellen wie bei Ausrüstung und
Talenten. (`apps/web/src/pages/sheet/SpellsTab.tsx:282-288`)

---

### 9. Halbe Fertigkeitsränge auf dem Bogen — und der Würfelknopf der Zeile ist tot

**Was falsch ist:** Assistent und Stufenaufstieg wurden auf 3.5 umgestellt (ganze
Ränge, klassenfremd 2 Punkte je Rang — mit ausdrücklichem Kommentar „keine halben
Ränge, das war 3.0"). Die Plus/Minus-Knöpfe im Fertigkeits-Reiter des Bogens nicht:
dort ist die Schrittweite bei klassenfremden Fertigkeiten weiter **0,5**. Der
Umstellungs-Commit hat diese Datei nicht angefasst.

**Wann es auffällt:** Bearbeiten-Schalter an, bei „Spot" (für Kämpfer und Kleriker
klassenfremd, WIS 14) einmal `+` tippen. Gespeichert wird 0,5. Die Zeile zeigt
**„+2.5  Spot (0.5)"** — einen Wert, den 3.5 nicht kennt. Der eigentliche Schaden:
der Würfelknopf dieser Zeile baut den Ausdruck `1d20+2.5`, und der Würfelparser kennt
keine Kommazahlen. Der Fehlschlag wird ohne Rückmeldung verworfen — das Würfel-Fenster
öffnet einfach nicht. Bei allen anderen Zeilen funktioniert der Knopf. Das merkt man
am Tisch sofort, kann es aber nicht mit dem Rang in Verbindung bringen. Weitere Folgen:
bei 4,5 Rängen fällt der Synergie-Bonus still aus (geprüft wird „unter 5"), bei 5,5
warnt die App „5.5 Ränge übersteigen das Maximum von 5".

**Zu tun:** Im Fertigkeits-Reiter dieselbe Schrittweite und dieselben Hilfsfunktionen
wie im Stufenaufstieg (Schrittweite 1). Das Schema sollte man **nicht** auf ganze
Zahlen festnageln: der Fight-Club-Import übernimmt bewusst gebrochene Ränge aus
Fremddateien, und „warnen statt sperren" gilt. Wenn überhaupt, eine Warnung „halbe
Ränge (3.0)" in der Prüfung. (`apps/web/src/pages/sheet/tabs-core.tsx:451` und `:463`,
`packages/core/src/dice/dice.ts:18`, `apps/web/src/lib/diceStore.ts:28`)

---

### 10. Nach dem Fight-Club-Import wachsen die Trefferpunkte beim Stufenaufstieg nicht mehr

**Was falsch ist:** Der Import schreibt das Maximum aus der Datei als festes Maximum
in den Charakter. Das ist richtig gemeint und dokumentiert — der Fight-Club-Export
enthält keine Würfe je Stufe, ohne dieses feste Maximum würde aus deinen 62 TP beim
Import stillschweigend 43. Aber das feste Maximum gewinnt danach **immer**, und der
Stufenaufstiegs-Assistent sagt kein Wort dazu.

**Wann es auffällt:** Testfall aus dem Repo (36/62, Human Fighter 3/Cleric 4). Eine
Kämpferstufe mit Wurf 10 ergänzen: in der Zusammenfassung steht „Trefferpunkte:
**62 → 62**", die Warnliste darunter bleibt leer. Auf dem Bogen steht weiter
„TP 36/62", richtig wären mit KO +1 und Wurf 10 **73**. Am Tisch heißt das: du giltst
11 Trefferpunkte zu früh als sterbend. Der von der App selbst angebotene Ausweg führt
in eine zweite falsche Zahl — im TP-Fenster steht „nach Stufen & KO wären es **54** —
darauf zurücksetzen", weil die importierten Stufen nur Platzhalter-Würfe tragen. Wer
tippt, fällt von 62 auf 54, die aktuellen TP von 36 auf 28: nach einem Aufstieg
*sinken* die TP. Auf 73 kommt man nur durch freihändiges Eintippen.

**Zu tun:** Im Stufenaufstieg dieselbe Warnung zeigen, die die Vergleichsseite schon
hat, plus einen Knopf, der den neuen Wurf auf das feste Maximum addiert („+11
aufschlagen") statt nur „auf 54 zurücksetzen" anzubieten. Sauberer wäre, den
Unterschied beim Import gar nicht als festes Maximum abzulegen, sondern als sichtbaren
Aufschlag auf das Maximum — wie es bei Rüstungsklasse und Rettungswürfen schon
gemacht wird. Dann wächst es mit den Stufen weiter und der Importwert bleibt exakt.
(`packages/core/src/import/fightclub.ts:850`,
`packages/core/src/engine/derive.ts:413`, `apps/web/src/pages/LevelUp.tsx:486`,
`apps/web/src/ui/HpPad.tsx:149`)

---

### 11. Ränge auf einer Fertigkeit, die es nicht mehr gibt: unsichtbar, aber weiter bezahlt

**Was falsch ist:** Fehlende Verweise werden für Volk, Klasse, Talent, Gegenstand und
Zustand gemeldet — für Fertigkeiten nicht. Die Liste im Bogen wird aus dem Kompendium
aufgezählt, die Punkterechnung läuft aber stumpf über alle gespeicherten Einträge.
Steht dort eine Fertigkeits-Kennung, die das Kompendium nicht kennt, verschwindet die
Zeile und die Punkte bleiben ausgegeben.

**Wann es auffällt:** Das ist in diesem Repo schon passiert. Commit 0afb179
(„Datenfix psionische Skills") hat Autohypnosis, Psicraft, Use Psionic Device und ein
Concentration-Duplikat aus den Daten entfernt — von 40 auf 36 Fertigkeiten. Beim
Einspielen wird der ganze SRD-Bestand gelöscht und neu geschrieben. Wer vorher Ränge
in Psicraft hatte, hat sie seitdem unsichtbar im Charakter und bezahlt sie weiter. Der
Bogen zeigt dann z.B. „Punkte 22/40", ohne dass man die fehlenden 12 irgendwo findet;
es gibt keine Zeile, also auch kein „−", um sie zurückzuholen. Getestet mit einer
erfundenen Kennung: keine Zeile, Punkte weiter gezählt, Meldungsliste leer.

**Zu tun:** Beim Zählen prüfen, ob die Kennung überhaupt eine Zeile hat, und für jede
Waise eine Meldung „fehlender Verweis" mit der Rangzahl ausgeben — so wie bei
Talenten. Dann sieht man, warum Punkte fehlen, und kann sie löschen oder das Paket
nachziehen. Die Punkte weiter zu zählen ist übrigens die sichere Hälfte: würde man nur
sichtbare Zeilen zählen, wären gespeicherte Ränge plötzlich gratis.
(`packages/core/src/engine/resolve.ts:75`, `packages/core/src/engine/derive.ts:644`)

---

### 12. Import: der Auswahltext eines Talents wird an der falschen Stelle abgeschnitten

**Was falsch ist:** Nach einem Namenstreffer wird der Rest („Weapon Focus
**Kurzschwert**") aus dem Originaltext geschnitten — aber mit der Länge des
*bereinigten* Namens. Beim Bereinigen fallen Kommas, Punkte und Apostrophe weg und
doppelte Leerzeichen werden zusammengedrückt, die beiden Längen passen also nicht
zusammen.

**Wann es auffällt:** Nur wenn im Talentnamen selbst ein Satzzeichen oder ein
doppeltes Leerzeichen steckt — und das ist kein Papierfall: Fight Club ist eine
iOS-App, und die iPhone-Tastatur macht aus zwei Leerzeichen von sich aus „. ". Aus
„Weapon. Focus Kurzschwert" wird die gespeicherte Auswahl **„s Kurzschwert"**, der
Verweis auf die Waffe wird nicht gefunden, und die Angriffszeile „Sword, short" steht
auf **+8 statt +9**. Im Talente-Reiter steht der Buchstabensalat als Auswahl. Bei
einem eigenen Talent „Devil's Sight (Kurzschwert)" wird die Auswahl „t (Kurzschwert".
Der Importbericht warnt in den meisten Fällen („keine Waffe dieses Namens gefunden"),
bei Talenten ohne Waffenbezug schweigt er.

**Nicht betroffen:** Gegenstände (dort wird nur geprüft, *ob* ein Rest übrig ist, nie
sein Inhalt), Fertigkeiten sowie Völker und Klassen (alle betroffenen SRD-Namen sind
einwortig und satzzeichenfrei). Satzzeichen *hinter* dem Namen sind harmlos.

**Zu tun:** Die Trefferlänge im Originaltext messen statt im bereinigten Text —
etwa die Wörter des Treffers zählen und so viele Wörter aus dem Original überspringen.
Nebenbei: der Import benutzt die deutschen Waffen-Aliase nur für Talent-Auswahlen,
nicht für Gegenstände, deshalb wird aus „Dolch" eine Eigenbau-Waffe statt des
SRD-Dolchs. (`packages/core/src/import/fightclub.ts:276`)

---

### 13. Einen Abzug kannst du bei „Sonstige Modifikatoren" nicht eintragen

**Was falsch ist:** Das Wertfeld liest die Eingabe als Zahl und setzt bei einer
ungültigen Zwischeneingabe 0 ein. Ein angefangenes Minus ist für das Feld keine
gültige Zahl, also landet 0 im Feld und React schreibt sofort „0" zurück — das Minus
ist weg.

**Wann es auffällt:** Auf dem iPhone kommst du an ein Minus überhaupt nicht heran: das
Zahlen-Keypad hat keins, und das Feld hat keine Auf/Ab-Pfeile. Du willst „−2" für
einen Fluch eintragen, gespeichert wird **+2**. Die Rüstungsklasse steigt dann um 2
statt zu fallen — bei 16 gewollt zeigt der Bogen 20, also vier Punkte daneben, mitten
im Kampf, ohne Warnung. Und du kannst es nicht korrigieren: die Liste kann Einträge
nur löschen, nicht bearbeiten. Dasselbe gilt für Rettungswürfe, Angriff und Bewegung.
Dass Abzüge gewollt sind, sagt das Projekt selbst — an den Talent-Modifikatoren steht
„der Wert darf negativ sein, eine Hausregel darf auch wehtun", und genau dort gibt es
auch die −/+-Knöpfe.

**Zu tun:** Dasselbe −/+-Steuerelement verwenden wie bei den Talent-Modifikatoren, oder
den Rohtext im Feld halten und erst beim Übernehmen in eine Zahl wandeln.
(`apps/web/src/pages/sheet/tabs-more.tsx:768-773`, Vorbild:
`apps/web/src/ui/FeatModifiers.tsx:183`)

---

### 14. Der Schalter „Multiclass-EP-Strafe" tut nichts

**Was falsch ist:** Der Schalter steht in den Einstellungen, wird gespeichert, aber
keine Zeile der App liest ihn — keine Zahl, keine Warnung, obwohl der Kommentar im
Schema „nur warnen" verspricht. Die Prüffunktion, in der die Warnung entstehen müsste,
bekommt die Hausregeln nicht einmal übergeben.

**Wann es auffällt:** Schalter an, Charakter Kämpfer 4 / Schurke 1: der Bogen ändert
sich nicht und meldet nichts. Ganz ehrlich: eine *Zahl* könnte er auch nicht ändern —
die Strafe kürzt die vergebenen Erfahrungspunkte, und die App hat gar keinen Weg, EP
zu vergeben; das Feld ist ein reines Eingabefeld. Es bleibt also ein Bedienelement,
das nichts tut, und darauf verlässt man sich. Zwei weitere Hausregel-Felder
(`deathAt`, `pointBuyBudget`) stehen im Schema, haben aber gar keine Oberfläche.

**Zu tun:** Entweder eine Warnung nachziehen, wenn die Klassenstufen mehr als eine
Stufe auseinanderliegen (die bevorzugte Klasse liegt in den Daten bereit und wird
schon angezeigt) — oder den Schalter entfernen, bis es die Warnung gibt. Der
Dateikopf sagt es selbst: „Toggles werden on demand ergänzt, nichts auf Verdacht".
(`packages/core/src/schema/character.ts:18`,
`apps/web/src/pages/SettingsPage.tsx:122`, `packages/core/src/engine/validate.ts`)

---

## Wo Daten verloren gehen können

Das ist der Abschnitt, der mir am wichtigsten war. Alle Punkte hier führen zu
verlorener Arbeit ohne Rückfrage und ohne Rückgängig.

### 1. Der Abgleich wirft Arbeit weg, wenn die Zähler ungleich weit sind

**Was falsch ist:** Ein Konflikt wird nur erkannt, wenn beide Geräte **genau**
denselben Speicherzähler haben. Sonst gewinnt schlicht die höhere Zahl und der andere
Stand wird überschrieben — ohne Konfliktkopie, ohne Eintrag im Bericht. Der Zähler
sagt aber nur, *wie oft* gespeichert wurde, nicht, von welchem gemeinsamen Stand die
beiden abgezweigt sind. Zwei Geräte, die beide gearbeitet haben, haben fast nie
dieselbe Zahl — Gleichstand ist der Ausnahmefall.

**Wann es auffällt:** Beide Geräte zuletzt bei Zähler 7 einig. iPhone: 13 Schaden im
TP-Pad eingetragen → 8. iPad ohne Netz: Cleave nachgetragen und eine Notiz → 9. Das
iPad kommt online, dann gleicht das iPhone ab: das Ergebnis ist „**1 geholt**", keine
Kopie, keine Warnung — und im Kopf des Bogens steht wieder „TP **58/58**" statt
„45/58". Die Figur gilt als unverwundet, der Schaden aus dem letzten Kampf ist weg.
Es geht auch der *neuere* Stand verloren: iPhone mit drei TP-Taps um 20:30 (Zähler 10)
gegen iPad mit Cleave und Notiz um 21:00 (Zähler 9) — das iPhone gewinnt, das Talent
von vor einer halben Stunde fehlt, keine Kopie.

Das widerspricht dem, was die App verspricht: in der README steht „ändert man
denselben Bogen auf beiden Geräten, bleibt der Verlierer als Konfliktkopie stehen —
der Abgleich wirft nie etwas weg", und im Kopf der Merge-Datei „Stillschweigend
Arbeit wegwerfen darf ein Sync nicht". Der Bericht behauptet aktiv das Gegenteil. Am
Spieltisch ist kein Netz laut Code-Kommentar der Normalfall — genau die Lage, für die
die Konfliktkopien gebaut wurden, fällt durchs Raster.

**Zu tun:** Je Dokument mitschreiben, auf welchem Stand der letzte erfolgreiche
Abgleich stand (beim Hochschreiben setzen). Konflikt ist dann: **beide** Seiten liegen
über diesem gemeinsamen Stand — egal wie weit. Mit einer einzelnen Zahl ist ein
Auseinanderlaufen grundsätzlich nicht erkennbar. Ein Test hält das heutige Verhalten
ausdrücklich als gewollt fest („lässt die höhere rev gewinnen") und muss mit.
(`packages/core/src/sync/merge.ts:206-215`, `apps/web/src/db/repo.ts:85` und `:120`,
`apps/web/src/pages/SyncCard.tsx:241`)

### 2. Notizen: zwei Wahrheiten, und Wischen verliert den Text

**Was falsch ist:** Das Notizfeld zieht den Text beim Öffnen des Reiters **einmal**
aus dem Charakter in eine eigene Kopie und gleicht sie danach nie wieder ab;
gespeichert wird nur beim Verlassen des Feldes. Dieselbe Bauart bei den
Abschnitts-Texten darunter.

**Wann es auffällt:** Drei Wege, alle ohne Rückgängig.

*Wischen (kein Abgleich nötig, der wahrscheinlichste Fall):* „Notizen" ist der letzte
Reiter, das Freitextfeld das letzte Element. Du tippst „Grabmal: Zwerg hat den
Schlüssel" und wischst dann vom Textfeld zurück zu „Talente". Beim Reiterwechsel wird
das Feld aus der Seite entfernt, während es noch den Fokus hat — dabei löst der
Browser kein „Feld verlassen" aus. Der Text war nie gespeichert und ist weg. Bittere
Ironie: die Wisch-Geste wurde gerade eingebaut und ist der bequemste Weg, eine Notiz
zu verlieren.

*Abgleich:* Notizen-Reiter offen, der Abgleich holt eine neuere Fassung vom iPad. Kopf,
TP und die Abschnitts-Titel zeigen den neuen Stand, das Notizfeld weiter den alten.
Ein Tap ins Feld und einer daneben genügen: der alte Text wird über den neuen
geschrieben. Und weil der Zähler dabei nach oben wächst, entsteht **keine**
Konfliktkopie — die iPad-Notiz ist auf beiden Geräten weg.

*Neu laden:* Text tippen und die App wegwischen oder den Update-Hinweis bestätigen
(der lädt sofort neu). Es gibt nirgends im Code einen Handler, der Getipptes beim
Ausblenden der Seite sichert.

**Zu tun:** Das richtige Muster steht im selben Repo: das TP-Feld arbeitet mit einem
Entwurf, der auf „leer" zurückfällt und danach immer den frischen Wert zeigt
(`HpPad.tsx:126`). Dazu schon beim Tippen gedrosselt speichern (etwa 500 ms) statt nur
beim Verlassen, und zusätzlich beim Ausblenden der Seite sichern. Die Notizfelder sind
die einzigen Textfelder der App, die eine dauerhafte Kopie halten.
(`apps/web/src/pages/sheet/tabs-more.tsx:561` und `:666`)

### 3. Importierte Eigenbau-Waffen überschreiben sich gegenseitig

**Was falsch ist:** Die Kennung einer selbst benannten Waffe wird aus ihrem Namen
gebaut („Templer Schwert" → `homebrew:item:templer-schwert`). Damit ist sie nicht
eindeutig, und gespeichert wird überschreibend, ohne Prüfung. Das Platzhalter-Volk
direkt daneben in derselben Funktion macht es richtig und zieht eine echte
Zufallskennung.

**Wann es auffällt:** Und das ist der Normalfall, nicht der Sonderfall: die
Namenssuche läuft gegen englische SRD-Namen, also wird **jeder deutsche Waffenname**
(„Dolch", „Kurzschwert", „Langschwert") zu einer Eigenbau-Waffe mit Namens-Kennung.
Eine Gruppendatei mit Halbling-Schurke („Dolch" 1d3) und Mensch-Kämpfer („Dolch"
1d4): nur **ein** Eintrag überlebt. Der Bogen des Schurken zeigt danach „Dolch
**1d4**" statt **1d3** — eine Würfelstufe zu viel, weil Waffen für kleine Wesen eine
Stufe kleiner sind. Und in der Beschreibung des geteilten Eintrags steht der
Angriffsbonus des *anderen* Charakters („Angriffsbonus im Original: +8/+3"). Es
braucht nicht einmal zwei Charaktere in einer Datei: zwei getrennte Importe Wochen
auseinander kollidieren genauso, und der Parser liest auch Nichtspieler-Figuren, also
kollidieren Spielleiter-NSCs mit Spielerfiguren.

**Zu tun:** Die Kennung wie beim Platzhalter-Volk zufällig ziehen und den Namen nur
als Anzeigenamen führen. Wer Waffen bewusst teilen will, braucht dafür einen eigenen
Weg („gleiche Waffe wiederverwenden?") — nicht ein zufälliges Namensgleichnis. Beim
Einfügen zusätzlich wie beim Datei-Import vorher nachsehen, ob es den Eintrag schon
gibt, statt blind zu überschreiben. Der einzige Test dazu prüft nur, dass die Kennung
„homebrew:item:templer-schwert" lautet — er zementiert das Verhalten.
(`packages/core/src/import/fightclub.ts:730`, `apps/web/src/db/repo.ts:212`,
Vorbild: `apps/web/src/lib/transfer.ts:164`)

### 4. Talente werden über die Listenposition angefasst — gelöscht wird das falsche

**Was falsch ist:** Die Talentliste arbeitet mit der Position in der Liste, und alle
Schreibzugriffe adressieren darüber. Verschiebt sich die Liste zwischendurch, landet
die Änderung auf einem anderen Talent. Weil die Position auch der Schlüssel der Zeile
ist, wandert zusätzlich der Zustand einer Zeile (der scharf gestellte ✕, das offene
Modifikator-Formular) beim Löschen eine Zeile nach oben. Ausrüstung und Zähler machen
es richtig und adressieren über eine eigene Kennung — Talente haben im Datenmodell
keine.

**Wann es auffällt:** Nach dem Import räumt man die Talentliste auf, also mehrere
Löschungen hintereinander. Die drei Knöpfe ⚔ ✎ ✕ stehen 4 px auseinander, ein
Fehlgriff ist der Normalfall — und ein scharf gestellter ✕ hat kein „Abbrechen", wer
daneben getippt hat, kann nur warten oder tippt drauf. Beispiel mit Weapon Focus /
Power Attack / Cleave / Improved Initiative / Extra Turning / Combat Casting: ✕ auf
Extra Turning daneben getippt, dann Cleave gelöscht → an dieser Position steht jetzt
Combat Casting, immer noch „wirklich?". Ein Tap löscht **Combat Casting**. Trifft es
Improved Initiative, fällt die Initiative von **+6 auf +2**; trifft es Weapon Focus,
werden aus +11/+6 ein **+10/+5**; trifft es Extra Turning, sinkt das
Zähler-Maximum um 4. Die Rückgängig-Meldung nennt dabei den falschen Namen, und sie hat
nur einen Platz — wer sie wegtippt, hat das Talent still verloren.

Ohne jede Zeitgrenze trifft dieselbe Ursache das offene Modifikator-Formular: nach
einer Löschung darüber schreibt „Übernehmen" den Modifikator an das falsche Talent.
Die Summe stimmt dann sogar, nur der Besitzer ist falsch — auffällig erst, wenn man
später jenes Talent löscht und ein Bonus mitgeht, den man dort nie eingetragen hat.

**Zu tun:** Talent-Zeilen brauchen eine eigene Kennung im Datenmodell, so wie
Ausrüstung und Zähler sie haben; danach über die Kennung schlüsseln und adressieren.
Für vorhandene Charaktere (Import, Abgleich) muss die Kennung beim Laden nachgezogen
werden. Und der Bestätigungsknopf sollte sich zurücksetzen, wenn sich das angezeigte
Talent ändert. (`apps/web/src/pages/sheet/tabs-more.tsx:349-470`,
`packages/core/src/schema/character.ts:159`)

### 5. Zweimal auf „Anlegen" tippen erzeugt zwei Charaktere

**Was falsch ist:** Der Assistent legt den Charakter an und wechselt erst danach die
Seite. Der Knopf bleibt in der Zwischenzeit tippbar, und jeder Aufruf zieht eine neue
Kennung. Import- und Vergleichsseite haben dafür eine Sperre, der Assistent nicht —
und er ist die einzige Stelle der App, die beim zweiten Aufruf nicht dasselbe Ergebnis
erzeugt.

**Wann es auffällt:** Der Knopf zeigt beim Tippen nichts an — kein Kreisel, keine
Rückmeldung —, und die App schaltet gezielt die 300-ms-Bremse für Doppeltipps ab, also
kommen zwei schnelle Taps als zwei Klicks an. In der Liste stehen danach zwei
identische Figuren direkt untereinander, gleicher Name, gleiches Volk, gleiche Stufe,
nicht unterscheidbar. Die Entdopplung greift nicht (sie sucht nur Namen mit
„(Konflikt …)"-Anhang). Du spielst auf der zweiten weiter, die erste bleibt als
Stufe-1-Leiche stehen, und über den Abgleich wandern beide aufs iPad. Wegräumen geht
nur über die Gefahrenzone samt Namenstippen, auf jedem Gerät.

Das Zeitfenster ist schmal (ein Datenbankschreibvorgang plus Seitenwechsel), aber
echt — und der Fix ist eine Zeile im Stil der Nachbarseiten: beim ersten Tap sperren,
nach dem Seitenwechsel freigeben. Dasselbe Muster gehört in den Stufenaufstieg.
(`apps/web/src/pages/CharacterWizard.tsx:109`, Vorbild:
`apps/web/src/pages/CompareDraft.tsx:29`)

### 6. Zahlenfelder: leer tippen speichert sofort 0, und Tippen verliert Zeichen

**Was falsch ist:** Die Felder für Erfahrungspunkte und Geld hängen direkt an der
Datenbank: jeder Tastendruck löst ein Lesen und Schreiben aus, und React setzt am Ende
jedes Tastendrucks den alten Wert synchron ins Feld zurück, bis die Runde durch ist.
Dazu wird eine ungültige Eingabe als 0 gespeichert.

**Wann es auffällt:** Zwei Dinge, eines davon sicher.

*Sicher, ohne Zeitannahme:* Jede Bearbeitung, die nicht hinten anfügt, geht schief. EP
22.000 sollen 25.000 werden: alles markieren, „2" tippen → das Feld springt auf
„22000" zurück und die Markierung ist weg; die „5" macht daraus **220005**. Der
Werte-Reiter zeigt dann „EP 220005" neben „nächste Stufe: 28.000", im Kopf leuchtet
„Stufenaufstieg bereit". Und wer das Feld per Rücktaste leeren will, um neu zu tippen,
speichert im Moment des Leerens **EP 0** — vier Sekunden später ist das im Gist und
auf dem iPad, und weil der Zähler bei jedem Anschlag wächst, gewinnt es jede
Zusammenführung. Dasselbe beim Geld.

*Zeitabhängig:* Beim Gerätenamen im Abgleich („iPad von Philipp" zügig tippen) kommt
der Text auf dem iPad verstümmelt an, weil jeder Anschlag innerhalb der Runde auf dem
zurückgesetzten Wert aufbaut. Am Desktop merkt man davon meist nichts.

Verschärfend: bei jedem Anschlag im EP-Feld liest der Abgleich zusätzlich **alle**
Charaktere samt Porträt, um zu prüfen, ob sich etwas geändert hat — das verlängert
genau die Runde, in der Zeichen verloren gehen.

**Zu tun:** Eingabe lokal halten und beim Verlassen bzw. gedrosselt speichern — das
Muster steht schon im Repo (TP-Feld, Notizen, das Einrichtungsformular des Abgleichs
machen es so; nur der Umbenennen-Weg und die Zahlenfelder nicht). Und eine leere
Eingabe als „unverändert" behandeln statt als 0.
(`apps/web/src/pages/sheet/tabs-core.tsx:503-508`,
`apps/web/src/pages/sheet/tabs-more.tsx:193-201`,
`apps/web/src/pages/SyncCard.tsx:219-223`,
`apps/web/src/pages/sheet/CombatOptions.tsx:107`)

### 7. Der Stufenaufstieg schreibt die Fertigkeitsränge vom Seitenaufruf zurück

**Was falsch ist:** Der Aufstiegs-Assistent baut alles aus dem frischen Charakter —
außer den Fertigkeitsrängen. Die werden beim Öffnen der Seite **einmal** kopiert und
beim Anwenden absolut zurückgeschrieben.

**Wann es auffällt:** Am iPad 2 Ränge Heal nachgetragen. Am iPhone liegt die
Aufstiegsseite offen (Talente und Zauber wählen dauert Minuten). App verlassen,
zurückkommen → der Abgleich holt den iPad-Stand. „Aufstieg anwenden" schreibt Heal
mit **5** statt **7** zurück: im Fertigkeiten-Reiter steht **+7 statt +9**, und 2
Fertigkeitspunkte sind wieder „frei". Die Buchhaltung bleibt in sich stimmig, es warnt
also nichts — und weil der Zähler wächst, entsteht keine Konfliktkopie und der Verlust
wandert aufs iPad.

**Zu tun:** Nur die in diesem Aufstieg gekauften Ränge als Differenz auf den frischen
Datensatz addieren, statt die ganze Rangliste zu ersetzen. (Der ebenfalls gemeldete
Doppel-Tap auf „Aufstieg anwenden" ist harmlos — beide Taps schreiben dasselbe fertige
Ergebnis, es entsteht genau eine Stufe.) (`apps/web/src/pages/LevelUp.tsx:45`, `:80`,
`:162`)

### 8. Vorsorge: ein Gerät mit älterer App schneidet neue Felder ab und schreibt den Verlust zurück

**Was falsch ist:** Beim Einlesen werden unbekannte Felder still verworfen. Der dafür
vorgesehene Auffangbeutel (`x`) ist im Schema deklariert, wird aber nirgends gefüllt
oder gelesen, und die Migrationsschleife läuft nur nach oben — ein Dokument aus einer
neueren Version wird ungeprüft durchgelassen.

**Wann es auffällt:** Es braucht keine neue Schema-Version. Die Versionsnummer steht
seit dem ersten Commit auf 1, während Felder laufend dazukamen: `slot` bei der
Ausrüstung, die Kampfoptionen, das Zähler-Maximum. Ein iPhone auf einem älteren Stand
gleicht ab: `slot` fällt weg, die Ausrüstung ist „angelegt-los", die Kampfoptionen sind
weg. Im Kampf-Reiter fällt die Rüstungsklasse von **21 auf 13** (Brustplatte und
Schild zählen nicht mehr) und die Nahkampfzeile verliert die Waffe. Keine Meldung,
keine Konfliktkopie. Sechs Schaden antippen — und der beschnittene Stand geht mit
höherem Zähler in die Ablage, wo er das iPad erreicht. Verschärfend: das Update wird
nur per Rückfrage angeboten; eine iPhone-PWA vom Startbildschirm fragt tagelang nicht
nach, der Versionsversatz ist der Normalzustand.

**Zu tun:** Unbekannte Felder beim Einlesen in den Auffangbeutel retten und beim
Schreiben wieder ausbreiten — dann leitet ein älteres Gerät weiter, was es nicht
versteht, genau wie der Kommentar am Schema es verspricht. Und Dokumente mit höherer
Versionsnummer als der eigenen gar nicht anfassen: anzeigen mit Hinweis „von einer
neueren Version", aber nicht überschreiben und nicht hochschreiben. Das schützt die
*nächste* Felderweiterung. (`apps/web/src/db/repo.ts:26`,
`packages/core/src/schema/character.ts:346`,
`packages/core/src/schema/entities.ts:87`)

### 9. Die Sicherungs-Karte sagt grün, obwohl ein Charakter nie hochkam

**Was falsch ist:** Der Zeitpunkt des letzten Abgleichs wird nach jedem Lauf gesetzt,
auch wenn ein Dokument wegen „zu groß" gar nicht hochgeschrieben wurde. Die
Sicherungs-Karte liest nur diesen Zeitpunkt und meldet daraufhin grün „Abgeglichen
heute — eine Kopie liegt in deinem privaten Gist". Für diesen Charakter ist das
falsch, und der Zustand ist dauerhaft: er wird bei jedem Lauf erneut abgelehnt und der
Zeitpunkt jedes Mal frisch gesetzt.

**Wann es auffällt:** Selten, aber nicht erfunden — die App hat für den Fall eine
eigene deutsche Meldung. Über die App selbst ist er kaum erreichbar (Porträts werden
auf 512 px verkleinert). Zwei offene Wege: ein von einem Freund geteilter Charakter
mit großem Porträt wird beim Import **nicht** nachverkleinert, und bei einem Bild, das
Safari nicht dekodieren kann (etwa .heic aus der Dateien-App), gibt die Verkleinerung
das Original in voller Größe zurück. Offline oder bei abgeschaltetem Auto-Abgleich
steht die grüne Zeile dann ganz allein da, ohne die bernsteinfarbene Warnung darüber.
Wenn dann der Speicher der Web-App verschwindet, ist der Charakter ersatzlos weg,
obwohl die App ihn als gesichert gemeldet hat. Genau wegen eines echten Datenverlusts
existiert diese Karte.

**Zu tun:** Die Kennungen ungesicherter Dokumente in den Einstellungen ablegen (das
überlebt das Neuladen) und die Karte damit versorgen: „1 Charakter ist NICHT
gesichert" statt grün. Und beim Import Porträts genauso verkleinern wie beim
Hinzufügen. (`apps/web/src/sync/sync.ts:148`,
`packages/core/src/sync/backupStatus.ts:63`, `apps/web/src/lib/transfer.ts:136`,
`apps/web/src/lib/image.ts:62`)

---

## Am Handy unangenehm

### 1. Die Abgleich-Meldung legt sich über die Reiter — ein Tap führt aus dem Charakter heraus

Die Meldung sitzt fest 64 px über dem unteren Rand und ist ~26 px hoch, belegt also
das Band 64–90 px. Genau dort liegt die Reiter-Leiste des Bogens (56–110 px). Die
Meldung liegt oben, ist ein Link zu den Einstellungen und hat einen deckenden
Hintergrund. Ein Tap auf „Talente" öffnet also die Einstellungen — der Bogen ist weg.
„gleicht ab …" verdeckt Talente und fast ganz „Notiz", „Abgleich fehlgeschlagen"
zusätzlich „Ausr." und einen Teil von „Zauber". Der Fehlerzustand bleibt stehen, bis
der nächste Abgleich gelingt — bei abgelaufenem Token also die ganze Sitzung; und
„gleicht ab …" kehrt vier Sekunden nach jeder Änderung wieder. Man tippt am Tisch TP
ab, greift zum Talente-Reiter und landet in den Einstellungen.

Dass es ein Versehen ist, zeigt die Rückgängig-Meldung: dieselbe Bauart, aber bei
112 px, also knapp über der Leiste — mit dem Kommentar „3,5rem Hauptnavigation +
3,5rem Reiter-Leiste, sonst deckt die Meldung genau die Reiter ab, die man als
Nächstes braucht". Die Abgleich-Meldung ist der Nachzügler, der nur die
Hauptnavigation eingerechnet hat. **Zu tun:** denselben Wert verwenden (7rem).

**BEHOBEN.** `SyncBadge.tsx` steht jetzt auf denselben 7rem wie die Rückgängig-Meldung.
Aufgefallen ist es beim Umbau auf „Abgleich nur beim Start": der Lauf im gebauten Bogen
blieb an der Marke hängen, weil sie den Klick auf den Reiter abfing — und dringend wurde
es, weil ein Fehler seither von keinem späteren Abgleich mehr überschrieben wird, die
Marke also die ganze Sitzung stehen bleibt. Der Satz über „kehrt vier Sekunden nach jeder
Änderung wieder" gilt damit auch nicht mehr: während einer Sitzung gleicht die App gar
nicht mehr ab (`MID_SESSION_SYNC`). Eine Prüfung hält die Lage jetzt fest — und zwar nur
dort, wo die Reiterleiste wirklich unten sitzt, denn ab `md` steht sie oben.
(`apps/web/src/ui/SyncBadge.tsx:17`, `apps/web/src/pages/sheet/index.tsx:312`,
`apps/web/src/ui/UndoBar.tsx:60`)

### 2. Zustände sind im Kopf sichtbar, aber nur im letzten Reiter änderbar

Die Zustands-Marken oben im Bogen sind reine Anzeige — ein Tap tut nichts. Geändert
werden sie nur im siebten und letzten Reiter, unter der Porträt-Karte, als eine Wolke
aus 29 gleich aussehenden 26-px-Marken in Kennungs-Reihenfolge, ohne Suche und ohne
Gruppierung („Prone" ist Nummer 22). Das sind 3 Taps plus Suchblick für etwas, das
zwei Zentimeter höher schon angezeigt wird.

Das ist nicht kosmetisch: Zustände wirken über dieselbe Rechnung wie Talente und
Gegenstände. Prone gibt −4 im Nahkampf, Fatigued −2 auf Stärke und Geschicklichkeit
(und damit auf Angriff, Schaden, Rüstungsklasse, Reflex und Fertigkeiten), Shaken −2
auf Angriff, Rettungswürfe und Fertigkeiten. Solange Prone nicht eingetragen ist,
zeigt der Kampf-Reiter einen um 4 zu hohen Nahkampfwert — und nach dem Aufstehen
bleibt die Marke stehen, dann sind es dauerhaft 4 zu wenig.

Das Projekt hat das Muster für genau diese Kategorie schon: die Kampfoptionen-Karte
im Kampf-Reiter heißt im Code „was man von Runde zu Runde wählt", und beim
Dodge-Schalter steht ausdrücklich „nicht als Textfeld weiter unten … im Kampf tippt
niemand, und damit war das Talent praktisch aus". Rundenzustände sind dieselbe
Kategorie und sind bei dieser Umstellung nicht mitgekommen. **Zu tun:** Die Marken im
Kopf antippbar machen (Tap = Zustand weg) und eine „+ Zustand"-Marke daneben, die die
Auswahl als Blatt von unten öffnet. Die Verwaltung im Notizen-Reiter bleibt.
(`apps/web/src/pages/sheet/index.tsx:237-252`,
`apps/web/src/pages/sheet/tabs-more.tsx:595-615`)

### 3. Die durchgestrichene Dodge-Zeile ist bei Tischlicht nicht lesbar

Nachgerechnet: die graue Schrift `slate-600` auf dem Kartengrund ergibt **2,46:1**
Kontrast. Die schwächste Norm für große Schrift verlangt 3:1, für normale 4,5:1 — und
hier ist die Schrift 12 px klein. Die Geschwisterzeilen daneben stehen bei 7,3:1, also
Faktor drei innerhalb einer Liste.

Betroffen ist ausgerechnet die Zeile, die erklärt, warum eine Zahl so aussieht. Und
das ist der **Standardzustand** nach dem Import: der Import übernimmt Dodge, der
Schalter steht auf „aus", die Engine erzeugt die Zeile trotzdem — mit ausdrücklichem
Kommentar: „Ganz zu verschwinden wäre falsch. Wer die RK aufklappt und Dodge nicht
findet, sucht den Fehler in seinem Charakter statt am Schalter." Genau dieser Zustand
tritt ein, weil die Farbe die Zeile praktisch unsichtbar macht: du siehst RK 21,
findest Dodge nirgends und schließt, der Import habe das Talent verloren. Der Ausweg
(RK antippen) hilft nicht — dort sind es 3,8:1.

**Zu tun:** `slate-600` in Textrollen auf `slate-400` heben (das ergibt ~7:1). Die
Unterscheidung „wirkt nicht" trägt schon die Durchstreichung, die Farbe muss sie nicht
doppeln. Das mildere `slate-500` (3,9:1) verfehlt die Norm auch, ist aber lesbar und
steckt an ~40 Stellen — das ist eine eigene Entscheidung.
(`apps/web/src/pages/sheet/tabs-core.tsx:177`, `:180`, `:414`,
`apps/web/src/ui/FeatText.tsx:26`, `apps/web/src/ui/EquipMark.tsx:33`,
`apps/web/src/pages/LevelUp.tsx:357`)

### 4. Die eigene 44-px-Regel gilt nur an zwei Stellen

Zwei Stellen im Code schreiben 44 px als Tastfläche fest und begründen es: die
Ausrüstungs-Marke („44 px Tastfläche: am Tisch wird das mit einer Hand bedient") und
der TP-Rechner („jede Taste über der Daumen-Grenze von 44px"). Die drei Knöpfe, aus
denen die übrige App besteht, halten sie nicht: Marke **26 px**, Standardknopf
**34 px**, Hauptknopf **36 px**. 26 px sind auf dem iPhone 4,1 mm — die Auflagefläche
eines Daumens ist 8–10 mm breit. Getappt werden sie genau in der Lage, für die die
Begründung gilt: „Defensiv kämpfen", „Totale Verteidigung" und „Dodge" sind 26-px-Marken
mitten im Kampf-Reiter.

Ein Zusatzfall, der es verschärft: der scharf gestellte Löschknopf („wirklich?") ist
mit 26 px **kleiner** als das ✕ mit 34 px, das ihn ausgelöst hat. Das Ziel schrumpft
zwischen den zwei Taps, obwohl das Muster gerade darauf gebaut ist, dass beide sitzen.

**Zu tun:** In der Knopf-Bauteildatei eine Mindesthöhe setzen und mittig ausrichten,
bei Symbol-Knöpfen auch eine Mindestbreite. Beim Standardknopf die Fläche über
unsichtbare Polsterung vergrößern statt über die Zeilenhöhe — sonst wächst die
Fertigkeitsliste (~40 Zeilen) im Bearbeiten-Modus um rund 400 px Scrollweg.
Reihenfolge: Marke und der Bestätigungs-Zustand zuerst, der Standardknopf ist
grenzwertig. (`apps/web/src/ui/bits.tsx:152`, `:136`, `:114`,
`apps/web/src/ui/ConfirmDelete.tsx:52`)

### 5. Der Minus-Knopf im Zauber-Kopf wird als „Rast" vorgelesen

Der Knopf `−` gibt genau einen verbrauchten Platz zurück, trägt aber die Beschriftung
„Rast (Slots zurücksetzen)" — dieselbe Zeichenkette wie der 🌙-Knopf, der wirklich
alle Plätze zurücksetzt. Und diese Beschriftung wird auch als Vorlese-Name benutzt.
Mit VoiceOver hört man bei einem Magier mit fünf Graden also sechsmal „Rast (Slots
zurücksetzen)" für sechs Knöpfe mit zwei verschiedenen Wirkungen. Wer den vermeintlichen
Rast-Knopf wählt, bekommt statt 4/4 nur 2/4 und muss dreimal nachtippen. Verschärfend:
der `−` ist nie gesperrt — bei 0 verbrauchten Plätzen kündigt er „Rast" an und tut dann
nachweisbar nichts. Für sehende iPhone-Nutzer ist die Stelle folgenlos (iOS zeigt bei
Berührung keine Tooltips), am iPad mit Maus erscheint der falsche Text sichtbar. Eine
falsche Beschriftung ist schlechter als keine. **Zu tun:** eine eigene Zeichenkette
(„Einen Slot zurückgeben"); die passende gibt es bisher nicht.
(`apps/web/src/pages/sheet/SpellsTab.tsx:185`, `apps/web/src/strings.ts:365`)

### 6. „Wirken" ist der kleinste Knopf der Zauberseite

Der Kommentar darüber sagt „Wirken zuerst und hervorgehoben — das ist der Handgriff am
Spieltisch". Der Knopf ist mit **24 px** aber der flachste des Reiters, 10 px flacher
als „Vorbereitung lösen" direkt daneben. Bei 390 px Breite füllen die ersten drei
Knöpfe die Zeile, sodass der rote „Aus dem Zauberbuch nehmen" umbricht und mit 6 px
Abstand direkt **unter** „Wirken" landet — und der löscht ohne Rückfrage (siehe
Punkt 8 oben). **Zu tun:** „Wirken" auf die 34 px der Nachbarn und deutlich breiter,
Abstand in der Zeile erhöhen, und die zerstörende Aktion aus der Reihe nehmen.
(`apps/web/src/pages/sheet/SpellsTab.tsx:250`)

---

## Schneller / kleiner

### 1. Die Startseite baut das Kompendium mehrfach auf

Jede Komponente, die Regelinhalte braucht, legt ihre eigene Abfrage über die gesamte
Kompendiums-Tabelle an (3046 Einträge, ~3 MB). Auf der Startseite sind das bei sechs
Charakteren **18** Abfragen: jede Zeile bringt drei mit (zwei über die
Zusammenfassung, eine über das mitgerenderte Aktions-Blatt, das niemand geöffnet hat).
Auf dem Bogen sind 5–6 gleichzeitig offen.

Ehrlich zur Wirkung: die Datenbank selbst wird dabei nicht 18-mal gelesen — Dexie hat
einen Abfrage-Zwischenspeicher, der identische Abfragen zusammenfasst. Bezahlt wird
trotzdem: jeder zusätzliche Abonnent bekommt eine vollständige Kopie der 3046 Zeilen,
und jeder baut seine eigene Zuordnungstabelle. Sichtbar ist es daran, dass Name und
Stufe sofort dastehen, die Unterzeile („Human · Fighter 4 / Cleric 3") und die
TP-Plakette aber erst nachrücken. Das passiert nicht nur beim Kaltstart, sondern bei
jedem „zurück" vom Bogen — also bei jedem Wechsel zwischen zwei Charakteren.

**Zu tun:** Eine einzige Abfrage im Modul halten und die aufgelöste Zuordnung genau
einmal bauen; alle Zugriffe lesen daraus. Zusätzlich das Aktions-Blatt und den
Teilen-Knopf erst beim Öffnen mit Daten versorgen. Nebenbei würde
`cache: 'immutable'` bei der Datenbank die vielen Kopien einsparen.
(`apps/web/src/lib/hooks.ts:22`, `apps/web/src/pages/CharacterList.tsx:266`,
`apps/web/src/db/db.ts:26`)

### 2. Jeder Tastendruck lässt den Abgleich alle Charaktere samt Porträt lesen

Um zu erkennen, ob sich etwas geändert hat, liest der Abgleich die **vollständigen**
Charakterdokumente — inklusive der Porträts, die als Bilddaten im Dokument stehen —
und benutzt davon nur drei Zahlen (Anzahl, Zählersumme, jüngster Zeitstempel). Der
Zwischenspeicher hilft hier nicht, weil das Speichern in einer ausdrücklichen
Schreib-Transaktion läuft, die ihn leert. Und die Abfrage läuft, auch wenn der
Abgleich gar nicht eingerichtet ist — die Prüfung „ist er aktiv?" steuert nur die
Effekte darunter, nicht die Abfrage. „1250" ins Geldfeld tippen sind vier
Schreibvorgänge, also viermal alle Charaktere.

Für sich allein ist das unter der Wahrnehmungsschwelle, aber es verlängert genau die
Runde, in der die Zahlenfelder Zeichen verlieren (siehe Datenverlust Punkt 6).
**Zu tun:** Die Abfrage nur laufen lassen, wenn der Abgleich eingerichtet ist, und
ohne die Dokumente selbst — Anzahl plus der größte Zeitstempel reichen, weil jeder
Schreibweg den Zeitstempel neu setzt, und der Index dafür existiert schon.
(`apps/web/src/sync/SyncGate.tsx:27-32`, `apps/web/src/db/db.ts:29`)

---

## Was ich sonst verbessern würde

Nach Nutzen sortiert, jeweils mit der Situation, in der es fehlt.

### 1. Ein Knopf „Rast" für den ganzen Bogen

Eine Nachtruhe muss heute an vier Stellen von Hand nachgezogen werden: das 🌙 im
Zauber-Reiter je Zauberklasse (setzt nur die Zauberplätze zurück), die Zähler im
Werte-Reiter durch mehrfaches Tippen auf „+" (einen Zurücksetzen-Knopf gibt es nicht —
der Text dafür liegt unbenutzt in den Zeichenketten), der nichttödliche Schaden über
den TP-Rechner, und die pro Nacht geheilten TP muss man selbst ausrechnen und
eintippen.

*Am Tisch:* Die Gruppe rastet in der Höhle und macht am nächsten Morgen weiter — der
Kleriker hat 0 von 7 Vertreiben-Versuchen und 0 Plätze, der Barbar 1 Raserei übrig,
alle haben nichttödlichen Schaden. Bis das zurückgesetzt ist, wartet der ganze Tisch,
und meist bleibt etwas stehen und rechnet die nächste Sitzung falsch weiter.

*Vorschlag:* Eine Regel-Funktion „Rast anwenden" in der Engine (testbar, nichts
Abgeleitetes gespeichert): alle Zauberplätze aller Klassen leeren, jeden Zähler auf
sein wirksames Maximum, nichttödlicher und temporärer Schaden auf 0, Schaden um die
Charakterstufe verringern. Aufrufbar als „Rast (8 Std.)" im ⋯-Menü und direkt am
TP-Balken, mit einer Rückfrage. Zweite Zeile „Kurze Pause" für alles außer
Zauberplätzen. (`apps/web/src/pages/sheet/SpellsTab.tsx:147`,
`apps/web/src/strings.ts:329`)

### 2. Zauber-Reiter: erst zeigen, was heute wirklich wirkbar ist

Für Klassen ohne Zauberbuch (Kleriker, Druide, Paladin, Waldläufer) listet der Reiter
je Grad die **komplette** Klassenliste alphabetisch. Die vorbereiteten Zauber — die
einzigen, die man wirken kann — stehen mitten zwischen Dutzenden nicht vorbereiteten.
Ein Kleriker 9 hat über alle Grade rund 200 Zeilen. Zwei passende Zeichenketten liegen
unbenutzt herum, der Filter war offenbar schon einmal gedacht.

*Am Tisch:* Du willst im Kampf den vorbereiteten Bull's Strength wirken — Grad 2
öffnen und durch alle Grad-2-Klerikerzauber scrollen, bis die Zeile mit dem
„Wirken"-Knopf auftaucht. Bei Grad 3 und 4 noch einmal.

*Vorschlag:* Eine Marken-Reihe je Zauberblock: „Vorbereitet" bzw. „Bekannt" als
Standard, „Alle" zum Aufklappen. Sobald etwas im Suchfeld steht, zeigt die Liste
vorübergehend alles. Mehrfach vorbereitete Zauber bleiben eine Zeile mit ×2.
(`apps/web/src/pages/sheet/SpellsTab.tsx:103`)

### 3. Buffs zum Ein- und Ausschalten statt Anlegen und Löschen

Kurzzeitige Boni von Mitspielern (Bless +1 Angriff, Bull's Strength +4 STR,
Bardenmusik, Haste) gehen nur über „Sonstige Modifikatoren" im Notizen-Reiter: ein
vierteiliges Formular zum Anlegen, und zum Beenden muss man den Eintrag löschen. Beim
nächsten Kampf tippt man dasselbe wieder ein. Ein An/Aus fehlt, obwohl genau das die
Frage am Tisch ist.

*Am Tisch:* Kampfbeginn, der Barde stimmt an, der Kleriker segnet — zwei Boni an. Nach
dem Kampf laufen beide aus, also zwei Einträge löschen. Drei Kämpfe pro Abend, jedes
Mal zwei Reiter weg vom Kampf-Reiter, und ein vergessener Bless verfälscht danach
jeden Angriffswert.

*Vorschlag:* Die Modifikatoren um „aktiv ja/nein" erweitern (die Engine überspringt
inaktive, sie bleiben aber sichtbar) und die Liste zusätzlich als Marken-Reihe „Buffs"
in den Kampf-Reiter unter die Kampfoptionen: ein Tap an/aus. Angelegt wird weiter im
Notizen-Reiter, damit häufige Buffs als Vorratsliste stehen bleiben.
(`apps/web/src/pages/sheet/tabs-more.tsx:622`)

### 4. TP unter 0: sagen, ob handlungsunfähig, sterbend oder tot

Die Hausregel „Tod bei" steht im Schema, wird aber an keiner Stelle gelesen. Der
TP-Balken zeigt „TP −3/58" und sagt nichts dazu. Genauso unbenannt bleiben: genau 0 TP
(handlungsunfähig, nur eine Aktion) und nichttödlicher Schaden in Höhe der aktuellen
TP (erschöpft bzw. bewusstlos).

*Am Tisch:* Der Schurke fällt auf −3. Dann die Frage: „Bin ich schon tot? Verliere ich
jetzt jede Runde 1 TP?" Die App kennt die eingestellte Hausregel und schweigt,
nachgesehen wird im Buch.

*Vorschlag:* Im TP-Block der Engine einen abgeleiteten Zustand mitliefern (gesund /
handlungsunfähig bei 0 / sterbend / tot ab der eingestellten Grenze / erschöpft bzw.
bewusstlos durch nichttödlichen Schaden) und ihn als Wort in den TP-Balken schreiben,
beim Sterben mit dem Zusatz „−1 TP je Runde, bis stabilisiert". Nur gerechnet, nichts
gespeichert — und der tote Hausregel-Schalter bekommt endlich eine Wirkung.
(`packages/core/src/schema/character.ts:19`)

### 5. Volle Attacke in einem Tap — und den Krit-Bereich auswerten

Der Würfelknopf an einer Angriffszeile würfelt nur den ersten Bonus. Wer +11/+6/+1
hat, bekommt einen von drei Angriffen; die anderen zwei rechnet man im Kopf. Der
kritische Bereich steht als Text in der Zeile („19-20/×2"), wird beim Wurf aber nicht
angeschaut — dass eine 19 eine Bedrohung ist, muss man selbst wissen.

*Am Tisch:* Volle Attacke, drei Angriffe mit drei Modifikatoren, und bei der 19 die
Frage, ob das mit diesem Schwert schon eine Bedrohung ist. Die App liefert einen Wurf
und keine Antwort.

*Vorschlag:* Der Würfelknopf einer Zeile mit mehreren Bonussen würfelt alle
hintereinander und zeigt sie als Liste („+11 → 24 · +6 → 11 · +1 → 20 Bedrohung!").
Würfe im Krit-Bereich markieren und im Ergebnis-Fenster zwei Knöpfe anbieten:
„Bestätigungswurf" und „Krit-Schaden" mit dem Multiplikator aus der Zeile.
(`apps/web/src/pages/sheet/tabs-core.tsx:298`)

### 6. Initiative-Reihenfolge für die Gruppe

Die App kennt die Initiative-Modifikatoren aller Charaktere auf dem Gerät, aber es gibt
keinen Ort, an dem eine Kampfreihenfolge entsteht. Die README verspricht den
Kampf-Tracker ausdrücklich, die Navigation hat ihn nicht.

*Am Tisch:* Kampfbeginn, sechs Spieler nennen ihre Würfe, dazu drei Oger und ein
Anführer. Reihenfolge, aktuelle Runde und die TP der Gegner landen auf einem Zettel
neben dem iPad, obwohl die Werte der Gruppe in der App liegen.

*Vorschlag:* Eine Seite „Kampf" mit einer Liste: Charaktere aus der Datenbank
zuschaltbar (Initiative mit ihrem Modifikator würfeln oder den genannten Wurf
eintragen), freie Zeilen für Gegner (Name, Modifikator, TP-Zähler), absteigend
sortiert, Markierung des aktuellen Zugs, Rundenzähler. Der Kampfzustand gehört in die
Einstellungstabelle und **nicht** in den Abgleich — eine Kampfrunde ist kein
Charakterdatum. (`apps/web/src/ui/Layout.tsx:10`)

### 7. Kompendium: eine Suche über alle Arten

Gesucht wird immer nur innerhalb der gewählten Art. Wer nicht weiß, ob der Begriff ein
Zauber, ein Talent, ein Zustand oder ein Gegenstand ist, klappert die Reiter ab. Dazu
bricht die Liste bei 300 Einträgen ab, was bei Zaubern und Gegenständen ohne Suchbegriff
der Normalfall ist.

*Am Tisch:* Regelfrage mitten in der Runde — „Was macht Improved Trip genau?" Erst die
Art wählen, dann tippen; bei „Silence" oder „Entangle" zweimal daneben, weil man
Zauber und Zustand verwechselt hat, während die Runde wartet.

*Vorschlag:* Ab zwei Zeichen über alle Arten suchen und die Treffer nach Art gruppiert
mit Trefferzahlen zeigen; die Art-Marken bleiben als zusätzlicher Filter. Ein Streifen
„Zuletzt angesehen" (letzte 5) oben spart den zweiten Weg zum selben Eintrag.
(`apps/web/src/pages/Compendium.tsx:44`)

### 8. Zwei kleine Aufräumsachen, die zu Fehlern werden können

Beide sind heute harmlos, aber sie sind genau die Bauart, aus der die Fehler in diesem
Bericht entstanden sind:

- Der Auffangbeutel für unbekannte Felder (`x`) ist deklariert, wird aber nie gefüllt
  oder gelesen. Solange das so bleibt, verliert jedes Gerät mit älterer App die neuen
  Felder (Datenverlust Punkt 8).
- Es gibt keine Möglichkeit, einen Homebrew-Eintrag zu bearbeiten — die Funktion dafür
  existiert, wird aber von keiner Stelle der Oberfläche aufgerufen. Sobald es einen
  Editor gibt, wird die Namens-Kennung der importierten Waffen (Datenverlust Punkt 3)
  von einem Anzeigefehler zu echtem Verlust von Handarbeit.

---

## Unklar geblieben

Fünf Punkte haben die Prüfer uneins gelassen. Ich habe sie mit dem eingebaut, was ich
selbst nachprüfen konnte, aber bei diesen drei fehlt mir eine Angabe von dir:

**1. Wie oft benutzt du zwei Geräte gleichzeitig?** Davon hängt ab, wie dringend der
Abgleich-Punkt und die Notizen sind. Wenn du praktisch immer nur auf dem iPhone
arbeitest und das iPad nur liest, sind beide deutlich harmloser als beschrieben — dann
wäre der gemeinsame Abzweigpunkt im Abgleich (aufwendig) hinter den anderen Punkten
einzusortieren. Arbeitest du wirklich auf beiden, gehört er nach vorn.

**2. Läuft auf allen Geräten dieselbe App-Version?** Der Punkt „älteres Gerät
schneidet Felder ab" ist heute nicht auslösbar, wenn beide Geräte gleich aktuell sind
— er wird aber beim nächsten neuen Feld scharf. Wenn du das Update auf dem iPhone
regelmäßig wegklickst, ist er dringend; wenn du beide sofort aktualisierst, reicht die
Vorsorge (Auffangbeutel füllen).

**3. Trägst du Buffs und Zustände heute überhaupt in die App ein, oder rechnest du sie
im Kopf?** Das entscheidet, ob die drei Punkte „Zustände nur im letzten Reiter",
„Buffs zum Einschalten" und „negativer Modifikator nicht eintragbar" zusammen ein
großes Thema sind (dann würde ich sie als eine Umbauidee bündeln) oder drei kleine
Einzelheiten.

Zwei weitere Streitpunkte habe ich für dich entschieden und mit aufgenommen, weil ich
sie nachrechnen konnte: die eingefrorenen Trefferpunkte nach dem Import (die Absicht
ist dokumentiert und richtig, es fehlt nur der Hinweis im Aufstieg und ein Weg zur
richtigen Zahl) und die Ränge auf entfernten Fertigkeiten (das ist in diesem Repo mit
den psionischen Fertigkeiten wirklich passiert).

**Aussortiert habe ich einen Punkt:** die Meldung, das Power-Attack-Rädchen im
Kampf-Reiter verschlucke schnelle Taps und führe zu stillem Falschschaden. Der
Mechanismus stimmt (der neue Wert wird aus dem angezeigten Stand gerechnet statt in
der Datenbank), aber angezeigter und gespeicherter Wert können hier nicht
auseinanderlaufen — die Zahl neben dem Knopf **ist** der gespeicherte Wert. Ein
verschluckter Tap steht dir also sofort als „die Zahl hat sich nicht bewegt" vor
Augen, und das Zeitfenster ist kürzer als ein menschlicher Doppel-Tap. Nichts wird
still falsch, man tippt nach. Der einzige verwertbare Rest davon steckt jetzt in
„Talente über die Listenposition" (Datenverlust Punkt 4): dort ersetzt das
Modifikator-Formular die ganze Liste eines Talents und kann eine kurz zuvor gemachte
Änderung an einem anderen Modifikator zurückdrehen.
