/**
 * Wann wird es DICHTER? — die Antwort an EINER Stelle.
 *
 * Sein Befund zum iPad war „Sieht kacke Aus", und auf die Frage, was mit dem Platz
 * geschehen soll, hat er entschieden: **„Dichter: drei Kacheln je Reihe werden sechs."**
 *
 * Damit kommt die fünfte Falle dieses Projekts in ihrer nächsten Gestalt. Bisher hieß
 * sie: wer ein Maß der HÜLLE einrechnet, muss prüfen, ob die Hülle in dieser Breite
 * dieselbe ist. Hier ist es schärfer — das Fenster sagt gar nichts mehr darüber aus, wie
 * breit eine Karte wirklich ist:
 *
 * | Fenster | wie der Bogen steht | Karte innen |
 * |---|---|---|
 * | iPhone 390 | eine Spalte | 342 px |
 * | iPad hoch 820 | eine Spalte | 707 px |
 * | iPad quer 1180, zwei Ansichten | zwei Spalten | 494 px |
 * | iPad quer 1180, eine Ansicht | eine Spalte | 1039 px |
 * | Fenster ab 1440 | eine Spalte | 1088 px — und mehr wird es nie |
 *
 * Dasselbe quere iPad trägt also 494 oder 1039 px, je nachdem, ob die zweite Ansicht
 * offen ist. Ein `lg:` am Fenster könnte beide nicht auseinanderhalten und würde sechs
 * Kacheln in 494 px pressen. Deshalb fragen diese Regeln den KASTEN (`@container`) und
 * nicht den Schirm.
 *
 * **Die letzte Zeile der Tabelle ist eine Schranke und kein Beiwerk:** `BLATT_BREITE`
 * deckelt den Bogen bei `lg:max-w-6xl` (1152 px), also wird die Karte innen nie breiter
 * als 1088 px — nachgemessen bei 1180, 1440, 1920 und 2560 px Fensterbreite, dreimal
 * dasselbe Ergebnis. Eine Schwelle bei `@6xl` (1152 px) wäre damit eine Regel, die
 * NIEMALS greift. Die erste Fassung hatte zwei davon; gefunden hat sie die Gegenprüfung,
 * nicht das Nachdenken.
 *
 * Und die Schwellen sind gemessen und nicht gerechnet. Die Rechnung war sogar falsch:
 * `FLAT-FOOTED` braucht bei `text-[10px]` rund 74 px, sechs Kacheln plus Lücken also
 * rund 580 px — danach hätte die Schwelle bei 42rem gelegen, und das quere iPad mit zwei
 * Ansichten wäre bei drei Kacheln geblieben. Also genau der Zustand, aus dem sein Befund
 * kam. Das Bild hat die Rechnung widerlegt: bei 494 px sind die Kacheln 75 px breit, und
 * von zwölf Beschriftungen bricht genau EINE um — die Karte wird dabei von 396 auf
 * 232 px kürzer. Ein Umbruch in einer von zwölf Kacheln ist besser als 161 px Leere in
 * allen zwölf.
 */

/**
 * Macht einen Kasten MESSBAR. Gehört an den Inhalt einer Karte und nicht an die Karte
 * selbst: gemessen werden soll der Platz, der für die Kacheln übrig ist.
 *
 * **Und das ist kein harmloses Attribut.** `container-type: inline-size` schaltet
 * `contain: layout style inline-size` ein, und Layout-Containment erzeugt einen
 * STAPELKONTEXT und einen enthaltenden Block für alles, was darin `absolute` oder
 * `fixed` steht. Das ist dieselbe Falle, die diesem Projekt schon eine Teststrecke
 * gekostet hat, als am Wurzelkasten des Bogens `isolation: isolate` stand und damit jedes
 * Blatt (⋯-Menü, Würfelblatt, HP-Feld) hinter der Hauptnavigation lag.
 *
 * Deshalb steht dieser Griff nur um KACHELN und LISTEN und nie um einen ganzen Bogen
 * oder um `Card`. In den vier Teilbäumen, die ihn heute tragen, gibt es keine einzige
 * Klasse `absolute` oder `fixed` — die Blätter werden alle weiter oben gerendert
 * (`openBreakdown` in `pages/sheet/index.tsx`, `SubtypePicker` als Geschwister der
 * Liste). Wer hier ein Blatt einhängt, hängt es hinter die Leiste.
 */
export const MESSBAR = "@container";

/**
 * Vier Gruppen à drei Kacheln („Auf einen Blick"): untereinander, ab 28rem zwei Gruppen
 * nebeneinander (SECHS Kacheln je Reihe), ab 64rem alle vier (zwölf in einer Reihe).
 *
 * Gemessen: 396 px hoch am iPhone · 232 px je Spalte im geteilten Querformat · 221 px im
 * Hochformat · 145 px im ungeteilten Querformat, wo alle zwölf Werte in EINER Reihe
 * stehen. Genau das meint „auf einen Blick".
 *
 * Zwei GRUPPEN nebeneinander und nicht sechs Kacheln in einem Raster: die Dreiergruppe
 * ist seine Entscheidung aus der Kachel-Runde (sie ist der Grund, warum Grapple bei der
 * Bewegung steht und nicht beim Angriff). Ein Raster über alle zwölf hätte die Reihen
 * wieder aus der Spaltenzahl gemacht statt aus der Bedeutung — genau sein alter Einwand:
 * „die Kacheln aber bitte noch etwas klarer differenzieren."
 */
export const GRUPPEN = "grid gap-x-4 gap-y-2.5 @md:grid-cols-2 @5xl:grid-cols-4";

/**
 * Eine Reihe gleichartiger Kacheln (die sechs Attribute): drei, ab 28rem sechs.
 *
 * Das stand vorher als `grid-cols-3 sm:grid-cols-6` da — also am FENSTER. Dieselbe Zahl
 * kommt heraus, solange der Bogen eine Spalte ist; im geteilten Querformat ist das
 * Fenster 1180 px breit und die Karte 494, und `sm:` hätte dort nach dem Schirm
 * entschieden statt nach dem Platz. Dass es zufällig stimmte, ist kein Grund, es so zu
 * lassen: `equipped` statt `slot` hat auch einmal zufällig gestimmt.
 */
export const KACHELN = "grid grid-cols-3 gap-2 @md:grid-cols-6";

/**
 * Eine Liste schmaler Zeilen (die Fertigkeiten): eine Spalte, ab 28rem zwei, ab 64rem
 * drei. Gemessen am Kasten und nicht am Fenster.
 *
 * Im BEARBEITEN-Modus erst ab 48rem und dann auch nur zweispaltig, und das ist keine
 * Vorsicht, sondern dieselbe Messung: dort trägt jede Zeile zusätzlich ✕, − und +, also
 * rund 120 px mehr. Drei Spalten wären bei der größtmöglichen Kastenbreite 352 px je
 * Spalte — zu knapp, also gibt es die Stufe dort nicht. Eine Schwelle, die den breiteren
 * Zustand nicht kennt, erzeugt genau die Zeile, die dieses Projekt schon dreimal bezahlt
 * hat: die, in der vom Namen `Fertigk…` übrig bleibt.
 *
 * KEIN `divide-y` mehr, sondern ein Strich je Zeile — und der Grund ist nicht der, den
 * ich zuerst hingeschrieben hatte. Tailwind 4 zeichnet `divide-y` als `border-bottom` an
 * alle Kinder AUSSER dem letzten (das steht seit der Talente-Runde eigens gemessen in
 * `CLAUDE.md`). In zwei Spalten ist der letzte im DOM die Zelle unten RECHTS: ihr fehlt
 * der Strich, der Zelle unten links bleibt einer, und der untere Rand der Karte ist
 * halb gestrichen. Ein Strich an jeder Zeile ist symmetrisch — und er trennt am Ende der
 * Fertigkeiten die Liste von ihrer Legende, was vorher niemand tat.
 */
export const listeZweispaltig = (breiteZeilen: boolean): string =>
  breiteZeilen
    ? "@3xl:grid @3xl:grid-cols-2 @3xl:gap-x-4"
    : "@md:grid @md:grid-cols-2 @md:gap-x-4 @5xl:grid-cols-3";

/**
 * Die Zauberliste je Grad — die längste Liste des Bogens (bei seinem Kleriker rund 80
 * Zeilen auf drei Graden; der Reiter war im Hochformat 7465 px hoch und ist es jetzt
 * noch zu 4245).
 *
 * Eigene Schwelle und nicht die der Fertigkeiten, weil die Zeile eine andere ist: unter
 * dem Namen steht eine Knopfreihe mit bis zu drei Knöpfen („Wirken", „Vorbereiten",
 * „Noch einen"), die zusammen rund 230 px brauchen. Bei 494 px Kastenbreite blieben je
 * Spalte 239 px — zu knapp, um es zu behaupten. Ab 42rem sind es rund 328 px, ab 64rem
 * drei Spalten zu 335 px, und beides ist mehr, als die Zeile am Handy heute hat.
 *
 * Der Grad-KOPF bleibt über beiden Spalten: er trägt die Zahl der freien Plätze und die
 * Punkte, und die gelten für den ganzen Grad und nicht für eine Spalte.
 */
export const ZAUBERLISTE = "@2xl:grid @2xl:grid-cols-2 @2xl:gap-x-4 @5xl:grid-cols-3";
