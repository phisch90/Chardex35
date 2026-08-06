import {
  CAMPAIGN_COLORS,
  campaignsOf,
  charactersToRecolor,
  colorOfCampaign,
  readOrderMarker,
  type CampaignColor,
  type Character,
} from "@codex35/core";
import { S } from "../strings.js";
import { CharacterRepo } from "../db/repo.js";
import { useCharacters } from "../lib/hooks.js";
import { reportSaveFailure } from "../lib/saveError.js";
import { Field, inputClass } from "./bits.js";
import { campaignLook } from "./campaignColors.js";

/** Was am Bogen steht — oder nichts, wenn er zu keiner Kampagne gehört. */
export interface CampaignValue {
  name: string;
  color: CampaignColor;
}

/**
 * Kampagne eintragen und einfärben — EIN Baustein für alle drei Eingabestellen.
 *
 * Er wollte sie ausdrücklich überall eintragen können: am Bogen bei Name und
 * Spieler:in, aus dem ⋯-Menü der Karte, und schon beim Anlegen. Drei Felder mit
 * derselben Aufgabe laufen auseinander — eines lernt die Vorschläge, das nächste
 * nicht, das dritte schreibt eine Farbe, die die anderen nicht mitziehen. Also
 * einer.
 *
 * Zwei Dinge passieren hier, die von außen nicht sichtbar sind:
 *
 * 1. **Ein bestehender Name bringt seine Farbe mit.** Tippt er „Nachtwind" beim
 *    zweiten Bogen, ist der grün, ohne dass er die Farbe suchen muss.
 * 2. **Ein Farbwechsel nimmt die Geschwister mit.** Die Farbe gehört der KAMPAGNE,
 *    steht aber technisch an jedem Bogen (damit sie aufs iPad mitreist). Ohne diesen
 *    Nachzug müsste er sie bei vier Bögen viermal setzen, und einer wird vergessen.
 *    Der eigene Bogen läuft dabei NICHT hier durch, sondern über `onChange` — das
 *    ist der Schreibweg, den der Aufrufer ohnehin hat.
 *
 * Arbeitskopien fremder Bögen (`readOrderMarker`) bleiben außen vor: sie gehören
 * einem Mitspieler, und seine Ordnung ist nicht unsere.
 */
export function CampaignPicker(props: {
  value: CampaignValue | undefined;
  onChange: (next: CampaignValue | undefined) => void;
  /**
   * Der Bogen, an dem das Feld hängt — fehlt im Assistenten, weil es dort noch
   * keinen gibt. Dient nur dazu, ihn beim Farb-Nachzug zu überspringen.
   */
  ownId?: string | undefined;
}) {
  const all = useCharacters();
  const own = (all ?? []).filter((c) => readOrderMarker(c) === undefined);
  const campaigns = campaignsOf(own);

  const value = props.value;
  const current = value === undefined ? undefined : campaigns.find((c) => sameName(c.name, value.name));

  const setName = (raw: string) => {
    if (raw.trim() === "") {
      // Leer heißt ABWESENHEIT, nicht „Kampagne mit leerem Namen". Sonst steht auf
      // der Startseite ein Abschnitt ohne Überschrift zwischen den anderen.
      props.onChange(undefined);
      return;
    }
    // Ein bekannter Name bringt seine Farbe mit; ein neuer bleibt bei der schon
    // gewählten, sonst springt die Farbe beim Tippen bei jedem Buchstaben.
    const known = colorOfCampaign(own, raw);
    props.onChange({ name: raw, color: known ?? value?.color ?? "slate" });
  };

  const setColor = (color: CampaignColor) => {
    if (value === undefined) return;
    props.onChange({ ...value, color });
    for (const sibling of siblings(own, value.name, color, props.ownId)) {
      const write = () =>
        CharacterRepo.mutate(sibling.id, (c) => {
          // Nur die Farbe. Den Namen anzufassen wäre ein Umbenennen, und das hat
          // niemand verlangt.
          if (c.campaign !== undefined) c.campaign.color = color;
        });
      void write().catch((error: unknown) => {
        reportSaveFailure(sibling.name, error, write);
      });
    }
  };

  /*
    Die Ansage hängt an der ZUGEHÖRIGKEIT, nicht an der Abweichung.

    Zuerst stand hier dieselbe Liste wie beim Schreiben (`siblings`), und die ist
    leer, solange alle Bögen dieselbe Farbe tragen — also im Normalfall immer. Der
    Satz „gilt auch für Torben und Alrik" wäre nie erschienen, obwohl er genau dann
    gebraucht wird: BEVOR er tippt, soll er wissen, dass der Wechsel mehr als diesen
    Bogen trifft. Im gebauten Bogen aufgefallen, nicht am Schreibtisch.
  */
  const affected = value === undefined ? [] : members(own, value.name, props.ownId);

  return (
    <div className="space-y-2">
      <Field label={S.campaign.label} hint={S.campaign.hint}>
        <input
          value={value?.name ?? ""}
          placeholder={S.campaign.placeholder}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </Field>

      {/* Die bekannten Namen zum Antippen. Er tippt sie sonst jedes Mal neu ab, und
          beim dritten Mal heißt sie „Nachtwind " mit Leerzeichen. */}
      {campaigns.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            {S.campaign.existing}
          </span>
          {campaigns.map((campaign) => {
            const look = campaignLook(campaign.color);
            const active = current !== undefined && sameName(current.name, campaign.name);
            return (
              <button
                key={campaign.name}
                type="button"
                onClick={() => setName(campaign.name)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  active ? look.card : "border-slate-600 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${look.dot}`} />
                {campaign.name}
                <span className="text-slate-500">{S.campaign.sheets(campaign.count)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Farbe erst, wenn es eine Kampagne gibt — ohne Namen färbt sie nichts ein. */}
      {value !== undefined && (
        <div className="space-y-1.5">
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            {S.campaign.color}
          </span>
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_COLORS.map((color) => {
              const look = campaignLook(color);
              const active = value.color === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setColor(color)}
                  title={look.label}
                  aria-label={look.label}
                  aria-pressed={active}
                  className={`h-8 w-8 rounded-full transition-transform ${
                    active ? `${look.swatchActive} scale-110` : look.swatch
                  }`}
                />
              );
            })}
          </div>
          {affected.length > 0 && (
            <p className="text-[11px] leading-snug text-slate-500">
              {S.campaign.alsoAffects(affected.map((c) => c.name))}
            </p>
          )}
          {current?.mixed === true && (
            <p className="text-[11px] leading-snug text-amber-400">{S.campaign.mixed}</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Groß-/Kleinschreibung und Leerraum sollen keine zweite Kampagne aufmachen. */
function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Die ANDEREN Bögen dieser Kampagne, die die Farbe noch nicht haben — für das
 * SCHREIBEN.
 *
 * Zwei Filter, jeder mit einem eigenen Grund. `charactersToRecolor` lässt weg, was
 * die Farbe schon trägt (sonst schreibt der Aufrufer rev-Erhöhungen, die nichts
 * bedeuten, und der Abgleich hätte grundlos zu tun). Der eigene Bogen fällt heraus,
 * weil er über `onChange` läuft — im Assistenten steht er ohnehin in keiner Liste.
 */
function siblings(
  characters: Character[],
  name: string,
  color: CampaignColor,
  ownId: string | undefined,
): Character[] {
  return charactersToRecolor(characters, name, color).filter((c) => c.id !== ownId);
}

/**
 * Die anderen Bögen dieser Kampagne, unabhängig von ihrer Farbe — für die ANSAGE.
 *
 * Bewusst eine zweite Funktion und nicht dieselbe: was geschrieben wird, ist eine
 * Teilmenge dessen, was betroffen IST. Wer beides gleichsetzt, sagt nichts an,
 * solange noch nichts abweicht.
 */
function members(characters: Character[], name: string, ownId: string | undefined): Character[] {
  return characters.filter(
    (c) => c.campaign !== undefined && sameName(c.campaign.name, name) && c.id !== ownId,
  );
}
