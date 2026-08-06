import type { DerivedSheet } from "@codex35/core";
import { S } from "../strings.js";
import { Card, SectionTitle } from "./bits.js";

/**
 * Das Vorzeichen dieser Karte — mit dem typografischen Minus, NICHT mit `fmtMod`.
 *
 * `fmtMod` ist das Vorzeichen des Kampf-Reiters (dort steht „-2" am Angriff). Hier
 * gilt aber die Nachbarschaft: die Gegenstandszeilen zwei Zentimeter darüber sagen
 * „Fertigkeiten −6" und „max. DEX 1" (`ui/itemSummary.ts`), und die Karte redet über
 * genau diese Zahlen. Zwei verschiedene Minuszeichen für dieselbe Größe auf einem
 * Schirm sind der Fehler, den man sieht, ohne ihn benennen zu können.
 *
 * Gefunden hat das der BLICK auf das Bild, nicht der Test: der maß erst das eine
 * Zeichen, dann das andere, und war beide Male grün.
 */
const mod = (value: number) => (value >= 0 ? `+${value}` : `−${Math.abs(value)}`);

/**
 * „Was deine Rüstung kostet" — die Kehrseite des RK-Bonus, an EINER Stelle.
 *
 * Warum eine eigene Karte und nicht eine Zeile an der Rüstung: sie kostet an vier
 * Stellen, und alle vier standen bisher verstreut über den Bogen — die DEX-Grenze
 * klein im Namen einer RK-Zeile („DEX-Modifikator (max. DEX 1)"), der Malus in
 * fünfzehn Fertigkeitszeilen, die Bremse in der Bewegung, und die arkane Störung
 * gar nicht. Wer wissen wollte, was die Vollplatte wirklich kostet, musste drei
 * Reiter durchsehen und die vierte Zahl gar nicht finden.
 *
 * Gerechnet wird hier NICHTS: `sheet.armorCost` bringt alles mit, inklusive der
 * Antwort auf „welche Grenze gewinnt" (Rüstung oder Last). Die Regeln dazu gehören
 * in die Engine — eine Regel, die in drei Ansichten steht, steht in keiner.
 *
 * Die Farben: alles hier ist AUSKUNFT und kein Knopf, also Slate und kein Amber
 * (elfte Falle). Kein Rosé: dass eine Rüstung etwas kostet, ist keine Warnung,
 * sondern seine Entscheidung. Gedämpft wird nur, was NICHT greift — dasselbe
 * Zeichen wie bei einem verdrängten Bonus in der Aufschlüsselung.
 */
export function ArmorCostCard({ sheet }: { sheet: DerivedSheet }) {
  const cost = sheet.armorCost;
  // Nichts angelegt → keine Karte. Ein Kasten mit vier Strichen sagt nichts.
  if (cost.pieces.length === 0) return null;

  const zeigtDex = cost.maxDex !== null;
  const zeigtAcp = cost.acp < 0;
  const zeigtSpeed = cost.speedFrom !== null && cost.speedTo !== null;
  const zeigtAsf = cost.asf > 0;
  // Sie ist da und greift bei seinen Werten nirgends — das ist eine gute Nachricht
  // und gehört gesagt, sonst sieht die Karte nach einem Fehler aus.
  const kostetNichts = cost.dexLost === 0 && !zeigtAcp && !zeigtSpeed && !zeigtAsf;

  return (
    <Card>
      <SectionTitle>{S.sheet.armorCost.title}</SectionTitle>
      {/* WER kostet — die Stücke mit ihrem RK-Bonus, damit die Zahlen eine Herkunft haben. */}
      <p className="mb-2 text-[11px] leading-snug text-slate-500">
        {cost.pieces.map((piece) => S.sheet.armorCost.piece(piece.label, piece.acBonus)).join(" · ")}
      </p>

      {kostetNichts ? (
        <p className="text-xs text-emerald-300">{S.sheet.armorCost.free}</p>
      ) : (
        <dl className="space-y-1.5 text-sm">
          {zeigtDex && (
            <Row
              label={S.sheet.armorCost.maxDex}
              value={String(cost.maxDex)}
              from={cost.maxDexFrom}
              /*
                Die Grenze ist eine Zahl, ihr PREIS ist eine andere — und nur die
                zweite zählt am Tisch. „max. DEX 4" bei DEX 12 kostet nichts, und
                genau das steht dann auch da.
              */
              note={
                cost.dexLost > 0
                  ? S.sheet.armorCost.dexLost(mod(-cost.dexLost))
                  : S.sheet.armorCost.dexFine
              }
              /*
                GEDÄMPFT, aber nicht durchgestrichen. Der erste Anlauf strich die
                Zahl durch, wenn die Grenze nichts kostet — und behauptete damit
                etwas Falsches: „max. DEX 4" GILT, sie greift bei DEX 14 nur nicht.
                Ein durchgestrichener Wert heißt in dieser App „zählt nicht", und
                das ist eine andere Aussage. Gefunden am Bild des Magiers.
              */
              dim={cost.dexLost === 0}
            />
          )}
          {zeigtAcp && (
            <Row
              label={S.sheet.armorCost.acp}
              value={mod(cost.acp)}
              from={cost.acpFrom}
              note={
                cost.acpSkills.length === 0
                  ? undefined
                  : `${S.sheet.armorCost.acpSkills}: ${cost.acpSkills
                      .map((skill) => `${skill.name} ${mod(skill.value)}`)
                      .join(" · ")}`
              }
            />
          )}
          {zeigtSpeed && (
            <Row
              label={S.sheet.armorCost.speed}
              value={S.sheet.armorCost.speedLine(cost.speedFrom!, cost.speedTo!)}
              from={cost.speedSource}
            />
          )}
          {zeigtAsf && (
            <Row
              label={S.sheet.armorCost.asf}
              value={S.sheet.armorCost.asfLine(cost.asf)}
              /*
                Die Prozentzahl steht in der Rüstung und gilt nur für arkane Klassen.
                Sie wird deshalb GEZEIGT und gedämpft, nicht weggelassen: wer im Buch
                „35 %" liest und sie am Bogen nicht findet, sucht einen Fehler.
              */
              note={cost.asfApplies ? undefined : S.sheet.armorCost.asfNotHere}
              /*
                Hier ist der Strich richtig: die Zahl zählt an diesem Bogen WIRKLICH
                nicht. Deshalb steht „gehen schief" in der Beschriftung und nicht im
                Wert — durchgestrichen wird eine Zahl, kein Satz.
              */
              struck={!cost.asfApplies}
            />
          )}
        </dl>
      )}
    </Card>
  );
}

/**
 * Eine Zeile: Beschriftung links, Zahl rechts, darunter Herkunft und Anmerkung.
 *
 * `dim` und `struck` sind ZWEI Sachen und nicht eine. Gedämpft heißt „gilt, kostet
 * dich aber nichts"; durchgestrichen heißt „zählt an diesem Bogen nicht" — dasselbe
 * Zeichen wie bei einem verdrängten Bonus in der Aufschlüsselung. Als es nur einen
 * Schalter gab, stand die DEX-Grenze des Magiers durchgestrichen da, und das war eine
 * falsche Auskunft.
 */
function Row(props: {
  label: string;
  value: string;
  from?: "armor" | "load" | "both" | null;
  note?: string | undefined;
  dim?: boolean;
  struck?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-slate-400">{props.label}</dt>
        <dd
          className={`shrink-0 font-semibold tabular-nums ${
            props.struck === true
              ? "text-slate-500 line-through"
              : props.dim === true
                ? "text-slate-500"
                : "text-slate-200"
          }`}
        >
          {props.value}
        </dd>
      </div>
      {(props.from != null || props.note !== undefined) && (
        <p className="text-[11px] leading-snug text-slate-500">
          {[props.from != null ? S.sheet.armorCost.from[props.from] : undefined, props.note]
            .filter((part) => part !== undefined)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
