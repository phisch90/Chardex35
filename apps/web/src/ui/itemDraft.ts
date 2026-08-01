import {
  buildHomebrewItem,
  displayName,
  homebrewFromTemplate,
  type HomebrewItemInput,
  type HomebrewItemKind,
  type ItemEntity,
} from "@codex35/core";

/**
 * Die REGELN des Gegenstands-Editors — ohne Oberfläche.
 *
 * Sie stehen hier und nicht in der `.tsx`, weil es in diesem Arbeitsbereich keine
 * DOM-Umgebung für Tests gibt (`apps/web/vitest.config.ts` sammelt nur
 * `src/**\/*.test.ts` und läuft in node). Was geprüft werden soll, muss also aus
 * der Komponente heraus: welche Felder je Art gelten, wie „19" zu „19-20" wird,
 * welche Eingabe eine Warnung verdient. Die `.tsx` hängt nur noch Felder daran.
 *
 * Alles ist Text, auch die Zahlen. Der Grund steht im Prüfbericht: ein
 * `input type="number"`, das bei jedem Anschlag speichert, springt beim
 * Markieren-und-Tippen auf den alten Wert zurück und schreibt beim Leeren eine 0.
 * Ein Entwurf aus Text kennt den Unterschied zwischen „leer" und „null".
 */

export interface ItemDraft {
  kind: HomebrewItemKind;
  name: string;
  description: string;
  /** Text, nicht Zahl — „leer" ist eine eigene Antwort. */
  weightLb: string;
  costGp: string;
  /** Vorlage, von der abgeschrieben wurde. */
  basedOn?: string | undefined;
  basedOnName?: string | undefined;

  // --- Waffe -----------------------------------------------------------------
  damage: string;
  critRange: string;
  critMult: string;
  damageType: string;
  weaponCategory: "simple" | "martial" | "exotic" | "natural";
  handedness: "light" | "one" | "two" | "ranged";
  rangeIncrementFt: number;
  strDamage: "none" | "penaltyOnly" | "full";

  // --- Rüstung und Schild ----------------------------------------------------
  armorKind: "light" | "medium" | "heavy" | "shield";
  acBonus: number;
  /** Getrennt vom Wert, weil „unbegrenzt" (null) keine Zahl ist. */
  maxDexLimited: boolean;
  maxDex: number;
  /** Als positive Zahl geführt, angezeigt und gespeichert wird sie negativ. */
  acp: number;
  asf: number;
}

export const EMPTY_ITEM_DRAFT: ItemDraft = {
  kind: "gear",
  name: "",
  description: "",
  weightLb: "",
  costGp: "",
  damage: "",
  critRange: "20",
  critMult: "x2",
  damageType: "",
  weaponCategory: "martial",
  handedness: "one",
  rangeIncrementFt: 0,
  strDamage: "none",
  armorKind: "light",
  acBonus: 0,
  maxDexLimited: false,
  maxDex: 0,
  acp: 0,
  asf: 0,
};

/** Welche Felder zeigt das Formular bei dieser Art? */
export function fieldsFor(kind: HomebrewItemKind): {
  armor: boolean;
  armorKind: boolean;
  weapon: boolean;
} {
  return {
    armor: kind === "armor" || kind === "shield",
    // Der Schild IST seine Art — die Wahl leicht/mittel/schwer gibt es nur bei
    // Rüstung.
    armorKind: kind === "armor",
    weapon: kind === "weapon",
  };
}

/**
 * „19" heißt 19–20.
 *
 * Fight Club und die Bücher schreiben den kritischen Bereich verkürzt: „19/x2"
 * meint 19–20. Wer die „19" so stehen lässt, hat eine Waffe, die nur auf genau 19
 * kritisch trifft — eine Zahl, die am Tisch nie auffällt und immer falsch ist.
 * Dieselbe Regel steckt schon im Fight-Club-Import.
 */
export function normalizeCritRange(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") return "20";
  const range = /^(\d+)\s*[-–]\s*(\d+)$/.exec(trimmed);
  if (range) return `${range[1]}-${range[2]}`;
  const single = /^(\d+)$/.exec(trimmed);
  if (single) {
    const low = Number(single[1]);
    return low >= 20 ? "20" : `${low}-20`;
  }
  // Etwas Unerwartetes bleibt stehen: warnen statt sperren.
  return trimmed;
}

/** „x3", „X3", „3", „×3" → „x3". */
export function normalizeCritMult(text: string): string {
  const match = /(\d+)/.exec(text.trim());
  return match ? `x${match[1]}` : "x2";
}

/** Nur der Würfel — „1d8", „2d6", „1" für den Dolchstich ohne Würfel. */
export function isPlainDamageDice(text: string): boolean {
  return /^\s*\d*d\d+\s*$/.test(text) || /^\s*\d+\s*$/.test(text);
}

/** Leer bleibt leer (undefined), sonst die Zahl — nie stillschweigend 0. */
function optionalNumber(text: string): number | undefined {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Was am Entwurf auffällt — Sätze für ihn, kein Sperren.
 *
 * „Die Engine wendet auch regelwidrige Werte an und meldet sie. Der DM hat Recht,
 * nicht die App." Das gilt hier genauso: gemeldet wird, gespeichert wird
 * trotzdem. Nur `blocking` verhindert das Speichern, und das ist genau ein Fall
 * (kein Name) plus die zwei, bei denen die Entity gar nicht baubar wäre.
 */
export function draftProblems(draft: ItemDraft): { blocking: string[]; hints: string[] } {
  const blocking: string[] = [];
  const hints: string[] = [];

  if (draft.name.trim() === "") blocking.push("Ohne Namen kann ich ihn nicht ins Gepäck legen.");

  if (draft.kind === "weapon") {
    if (draft.damage.trim() === "") {
      blocking.push(
        "Eine Waffe braucht einen Schadenswürfel — sonst bekommt sie keine Angriffszeile.",
      );
    } else if (!isPlainDamageDice(draft.damage)) {
      hints.push(
        `„${draft.damage.trim()}" sieht nach Würfel PLUS Bonus aus. Trag nur den Würfel ein ` +
          `(etwa „1d8") — deinen Stärkebonus rechnet die App selbst dazu. Ich übernehme es ` +
          "so, wie es dasteht.",
      );
    }
    if (draft.handedness === "ranged" && draft.rangeIncrementFt === 0) {
      hints.push("Eine Fernkampfwaffe ohne Reichweite ist ungewöhnlich, geht aber.");
    }
  }

  if (draft.kind === "armor" || draft.kind === "shield") {
    if (draft.acBonus === 0) {
      hints.push("RK-Bonus 0 — dann zählt der Gegenstand nichts auf die RK. Absicht?");
    }
    if (draft.kind === "armor" && draft.armorKind === "light" && draft.acBonus > 4) {
      hints.push(
        `Ungewöhnlich: eine leichte Rüstung mit RK +${draft.acBonus}. Im Regelwerk hört die ` +
          "leichte Rüstung bei +4 auf. Ich übernehme es trotzdem.",
      );
    }
    if (draft.kind === "shield" && draft.maxDexLimited) {
      hints.push("Schilde haben im Regelwerk keine DEX-Grenze. Ich übernehme es trotzdem.");
    }
  }

  if (optionalNumber(draft.weightLb) === undefined && draft.weightLb.trim() !== "") {
    hints.push(`„${draft.weightLb.trim()}" ist keine Zahl — das Gewicht bleibt leer.`);
  }
  if (optionalNumber(draft.costGp) === undefined && draft.costGp.trim() !== "") {
    hints.push(`„${draft.costGp.trim()}" ist keine Zahl — der Preis bleibt leer.`);
  }

  return { blocking, hints };
}

/** Entwurf → das, was `buildHomebrewItem` erwartet. */
export function draftToInput(draft: ItemDraft, id: string): HomebrewItemInput {
  const fields = fieldsFor(draft.kind);
  return {
    id,
    name: draft.name.trim(),
    kind: draft.kind,
    ...(draft.basedOn === undefined ? {} : { basedOn: draft.basedOn }),
    ...(draft.description.trim() === "" ? {} : { description: draft.description.trim() }),
    ...(optionalNumber(draft.weightLb) === undefined
      ? {}
      : { weightLb: optionalNumber(draft.weightLb) }),
    ...(optionalNumber(draft.costGp) === undefined ? {} : { costGp: optionalNumber(draft.costGp) }),
    ...(fields.weapon
      ? {
          weapon: {
            damage: draft.damage.trim(),
            critRange: normalizeCritRange(draft.critRange),
            critMult: normalizeCritMult(draft.critMult),
            category: draft.weaponCategory,
            handedness: draft.handedness,
            ...(draft.damageType.trim() === "" ? {} : { damageType: draft.damageType.trim() }),
            ...(draft.handedness === "ranged"
              ? {
                  strDamage: draft.strDamage,
                  ...(draft.rangeIncrementFt > 0
                    ? { rangeIncrementFt: draft.rangeIncrementFt }
                    : {}),
                }
              : {}),
          },
        }
      : {}),
    ...(fields.armor
      ? {
          armor: {
            // Der Schild bringt seine Art mit; bei Rüstung kommt sie aus der Wahl.
            kind: draft.kind === "shield" ? "shield" : draft.armorKind,
            acBonus: draft.acBonus,
            maxDex: draft.maxDexLimited ? draft.maxDex : null,
            // Im Regler positiv, gespeichert negativ — so steht es im Buch.
            acp: draft.acp === 0 ? 0 : -Math.abs(draft.acp),
            asf: draft.asf,
          },
        }
      : {}),
  };
}

/** Entwurf → Entity. Wirft nur, was `buildHomebrewItem` wirft. */
export function draftToEntity(
  draft: ItemDraft,
  id: string,
  previous?: ItemEntity,
): ItemEntity {
  return buildHomebrewItem(draftToInput(draft, id), previous);
}

/** Ein bestehender Gegenstand zurück in den Entwurf — für „Bearbeiten". */
export function draftFromEntity(entity: ItemEntity): ItemDraft {
  const armor = entity.data.armor;
  const weapon = entity.data.weapon;
  const kind: HomebrewItemKind =
    armor !== undefined
      ? armor.kind === "shield"
        ? "shield"
        : "armor"
      : weapon !== undefined
        ? "weapon"
        : "gear";
  return {
    ...EMPTY_ITEM_DRAFT,
    kind,
    /*
      Der DEUTSCHE Name als Vorschlag, nicht der englische. Wer „Langschwert" als
      Vorlage nimmt, um daraus „Torbens Klinge" zu machen, soll das Feld nicht
      erst von „Longsword" leerräumen müssen. Bei einem eigenen Gegenstand ohne
      deutschen Namen ist es derselbe Text wie vorher.
    */
    name: displayName(entity),
    description: entity.localized?.de?.summary ?? entity.description ?? "",
    weightLb: entity.data.weightLb === undefined ? "" : String(entity.data.weightLb),
    costGp: entity.data.costGp === undefined ? "" : String(entity.data.costGp),
    ...(entity.basedOn === undefined ? {} : { basedOn: entity.basedOn }),
    ...(weapon === undefined
      ? {}
      : {
          damage: weapon.damage,
          critRange: weapon.critRange,
          critMult: weapon.critMult,
          damageType: weapon.damageType ?? "",
          weaponCategory: weapon.category,
          handedness: weapon.handedness,
          rangeIncrementFt: weapon.rangeIncrementFt ?? 0,
          strDamage: weapon.strDamage ?? "none",
        }),
    ...(armor === undefined
      ? {}
      : {
          // „shield" ist eine eigene Art, keine Rüstungsstärke — bei einem Schild
          // bleibt die Wahl leicht/mittel/schwer auf ihrem Standardwert.
          armorKind: armor.kind === "shield" ? "light" : armor.kind,
          acBonus: armor.acBonus,
          maxDexLimited: armor.maxDex !== null,
          maxDex: armor.maxDex ?? 0,
          acp: Math.abs(armor.acp),
          asf: armor.asf,
        }),
  };
}

/** „Von einer Vorlage abschreiben" — alle Werte übernehmen, Kennung ist neu. */
export function draftFromTemplate(template: ItemEntity): ItemDraft {
  /*
    Der Umweg über `homebrewFromTemplate` ist Absicht: dort steht die Regel, wie
    aus einer Vorlage ein Eigenbau wird (samt `basedOn`, das Weapon Focus am Leben
    hält). Hier wird sie nur in Formularfelder übersetzt, nicht neu erfunden.
  */
  const input = homebrewFromTemplate(template, "homebrew:item:vorschau");
  const draft = draftFromEntity(buildHomebrewItem(input));
  return {
    ...draft,
    basedOn: template.id,
    basedOnName: template.name,
    // Die Beschreibung der Vorlage ist englischer Regeltext des SRD und nicht
    // seine Notiz — abgeschrieben wird der WERT, nicht der Text.
    description: "",
  };
}
