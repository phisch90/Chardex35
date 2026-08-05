import { useState, type ReactNode } from "react";
import { displayName, type Entity } from "@codex35/core";
import { S } from "../strings.js";
import { Icon, type IconName } from "./icons.js";

/**
 * Auswahl als KACHELN mit einem Piktogramm.
 *
 * Sein Auftrag: „Danach hätte ich gerne die Volkauswahl als Kacheln mit jeweils einem
 * Piktogramm des Kopfes (wie bei BG3) der jeweiligen Rasse. Danach das selbe mit den
 * Klassen."
 *
 * Vorher war beides eine LISTE: pro Zeile ein Name, eine Kleinzeile, ein „Infos ▸".
 * Sieben Völker und elf Klassen liest man so von oben nach unten wie ein Formular — und
 * das Erste, was man an einer Figur wählt, ist die Stelle, an der eine App Lust machen
 * darf. Ein Bild je Wahl macht aus dem Formular eine Auswahl.
 *
 * Zwei Entscheidungen stecken in der Form:
 *
 *  - **Das Infofeld steht in VOLLER BREITE unter dem Raster**, nicht in der Kachel.
 *    `RaceInfo` und `ClassInfo` sind dichte Faktentabellen (Attribute, Rettungswürfe,
 *    Zaubergrade); in 170 px wären sie unlesbar. Dafür trägt es eine Überschrift mit dem
 *    Namen — losgelöst von der Zeile muss es selbst sagen, wovon es redet.
 *  - **Beim Auswählen klappt es von allein auf** (dieselbe Regel wie in der Liste vorher:
 *    man soll die Werte sehen, sobald man sich festlegt) und lässt sich für jeden anderen
 *    Eintrag zum Nachlesen aufziehen, BEVOR man sich festlegt.
 *
 * Das Piktogramm kommt von außen (`icon`), nicht aus einer Tabelle hier drin: für Völker
 * rechnet es `raceIconName` aus der Kennung, für Klassen liefert es `accentOfClass` — und
 * das ist derselbe Schlüssel, der am Bogen die Farbe und das Wasserzeichen bestimmt. Ein
 * eigenes Verzeichnis in diesem Bauteil wäre eine zweite Wahrheit: der Assistent zeigte
 * dann ein anderes Symbol als der Bogen danach.
 */
export function PickTiles(props: {
  items: Entity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Das Zeichen zu einem Eintrag. Kommt von außen — siehe oben. */
  icon: (entity: Entity) => IconName;
  /** Die Kleinzeile in der Kachel (`raceDetailLine` / `classDetailLine`). */
  detail: (entity: Entity) => string;
  /** Ohne diese Angabe hat die Kachel keinen Infos-Knopf und es öffnet sich nichts. */
  info?: (entity: Entity) => ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openEntity = props.items.find((entity) => entity.id === openId);

  return (
    <div>
      {props.items.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">{S.compendium.empty}</p>
      )}
      {/*
        Zwei Spalten am Handy (390 px trägt zwei Kacheln von rund 170 px), drei ab `sm`.
        Die Kacheln einer Reihe sind von allein gleich hoch — `grid` streckt sie —, damit
        eine lange Kleinzeile das Raster nicht ausbeult.
      */}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {props.items.map((entity) => {
          const chosen = props.selectedId === entity.id;
          const open = openId === entity.id;
          return (
            <li key={entity.id} className="flex">
              <div
                className={`flex w-full flex-col rounded-xl border ${
                  chosen ? "border-amber-500 bg-amber-600/10" : "border-slate-700 bg-slate-900/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    props.onSelect(entity.id);
                    setOpenId(entity.id);
                  }}
                  className="flex flex-1 flex-col items-center gap-1 px-2 pt-3 pb-2 text-center"
                >
                  {/*
                    Das Zeichen nimmt seine Farbe vom Knopf (`currentColor`) — beim
                    gewählten die Bedienfarbe, sonst gedämpft. Genau dafür sind die
                    Zeichen Striche und keine Emoji: bei einem Emoji bestimmt die
                    Schriftart des Geräts die Farbe.
                  */}
                  <span className={chosen ? "text-amber-300" : "text-slate-400"}>
                    <Icon name={props.icon(entity)} size={40} strokeWidth={1.3} />
                  </span>
                  <span className={`text-sm font-semibold leading-tight ${chosen ? "text-amber-200" : ""}`}>
                    {displayName(entity)}
                  </span>
                  <span className="text-[11px] leading-tight text-slate-400">
                    {props.detail(entity)}
                  </span>
                </button>
                {props.info && (
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : entity.id)}
                    className="px-2 pb-2 text-[11px] text-slate-400 underline decoration-dotted hover:text-amber-300"
                  >
                    {open ? "Infos ausblenden ▾" : "Infos ▸"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {props.info && openEntity && (
        <div className="mt-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold">{displayName(openEntity)}</span>
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="text-[11px] text-slate-400 underline decoration-dotted hover:text-amber-300"
            >
              Infos ausblenden ▾
            </button>
          </div>
          {props.info(openEntity)}
        </div>
      )}
    </div>
  );
}
