import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "@tanstack/react-router";
import { backupStatus, type HouseRules } from "@codex35/core";
import { S } from "../strings.js";
import { db } from "../db/db.js";
import { SettingsRepo } from "../db/repo.js";
import { AppSettingsRepo, MATERIALS } from "../db/appSettings.js";
import { LIGHT_MATERIALS, MATERIAL_HINTS, MATERIAL_LABELS } from "../ui/materials.js";
import { useAppSettings, useHouseRules } from "../lib/hooks.js";
import { buildExport, downloadExport, importEnvelope, type ImportResult } from "../lib/transfer.js";
import { Card, Chip, GhostButton, PrimaryButton, SectionTitle } from "../ui/bits.js";
import { BackToSheet } from "../ui/BackToSheet.js";
import { SyncCard } from "./SyncCard.js";
import { GroupCard } from "../group/GroupCard.js";
import { VersionBadge } from "../ui/VersionBadge.js";
import { SYNC_SETTINGS_KEY, isSyncConfigured, parseSyncSettings } from "../sync/syncSettings.js";

const oglText = Object.values(
  import.meta.glob("../../../../packs/srd/OGL.txt", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>,
)[0];

/*
  Die zwei Reihen der Papier-Auswahl. Abgeleitet aus `MATERIALS` und `LIGHT_MATERIALS`,
  nicht abgeschrieben: wer ein Papier dazunimmt, trägt es an EINER Stelle ein und es
  erscheint hier von allein in der richtigen Reihe. Eine zweite Liste hier wäre die Sorte
  Kopie, die genau einmal vergessen wird.
*/
const LIGHT_KEYS = MATERIALS.filter((key) => LIGHT_MATERIALS.includes(key));
const DARK_KEYS = MATERIALS.filter((key) => !LIGHT_MATERIALS.includes(key));

export function SettingsPage() {
  const houseRules = useHouseRules();
  const appSettings = useAppSettings();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showLicense, setShowLicense] = useState(false);
  const syncRow = useLiveQuery(() => db.settings.get(SYNC_SETTINGS_KEY), []);
  const syncSettings = syncRow === undefined ? null : parseSyncSettings(syncRow.value);
  const syncConnected = syncSettings !== null && isSyncConfigured(syncSettings);
  const characterCount = useLiveQuery(
    async () => (await db.characters.toArray()).filter((c) => !c.deletedAt).length,
    [],
  );
  /*
    Der Zustand gehört sichtbar auf diese Seite: dass die Charaktere in genau
    einem Browser-Speicher liegen, hat vorher nichts gesagt — bis die
    Startbildschirm-App auf iOS mit einem eigenen, leeren Speicher startete.
  */
  const backup = backupStatus({
    now: new Date().toISOString(),
    characterCount: characterCount ?? 0,
    syncConnected,
    lastSyncAt: syncSettings?.lastSyncAt ?? "",
    lastExportAt: appSettings.lastExportAt,
  });

  useEffect(() => {
    navigator.storage
      ?.persisted?.()
      .then(setPersisted)
      .catch(() => setPersisted(null));
  }, []);

  const setRule = (patch: Partial<HouseRules>) =>
    void SettingsRepo.setHouseRules({ ...houseRules, ...patch });

  const onImportFile = async (file: File) => {
    setImportError(null);
    setImportResult(null);
    try {
      const raw: unknown = JSON.parse(await file.text());
      setImportResult(await importEnvelope(raw));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="space-y-4">
      <BackToSheet />
      <h1 className="text-xl font-bold">{S.nav.settings}</h1>

      {/* Das große Logo hat hier Platz — auf einem App-Symbol wären drei
          Gesichter und die Wortmarke bei 60 px nur Matsch. */}
      <div className="flex flex-col items-center gap-1 py-2">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt={S.appName}
          width={160}
          height={160}
          className="h-40 w-40 rounded-2xl"
        />
        <p className="text-xs text-slate-500">{S.settings.tagline}</p>
        {/* Zweite Heimat der Versionsanzeige: hier sucht man sie, wenn man sie
            bewusst nachsehen will. */}
        <VersionBadge />
      </div>

      {/*
        Das Aussehen steht VOR den Funktionen: es ist das Erste, was er hier sucht, seit es
        eine Wahl gibt.

        Vier Papiere in ZWEI Reihen, getrennt nach dunkel und hell — und das ist mehr als
        Ordnung: der Sprung von dunkel auf hell ist der größte, den die App macht, und wer
        ihn versehentlich tut, hält es für einen Fehler. Bei vier Knöpfen nebeneinander
        wäre jeder 25% breit und der Hinweistext darunter zweizeilig umgebrochen; zwei
        Reihen à zwei lassen den Hinweis lesbar.
      */}
      <Card>
        <SectionTitle>Aussehen</SectionTitle>
        {(
          [
            { titel: "Dunkel — für den Tisch am Abend", keys: DARK_KEYS },
            { titel: "Hell — wie ein gedruckter Bogen", keys: LIGHT_KEYS },
          ] as const
        ).map((gruppe) => (
          <div key={gruppe.titel} className="mb-3 last:mb-0">
            <p className="mb-1 text-[11px] font-medium text-slate-400">{gruppe.titel}</p>
            <div className="flex flex-wrap gap-2">
              {gruppe.keys.map((key) => {
                const active = appSettings.material === key;
                return (
                  <button
                    key={key}
                    onClick={() => void AppSettingsRepo.set({ ...appSettings, material: key })}
                    aria-pressed={active}
                    className={`min-w-[8rem] flex-1 rounded-lg border px-3 py-2 text-left text-sm ${
                      active
                        ? "border-amber-600 bg-amber-950/40 text-amber-200"
                        : "border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span className="block font-medium">{MATERIAL_LABELS[key]}</span>
                    <span className="block text-[11px] text-slate-500">{MATERIAL_HINTS[key]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {/*
          Der Hauptschalter über den elf Klassenthemen — sein Auftrag: „Stelle ein, das Man
          die Klassen Farbe auch abschalten kann."

          Er steht HIER und nicht im ⋯-Menü des Bogens, weil dort die Wahl EINES Themas
          sitzt. Das eine ist „welche Farbe", das andere „überhaupt Farbe" — zwei Fragen,
          zwei Orte. Und weil es eine Geräte-Einstellung ist: dass er am Handy bunt mag und
          auf dem iPad nicht, ist keine Eigenschaft seiner Figuren.
        */}
        <div className="mt-3 border-t border-slate-800 pt-3">
          <Toggle
            label="Klassenfarbe im Bogen"
            hint="Aus: jeder Bogen bleibt beim ursprünglichen Amber — kein Anstrich, keine getönten Karten, keine farbigen Rahmen. Das Klassensymbol bleibt."
            checked={appSettings.classAccent}
            onChange={(v) => void AppSettingsRepo.set({ ...appSettings, classAccent: v })}
          />
        </div>

        {/*
          Sein Auftrag: „Kurzbeschreibungen optional machen … denn ich kenne die
          Fähigkeiten meines Charakters."

          Der Hinweis am Schalter sagt AUSDRÜCKLICH zu, dass nichts verlorengeht — und
          weil er das zusagt, prüft der Lauf im gebauten Bogen es mit. Eine Zusage ohne
          Prüfung ist in dieser App schon einmal eine Anzeige gewesen, die etwas wusste,
          und ein Knopf, der es nicht konnte.
        */}
        <div className="mt-3 border-t border-slate-800 pt-3">
          <Toggle
            label="Kurzbeschreibungen"
            hint="Aus: die Erklärtexte zu Kampfoptionen und Klassenfähigkeiten stehen nicht mehr von allein da — ein Tipp auf ▸ klappt sie auf. Was am Bogen gerade GILT (etwa welche Waffe Power Attack bekommt), bleibt stehen."
            checked={appSettings.ruleHints}
            onChange={(v) => void AppSettingsRepo.set({ ...appSettings, ruleHints: v })}
          />
        </div>

        <p className="mt-2 text-[11px] leading-snug text-slate-500">
          Das Papier bestimmt Untergrund, Schrift, Linien und Kästen. Die FARBE im Bogen
          kommt von der Klasse — der Druide ist grün, der Paladin königsblau; am einzelnen
          Bogen lässt sie sich im ⋯-Menü überschreiben. Die Warnfarbe behält in jedem Papier
          ihren Ton und wird nur so hell oder dunkel, wie der Grund es braucht.
        </p>
      </Card>

      <Card>
        <SectionTitle>{S.settings.features}</SectionTitle>
        <Toggle
          label={S.settings.diceEnabled}
          hint={S.settings.diceEnabledHint}
          checked={appSettings.diceEnabled}
          onChange={(v) => void AppSettingsRepo.set({ ...appSettings, diceEnabled: v })}
        />
        <Toggle
          label={S.settings.encumbrance}
          hint={S.settings.encumbranceHint}
          checked={!houseRules.ignoreEncumbrance}
          onChange={(v) => setRule({ ignoreEncumbrance: !v })}
        />
        {/*
          Das Münzgewicht steht HIER und nicht unter „Hausregeln", weil es zum
          Gewicht gehört — und es steht direkt unter dem Schalter, der das Gewicht
          ganz abschaltet, weil es dann ohnehin nichts tut.

          Standard AUS mit Absicht: die Regel verschiebt die Traglast JEDES
          bestehenden Bogens, ohne dass jemand etwas angefasst hat. Deshalb nennt
          der Kleintext auch die Zahl DIESES Bogens nicht — Einstellungen kennen
          keinen Charakter; die Auskunft steht im Ausrüstungs-Reiter, sobald der
          Schalter an ist.
        */}
        <Toggle
          label={S.settings.coinWeight}
          hint={S.settings.coinWeightHint}
          checked={houseRules.coinWeight}
          onChange={(v) => setRule({ coinWeight: v })}
        />
      </Card>

      <Card>
        <SectionTitle>{S.settings.houseRules}</SectionTitle>
        <Toggle
          label={S.settings.maxHpL1}
          checked={houseRules.maxHpFirstLevel}
          onChange={(v) => setRule({ maxHpFirstLevel: v })}
        />
        <Toggle
          label={S.settings.fractional}
          checked={houseRules.fractionalBabAndSaves}
          onChange={(v) => setRule({ fractionalBabAndSaves: v })}
        />
        {/*
          Die Todesgrenze. Das Feld gab es schon lange, aber ohne Wirkung UND ohne
          Bedienelement — die schlimmste Kombination: eine gespeicherte Einstellung, die
          niemand sehen und niemand ändern kann. Jetzt rechnet sie (`engine/dying.ts`)
          und steht hier, in derselben Reihenfolge: erst die Rechnung, dann der Schalter.

          Zwei Werte, also ein Toggle und keine Knopfreihe. Der Satz darunter nennt die
          Zahl, die dabei herauskommt, weil „negativer CON-Wert" abstrakt ist.
        */}
        <Toggle
          label={S.settings.deathAtNegCon}
          checked={houseRules.deathAt === "negCon"}
          onChange={(v) => setRule({ deathAt: v ? "negCon" : "minus10" })}
        />
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
          {houseRules.deathAt === "negCon"
            ? S.settings.deathAtNegConHint
            : S.settings.deathAtMinus10Hint}
        </p>

        {/*
          Power Attack mit leichter Waffe. Sein Weg dahin, kurz: „bei Hike hat kein power
          attack auf den schaden gezählt" → er kämpft mit Kurzschwert und Schild → das
          Kurzschwert ist eine LEICHTE Waffe, und der SRD verbietet dort den Schadensbonus
          (der Angriffsmalus gilt trotzdem) → seine Frage „Oder gilt power attack beim
          Kurzschwert nie?" → ja → seine Entscheidung: „Bei uns zählt sie trotzdem."

          Deshalb ist AN der Standard. Der Satz darunter nennt, was bei AUS passiert —
          dieselbe Machart wie bei der Todesgrenze: erst der Schalter, dann die Folge in
          Zahlen, damit eine falsche Einstellung auffällt statt still zu wirken.
        */}
        <div className="mt-3 border-t border-slate-800 pt-3">
          <Toggle
            label={S.settings.powerAttackLight}
            checked={houseRules.powerAttackLightWeapons}
            onChange={(v) => setRule({ powerAttackLightWeapons: v })}
          />
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
            {houseRules.powerAttackLightWeapons
              ? S.settings.powerAttackLightOnHint
              : S.settings.powerAttackLightOffHint}
          </p>
        </div>

        {/*
          Martins Hausregel vom Blatt („Spellcasting by Spellcraft"), Philipps Klärung:
          „Ermüdung bei jeder Nutzung". Standard AN wie die anderen Tischregeln — sie
          verschiebt keine Zahl an bestehenden Bögen, sie gibt einen zweiten Weg dazu.
          Der Satz darunter nennt in beiden Stellungen die Folge, nicht die Absicht.
        */}
        <div className="mt-3 border-t border-slate-800 pt-3">
          <Toggle
            label={S.settings.spellcraftCasting}
            checked={houseRules.spellcraftCasting}
            onChange={(v) => setRule({ spellcraftCasting: v })}
          />
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
            {houseRules.spellcraftCasting
              ? S.settings.spellcraftCastingOnHint
              : S.settings.spellcraftCastingOffHint}
          </p>
        </div>

        {/*
          Punktekauf für die Attribute. Das Feld `pointBuyBudget` lag lange da, ohne
          Leser und ohne Bedienelement — dieselbe Lage wie einst bei der Todesgrenze.

          Die bekannten Stufen als KNÖPFE, das Freifeld daneben: dieselbe Regel wie bei
          den Teilgebieten („wo die App die Möglichkeiten kennt, gehört jede einzelne
          als Knopf hin"), und die Liste ist nicht abschließend — ein Tisch darf 30
          spielen.

          „Aus" ist ausdrücklich ein eigener Knopf und der Standard: eure Bögen sind
          gewürfelt, ein voreingestelltes Budget würde ihnen eine Regel unterstellen,
          unter der sie nie entstanden sind.
        */}
        <div className="mt-3 border-t border-slate-800 pt-3">
          <div className="text-sm">{S.settings.pointBuy}</div>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
            {S.settings.pointBuyHint}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Chip
              active={houseRules.pointBuyBudget === undefined}
              onClick={() => setRule({ pointBuyBudget: undefined })}
            >
              {S.settings.pointBuyOff}
            </Chip>
            {POINT_BUY_STEPS.map((step) => (
              <Chip
                key={step.value}
                active={houseRules.pointBuyBudget === step.value}
                onClick={() => setRule({ pointBuyBudget: step.value })}
              >
                {step.value} · {step.label}
              </Chip>
            ))}
            <label className="flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                {S.settings.pointBuyOwn}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                value={houseRules.pointBuyBudget ?? ""}
                onChange={(e) => {
                  const value = e.target.valueAsNumber;
                  // Leer oder Unsinn heißt AUS und nicht „Budget 0" — sonst stünde im
                  // Assistenten „0 von 0" statt gar nichts.
                  setRule({
                    pointBuyBudget: Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined,
                  });
                }}
                className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-right text-sm tabular-nums"
              />
            </label>
          </div>
          {/* Die Folge in Zahlen, wie bei der Todesgrenze: erst der Wert, dann was er bedeutet. */}
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            {houseRules.pointBuyBudget === undefined
              ? S.settings.pointBuyOffHint
              : S.settings.pointBuyOnHint(houseRules.pointBuyBudget)}
          </p>
        </div>
      </Card>

      <SyncCard />

      {/* Die Gruppe steht direkt hinter dem Geräte-Abgleich: beide benutzen
          denselben GitHub-Zugang, und wer das eine einrichtet, denkt ans andere. */}
      <GroupCard />

      <Card>
        <SectionTitle>{S.settings.exportTitle}</SectionTitle>
        <p
          className={`mb-2 rounded-lg px-2 py-1.5 text-xs ${
            backup.tone === "warnung"
              ? "border border-amber-700 bg-amber-950/40 text-amber-200"
              : backup.tone === "hinweis"
                ? "text-amber-300/90"
                : "text-emerald-400/90"
          }`}
        >
          {backup.message}
        </p>
        <p className="mb-2 text-xs text-slate-400">{S.settings.dataPrivacy}</p>
        <div className="flex flex-wrap items-center gap-2">
          <PrimaryButton
            onClick={() =>
              void buildExport()
                .then(downloadExport)
                .then(() => AppSettingsRepo.markExported())
            }
          >
            {S.settings.exportAll}
          </PrimaryButton>
          <label className="cursor-pointer rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
            {S.settings.importFile}
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImportFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Aus der alten App umsteigen?{" "}
          <Link to="/import" className="text-amber-400 underline decoration-dotted">
            {S.import.title}
          </Link>
        </p>
        {importResult && (
          <p className="mt-2 text-xs text-emerald-400">
            Import: {importResult.charactersAdded + importResult.charactersUpdated} Charaktere,{" "}
            {importResult.entitiesAdded + importResult.entitiesUpdated} Homebrew-Einträge übernommen
            ({importResult.charactersSkipped + importResult.entitiesSkipped} übersprungen).
          </p>
        )}
        {importError && <p className="mt-2 text-xs text-red-400">Import fehlgeschlagen: {importError}</p>}
      </Card>

      <Card>
        <SectionTitle>{S.settings.storage}</SectionTitle>
        <p className={`text-sm ${persisted ? "text-emerald-400" : "text-amber-400"}`}>
          {persisted === null ? "…" : persisted ? S.settings.persisted : S.settings.notPersisted}
        </p>
        {/* Läuft der Abgleich, liegt die Kopie ohnehin außerhalb des Geräts —
            dann ist die Warnung oben nur noch die halbe Wahrheit.

            Seit der Abgleich nur beim Start läuft, ist die Kopie aber der Stand VOM
            LETZTEN Abgleich und nicht der von diesem Moment. Das muss dastehen: eine
            Sicherung, die man für aktueller hält, als sie ist, ist die gefährlichste. */}
        {syncConnected && (
          <p className="mt-1 text-xs text-slate-400">
            Der Geräte-Abgleich hält zusätzlich eine Kopie in deinem privaten Gist — den
            Stand vom letzten Abgleich, also vom Öffnen der App oder vom Knopf. Ein Browser,
            der hier aufräumt, kostet dich damit höchstens die Arbeit seit dann.
          </p>
        )}
        <p className="mt-2 text-xs text-amber-300/90">{S.settings.iosWarning}</p>
      </Card>

      <Card>
        <SectionTitle>{S.settings.license}</SectionTitle>
        <p className="mb-2 text-xs text-slate-400">
          Das mitgelieferte Kompendium ist Open Game Content aus dem D&D 3.5 System Reference
          Document, genutzt unter der Open Game License v1.0a. Dieses Werk ist inoffiziell und
          weder von Wizards of the Coast noch von Lion's Den unterstützt.
        </p>
        <GhostButton onClick={() => setShowLicense(!showLicense)}>
          {showLicense ? "Lizenztext ausblenden" : "Lizenztext anzeigen"}
        </GhostButton>
        {showLicense && (
          <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap rounded bg-slate-950 p-2 text-[10px] leading-snug text-slate-400">
            {oglText ?? "OGL.txt liegt nicht im Build (ETL noch nicht gelaufen)."}
          </pre>
        )}
      </Card>
    </div>
  );
}

/**
 * Die Budget-Stufen des Regelwerks, als Knöpfe.
 *
 * Die Zahlen und ihre Namen stehen im DMG; 25 ist die übliche Vorgabe und zugleich
 * genau die Summe der „Standardwerte" im Assistenten (15/14/13/12/10/8) — das prüft
 * `pointBuy.test.ts`, damit die Behauptung nicht bloß hier steht.
 */
const POINT_BUY_STEPS = [
  { value: 22, label: "ruhig" },
  { value: 25, label: "Standard" },
  { value: 28, label: "hart" },
  { value: 32, label: "heldenhaft" },
] as const;

function Toggle(props: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="min-w-0">
        <span className="text-sm">{props.label}</span>
        {props.hint && <span className="block text-xs text-slate-500">{props.hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="h-5 w-9 shrink-0 accent-amber-500"
      />
    </label>
  );
}
