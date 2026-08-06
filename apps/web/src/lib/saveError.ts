import { create } from "zustand";

/**
 * EIN Ort für „das Speichern ist fehlgeschlagen".
 *
 * Bis hierher landete jeder solche Fehler in `console.error` — sein Wort dazu stand
 * seit der Domänen-Runde als offener Punkt in CLAUDE.md: „Es steht jetzt in der
 * Konsole, aber auf dem Handy schaut da niemand hinein."
 *
 * Und das ist genau die Fehlerfamilie „etwas weiß es, und etwas anderes kann es
 * nicht", nur in ihrer stillsten Form: die App WEISS, dass ein Tap verloren ging,
 * und sagt es an einer Stelle, die auf einem iPhone gar nicht erreichbar ist. Wer
 * dann am Tisch Schaden einträgt und die Zahl springt zurück, sucht den Fehler in
 * seinen Fingern.
 *
 * Deshalb trägt eine Meldung hier NICHT nur einen Text, sondern einen echten
 * `retry` — denselben Schreibvorgang noch einmal. Eine Anzeige, die etwas weiß,
 * und eine Aktion, die es nicht kann, sind zusammen schlimmer als keine Anzeige;
 * das hat diese App beim „Neuladen" der PWA schon einmal gelernt.
 */
export interface SaveFailure {
  /** WAS nicht gespeichert wurde, in seinen Worten: „Hike". */
  what: string;
  /** WARUM, in einem Satz — aus `describeSaveError`. */
  why: string;
  /**
   * Derselbe Schreibvorgang noch einmal. Er darf beliebig oft laufen: die
   * Mutationen arbeiten auf dem FRISCHEN Datenbankstand (`CharacterRepo.mutate`),
   * nicht auf dem Stand von damals.
   */
  retry: () => Promise<unknown>;
}

interface SaveErrorStore {
  /** Die zuletzt fehlgeschlagene Schreibung, oder null. */
  failure: SaveFailure | null;
  /** Läuft ein zweiter Versuch? Verhindert Doppel-Taps. */
  busy: boolean;
  /** Hat ein zweiter Versuch geklappt? Bleibt kurz stehen, damit er es sieht. */
  fixed: boolean;
  report: (failure: SaveFailure) => void;
  retry: () => Promise<void>;
  dismiss: () => void;
}

const store = create<SaveErrorStore>((set, get) => ({
  failure: null,
  busy: false,
  fixed: false,

  report: (failure) => set({ failure, busy: false, fixed: false }),
  dismiss: () => set({ failure: null, busy: false, fixed: false }),

  retry: async () => {
    const failure = get().failure;
    if (failure === null || get().busy) return;
    set({ busy: true });
    try {
      await failure.retry();
      /*
        Geklappt — und das muss DASTEHEN. Ein Band, das einfach verschwindet,
        sieht genauso aus wie ein Band, das man weggetippt hat: er wüsste
        hinterher nicht, ob seine Eingabe jetzt drin ist.
      */
      set({ failure: null, busy: false, fixed: true });
    } catch (error: unknown) {
      // Wieder daneben. Der Grund kann ein anderer sein als beim ersten Mal.
      set({
        failure: { ...failure, why: describeSaveError(error) },
        busy: false,
        fixed: false,
      });
    }
  },
}));

export const useSaveErrorStore = store;

/**
 * Ein fehlgeschlagenes Speichern melden — für Stellen ohne Hook (Ereignisse,
 * `catch`-Blöcke).
 *
 * Die Konsole bekommt es WEITER: dort steht das ganze Fehlerobjekt mit Stapel,
 * und das braucht man beim Suchen. Die Leiste bekommt den Satz.
 */
export function reportSaveFailure(
  what: string,
  error: unknown,
  retry: () => Promise<unknown>,
): void {
  console.error(`Speichern an ${what} fehlgeschlagen:`, error);
  store.getState().report({ what, why: describeSaveError(error), retry });
}

/**
 * Warum es nicht geklappt hat — in einem Satz, den er lesen kann.
 *
 * Der wichtigste Fall ist der erste: ein voller Gerätespeicher. Die Datenbank
 * liegt im Browser (lokal-first, kein Backend), und auf einem Handy mit vollem
 * Speicher wirft IndexedDB `QuotaExceededError`. Ohne diesen Satz stünde dort ein
 * Name aus dem Browser, mit dem niemand etwas anfangen kann.
 *
 * Kein Fachjargon: „Regal" statt Gist, und hier „Speicher voll" statt Quota.
 */
export function describeSaveError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  /*
    Nur ein Fehlerobjekt oder eine geworfene Zeichenkette haben eine Meldung, die
    man ihm zeigen kann. `String(undefined)` ergibt „undefined" — eine nicht-leere
    Zeichenkette, die als Grund durchgekommen wäre und in der Leiste gestanden
    hätte. Der Test hat genau das gefangen.
  */
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const text = `${name} ${message}`.toLowerCase();

  if (name === "QuotaExceededError" || text.includes("quota") || text.includes("no space")) {
    return "Der Speicher des Geräts ist voll. Mach Platz frei und versuch es noch einmal — bis dahin bleibt die Änderung ungespeichert.";
  }
  /*
    Safari im privaten Modus und ein zwischenzeitlich gelöschter Datenbestand
    melden sich so. Beides heißt dasselbe für ihn: die App kommt an ihre Daten
    nicht heran, und ein Neustart ist der Weg.
  */
  if (name === "InvalidStateError" || name === "DatabaseClosedError" || text.includes("closed")) {
    return "Die App kommt gerade nicht an ihre Daten. Schließ sie einmal ganz und öffne sie neu.";
  }
  if (message.trim() !== "") return message;
  return "Unbekannter Grund — Einzelheiten stehen in der Entwickler-Konsole.";
}
