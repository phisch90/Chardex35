import {
  ABILITIES,
  displayName,
  type DerivedSheet,
  type Entity,
  type StatValue,
} from "@codex35/core";
import { S } from "../strings.js";
import { Card, SectionTitle, fmtMod } from "./bits.js";

/**
 * Der ganze Bogen, bevor er entsteht.
 *
 * Am Ende des Assistenten stand eine Zeile: „TP 10 · RK 10 · Initiative +0". Sein
 * Urteil, wörtlich: „Find ich nicht so schön. Könnte man noch mal so 'n kompletten
 * Bogen machen." Gefragt, wie komplett, hat er geantwortet: **alles, was der Bogen
 * kann.**
 *
 * NUR LESEND, und das mit Absicht. Die Reiter des fertigen Bogens erwarten `TabProps`
 * mit `save` und `editMode` — vor dem Anlegen gibt es aber nichts zu speichern. Sie
 * darauf umzubauen, dass der Schreibweg „manchmal fehlt", wäre teurer und
 * fehleranfälliger als dieser Lesebaustein. Geändert wird in den Schritten davor.
 *
 * Der abgeleitete Bogen ist die einzige Quelle: keine Zahl wird hier nachgerechnet,
 * sonst stünde am Ende des Assistenten etwas anderes als danach im Bogen.
 */
export function DraftSummary({
  sheet,
  compendium,
}: {
  sheet: DerivedSheet;
  compendium: ReadonlyMap<string, Entity>;
}) {
  return (
    <Card className="space-y-3">
      <SectionTitle>{S.wizard.summary}</SectionTitle>

      {/* Attribute — Endwert und Modifikator, denn beides braucht man am Tisch. */}
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {ABILITIES.map((ability) => (
          <div
            key={ability}
            className="rounded-lg border border-slate-700/60 bg-slate-800/40 px-1.5 py-1 text-center"
          >
            <div className="text-[10px] uppercase tracking-wide text-slate-400">
              {S.abilities[ability]}
            </div>
            <div className="text-base font-semibold tabular-nums">
              {sheet.abilities[ability].score.total}
            </div>
            <div className="text-xs text-amber-300 tabular-nums">
              {fmtMod(sheet.abilities[ability].mod)}
            </div>
          </div>
        ))}
      </div>

      <Row label={S.sheet.hp} value={String(sheet.hp.max)} />
      {/*
        Die RK aufgeschlüsselt: er hat sie am Bogen ausdrücklich so verlangt („RK in
        ihre Bestandteile aufschlüsseln statt nur die Summe"), also steht sie hier
        genauso. `applied: false` heißt „von einem gleichartigen höheren Bonus
        überdeckt" — das gehört dazu, sonst sucht man den fehlenden Punkt.
      */}
      <div>
        <Row label={S.sheet.ac} value={String(sheet.ac.total.total)} />
        <Parts value={sheet.ac.total} />
      </div>
      <Row
        label={saveLabel("fort")}
        value={fmtMod(sheet.saves.fort.total)}
        also={`${saveLabel("ref")} ${fmtMod(sheet.saves.ref.total)} · ${saveLabel("will")} ${fmtMod(sheet.saves.will.total)}`}
      />
      <Row
        label={S.sheet.init}
        value={fmtMod(sheet.init.total)}
        also={`${S.sheet.speed} ${sheet.speedFt.total} ft`}
      />

      {sheet.attacks.length > 0 && (
        <Block title={S.sheet.attacks}>
          {sheet.attacks.map((attack) => (
            <li key={attack.key} className="flex flex-wrap items-baseline gap-x-2 py-0.5">
              <span className="font-medium">{attack.label}</span>
              <span className="tabular-nums text-amber-300">
                {attack.bonuses.map((b) => fmtMod(b)).join("/")}
              </span>
              <span className="text-slate-400">{attack.damageText}</span>
              <span className="text-xs text-slate-500">{attack.critical}</span>
            </li>
          ))}
        </Block>
      )}

      {/*
        Nur Fertigkeiten MIT Rängen. Alle 40 hier aufzulisten hieße, die drei, die er
        gerade verteilt hat, in Nullen zu begraben.
      */}
      {sheet.skills.some((skill) => skill.ranks > 0) && (
        <Block title={S.sheet.tabs.skills}>
          {sheet.skills
            .filter((skill) => skill.ranks > 0)
            .map((skill) => (
              <li key={skill.key} className="flex items-baseline justify-between gap-2 py-0.5">
                <span>{skill.name}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="text-amber-300">{fmtMod(skill.total.total)}</span>
                  <span className="ml-1.5 text-xs text-slate-500">
                    {skill.ranks} {skill.ranks === 1 ? "Rang" : "Ränge"}
                  </span>
                </span>
              </li>
            ))}
        </Block>
      )}

      {sheet.featIds.length > 0 && (
        <Block title={S.sheet.tabs.feats}>
          {sheet.featIds.map((featId, i) => {
            const feat = compendium.get(featId);
            return (
              <li key={`${featId}-${i}`} className="py-0.5">
                {feat ? displayName(feat) : featId}
              </li>
            );
          })}
        </Block>
      )}

      {sheet.features.length > 0 && (
        <Block title={S.sheet.features}>
          {sheet.features.map((feature) => (
            <li key={feature.key} className="py-0.5">
              {feature.name}
              <span className="ml-1 text-xs text-slate-500">
                ({feature.className} {feature.level})
              </span>
            </li>
          ))}
        </Block>
      )}

      {/*
        Zuletzt die Warnungen. Sie standen vorher als einziger Inhalt neben den drei
        Zahlen — hier bleiben sie, aber am Ende: erst der Bogen, dann was daran noch
        klemmt.
      */}
      {sheet.issues.length > 0 && (
        <ul className="list-inside list-disc space-y-0.5 rounded-lg border border-amber-800/60 bg-amber-950/20 p-2 text-xs leading-snug text-amber-300">
          {sheet.issues.map((issue, i) => (
            <li key={i}>{issue.message}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * `S.saves` ist absichtlich ein `Record<string, string>` (die Engine schlägt dort mit
 * berechneten Schlüsseln nach), also liefert jeder Zugriff `string | undefined`. Bei
 * festen Schlüsseln ist der Ausweichwert das englische Regelkürzel — dieselbe Regel
 * wie überall: Regelinhalte bleiben englisch.
 */
function saveLabel(key: "fort" | "ref" | "will"): string {
  return S.saves[key] ?? key.toUpperCase();
}

function Row(props: { label: string; value: string; also?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-slate-400">{props.label}</span>
      <span className="text-right">
        <span className="font-semibold tabular-nums">{props.value}</span>
        {props.also !== undefined && (
          <span className="ml-2 text-xs text-slate-400">{props.also}</span>
        )}
      </span>
    </div>
  );
}

/** Woraus ein Wert entsteht — dieselbe Aufschlüsselung wie am Bogen. */
function Parts({ value }: { value: StatValue }) {
  const parts = value.contributions.filter((c) => c.value !== 0);
  if (parts.length === 0) return null;
  return (
    <p className="text-[11px] leading-snug text-slate-500">
      {parts
        .map((c) => `${c.source} ${fmtMod(c.value)}${c.applied ? "" : " (wirkt nicht)"}`)
        .join(" · ")}
    </p>
  );
}

function Block(props: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {props.title}
      </h4>
      <ul className="text-sm">{props.children}</ul>
    </div>
  );
}
