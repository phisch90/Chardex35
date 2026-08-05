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
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { S } from "./strings.js";

const SRC = dirname(fileURLToPath(import.meta.url));

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

  it("kein deutsches Kürzel in den Quelltexten", () => {
    const funde: string[] = [];
    for (const file of sources(SRC)) {
      const rel = file.slice(SRC.length + 1);
      const text = readFileSync(file, "utf8");
      const kommentare = commentLines(text);
      text.split("\n").forEach((line, i) => {
        if (kommentare.has(i)) return;
        for (const { kuerzel, statt, re } of VERBOTEN) {
          if (re.test(line)) funde.push(`${rel}:${i + 1} — „${kuerzel}" statt „${statt}": ${line.trim()}`);
        }
      });
    }
    expect(funde, `Deutsche Regelkürzel gefunden:\n${funde.join("\n")}`).toEqual([]);
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
