import { GhostButton } from "./bits.js";
import { ACCENT_KEYS, ACCENT_HINTS, ACCENT_LABELS, type AccentKey } from "./classAccents.js";

/**
 * Das Farbthema DIESES Bogens von Hand wählen.
 *
 * Gefragt und entschieden: „automatisch aus der Klasse, aber je Bogen überschreibbar" —
 * dasselbe Muster wie die Kampagnenfarbe. Der Normalfall braucht hier nichts: wer nichts
 * anfasst, bekommt die Farbe seiner Klasse.
 *
 * Elf Knöpfe statt eines Auswahlfelds, aus demselben Grund wie bei den Teilgebieten: wo die
 * App die Möglichkeiten KENNT, gehört jede einzelne als Knopf hin. Und weil eine Farbe ohne
 * Farbsehen nichts sagt, steht an jedem der NAME — „Fromm", nicht ein blauer Fleck.
 *
 * Die Vorschau kann NICHT die echten Themen-Variablen benutzen: die hängen am `<html>`, und
 * elf Vorschauen bräuchten elf Wurzeln. Der Punkt trägt deshalb dieselbe Rechnung wie
 * `styles.css` — Helligkeit und Sättigung von `amber-400`, nur mit dem Farbton der Klasse.
 * Zwei Wahrheiten wären das nicht, solange die Zahlen aus derselben Zeile stammen; wer die
 * Rampe ändert, ändert beide.
 */
const PREVIEW: Record<AccentKey, string> = {
  wild: "oklch(82.8% 0.1512 40)",
  verspielt: "oklch(82.8% 0.1040 185)",
  fromm: "oklch(82.8% 0.0662 240)",
  natur: "oklch(82.8% 0.1229 130)",
  stahl: "oklch(82.8% 0.0378 245)",
  ruhe: "oklch(82.8% 0.1796 65)",
  edel: "oklch(82.8% 0.1134 272)",
  faehrte: "oklch(82.8% 0.0662 120)",
  schatten: "oklch(82.8% 0.0756 160)",
  funke: "oklch(82.8% 0.1134 330)",
  zeichen: "oklch(82.8% 0.0945 285)",
};

export function AccentPicker(props: {
  /** Was am Bogen steht — `undefined` heißt „aus der Klasse". */
  value: string | undefined;
  /** Welches Thema die Klasse vorgibt (für die Beschriftung von „Automatisch"). */
  fromClass: AccentKey | undefined;
  onChange: (next: AccentKey | undefined) => void;
  onClose: () => void;
}) {
  const active = props.value;
  const autoLabel =
    props.fromClass === undefined
      ? "Automatisch (Klasse ohne eigenes Thema)"
      : `Automatisch — ${ACCENT_LABELS[props.fromClass]}`;

  return (
    <div className="rounded-lg border border-slate-700 p-3">
      <p className="mb-2 text-xs text-slate-400">
        Die Farbe dieses Bogens. Ohne Auswahl kommt sie aus der Klasse mit den meisten
        Stufen.
      </p>

      <button
        onClick={() => props.onChange(undefined)}
        aria-pressed={active === undefined}
        className={`mb-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
          active === undefined
            ? "border-amber-600 bg-amber-950/40 text-amber-200"
            : "border-slate-700 text-slate-300 hover:bg-slate-800"
        }`}
      >
        <span aria-hidden="true" className="text-base leading-none">
          ⟳
        </span>
        {autoLabel}
      </button>

      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {ACCENT_KEYS.map((key) => {
          const on = active === key;
          return (
            <li key={key}>
              <button
                onClick={() => props.onChange(key)}
                aria-pressed={on}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left ${
                  on
                    ? "border-amber-600 bg-amber-950/40"
                    : "border-slate-700 hover:bg-slate-800"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 rounded-full ${on ? "ring-2 ring-slate-100" : "ring-1 ring-slate-600"}`}
                  style={{ background: PREVIEW[key] }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm">{ACCENT_LABELS[key]}</span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {ACCENT_HINTS[key]}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-2">
        <GhostButton onClick={props.onClose}>Fertig</GhostButton>
      </div>
    </div>
  );
}
