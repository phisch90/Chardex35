import { execSync } from "node:child_process";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Welcher Stand steckt in diesem Build? In der GitHub-Action steht der Commit in
 * GITHUB_SHA; lokal fragen wir git. Schlägt beides fehl, sagt die App „unbekannt"
 * statt eine Zahl zu erfinden.
 */
function buildVersion(): { commit: string; builtAt: string } {
  const fromEnv = process.env.GITHUB_SHA;
  let commit = fromEnv === undefined ? "" : fromEnv.slice(0, 7);
  if (commit === "") {
    try {
      commit = execSync("git rev-parse --short=7 HEAD", { encoding: "utf8" }).trim();
    } catch {
      commit = "unbekannt";
    }
  }
  return { commit, builtAt: new Date().toISOString() };
}

const VERSION = buildVersion();

/**
 * Schreibt `version.json` neben die App — damit die LAUFENDE App nachsehen kann,
 * welcher Stand veröffentlicht ist, und selbst sagt, ob sie veraltet ist.
 *
 * Diese Datei darf NICHT in den Service-Worker-Cache: sonst vergleicht die App
 * ihre eigene, mitgelieferte Kopie mit sich selbst und meldet immer „aktuell".
 * Genau daran scheitert eine Versionsprüfung in einer PWA sonst lautlos.
 */
function versionFile(): Plugin {
  return {
    name: "chardex-version-file",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: `${JSON.stringify(VERSION, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  define: {
    __APP_COMMIT__: JSON.stringify(VERSION.commit),
    __APP_BUILT_AT__: JSON.stringify(VERSION.builtAt),
  },
  // Für GitHub Pages (https://<user>.github.io/<repo>/) setzt das Deployment
  // PAGES_BASE=/<repo>/; lokal bleibt es "/".
  base: process.env.PAGES_BASE ?? "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": ein Update zerschießt nie eine laufende Spielsession.
      registerType: "prompt",
      manifest: {
        name: "Chardex35 — D&D 3.5 Charaktere",
        short_name: "Chardex35",
        description: "D&D 3.5 Charakter-Manager mit Homebrew-Kompendium",
        lang: "de",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#0f172a",
        /*
          Zwei Sätze, kein „any maskable" an einem Bild: das Abzeichen füllt die
          Grafik randvoll, und eine Android-Maske (Kreis, Squircle, Tropfen)
          würde den Goldrand rundherum abschneiden. Die maskable-Fassung bringt
          eigene Luft mit (tools/brand/build-icons.py).
        */
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "icon-maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // SRD-Packs (JSON-Assets) mit precachen — die App ist offline komplett.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,woff2}"],
        // …außer der Versionsdatei: die muss vom Server kommen, sonst prüft die
        // App gegen ihre eigene Kopie und hält sich immer für aktuell.
        globIgnores: ["**/version.json"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
    versionFile(),
  ],
  build: {
    chunkSizeWarningLimit: 900,
  },
});
