import { useEffect } from "react";
import { create } from "zustand";
import {
  applyUpdate,
  browserUpdateEnv,
  UPDATE_CHECK_INTERVAL_MS,
  type UpdateEnv,
  type UpdateState,
} from "./swUpdate.js";
import { RUNNING, compareVersions, fetchDeployedVersion, type AppVersion } from "./version.js";

/**
 * EIN Ort für „es liegt ein neuer Stand bereit".
 *
 * Vorher gab es zwei Wege, die sich nicht kannten:
 *
 * - Der Service Worker rief `onNeedRefresh` und öffnete ein `confirm()`. Das kam auf
 *   seinem iPhone nie, weil nur beim LADEN der Seite gesucht wird und eine
 *   installierte App nie neu lädt.
 * - Die Versionsmarke fragte `version.json` ab (zuverlässig, außerhalb des Cache)
 *   und bot ein `window.location.reload()` an. Das konnte nichts bewirken, weil der
 *   Service Worker jede Navigation aus dem Cache beantwortet.
 *
 * Der eine wusste nichts, der andere konnte nichts. Sein Satz dazu: „Es kommt kein
 * Update." Jetzt melden beide HIER, und es gibt genau einen Weg, der wirklich
 * aktualisiert (`swUpdate.ts`).
 */
interface UpdateStore {
  /** Wartet ein fertiger neuer Service Worker? */
  swWaiting: boolean;
  /** Was auf dem Server liegt — `null`, solange niemand nachgesehen hat. */
  deployed: AppVersion | null;
  /** Läuft gerade eine Übernahme? Verhindert Doppel-Taps. */
  busy: boolean;
  /**
   * Wurde die Leiste weggetippt? Sie bleibt weg, bis ein ANDERER Stand auftaucht —
   * die Versionsmarke oben zeigt den Stand weiter, die Auskunft geht nicht verloren.
   */
  dismissedFor: string | null;
  swReady: () => void;
  setDeployed: (version: AppVersion | null) => void;
  dismiss: () => void;
  setEnv: (env: UpdateEnv) => void;
  apply: () => Promise<void>;
}

const store = create<UpdateStore>((set, get) => {
  let env: UpdateEnv | undefined;
  return {
    swWaiting: false,
    deployed: null,
    busy: false,
    dismissedFor: null,

    setEnv: (next) => void (env = next),
    swReady: () => set({ swWaiting: true, dismissedFor: null }),
    setDeployed: (version) => set({ deployed: version }),
    dismiss: () => set({ dismissedFor: updateKey(get()) }),

    apply: async () => {
      if (get().busy) return;
      set({ busy: true });
      try {
        await applyUpdate(env ?? fallbackEnv());
      } finally {
        // `takeOver` lädt selbst neu; kommt es doch zurück, ist der Knopf frei.
        set({ busy: false });
      }
    },
  };
});

export const useUpdateStore = store;

/**
 * Woran die Leiste erkennt, ob sie DENSELBEN Hinweis noch einmal zeigt.
 *
 * Nicht bloß ein `boolean`: sonst wäre ein weggetipptes „neue Fassung" für jede
 * spätere Fassung mit weggetippt, und er sähe nie wieder eine — genau derselbe
 * Fehler wie ein „passt so", das die Menge nicht mitschreibt.
 */
function updateKey(state: Pick<UpdateStore, "swWaiting" | "deployed">): string {
  if (state.swWaiting) return "bereit";
  return state.deployed?.commit ?? "";
}

/** Was die Leiste anzeigt — eine FOLGE aus beiden Meldewegen, nie gespeichert. */
export function updateState(
  state: Pick<UpdateStore, "swWaiting" | "deployed">,
): UpdateState {
  // „bereit" gewinnt: derselbe neue Stand, nur schon heruntergeladen — ein Tap genügt.
  if (state.swWaiting) return { kind: "bereit" };
  const compared = compareVersions(RUNNING, state.deployed);
  return compared.kind === "veraltet"
    ? { kind: "server", commit: compared.deployed.commit }
    : { kind: "keins" };
}

/** Soll die Leiste stehen? */
export function updateBarVisible(
  state: Pick<UpdateStore, "swWaiting" | "deployed" | "dismissedFor">,
): boolean {
  if (updateState(state).kind === "keins") return false;
  return state.dismissedFor !== updateKey(state);
}

/** Kein Service Worker im Spiel (`vite dev`): nur neu laden. */
function fallbackEnv(): UpdateEnv {
  return {
    hasServiceWorker: () => false,
    waiting: () => false,
    check: async () => {},
    takeOver: async () => {},
    clearAndUnregister: async () => {},
    reload: () => window.location.reload(),
  };
}

/**
 * Nach dem veröffentlichten Stand fragen — APP-WEIT, nicht nur dort, wo die
 * Versionsmarke steht.
 *
 * Vorher hing diese Prüfung in `VersionBadge`, und die steht auf der Startseite und
 * in den Einstellungen. Wer auf einem Bogen saß — also die ganze Zeit am Spieltisch
 * —, bei dem prüfte überhaupt niemand.
 */
export function useVersionWatch(): void {
  const setDeployed = store((s) => s.setDeployed);
  useEffect(() => {
    let alive = true;
    const check = () => {
      void fetchDeployedVersion().then((deployed) => {
        if (alive && deployed !== null) setDeployed(deployed);
      });
    };
    check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", check);
    const timer = window.setInterval(check, UPDATE_CHECK_INTERVAL_MS);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", check);
      window.clearInterval(timer);
    };
  }, [setDeployed]);
}

/**
 * Den Service Worker anmelden und ihn AUCH IM LAUFENDEN BETRIEB nach Updates
 * fragen — das war der zweite Fehler: `registerSW` prüft nur beim Laden der Seite,
 * und eine installierte App auf dem iPhone wird nie neu geladen, sondern aus dem
 * Hintergrund geholt.
 */
export function startUpdateWatch(
  register: (options: {
    onNeedRefresh: () => void;
    onRegisteredSW: (url: string, registration: ServiceWorkerRegistration | undefined) => void;
  }) => (reload?: boolean) => Promise<void>,
): void {
  let registration: ServiceWorkerRegistration | undefined;
  const updateSW = register({
    onNeedRefresh: () => store.getState().swReady(),
    onRegisteredSW: (_url, reg) => {
      registration = reg;
      if (reg === undefined) return;
      store.getState().setEnv(browserUpdateEnv(() => registration, (r) => updateSW(r)));

      const check = () => void reg.update().catch(() => {});
      /*
        Der WICHTIGE Auslöser: Rückkehr in den Vordergrund. Genau dort kommt die
        Web-App auf dem iPhone wieder hoch, ohne dass die Seite neu lädt.
      */
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
      window.addEventListener("online", check);
      // Und regelmäßig, solange sie offen liegt.
      window.setInterval(check, UPDATE_CHECK_INTERVAL_MS);
      /*
        Wartet schon einer? Nach einem Neustart der Normalfall: der Worker wurde beim
        letzten Besuch installiert, und `onNeedRefresh` lief in einer Sitzung, die
        längst zu ist.
      */
      if (reg.waiting != null) store.getState().swReady();
    },
  });
}
