import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { orderFromWorkCopy, type Character, type OrderMarker } from "@codex35/core";
import { S } from "../strings.js";
import { CharacterRepo } from "../db/repo.js";
import { GhostButton, PrimaryButton } from "../ui/bits.js";
import { mutateGroupSettings } from "./groupStore.js";
import { useGroupSettings } from "./useGroup.js";

/**
 * Der Streifen über einer Arbeitskopie.
 *
 * Er sieht bewusst aus wie der Entwurfs-Streifen und sitzt an derselben Stelle:
 * beides sind Bögen, die NICHT der eigene sind, und beide müssen sich sofort
 * verraten. Ohne das trägt man eine Stufe in einen fremden Charakter ein und hält
 * ihn für den eigenen.
 */
export function OrderBanner({
  character,
  marker,
}: {
  character: Character;
  marker: OrderMarker;
}) {
  const navigate = useNavigate();
  const settings = useGroupSettings();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  const owner = marker.owner === "" ? S.group.unknownOwner : marker.owner;

  /**
   * Abschicken heißt: vormerken. Beim Spieler ankommen kann es erst, wenn das
   * Regal geschrieben wird und seine App abholt — und das ehrlich zu benennen ist
   * besser, als ein „gesendet" anzuzeigen, das nichts über die Ankunft sagt.
   *
   * Die Arbeitskopie wird danach entfernt. Sie war ein Werkzeug, kein Bogen; sie
   * stehen zu lassen hieße, beim nächsten Mal nicht zu wissen, welche Fassung
   * gilt.
   */
  const send = async () => {
    const order = orderFromWorkCopy(character, marker, {
      id: crypto.randomUUID(),
      issuedBy: settings.myName,
      note,
      now: new Date().toISOString(),
    });
    await mutateGroupSettings((current) => {
      // Eine ältere, noch nicht verschickte Änderung für denselben Bogen wird
      // ersetzt: es gilt der letzte Stand, nicht die Summe der Zwischenschritte.
      current.outgoingOrders = [
        ...current.outgoingOrders.filter((entry) => entry.characterId !== order.characterId),
        order,
      ];
    });
    /*
      Mit Löschvermerk, nicht hart weg. Das war die einzige Stelle im Projekt, die
      eine Zeile wirklich entfernt hat — und ohne Vermerk liegt sie noch in der
      Ablage und kommt beim nächsten Geräte-Abgleich als „nur dort vorhanden"
      zurück. Eine Arbeitskopie, die von den Toten wiederkehrt, ist genau die
      Sorte Rätsel, die niemand lösen will.
    */
    await CharacterRepo.remove(character);
    setSent(S.group.orderQueued(owner));
    await navigate({
      to: "/gruppe/$gistId/$charId",
      params: { gistId: marker.gistId, charId: marker.characterId },
    });
  };

  return (
    <div className="-mx-3 -mt-3 flex flex-wrap items-center gap-2 border-b border-violet-800/60 bg-violet-950/40 px-3 py-2 text-xs text-violet-200">
      <span className="font-semibold">✎ {S.group.editForeign}</span>
      <span className="text-violet-300/80">{owner}</span>
      {sent !== null && <span className="text-emerald-300">{sent}</span>}
      <div className="ml-auto flex items-center gap-1.5">
        {noteOpen ? (
          <>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={S.group.orderNotePlaceholder}
              className="w-40 rounded-lg border border-violet-800 bg-slate-950 px-2 py-1 text-violet-100"
            />
            <PrimaryButton onClick={() => void send()}>{S.actions.send}</PrimaryButton>
          </>
        ) : (
          <GhostButton onClick={() => setNoteOpen(true)}>{S.group.orderNote}</GhostButton>
        )}
      </div>
    </div>
  );
}
