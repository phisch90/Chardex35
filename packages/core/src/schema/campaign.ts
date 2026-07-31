import { z } from "zod";

/**
 * Die Farben, die eine Kampagne tragen kann.
 *
 * Hier stehen nur SCHLÜSSEL, keine Farbwerte — welches Blau genau, entscheidet
 * die Oberfläche (`apps/web/src/ui/campaignColors.ts`). Dieselbe Trennung wie bei
 * den Gegenstands-Gruppen: die Regel gehört in den Kern, ihr Aussehen nicht.
 *
 * Acht sind genug. Wer zwölf Kampagnen unterscheiden muss, hat ein anderes
 * Problem — und mehr Farben werden auf einem dunklen Bogen ohnehin ähnlich.
 * `slate` ist die unauffällige: „gehört zu einer Kampagne, aber keine Farbe".
 */
export const CAMPAIGN_COLORS = [
  "slate",
  "amber",
  "emerald",
  "sky",
  "violet",
  "rose",
  "teal",
  "orange",
] as const;
export type CampaignColor = (typeof CAMPAIGN_COLORS)[number];

export const campaignColorSchema = z.enum(CAMPAIGN_COLORS);
