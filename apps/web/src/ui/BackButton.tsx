import { useCanGoBack, useRouter } from "@tanstack/react-router";
import { S } from "../strings.js";

/**
 * Zurück — der Knopf, den die App als installierte PWA nicht geschenkt bekommt.
 *
 * Im Browser gibt es die Pfeile oben, auf dem Startbildschirm nicht: kein
 * Fensterrahmen, keine Leiste, keine Wischgeste zurück. Wer aus dem Zauber-Reiter
 * einen Spruch antippt, landet in der Beschreibung — und musste von dort über die
 * Hauptnavigation neu in den Charakter hinein.
 *
 * Der Ausweichweg ist wichtiger als er aussieht: geöffnet man die Seite direkt
 * (geteilter Link, Lesezeichen, Neustart der App), gibt es keinen Verlauf, und
 * ein Knopf, der dann nichts tut, ist schlimmer als keiner. Deshalb ist das Ziel
 * ein Pflichtfeld und keine Bequemlichkeit.
 */
export function BackButton({ fallback, label }: { fallback: () => void; label?: string }) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <button
      type="button"
      onClick={() => (canGoBack ? router.history.back() : fallback())}
      className="-ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
    >
      <span aria-hidden="true">←</span>
      {label ?? S.actions.back}
    </button>
  );
}
