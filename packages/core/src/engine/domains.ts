import { displayName, type Entity, type SpellListEntity } from "../schema/entities.js";

/**
 * Was eine Domäne HERGIBT — die gewährte Fähigkeit und ihre neun Zauber.
 *
 * Der Anlass: die Domänenwahl war ein `<select>` mit 36 Namen. Ein Name allein
 * ist aber keine Entscheidungsgrundlage — „War" und „Destruction" klingen
 * ähnlich, und was sie GEBEN (freies Waffentalent gegen einmal am Tag +Schaden)
 * steht nirgends. Genau derselbe Einwand wie bei den Teilgebieten: wo die App
 * die Möglichkeiten kennt, soll sie sie zeigen, nicht abfragen.
 *
 * Die gewährte Fähigkeit steht im SRD-Text hinter „**Granted Power(s):**". Der
 * Text ist die QUELLE, nicht der Richter: findet das Muster nichts, gibt es
 * `undefined` zurück und die Anzeige sagt das — sie erfindet nichts.
 */
export interface DomainInfo {
  id: string;
  /** Anzeigename, deutsches Overlay wenn vorhanden. */
  name: string;
  /** Englischer Regeltext der gewährten Fähigkeit, oder `undefined`. */
  grantedPower?: string;
  /** Die Zauber der Domäne, nach Grad. */
  spells: { spellId: string; level: number; name: string }[];
}

/*
  „**Granted Power:**" im Singular und „**Granted Powers:**" im Plural kommen
  beide vor. Geschnitten wird bis zur nächsten Leerzeile ODER bis zur ersten
  Zauberzeile („1 Obscuring mist"), je nachdem was früher kommt — sonst zieht
  der Absatz die ganze Zauberliste mit hinein.
*/
const GRANTED = /\*\*Granted Powers?:\*\*\s*([\s\S]*?)(?:\n\s*\n|\n\s*\d\s|$)/;

/** Die gewährte Fähigkeit einer Domäne, ohne die Zauberliste dahinter. */
export function grantedPowerOf(entity: Pick<Entity, "description">): string | undefined {
  const text = entity.description;
  if (text === undefined || text.trim() === "") return undefined;
  const hit = GRANTED.exec(text);
  const power = hit?.[1]?.replace(/\s+/g, " ").trim();
  return power === undefined || power === "" ? undefined : power;
}

/**
 * Eine Domäne vollständig — für die Auswahl im Assistenten und am Bogen.
 *
 * Nichts hiervon wird gespeichert: am Charakter steht nur die KENNUNG der
 * gewählten Domäne (`character.domains`), alles andere ist eine Folge daraus.
 */
export function domainInfo(
  entity: SpellListEntity,
  compendium: Map<string, Entity>,
): DomainInfo {
  const spells = Object.entries(entity.data.spells)
    .map(([spellId, level]) => {
      const spell = compendium.get(spellId);
      return {
        spellId,
        level,
        // Der Zaubername bleibt englisch — Regelbegriff, wie DEX statt GE.
        name: spell !== undefined && spell.kind === "spell" ? spell.name : spellId,
      };
    })
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  const power = grantedPowerOf(entity);
  return {
    id: entity.id,
    name: displayName(entity),
    ...(power === undefined ? {} : { grantedPower: power }),
    spells,
  };
}
