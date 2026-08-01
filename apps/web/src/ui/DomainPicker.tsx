import { useMemo, useState } from "react";
import { domainInfo, domainSpellLists, type DomainInfo, type Entity } from "@codex35/core";
import { S } from "../strings.js";
import { Chip, GhostButton, SearchInput } from "./bits.js";

/**
 * Domänen WÄHLEN, indem man sieht, was sie geben.
 *
 * Vorher stand hier ein `<select>` mit 36 Namen. Ein Name ist aber keine
 * Entscheidungsgrundlage: „War" und „Destruction" klingen gleich wichtig, und
 * was sie GEWÄHREN (freies Waffentalent gegen einmal am Tag +Schaden) stand
 * nirgends — genauso wenig wie die neun Zauber, die man sich damit erschließt.
 *
 * Derselbe Einwand wie bei den Teilgebieten, wörtlich: „Find ich ja irgendwie
 * sehr unprofessionell, dass man da dann das Ganze abtippen soll, was man
 * auswählt." Wo die App die Möglichkeiten KENNT, zeigt sie sie.
 *
 * Eine Komponente für BEIDE Orte — den Assistenten und den Bogen. Zwei Kopien
 * dieser Liste wären zwei Wahrheiten über dieselbe Regel.
 */
export function DomainPicker({
  compendium,
  picked,
  pick,
  onAdd,
  onRemove,
}: {
  compendium: Map<string, Entity>;
  /** Schon gewählte Domänen (Kennungen der Zauberlisten). */
  picked: string[];
  /** Wie viele Domänen die Klasse hergibt. */
  pick: number;
  onAdd: (spellListId: string) => void;
  onRemove: (spellListId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const all = useMemo<DomainInfo[]>(
    () => domainSpellLists(compendium).map((entity) => domainInfo(entity, compendium)),
    [compendium],
  );

  const pickedSet = new Set(picked);
  const full = picked.length >= pick;
  const q = query.trim().toLowerCase();
  /*
    Gesucht wird im Namen UND in der gewährten Fähigkeit: „waffentalent" oder
    „weapon focus" soll die War-Domäne finden, ohne dass man den Namen kennt.
  */
  const shown = all.filter(
    (domain) =>
      q === "" ||
      domain.name.toLowerCase().includes(q) ||
      (domain.grantedPower ?? "").toLowerCase().includes(q) ||
      domain.spells.some((s) => s.name.toLowerCase().includes(q)),
  );

  return (
    <div className="space-y-2">
      {/* Der Kontostand zuerst: „1 von 2 gewählt" ist die Frage, die im Raum steht. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-slate-300">
          {S.spells.domainCount(picked.length, pick)}
        </span>
        {picked.map((id) => {
          const domain = all.find((d) => d.id === id);
          return (
            <Chip key={id} active onClick={() => onRemove(id)}>
              {domain?.name ?? id} ✕
            </Chip>
          );
        })}
      </div>

      <SearchInput value={query} onChange={setQuery} placeholder={S.actions.search} />

      <ul className="divide-y divide-slate-800">
        {shown.map((domain) => {
          const already = pickedSet.has(domain.id);
          const open = openId === domain.id;
          return (
            <li key={domain.id} className="py-1.5">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => setOpenId(open ? null : domain.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className={`text-sm ${already ? "text-violet-300" : ""}`}>{domain.name}</div>
                  {/*
                    Die gewährte Fähigkeit ist der Grund, aus dem man wählt — sie steht
                    zugeklappt in EINER Zeile, aufgeklappt vollständig. Abschneiden mit
                    „…" ist hier in Ordnung: der ganze Text ist einen Tipp entfernt.
                  */}
                  {domain.grantedPower !== undefined && (
                    <div className={open ? "text-xs leading-relaxed text-slate-400" : "truncate text-xs text-slate-500"}>
                      {domain.grantedPower}
                    </div>
                  )}
                </button>
                {/*
                  Das `title` steht per Spread da: `exactOptionalPropertyTypes`
                  unterscheidet „Feld weglassen" von „Feld auf undefined setzen".
                */}
                {already ? (
                  <GhostButton onClick={() => onRemove(domain.id)}>{S.actions.remove}</GhostButton>
                ) : (
                  <GhostButton
                    onClick={() => onAdd(domain.id)}
                    disabled={full}
                    {...(full ? { title: S.spells.domainFull } : {})}
                  >
                    {S.actions.add}
                  </GhostButton>
                )}
              </div>
              {open && (
                <ol className="mt-1 space-y-0.5 border-l-2 border-violet-900/60 pl-2">
                  {domain.spells.map((spell) => (
                    <li key={spell.spellId} className="text-[11px] text-slate-400">
                      <span className="font-mono text-slate-500">{spell.level}</span> {spell.name}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
        {shown.length === 0 && <li className="py-2 text-sm text-slate-500">{S.compendium.empty}</li>}
      </ul>
      <p className="text-[10px] leading-snug text-slate-500">{S.spells.domainsHint}</p>
    </div>
  );
}
