import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  displayName,
  spellsForCaster,
  type Character,
  type SpellEntity,
  type SpellcastingBlock,
} from "@codex35/core";
import { S } from "../../strings.js";
import { DomainPicker } from "../../ui/DomainPicker.js";
import { useCompendium } from "../../lib/hooks.js";
import { Card, Chip, GhostButton, SearchInput, SectionTitle, fmtMod } from "../../ui/bits.js";
import type { TabProps } from "./index.js";

export function SpellsTab(props: TabProps) {
  return (
    <div className="space-y-3">
      {props.sheet.spellcasting.map((block) => (
        <CasterBlock key={block.classId} block={block} {...props} />
      ))}
    </div>
  );
}

function emptySpellState(): NonNullable<Character["spellState"][string]> {
  return { known: [], prepared: [], usedSlots: [], favorites: [] };
}

/**
 * Welche Zaubergrade zugeklappt sind — sein Wunsch: „Ansonsten kann man die
 * verschiedenen Zauberstufen auch einklappen, sodass man eine bessere Übersicht
 * bekommt."
 *
 * Das ist eine ANSICHTS-Vorliebe und kein Zustand der Figur: nichts davon gehört an den
 * Charakter, sonst reist es über den Abgleich zu den anderen Geräten und läge im Export.
 * Es liegt im `sessionStorage` und je Klasse — genau wie der gemerkte Reiter (siehe
 * `rememberedTab` im Bogen). Der Grund ist derselbe: wer aus der Beschreibung eines
 * Zaubers zurückkommt, will seinen Stand wiederfinden, und nach dem Neustart der App
 * will er alles sehen.
 */
const FOLD_MEMORY = "codex35.spells.folded.";

function readFolded(key: string): Set<number> {
  try {
    const raw = sessionStorage.getItem(FOLD_MEMORY + key);
    if (raw === null) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : []);
  } catch {
    // Privater Modus kann sessionStorage sperren — dann eben ohne Gedächtnis.
    return new Set();
  }
}

function writeFolded(key: string, levels: Set<number>): void {
  try {
    sessionStorage.setItem(FOLD_MEMORY + key, JSON.stringify([...levels]));
  } catch {
    // s.o.
  }
}

/** „Enchantment (V, S, DF)" — Schule und Komponenten wie auf einer Zauberkarte. */
function spellSubline(spell: SpellEntity | null): string {
  if (!spell) return "";
  const parts = [spell.data.school, ...(spell.data.subschool ? [spell.data.subschool] : [])]
    .filter((p) => p !== "")
    .join("/");
  return spell.data.components ? `${parts} (${spell.data.components})` : parts;
}

function CasterBlock({
  block,
  character,
  editMode,
  save,
}: TabProps & { block: SpellcastingBlock }) {
  const compendium = useCompendium();
  const [query, setQuery] = useState("");
  const [addLevel, setAddLevel] = useState<number | null>(null);
  const foldKey = `${character.id}.${block.classId}`;
  const [folded, setFolded] = useState<Set<number>>(() => readFolded(foldKey));
  const toggleFold = (level: number) => {
    const next = new Set(folded);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    setFolded(next);
    writeFolded(foldKey, next);
  };

  /*
    `block` als Ganzes ist die richtige Abhängigkeit: der abgeleitete Bogen hängt
    am Charakter (useSheet merkt sich ihn), nicht am Tippen im Suchfeld. Die 236
    Klerikerzauber plus Domänenzauber werden also einmal je Bogenstand sortiert
    und nicht bei jedem Tastendruck.
  */
  const entries = useMemo(
    () => (compendium ? spellsForCaster(compendium, block) : []),
    [compendium, block],
  );
  const state = character.spellState[block.classId] ?? emptySpellState();
  const knownSet = new Set(state.known);
  /*
    Favoriten. `?? []` statt Vertrauen aufs Schema: gespeicherte Bögen sind nie auf dem
    Stand des Schemas — das ist die erste Fehlerfamilie dieses Projekts, und sie hat hier
    schon einmal zugeschlagen (die Domänen eines Klerikers, der vor ihnen angelegt wurde).
  */
  const favoriteSet = new Set(state.favorites ?? []);
  const isPrepared = block.model === "prepared";
  // Nur Magier (und Assassine) führen ein Zauberbuch — Kleriker, Druiden,
  // Paladine und Waldläufer kennen ihre gesamte Klassenliste (3.5-Regeln).
  const usesSpellbook = block.usesSpellbook;

  const mutate = (fn: (s: NonNullable<Character["spellState"][string]>) => void) =>
    save((c) => {
      const s = (c.spellState[block.classId] ??= emptySpellState());
      fn(s);
      // Direkte Index-Zuweisung kann Sparse-Löcher erzeugen — normalisieren,
      // damit Export (JSON) und Zod-Import sauber bleiben.
      s.usedSlots = Array.from(s.usedSlots, (v) => v ?? 0);
    });

  /**
   * Domänen sind AUFBAU, nicht Spielzustand — sie liegen deshalb neben
   * `spellState` am Charakter und werden hier direkt geschrieben.
   *
   * Doppelte werden abgewiesen: zwei Mal War brächte zwei Mal dieselben neun
   * Zauber und einen Platz, den es nicht gibt.
   */
  const addDomain = (spellListId: string) =>
    save((c) => {
      if (c.domains.some((d) => d.classId === block.classId && d.spellListId === spellListId)) return;
      c.domains.push({ classId: block.classId, spellListId });
    });

  const removeDomain = (spellListId: string) =>
    save((c) => {
      c.domains = c.domains.filter(
        (d) => !(d.classId === block.classId && d.spellListId === spellListId),
      );
    });

  const slotFor = (level: number) => block.slots.find((s) => s.level === level);

  const castAt = (level: number) => {
    const slot = slotFor(level);
    if (!slot || slot.total === null) return;
    const total = slot.total;
    mutate((s) => {
      s.usedSlots[level] = Math.min(total, (s.usedSlots[level] ?? 0) + 1);
    });
  };

  const canCastAt = (level: number) => {
    const slot = slotFor(level);
    return slot !== undefined && slot.total !== null && (state.usedSlots[level] ?? 0) < slot.total;
  };

  // 3.5: je Grad nur so viele Zauber vorbereiten, wie Slots vorhanden sind.
  const preparedCountAt = (level: number) =>
    state.prepared.filter((p) => p.slotLevel === level).length;
  const canPrepareAt = (level: number) => {
    const slot = slotFor(level);
    return slot !== undefined && slot.total !== null && preparedCountAt(level) < slot.total;
  };

  // Spontanzauberer: bekannte Zauber je Grad aus der spellsKnown-Tabellenzeile.
  const knownCountAt = (level: number) =>
    entries.filter((e) => e.level === level && knownSet.has(e.spellId)).length;
  const canLearnAt = (level: number) => {
    const limit = block.spellsKnown?.[level];
    if (limit === undefined || limit === null) return true;
    return knownCountAt(level) < limit;
  };

  const availableLevels = block.slots.filter((s) => s.total !== null).map((s) => s.level);

  /**
   * Was im Grad-Abschnitt steht: beim Magier sein Zauberbuch, bei allen anderen
   * die ganze Klassenliste. Fight Club zeigt genau das — die Auswahl passiert
   * direkt in der Liste, nicht in einem zweiten Dialog.
   */
  const repertoireAt = (level: number) => {
    const q = query.trim().toLowerCase();
    const list = entries.filter((e) => {
      if (e.level !== level || e.spell === null) return false;
      if (usesSpellbook && !knownSet.has(e.spellId)) return false;
      return !q || e.spell.name.toLowerCase().includes(q);
    });
    /*
      Favoriten nach oben — sein Wort: „mit Sternchen stehen dann in den Zauberstufen
      ganz oben, sodass man sie schnell wiederfindet."

      Nur die Reihenfolge INNERHALB des Grads dreht sich, und stabil: unter den Favoriten
      und unter dem Rest bleibt die alphabetische Ordnung, die die Liste vorher hatte.
      Zwei Sortierungen übereinander wären sonst eine Liste, die bei jedem Stern springt.
    */
    return [...list].sort(
      (a, b) => (favoriteSet.has(b.spellId) ? 1 : 0) - (favoriteSet.has(a.spellId) ? 1 : 0),
    );
  };

  /** Nur für Zauberbuch-Klassen: was noch nicht im Buch steht. */
  const missingAt = (level: number) => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (e.level !== level || e.spell === null) return false;
      if (knownSet.has(e.spellId)) return false;
      return !q || e.spell.name.toLowerCase().includes(q);
    });
  };

  const togglePrepared = (spellId: string, level: number) =>
    mutate((s) => {
      const index = s.prepared.findIndex((p) => p.spellId === spellId && p.slotLevel === level);
      if (index >= 0) s.prepared.splice(index, 1);
      else if (canPrepareAt(level)) s.prepared.push({ spellId, slotLevel: level });
    });

  const toggleKnown = (spellId: string, level: number) =>
    mutate((s) => {
      if (s.known.includes(spellId)) s.known = s.known.filter((id) => id !== spellId);
      else if (canLearnAt(level)) s.known.push(spellId);
    });

  /*
    Der Stern. Er hängt an KEINER Grenze: ein Favorit kostet keinen Platz und ist nichts
    vorbereitet — man darf jeden Zauber markieren, auch einen, den man heute nicht
    vorbereitet hat. Deshalb steht er auch außerhalb des Bearbeiten-Modus zur Verfügung:
    am Tisch merkt man sich seine Lieblinge, nicht beim Aufbauen des Bogens.
  */
  const toggleFavorite = (spellId: string) =>
    mutate((s) => {
      const list = s.favorites ?? [];
      s.favorites = list.includes(spellId)
        ? list.filter((id) => id !== spellId)
        : [...list, spellId];
    });

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <SectionTitle>
            {block.className} — {isPrepared ? "vorbereitet" : "spontan"}
          </SectionTitle>
          <p className="text-xs text-slate-400">
            {S.sheet.casterLevel} {block.casterLevel.total} · {S.spells.dc} {block.dcBase} +{" "}
            {S.spells.level} · {S.abilities[block.ability]} {fmtMod(block.abilityMod)}
          </p>
        </div>
        {/*
          Hier saß der Mond: ein Tap, und alle verbrauchten Plätze DIESER Klasse
          waren wieder da. Philipps Einwand, wörtlich: „Mond überall entfernen.
          Rasten soll irgendwo anders zentral sein nicht ein Button den man
          versehentlich drückt ohne zu wissen was passiert ist."

          Er hatte in beidem recht. Der Knopf saß oben rechts in der Karte, dort wo
          sonst das Aktionsmenü sitzt, und ein Fehlgriff kostete den ganzen
          Zaubertag. Und als Rast war er ohnehin falsch: ein Kleriker/Magier hatte
          zwei davon, jeder füllte nur seinen eigenen Block. Die Rast steht jetzt
          EINMAL im ⋯-Menü, nennt vorher die Zahlen und lässt sich zurücknehmen.
        */}
      </div>

      {/*
        Domänen. Sie stehen ÜBER der Suche und über den Graden, weil sie
        entscheiden, was in den Graden überhaupt zur Auswahl steht — und weil ein
        Kleriker ohne gewählte Domänen zwei Plätze hat, die er nicht füllen kann.
      */}
      {block.domainPick > 0 && (
        <div className="mt-2 rounded-xl border border-slate-700 bg-slate-900/60 px-2.5 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-300">{S.spells.domains}</span>
            {block.domains.map((domain) => (
              <span
                key={domain.spellListId}
                className="flex items-center gap-1 rounded-lg bg-violet-950/60 px-2 py-0.5 text-[11px] text-violet-200"
              >
                <Link
                  to="/kompendium/$kind/$entityId"
                  params={{ kind: "spelllist", entityId: domain.spellListId }}
                  className="hover:text-violet-100"
                >
                  {domain.name}
                </Link>
                {editMode && (
                  <button
                    onClick={() => removeDomain(domain.spellListId)}
                    title={S.spells.domainRemove}
                    className="text-violet-400 hover:text-rose-300"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
            {block.domains.length < block.domainPick && (
              <span className="text-[11px] text-amber-400">
                {S.spells.domainsMissing(block.domains.length, block.domainPick)}
              </span>
            )}
          </div>
          {/*
            Vorher stand hier ein `<select>` mit 36 Namen. Ein Name allein sagt
            nicht, was die Domäne GEWÄHRT — und genau das ist der Grund, aus dem man
            wählt. Jetzt derselbe Auswähler wie im Assistenten: eine Komponente,
            eine Wahrheit über dieselbe Regel.
          */}
          {editMode && compendium !== undefined && (
            <div className="mt-1.5">
              <DomainPicker
                compendium={compendium}
                picked={block.domains.map((d) => d.spellListId)}
                pick={block.domainPick}
                onAdd={addDomain}
                onRemove={removeDomain}
              />
            </div>
          )}
          {!editMode && (
            <p className="mt-1 text-[10px] leading-snug text-slate-500">{S.spells.domainsHint}</p>
          )}
        </div>
      )}

      <div className="mt-2">
        <SearchInput value={query} onChange={setQuery} placeholder={S.actions.search} />
      </div>

      {availableLevels.map((level) => {
        const slot = slotFor(level)!;
        const total = slot.total ?? 0;
        const used = state.usedSlots[level] ?? 0;
        const repertoire = repertoireAt(level);
        const missing = usesSpellbook ? missingAt(level) : [];
        const isFolded = folded.has(level);
        const favCount = repertoire.filter((e) => favoriteSet.has(e.spellId)).length;
        return (
          <section key={level} className="mt-4">
            {/* Grad-Kopf mit Slot-Pips, Verbrauch und SG — wie in Fight Club. */}
            <div className="flex items-center gap-2 border-b border-slate-700 pb-1">
              {/*
                Der Grad-Name ist der Auf-/Zuklapper. Nur er, nicht die ganze Kopfzeile:
                dort sitzen die − und + für die verbrauchten Plätze, und ein Tap daneben
                darf nicht die halbe Liste zuklappen. Die Zahl der Favoriten steht am
                zugeklappten Grad — sonst wäre nicht zu sehen, dass sich Lohnendes
                darunter versteckt.
              */}
              <button
                type="button"
                onClick={() => toggleFold(level)}
                aria-expanded={!isFolded}
                className="flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-wide text-amber-400"
              >
                <span aria-hidden="true" className="text-[10px]">
                  {isFolded ? "▸" : "▾"}
                </span>
                {S.spells.level} {level}
                {isFolded && favCount > 0 && (
                  <span className="font-normal normal-case text-amber-300">
                    {" "}
                    ★{favCount}
                  </span>
                )}
              </button>
              <span className="flex-1 truncate font-mono text-[11px] text-slate-400">
                {/*
                  Der Domänenplatz ist der LETZTE Punkt der Reihe und trägt eine
                  eigene Form. Verbraucht wird von links, also füllt er sich
                  zuletzt — was der Wahrheit entspricht: die App weiß nicht,
                  welcher der gewirkten Zauber der Domänenzauber war, und sie soll
                  nicht so tun als ob.
                */}
                {Array.from({ length: total }, (_, i) => {
                  const isDomain = i >= total - slot.domain;
                  const symbol = isDomain ? (i < used ? "◆" : "◇") : i < used ? "●" : "○";
                  return (
                    <span key={i} className={isDomain ? "text-violet-300" : undefined}>
                      {symbol}
                      {i < total - 1 ? " " : ""}
                    </span>
                  );
                })}
                {slot.bonus > 0 && <span className="ml-1 text-emerald-500">(+{slot.bonus})</span>}
              </span>
              <span className="shrink-0 text-[11px] text-slate-400">
                {S.spells.slots} {total - used}/{total}
              </span>
              <span className="shrink-0 text-[11px] text-slate-500">
                {S.spells.dc} {block.dcBase + level}
              </span>
              {/*
                − verbraucht, + gibt zurück. Sein Wort: „Bei den Zaubern würde ich gerne +
                und - in der Funktion vertauschen. Das ist aus meiner Sicht logischer."

                Er hat recht, und der Grund steht direkt daneben: die Zahl im Kopf zeigt die
                FREIEN Plätze („Slots 3/4"). Ein „+" an einer 3, nach dem eine 2 dasteht,
                widerspricht sich selbst. Gespeichert wird zwar die Gegenzahl (die
                VERBRAUCHTEN Plätze, `usedSlots`) — aber der Knopf gehört zur Anzeige, nicht
                zum Speicher.

                Und die Sperren wandern mit: − kann man nur drücken, wenn noch ein Platz frei
                ist, + nur, wenn überhaupt etwas verbraucht wurde. Ein Knopf, der nichts tut,
                verspricht etwas, das nicht kommt.
              */}
              <GhostButton
                disabled={!canCastAt(level)}
                onClick={() => castAt(level)}
                title={S.spells.cast}
              >
                −
              </GhostButton>
              <GhostButton
                disabled={used === 0}
                onClick={() =>
                  mutate((s) => {
                    s.usedSlots[level] = Math.max(0, (s.usedSlots[level] ?? 0) - 1);
                  })
                }
                title={S.spells.giveBackSlot}
              >
                +
              </GhostButton>
            </div>

            {isFolded ? (
              <p className="py-2 text-[11px] text-slate-500">
                {S.spells.foldedHint(repertoire.length)}
              </p>
            ) : (
            <ul className="divide-y divide-slate-800">
              {repertoire.map((entry) => {
                const count = isPrepared
                  ? state.prepared.filter((p) => p.spellId === entry.spellId && p.slotLevel === level)
                      .length
                  : 0;
                /*
                  Auf Grad 0 gilt `count` nichts mehr — dort wird nicht vorbereitet. Auf
                  Hikes Bogen standen die alten Einträge noch als „Vorbereitet" und als
                  „×2" da: Reste einer Regel, die es nicht mehr gibt. Weggeräumt wird
                  auch die Daten-Seite, und zwar im Schreibweg (`db/repo.ts`).
                */
                const active = isPrepared
                  ? level > 0 && count > 0
                  : knownSet.has(entry.spellId);
                /*
                  Grad 0 ohne Vorbereitung — Martins Regel: „müssen nicht vorbereitet
                  werden, allgemein lockere Handhabung, gilt für alle." Die PLÄTZE
                  bleiben (seine Entscheidung), nur die Wahl fällt beim Wirken.

                  Betroffen sind allein die Vorbereiter: ein Barde oder Hexenmeister
                  entscheidet ohnehin erst beim Wirken, für ihn ändert die Regel nichts.
                  Deshalb hängt das hier an `isPrepared` und nicht am Grad allein.
                */
                const freeCantrip = isPrepared && level === 0;
                const castable = freeCantrip || active;
                const blocked = active
                  ? false
                  : isPrepared
                    ? !canPrepareAt(level)
                    : !canLearnAt(level);
                return (
                  /*
                    Beschriftete Knöpfe statt Symbole. Sein Einwand war richtig:
                    dass ◉ „vorbereitet" heißt und ✨ „wirken", errät niemand —
                    und eine Legende darunter ist keine Antwort, wenn die zwei
                    wichtigsten Handgriffe am Zauber-Reiter dahinter stecken.

                    Die Knöpfe stehen in einer zweiten Zeile unter dem Namen. Auf
                    einem 390 px breiten Handy wäre „Vorbereiten" neben Name und
                    Untertitel nicht unterzubringen, ohne wieder abzukürzen.
                  */
                  <li key={entry.spellId} className="py-1.5">
                    <div className="flex items-baseline gap-2">
                      {/*
                        Der Stern steht VOR dem Namen: er ist eine Marke, kein Handgriff.
                        Beim Durchblättern erkennt man ihn an der Kante, ohne die Zeile zu
                        lesen — und weil er zugleich der Knopf ist, kostet das Markieren
                        keinen zweiten Tap woanders.
                      */}
                      <button
                        type="button"
                        onClick={() => toggleFavorite(entry.spellId)}
                        title={
                          favoriteSet.has(entry.spellId) ? S.spells.unfavorite : S.spells.favorite
                        }
                        aria-label={
                          favoriteSet.has(entry.spellId) ? S.spells.unfavorite : S.spells.favorite
                        }
                        aria-pressed={favoriteSet.has(entry.spellId)}
                        className={`-my-1 shrink-0 px-1 py-1 text-sm leading-none ${
                          favoriteSet.has(entry.spellId) ? "text-amber-300" : "text-slate-600"
                        }`}
                      >
                        {favoriteSet.has(entry.spellId) ? "★" : "☆"}
                      </button>
                      <Link
                        to="/kompendium/$kind/$entityId"
                        params={{ kind: "spell", entityId: entry.spellId }}
                        className="min-w-0 flex-1 hover:text-amber-300"
                      >
                        <div className={`truncate text-sm ${active ? "font-semibold text-amber-200" : ""}`}>
                          {entry.spell ? displayName(entry.spell) : entry.spellId}
                          {count > 1 && <span className="text-slate-400"> ×{count}</span>}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">
                          {/*
                            Woher der Zauber kommt, muss dranstehen: Power Word
                            Kill steht auf keiner Klerikerliste und wäre ohne die
                            Marke ein Zauber, den man sich nicht erklären kann.
                          */}
                          {entry.domain !== undefined && (
                            <span className="mr-1 rounded bg-violet-950/60 px-1 text-violet-300">
                              {entry.domain}
                            </span>
                          )}
                          {spellSubline(entry.spell)}
                        </div>
                      </Link>
                      {active && (
                        <span className="shrink-0 text-[11px] text-amber-400">
                          {isPrepared ? S.spells.isPrepared : S.spells.isKnown}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {/* Wirken zuerst und hervorgehoben — das ist der Handgriff
                          am Spieltisch. */}
                      {castable && (
                        <button
                          disabled={!canCastAt(level)}
                          onClick={() => castAt(level)}
                          className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white disabled:bg-slate-700 disabled:text-slate-500"
                        >
                          {S.spells.cast}
                        </button>
                      )}
                      {/* Auf Grad 0 gibt es nichts vorzubereiten — also auch keinen Knopf
                          dafür. Ein „Vorbereiten", das nichts bedeutet, ist schlimmer
                          als keins. */}
                      {!freeCantrip && (
                        <GhostButton
                          disabled={blocked}
                          onClick={() =>
                            isPrepared
                              ? togglePrepared(entry.spellId, level)
                              : toggleKnown(entry.spellId, level)
                          }
                        >
                          {active
                            ? isPrepared
                              ? S.spells.unprepare
                              : S.spells.unlearn
                            : isPrepared
                              ? S.spells.prepare
                              : S.spells.learn}
                        </GhostButton>
                      )}
                      {isPrepared && !freeCantrip && count > 0 && (
                        <GhostButton
                          disabled={!canPrepareAt(level)}
                          onClick={() =>
                            mutate((s) => void s.prepared.push({ spellId: entry.spellId, slotLevel: level }))
                          }
                        >
                          {S.spells.another}
                        </GhostButton>
                      )}
                      {usesSpellbook && (
                        <GhostButton
                          danger
                          onClick={() => mutate((s) => void (s.known = s.known.filter((id) => id !== entry.spellId)))}
                        >
                          {S.spells.removeFromSpellbook}
                        </GhostButton>
                      )}
                    </div>
                  </li>
                );
              })}
              {repertoire.length === 0 && (
                <li className="py-2 text-sm text-slate-500">
                  {usesSpellbook ? S.spells.emptySpellbook : S.spells.noneAtLevel}
                </li>
              )}
            </ul>
            )}

            {/* Zauberbuch-Klassen: der Rest der Klassenliste, aufklappbar. */}
            {usesSpellbook && (
              <div className="mt-1">
                <Chip
                  active={addLevel === level}
                  onClick={() => setAddLevel(addLevel === level ? null : level)}
                >
                  📖 {S.spells.addToSpellbook}
                </Chip>
                {addLevel === level && (
                  <ul className="mt-1 max-h-64 divide-y divide-slate-800 overflow-y-auto rounded-lg bg-slate-900/60 p-1">
                    {missing.slice(0, 80).map((entry) => (
                      <li key={entry.spellId} className="flex items-center gap-2 py-1.5">
                        <Link
                          to="/kompendium/$kind/$entityId"
                          params={{ kind: "spell", entityId: entry.spellId }}
                          className="min-w-0 flex-1 hover:text-amber-300"
                        >
                          <div className="truncate text-sm">
                            {entry.spell ? displayName(entry.spell) : entry.spellId}
                          </div>
                          <div className="truncate text-[11px] text-slate-500">
                            {spellSubline(entry.spell)}
                          </div>
                        </Link>
                        <GhostButton
                          onClick={() => mutate((s) => void s.known.push(entry.spellId))}
                        >
                          + {S.spells.spellbook}
                        </GhostButton>
                      </li>
                    ))}
                    {missing.length === 0 && (
                      <li className="py-2 text-sm text-slate-500">{S.spells.noneAtLevel}</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}

      {!isPrepared && block.spellsKnown && (
        <p className="mt-3 text-[11px] text-slate-500">
          {S.spells.knownLimit(
            state.known.length,
            block.spellsKnown.filter((k) => k !== null).reduce((a, b) => a + (b ?? 0), 0).toString(),
          )}
        </p>
      )}
      {isPrepared && <p className="mt-3 text-[10px] text-slate-500">{S.spells.preparedHint}</p>}
      {/*
        Wo die Rast jetzt steckt. Der Mond war leicht zu finden, weil er im Weg
        stand — genau sein Vorwurf. Ein Satz an der Stelle, an der man ihn sucht
        (unten am Zauberblock, nicht als Knopf), löst beides.
      */}
      <p className="mt-1 text-[10px] leading-snug text-slate-500">{S.spells.restElsewhere}</p>

      {/*
        Legende. Nur noch für die Zeichen, die wirklich Zeichen bleiben: die
        Slot-Punkte im Grad-Kopf. Vorbereiten und Wirken stehen jetzt als Wort am
        Zauber, und die Rast ist ins ⋯-Menü gewandert — dafür braucht es hier
        keine Erklärung mehr.
      */}
      <details className="mt-3 border-t border-slate-800 pt-2">
        <summary className="cursor-pointer text-xs text-slate-400">Zeichen-Legende</summary>
        <ul className="mt-1.5 space-y-1 text-xs leading-snug text-slate-500">
          <li>
            <span className="text-amber-400">●</span> / <span className="text-slate-500">○</span> im
            Grad-Kopf — verbrauchter / freier Slot dieses Grads
          </li>
          {/*
            Die Reihenfolge in der Legende folgt der Reihenfolge der Knöpfe im Kopf, und
            beide folgen der angezeigten Zahl: − macht sie kleiner, + größer. Stand hier
            „＋ / −", während im Kopf „− +" steht, wäre die Legende die dritte Wahrheit.
          */}
          <li>
            <span className="text-slate-300">−</span> / <span className="text-slate-300">＋</span> im
            Grad-Kopf — Slot von Hand verbrauchen bzw. zurückgeben
          </li>
          {usesSpellbook && (
            <li>
              <span className="text-slate-300">📖</span> — Zauberbuch erweitern
            </li>
          )}
          <li>
            <span className="text-emerald-400">(+n)</span> hinter der Slot-Zahl — Bonus-Slots aus{" "}
            {S.abilities[block.ability]}
          </li>
          {block.domainPick > 0 && (
            <li>
              <span className="text-violet-300">◆</span> / <span className="text-violet-300">◇</span>{" "}
              im Grad-Kopf — der {S.spells.domainSlot} dieses Grads. Er gehört einem Zauber aus deinen
              Domänen; verbraucht wird von links, er füllt sich also zuletzt.
            </li>
          )}
        </ul>
      </details>
    </Card>
  );
}
