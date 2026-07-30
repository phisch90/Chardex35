import { useState } from "react";
import { HOMEBREW_ITEM_KINDS, type Entity, type ItemEntity, type ItemGroup } from "@codex35/core";
import { S } from "../strings.js";
import {
  BottomSheet,
  Chip,
  Field,
  GhostButton,
  NumberStepper,
  PrimaryButton,
  SelectField,
  inputClass,
} from "./bits.js";
import { ItemPicker } from "./ItemPicker.js";
import { itemSummary } from "./itemSummary.js";
import {
  EMPTY_ITEM_DRAFT,
  draftFromEntity,
  draftFromTemplate,
  draftProblems,
  draftToEntity,
  fieldsFor,
  type ItemDraft,
} from "./itemDraft.js";

/**
 * Eigene Gegenstände mit ECHTEN Werten.
 *
 * Bisher gab es dafür „+ Freier Gegenstand": zwei Systemdialoge (`prompt`) für
 * Name und Gewicht, und heraus kam eine Zeile ohne Wirkung. Eine eigene Rüstung
 * konnte man damit nicht anlegen — es fehlten DEX-Grenze und Fertigkeits-Malus —
 * und eine eigene Waffe bekam keine Angriffszeile. Das war Philipps Lücke:
 * „außerdem möchte ich wie bei FC3 eigene erstellen können […] Die dann auch
 * wirklich rechnen."
 *
 * Zwei Entscheidungen, die man beim Lesen sonst für Zufall hält:
 *
 * **Ein Entwurf für das ganze Formular, gespeichert erst beim Übernehmen.** Das
 * ist NICHT die Falle aus dem Prüfbericht („ein Feld, das seinen Wert in eine
 * eigene Kopie zieht und nur beim Verlassen speichert"). Dort ging Tippen
 * verloren, weil das Feld seinen örtlichen Wert bei jedem Bildaufbau aus der
 * Datenbank neu bekam. Hier wird der Entwurf beim ÖFFNEN einmal gesetzt und bis
 * zum Schließen nicht mehr angefasst — verlieren kann man dabei nichts. Es ist
 * dasselbe Muster wie beim Modifikator-Formular an den Talenten, und es ist für
 * einen Gegenstand auch das richtige: er entsteht als Ganzes oder gar nicht.
 *
 * **Der Gegenstand ist ein TYP, kein Exemplar.** Der Schadenswürfel und der
 * RK-Bonus stehen an der Entity, nicht an der Inventarzeile. Zwei Kurzschwerter
 * im Gepäck sind zwei Zeilen und EINE Regel. Das +1 des einen Stücks gehört
 * dagegen an die Zeile — dafür gibt es dort schon den Modifikator-Editor.
 */
export function ItemEditor({
  open,
  compendium,
  existing,
  usedBy,
  onClose,
  onSave,
}: {
  open: boolean;
  compendium: Map<string, Entity>;
  /** Gesetzt beim Bearbeiten, `undefined` beim Anlegen. */
  existing?: ItemEntity | undefined;
  /** Wie viele Bögen auf diesem Gerät den Gegenstand tragen. */
  usedBy?: { count: number; names: string[] } | undefined;
  onClose: () => void;
  /** Bekommt die fertige Entity; das Speichern selbst macht der Aufrufer. */
  onSave: (entity: ItemEntity) => void;
}) {
  /*
    `key` am BottomSheet-Inhalt statt eines useEffect: das Sheet hängt sein Kind
    nicht aus (bits.tsx rendert bei !open nichts, behält aber den Zustand), und
    ein abgebrochener Entwurf hinge sonst am nächsten Gegenstand. Der Aufrufer
    wechselt `existing`, also wechselt der Schlüssel — und damit ist der Entwurf
    beim Öffnen frisch. Dieselbe Überlegung steht am TP-Feld.
  */
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={existing === undefined ? S.items.editor.titleNew : S.items.editor.titleEdit}
    >
      <EditorBody
        key={existing?.id ?? "neu"}
        compendium={compendium}
        existing={existing}
        usedBy={usedBy}
        onClose={onClose}
        onSave={onSave}
      />
    </BottomSheet>
  );
}

function EditorBody({
  compendium,
  existing,
  usedBy,
  onClose,
  onSave,
}: {
  compendium: Map<string, Entity>;
  existing?: ItemEntity | undefined;
  usedBy?: { count: number; names: string[] } | undefined;
  onClose: () => void;
  onSave: (entity: ItemEntity) => void;
}) {
  const [draft, setDraft] = useState<ItemDraft>(() =>
    existing === undefined ? EMPTY_ITEM_DRAFT : draftFromEntity(existing),
  );
  const [pickTemplate, setPickTemplate] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const E = S.items.editor;
  const fields = fieldsFor(draft.kind);
  const { blocking, hints } = draftProblems(draft);
  const set = (patch: Partial<ItemDraft>) => setDraft((d) => ({ ...d, ...patch }));

  /*
    Die Vorschau ist dieselbe Zeile, die später im Gepäck steht — gebaut aus einer
    Wegwerf-Entity mit einer Wegwerf-Kennung. Sie zeigt ihm die Werte in derselben
    Sprache, in der er sie danach liest, und sie ist zugleich die Probe, dass die
    Eingabe überhaupt eine baubare Entity ergibt.
  */
  let preview: string | null = null;
  try {
    preview = itemSummary(draftToEntity(draft, "homebrew:item:vorschau"));
  } catch {
    preview = null;
  }

  /** Wo die Vorlagen-Auswahl aufschlägt — passend zur gewählten Art. */
  const templateGroup: ItemGroup =
    draft.kind === "weapon" ? "weapon" : fields.armor ? "armor" : "gear";

  const save = () => {
    try {
      /*
        Die Kennung: eine Zufallskennung, NIE aus dem Namen. Der Import baut sie
        aus dem Namen, und genau deshalb wurden zwei „Dolch" aus zwei Bögen ein
        Eintrag — der Halbling bekam den 1d4 des Menschen. Beim Bearbeiten bleibt
        die alte Kennung: würde sie sich beim Umbenennen ändern, zeigte jede
        Inventarzeile ins Leere.
      */
      const id = existing?.id ?? `homebrew:item:${crypto.randomUUID()}`;
      onSave(draftToEntity(draft, id, existing));
      onClose();
    } catch (error) {
      // Ein Zod-Fehler ist laut, aber unlesbar. Er bekommt einen Satz, nicht
      // einen leeren Bildschirm.
      setFailure(error instanceof Error ? error.message : String(error));
    }
  };

  if (pickTemplate) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-400">{E.templateHint}</p>
        <ItemPicker
          compendium={compendium}
          startGroup={templateGroup}
          onPick={(template) => {
            setDraft(draftFromTemplate(template));
            setPickTemplate(false);
          }}
        />
        <GhostButton onClick={() => setPickTemplate(false)}>{E.cancel}</GhostButton>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Art zuerst: sie entscheidet, welche Felder darunter überhaupt stehen. */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-slate-400">{E.kindLabel}</div>
        <div className="mt-1 flex flex-wrap gap-2">
          {HOMEBREW_ITEM_KINDS.map((kind) => (
            <Chip key={kind} active={draft.kind === kind} onClick={() => set({ kind })}>
              {E.kinds[kind]}
            </Chip>
          ))}
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">{E.kindHints[draft.kind]}</p>
      </div>

      <Field label={E.nameLabel}>
        <input
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder={E.namePlaceholder}
          className={inputClass}
        />
      </Field>

      {/* Von einer Vorlage abschreiben — der schnelle Weg zu echten Werten. */}
      {draft.basedOn === undefined ? (
        <GhostButton onClick={() => setPickTemplate(true)}>{E.template}</GhostButton>
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-2 text-[11px] leading-snug text-slate-300">
          <p>{E.templateChosen(draft.basedOnName ?? draft.basedOn)}</p>
          <div className="mt-1.5">
            <GhostButton onClick={() => set({ basedOn: undefined, basedOnName: undefined })}>
              {E.templateClear}
            </GhostButton>
          </div>
        </div>
      )}

      {/* --- Rüstung und Schild ------------------------------------------- */}
      {fields.armor && (
        <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-2">
          {fields.armorKind && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                {E.armorKindLabel}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {(["light", "medium", "heavy"] as const).map((kind) => (
                  <Chip
                    key={kind}
                    active={draft.armorKind === kind}
                    onClick={() => set({ armorKind: kind })}
                  >
                    {E.armorKinds[kind]}
                  </Chip>
                ))}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-slate-500">{E.armorKindHint}</p>
            </div>
          )}
          <NumberStepper
            label={E.acBonusLabel}
            hint={E.acBonusHint}
            value={draft.acBonus}
            max={15}
            onChange={(acBonus) => set({ acBonus })}
          />
          {/*
            „unbegrenzt" ist eine eigene Antwort, keine 0: 0 heißt „kein DEX-Bonus
            zählt", unbegrenzt heißt „alles zählt". Bei DEX 18 sind das vier Punkte
            RK Unterschied. Deshalb ein Schalter neben dem Regler.
          */}
          <div className="flex flex-wrap items-center gap-2">
            <Chip
              active={!draft.maxDexLimited}
              onClick={() => set({ maxDexLimited: !draft.maxDexLimited })}
            >
              {E.maxDexUnlimited}
            </Chip>
          </div>
          {draft.maxDexLimited && (
            <NumberStepper
              label={E.maxDexLabel}
              hint={E.maxDexHint}
              value={draft.maxDex}
              max={8}
              onChange={(maxDex) => set({ maxDex })}
            />
          )}
          {/* Positiv im Regler, negativ in den Daten — im Buch steht „−6". */}
          <NumberStepper
            label={E.acpLabel}
            hint={E.acpHint}
            value={draft.acp}
            max={12}
            format={(v) => (v === 0 ? "0" : `−${v}`)}
            onChange={(acp) => set({ acp })}
          />
        </div>
      )}

      {/* --- Waffe --------------------------------------------------------- */}
      {fields.weapon && (
        <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-2">
          <Field label={E.damageLabel} hint={E.damageHint}>
            <input
              value={draft.damage}
              onChange={(e) => set({ damage: e.target.value })}
              placeholder={E.damagePlaceholder}
              className={inputClass}
            />
          </Field>
          {/* Nie mehr als zwei Felder nebeneinander — auf 390 px läuft das dritte raus. */}
          <div className="grid grid-cols-2 gap-2">
            <SelectField
              label={E.critRangeLabel}
              value={draft.critRange}
              options={[
                { value: "20", label: "20" },
                { value: "19-20", label: "19-20" },
                { value: "18-20", label: "18-20" },
              ]}
              onChange={(critRange) => set({ critRange })}
            />
            <SelectField
              label={E.critMultLabel}
              value={draft.critMult}
              options={[
                { value: "x2", label: "x2" },
                { value: "x3", label: "x3" },
                { value: "x4", label: "x4" },
              ]}
              onChange={(critMult) => set({ critMult })}
            />
          </div>
          <p className="text-[11px] leading-snug text-slate-500">{E.critRangeHint}</p>
          <SelectField
            label={E.handednessLabel}
            hint={E.handednessHint}
            value={draft.handedness}
            options={(["light", "one", "two", "ranged"] as const).map((value) => ({
              value,
              label: E.handedness[value] ?? value,
            }))}
            onChange={(value) => set({ handedness: value as ItemDraft["handedness"] })}
          />
          <SelectField
            label={E.weaponCategoryLabel}
            hint={E.weaponCategoryHint}
            value={draft.weaponCategory}
            options={(["simple", "martial", "exotic", "natural"] as const).map((value) => ({
              value,
              label: E.weaponCategories[value] ?? value,
            }))}
            onChange={(value) => set({ weaponCategory: value as ItemDraft["weaponCategory"] })}
          />
          {/*
            Reichweite und Stärkeschaden nur im Fernkampf. Im Nahkampf gilt immer
            der ganze Stärkebonus — ein gespeicherter Wert dafür wäre eine Zahl,
            die niemand liest.
          */}
          {draft.handedness === "ranged" && (
            <>
              <NumberStepper
                label={E.rangeLabel}
                hint={E.rangeHint}
                value={draft.rangeIncrementFt}
                max={200}
                step={10}
                onChange={(rangeIncrementFt) => set({ rangeIncrementFt })}
              />
              <SelectField
                label={E.strDamageLabel}
                hint={E.strDamageHint}
                value={draft.strDamage}
                options={(["none", "penaltyOnly", "full"] as const).map((value) => ({
                  value,
                  label: E.strDamageOptions[value] ?? value,
                }))}
                onChange={(value) => set({ strDamage: value as ItemDraft["strDamage"] })}
              />
            </>
          )}
        </div>
      )}

      {/* Gewicht und Preis: zwei Felder, zwei Spalten. */}
      <div className="grid grid-cols-2 gap-2">
        <Field label={E.weightLabel}>
          <input
            value={draft.weightLb}
            inputMode="decimal"
            onChange={(e) => set({ weightLb: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label={E.costLabel}>
          <input
            value={draft.costGp}
            inputMode="decimal"
            onChange={(e) => set({ costGp: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      {/* Was selten gebraucht wird, steht weggeklappt — auf 390 px zählt jede Zeile. */}
      <GhostButton onClick={() => setShowMore(!showMore)}>
        {showMore ? `▾ ${E.more}` : `▸ ${E.more}`}
      </GhostButton>
      {showMore && (
        <div className="space-y-2">
          {fields.weapon && (
            <Field label={E.damageTypeLabel}>
              <input
                value={draft.damageType}
                onChange={(e) => set({ damageType: e.target.value })}
                placeholder={E.damageTypePlaceholder}
                className={inputClass}
              />
            </Field>
          )}
          {fields.armor && (
            <NumberStepper
              label={E.asfLabel}
              hint={E.asfHint}
              value={draft.asf}
              max={60}
              step={5}
              onChange={(asf) => set({ asf })}
            />
          )}
          <Field label={E.descriptionLabel} hint={E.descriptionHint}>
            <textarea
              value={draft.description}
              rows={3}
              onChange={(e) => set({ description: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      )}

      {/* Vorschau in derselben Sprache, in der die Zeile später im Gepäck steht. */}
      {preview !== null && preview !== "" && (
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            {E.previewTitle}
          </div>
          <div className="mt-0.5 font-mono text-[11px] leading-snug text-slate-300">{preview}</div>
        </div>
      )}

      {/*
        Warnen statt sperren. „Die Engine wendet auch regelwidrige Werte an und
        meldet sie. Der DM hat Recht, nicht die App." Nur `blocking` hält das
        Speichern auf, und das sind genau zwei Fälle: kein Name, und eine Waffe
        ohne Schadenswürfel (die bekäme keine Angriffszeile).
      */}
      {hints.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-800/60 bg-amber-950/30 p-2 text-[11px] leading-snug text-amber-200">
          {hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      )}
      {blocking.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-rose-800/60 bg-rose-950/30 p-2 text-[11px] leading-snug text-rose-200">
          {blocking.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      {failure !== null && (
        <p className="rounded-lg border border-rose-800/60 bg-rose-950/30 p-2 text-[11px] leading-snug text-rose-200">
          {E.failed(failure)}
        </p>
      )}

      {/*
        Beim BEARBEITEN steht dabei, wie weit die Änderung reicht: ein Typ gilt für
        jedes Exemplar auf jedem Bogen. „Kurzschwert 1d6 → 1d8" verschiebt den
        Schaden überall — das muss er wissen, bevor er speichert.
      */}
      {existing !== undefined && usedBy !== undefined && (
        <p className="text-[11px] leading-snug text-slate-400">
          {E.usedBy(usedBy.count, usedBy.names)}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-2">
        <GhostButton onClick={onClose}>{E.cancel}</GhostButton>
        <PrimaryButton disabled={blocking.length > 0} onClick={save}>
          {existing === undefined ? E.save : E.saveEdit}
        </PrimaryButton>
      </div>
      {existing === undefined && (
        <p className="text-[11px] leading-snug text-slate-500">{E.saveHint}</p>
      )}
    </div>
  );
}
