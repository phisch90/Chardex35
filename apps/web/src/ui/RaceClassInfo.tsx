import { useState } from "react";
import {
  classLevelGain,
  classSummary,
  displayName,
  raceSummary,
  type Entity,
} from "@codex35/core";
import { S } from "../strings.js";
import { ClassFeatureList, ClassFeatureRows, featuresOfLevel } from "./ClassFeatureList.js";
import { fmtMod } from "./bits.js";

/**
 * Infos zu Rassen und Klassen — dort, wo man sich entscheidet.
 *
 * Alles aus den Klassendaten ABGELEITET (siehe core/engine/classinfo.ts): die
 * Tabellen liegen im Pack, eine handgepflegte Zusammenfassung wäre beim
 * nächsten Datenlauf veraltet. Damit sind auch alle 40 Klassen und alle
 * Prestigeklassen abgedeckt, nicht nur die, an die jemand gedacht hat.
 */

const SIZE_DE: Record<string, string> = {
  fine: "winzig",
  diminutive: "sehr klein",
  tiny: "klein",
  small: "klein",
  medium: "mittelgroß",
  large: "groß",
  huge: "riesig",
  gargantuan: "gigantisch",
  colossal: "kolossal",
};

const BAB_DE = {
  full: "voll (+1 je Stufe)",
  threeQuarter: "3/4 (+3 je 4 Stufen)",
  half: "1/2 (+1 je 2 Stufen)",
} as const;

const ABILITY_DE: Record<string, string> = {
  str: "Stärke",
  dex: "Geschicklichkeit",
  con: "Konstitution",
  int: "Intelligenz",
  wis: "Weisheit",
  cha: "Charisma",
};

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-0.5">
      <span className="w-32 shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 text-slate-200">{children}</span>
    </div>
  );
}

/** Aufklappbare Merkmals-/Fähigkeitsliste — Regeltext wird nie abgeschnitten. */
function DetailList({
  title,
  items,
}: {
  title: string;
  items: { name: string; description: string | undefined }[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (items.length === 0) return null;
  return (
    <div className="mt-1">
      <div className="text-slate-500">{title}</div>
      <ul className="mt-0.5 space-y-0.5">
        {items.map((item) => (
          <li key={item.name}>
            <button
              onClick={() => setOpen(open === item.name ? null : item.name)}
              className="text-left text-slate-200 underline decoration-dotted decoration-slate-600 hover:text-amber-300"
            >
              {item.name}
            </button>
            {open === item.name && item.description !== undefined && (
              <p className="mt-0.5 whitespace-pre-wrap border-l-2 border-slate-700 pl-2 text-[11px] leading-relaxed text-slate-400">
                {item.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Kompakte Kopfzeile für die Auswahlliste — dieselben deutschen Begriffe wie im
 * Infofeld, damit nicht oben „medium" und darunter „mittelgroß" steht.
 */
export function raceDetailLine(race: Entity): string {
  const summary = raceSummary(race);
  if (!summary) return "";
  const mods = summary.abilityMods
    .map((mod) => `${S.abilities[mod.ability] ?? mod.ability} ${fmtMod(mod.value)}`)
    .join(" · ");
  const size = SIZE_DE[summary.size] ?? summary.size;
  return `${size} · ${summary.speedFt} ft${mods === "" ? "" : ` · ${mods}`}`;
}

/** Kompakte Kopfzeile für Klassen. */
export function classDetailLine(klass: Entity): string {
  const summary = classSummary(klass);
  if (!summary) return "";
  const parts = [
    `W${summary.hitDie}`,
    `${summary.skillPointsPerLevel}+INT Punkte`,
    BAB_DE[summary.babProgression].replace(/ \(.*\)/, "") + " BAB",
  ];
  if (summary.spellcasting) parts.push("Zauberer");
  if (summary.isPrestige) parts.push("Prestige");
  return parts.join(" · ");
}

export function RaceInfo({
  race,
  compendium,
}: {
  race: Entity | undefined;
  compendium: Map<string, Entity> | undefined;
}) {
  const summary = race ? raceSummary(race) : null;
  if (!race || !summary) return null;

  const favored = compendium?.get(summary.favoredClassId);
  const favoredText =
    summary.favoredClassId === "any" ? "beliebig" : favored ? displayName(favored) : summary.favoredClassId;

  return (
    <div className="mt-1 rounded-lg border border-slate-700/60 bg-slate-950/40 p-2 text-xs">
      <Fact label="Attribute">
        {summary.abilityMods.length === 0
          ? "unverändert"
          : summary.abilityMods
              .map((mod) => `${ABILITY_DE[mod.ability] ?? mod.ability} ${fmtMod(mod.value)}`)
              .join(", ")}
      </Fact>
      <Fact label="Größe / Bewegung">
        {SIZE_DE[summary.size] ?? summary.size} · {summary.speedFt} ft
      </Fact>
      <Fact label="Bevorzugte Klasse">{favoredText}</Fact>
      {summary.levelAdjustment !== 0 && (
        <Fact label="Stufenanpassung">
          +{summary.levelAdjustment} (die effektive Stufe liegt entsprechend höher)
        </Fact>
      )}
      {summary.bonusLanguages !== undefined && summary.bonusLanguages !== "" && (
        <Fact label="Bonussprachen">{summary.bonusLanguages}</Fact>
      )}
      <DetailList title="Rassenmerkmale (antippen für den Regeltext)" items={summary.traits} />
    </div>
  );
}

export function ClassInfo({
  klass,
  compendium,
  /** Wenn gesetzt: zusätzlich, was GENAU diese Stufe der Klasse bringt. */
  nextLevelInClass,
}: {
  klass: Entity | undefined;
  compendium: Map<string, Entity> | undefined;
  nextLevelInClass?: number;
}) {
  const summary = klass ? classSummary(klass) : null;
  if (!klass || !summary) return null;

  const gain =
    nextLevelInClass !== undefined ? classLevelGain(klass, nextLevelInClass) : null;

  const skillNames = summary.classSkillIds
    .map((id) => {
      const skill = compendium?.get(id);
      return skill ? displayName(skill) : id.replace("srd:skill:", "");
    })
    .sort((a, b) => a.localeCompare(b));

  const saveText =
    summary.goodSaves.length === 0
      ? "keiner gut"
      : summary.goodSaves.map((key) => S.saves[key] ?? key).join(", ") + " gut";

  return (
    <div className="mt-1 rounded-lg border border-slate-700/60 bg-slate-950/40 p-2 text-xs">
      {gain && (
        <div className="mb-1.5 rounded border border-amber-800/60 bg-amber-950/30 p-1.5">
          <div className="mb-0.5 font-semibold text-amber-200">
            Stufe {gain.level} dieser Klasse bringt
          </div>
          <div className="text-amber-100/90">
            {gain.hitDie > 0 && `+1W${gain.hitDie} TP`}
            {gain.babDelta > 0 && ` · BAB ${fmtMod(gain.babDelta)}`}
            {(["fort", "ref", "will"] as const)
              .filter((key) => gain.saveDeltas[key] > 0)
              .map((key) => ` · ${S.saves[key]} ${fmtMod(gain.saveDeltas[key])}`)
              .join("")}
            {gain.newSpellLevels.length > 0 &&
              ` · neu: Zauber Grad ${gain.newSpellLevels.join(", ")}`}
          </div>
          {gain.babDelta === 0 &&
            gain.saveDeltas.fort === 0 &&
            gain.saveDeltas.ref === 0 &&
            gain.saveDeltas.will === 0 &&
            gain.newSpellLevels.length === 0 &&
            gain.features.length === 0 && (
              <div className="text-amber-100/70">
                außer Trefferpunkten nichts — auf dieser Stufe steht die Tabelle still
              </div>
            )}
          {/*
            Vorher standen hier die nackten Namen aus dem Bestand — „bardic knowledge",
            „countersong", klein geschrieben und ohne ein Wort dazu. Genau darüber seine
            Beschwerde. Jetzt dieselben Zeilen wie unten in der Liste, samt deutschem Namen
            und Erklärung; die Liste unten lässt diese Stufe dafür aus.
          */}
          <ClassFeatureRows features={featuresOfLevel(klass, gain.level)} />
        </div>
      )}

      <Fact label="Trefferwürfel">W{summary.hitDie}</Fact>
      <Fact label="Fertigkeitspunkte">
        ({summary.skillPointsPerLevel} + INT) je Stufe, ×4 auf der ersten Stufe
      </Fact>
      <Fact label="BAB (Grundangriffsbonus)">{BAB_DE[summary.babProgression]}</Fact>
      <Fact label="Rettungswürfe">{saveText}</Fact>
      {summary.spellcasting && (
        <Fact label="Zauber">
          {summary.spellcasting.model === "prepared" ? "vorbereitet" : "spontan"} ·{" "}
          {ABILITY_DE[summary.spellcasting.ability]} · ab Stufe {summary.spellcasting.firstLevel} ·
          bis Grad {summary.spellcasting.maxSpellLevel}
          {summary.spellcasting.usesSpellbook && " · Zauberbuch"}
        </Fact>
      )}
      <Fact label="Höchststufe">
        {summary.maxLevel}
        {summary.isPrestige && " (Prestigeklasse)"}
      </Fact>
      {skillNames.length > 0 && (
        <Fact label="Klassenfertigkeiten">{skillNames.join(", ")}</Fact>
      )}
      {/* Der einzige englische Block und der längste — eingeklappt, damit die
          deutschen Kennzahlen darüber auf einen Blick lesbar bleiben. */}
      {summary.proficiencies !== undefined && summary.proficiencies !== "" && (
        <DetailList
          title=""
          items={[{ name: "Vertrautheiten (Regeltext)", description: summary.proficiencies }]}
        />
      )}
      {/*
        Was die Klasse KANN — der Grund für diese Runde. Sein Satz zum Klassenschritt:
        „Bardic Music, Bardic Knowledge, Countersong, Fascinate, Inspire Courage — die
        sagen mir nichts." Die Liste steht bewusst UNTER den Kennzahlen: die Zahlen
        vergleicht man zwischen Klassen, die Merkmale liest man, wenn man sich festlegt.
      */}
      <ClassFeatureList
        klass={klass}
        {...(gain !== null ? { skipLevel: gain.level } : {})}
      />

      {summary.requirements.length > 0 && (
        <Fact label="Voraussetzungen">
          {summary.requirements
            .map((req) =>
              req.type === "custom"
                ? req.text
                : req.type === "minAbility"
                  ? `${ABILITY_DE[req.ability] ?? req.ability} ${req.value}`
                  : req.type === "minSkillRanks"
                    ? `${req.skillId.replace("srd:skill:", "")} ${req.ranks} Ränge`
                    : req.type === "hasFeat"
                      ? req.featId.replace("srd:feat:", "")
                      : req.type === "classLevel"
                        ? `${req.classId.replace("srd:class:", "")} Stufe ${req.level}`
                        : req.type === "minBab"
                          ? `BAB ${fmtMod(req.value)}`
                          : JSON.stringify(req),
            )
            .join(" · ")}
        </Fact>
      )}
    </div>
  );
}
