# Fragen an Martin (Spielleiter)

**Stand: sieben Regeln sind beantwortet.** Was noch offen ist, steht unten in Teil 2 —
das ist der Teil, den Martin noch vorgelegt bekommt.

Warum die Liste hier liegt und nicht im Chat: ein Chat fängt irgendwann von vorn an,
die Fragen gelten dann trotzdem. Die Antworten wandern zusätzlich nach `CLAUDE.md`, weil
dort steht, wie die App gebaut ist.

---

# Teil 1 — beantwortet, bitte nicht neu fragen

Martins Antworten, wörtlich, mit dem was in der App daraus folgt.

### ✔ Trefferpunkte beim Aufstieg

> „TP bei Levelup: volle Hit Die der Klasse (Krieger +10), kein Wurf"

Dazu Philipps Antwort auf die Rückfrage, ob das auch für die schon eingetragenen Stufen
gilt: **nur ab dem nächsten Aufstieg.** Bestehende Bögen bleiben Zahl für Zahl, wie sie
sind.

### ✔ Grad-0-Zauber (Cantrips)

> „Trainer 0 Spells: müssen nicht vorbereitet werden, allgemein lockere Handhabung, gilt
> für alle"

Damit auch für den Magier und die spontanen Klassen. Auf die Rückfrage, ob die Plätze
weiter mitzählen: **Plätze bleiben, nur die Wahl fällt weg** — ein Cleric 1 hat weiter
drei Grad-0-Plätze am Tag und entscheidet beim Wirken, welcher Zauber es wird.

### ✔ Aktionspunkte

> „Action Points: Reset bei Stufenaufstieg"

Zusammen mit „Actionpoints hat jeder 6" ist der Zähler damit vollständig: 6, zurück beim
Stufenaufstieg — und ausdrücklich NICHT bei der kurzen Pause.

### ✔ Zweihändig, anderthalbfache Stärke

> „Zweihändig / 1,5x Stärke: wird immer angewendet, auch bei negativem Mod"

Das tut die App schon: aus STR 8 (−1) wird zweihändig **−2**. Es steht jetzt ein Test
daneben, damit es niemand später als Rundungsfehler „aufräumt".

### ✔ Zweite Hand: halber Stärkebonus

> „Zweiwaffenkampf: Off Hand nur halber Stärkebonus (relevant für Daniel)"

Gerechnet und abgerundet: STR 16 (+3) → die zweite Hand bekommt **+1**. Ein MALUS wird
nicht halbiert, er zählt voll — dieselbe Richtung wie oben, es geht nie zugunsten des
Charakters.

### ✔ Sterben

> „Sterben: Tod erst bei HP gleich negativem CON Wert. Zwischen 0 und minus CON Mod:
> Selbststabilisierung per Fort Save DC 10 (oder DM Ermessen). Unterhalb des negativen
> Mods: keine Probe mehr, automatisch 1 HP Verlust pro Runde"

Drei Zonen, und die Grenzen sind zwei verschiedene Zahlen: die Probenzone endet beim
CON-**Modifikator**, der Tod steht beim CON-**Wert**. Bei CON 14 (+2) also: 0 bis −2
Probe, −3 bis −13 blutend, tot bei −14.

**Eine Kleinigkeit dazu, falls es sich am Tisch ergibt:** gilt bei GENAU 0 TP schon die
Probe? Der Satz fängt bei „zwischen 0 und minus CON Mod" an, die App nimmt die 0 also
mit hinein. Im Regelwerk ist 0 eine eigene Zone (wach, aber nur halbe Handlung).

### ✔ Volle Attacke ab BAB +6

> Philipp: „Wir spielen bei 6bab mit zwei Angriffen."

Damit bleibt alles, wie es ist: der Bogen zeigt die Reihe seit dem ersten Tag (bei BAB +9
also „+9/+4"), genau wie Fight Club. Die zweite Hand folgt weiter NICHT dieser Reihe —
sie bekommt die Angriffe, die die Zweiwaffen-Talente hergeben.

Es war die letzte offene Frage, die **jeden Bogen der Gruppe** hätte ändern können;
deshalb wurde daran ohne Antwort nichts angefasst. Neu ist nur ein Test dafür — eine
Regel, die man nicht geändert hat, hat keinen Commit, an dem man sie später wiederfindet.

Dazu sein zweiter Satz: **„Bitte auch immer bab nennen."** Der Wert heißt in der App
jetzt überall BAB (vorher am Bogen „GAB", in den Einstellungen „BAB"), und er steht an
jeder Angriffszeile dabei: „Volle Attacke aus BAB +6: …".

---

# Teil 2 — noch offen

## 1. Die Spellcraft-Probe statt eines Platzes

> Philipp: „Eine weitere ist, dass wir eine spellcraft Probe machen können um einen
> Zauber ohne einen Zauberrang zu verbrauchen wirken wollen."

**Heute:** kennt die App nicht — wirken heißt Platz verbrauchen.

### 1.1 Braucht man dafür noch einen freien Platz? ← die wichtigste hier

- [ ] **nur mit freiem Platz** — die Probe SPART ihn, das Tageslimit bleibt ein Limit
- [ ] **auch wenn alle Plätze dieses Grades verbraucht sind** — das Tageslimit ist damit
      nach oben offen
- [ ] auch bei Zaubergraden, die die Figur noch gar nicht hat

*Warum:* bei der ersten Antwort genügt ein zweiter Knopf neben „Wirken". Bei der zweiten
muss die Sperre weg, und der Bogen braucht eine eigene Zeile für „über dem Tageslimit
gewirkt" — sonst weiß nach dem dritten Mal niemand mehr, wie weit man drüber ist.

### 1.2 Welcher Schwierigkeitsgrad?

- [ ] 15 + doppelter Zaubergrad (Grad 3 → 21)
- [ ] 20 + Zaubergrad (Grad 3 → 23)
- [ ] 10 + doppelter Zaubergrad (Grad 3 → 16)
- [ ] fester Wert: ______

### 1.3 Was passiert beim Misslingen?

- [ ] Platz ist weg, Zauber wirkt nicht
- [ ] Platz bleibt, Zauber wirkt nicht (nur die Handlung ist verloren)
- [ ] Zauber wirkt, Platz ist weg (die Probe war nur der Versuch zu sparen)

*Warum:* ohne diese Antwort weiß die App nach einem Fehlwurf nicht, ob sie den Platz
abziehen soll.

### 1.4 Welchen Zauber darf man so wirken?

- [ ] nur einen, den man morgens vorbereitet hat
- [ ] jeden aus der Klassenliste
- [ ] beim Magier jeden aus seinem Zauberbuch, bei Kleriker und Druide die ganze Liste

*Warum:* „ganze Klassenliste" heißt: bei einem Kleriker der Stufe 7 stehen über 200
Zauber mit einem Wirken-Knopf im Bogen, und der braucht dann eine eigene Suche.

### 1.5 Wie oft, für wen, und muss Spellcraft trainiert sein?

- [ ] beliebig oft · [ ] ______ mal pro Tag · [ ] einmal pro Zauber und Tag
- [ ] alle Zauberwirker · [ ] nur Vorbereiter (Kleriker, Druide, Magier)
- [ ] mindestens 1 Rang nötig · [ ] ungeübt geht auch

### 1.6 Gilt die Probe auch für Cantrips?

- [ ] ja, auch auf Grad 0
- [ ] nein, erst ab Grad 1

*Warum:* wenn der Schwierigkeitsgrad mit dem Zaubergrad steigt, wäre die Probe auf Grad 0
die leichteste — Cantrips wären damit praktisch unbegrenzt, und die eben entschiedene
Grad-0-Regel hätte keine Wirkung mehr.

---

## 2. Zwei Regeln, für die schon ein Fach existiert

Die App hat für diese Tischregeln ein Feld, aber keins davon tut etwas. Billige Fragen
mit einer fertigen Hälfte dahinter. (Die dritte aus dieser Reihe — die Todesgrenze — ist
mit Martins Antwort erledigt.)

### 2.1 Erfahrungspunkte-Strafe beim Mischen von Klassen?

Die Regel im Buch: liegen die Klassenstufen einer Figur mehr als eine Stufe auseinander,
gibt es weniger Erfahrungspunkte.

- [ ] spielen wir nicht → der Schalter kann verschwinden
- [ ] spielen wir → dann soll der Bogen es melden

*Heute:* der Schalter steht in den Einstellungen und lässt sich umlegen, aber **keine
Zeile der App liest ihn**.

### 2.2 Wie entstehen die Attributswerte?

- [ ] gewürfelt
- [ ] mit einem Punktebudget gekauft, und zwar ______ Punkte
- [ ] der Spielleiter gibt sie vor

*Heute:* der Assistent nimmt sechs Zahlen und prüft nichts.

---

## 3. Kleinigkeiten zu den Aktionspunkten

Martins Antwort klärt den Nachschub. Zwei Details sind noch nicht bestätigt — die App
macht bis dahin das Naheliegende (immer 6, beim Aufstieg wieder voll):

- **Bleiben es 6 über alle Stufen?** Oder 5 + halbe Charakterstufe, wie in der
  verbreiteten Fassung? (Auf Stufe 2 wären das genau 6, danach mehr.)
- **Verfallen übrige Punkte beim Auffüllen**, oder werden sie mitgenommen (dann könnte
  man mehr als 6 haben)?

---

## Schon lange geklärt — nur zur Sicherheit

- **Zweiwaffen-Mali gelten** an diesem Tisch (−6/−10, mit leichter Zweitwaffe und Talent
  entsprechend geringer).
- **Untote vertreiben: 7** beim aktuellen Kleriker (3 + CHA + 4 aus dem Talent).
- **Die kurze Pause** ist eine Hausregel dieses Tisches: sie füllt die Tageszähler, ohne
  acht Stunden zu brauchen. Zauberplätze fasst sie nicht an.
- **Zwei Domänen** mit je einem Domänenplatz pro Zaubergrad ab Grad 1.
- **Eine Rast fasst die TP nicht an**, und temporäre TP überdauern eine Nacht.
- **„Zauberrang" ist dasselbe wie ein Zauberplatz** — einer je Zaubergrad und Tag, kein
  Punktevorrat.
