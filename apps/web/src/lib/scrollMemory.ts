import { useEffect, type RefObject } from "react";

/**
 * Die Höhe merken, auf der man war — sein Einwand, wörtlich: „Wenn ich mir die
 * Beschreibung eines Zaubers ansehe und auf Zurück klicke, springt der immer an
 * Seitenanfang. Das ist blöd."
 *
 * Zwei Dinge machen das schwerer, als es klingt, und an beiden wäre die naheliegende
 * Lösung gescheitert:
 *
 * 1. **Gescrollt wird nicht das Fenster.** Die App scrollt ein `main` mit
 *    `overflow-y-auto` (Kopf und Reiterleiste sollen stehen bleiben), `window.scrollY`
 *    ist also immer 0. Der `scrollRestoration`-Schalter des Routers merkt sich genau
 *    diese 0 — eine Zeile, die nichts tut. Erst der Lauf im gebauten Bogen hat das
 *    gezeigt, weil er die echte Zahl gemessen hat.
 * 2. **Beim Zurückkommen ist die Liste noch nicht da.** Der Bogen holt seinen Charakter
 *    aus der Datenbank; im ersten Bild ist der Kasten leer und damit 0 Pixel hoch. Ein
 *    einmaliges `scrollTop = 900` verpufft dort wirkungslos. Deshalb wird die Höhe über
 *    einige Bilder hinweg NACHGESETZT, bis sie sitzt.
 *
 * Und die Gegenprobe dazu: sobald er selbst anfasst (Finger, Rad, Taste), hört das
 * Nachsetzen sofort auf. Eine App, die gegen den Daumen scrollt, ist schlimmer als eine,
 * die die Höhe vergisst.
 */
const PREFIX = "codex35.scroll.";

/** So viele Bilder lang wird versucht, die Höhe zu setzen (~0,7 s bei 60 Hz). */
export const RESTORE_FRAMES = 40;

function read(key: string): number {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (raw === null) return 0;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    // Privater Modus kann sessionStorage sperren — dann eben ohne Gedächtnis.
    return 0;
  }
}

function write(key: string, value: number): void {
  try {
    sessionStorage.setItem(PREFIX + key, String(Math.round(value)));
  } catch {
    // s.o.
  }
}

export function useScrollMemory(ref: RefObject<HTMLElement | null>, key: string): void {
  // Speichern, solange man auf dieser Adresse ist.
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const onScroll = () => write(key, el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [ref, key]);

  // Wiederherstellen, sobald genug Inhalt da ist.
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const target = read(key);
    if (target === 0) {
      /*
        Eine Adresse, auf der man noch nicht war: nach oben. Das ist kein Zurücksetzen
        des Gedächtnisses, sondern das erwartete Verhalten beim Öffnen einer neuen Seite
        — und es passiert ohnehin, weil ein frisch gebauter Kasten oben steht.
      */
      el.scrollTop = 0;
      return;
    }

    let frame = 0;
    let tries = 0;
    let stopped = false;
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
    // Er fasst an → wir lassen los.
    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    for (const type of events) el.addEventListener(type, stop, { passive: true });
    window.addEventListener("keydown", stop, { passive: true });

    const tick = () => {
      if (stopped) return;
      tries += 1;
      el.scrollTop = target;
      // Sitzt sie (oder ist der Inhalt endgültig kürzer)? Dann sind wir fertig.
      if (Math.abs(el.scrollTop - target) <= 2 || tries >= RESTORE_FRAMES) return;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      stop();
      for (const type of events) el.removeEventListener(type, stop);
      window.removeEventListener("keydown", stop);
    };
  }, [ref, key]);
}
