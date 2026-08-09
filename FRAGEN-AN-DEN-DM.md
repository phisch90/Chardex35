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
jeder Angriffszeile dabei: „Volle Attacke aus BAB +6: …". Ein Satz über den Tisch selbst
steht dort ausdrücklich NICHT — den hatte ich angehängt, und er wollte ihn weg.

---

# Teil 2 — noch offen

## 1. Die Spellcraft-Probe statt eines Platzes — BEANTWORTET

Martins Blatt („Spellcasting by Spellcraft (HB)") hat alle sechs Unterfragen auf
einmal beantwortet, eine Klärung kam von Philipp:

- **DC 12 + Zaubergrad**, und die 12 ist eine Grundlage, die mit **jeder Nutzung**
  um den gewirkten Grad steigt („Ermüdung", Philipps Klärung: „Ermüdung bei jeder
  Nutzung") — die Rast (8 Stunden) setzt auf 12 zurück. Damit ist 1.1 beantwortet:
  die Probe braucht keinen freien Platz, das Limit ist die wachsende Ermüdung.
- **Misslingen:** kein Platz weg (es wurde ja keiner benutzt), im Kampf provoziert
  der Versuch einen Gelegenheitsangriff. **Patzer (natürliche 1):** zusätzlich
  1 Schaden je Zaubergrad zurück an den Wirker.
- **Kritisch:** die Reichweite wächst je Grad um die Bonus-Plätze (2 Bonus-Grad-1-
  Plätze → 18–20). Wahl aus: kein Rettungswurf · doppelte Wirkungswürfel · kein
  Gelegenheitsangriff.
- **Grad 0:** erlaubt, zählt aber als Grad 1 (Ermüdung und Patzer-Schaden); dafür
  Crit-Grundlage 19–20.

**Gebaut** (Hausregel `spellcraftCasting`, Standard an): Knopf „Probe" im Grad-Kopf
des Zauber-Reiters → Anleitung mit den Zahlen des Bogens (DC, eigener
Spellcraft-Wurf, Crit-Reichweite) → Verbuchen mit Ansage und Rücknahme; der Patzer
bucht den Schaden mit. Die Ermüdung steht als Zeile im Zauber-Reiter und in der
Rast-Ansage. Rechnung: `core/engine/spellcraftCasting.ts`.

---

## 2. Die drei Felder ohne Wirkung — erledigt

Hier standen drei Tischregeln, für die die App ein Feld hatte, das nichts tat. Alle drei
sind inzwischen beantwortet, und keine muss noch an Martin:

- **Todesgrenze** — Martins Regel 6, gebaut (`engine/dying.ts`, Schalter in den
  Einstellungen).
- **Erfahrungspunkte-Strafe beim Mischen von Klassen** — Philipps Wort: „Ep Strafe
  kannste aber ganz weg lassen. Spielen wir nicht." Der Schalter ist **entfernt**, das
  Feld auch. Ein Schalter, der etwas verspricht und nichts tut, ist schlimmer als kein
  Schalter; einer für eine Regel, die niemand spielt, ist bloß Lärm.
- **Wie die Attributswerte entstehen** — gewürfelt, wie bisher („Anfangs haben wir auch
  gewürfelt"). Der Punktekauf ist trotzdem gebaut, als ABSCHALTBARES Angebot: in den
  Einstellungen lässt sich ein Budget setzen (22 · 25 · 28 · 32 oder eine eigene Zahl),
  und dann zählt der Assistent beim Attributs-Schritt mit — Preis je Feld, Summe oben,
  beide Richtungen, dazu ein Knopf „Auf Budget verteilen". Standard ist **aus**.

  Die eine Frage, die dazu offen BLEIBT, ist deshalb keine Programmfrage mehr, sondern
  eine für den Tisch: **wenn ihr irgendwann kaufen wollt — mit welchem Budget?** Bis
  dahin passiert nichts.

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
