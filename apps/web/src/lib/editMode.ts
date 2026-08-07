import { create } from "zustand";

/**
 * Ist gerade ein Bogen im BEARBEITEN-Modus? — und warum das ein Store ist.
 *
 * Sein Auftrag: „Wenn ich im Bearbeitungsmodus bin, dann möchte ich bitte, dass Kopf- und
 * Fußleisten verschwinden und dafür die Warnung, dass ich im Bearbeitungsmodus bin, klar
 * erkennbar … rötlich am unteren Bildrand."
 *
 * Der Modus lebt im Bogen (`pages/sheet/index.tsx`), die Hauptnavigation in
 * `ui/Layout.tsx` — und die Hülle kennt die Seite darin nicht. Der Weg über eine Prop wäre
 * eine Kette durch den Router; ein Store ist die kürzere Wahrheit, und die App hat diese
 * Bauart schon zweimal (Würfel, Speicherfehler).
 *
 * **Und die eine Regel, ohne die es ein Fehler wäre: wer ihn setzt, muss ihn beim
 * Verlassen zurücksetzen.** Bliebe er stehen, wäre die Hauptnavigation auf der Startseite
 * weg und niemand käme mehr irgendwohin — die Sorte Zustand, aus der man nicht
 * herausfindet. Der Bogen tut das im Aufräumen seines Effekts, nicht in einem Klick-Handler:
 * ein Klick kann übersprungen werden (Zurück-Wischen, Adresszeile), das Aufräumen nicht.
 */
interface EditModeState {
  active: boolean;
  set: (active: boolean) => void;
}

export const useEditModeStore = create<EditModeState>((set) => ({
  active: false,
  set: (active) => set({ active }),
}));

/** Nur lesen — für die Hülle, die den Modus nicht ändern darf. */
export function useEditModeActive(): boolean {
  return useEditModeStore((s) => s.active);
}
