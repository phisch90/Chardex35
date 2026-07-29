import { useState } from "react";
import { readOrderMarker, shelfSubscriptionSchema } from "@codex35/core";
import { S } from "../strings.js";
import { useCharacters } from "../lib/hooks.js";
import { Card, Chip, GhostButton, PrimaryButton, SectionTitle } from "../ui/bits.js";
import { ConfirmDeleteButton } from "../ui/ConfirmDelete.js";
import { mutateGroupSettings, forgetShelf } from "./groupStore.js";
import { publishShelf, refreshGroup, type GroupReport } from "./groupSync.js";
import { shelfIdFromLink, shelfUrl } from "./shelfGist.js";
import { useCachedShelves, useGroupSettings } from "./useGroup.js";

/**
 * Die Gruppe einrichten — in den Einstellungen, neben dem Geräte-Abgleich.
 *
 * Der Aufbau folgt der Reihenfolge, in der man es wirklich tut: erst sagen, wer man
 * ist und was man zeigt (mein Regal), dann die anderen dazuholen (Abos). Nicht
 * umgekehrt: ohne eigenen Namen wüsste in fremden Listen niemand, wer da steht.
 */
export function GroupCard() {
  const settings = useGroupSettings();
  const characters = useCharacters();
  const shelves = useCachedShelves();
  const [busy, setBusy] = useState<"" | "publish" | "refresh">("");
  const [note, setNote] = useState<string | null>(null);
  const [report, setReport] = useState<GroupReport | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ link: "", passphrase: "", label: "", acceptOrders: false });

  const set = (patch: Partial<typeof settings>) =>
    void mutateGroupSettings((current) => Object.assign(current, patch));

  const publish = async () => {
    setBusy("publish");
    setNote(null);
    try {
      const result = await publishShelf();
      setNote(S.group.shared(result.shared));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy("");
    }
  };

  const refresh = async () => {
    setBusy("refresh");
    setNote(null);
    try {
      const result = await refreshGroup();
      setReport(result);
      setNote(
        result.failed.length > 0
          ? result.failed.map((entry) => `${entry.label}: ${entry.message}`).join(" · ")
          : S.group.readReport(result.read, result.ordersApplied.length),
      );
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy("");
    }
  };

  const addSubscription = () => {
    const gistId = shelfIdFromLink(draft.link);
    if (gistId === "") {
      setNote(S.group.badLink);
      return;
    }
    if (settings.subscriptions.some((entry) => entry.gistId === gistId)) {
      setNote(S.group.duplicate);
      return;
    }
    void mutateGroupSettings((current) => {
      current.subscriptions.push(
        shelfSubscriptionSchema.parse({
          gistId,
          passphrase: draft.passphrase,
          label: draft.label,
          acceptOrders: draft.acceptOrders,
        }),
      );
    }).then(() => {
      setAddOpen(false);
      setDraft({ link: "", passphrase: "", label: "", acceptOrders: false });
      void refresh();
    });
  };

  const copyInvite = async () => {
    const text = S.group.inviteText(
      settings.myName === "" ? "Jemand" : settings.myName,
      shelfUrl(settings.myGistId),
      settings.myPassphrase,
    );
    try {
      await navigator.clipboard.writeText(text);
      setNote(S.group.inviteCopied);
    } catch {
      // Ohne Zwischenablage (älteres iOS, kein https) bleibt der Text sichtbar,
      // damit man ihn von Hand markieren kann.
      setNote(text);
    }
  };

  const shared = new Set(settings.sharedCharacterIds);
  const toggleShare = (id: string) =>
    void mutateGroupSettings((current) => {
      current.sharedCharacterIds = current.sharedCharacterIds.includes(id)
        ? current.sharedCharacterIds.filter((entry) => entry !== id)
        : [...current.sharedCharacterIds, id];
    });

  return (
    <Card>
      <SectionTitle>{S.group.title}</SectionTitle>
      <p className="mb-3 text-xs text-slate-400">{S.group.hint}</p>

      {/* ---------------------------------------------------------- mein Regal */}
      <div className="mb-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {S.group.mine}
        </div>

        <label className="block">
          <span className="text-xs text-slate-400">{S.group.myName}</span>
          <input
            value={settings.myName}
            onChange={(e) => set({ myName: e.target.value })}
            placeholder={S.group.myNamePlaceholder}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
          />
        </label>

        <div>
          <Chip
            active={settings.iAmGamemaster}
            onClick={() => set({ iAmGamemaster: !settings.iAmGamemaster })}
          >
            {S.group.iAmGamemaster}
          </Chip>
          {settings.iAmGamemaster && (
            <p className="mt-1 text-[11px] text-slate-500">{S.group.iAmGamemasterHint}</p>
          )}
        </div>

        <label className="block">
          <span className="text-xs text-slate-400">{S.group.passphrase}</span>
          <input
            value={settings.myPassphrase}
            onChange={(e) => set({ myPassphrase: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
          />
          <span className="mt-1 block text-[11px] text-slate-500">{S.group.passphraseHint}</span>
        </label>
        {settings.myPassphrase === "" && (
          <p className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-300">
            {S.group.passphraseMissing}
          </p>
        )}

        {/* Welche Bögen die Gruppe sehen darf — einer je Zeile, damit man nicht
            aus Versehen alle freigibt. */}
        <div>
          <div className="mb-1 text-xs text-slate-400">{S.group.share}</div>
          {characters === undefined && <p className="text-xs text-slate-500">{S.misc.loading}</p>}
          <div className="flex flex-wrap gap-1.5">
            {(characters ?? [])
              // Entwürfe sind Probeläufe, Arbeitskopien gehören jemand anderem.
              .filter(
                (character) =>
                  character.draftOf === undefined && readOrderMarker(character) === undefined,
              )
              .map((character) => (
                <Chip
                  key={character.id}
                  active={shared.has(character.id)}
                  onClick={() => toggleShare(character.id)}
                >
                  {character.name}
                </Chip>
              ))}
          </div>
          {settings.sharedCharacterIds.length === 0 && (
            <p className="mt-1 text-[11px] text-slate-500">{S.group.noneShared}</p>
          )}
        </div>

        {settings.outgoingOrders.length > 0 && (
          <p className="text-[11px] text-amber-300">
            {S.group.pendingOrders(settings.outgoingOrders.length)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <PrimaryButton onClick={() => void publish()} disabled={busy !== ""}>
            {busy === "publish" ? S.group.publishing : S.group.publish}
          </PrimaryButton>
          {settings.myGistId !== "" && (
            <GhostButton onClick={() => void copyInvite()}>{S.group.copyInvite}</GhostButton>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- Abos */}
      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {S.group.subscriptions}
          </span>
          <GhostButton onClick={() => void refresh()} disabled={busy !== ""}>
            {busy === "refresh" ? S.group.refreshing : S.group.refresh}
          </GhostButton>
        </div>

        {settings.subscriptions.length === 0 && (
          <p className="text-xs text-slate-500">{S.group.empty}</p>
        )}

        <ul className="divide-y divide-slate-800">
          {settings.subscriptions.map((subscription) => {
            const cached = shelves?.find((entry) => entry.gistId === subscription.gistId);
            const name =
              subscription.label !== ""
                ? subscription.label
                : cached?.shelf.owner !== undefined && cached.shelf.owner !== ""
                  ? cached.shelf.owner
                  : subscription.gistId.slice(0, 7);
            return (
              <li key={subscription.gistId} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {name}
                    {cached?.shelf.gamemaster === true && (
                      <span className="ml-1.5 rounded bg-violet-900/60 px-1.5 py-0.5 text-[10px] text-violet-300">
                        SL
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    {cached === undefined
                      ? S.group.neverRead
                      : `${cached.shelf.characters.length} × · ${S.group.lastRead(
                          new Date(cached.fetchedAt).toLocaleString("de-DE"),
                        )}`}
                  </div>
                  <label className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={subscription.acceptOrders}
                      onChange={(e) =>
                        void mutateGroupSettings((current) => {
                          const mine = current.subscriptions.find(
                            (entry) => entry.gistId === subscription.gistId,
                          );
                          if (mine) mine.acceptOrders = e.target.checked;
                        })
                      }
                    />
                    {S.group.acceptOrders}
                  </label>
                </div>
                <ConfirmDeleteButton
                  label={name}
                  onConfirm={() => {
                    void forgetShelf(subscription.gistId);
                    void mutateGroupSettings((current) => {
                      current.subscriptions = current.subscriptions.filter(
                        (entry) => entry.gistId !== subscription.gistId,
                      );
                    });
                  }}
                />
              </li>
            );
          })}
        </ul>

        {addOpen ? (
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-2">
            <label className="block">
              <span className="text-xs text-slate-400">{S.group.addLink}</span>
              <input
                value={draft.link}
                onChange={(e) => setDraft({ ...draft, link: e.target.value })}
                placeholder={S.group.addLinkPlaceholder}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">{S.group.addPassphrase}</span>
              <input
                value={draft.passphrase}
                onChange={(e) => setDraft({ ...draft, passphrase: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">{S.group.addLabel}</span>
              <input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-start gap-1.5 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={draft.acceptOrders}
                onChange={(e) => setDraft({ ...draft, acceptOrders: e.target.checked })}
                className="mt-0.5"
              />
              <span>
                {S.group.acceptOrders}
                <span className="block text-[11px] text-slate-500">{S.group.acceptOrdersHint}</span>
              </span>
            </label>
            <div className="flex gap-2">
              <PrimaryButton onClick={addSubscription}>{S.group.add}</PrimaryButton>
              <GhostButton onClick={() => setAddOpen(false)}>{S.actions.cancel}</GhostButton>
            </div>
          </div>
        ) : (
          <GhostButton onClick={() => setAddOpen(true)}>+ {S.group.add}</GhostButton>
        )}
      </div>

      {note !== null && (
        <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-300" role="status">
          {note}
        </p>
      )}
      {report !== null && report.rescued.length > 0 && (
        <p className="mt-1 rounded-lg border border-amber-800/60 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-300">
          {S.group.rescuedHint(report.rescued)}
        </p>
      )}
      {report !== null &&
        report.ordersRefused.map((refused) => (
          <p key={refused.characterId} className="mt-1 text-[11px] text-red-300">
            {refused.reason}
          </p>
        ))}
    </Card>
  );
}
