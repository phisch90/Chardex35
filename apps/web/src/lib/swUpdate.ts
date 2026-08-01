/**
 * Wie ein Update auf seinem Gerät ANKOMMT.
 *
 * Sein Satz war „Es kommt kein Update", und daran waren zwei Dinge schuld, die
 * beide auf demselben Weg liegen:
 *
 * 1. **Der Knopf konnte es nicht.** Die Versionsmarke merkte richtig, dass auf dem
 *    Server ein anderer Stand liegt (`version.json` liegt außerhalb des Cache — das
 *    war gut gebaut), und rief dann `window.location.reload()`. Der Service Worker
 *    registriert aber eine `NavigationRoute` auf die EINBETONIERTE `index.html`:
 *
 *        registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")))
 *
 *    Jedes Neuladen bekam damit genau die alte Seite aus dem Cache, und mit ihr die
 *    alten Programmdateien. Die Marke konnte ewig „veraltet" sagen; der Knopf
 *    daneben konnte daran nichts ändern.
 *
 * 2. **Es suchte niemand.** `registerSW` prüft nur beim LADEN der Seite, ob ein
 *    neuer Service Worker bereitliegt. Eine installierte App auf dem iPhone wird
 *    aus dem Hintergrund geholt und nicht neu geladen — die Prüfung lief also nie,
 *    und die Rückfrage kam nie.
 *
 * Das ist eine eigene Fehlerform, und sie hat mit der Fehlerfamilie dieses Projekts
 * dieselbe Wurzel: EINE ANZEIGE, DIE ETWAS WEISS, UND EINE AKTION, DIE ES NICHT
 * KANN. Beides sah einzeln richtig aus.
 *
 * Deshalb steht der Weg hier als eine Leiter mit drei Sprossen, von der sanftesten
 * zur gröbsten — und jede Sprosse wird nur genommen, wenn die vorige nichts
 * bewirkt hat.
 */

/** Was die App über einen neuen Stand weiß. */
export type UpdateState =
  /** Nichts bekannt. */
  | { kind: "keins" }
  /**
   * Ein neuer Service Worker ist FERTIG und wartet. Ein Tap genügt — das ist der
   * saubere Fall, in dem nichts verworfen wird.
   */
  | { kind: "bereit" }
  /**
   * Auf dem Server liegt ein anderer Stand, aber es wartet (noch) kein neuer
   * Service Worker. Das ist der Fall, in dem ein bloßes Neuladen NICHTS tut.
   */
  | { kind: "server"; commit: string };

/** Was `applyUpdate` getan hat — für die Anzeige und für den Test. */
export type UpdateOutcome =
  /** Der wartende Worker wurde übernommen; die Seite lädt neu. */
  | "uebernommen"
  /** Erst nachgefragt, dann übernommen. */
  | "nachgefragt-und-uebernommen"
  /** Cache geleert und abgemeldet — der harte Weg, aber er wirkt. */
  | "cache-geleert"
  /** Kein Service Worker im Spiel (Entwicklung, oder abgeschaltet): nur neu laden. */
  | "nur-neu-geladen";

/**
 * Die Abhängigkeiten nach außen, damit die Leiter testbar bleibt.
 *
 * Ohne diese Trennung wäre die Reihenfolge der Sprossen nur im Browser prüfbar —
 * und genau die Reihenfolge ist hier die ganze Logik.
 */
export interface UpdateEnv {
  /** Der wartende Worker, falls es einen gibt. */
  waiting: () => boolean;
  /** `registration.update()` — holt `sw.js` neu vom Server. */
  check: () => Promise<void>;
  /** Übernimmt den wartenden Worker und lädt neu (`updateSW(true)`). */
  takeOver: () => Promise<void>;
  /** Alle Caches löschen und den Service Worker abmelden. */
  clearAndUnregister: () => Promise<void>;
  /** Neu laden. */
  reload: () => void;
  /** Hat dieser Browser überhaupt einen Service Worker registriert? */
  hasServiceWorker: () => boolean;
}

/**
 * Die Leiter. Jede Sprosse nur, wenn die vorige nichts gebracht hat.
 *
 * 1. Wartet schon einer? Dann übernehmen — fertig, und nichts geht verloren.
 * 2. Sonst beim Server nachfragen und noch einmal schauen. Das ist der Normalfall
 *    auf dem iPhone: die App wusste aus `version.json`, dass es etwas Neues gibt,
 *    hatte aber nie nach dem neuen `sw.js` gefragt.
 * 3. Wartet dann noch immer keiner, obwohl der Server etwas anderes hat, ist der
 *    Cache in einem Zustand, aus dem ein Neuladen nicht herausführt. Dann Cache
 *    leeren und abmelden. Das kostet die Offline-Bereitschaft bis zum nächsten
 *    Laden — deshalb steht es in der Oberfläche dabei, und deshalb ist es die
 *    LETZTE Sprosse und nicht die erste.
 */
export async function applyUpdate(env: UpdateEnv): Promise<UpdateOutcome> {
  if (!env.hasServiceWorker()) {
    env.reload();
    return "nur-neu-geladen";
  }

  if (env.waiting()) {
    await env.takeOver();
    return "uebernommen";
  }

  await env.check();
  if (env.waiting()) {
    await env.takeOver();
    return "nachgefragt-und-uebernommen";
  }

  await env.clearAndUnregister();
  env.reload();
  return "cache-geleert";
}

/**
 * Wie oft die App im Vordergrund nach einem neuen Stand fragt.
 *
 * 30 Minuten, nicht 30 Sekunden: die Prüfung ist ein Netzabruf, und am Spieltisch
 * liegt das Telefon stundenlang offen. Der wichtigere Auslöser ist ohnehin die
 * Rückkehr in den Vordergrund — genau die fehlte.
 */
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Die echte Umgebung um eine `ServiceWorkerRegistration`.
 *
 * `updateSW` kommt von `virtual:pwa-register` und macht zwei Dinge auf einmal:
 * dem wartenden Worker `SKIP_WAITING` schicken und danach neu laden. Selbst
 * nachbauen wäre eine zweite Fassung derselben Regel.
 */
export function browserUpdateEnv(
  registration: () => ServiceWorkerRegistration | undefined,
  updateSW: (reload?: boolean) => Promise<void>,
): UpdateEnv {
  return {
    hasServiceWorker: () => registration() !== undefined,
    waiting: () => registration()?.waiting != null,
    check: async () => {
      try {
        await registration()?.update();
      } catch {
        // Offline ist am Spieltisch der Normalfall und kein Fehler.
      }
    },
    takeOver: () => updateSW(true),
    clearAndUnregister: async () => {
      try {
        if ("caches" in globalThis) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
        await registration()?.unregister();
      } catch {
        // Auch dann noch neu laden — schlimmer als jetzt kann es nicht werden.
      }
    },
    reload: () => window.location.reload(),
  };
}
