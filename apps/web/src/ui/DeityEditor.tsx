import { useMemo, useState } from "react";
import {
  buildDeity,
  displayName,
  domainSpellLists,
  isWeaponEntity,
  type DeityEntity,
  type Entity,
} from "@codex35/core";
import { S } from "../strings.js";
import { BottomSheet, Chip, Field, PrimaryButton, SearchInput, inputClass } from "./bits.js";
import { ConfirmDeleteButton } from "./ConfirmDelete.js";
import { ItemName } from "./ItemName.js";

/**
 * Eine eigene Gottheit anlegen oder bearbeiten.
 *
 * Sein Auftrag: „Ich möchte auch gerne die Götter mit reinbringen, sodass wir die
 * Domains des clerics korrekt verwenden können." Die App liefert keine Götter mit
 * (deren Namen gehören nicht zum freien SRD, nur die Domänen) — sie liefert das
 * FACH: Name, Domänen aus den 32 SRD-Domänen, Lieblingswaffe, Gesinnung.
 *
 * Dieselbe Bauform wie der `ItemEditor`: ein Entwurf für das ganze Formular,
 * gespeichert erst beim Übernehmen — eine Gottheit entsteht als Ganzes oder gar
 * nicht. Und dieselbe Regel wie überall: die Möglichkeiten stehen als Knöpfe da
 * (Domänen-Chips, Waffenliste mit Suche), nichts wird abgetippt.
 */
export function DeityEditor({
  compendium,
  existing,
  usedByNames,
  onRemove,
  onClose,
  onSave,
}: {
  compendium: Map<string, Entity>;
  /** Gesetzt beim Bearbeiten, `undefined` beim Anlegen. */
  existing?: DeityEntity | undefined;
  /** Bögen, deren `deityRef` auf diese Gottheit zeigt — für den Satz am Löschen. */
  usedByNames?: string[] | undefined;
  /** Fehlt beim Anlegen — dann steht der Bereich gar nicht da. */
  onRemove?: (() => void) | undefined;
  onClose: () => void;
  /** Bekommt die fertige Entity; das Speichern selbst macht der Aufrufer. */
  onSave: (entity: DeityEntity) => void;
}) {
  const isNew = existing === undefined;
  const [name, setName] = useState(existing?.name ?? "");
  const [alignment, setAlignment] = useState(existing?.data.alignment ?? "");
  const [domainIds, setDomainIds] = useState<string[]>(existing?.data.domainIds ?? []);
  const [weaponId, setWeaponId] = useState<string | undefined>(existing?.data.favoredWeaponId);
  const [weaponQuery, setWeaponQuery] = useState("");

  const domains = useMemo(() => domainSpellLists(compendium), [compendium]);

  const weapons = useMemo(
    () =>
      [...compendium.values()]
        .filter((entity) => isWeaponEntity(entity) && !entity.deletedAt)
        .sort((a, b) => displayName(a).localeCompare(displayName(b))),
    [compendium],
  );
  const q = weaponQuery.trim().toLowerCase();
  /*
    Die Waffenliste steht nur bei einer SUCHE offen — 100+ Zeilen dauerhaft im
    Formular würden die Domänen darunter begraben. Die gewählte Waffe steht
    immer da, mit ihrem eigenen Entfernen-Knopf.
  */
  const weaponMatches =
    q === ""
      ? []
      : weapons
          .filter(
            (entity) =>
              entity.name.toLowerCase().includes(q) ||
              (entity.localized?.de?.name ?? "").toLowerCase().includes(q),
          )
          .slice(0, 20);
  const chosenWeapon = weaponId !== undefined ? compendium.get(weaponId) : undefined;

  const toggleDomain = (id: string) =>
    setDomainIds(domainIds.includes(id) ? domainIds.filter((d) => d !== id) : [...domainIds, id]);

  /*
    Gesperrt MIT Grund: ein Knopf, der stumm nicht geht, sieht wie ein Fehler aus.
    Ohne Domänen wäre die Gottheit obendrein falsch herum wirksam — die Prüfung
    am Bogen hielte dann JEDE gewählte Domäne für fremd.
  */
  const problem =
    name.trim() === ""
      ? S.compendium.deity.needName
      : domainIds.length === 0
        ? S.compendium.deity.needDomains
        : null;

  const submit = () => {
    if (problem !== null) return;
    const weaponName = chosenWeapon !== undefined ? displayName(chosenWeapon) : undefined;
    const built = buildDeity({
      name: name.trim(),
      domainIds,
      favoredWeaponId: weaponId,
      favoredWeaponName: weaponName,
      alignment: alignment.trim() === "" ? undefined : alignment.trim(),
      /*
        Beim Bearbeiten bleibt die Kennung — Bögen zeigen mit `deityRef` darauf.
        `rev` trägt der Aufrufer weiter (`saveHomebrew` zählt hoch).
      */
      id: existing?.id,
    });
    onSave(isNew ? built : { ...built, rev: existing.rev });
    onClose();
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={isNew ? S.compendium.deity.titleNew : S.compendium.deity.titleEdit}
    >
      <div className="space-y-3">
        <Field label={S.compendium.deity.name}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={S.compendium.deity.namePlaceholder}
            className={inputClass}
          />
        </Field>

        <Field label={S.compendium.deity.alignment}>
          <input
            value={alignment}
            onChange={(e) => setAlignment(e.target.value)}
            placeholder={S.compendium.deity.alignmentPlaceholder}
            className={inputClass}
          />
        </Field>

        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            {S.compendium.deity.domains}{" "}
            {domainIds.length > 0 && (
              <span className="normal-case text-slate-500">
                — {S.compendium.deity.domainsCount(domainIds.length)}
              </span>
            )}
          </div>
          <p className="mb-1.5 mt-0.5 text-[11px] leading-snug text-slate-500">
            {S.compendium.deity.domainsHint}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {domains.map((domain) => (
              <Chip
                key={domain.id}
                active={domainIds.includes(domain.id)}
                onClick={() => toggleDomain(domain.id)}
              >
                {domain.name.replace(/ Domain$/, "")}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            {S.compendium.deity.favoredWeapon}
          </div>
          <p className="mb-1.5 mt-0.5 text-[11px] leading-snug text-slate-500">
            {S.compendium.deity.favoredWeaponHint}
          </p>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-sm">
            {chosenWeapon !== undefined ? (
              <>
                <span className="rounded-lg bg-slate-800 px-2 py-0.5">
                  <ItemName entity={chosenWeapon} />
                </span>
                <button
                  onClick={() => setWeaponId(undefined)}
                  className="text-xs text-slate-400 underline hover:text-rose-300"
                >
                  {S.compendium.deity.clearWeapon}
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-500">{S.compendium.deity.favoredWeaponNone}</span>
            )}
          </div>
          <SearchInput value={weaponQuery} onChange={setWeaponQuery} placeholder={S.actions.search} />
          {weaponMatches.length > 0 && (
            <ul className="mt-1.5 divide-y divide-slate-800 rounded-lg border border-slate-800">
              {weaponMatches.map((entity) => (
                <li key={entity.id}>
                  <button
                    onClick={() => {
                      setWeaponId(entity.id);
                      setWeaponQuery("");
                    }}
                    className="w-full px-2.5 py-1.5 text-left text-sm hover:bg-slate-800/60"
                  >
                    <ItemName entity={entity} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <PrimaryButton onClick={submit} disabled={problem !== null}>
            {isNew ? S.compendium.deity.create : S.compendium.deity.saveChanges}
          </PrimaryButton>
          {problem !== null && <span className="text-xs text-slate-500">{problem}</span>}
        </div>

        {onRemove !== undefined && existing !== undefined && (
          <div className="border-t border-slate-800 pt-2">
            {usedByNames !== undefined && usedByNames.length > 0 && (
              <p className="mb-1.5 text-[11px] leading-snug text-amber-300/90">
                {S.compendium.deity.removeNote(usedByNames)}
              </p>
            )}
            <ConfirmDeleteButton
              label={existing.name}
              onConfirm={() => {
                onRemove();
                onClose();
              }}
            />
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
