import type { Entity } from "../schema/entities.js";
import { displayName } from "../schema/entities.js";
import type { ResolvedCharacter } from "./internal.js";
import { featEligibility } from "./prereqs.js";
import type { DerivedSheet } from "./types.js";

/**
 * Stufe 7 — validate: WARNUNGEN, nie Blocker. Der DM hat Recht (Homebrew-first);
 * jede Warnung mit `muteKey` ist am Bogen abstellbar („passt so").
 *
 * Lange Zeit stand hier von jedem Topf nur EINE Hälfte: die App meldete, wenn man
 * zu VIEL ausgegeben hatte, und schwieg, wenn etwas offen blieb. Sein Satz dazu:
 * „Wir brauchen eine Warnung wenn man etwas vergessen hat. Wenn man zb ein Talent
 * zu wenig oder noch skill Punkte offen sind." Die Zahlen dafür rechnete die
 * Engine längst (`skillPoints`, `featSlots`) — sie sagte nur nichts dazu.
 *
 * Deshalb stehen die beiden Hälften hier jetzt IMMER als Paar beieinander. Eine
 * Warnung über „zu wenig" an eine andere Stelle zu schreiben wäre der Anfang
 * davon, dass die beiden auseinanderlaufen.
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
        tab: "skills",
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
        tab: "skills",
      });
    }
  }

  /*
    Fertigkeitspunkte — beide Hälften.

    Der offene Rest ist NICHT abstellbar per Menge allein, sondern genauso wie die
    Talente: „passt so" merkt sich die Zahl. Wer sechs Punkte liegen lässt, weil er
    sie beim nächsten Aufstieg zusammen ausgeben will, sagt es einmal.
  */
  const skillsLeft = sheet.skillPoints.available - sheet.skillPoints.spent;
  if (skillsLeft < 0) {
    issues.push({
      severity: "warning",
      code: "skill-points-overspent",
      message: `Fertigkeitspunkte: ${sheet.skillPoints.spent} ausgegeben, nur ${sheet.skillPoints.available} verfügbar.`,
      tab: "skills",
    });
  } else if (skillsLeft > 0) {
    issues.push({
      severity: "warning",
      code: "skill-points-open",
      message: `Fertigkeitspunkte: ${skillsLeft} von ${sheet.skillPoints.available} noch nicht verteilt.`,
      tab: "skills",
      muteKey: "skill-points-open",
      open: skillsLeft,
    });
  }

  // Talent-Slots — beide Hälften.
  const featsLeft = sheet.featSlots.available - sheet.featSlots.used;
  if (featsLeft < 0) {
    issues.push({
      severity: "warning",
      code: "feat-slots-overspent",
      message: `Talente: ${sheet.featSlots.used} gewählt, nur ${sheet.featSlots.available} Slots verfügbar.`,
      tab: "feats",
    });
  } else if (featsLeft > 0) {
    issues.push({
      severity: "warning",
      code: "feat-slots-open",
      message:
        featsLeft === 1
          ? `Talente: 1 Slot ist noch frei (${sheet.featSlots.used} von ${sheet.featSlots.available} gewählt).`
          : `Talente: ${featsLeft} Slots sind noch frei (${sheet.featSlots.used} von ${sheet.featSlots.available} gewählt).`,
      tab: "feats",
      muteKey: "feat-slots-open",
      open: featsLeft,
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
        tab: "feats",
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
        tab: "stats",
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
        tab: "spells",
        muteKey: `domains-missing:${block.classId}`,
        open: Math.abs(block.domainPick - block.domains.length),
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
          tab: "spells",
        });
      }
    }

    /*
      Und die andere Hälfte: leere Plätze.

      NUR bei vorbereitenden Klassen. Ein Barde oder Hexenmeister hat nichts
      vorzubereiten — er wirkt spontan aus seinen bekannten Zaubern, und seine
      Plätze sind erst leer, wenn er sie verbraucht hat. Eine Warnung dort wäre
      nicht nur nutzlos, sie wäre falsch.

      EINE Meldung je Klasse, nicht eine je Grad. Ein Kleriker der Stufe 7 hätte
      sonst fünf Zeilen für dieselbe Sache, und der Punkt am Reiter wäre derselbe.
    */
    if (block.model !== "prepared") continue;
    const emptyByLevel: string[] = [];
    let emptyTotal = 0;
    for (const slot of block.slots) {
      /*
        Grad 0 zählt NICHT mit. Martins Hausregel: „Grad-0-Zauber müssen nicht
        vorbereitet werden, allgemein lockere Handhabung, gilt für alle." Wo nichts zu
        belegen ist, kann auch nichts offen sein — die Plätze selbst bleiben (man
        entscheidet erst beim Wirken), und genau die zählt der Zauber-Reiter weiter.

        Ohne diese Zeile stünde auf jedem Kleriker-Bogen dauerhaft „Grad 0: 3", und ein
        Hinweis, der immer dasteht, ist Tapete — dann übersieht man die Grade, an denen
        wirklich etwas fehlt.
      */
      if (slot.level === 0) continue;
      if (slot.total === null || slot.total === 0) continue;
      const left = slot.total - (countByLevel.get(slot.level) ?? 0);
      if (left <= 0) continue;
      emptyTotal += left;
      emptyByLevel.push(`Grad ${slot.level}: ${left}`);
    }
    if (emptyTotal > 0) {
      issues.push({
        severity: "warning",
        code: "spell-slots-open",
        message: `${block.className}: ${emptyTotal} Zauberplätze nicht belegt (${emptyByLevel.join(" · ")}).`,
        ref: block.classId,
        tab: "spells",
        muteKey: `spell-slots-open:${block.classId}`,
        open: emptyTotal,
        daily: true,
      });
    }
  }

  /*
    Zum Schluss: was der Bogen selbst abgestellt hat.

    Die Warnungen bleiben in der Liste und werden nur MARKIERT. Sie ganz
    wegzulassen wäre bequemer, aber dann gäbe es keinen Weg zurück — ein Schalter
    ohne Rückweg ist in dieser App dasselbe wie Löschen.
  */
  const muted = new Map(character.mutedWarnings.map((m) => [m.key, m.upTo]));
  for (const issue of issues) {
    if (issue.muteKey === undefined) continue;
    const upTo = muted.get(issue.muteKey);
    if (upTo === undefined) continue;
    if ((issue.open ?? 0) <= upTo) issue.muted = true;
  }
}
