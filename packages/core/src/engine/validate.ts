import type { Entity } from "../schema/entities.js";
import { displayName } from "../schema/entities.js";
import type { ResolvedCharacter } from "./internal.js";
import { featEligibility } from "./prereqs.js";
import type { DerivedSheet } from "./types.js";

/**
 * Stufe 7 — validate: WARNUNGEN, nie Blocker. Der DM hat Recht (Homebrew-first);
 * jede Warnung ist in der UI pro Charakter stummschaltbar.
 */
export function validate(
  resolved: ResolvedCharacter,
  sheet: DerivedSheet,
  compendium?: ReadonlyMap<string, Entity>,
): void {
  const { character } = resolved;
  const issues = sheet.issues;

  // Maximale Ränge je Fertigkeit.
  for (const skill of sheet.skills) {
    if (skill.ranks > skill.maxRanks) {
      issues.push({
        severity: "warning",
        code: "max-ranks",
        message: `${skill.name}: ${skill.ranks} Ränge übersteigen das Maximum von ${skill.maxRanks}${skill.isClassSkill ? "" : " (klassenfremd)"}.`,
        ref: skill.skillId,
      });
    }
  }

  // Ränge auf der Grundzeile einer Teilgebiets-Fertigkeit: regeltechnisch
  // gehören sie in ein Teilgebiet. Nicht automatisch verschieben — welches
  // gemeint ist, weiß nur der Spieler (Alt-Charaktere, FC-Import ohne Angabe).
  for (const skill of sheet.skills) {
    if (skill.subtyped && skill.subtype === undefined && skill.ranks > 0) {
      issues.push({
        severity: "warning",
        code: "skill-needs-subtype",
        message: `${skill.name}: ${skill.ranks} Ränge liegen auf der Grundfertigkeit. Leg ein Teilgebiet an (z.B. „${skill.name} (arcana)") und trag die Ränge dort ein.`,
        ref: skill.skillId,
      });
    }
  }

  // Fertigkeitspunkte gesamt.
  if (sheet.skillPoints.spent > sheet.skillPoints.available) {
    issues.push({
      severity: "warning",
      code: "skill-points-overspent",
      message: `Fertigkeitspunkte: ${sheet.skillPoints.spent} ausgegeben, nur ${sheet.skillPoints.available} verfügbar.`,
    });
  }

  // Talent-Slots.
  if (sheet.featSlots.used > sheet.featSlots.available) {
    issues.push({
      severity: "warning",
      code: "feat-slots-overspent",
      message: `Talente: ${sheet.featSlots.used} gewählt, nur ${sheet.featSlots.available} Slots verfügbar.`,
    });
  }

  /*
    Talent-Voraussetzungen — warn-only, und über GENAU DIE Funktion, mit der die
    Talentauswahl sperrt (`engine/prereqs.ts`).

    Vorher stand die Prüfung hier als eigene Closure. Sie war damit von außen nicht
    erreichbar, also hätte die Auswahl ihre eigene bauen müssen — und zwei Fassungen
    derselben Regel laufen auseinander: dann sperrt die Auswahl etwas, das der Bogen
    nicht beanstandet, oder umgekehrt. Eine Funktion, zwei Aufrufer.

    Nebenbei nennen die Meldungen jetzt Namen statt Kennungen. Vorher stand hier
    „Voraussetzung nicht erfüllt (Talent srd:feat:power-attack)".
  */
  for (const feat of resolved.feats) {
    if (!feat.entity) continue;
    const { missing } = featEligibility(feat.entity, sheet, compendium);
    for (const label of missing) {
      issues.push({
        severity: "warning",
        code: "feat-prerequisite",
        message: `${displayName(feat.entity)}: Voraussetzung nicht erfüllt (${label}).`,
        ref: feat.entity.id,
      });
    }
  }

  // TP-Würfe plausibel?
  character.levels.forEach((level, i) => {
    const cls = resolved.classes.get(level.classId);
    if (!cls || typeof level.hpRoll !== "number") return;
    if (level.hpRoll < 1 || level.hpRoll > cls.data.hitDie) {
      issues.push({
        severity: "warning",
        code: "hp-roll-out-of-range",
        message: `Stufe ${i + 1}: TP-Wurf ${level.hpRoll} liegt außerhalb von 1–${cls.data.hitDie} (W${cls.data.hitDie}).`,
      });
    }
  });

  // Mehr vorbereitete Zauber als Slots (je Grad).
  for (const block of sheet.spellcasting) {
    /*
      Domänen gewählt? Ohne sie fehlen dem Kleriker zwei Dinge gleichzeitig: die
      Zauber der Domänenliste (Power Word Kill steht auf keiner Klerikerliste)
      und die zugehörige Granted Power. Der Domänenplatz selbst ist trotzdem da —
      er hängt an der KLASSE, nicht an der Wahl, und ihn erst nach der Wahl zu
      gewähren hieße, dass ein halb ausgefüllter Bogen falsch rechnet.
    */
    if (block.domainPick > 0 && block.domains.length !== block.domainPick) {
      issues.push({
        severity: "warning",
        code: block.domains.length < block.domainPick ? "domains-missing" : "domains-too-many",
        message:
          block.domains.length < block.domainPick
            ? `${block.className}: ${block.domains.length} von ${block.domainPick} Domänen gewählt. Im Zauber-Reiter nachtragen — sonst fehlen dir die Domänenzauber.`
            : `${block.className}: ${block.domains.length} Domänen gewählt, die Klasse hat ${block.domainPick}.`,
        ref: block.classId,
      });
    }

    const prepared = character.spellState[block.classId]?.prepared ?? [];
    const countByLevel = new Map<number, number>();
    for (const p of prepared) {
      countByLevel.set(p.slotLevel, (countByLevel.get(p.slotLevel) ?? 0) + 1);
    }
    for (const slot of block.slots) {
      const count = countByLevel.get(slot.level) ?? 0;
      if (slot.total !== null && count > slot.total) {
        issues.push({
          severity: "warning",
          code: "prepared-over-slots",
          message: `${block.className}: ${count} Zauber Grad ${slot.level} vorbereitet, nur ${slot.total} Slots.`,
          ref: block.classId,
        });
      }
    }
  }
}
