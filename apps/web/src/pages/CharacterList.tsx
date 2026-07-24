import { Link } from "@tanstack/react-router";
import { displayName, type Character } from "@codex35/core";
import { S } from "../strings.js";
import { useCharacters, useCompendium, useSheet } from "../lib/hooks.js";
import { Card } from "../ui/bits.js";

export function CharacterListPage() {
  const characters = useCharacters();
  const compendium = useCompendium();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{S.nav.characters}</h1>
        <Link
          to="/charaktere/neu"
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
        >
          + {S.wizard.title}
        </Link>
      </div>

      {characters === undefined && <p className="text-slate-400">{S.misc.loading}</p>}
      {characters?.length === 0 && <p className="py-10 text-center text-slate-400">{S.misc.noCharacters}</p>}

      {characters?.map((character) => (
        <CharacterRow key={character.id} character={character} />
      ))}
    </div>
  );
}

function CharacterRow({ character }: { character: Character }) {
  const compendium = useCompendium();
  const sheet = useSheet(character);
  const race = compendium?.get(character.raceId);
  const classSummary = new Map<string, number>();
  for (const level of character.levels) {
    classSummary.set(level.classId, (classSummary.get(level.classId) ?? 0) + 1);
  }
  const classText = [...classSummary.entries()]
    .map(([classId, count]) => {
      const cls = compendium?.get(classId);
      return `${cls ? displayName(cls) : classId} ${count}`;
    })
    .join(" / ");

  const hpColor =
    sheet === undefined
      ? "text-slate-400"
      : sheet.hp.current <= sheet.hp.max / 4
        ? "text-red-400"
        : sheet.hp.current <= sheet.hp.max / 2
          ? "text-amber-400"
          : "text-emerald-400";

  return (
    <Link to="/charaktere/$charId" params={{ charId: character.id }}>
      <Card className="mb-2 flex items-center gap-3 transition-colors hover:border-amber-600/50">
        {character.portrait ? (
          <img src={character.portrait} alt="" className="h-14 w-14 rounded-lg object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-800 text-2xl">
            🛡️
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold">{character.name}</div>
          <div className="truncate text-sm text-slate-400">
            {race ? displayName(race) : ""} {classText && `· ${classText}`}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-amber-300">
            {S.sheet.level} {character.levels.length}
          </div>
          {sheet && (
            <div className={`mt-1 text-xs font-semibold tabular-nums ${hpColor}`}>
              {S.sheet.hp} {sheet.hp.current}/{sheet.hp.max}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
