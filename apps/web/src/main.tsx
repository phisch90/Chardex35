import React from "react";
import ReactDOM from "react-dom/client";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { registerSW } from "virtual:pwa-register";
import "./styles.css";
import { startUpdateWatch } from "./lib/updateStore.js";
import { Layout } from "./ui/Layout.js";
import { CharacterListPage } from "./pages/CharacterList.js";
import { CharacterWizardPage } from "./pages/CharacterWizard.js";
import { CharacterSheetPage } from "./pages/sheet/index.js";
import { LevelUpPage } from "./pages/LevelUp.js";
import { CompareDraftPage } from "./pages/CompareDraft.js";
import { ImportPage } from "./pages/ImportPage.js";
import { CompendiumPage, EntityDetailPage } from "./pages/Compendium.js";
import { DicePage } from "./pages/DicePage.js";
import { GroupSheetPage } from "./pages/GroupSheet.js";
import { SettingsPage } from "./pages/SettingsPage.js";

const rootRoute = createRootRoute({ component: Layout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: CharacterListPage,
});
const wizardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/charaktere/neu",
  component: CharacterWizardPage,
});
const sheetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/charaktere/$charId",
  component: CharacterSheetPage,
});
const levelUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/charaktere/$charId/stufenaufstieg",
  component: LevelUpPage,
});
const compareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/charaktere/$charId/vergleich",
  component: CompareDraftPage,
});
const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/import",
  component: ImportPage,
});
const compendiumRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/kompendium",
  component: CompendiumPage,
});
const compendiumKindRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/kompendium/$kind",
  component: CompendiumPage,
});
const entityDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/kompendium/$kind/$entityId",
  component: EntityDetailPage,
});
const groupSheetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/gruppe/$gistId/$charId",
  component: GroupSheetPage,
});
const diceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wuerfel",
  component: DicePage,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/einstellungen",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  wizardRoute,
  sheetRoute,
  levelUpRoute,
  compareRoute,
  importRoute,
  compendiumRoute,
  compendiumKindRoute,
  entityDetailRoute,
  groupSheetRoute,
  diceRoute,
  settingsRoute,
]);

// Auf GitHub Pages liegt die App in einem Unterpfad, der so heißt wie das
// Repository (/Chardex35/) — der Router muss diesen Basis-Pfad kennen, sonst
// matcht keine Route („Not found" trotz Menü). Der Wert kommt aus BASE_URL,
// das das Deployment aus $GITHUB_REPOSITORY setzt: eine Umbenennung des
// Repos wirkt damit von allein, ohne Codeänderung.
const basepath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
/*
  KEIN `scrollRestoration` am Router. Es sieht nach der richtigen Zeile aus und wäre eine,
  die nichts tut: der Router merkt sich `window.scrollY`, und diese App scrollt nicht das
  Fenster, sondern das `main` in `ui/Layout.tsx`. Die Höhe merkt deshalb
  `lib/scrollMemory.ts` — dort steht die ganze Begründung, samt der zweiten Hälfte
  (beim Zurückkommen ist die Liste noch nicht da).
*/
const router = createRouter({ routeTree, basepath });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

/*
  PWA: Update nie stillschweigend mitten in der Session — aber es MUSS ankommen.

  Vorher stand hier ein `confirm()`, das auf seinem iPhone nie aufging: `registerSW`
  prüft nur beim LADEN der Seite auf einen neuen Service Worker, und eine
  installierte App wird aus dem Hintergrund geholt und nicht neu geladen. Sein Satz
  dazu war „Es kommt kein Update".

  `startUpdateWatch` hängt deshalb drei Auslöser dran (Vordergrund, wieder online,
  halbstündlich) und meldet in den Speicher statt in einen Browser-Dialog. Die
  Leiste dazu steht in `ui/UpdateBar.tsx`, der Weg zum wirklichen Aktualisieren in
  `lib/swUpdate.ts`.
*/
startUpdateWatch(registerSW);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
