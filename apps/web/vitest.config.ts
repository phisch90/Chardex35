/**
 * Tests für die pure Logik der App — alles, was ohne Browser auskommt
 * (Versionsvergleich, Einstellungs-Parser, Hydration). Die Oberfläche selbst
 * wird weiter über Playwright gegen den echten Build geprüft; ein DOM
 * nachzubauen ist an dieser Stelle kein Gewinn.
 *
 * Bewusst eigene Datei und nicht vite.config.ts: die trägt das PWA-Plugin und
 * einen Build-Schritt, der beim Testen nur Zeit kostet.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __APP_COMMIT__: JSON.stringify("testcommit"),
    __APP_BUILT_AT__: JSON.stringify("2026-07-27T21:41:00.000Z"),
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
