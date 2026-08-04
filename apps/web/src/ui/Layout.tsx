import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { S } from "../strings.js";
import { ensureSeeded, requestPersistentStorage } from "../db/seed.js";
import { useAppSettings } from "../lib/hooks.js";
import { useScrollMemory } from "../lib/scrollMemory.js";
import { Icon, type IconName } from "./icons.js";
import { DiceResultSheet } from "./DiceSheet.js";
import { SyncGate } from "../sync/SyncGate.js";
import { SyncBadge } from "./SyncBadge.js";
import { UpdateBar } from "./UpdateBar.js";

/*
  Eigene Zeichen statt Emoji (sein Auftrag). `icon` ist jetzt ein Name aus `ui/icons.tsx`
  und keine Zeichenkette mehr — der Typ verhindert damit einen Reiter ohne Zeichen.

  Sie tragen `currentColor`, also färbt der aktive Reiter sein Zeichen mit. Bei einem Emoji
  war das unmöglich: dort bestimmt die Schriftart des Geräts die Farbe.
*/
const NAV = [
  { to: "/", label: S.nav.characters, icon: "characters" },
  { to: "/kompendium", label: S.nav.compendium, icon: "compendium" },
  { to: "/wuerfel", label: S.nav.dice, icon: "dice" },
  { to: "/einstellungen", label: S.nav.settings, icon: "settings" },
] as const satisfies readonly { to: string; label: string; icon: IconName }[];

export function Layout() {
  const [seedMessage, setSeedMessage] = useState<string | null>(S.misc.seedRunning);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  /*
    Die Höhe je Adresse. Der Kasten, der scrollt, ist das `main` darunter — nicht das
    Fenster; siehe `lib/scrollMemory.ts`, dort steht auch, warum der Schalter des Routers
    hier nichts ausrichten konnte.
  */
  const mainRef = useRef<HTMLElement | null>(null);
  useScrollMemory(mainRef, pathname + searchStr);
  const { diceEnabled, material } = useAppSettings();
  // Würfeln abgeschaltet → der Reiter verschwindet ganz aus der Navigation.
  const visibleNav = NAV.filter((item) => diceEnabled || item.to !== "/wuerfel");

  /*
    Das Material ans <html>, nicht an diesen Kasten: der Untergrund steht am `body`, und
    die Reiterleiste unten ist `fixed` — beide liegen außerhalb. Ein Thema, das nur den
    Inhalt umfärbt und den Rand vergisst, ist schlimmer als keins.

    `data-material="codex"` wird ENTFERNT statt gesetzt: „codex" ist der Grundzustand, und
    ein Attribut, auf das keine Regel zeigt, wäre eine Einladung, es doch zu benutzen.
  */
  useEffect(() => {
    const root = document.documentElement;
    if (material === "codex") root.removeAttribute("data-material");
    else root.setAttribute("data-material", material);
  }, [material]);

  useEffect(() => {
    void requestPersistentStorage();
    ensureSeeded(setSeedMessage)
      .then(() => setSeedMessage(null))
      .catch((error: unknown) => {
        console.error(error);
        setSeedMessage(null); // App bleibt nutzbar, Kompendium ggf. leer.
      });
  }, []);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Sidebar ≥md */}
      <nav className="hidden w-52 shrink-0 flex-col gap-1 border-r border-slate-800 p-3 md:flex">
        <div className="mb-4 px-2 text-lg font-bold tracking-tight text-amber-400">
          {S.appName}
        </div>
        {visibleNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              isActive(item.to) ? "bg-amber-600/20 text-amber-300" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span className="mr-2 inline-flex align-[-0.2em]">
              <Icon name={item.icon} size={18} />
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/*
        Der Freiraum unten muss die Leiste WIRKLICH freihalten. Vorher stand hier
        `pb-20` = 80px, die Leiste ist aber `3.5rem + env(safe-area-inset-bottom)` —
        als Web-App auf dem iPhone rund 90px. Die unterste Karte war also
        angeschnitten. Jetzt dieselbe Rechnung wie die Leiste, plus 8px Luft.
      */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-4"
      >
        {seedMessage && (
          <div className="bg-amber-900/40 px-4 py-2 text-center text-xs text-amber-200">
            {seedMessage}
          </div>
        )}
        {/*
          `blatt` ist der zweite Griff für die Klassenfarbe: bei offenem Bogen bekommt
          dieser Kasten einen Rahmen in der Klassenfarbe, so dass der ganze Bogen wie ein
          eingefasstes Blatt aussieht („einen kräftigen Rahmen um alles"). Außerhalb eines
          Bogens greift keine Regel darauf zu — die Startseite bleibt ohne Rahmen.
        */}
        <div className="blatt mx-auto max-w-3xl p-3 sm:p-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom-Tabs mobil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-bottom))] border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {visibleNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-1 flex-col items-center py-2 text-[11px] ${
              isActive(item.to) ? "text-amber-400" : "text-slate-400"
            }`}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </Link>
        ))}
      </nav>

      {diceEnabled && <DiceResultSheet />}
      {/* Löst den Geräte-Abgleich beim Start aus; zeigt selbst nichts an. Während einer
          Sitzung gleicht er nicht ab — seine Entscheidung, siehe `MID_SESSION_SYNC`. */}
      <SyncGate />
      <SyncBadge />
      {/* „Neue Fassung ist da" — einmal für die ganze App, nicht je Seite. */}
      <UpdateBar />
    </div>
  );
}
