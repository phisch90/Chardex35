import { useState } from "react";
import { classFeatureOverview, type ClassFeatureInfo, type Entity } from "@codex35/core";
import { S } from "../strings.js";

/**
 * Was die Klasse kann — englischer Name, deutscher Name, ein Satz, Regeltext beim Antippen.
 *
 * Sein Satz zum Klassenschritt: „Bardic Music, Bardic Knowledge, Countersong, Fascinate,
 * Inspire Courage — die sagen mir nichts." Genau diese fünf standen dort als nackte Namen,
 * drei davon klein geschrieben, weil sie so aus dem SRD-Bestand kommen.
 *
 * Gefragt und entschieden: **englischer Name zuerst** („Bardic Music — Bardenmusik"), weil
 * das der Name ist, den seine Bücher und Fight Club nennen; die Übersetzung folgt fürs
 * Verstehen. Der lange englische Regeltext ist eingeklappt — dieselbe Form wie bei den
 * Talenten (`FeatText`), damit man nicht zwei Bedienweisen lernen muss.
 *
 * Zwei Gruppen, und die zweite ist der Grund, warum das nötig war: „auf welcher Stufe" und
 * „gilt immer". Beim Kleriker steht in der Stufentabelle des Bestands EIN Merkmal; Domänen,
 * spontanes Wirken und Aura kennt nur die Klassenbeschreibung. Ohne die zweite Gruppe wäre
 * seine eigene Klasse hier eine Klasse mit einem einzigen Merkmal.
 */
export function ClassFeatureList({
  klass,
  /**
   * Diese Stufe auslassen — sie steht schon im Kasten „Stufe N dieser Klasse bringt".
   * Ohne das stünden die Merkmale der Stufe 1 im Assistenten zweimal da, einmal nackt und
   * einmal erklärt: genau die Doppelung, die man beim Lesen für zwei Sachen hält.
   */
  skipLevel,
}: {
  klass: Entity | undefined;
  skipLevel?: number;
}) {
  const overview = classFeatureOverview(klass);
  if (overview === undefined) return null;
  const { always } = overview;
  const levels = overview.levels.filter((row) => row.level !== skipLevel);
  if (levels.length === 0 && always.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1.5">
      {always.length > 0 && (
        <div>
          <div className="text-slate-500">{S.classFeatures.always}</div>
          <ul className="mt-0.5 space-y-1">
            {always.map((feature) => (
              <Row key={feature.key} feature={feature} />
            ))}
          </ul>
        </div>
      )}
      {levels.length > 0 && (
        <div>
          <div className="text-slate-500">{S.classFeatures.byLevel}</div>
          <ul className="mt-0.5 space-y-1">
            {levels.map((row) => (
              <li key={row.level}>
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="shrink-0 rounded bg-slate-800 px-1.5 text-[10px] font-semibold text-slate-300">
                    {S.classFeatures.level(row.level)}
                  </span>
                </div>
                <ul className="mt-0.5 space-y-1 pl-1">
                  {row.features.map((feature, i) => (
                    <Row key={`${feature.key}-${i}`} feature={feature} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Dieselben Zeilen, für den Kasten „Stufe N dieser Klasse bringt". */
export function ClassFeatureRows({ features }: { features: ClassFeatureInfo[] }) {
  if (features.length === 0) return null;
  return (
    <ul className="mt-0.5 space-y-1">
      {features.map((feature, i) => (
        <Row key={`${feature.key}-${i}`} feature={feature} />
      ))}
    </ul>
  );
}

/** Die Merkmale EINER Stufe, erklärt — für den Kasten oben. */
export function featuresOfLevel(klass: Entity | undefined, level: number): ClassFeatureInfo[] {
  return classFeatureOverview(klass)?.levels.find((row) => row.level === level)?.features ?? [];
}

function Row({ feature }: { feature: ClassFeatureInfo }) {
  const [openText, setOpenText] = useState(false);
  return (
    <li>
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        {/* Englisch zuerst — seine Entscheidung: so heißt es im Buch und in Fight Club. */}
        <span className="font-medium text-slate-100">{feature.name}</span>
        {feature.germanName !== undefined && (
          <span className="text-slate-400">— {feature.germanName}</span>
        )}
      </div>
      {feature.summary === undefined ? (
        /*
          Ehrlich benennen statt schweigen: fehlt der deutsche Satz, steht das da. Genau
          diese Zeile hat kein Merkmal der elf Spielerklassen — dafür gibt es einen Test.
          Prestige- und Homebrew-Klassen sehen sie schon.
        */
        <p className="text-[10px] text-slate-600">{S.classFeatures.noGerman}</p>
      ) : (
        <p className="leading-snug text-slate-300">{feature.summary}</p>
      )}
      {feature.text !== undefined && feature.text !== "" && (
        <>
          <button
            onClick={() => setOpenText(!openText)}
            className="text-[10px] text-slate-500 underline decoration-dotted hover:text-amber-400"
          >
            {openText ? S.classFeatures.hideText : S.classFeatures.showText}
          </button>
          {openText && (
            <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-400">
              {feature.text}
            </p>
          )}
        </>
      )}
    </li>
  );
}
