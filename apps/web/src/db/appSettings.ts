import { db } from "./db.js";

/**
 * Reine Geräte-Einstellungen (was die App ANZEIGT) — im Unterschied zu den
 * Hausregeln, die die Berechnung verändern und mit exportiert werden.
 */
/**
 * Das Material: Untergrund, Karten, Linien, Schrift.
 *
 * Vier Papiere, alle vier abgenommen:
 *
 *   codex           das kalte Blaugrau vom Anfang
 *   nachtbogen      dunkles Papier, Tabak und Leder
 *   kopierterBogen  hell und kühl, wie eine Fotokopie des echten Bogens
 *   kladde          cremefarbenes Schulheft, blauschwarze Tinte
 *
 * Die zwei hellen standen hier lange NICHT, weil sie noch nicht gebaut waren — eine
 * Auswahl, die nichts ändert, ist schlimmer als keine Auswahl. Jetzt ändern sie etwas:
 * Papierfarbe, Schrift, Linien und Kästen (`styles.css`, Abschnitt D).
 */
export const MATERIALS = ["codex", "nachtbogen", "kopierterBogen", "kladde"] as const;
export type Material = (typeof MATERIALS)[number];

export interface AppSettings {
  /** Würfelfunktion komplett aus: keine 🎲-Knöpfe, kein Würfel-Tab. */
  diceEnabled: boolean;
  /**
   * Wann zuletzt exportiert wurde (ISO, "" = nie). Nur dafür da, den
   * Sicherungs-Zustand anzeigen zu können — siehe backupStatus in core.
   */
  lastExportAt: string;
  /**
   * Welches Papier. Steht in den GERÄTE-Einstellungen und nicht am Charakter: dass er auf
   * dem iPad das dunkle Papier mag und am iPhone das graue, ist keine Eigenschaft seiner
   * Figuren. Dieselbe Trennung wie beim zugeklappten Zaubergrad.
   */
  material: Material;
  /**
   * Färbt die Klasse den Bogen? Sein Auftrag: „Stelle ein, das Man die Klassen Farbe auch
   * abschalten kann."
   *
   * Auch das eine GERÄTE-Einstellung und nicht eine je Charakter — es gibt schon eine je
   * Charakter (`character.accent` im ⋯-Menü, dort wählt er das Thema). Das hier ist der
   * Hauptschalter darüber: aus heißt aus, für alle Bögen, auf diesem Gerät.
   *
   * Aus ist NICHT „grau statt bunt": ohne `data-accent` fällt alles auf das ursprüngliche
   * Amber zurück, das er von Anfang an abgenommen hat — Rahmen, Anstrich und Tönung
   * verschwinden mit.
   */
  classAccent: boolean;
  /**
   * Stehen die Regel-ERKLÄRUNGEN ohne Tap da?
   *
   * Sein Auftrag: „Kurzbeschreibungen optional machen. Ich würde es für mich zum Beispiel
   * deaktivieren, denn ich kenne die Fähigkeiten meines Charakters. Beispiel: ich muss
   * nicht immer die Erklärung für Power Attacken lesen. Alle Beschreibungen sollen aber
   * über antippen und ausklappen weiterhin nachlesbar sein."
   *
   * **Die Grenze, um die es geht, ist ERKLÄRUNG gegen ZUSTAND**, und gefragt hat er sie
   * selbst mitentschieden („Nur Regel-Erklärungen"). Weg darf, was sagt, wie eine Regel
   * FUNKTIONIERT — „Vom Angriff auf den Schaden, höchstens 6". Bleiben muss, was sagt,
   * was an DIESEM Bogen gerade gilt („gilt für dein Kurzschwert") und was ein Knopf
   * ANRICHTET („Gilt für diese Runde"). Wer den Zustand mitversteckt, baut die
   * Fehlerfamilie „etwas weiß es, und etwas anderes kann es nicht" neu auf; wer den
   * Bedienhinweis mitversteckt, macht aus jedem Knopf ein Rätsel.
   *
   * Und nichts verschwindet ganz: jede ausgeblendete Erklärung bekommt ein ▸ und ist
   * einen Tap entfernt. Ein Text, den man nicht mehr erreichen kann, wäre gelöscht.
   */
  ruleHints: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  diceEnabled: true,
  lastExportAt: "",
  material: "codex",
  // AN als Standard: die Klassenfarben sind der Stand, den er gerade abgenommen hat. Wer
  // sie nicht will, schaltet sie ab — nicht umgekehrt.
  classAccent: true,
  /*
    AN als Standard, und zwar aus demselben Grund wie bei `classAccent`: das ist der
    Zustand, den er kennt. Wer die Erklärungen nicht will, schaltet sie ab — der Weg
    andersherum wäre eine App, die nach dem Update stumm dasteht.
  */
  ruleHints: true,
};

export const APP_SETTINGS_KEY = "appSettings";

export function parseAppSettings(value: unknown): AppSettings {
  if (typeof value !== "object" || value === null) return DEFAULT_APP_SETTINGS;
  const raw = value as Partial<Record<keyof AppSettings, unknown>>;
  return {
    diceEnabled:
      typeof raw.diceEnabled === "boolean" ? raw.diceEnabled : DEFAULT_APP_SETTINGS.diceEnabled,
    lastExportAt:
      typeof raw.lastExportAt === "string" ? raw.lastExportAt : DEFAULT_APP_SETTINGS.lastExportAt,
    /*
      Unbekannter Wert → das heutige Aussehen. Auf seinem Gerät liegt das Feld noch gar
      nicht; und ein Papier, das es einmal gab und wieder verschwindet, darf die App nicht
      farblos zurücklassen.
    */
    material: (MATERIALS as readonly string[]).includes(raw.material as string)
      ? (raw.material as Material)
      : DEFAULT_APP_SETTINGS.material,
    /*
      Auf seinem Gerät liegt das Feld noch gar nicht — ein fehlender Wert muss deshalb AN
      bedeuten und nicht aus. Sonst wären die Klassenfarben nach dem Update spurlos weg,
      und er würde einen Fehler suchen, wo eine Voreinstellung stand.
    */
    classAccent:
      typeof raw.classAccent === "boolean" ? raw.classAccent : DEFAULT_APP_SETTINGS.classAccent,
    /*
      Auch hier: ein fehlendes Feld heißt AN. Auf seinem Gerät liegt es noch gar nicht,
      und ein Bogen, dem nach dem Update plötzlich alle Erklärungen fehlen, sieht kaputt
      aus statt eingestellt.
    */
    ruleHints:
      typeof raw.ruleHints === "boolean" ? raw.ruleHints : DEFAULT_APP_SETTINGS.ruleHints,
  };
}

export const AppSettingsRepo = {
  async get(): Promise<AppSettings> {
    const row = await db.settings.get(APP_SETTINGS_KEY);
    return parseAppSettings(row?.value);
  },
  async set(settings: AppSettings): Promise<void> {
    await db.settings.put({ key: APP_SETTINGS_KEY, value: settings });
  },
  /** Nach einem Export aufrufen — die Anzeige lebt von diesem Zeitstempel. */
  async markExported(): Promise<void> {
    const current = await this.get();
    await this.set({ ...current, lastExportAt: new Date().toISOString() });
  },
};
