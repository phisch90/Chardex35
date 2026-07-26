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
import { S } from "./strings.js";
import { Layout } from "./ui/Layout.js";
import { CharacterListPage } from "./pages/CharacterList.js";
import { CharacterWizardPage } from "./pages/CharacterWizard.js";
import { CharacterSheetPage } from "./pages/sheet/index.js";
import { LevelUpPage } from "./pages/LevelUp.js";
import { CompareDraftPage } from "./pages/CompareDraft.js";
import { ImportPage } from "./pages/ImportPage.js";
import { CompendiumPage, EntityDetailPage } from "./pages/Compendium.js";
import { DicePage } from "./pages/DicePage.js";
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
  diceRoute,
  settingsRoute,
]);

// Auf GitHub Pages liegt die App in einem Unterpfad, der so heißt wie das
// Repository (/Chardex35/) — der Router muss diesen Basis-Pfad kennen, sonst
// matcht keine Route („Not found" trotz Menü). Der Wert kommt aus BASE_URL,
// das das Deployment aus $GITHUB_REPOSITORY setzt: eine Umbenennung des
// Repos wirkt damit von allein, ohne Codeänderung.
const basepath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
const router = createRouter({ routeTree, basepath });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// PWA: Update nie stillschweigend mitten in der Session.
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm(S.misc.updateAvailable)) void updateSW(true);
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
