import { useState } from "react";
import { S } from "../../strings.js";
import { Card, Field, SectionTitle, inputClass } from "../../ui/bits.js";
import { CampaignPicker } from "../../ui/CampaignPicker.js";
import type { TabProps } from "./index.js";

/**
 * Name und Spieler:in ändern.
 *
 * Beides wurde bisher nur im Erstellungs-Assistenten gesetzt und war danach
 * festgenagelt — bei einem importierten Bogen stand also für immer der Name drin,
 * den Fight Club mitgeliefert hat, und die Spielerin nirgends.
 *
 * Sitzt im Bearbeiten-Modus und nicht hinter einer eigenen Geste: es gibt schon
 * EINEN Schalter für „ich ändere jetzt etwas am Bogen", und der ist genau dafür da.
 * Direkt unter dem Kopf, damit man nicht sucht — was man umbenennen will, sieht man
 * dabei.
 */
export function IdentityCard({ character, save }: Pick<TabProps, "character" | "save">) {
  /*
    Der Name darf NICHT leer gespeichert werden.

    (Die frühere Begründung war das Löschen: dort musste man den Namen abtippen, und
     ein leerer Name hätte aus der Bremse einen leeren Vergleich gemacht. Seit
     bestätigt wird, indem man einen Code tippt, gilt dieser Grund nicht mehr — die
     Regel bleibt aber richtig.)

    Ein Bogen ohne Namen ist an jeder Stelle ein Problem, an der er GENANNT wird:
    eine leere Zeile in der Charakterliste, ein leerer Eintrag im Regal der Gruppe,
    eine Export-Datei ohne Namen, ein Auftrag „für wen?". Nichts davon fällt auf,
    wenn es passiert, und alles davon nervt später.

    Also: geschrieben wird bei jedem Tastendruck (kein zweiter Wahrheitsstand, an dem
    Tippen verloren geht), aber ein leeres Feld bleibt ÖRTLICH leer und wird beim
    Verlassen auf den gespeicherten Namen zurückgesetzt. Verlieren kann man dabei
    nichts — leer ist leer.
  */
  const [draftName, setDraftName] = useState<string | null>(null);
  const shown = draftName ?? character.name;

  const onName = (value: string) => {
    if (value.trim() === "") {
      setDraftName(value);
      return;
    }
    setDraftName(null);
    save((c) => void (c.name = value));
  };

  return (
    <Card>
      <SectionTitle>{S.sheet.identity}</SectionTitle>
      {/* Field/inputClass statt zweier handkopierter Klassenketten — bits.tsx nennt
          genau diese Datei als Fundstelle der Kopie. */}
      <div className="space-y-2">
        <Field label={S.sheet.characterName}>
          <input
            value={shown}
            onChange={(e) => onName(e.target.value)}
            onBlur={() => setDraftName(null)}
            className={inputClass}
          />
          {/* Bernstein und nicht der graue Hinweis-Ton: das ist eine Warnung, kein
              Beipackzettel — so lange sie steht, ist der Name NICHT gespeichert. */}
          {draftName !== null && (
            <span className="mt-1 block text-[11px] text-amber-300">{S.sheet.nameEmptyHint}</span>
          )}
        </Field>
        <Field label={S.wizard.playerName}>
          <input
            value={character.playerName ?? ""}
            placeholder={S.sheet.playerPlaceholder}
            onChange={(e) => {
              const value = e.target.value;
              save((c) => {
                // Leer heißt „keine Angabe" — ein leerer String wäre eine Angabe,
                // die dann als leere Zeile am Bogen erscheint.
                if (value.trim() === "") delete c.playerName;
                else c.playerName = value;
              });
            }}
            className={inputClass}
          />
        </Field>
        {/*
          Die Kampagne steht hier, weil sie zu Name und Spieler:in gehört: alle drei
          sagen, WESSEN Bogen das ist und an welchem Tisch er liegt — keine Regelwerte.
        */}
        <CampaignPicker
          value={character.campaign}
          ownId={character.id}
          onChange={(next) =>
            save((c) => {
              if (next === undefined) delete c.campaign;
              else c.campaign = next;
            })
          }
        />
      </div>
    </Card>
  );
}
