import { useEffect, useRef, type ReactNode } from "react";

/**
 * Wischen zwischen den Reitern des Bogens.
 *
 * Warum überhaupt: die Reiter-Leiste sitzt unten am Daumen, aber sieben Reiter
 * auf 390 px sind je 55 px breit — im Kampf trifft man daneben. Wischen ist die
 * Geste, mit der man ohnehin rechnet.
 *
 * Zwei Dinge dürfen dabei NICHT passieren, und beide sind der Grund, warum die
 * Ereignisse hier von Hand angemeldet werden statt über React-Eigenschaften:
 *
 *  1. Ein Wisch quer über einen Knopf darf ihn nicht drücken. Nach den
 *     Ereignis-Regeln unterdrückt ein abgebrochenes `touchmove` den daraus
 *     entstehenden Klick — React meldet `touchmove` aber PASSIV an, dort wirkt
 *     `preventDefault()` nicht. Ohne das würde ein Wisch über den Zauber-Reiter
 *     einen Spruch wirken.
 *  2. Senkrecht muss weiter gescrollt werden. Das erledigt `touch-action: pan-y`
 *     zusammen mit der Achsen-Entscheidung: was als Auf-Ab beginnt, bleibt
 *     Auf-Ab.
 */

/** Ab dieser Strecke wechselt der Reiter. Darunter federt die Seite zurück. */
const THRESHOLD = 56;

/** Wie weit die Seite dem Finger folgt — mehr würde sie aus dem Bild ziehen. */
const MAX_FOLLOW = 96;

export function SwipeTabs({
  onPrev,
  onNext,
  children,
}: {
  /** Nach rechts gewischt. `undefined` = es gibt keinen Reiter davor. */
  onPrev: (() => void) | undefined;
  onNext: (() => void) | undefined;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  /*
    Die Handler stecken in einem Ref, damit die Anmeldung EINMAL passiert. Hinge
    sie an onPrev/onNext, würde sie bei jedem Reiter-Wechsel neu aufgesetzt — und
    genau dann läuft gerade eine Geste.
  */
  const latest = useRef({ onPrev, onNext });
  latest.current = { onPrev, onNext };

  useEffect(() => {
    const el = box.current;
    if (!el) return;

    let drag: { x: number; y: number; dx: number; axis: "undecided" | "x" | "y" } | null = null;

    const follow = (px: number | null) => {
      el.style.transition = px === null ? "transform 160ms ease-out" : "none";
      el.style.transform = px === null ? "" : `translateX(${px}px)`;
    };

    const start = (e: TouchEvent) => {
      drag = null;
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (!touch || scrollsSideways(e.target, el)) return;
      drag = { x: touch.clientX, y: touch.clientY, dx: 0, axis: "undecided" };
    };

    const move = (e: TouchEvent) => {
      if (!drag || e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - drag.x;
      const dy = touch.clientY - drag.y;
      if (drag.axis === "undecided") {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (drag.axis !== "x") return;
      // Ab hier ist die Geste unsere: kein Klick, kein Scrollen.
      if (e.cancelable) e.preventDefault();
      drag.dx = dx;
      const atEdge = dx > 0 ? latest.current.onPrev === undefined : latest.current.onNext === undefined;
      // Am ersten/letzten Reiter nur ein Gummiband — sichtbar, aber ohne Versprechen.
      const shift = atEdge ? dx / 4 : dx;
      follow(Math.max(-MAX_FOLLOW, Math.min(MAX_FOLLOW, shift)));
    };

    const end = () => {
      const done = drag;
      drag = null;
      follow(null);
      if (!done || done.axis !== "x") return;
      if (done.dx >= THRESHOLD) latest.current.onPrev?.();
      else if (done.dx <= -THRESHOLD) latest.current.onNext?.();
    };

    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  }, []);

  return (
    <div ref={box} style={{ touchAction: "pan-y" }}>
      {children}
    </div>
  );
}

/**
 * Liegt der Finger auf etwas, das selbst waagerecht scrollt?
 *
 * Dann gehört die Geste dorthin. Die Stufentabellen sind breiter als das Handy;
 * wer sie verschiebt, will nicht den Reiter wechseln.
 */
function scrollsSideways(target: EventTarget | null, stop: HTMLElement): boolean {
  let node = target instanceof Element ? target : null;
  while (node !== null && node !== stop) {
    if (node.scrollWidth > node.clientWidth + 2) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    node = node.parentElement;
  }
  return false;
}
