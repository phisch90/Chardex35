import { useMemo, useState } from "react";
import { displayName, isWeaponEntity, type Entity } from "@codex35/core";
import { S } from "../strings.js";
import { BottomSheet, Chip, GhostButton, SearchInput } from "./bits.js";
import { ItemName } from "./ItemName.js";

/**
 * Für WELCHE Waffe gilt das Talent — gewählt, nicht abgetippt.
 *
 * Sein Auftrag: „bei den Weapon Fokus sollte man nicht einfach im Bogen die Waffe
 * ändern können, sondern das muss man einmal machen, wenn man das Talent auswählt.
 * Und ansonsten kann man es nur ändern, wenn man im Bearbeiten Modus ist."
 *
 * Hier stand vorher ein `prompt()`, das die Waffen des Gepäcks NUMMERIERT aufzählte
 * und ein leeres Feld zum Abschreiben danebenstellte — genau das, was er bei den
 * Fertigkeits-Teilgebieten schon einmal beanstandet hat („sehr unprofessionell").
 * Dazu ein `alert()`, wenn keine Waffe im Gepäck lag: eine Sackgasse, denn ein
 * Talent darf man auch für eine Waffe nehmen, die man erst noch kauft.
 *
 * Zwei Abschnitte, seine Wahl: **Gepäck zuerst** (ein Tap für den Normalfall),
 * darunter ALLE Waffen mit Suche. Der Grund für die zweite Hälfte ist die Regel:
 * gewählt wird ein Waffen-TYP, kein Exemplar — `derive.ts` vergleicht `choiceRef`
 * gegen `entity.id` UND `entity.basedOn`, damit auch eine eigene Variante desselben
 * Typs den Bonus bekommt.
 *
 * Es gibt bewusst KEINEN Knopf „ohne Zuordnung": ein Talent ohne Waffe ist ein
 * Eintrag, der nichts tut. Wer sich nicht entscheiden will, schließt das Blatt —
 * dann wird das Talent gar nicht erst genommen.
 */
export function FeatWeaponPicker(props: {
  /** Das Talent, um das es geht — sein Name steht in der Überschrift. */
  feat: Entity | undefined;
  /** Alles, was die App kennt. Daraus kommt die vollständige Waffenliste. */
  compendium: ReadonlyMap<string, Entity>;
  /**
   * Die Waffen, die dieser Charakter WIRKLICH trägt (Kennung des Typs plus der
   * Name, unter dem sie auf seinem Bogen steht — eine eigene Waffe heißt dort
   * anders als im Kompendium).
   */
  own: { id: string; name: string }[];
  /** Was gerade gilt — damit die Zeile als gewählt zu erkennen ist. */
  current?: string | undefined;
  onPick: (choiceRef: string, name: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const weapons = useMemo(
    () =>
      [...props.compendium.values()]
        .filter((entity) => isWeaponEntity(entity) && !entity.deletedAt)
        .sort((a, b) => displayName(a).localeCompare(displayName(b))),
    [props.compendium],
  );

  const q = query.trim().toLowerCase();
  const shown = weapons.filter((entity) => {
    if (q === "") return true;
    const german = entity.localized?.de?.name ?? "";
    return entity.name.toLowerCase().includes(q) || german.toLowerCase().includes(q);
  });

  /*
    Doppelte raus: liegt das Langschwert im Gepäck, steht es oben — dann muss es
    nicht noch einmal in der langen Liste stehen. Sonst tippt man auf die zweite
    Zeile und hält die erste für kaputt.
  */
  const ownIds = new Set(props.own.map((entry) => entry.id));

  const featName = props.feat ? displayName(props.feat) : "";

  return (
    <BottomSheet open onClose={props.onClose} title={S.feats.chooseWeaponFor(featName)}>
      <p className="mb-2 text-xs leading-snug text-slate-400">{S.feats.chooseWeaponHint}</p>

      {props.own.length > 0 && (
        <div className="mb-3">
          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            {S.feats.weaponsCarried}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {props.own.map((entry) => (
              <Chip
                key={entry.id}
                active={props.current === entry.id}
                onClick={() => props.onPick(entry.id, entry.name)}
              >
                {entry.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {S.feats.weaponsAll}
      </h4>
      <SearchInput value={query} onChange={setQuery} placeholder={S.actions.search} />
      <ul className="mt-2 divide-y divide-slate-800">
        {shown.map((entity) => (
          <li key={entity.id} className="flex items-center justify-between gap-2 py-2">
            <span className="min-w-0 flex-1 text-sm">
              <ItemName entity={entity} />
            </span>
            <GhostButton onClick={() => props.onPick(entity.id, displayName(entity))}>
              {props.current === entity.id
                ? S.feats.weaponPicked
                : ownIds.has(entity.id)
                  ? S.feats.weaponPickCarried
                  : S.feats.weaponPick}
            </GhostButton>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="py-4 text-center text-sm text-slate-500">{S.feats.noWeaponMatches}</li>
        )}
      </ul>
    </BottomSheet>
  );
}
