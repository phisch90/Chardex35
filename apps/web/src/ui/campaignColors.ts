import type { CampaignColor } from "@codex35/core";

/**
 * Wie eine Kampagnenfarbe aussieht.
 *
 * Die SCHLÜSSEL stehen im Kern (`schema/campaign.ts`), ihr Aussehen hier —
 * dieselbe Trennung wie `ITEM_GROUPS` gegen `S.items.groups`. Der Kern soll
 * nichts über Tailwind wissen, und die Oberfläche darf die Darstellung ändern,
 * ohne dass ein gespeicherter Bogen davon berührt wird.
 *
 * **Jede Klasse steht hier ausgeschrieben, und das ist Pflicht, kein Stil.**
 * Tailwind 4 (CSS-first, keine `tailwind.config.*`, kein `safelist`) findet
 * Klassen, indem es den QUELLTEXT durchsucht. Ein zur Laufzeit gebautes
 * `bg-${color}-950` existiert in keiner Datei und landet deshalb nie im
 * Stylesheet — die Karte wäre einfach farblos. Im ganzen Repo gibt es aus diesem
 * Grund kein einziges zusammengesetztes Klassenfragment.
 *
 * Warum die Töne so gewählt sind: die normale Karte ist
 * `border-slate-700/60 bg-slate-900/70` (`bits.tsx`). Eine Kampagnenkarte soll
 * ERKENNBAR, aber nicht bunt sein — er schaut sie am Tisch im Halbdunkeln an, und
 * acht satte Flächen untereinander wären ein Zirkuszelt. Also derselbe Aufbau,
 * nur mit dem Farbton statt Grau: Rahmen auf `800/60`, Fläche auf `950/40`.
 *
 * `slate` ist die unauffällige: „gehört zu einer Kampagne, aber keine Farbe". Sie
 * sieht damit fast wie eine gewöhnliche Karte aus, und genau das soll sie.
 */
export interface CampaignLook {
  /** Rahmen und Fläche der Karte. */
  card: string;
  /** Die Abschnitts-Überschrift in ihrer Farbe. */
  heading: string;
  /** Der kleine Punkt an der Karte und vor dem Namen. */
  dot: string;
  /** Das Farbmuster im Picker, wenn es NICHT gewählt ist. */
  swatch: string;
  /** Dasselbe Muster gewählt — Ring statt nur Fläche, damit es ohne Farbsehen erkennbar bleibt. */
  swatchActive: string;
  /** Wie die Farbe heißt, wenn er sie auswählt. */
  label: string;
}

export const CAMPAIGN_LOOKS: Record<CampaignColor, CampaignLook> = {
  slate: {
    card: "border-slate-700/60 bg-slate-900/70",
    heading: "text-slate-400",
    dot: "bg-slate-500",
    swatch: "bg-slate-500/70 ring-1 ring-slate-400/40",
    swatchActive: "bg-slate-400 ring-2 ring-slate-200",
    label: "Grau",
  },
  amber: {
    card: "border-amber-800/60 bg-amber-950/40",
    heading: "text-amber-300",
    dot: "bg-amber-500",
    swatch: "bg-amber-500/70 ring-1 ring-amber-400/40",
    swatchActive: "bg-amber-400 ring-2 ring-amber-200",
    label: "Bernstein",
  },
  emerald: {
    card: "border-emerald-800/60 bg-emerald-950/40",
    heading: "text-emerald-300",
    dot: "bg-emerald-500",
    swatch: "bg-emerald-500/70 ring-1 ring-emerald-400/40",
    swatchActive: "bg-emerald-400 ring-2 ring-emerald-200",
    label: "Grün",
  },
  sky: {
    card: "border-sky-800/60 bg-sky-950/40",
    heading: "text-sky-300",
    dot: "bg-sky-500",
    swatch: "bg-sky-500/70 ring-1 ring-sky-400/40",
    swatchActive: "bg-sky-400 ring-2 ring-sky-200",
    label: "Blau",
  },
  violet: {
    card: "border-violet-800/60 bg-violet-950/40",
    heading: "text-violet-300",
    dot: "bg-violet-500",
    swatch: "bg-violet-500/70 ring-1 ring-violet-400/40",
    swatchActive: "bg-violet-400 ring-2 ring-violet-200",
    label: "Violett",
  },
  rose: {
    card: "border-rose-800/60 bg-rose-950/40",
    heading: "text-rose-300",
    dot: "bg-rose-500",
    swatch: "bg-rose-500/70 ring-1 ring-rose-400/40",
    swatchActive: "bg-rose-400 ring-2 ring-rose-200",
    label: "Rot",
  },
  teal: {
    card: "border-teal-800/60 bg-teal-950/40",
    heading: "text-teal-300",
    dot: "bg-teal-500",
    swatch: "bg-teal-500/70 ring-1 ring-teal-400/40",
    swatchActive: "bg-teal-400 ring-2 ring-teal-200",
    label: "Türkis",
  },
  orange: {
    card: "border-orange-800/60 bg-orange-950/40",
    heading: "text-orange-300",
    dot: "bg-orange-500",
    swatch: "bg-orange-500/70 ring-1 ring-orange-400/40",
    swatchActive: "bg-orange-400 ring-2 ring-orange-200",
    label: "Orange",
  },
};

/**
 * Das Aussehen zu einer Farbe — auch dann, wenn die Farbe unbekannt ist.
 *
 * Unbekannt kann sie werden, ohne dass jemand einen Fehler gemacht hat: ein Bogen
 * vom iPad, auf dem eine neuere Fassung der App eine neunte Farbe kennt, kommt mit
 * einem Schlüssel her, den DIESES Gerät nicht hat. Dann ist eine graue Karte die
 * richtige Antwort und kein Absturz.
 */
export function campaignLook(color: CampaignColor | undefined): CampaignLook {
  return (color === undefined ? undefined : CAMPAIGN_LOOKS[color]) ?? CAMPAIGN_LOOKS.slate;
}
