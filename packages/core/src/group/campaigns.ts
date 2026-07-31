import type { Character } from "../schema/character.js";
import type { CampaignColor } from "../schema/campaign.js";

/**
 * Kampagnen — abgeleitet aus den Bögen, nirgends gespeichert.
 *
 * Es gibt keine Kampagnen-Liste in der Datenbank, und das ist Absicht. Eine
 * Kampagne IST die Menge der Bögen, die ihren Namen tragen; eine zweite Liste
 * daneben wäre ein abgeleiteter Wert, der gespeichert wurde — die Fehlerfamilie
 * dieses Projekts. Löscht er den letzten Bogen einer Kampagne, ist die Kampagne
 * weg, ohne dass irgendwo eine Leiche liegen bleibt.
 *
 * Die FARBE liegt trotzdem an jedem Bogen (siehe `character.campaign`): sie muss
 * mit dem Bogen aufs iPad reisen. Damit sie nicht auseinanderläuft, behandelt die
 * Oberfläche die Kampagne als eine Sache — `charactersToRecolor` sagt, welche
 * Bögen beim Farbwechsel mitmüssen.
 */

export interface CampaignSummary {
  name: string;
  /** Die Farbe, die die Mehrheit der Bögen trägt (bei Gleichstand die erste). */
  color: CampaignColor;
  /** Wie viele Bögen dazugehören — für „3 Bögen" in der Auswahl. */
  count: number;
  /**
   * Tragen nicht alle Bögen dieselbe Farbe? Dann sind zwei Geräte
   * auseinandergelaufen, und die Oberfläche kann das anbieten zu richten.
   */
  mixed: boolean;
}

/** Groß-/Kleinschreibung und Leerraum sollen keine zweite Kampagne aufmachen. */
function key(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Alle Kampagnen, die in diesen Bögen vorkommen — nach Namen sortiert.
 *
 * Bögen ohne Kampagne kommen nicht vor: „keine Kampagne" ist keine Kampagne,
 * sondern die Abwesenheit einer.
 */
export function campaignsOf(characters: Character[]): CampaignSummary[] {
  const groups = new Map<string, { name: string; colors: CampaignColor[] }>();
  for (const character of characters) {
    const campaign = character.campaign;
    if (campaign === undefined || campaign.name.trim() === "") continue;
    const k = key(campaign.name);
    const group = groups.get(k) ?? { name: campaign.name.trim(), colors: [] };
    group.colors.push(campaign.color);
    groups.set(k, group);
  }

  const out: CampaignSummary[] = [];
  for (const group of groups.values()) {
    // Häufigste Farbe gewinnt; bei Gleichstand die, die zuerst vorkam.
    const counts = new Map<CampaignColor, number>();
    for (const color of group.colors) counts.set(color, (counts.get(color) ?? 0) + 1);
    let best = group.colors[0]!;
    for (const color of group.colors) {
      if ((counts.get(color) ?? 0) > (counts.get(best) ?? 0)) best = color;
    }
    out.push({
      name: group.name,
      color: best,
      count: group.colors.length,
      mixed: counts.size > 1,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Welche Bögen müssen mit, wenn die Farbe einer Kampagne wechselt?
 *
 * Ohne das wäre die Farbe eine Eigenschaft des einzelnen Bogens, und er müsste sie
 * bei jedem Charakter einzeln setzen — bei vier Bögen viermal, und einer wird
 * vergessen. Die Kampagne ist eine Sache, also ändert sie sich als Ganzes.
 *
 * Zurück kommen nur die Bögen, die WIRKLICH etwas ändern — der Aufrufer schreibt
 * sonst rev-Erhöhungen, die nichts bedeuten, und der Abgleich hätte grundlos zu
 * tun.
 */
export function charactersToRecolor(
  characters: Character[],
  campaignName: string,
  color: CampaignColor,
): Character[] {
  const k = key(campaignName);
  return characters.filter(
    (c) =>
      c.campaign !== undefined &&
      key(c.campaign.name) === k &&
      c.campaign.color !== color,
  );
}

/**
 * Ein Abschnitt der Startseite: eine Kampagne und ihre Bögen.
 *
 * `campaign === undefined` ist der letzte Abschnitt — die Bögen, die zu keiner
 * Kampagne gehören. Er ist keine Kampagne mit leerem Namen, sondern der Rest.
 */
export interface CampaignGroup {
  campaign: CampaignSummary | undefined;
  characters: Character[];
}

/**
 * Die Bögen nach Kampagne gruppieren — Kampagnen nach Namen, der Rest zuletzt.
 *
 * Steht im Kern und nicht in der Liste, weil es eine reine Umsortierung ist und
 * genau die Reihenfolge festlegt, gegen die die Kartenstufen gerechnet werden
 * (`ui/cardTier.ts` braucht die ANZAHL der Abschnitte). Zwei Stellen, die das
 * unterschiedlich zählen, ergäben eine Karte, die unter die Leiste rutscht.
 *
 * Innerhalb eines Abschnitts bleibt die Reihenfolge, in der die Bögen ankommen —
 * die Liste sortiert sie schon nach Namen, und hier nochmal zu sortieren würde
 * diese Entscheidung verdoppeln.
 */
export function groupByCampaign(characters: Character[]): CampaignGroup[] {
  const groups: CampaignGroup[] = campaignsOf(characters).map((campaign) => ({
    campaign,
    characters: characters.filter(
      (c) => c.campaign !== undefined && key(c.campaign.name) === key(campaign.name),
    ),
  }));

  const rest = characters.filter(
    (c) => c.campaign === undefined || c.campaign.name.trim() === "",
  );
  if (rest.length > 0) groups.push({ campaign: undefined, characters: rest });
  return groups;
}

/** Die Farbe, die eine bestehende Kampagne schon trägt — für die Vorbelegung. */
export function colorOfCampaign(
  characters: Character[],
  campaignName: string,
): CampaignColor | undefined {
  const k = key(campaignName);
  return campaignsOf(characters).find((c) => key(c.name) === k)?.color;
}
