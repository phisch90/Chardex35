/**
 * Die Regelkürzel — und warum ein Test sie hütet.
 *
 * Die Entscheidung ist alt: **Regelkürzel bleiben englisch.** DEX und nicht GE, weil es so
 * in seinen Büchern, in der Gruppen-Excel und in Fight Club steht. Der Commit dazu heißt
 * „deutsche Kürzel raus, englische Regelkürzel rein".
 *
 * Trotzdem stand am Bogen jahrelang „GAB", und daneben in den Einstellungen „Fraktionale
 * BAB/Saves" — **derselbe Wert mit zwei Namen**, während die Engine ihn längst „BAB"
 * nannte. Gefunden hat das nicht der Quelltext, sondern SEIN Satz: „Bitte auch immer bab
 * nennen." Genauso überlebt hatte „4+IN Punkte" in der Klassen-Auskunft.
 *
 * Eine Entscheidung, die in einer Datei als Prosa steht, ist damit nachweislich keine
 * Schranke. Dieser Test ist die Schranke: er liest die Quelltexte und verbietet die
 * deutschen Kürzel.
 *
 * Warum Quelltext und nicht der Lauf im gebauten Bogen: der sieht nur, was gerade
 * gerendert IST — ein Kürzel in einem Zweig, den er nicht aufschlägt, findet er nie.
 * Dieselbe Begründung wie bei der Emoji-Prüfung in `ui/icons.test.ts`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { S } from "./strings.js";

const SRC = dirname(fileURLToPath(import.meta.url));
/**
 * Geprüft werden BEIDE Pakete.
 *
 * Die Texte, die er liest, liegen nicht nur in der Oberfläche: die Begründungen der
 * Empfehlungen und die 1866 Gegenstands-Erklärungen stehen im Kern. Eine Schranke, die nur
 * `apps/web` abdeckt, wäre genau die „eine Regel in drei Ansichten"-Falle — sie meldet
 * grün, während die Hälfte der App das alte Kürzel zeigt.
 */
const ROOTS = [SRC, join(SRC, "../../../packages/core/src")];

/**
 * Die verbotenen Kürzel: die deutschen Eigenerfindungen für Werte, die in den Büchern
 * englisch heißen.
 *
 * NICHT verboten sind die deutschen WÖRTER (Stärke, Grundangriffsbonus) — sie erklären,
 * und ein ganzer Satz darf deutsch sein. Verboten ist die Abkürzung, weil sie am Bogen
 * allein stehen muss und dann nur mit Übersetzungstabelle im Kopf lesbar ist.
 */
const VERBOTEN: Array<{ kuerzel: string; statt: string; re: RegExp }> = [
  { kuerzel: "GAB", statt: "BAB", re: /\bGAB\b/ },
  /*
    „TP bitte in HP umbenennen." Dieselbe Entscheidung wie GAB → BAB, eine Runde später —
    und derselbe Grund, sie als Schranke zu schreiben statt als Prosa: die Abkürzung stand
    an rund zwanzig Stellen in vier Dateien und zwei Paketen, und eine davon zu vergessen
    heißt, dass der Bogen zwei Namen für dieselbe Zahl hat.
  */
  { kuerzel: "TP", statt: "HP", re: /\bTP\b/ },
  /*
    „Ringkampf in EN lassen." Der dritte Fall derselben Familie nach GAB → BAB und
    TP → HP.

    Und hier steckt eine Falle, die den ganzen Unterschied macht: verboten ist
    „Ringkampf", NICHT „Ringen". Das deutsche Wort „Ringen" kommt in den
    Gegenstandstexten vor und meint dort etwas völlig anderes — „ein Hemd aus Ringen"
    ist das Kettenhemd. Eine Schranke, die zu weit greift, meldet dann eine Stelle, die
    mit der Regel nichts zu tun hat, und man baut den Text kaputt, um den Test grün zu
    bekommen.
  */
  { kuerzel: "Ringkampf", statt: "Grapple", re: /\bRingkampf/ },
  { kuerzel: "GE", statt: "DEX", re: /\bGE[- ](?:Mod|Bonus)/ },
  { kuerzel: "KO", statt: "CON", re: /\bKO[- ](?:Mod|Bonus)/ },
  { kuerzel: "WE", statt: "WIS", re: /\bWE[- ](?:Mod|Bonus)/ },
  { kuerzel: "CH", statt: "CHA", re: /\bCH[- ](?:Mod|Bonus)/ },
  { kuerzel: "IN", statt: "INT", re: /\+ ?IN\b(?!T)/ },
];

/** Alle Quelldateien der App — ohne die Tests selbst, die die Kürzel ja NENNEN müssen. */
function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...sources(full));
      continue;
    }
    if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
    out.push(full);
  }
  return out;
}

/*
  Kommentarzeilen dürfen ein verbotenes Kürzel nennen — sie erklären ja gerade dessen
  Abschaffung, und der Hinweis „hier stand GAB" ist die einzige Stelle, an der man später
  noch nachlesen kann, warum.

  Erkannt wird das über den ZUSTAND und nicht über die Einrückung. Die erste Fassung
  fragte nur, ob eine Zeile mit einem Stern oder zwei Schrägstrichen ANFÄNGT — und meldete
  damit die alte Notiz in `strings.ts`, die genau diese Umbenennung erklärt und deren
  Zeilen eingerückter Fließtext sind. Ein Block-Kommentar ist ein Block: was zwischen
  seinem Anfang und seinem Ende steht, ist Kommentar, ganz egal wie es eingerückt ist.
  Eine Prüfung, die stattdessen eine Formatierung verlangt, meldet irgendwann einen Fehler
  am falschen Ort — und dann sucht man ihn in der App.
*/
function commentLines(text: string): Set<number> {
  const out = new Set<number>();
  let inBlock = false;
  text.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    if (inBlock) {
      out.add(i);
      if (trimmed.includes("*/")) inBlock = false;
      return;
    }
    if (trimmed.startsWith("//")) {
      out.add(i);
      return;
    }
    const start = line.indexOf("/*");
    if (start === -1) return;
    out.add(i);
    // Ein einzeiliger Block schließt sich selbst — sonst gilt der Rest der Datei.
    if (!line.slice(start + 2).includes("*/")) inBlock = true;
  });
  return out;
}
describe("Regelkürzel bleiben englisch", () => {
  it("der Bogen nennt den Wert BAB", () => {
    /*
      Sein Wort: „Bitte auch immer bab nennen." Die Zeichenkette steht genau einmal, und
      alle Stellen holen sie von dort — die Gruppenansicht hat vorher ihr eigenes „GAB"
      hingeschrieben, und genau so entsteht ein zweiter Name.
    */
    expect(S.sheet.bab).toBe("BAB");
  });

  it("kein deutsches Kürzel in den Quelltexten — in BEIDEN Paketen", () => {
    const funde: string[] = [];
    let gelesen = 0;
    for (const root of ROOTS) {
      for (const file of sources(root)) {
        gelesen++;
        const rel = file.slice(root.length + 1);
        const text = readFileSync(file, "utf8");
        const kommentare = commentLines(text);
        text.split("\n").forEach((line, i) => {
          if (kommentare.has(i)) return;
          for (const { kuerzel, statt, re } of VERBOTEN) {
            if (re.test(line))
              funde.push(`${rel}:${i + 1} — „${kuerzel}" statt „${statt}": ${line.trim()}`);
          }
        });
      }
    }
    /*
      Die Frage „wurde überhaupt gelesen?" steht VOR dem Vergleich. Ein Test, der nichts
      messen konnte und Erfolg meldet, ist schlimmer als kein Test — genau das ist mir bei
      den Klassenfarben passiert (grün, obwohl kein einziges Thema gefunden wurde). Der
      zweite Pfad zeigt über eine Paketgrenze und ist damit die wahrscheinlichste Stelle,
      an der still gar nichts mehr gelesen wird.
    */
    expect(gelesen, "Quelldateien gefunden").toBeGreaterThan(100);
    expect(funde, `Deutsche Regelkürzel gefunden:\n${funde.join("\n")}`).toEqual([]);
  });

  /*
    Und die PACKS. Genau diese Lücke hat der Blick auf den Talente-Reiter gefunden:
    im Erklärtext von Dodge stand „GE-Bonus", bei Weapon Focus „Ringkampf" — beides
    längst abgeschaffte Wörter, aber die Schranke las nur die Quelltexte, und diese
    Texte liegen als Daten in `packs/srd` (Quelle: `tools/etl`). Eine Schranke, die
    die halbe Wahrheit abdeckt, meldet grün, während die App das alte Wort zeigt —
    dieselbe Lehre wie bei TP → HP, wo sie erst beide PAKETE lesen musste.

    Gelesen werden die deutschen Texte der Packs: alles unter `localized.de` und die
    `data.summary` der Zustände (dort steht das Deutsche direkt, ohne `localized`).
    Die englischen Regeltexte bleiben außen vor — dort ist „ST" ein englisches Wort
    in einem Namen und kein Kürzel.
  */
  it("kein deutsches Kürzel in den deutschen PACK-Texten", () => {
    const packsDir = join(SRC, "../../../packs/srd");
    // Läuft der Test in einer Umgebung ohne Packs (npm-Paket), ist nichts zu prüfen.
    if (!existsSync(join(packsDir, "manifest.json"))) return;

    /*
      In den DATEN dürfen die Kürzel auch allein stehen („−4 GE, halbe Bewegung") —
      im Quelltext wäre `\bGE\b` zu scharf (Bezeichner, englische Wörter), in einem
      deutschen Datentext gibt es keinen zweiten Sinn für ein großgeschriebenes GE.
    */
    const verbotenInDaten = [
      ...VERBOTEN,
      { kuerzel: "GE", statt: "DEX", re: /\bGE\b/ },
      { kuerzel: "ST", statt: "STR", re: /\bST\b/ },
      { kuerzel: "KO", statt: "CON", re: /\bKO\b/ },
      { kuerzel: "WE", statt: "WIS", re: /\bWE\b/ },
    ];

    /** Alle Zeichenketten unter einem Knoten einsammeln — rekursiv, mit Pfad. */
    const collect = (node: unknown, path: string, out: Array<[string, string]>) => {
      if (typeof node === "string") out.push([path, node]);
      else if (Array.isArray(node)) node.forEach((v, i) => collect(v, `${path}[${i}]`, out));
      else if (node !== null && typeof node === "object") {
        for (const [key, value] of Object.entries(node)) collect(value, `${path}.${key}`, out);
      }
    };

    const funde: string[] = [];
    let geprueft = 0;
    const manifest = JSON.parse(readFileSync(join(packsDir, "manifest.json"), "utf8")) as {
      files: string[];
    };
    for (const file of manifest.files) {
      if (!file.endsWith(".json") || file === "manifest.json") continue;
      const entities = JSON.parse(readFileSync(join(packsDir, file), "utf8")) as Array<{
        id: string;
        kind: string;
        localized?: { de?: unknown };
        data?: { summary?: string };
      }>;
      for (const entity of entities) {
        const texte: Array<[string, string]> = [];
        if (entity.localized?.de !== undefined) collect(entity.localized.de, "de", texte);
        if (entity.kind === "condition" && typeof entity.data?.summary === "string") {
          texte.push(["summary", entity.data.summary]);
        }
        for (const [pfad, text] of texte) {
          geprueft++;
          for (const { kuerzel, statt, re } of verbotenInDaten) {
            if (re.test(text)) {
              funde.push(`${file} ${entity.id} (${pfad}) — „${kuerzel}" statt „${statt}": ${text}`);
            }
          }
        }
      }
    }
    /*
      Wieder zuerst: wurde überhaupt etwas gelesen? In den Packs liegen 175
      Talent-Erklärungen und 29 Zustände — die 1866 Gegenstandstexte NICHT, die
      werden beim Einrichten aus `core/compendium/itemGerman.ts` übergelegt, und
      diese Datei liest der Quelltext-Durchlauf oben schon. Meine erste Fassung
      verlangte hier über 1000 und meldete damit die Packs als falsch, die recht
      hatten — eine Schwelle muss die Wirklichkeit kennen, die sie prüft.
    */
    expect(geprueft, "deutsche Pack-Texte gefunden").toBeGreaterThan(150);
    expect(funde, `Deutsche Regelkürzel in den Packs:\n${funde.join("\n")}`).toEqual([]);
  });

  it("die Attributskürzel selbst sind die englischen", () => {
    expect(S.abilities).toMatchObject({
      str: "STR",
      dex: "DEX",
      con: "CON",
      int: "INT",
      wis: "WIS",
      cha: "CHA",
    });
  });

  it("die Angriffsreihe nennt den BAB — in beiden Fassungen", () => {
    /*
      Der Grund steht bei der Zeichenkette: „+9/+4" kommt aus dem BAB und nicht aus der
      Zahl daneben. Wer wissen will, WARUM es zwei Angriffe sind, muss den BAB sehen.

      Geprüft wird beides, weil am Handy die kurze und ab `sm` die lange Fassung steht —
      eine davon zu vergessen heißt, dass der BAB genau auf dem Gerät fehlt, auf dem er
      spielt.
    */
    expect(S.sheet.iterativeShort(2, "+6")).toContain("BAB +6");
    const lang = S.sheet.iterativeHint(["+9", "+4"], "+6");
    expect(lang).toContain("BAB +6");
    expect(lang).toContain("+9");
    expect(lang).toContain("+4");
    /*
      Und was NICHT dasteht: der Satz „Euer Tisch spielt die Reihe ab BAB +6." Er ist auf
      seinen Wunsch weg („Das „euer Tisch…" kann raus"), und ohne diese Zeile hier käme er
      bei der nächsten Runde als gut gemeinte Ergänzung zurück. Ein Test, der eine
      Auslassung festhält, ist die einzige Art, eine Entscheidung gegen Text zu schützen.
    */
    expect(lang).not.toMatch(/euer tisch/i);
  });
});
