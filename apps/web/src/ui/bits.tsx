import type { ReactNode } from "react";

/**
 * Die Karte — Rahmen, Fläche, Polster.
 *
 * `tone` und `padding` sind ERSATZ, nicht Ergänzung, und das ist der Grund, warum
 * sie überhaupt existieren: eine Klasse, die über `className` hinten angehängt wird,
 * gewinnt NICHT automatisch. Tailwind entscheidet bei gleicher Spezifität nach der
 * Reihenfolge im Stylesheet, und dort steht `slate` hinter allen Buntfarben. Ein
 * `bg-emerald-950/40` im `className` blieb deshalb wirkungslos — die Kampagnenfarbe
 * war unsichtbar, obwohl die Klasse am Element stand. Dasselbe für `p-2` gegen das
 * eingebaute `p-3`. Wer die Farbe oder das Polster ändern will, ERSETZT es hier.
 */
export function Card(props: {
  children: ReactNode;
  className?: string;
  /** Rahmen und Fläche, statt des grauen Standards. */
  tone?: string | undefined;
  /** Polster, statt `p-3`. */
  padding?: string | undefined;
}) {
  /*
    `karte` ist kein Tailwind, sondern der GRIFF, an dem ein Papier den Kasten anfassen
    darf (`styles.css`, Abschnitt D): der kopierte Bogen nimmt den Schatten weg und rahmt
    dünn, die Kladde unterstreicht.

    Warum überhaupt ein Griff: bis dahin konnte ein Material nur Farben tauschen, und
    genau das war sein Einwand — „ich sehe grad, dass ja nur die Kontrastfarben ändern".
    Schatten und Rahmenstärke stehen in Hilfsklassen, und eine CSS-Variable gibt es dafür
    nicht. Ein Griff je Bauteil ist die kleinste Antwort darauf.

    Was das Papier an diesem Griff NICHT ändern darf: Farbe und Ecken. Die Farbe gehört
    der Kampagne (`tone`), die Ecken gehören der Klasse.

    `border-2` statt `border` ist sein Auftrag: „Einen kräftigen Rahmen um alles." Ein
    Pixel Rahmen verschwindet auf einem Handy mit dreifacher Auflösung fast; zwei sind der
    Unterschied zwischen einem angedeuteten und einem gezogenen Strich. Die FARBE des
    Rahmens kommt bei offenem Bogen von der Klasse (`styles.css`, Abschnitt C2).

    `relative` verschiebt nichts und hat trotzdem einen Grund: das Wasserzeichen am Bogen
    ist absolut gesetzt und steht VOR den Karten im Quelltext. Ohne `relative` an der Karte
    würde es darüber gezeichnet. Der naheliegende Weg — `isolate` am Bogen plus `-z-10` am
    Zeichen — hat dafür jeden Dialog des Bogens unter die Hauptnavigation gelegt.
  */
  return (
    <div
      className={`karte relative rounded-xl border-2 shadow-sm ${props.tone ?? "border-slate-700/60 bg-slate-900/70"} ${props.padding ?? "p-3"} ${props.className ?? ""}`}
    >
      {props.children}
    </div>
  );
}

/**
 * Die Abschnitts-Überschrift — und die Stelle, an der die ZWEITE Farbe der Klasse arbeitet.
 *
 * `text-trim-400` ist ohne Klassenthema genau das alte `slate-400` (der Standardwert steht in
 * `styles.css` bei `:root`). Mit Thema wird daraus das Gold des Paladins, die Rinde des
 * Druiden, die Koralle des Barden.
 *
 * Der Job der Zierfarbe: sie färbt, was der Bogen über SICH sagt. Die Bedienfarbe färbt, was
 * man drücken kann. Ohne diese Trennung wären es zwei Farben mit derselben Bedeutung — und
 * dann bedeutet keine etwas.
 *
 * `tracking-widest` bleibt stehen und ist trotzdem je Klasse anders: Tailwind liest die
 * Laufweite aus `--tracking-widest`, und die setzt das Thema. Der Mönch bekommt Luft, der
 * Barbar drängt.
 */
export function SectionTitle(props: { children: ReactNode }) {
  return (
    <h2 className="abschnitt mb-2 text-xs font-semibold uppercase tracking-widest text-trim-400">
      {props.children}
    </h2>
  );
}

export function fmtMod(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/**
 * Der Würfelausdruck zu einem Modifikator — mit GANZER Zahl.
 *
 * Gefunden beim Aufräumen der halben Fertigkeitsränge, und es ist die Fehlerfamilie
 * „etwas weiß es, und etwas anderes kann es nicht" in Reinform: liegt am Bogen ein halber
 * Rang, ist der Gesamtwert selbst krumm (2,5 Ränge + DEX 2 = 4,5). Daraus baute die
 * Anzeige „1d20+4.5" — `parseDice` kennt keine Dezimalstellen und gibt `null` zurück, und
 * `diceStore.roll` macht daraus ein stilles `return null`. Der Würfelknopf an dieser Zeile
 * tat also GAR NICHTS, ohne ein Wort dazu.
 *
 * Abgerundet wie überall in 3.5 (aus 4,5 wird 4, aus −1,5 wird −2). Dass der Wert
 * überhaupt krumm ist, sagt die Warnung „half-rank" am Fertigkeits-Reiter — hier wird
 * nichts vertuscht, hier wird nur gewürfelt.
 */
export function d20Roll(modifier: number): string {
  const whole = Math.floor(modifier);
  return `1d20${whole >= 0 ? "+" : ""}${whole}`;
}

/**
 * Antippbarer Wert — das zentrale Interaktionsmuster des Bogens:
 * kurzer Tap öffnet den Breakdown, „Würfeln"-Knopf daneben rollt 1d20+X.
 * `sub` erlaubt eine kleine Zweitangabe (z.B. der Attributswert neben dem Mod).
 */
export function StatButton(props: {
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
  big?: boolean;
}) {
  const inner = (
    <>
      <span className="flex items-baseline gap-1">
        <span className={props.big ? "text-2xl font-bold" : "text-lg font-semibold"}>
          {props.value}
        </span>
        {props.sub && <span className="text-xs text-slate-400">{props.sub}</span>}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-slate-400">{props.label}</span>
    </>
  );
  const shell = "flex min-w-16 flex-col items-center rounded-lg border border-slate-700/60 bg-slate-800/60 px-2 py-1.5 text-center text-slate-100";
  // Ohne Handler eine Kachel, kein Knopf: ein Knopf, der auf Tap nichts tut,
  // verspricht etwas, das nicht kommt.
  if (!props.onClick) return <div className={shell}>{inner}</div>;
  return (
    <button onClick={props.onClick} className={`${shell} transition-colors active:bg-slate-700`}>
      {inner}
    </button>
  );
}

/** Bottom-Sheet, mobil-first; auf Desktop mittig als Dialog. */
export function BottomSheet(props: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog">
      <div className="absolute inset-0 bg-black/60" onClick={props.onClose} />
      <div className="relative max-h-[80vh] w-full overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-2xl">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold">{props.title}</h3>
          <button
            onClick={props.onClose}
            className="rounded-full px-3 py-1 text-slate-400 hover:bg-slate-800"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}

export function SearchInput(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
    />
  );
}

export function PrimaryButton(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow enabled:hover:bg-amber-500 disabled:opacity-40"
    >
      {props.children}
    </button>
  );
}

export function GhostButton(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Klartext für Icon-Knöpfe — Tooltip und Screenreader-Beschriftung. */
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      aria-label={props.title}
      className={`rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40 ${
        props.danger
          ? "border-red-700 text-red-400 enabled:hover:bg-red-950"
          : "border-slate-600 text-slate-200 enabled:hover:bg-slate-800"
      }`}
    >
      {props.children}
    </button>
  );
}

/*
  Die drei Formular-Bausteine.

  Sie stehen hier, weil dieselbe Klassenkette bisher an sechs Stellen kopiert war
  (Identity, CombatOptions, CharacterWizard, FeatModifiers, Hands, SpellsTab) und
  der Gegenstands-Editor die siebte Kopie geworden wäre. Die 390-px-Regeln stecken
  darin: Beschriftung ÜBER dem Feld statt daneben, sobald sie länger als fünf
  Zeichen ist, und der Hinweissatz darunter statt in einem Tooltip — auf dem Handy
  gibt es kein „darüberfahren".
*/

/** Beschriftung, Feld, Hinweis — untereinander. */
export function Field(props: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-slate-400">{props.label}</span>
      {props.children}
      {props.hint !== undefined && (
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{props.hint}</span>
      )}
    </label>
  );
}

/** Die gemeinsame Kette für Textfelder und Auswahlfelder. */
export const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none";

export function SelectField(props: {
  label: string;
  hint?: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={props.label} {...(props.hint === undefined ? {} : { hint: props.hint })}>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className={inputClass}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/**
 * Zahl mit −/+ statt Tastatur.
 *
 * Wörtlich aus dem Kampf-Reiter übernommen, wo die Begründung steht: „am Tisch
 * wird das mit einer Hand bedient, und eine Bildschirmtastatur für ‚4' ist ein
 * Ärgernis." Bei der Obergrenze ist Schluss — ungebremst kam dort „Nahkampf −89,
 * Schaden 2d6+204" heraus.
 *
 * `format` ist für Werte, die anders aussehen als sie gespeichert sind: der
 * Fertigkeits-Malus steht als 0…12 im Regler und wird als „−6" angezeigt, weil im
 * Buch ein Minuszeichen davor steht.
 */
export function NumberStepper(props: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const min = props.min ?? 0;
  const step = props.step ?? 1;
  const shown = props.format ? props.format(props.value) : String(props.value);
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <div className="text-sm">{props.label}</div>
        {props.hint !== undefined && (
          <div className="text-[11px] leading-snug text-slate-500">{props.hint}</div>
        )}
      </div>
      {/*
        Die Knöpfe bekommen einen Klartext-Namen. Ein „−" allein ist für die
        Vorlesefunktion sinnlos („Knopf, Minus") — mit Beschriftung wird daraus
        „RK-Bonus verringern". Nebenbei sind sie damit auch eindeutig ansprechbar,
        wenn drei Regler untereinander stehen.
      */}
      <GhostButton
        title={`${props.label} verringern`}
        disabled={props.value <= min}
        onClick={() => props.onChange(Math.max(min, props.value - step))}
      >
        −
      </GhostButton>
      <span
        className={`w-9 text-center font-mono text-lg ${
          props.value > min ? "text-amber-300" : "text-slate-500"
        }`}
      >
        {shown}
      </span>
      <GhostButton
        title={`${props.label} erhöhen`}
        disabled={props.value >= props.max}
        onClick={() => props.onChange(Math.min(props.max, props.value + step))}
      >
        +
      </GhostButton>
    </div>
  );
}

/*
  „Da ist noch etwas offen" — EINE Farbe für alle drei Stellen, die es sagen: der
  Punkt an der Reiterleiste, die Marke auf der Startseite, die Karte oben am Bogen.

  Sie war amber, und damit dieselbe Farbe wie alles andere in dieser App: der aktive
  Reiter, die Sterne an den Klassenfertigkeiten, jeder Hauptknopf. Am Handy sitzt der
  Punkt zusätzlich AM ZEICHEN — über „Zauber" stand damals ✨, und ein gelber Punkt an
  gelben Funken ist kein Punkt mehr. Sein Wort dazu: „Übersieht man leicht."

  Das Emoji ist inzwischen ein gezeichnetes Zeichen (`ui/icons.tsx`), die Farbe dahinter
  also unsere. Am Punkt ändert das nichts: sie ist die KLASSENFARBE und wechselt je
  Bogen, ein gelber Punkt läge beim Paladin also weiter auf Gold.

  Rosé bedeutet im Bogen sonst nichts (rot ist der TP-Balken, grün der gesunde Stand,
  amber die Bedienung), und weil der Punkt jetzt die einzige rosé Sache in der
  Reiterleiste ist, muss ihn auch der Test nicht mehr am Durchmesser vom Unterstrich
  des aktiven Reiters unterscheiden.
*/
export const OPEN_MARK = "border border-rose-700/70 bg-rose-950/60 text-rose-200";
export const OPEN_CARD = "border-rose-800/70 bg-slate-900";

/**
 * Der Punkt. `className` trägt nur Lage und Abstand — Farbe und Größe stehen HIER,
 * weil eine hinten angehängte Klasse bei gleicher Spezifität nicht gewinnt (dieselbe
 * Regel wie bei `Card`).
 *
 * `ring` trennt den Punkt von dem, was hinter ihm liegt: in der unteren Leiste sind das
 * die Striche des Zeichens, und die tragen die Farbe der Klasse. Wo er hinter einem Wort
 * steht, braucht er den Ring nicht.
 *
 * Ohne `label` ist er für den Vorleser unsichtbar — in der unteren Leiste sagt schon
 * der Knopf, was offen ist, und zweimal dasselbe zu hören hilft niemandem.
 */
export function OpenDot(props: {
  label?: string | undefined;
  className?: string | undefined;
  ring?: boolean | undefined;
}) {
  return (
    <span
      {...(props.label === undefined
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": props.label, title: props.label })}
      className={`inline-block h-2 w-2 rounded-full bg-rose-500 ${
        props.ring === false ? "" : "ring-2 ring-slate-900"
      } ${props.className ?? ""}`}
    />
  );
}

export function Chip(props: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  /**
   * Sichtbar, aber noch nicht benutzbar — für die Schritte des Assistenten, die
   * hinter einer Sperre liegen. Ausblenden wäre falsch: dann weiß er nicht, was noch
   * kommt.
   */
  dimmed?: boolean;
  /** Grund, warum es (noch) nicht geht — Tooltip und Vorlese-Beschriftung. */
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.dimmed === true}
      {...(props.title === undefined ? {} : { title: props.title, "aria-label": props.title })}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        props.dimmed === true
          ? "border-slate-800 text-slate-600"
          : props.active
            ? "border-amber-500 bg-amber-600/20 text-amber-300"
            : "border-slate-600 text-slate-300 hover:bg-slate-800"
      }`}
    >
      {props.children}
    </button>
  );
}
