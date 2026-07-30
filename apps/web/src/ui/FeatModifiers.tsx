import { useState } from "react";
import { displayName, type Effect, type Entity, type StatPath } from "@codex35/core";
import { GhostButton, fmtMod } from "./bits.js";
import {
  MODIFIER_GROUPS,
  MODIFIER_TARGETS,
  SINGLE_SKILL_KEY,
  describeModifier,
} from "./modifierTargets.js";

/**
 * Eigene Modifikatoren an einem Talent — das, was Fight Club unter „Modifiers"
 * zeigt, und der Grund, warum dort auch ein Talent aus einem eigenen Buch etwas
 * bewirkt.
 *
 * Zwei Listen, klar getrennt:
 *
 *  - „aus dem Regeltext": was der Kompendium-Eintrag mitbringt. Nur lesen. Ohne
 *    diese Anzeige trägt man Boni doppelt ein, die es schon gibt — bei Improved
 *    Initiative stand die +4 nirgends im Talente-Reiter, nur versteckt in der
 *    Aufschlüsselung im Kampf-Reiter.
 *  - „von dir": was hier eingetragen wurde. Änderbar, löschbar.
 */
export function FeatModifiers(props: {
  entity: Entity | undefined;
  own: Effect[];
  skills: Entity[];
  editMode: boolean;
  onChange: (next: Effect[]) => void;
  /**
   * Wann der Effekt zählt. An einem TALENT ist „passive" richtig — ein Talent hat
   * man immer. An einem GEGENSTAND ist es falsch und gefährlich: `passive` wirkt
   * laut engine/effects.ts auch aus dem RUCKSACK. Ein Ring mit „RK +2", einmal so
   * angelegt, verschiebt die RK dauerhaft, und in der Aufschlüsselung steht nur
   * der Gegenstandsname — man sucht den Fehler überall, nur nicht dort.
   */
  activation?: Effect["activation"];
}) {
  const [adding, setAdding] = useState(false);
  const skillName = (id: string) => props.skills.find((s) => s.id === id)?.name;
  const fromRules = props.entity?.effects ?? [];

  return (
    <div className="mt-1 space-y-1">
      {fromRules.length > 0 && (
        <div className="text-[11px] text-slate-500">
          Aus dem Regeltext:{" "}
          {fromRules
            .map((e) => `${describeModifier(e.target, e.bonusType, skillName)} ${fmtMod(Number(e.value) || 0)}`)
            .join(" · ")}
        </div>
      )}

      {props.own.length > 0 && (
        <ul className="space-y-1">
          {props.own.map((mod, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-amber-300">
                {describeModifier(mod.target, mod.bonusType, skillName)}{" "}
                <span className="font-mono">{fmtMod(Number(mod.value) || 0)}</span>
                {mod.condition !== undefined && mod.condition !== "" && (
                  <span className="text-slate-400"> — {mod.condition}</span>
                )}
              </span>
              {props.editMode && (
                <>
                  <GhostButton
                    onClick={() =>
                      props.onChange(
                        props.own.map((m, j) =>
                          j === i ? { ...m, value: (Number(m.value) || 0) - 1 } : m,
                        ),
                      )
                    }
                  >
                    −
                  </GhostButton>
                  <GhostButton
                    onClick={() =>
                      props.onChange(
                        props.own.map((m, j) =>
                          j === i ? { ...m, value: (Number(m.value) || 0) + 1 } : m,
                        ),
                      )
                    }
                  >
                    +
                  </GhostButton>
                  <GhostButton
                    danger
                    onClick={() => props.onChange(props.own.filter((_, j) => j !== i))}
                  >
                    ✕
                  </GhostButton>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {props.editMode && !adding && (
        <GhostButton onClick={() => setAdding(true)}>+ Modifikator</GhostButton>
      )}
      {props.editMode && adding && (
        <AddModifier
          skills={props.skills}
          {...(props.activation === undefined ? {} : { activation: props.activation })}
          onCancel={() => setAdding(false)}
          onAdd={(effect) => {
            props.onChange([...props.own, effect]);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Der Eingabe-Streifen: Ziel wählen, Wert setzen, fertig.
 *
 * Der Wert steht als Zahl mit −/+ daneben und darf negativ sein — eine Hausregel
 * darf auch wehtun, und Fight Clubs Rad geht ebenfalls in den Minusbereich.
 */
function AddModifier(props: {
  skills: Entity[];
  onAdd: (effect: Effect) => void;
  onCancel: () => void;
  activation?: Effect["activation"];
}) {
  const [key, setKey] = useState(MODIFIER_TARGETS[0]!.key);
  const [skillId, setSkillId] = useState(props.skills[0]?.id ?? "");
  const [value, setValue] = useState(1);
  const [condition, setCondition] = useState("");

  const build = (): Effect | null => {
    if (key === SINGLE_SKILL_KEY) {
      if (skillId === "") return null;
      return {
        target: `skill:${skillId}` as StatPath,
        bonusType: "untyped",
        value,
        activation: props.activation ?? "passive",
        ...(condition.trim() === "" ? {} : { condition: condition.trim() }),
      };
    }
    const target = MODIFIER_TARGETS.find((t) => t.key === key);
    if (target === undefined) return null;
    return {
      target: target.path,
      bonusType: target.bonusType,
      value,
      activation: props.activation ?? "passive",
      ...(condition.trim() === "" ? {} : { condition: condition.trim() }),
    };
  };

  const select = "rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs";

  return (
    <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-2">
      <select className={`w-full ${select}`} value={key} onChange={(e) => setKey(e.target.value)}>
        {MODIFIER_GROUPS.map((group) => (
          <optgroup key={group} label={group}>
            {MODIFIER_TARGETS.filter((t) => t.group === group).map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
            {group === "Fertigkeiten" && (
              <option value={SINGLE_SKILL_KEY}>Eine bestimmte Fertigkeit …</option>
            )}
          </optgroup>
        ))}
      </select>

      {key === SINGLE_SKILL_KEY && (
        <select
          className={`w-full ${select}`}
          value={skillId}
          onChange={(e) => setSkillId(e.target.value)}
        >
          {props.skills.map((s) => (
            <option key={s.id} value={s.id}>
              {displayName(s)}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-2">
        <GhostButton onClick={() => setValue(value - 1)}>−</GhostButton>
        <span className="w-10 text-center font-mono text-base text-amber-300">{fmtMod(value)}</span>
        <GhostButton onClick={() => setValue(value + 1)}>+</GhostButton>
        <input
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="nur wenn … (freiwillig)"
          className={`min-w-0 flex-1 ${select}`}
        />
      </div>

      {condition.trim() !== "" && (
        // Ehrlichkeit an der Stelle, an der es sonst still schiefgeht: ein Bonus
        // mit Bedingung wird angezeigt, aber NICHT in die Summe gerechnet.
        <p className="text-[11px] text-slate-400">
          Mit Bedingung steht der Bonus am Bogen, zählt aber nicht in die Summe.
        </p>
      )}

      <div className="flex gap-2">
        <GhostButton
          onClick={() => {
            const effect = build();
            if (effect !== null) props.onAdd(effect);
          }}
        >
          Übernehmen
        </GhostButton>
        <GhostButton onClick={props.onCancel}>Abbrechen</GhostButton>
      </div>
    </div>
  );
}
