import { ABILITIES, type Ability, type Size, type StatPath } from "../schema/common.js";
import { isEquipped, type EquipSlot, type HouseRules } from "../schema/character.js";
import {
  displayName,
  parseSkillKey,
  skillDisplayName,
  skillKey,
  type ItemEntity,
  type SkillEntity,
} from "../schema/entities.js";
import {
  applyCombatOptions,
  type Hand,
  type TwoWeaponSetup,
  type WieldContext,
} from "./combatOptions.js";
import { isNaturalOrUnarmed } from "./equipment.js";
import type { ActiveEffect, ResolvedCharacter, TimelineResult } from "./internal.js";
import {
  baseContribution,
  flagSet,
  stackContributions,
  stackPaths,
  toBuckets,
  toContribution,
  withoutContributions,
  type Buckets,
} from "./stack.js";
import {
  GRAPPLE_SIZE_MODIFIER,
  LOAD_LIMITS,
  SIZE_MODIFIER,
  abilityIncreaseCount,
  abilityModifier,
  averageHitDie,
  baseFeatSlots,
  bonusSpells,
  carryingCapacity,
  iterativeAttacks,
  maxRanks,
  reducedSpeed,
  xpForLevel,
} from "./tables.js";
import type {
  AbilityBlock,
  AttackLine,
  Contribution,
  DerivedIssue,
  DerivedSheet,
  FeatureLine,
  SkillLine,
  SlotInfo,
  SpellcastingBlock,
  StatValue,
} from "./types.js";

const LEVEL_UP_ORDINALS = ["4.", "8.", "12.", "16.", "20."];

/** Stufe 4 — evalFormulas, Pass 1: finale Attributswerte. */
export function deriveAbilities(
  resolved: ResolvedCharacter,
  timeline: TimelineResult,
  effects: ActiveEffect[],
): Record<Ability, AbilityBlock> {
  const { character, race } = resolved;
  const increases = abilityIncreaseCount(timeline.totalLevel);

  const blocks = {} as Record<Ability, AbilityBlock>;
  for (const ability of ABILITIES) {
    const base = character.abilities.base[ability];
    const contributions: Contribution[] = [baseContribution("Basiswert", base)];

    const racialMod = race?.data.abilityMods[ability];
    if (race && racialMod) {
      contributions.push({
        source: displayName(race),
        bonusType: "untyped",
        value: racialMod,
        applied: true,
        condition: undefined,
      });
    }

    character.abilities.levelUps.slice(0, increases).forEach((pick, i) => {
      if (pick === ability) {
        contributions.push(
          baseContribution(`Stufenanstieg (${LEVEL_UP_ORDINALS[i] ?? `${(i + 1) * 4}.`} Stufe)`, 1),
        );
      }
    });

    for (const effect of effects) {
      if (effect.target === `ability.${ability}`) contributions.push(toContribution(effect));
    }

    const score = stackContributions(contributions);
    blocks[ability] = { base, score, mod: abilityModifier(score.total) };
  }
  return blocks;
}

interface EquippedArmorInfo {
  entity: ItemEntity;
  instanceId: string;
  label: string;
}

/** Stufen 4–6 — Pass 2 + Ableitung des kompletten Bogens. */
export function deriveSheetValues(
  resolved: ResolvedCharacter,
  timeline: TimelineResult,
  effects: ActiveEffect[],
  abilities: Record<Ability, AbilityBlock>,
  houseRules: HouseRules,
  issues: DerivedIssue[],
): DerivedSheet {
  const { character, race } = resolved;
  const globalEffects = effects.filter((e) => !e.itemInstanceId);
  const buckets = toBuckets(globalEffects);
  const itemScoped = new Map<string, ActiveEffect[]>();
  for (const effect of effects) {
    if (!effect.itemInstanceId) continue;
    const list = itemScoped.get(effect.itemInstanceId) ?? [];
    list.push(effect);
    itemScoped.set(effect.itemInstanceId, list);
  }

  const mod = (a: Ability) => abilities[a].mod;
  const size: Size = race?.data.size ?? "medium";
  const sizeModifier = SIZE_MODIFIER[size];
  const totalLevel = timeline.totalLevel;

  // --- Ausgerüstete Rüstung/Schilde --------------------------------------
  const equippedArmor: EquippedArmorInfo[] = [];
  const equippedWeapons: {
    entity: ItemEntity;
    instanceId: string;
    label: string;
    slot: EquipSlot;
  }[] = [];
  for (const { instance, entity } of resolved.items) {
    if (!entity) continue;
    const label = instance.customName ?? displayName(entity);
    // Rüstung und Schild zählen nur ANGELEGT — sonst wäre die RK eine Lüge.
    if (entity.data.armor && isEquipped(instance)) {
      equippedArmor.push({ entity, instanceId: instance.id, label });
    }
    /*
      Waffen dagegen bekommen IMMER eine Angriffszeile, auch aus dem Rucksack: es
      ist eine Waffe, mit der man angreifen kann — man zieht sie eben. Fight Club
      listet ebenso alle Angriffe.

      Das war der Grund für einen zweiten Fehler: als der Import nur noch die
      erste Waffe in die Hand legte (vorher lagen vier Waffen in zwei Händen),
      verschwanden die Angriffszeilen der übrigen drei. Beides falsch — die Zeile
      hängt am Besitz, der PLATZ nur am Schaden.
    */
    if (entity.data.weapon) {
      equippedWeapons.push({ entity, instanceId: instance.id, label, slot: instance.slot });
    }
  }

  /*
    Was liegt in welcher Hand? Einmal ausgewertet, zweimal gebraucht: für den
    Angriffsmalus (combatOptions.ts) und für die Zahl der Angriffe der zweiten
    Hand.

    GENAU der Slot zählt, nicht `isEquipped`. Zwei Fallen, die beide schon einmal
    Zahlen verschoben haben: `worn` ist der Altbestand aus der Zeit vor den
    Slot-Marken und keine Hand, und `none` ist der Rucksack — Philipps
    importierter Bogen trägt eine Waffe in der Hand und drei im Rucksack. Und
    Fernkampfwaffen dürfen es nicht auslösen: eine Armbrust ist in der Haupthand
    erlaubt, ein Zweiwaffenkampf mit ihr nicht.

    Ein Zweihänder sperrt: wer beide Hände an einer Waffe hat, hat keine zweite
    frei. Über die Oberfläche ist das nicht erreichbar, über Import und Abgleich
    schon.
  */
  const meleeInHand = (slot: EquipSlot) =>
    equippedWeapons.find(
      (w) => w.slot === slot && w.entity.data.weapon?.handedness !== "ranged",
    );
  const offHandWeapon = meleeInHand("offHand");
  const twoWeaponSetup: TwoWeaponSetup | null =
    meleeInHand("mainHand") !== undefined &&
    offHandWeapon !== undefined &&
    !equippedWeapons.some((w) => w.slot === "bothHands")
      ? { offHandIsLight: offHandWeapon.entity.data.weapon?.handedness === "light" }
      : null;

  /**
   * Talent-Effekte, die nur für die gewählte Waffe gelten („Weapon Focus
   * (Kurzschwert)" → +1 nur mit dem Kurzschwert). Der Verweis `choiceRef` ist
   * eindeutig; fehlt er, wird der Auswahltext gegen den Waffennamen gehalten,
   * damit auch handgetippte Auswahlen greifen.
   */
  const normalizeChoice = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const chosenItemContributions = (
    weapon: { entity: ItemEntity; label?: string | undefined },
    target: StatPath,
  ): Contribution[] => {
    const out: Contribution[] = [];
    const names = new Set(
      [weapon.entity.name, displayName(weapon.entity), weapon.label ?? ""].map(normalizeChoice),
    );
    for (const feat of resolved.feats) {
      if (!feat.entity) continue;
      const matches =
        feat.choiceRef !== undefined
          ? // Weapon Focus gilt für einen Waffen-TYP, nicht für ein Exemplar:
            // eine Homebrew-Variante („Templer Schwert" mit `basedOn`
            // Kurzschwert) ist dieser Typ und bekommt den Bonus mit.
            feat.choiceRef === weapon.entity.id || feat.choiceRef === weapon.entity.basedOn
          : feat.choice !== undefined && names.has(normalizeChoice(feat.choice));
      if (!matches) continue;
      for (const effect of feat.entity.effects) {
        if (effect.scope !== "chosenItem" || effect.target !== target) continue;
        out.push({
          source: `${displayName(feat.entity)}${feat.choice ? ` (${feat.choice})` : ""}`,
          bonusType: effect.bonusType,
          value: typeof effect.value === "number" ? effect.value : 0,
          applied: true,
          condition: effect.condition,
        });
      }
    }
    return out;
  };

  // --- Traglast ------------------------------------------------------------
  let loadLb = 0;
  for (const { instance, entity } of resolved.items) {
    const weight = instance.weightLbOverride ?? entity?.data.weightLb ?? 0;
    loadLb += weight * instance.qty;
  }
  const capacity = carryingCapacity(abilities.str.score.total, size);
  const loadLevel: DerivedSheet["encumbrance"]["level"] =
    loadLb <= capacity.lightMaxLb
      ? "light"
      : loadLb <= capacity.mediumMaxLb
        ? "medium"
        : loadLb <= capacity.heavyMaxLb
          ? "heavy"
          : "overloaded";
  const encumbrance = { loadLb, ...capacity, level: loadLevel };

  // --- Max-GE und Rüstungsmalus (Rüstung vs. Last: der schlechtere Wert) ---
  let armorMaxDex: number | null = null;
  let armorAcpSum = 0;
  let armorIsMediumOrHeavy = false;
  for (const { entity } of equippedArmor) {
    const armor = entity.data.armor;
    if (!armor) continue;
    if (armor.maxDex !== null) {
      armorMaxDex = armorMaxDex === null ? armor.maxDex : Math.min(armorMaxDex, armor.maxDex);
    }
    armorAcpSum += armor.acp;
    if (armor.kind === "medium" || armor.kind === "heavy") armorIsMediumOrHeavy = true;
  }
  // Hausregel „ohne Gewicht": die Last schränkt nichts ein.
  const loadLimit = houseRules.ignoreEncumbrance
    ? null
    : loadLevel === "medium"
      ? LOAD_LIMITS.medium
      : loadLevel === "heavy" || loadLevel === "overloaded"
        ? LOAD_LIMITS.heavy
        : null;
  let maxDex: number | null = armorMaxDex;
  if (loadLimit) maxDex = maxDex === null ? loadLimit.maxDex : Math.min(maxDex, loadLimit.maxDex);
  // PHB S. 162: Rüstungsmalus aus Rüstung und Last stacken nicht — der schlechtere zählt.
  const acp = Math.min(armorAcpSum, loadLimit?.acp ?? 0);

  /*
    Kampfoptionen zuerst: RK, Angriff und Schaden hängen alle daran, und die
    Regeln dazu (inklusive der Verdopplung von Power Attack bei zweihändiger
    Führung) stehen gesammelt in combatOptions.ts.
  */
  const featIdSet = new Set(resolved.feats.map((f) => f.featId));
  /*
    Die drei Zweiwaffen-Talente über ihre Kennung, wie die drei Nachbarn darüber.

    Die Alternative wäre eine Marke in den Packdaten gewesen (so läuft es bei
    Weapon Finesse). Dagegen sprechen zwei Dinge: die Mechanik dieser Talente
    steht hier in combatOptions.ts und nicht in einem Effekt — genau wie bei Power
    Attack und Dodge —, und eine Marke bräuchte einen Neubau der Packs samt
    erhöhter Kompendiums-Nummer. Vergisst man die, sind alle Tests grün und auf
    dem Handy fehlt die Marke: dann rechnet ein Charakter MIT Talent weiter mit
    −6/−10. Der Preis der Kennungen ist, dass ein eigenes Talent aus seinen
    Büchern nicht mitzählt — das trifft die drei Nachbarn genauso.
  */
  const combat = applyCombatOptions(character.combatOptions, {
    bab: timeline.bab,
    hasPowerAttack: featIdSet.has("srd:feat:power-attack"),
    hasCombatExpertise: featIdSet.has("srd:feat:combat-expertise"),
    hasDodge: featIdSet.has("srd:feat:dodge"),
    twoWeapon: twoWeaponSetup,
    hasTwoWeaponFighting: featIdSet.has("srd:feat:two-weapon-fighting"),
    hasImprovedTwoWeaponFighting: featIdSet.has("srd:feat:improved-two-weapon-fighting"),
    hasGreaterTwoWeaponFighting: featIdSet.has("srd:feat:greater-two-weapon-fighting"),
  });
  for (const message of combat.warnings) {
    issues.push({ severity: "warning", code: "combat-option", message });
  }

  // --- RK -------------------------------------------------------------------
  const dexMod = mod("dex");
  const clampedDex = maxDex !== null ? Math.min(dexMod, maxDex) : dexMod;
  const acContributions: Contribution[] = [baseContribution("Basis", 10)];
  const dexContribution: Contribution = {
    source: maxDex !== null && dexMod > maxDex ? `DEX-Modifikator (max. DEX ${maxDex})` : "DEX-Modifikator",
    bonusType: "untyped",
    value: clampedDex,
    applied: true,
    condition: undefined,
  };
  acContributions.push(dexContribution);
  if (sizeModifier !== 0) {
    acContributions.push({
      source: "Größe",
      bonusType: "size",
      value: sizeModifier,
      applied: true,
      condition: undefined,
    });
  }
  acContributions.push(...combat.ac);
  for (const { entity, label } of equippedArmor) {
    const armor = entity.data.armor;
    if (!armor) continue;
    acContributions.push({
      source: label,
      bonusType: armor.kind === "shield" ? "shield" : "armor",
      value: armor.acBonus,
      applied: true,
      condition: undefined,
    });
  }
  /*
    Dodge kommt aus den Kampfoptionen (siehe combat.ac), nicht aus dem Talent —
    darum fliegt der Kompendium-Effekt des Talents hier heraus.

    Sonst stünden ZWEI Zeilen „Talent: Dodge +1" in der Aufschlüsselung: eine
    durchgestrichene vom Talent (Bedingung „gegen einen gewählten Gegner") und
    eine gezählte vom Schalter. Für eine Regel gibt es einen Besitzer, und das ist
    der Schalter — er weiß, ob Dodge in dieser Runde gilt, das Talent weiß es nie.
  */
  for (const effect of buckets.get("ac") ?? []) {
    if (effect.key.startsWith("srd:feat:dodge")) continue;
    acContributions.push(toContribution(effect));
  }
  // stackContributions kopiert die Beiträge — der GE-Beitrag wird über seinen
  // Index wiedergefunden (Reihenfolge bleibt erhalten).
  const dexIndex = acContributions.indexOf(dexContribution);
  const acTotal = stackContributions(acContributions);
  const stackedDex = acTotal.contributions[dexIndex];

  /*
    Touch und „auf dem falschen Fuß" sind DIESELBE Rechnung wie die RK, nur mit
    weggelassenen Beiträgen. Beide geben deshalb einen vollen StatValue heraus
    und nicht bloß eine Zahl: sonst kann die Oberfläche nicht zeigen, WAS
    weggefallen ist — und müsste die Regel nachbauen, um es zu erklären. Regeln
    gehören in die Engine.

    Weggelassene Beiträge bleiben als `applied: false` in der Liste stehen. Das
    ist genau die Darstellung, die die Aufschlüsselung ohnehin kennt
    („durchgestrichen, wirkt nicht hier").
  */
  const NOT_TOUCH = new Set(["armor", "shield", "natural", "enhancement"]);
  const touch = withoutContributions(acTotal, (c) => NOT_TOUCH.has(c.bonusType));
  // Auf dem falschen Fuß: ohne DEX-BONUS (ein Malus bleibt!) und ohne Dodge.
  const flatFooted = withoutContributions(
    acTotal,
    (c) => (c === stackedDex && c.value > 0) || c.bonusType === "dodge",
  );

  // --- Initiative, Rettungswürfe, Ringkampf --------------------------------
  const init = stackPaths(buckets, ["init"], [baseContribution("DEX-Modifikator", dexMod)]);
  const saves = {
    fort: stackPaths(buckets, ["save.fort", "save.all"], [
      baseContribution("Basis", timeline.saves.fort),
      baseContribution("CON-Modifikator", mod("con")),
    ]),
    ref: stackPaths(buckets, ["save.ref", "save.all"], [
      baseContribution("Basis", timeline.saves.ref),
      baseContribution("DEX-Modifikator", dexMod),
    ]),
    will: stackPaths(buckets, ["save.will", "save.all"], [
      baseContribution("Basis", timeline.saves.will),
      baseContribution("WIS-Modifikator", mod("wis")),
    ]),
  };
  const grapple = stackPaths(buckets, ["grapple"], [
    baseContribution("BAB", timeline.bab),
    baseContribution("STR-Modifikator", mod("str")),
    baseContribution("Größe (Ringkampf)", GRAPPLE_SIZE_MODIFIER[size]),
  ]);

  // --- Bewegung -------------------------------------------------------------
  const baseSpeed = race?.data.speedFt ?? 30;
  const speedValue = stackPaths(buckets, ["speed.land"], [
    baseContribution(race ? displayName(race) : "Basis", baseSpeed),
  ]);
  const speedReducedBy =
    armorIsMediumOrHeavy ||
    (!houseRules.ignoreEncumbrance && (loadLevel === "medium" || loadLevel === "heavy"));
  let speedFt: StatValue = speedValue;
  if (speedReducedBy && speedValue.total > 0) {
    const reduced = reducedSpeed(speedValue.total);
    if (reduced < speedValue.total) {
      speedFt = {
        total: reduced,
        contributions: [
          ...speedValue.contributions,
          {
            source: armorIsMediumOrHeavy ? "Mittlere/schwere Rüstung" : "Mittlere/schwere Last",
            bonusType: "untyped",
            value: reduced - speedValue.total,
            applied: true,
            condition: undefined,
          },
        ],
      };
    }
  }
  if (loadLevel === "overloaded" && !houseRules.ignoreEncumbrance) {
    issues.push({
      severity: "warning",
      code: "overloaded",
      message: `Überladen: ${loadLb} lb übersteigt die schwere Last (${capacity.heavyMaxLb} lb).`,
    });
  }

  // --- Trefferpunkte ---------------------------------------------------------
  const conMod = mod("con");
  let hpMax = 0;
  timeline.hpRolls.forEach(({ die, roll }, index) => {
    if (die <= 0) return;
    let rolled: number;
    if (index === 0 && houseRules.maxHpFirstLevel) rolled = die;
    else if (roll === "max") rolled = die;
    else if (roll === "avg") rolled = averageHitDie(die);
    else rolled = roll;
    // RAW: pro TW mindestens 1 TP, egal wie negativ der CON-Modifikator ist.
    hpMax += Math.max(1, rolled + conMod);
  });
  const hpBucket = stackPaths(buckets, ["hp.max"]);
  hpMax += hpBucket.total;
  /**
   * Was die REGELN ergeben — bleibt erhalten, auch wenn ein festes Maximum
   * eingetragen ist. Nur so kann die Oberfläche zeigen, was ein Zurücksetzen
   * kosten würde: beim Fight-Club-Import stehen als Würfe nur Platzhalter, die
   * gerechnete Zahl liegt dort deutlich unter der echten.
   */
  const computedMax = hpMax;
  if (character.hp.overrideMax !== undefined) hpMax = character.hp.overrideMax;
  const hp = {
    max: hpMax,
    computedMax,
    /**
     * Darf negativ werden — in 3.5 ist −1 bis −9 sterbend und −10 tot. Genau
     * diese Zahl braucht der Tisch, deshalb wird hier NICHT auf 0 geklemmt
     * (siehe fightclub.test.ts: ein sterbender Import bleibt sterbend).
     */
    current: hpMax - character.hp.damage,
    nonlethal: character.hp.nonlethal,
    temp: character.hp.temp,
  };

  // --- Angriffe ---------------------------------------------------------------
  const weaponFinesse = flagSet(buckets, "flag:weaponFinesse");
  const attacks: AttackLine[] = [];

  const buildAttackLine = (
    key: string,
    label: string,
    mode: "melee" | "ranged",
    weapon: { entity: ItemEntity; instanceId: string; slot?: EquipSlot } | null,
  ): AttackLine => {
    const weaponData = weapon?.entity.data.weapon;
    /*
      Zweihändig GEFÜHRT, nicht „zweihändige Waffe": ein Langschwert in beiden
      Händen zählt bei Power Attack doppelt und gibt STR×1,5. Das steht im
      Ausrüstungs-Slot, nicht in den Waffendaten.
    */
    const wieldedInTwoHands = weapon?.slot === "bothHands" || weaponData?.handedness === "two";
    const isLight = weaponData?.handedness === "light";
    const useDex = mode === "ranged" || (weaponFinesse && isLight);
    /*
      Ein Objekt für die Führung dieser Waffe, drei Regeln dahinter: der
      Schadensbonus von Power Attack, der Zweiwaffen-Malus auf den Angriff und der
      halbe Stärkeschaden der zweiten Hand. Eine Wahrheit über die Hand, nicht
      drei nebeneinander.
    */
    const hand: Hand =
      weapon?.slot === "mainHand"
        ? "main"
        : weapon?.slot === "offHand"
          ? "off"
          : weapon?.slot === "bothHands"
            ? "both"
            : "none";
    const wield: WieldContext = {
      handedness: weaponData?.handedness ?? "one",
      hand,
      wieldedInTwoHands,
      naturalOrUnarmed: isNaturalOrUnarmed(weapon?.entity),
    };
    const abilityLabel = useDex ? "DEX-Modifikator" : "STR-Modifikator";
    const abilityValue = useDex ? dexMod : mod("str");

    const base: Contribution[] = [
      baseContribution("BAB", timeline.bab),
      { source: abilityLabel, bonusType: "untyped", value: abilityValue, applied: true, condition: undefined },
    ];
    if (sizeModifier !== 0) {
      base.push({ source: "Größe", bonusType: "size", value: sizeModifier, applied: true, condition: undefined });
    }
    const paths: StatPath[] =
      mode === "melee" ? ["attack.melee", "attack.all"] : ["attack.ranged", "attack.all"];
    // Power Attack und Kampfgeschick gelten nur im Nahkampf — vorher fiel der
    // Langbogen von +8/+3 auf +4/−1, sobald Power Attack eingestellt war.
    const contributions = [
      ...base,
      ...combat.attack,
      ...(mode === "melee" ? combat.meleeAttack : []),
      // Der Zweiwaffen-Malus ist für Haupthand und zweite Hand VERSCHIEDEN hoch
      // — deshalb hier je Waffe und nicht über die globalen Listen darüber.
      ...combat.weaponAttack(wield),
    ];
    for (const path of paths) {
      for (const effect of buckets.get(path) ?? []) contributions.push(toContribution(effect));
    }
    if (weapon) {
      for (const effect of itemScoped.get(weapon.instanceId) ?? []) {
        if (effect.target === "attack.self") contributions.push(toContribution(effect));
      }
      // Weapon Focus & Co. — nur mit der gewählten Waffe.
      contributions.push(...chosenItemContributions(weapon, "attack.self"));
    }
    const attack = stackContributions(contributions);
    /*
      Wie viele Angriffe diese Zeile hergibt.

      Normalfall: die absteigende Reihe aus dem Grundangriffsbonus (+6 → +6/+1).
      Die ZWEITE HAND folgt dieser Reihe aber nicht — sie bekommt genau die
      Angriffe, die die Zweiwaffen-Talente gewähren: einen, mit Improved zwei,
      mit Greater drei. Vorher zeigte der Bogen ihr die volle Reihe und damit bei
      GAB +6 einen Angriff zu viel.
    */
    const offHandSteps = hand === "off" ? combat.offHandSteps : [];
    const bonuses =
      offHandSteps.length > 0
        ? offHandSteps.map((step) => attack.total + step)
        : iterativeAttacks(timeline.bab).map((b) => b + (attack.total - timeline.bab));

    // Schaden.
    let damageText = "—";
    const damageContributions: Contribution[] = [];
    const notes: string[] = [];
    if (weaponData) {
      /*
        Stärkeschaden. Vorher stand hier ein Satz: „Fernkampf null, sonst voll",
        und damit machte ein Wurfspeer bei STR 18 denselben Schaden wie bei STR 8.
        Der Bogen schrieb sogar dazu „außer Wurfwaffen/Kompositbögen" — er kannte
        die Ausnahme also und wandte sie nicht an.

        Jetzt entscheidet die WAFFE (`weapon.strDamage`, aus den Packs):

          full         Wurfwaffen und die Schleuder — Bonus und Malus
          penaltyOnly  Bögen — nur der Malus, kein Bonus
          none         Armbrüste

        Ohne Angabe: Fernkampf `none`, Nahkampf voll (zweihändig ×1,5).
      */
      const strMod = mod("str");
      const ranged = mode === "ranged";
      const rule = weaponData.strDamage ?? (ranged ? "none" : "full");
      const strFactor =
        rule === "none"
          ? 0
          : rule === "penaltyOnly"
            ? strMod < 0
              ? 1
              : 0
            : ranged || !wieldedInTwoHands
              ? 1
              : 1.5;
      const strDamage = Math.floor(strMod * strFactor);
      if (strFactor > 0 && strDamage !== 0) {
        damageContributions.push({
          source: strFactor === 1.5 ? "STR-Modifikator (×1,5 zweihändig)" : "STR-Modifikator",
          bonusType: "untyped",
          value: strDamage,
          applied: true,
          condition: undefined,
        });
      }
      damageContributions.push(...combat.meleeDamage(wield));
      if (ranged) {
        notes.push(
          rule === "full"
            ? "Wurfwaffe: der STR-Modifikator zählt auf den Schaden."
            : rule === "penaltyOnly"
              ? "Bogen: ein STR-MALUS zählt auf den Schaden, ein Bonus nicht (nur beim Kompositbogen)."
              : "Kein STR-Modifikator auf den Schaden.",
        );
      }
      if (offHandSteps.length > 0) {
        notes.push(
          offHandSteps.length === 1
            ? "Zweite Hand: ein zusätzlicher Angriff bei voller Attacke."
            : `Zweite Hand: ${offHandSteps.length} Angriffe bei voller Attacke (aus deinen Zweiwaffen-Talenten).`,
        );
      }
      /*
        Der Malus gilt nur, WEIL man mit beiden Waffen angreift. Ein einzelner
        Angriff mit der Haupthand hat ihn nicht — und der Erklärsatz zur
        Angriffsfolge behauptet genau das Gegenteil („ein einzelner Angriff nutzt
        immer +5"). Die Zahl, die am Tisch fällt, hängt daran; also steht es dran.
      */
      if (combat.weaponAttack(wield).length > 0) {
        notes.push(
          "Diese Zahl gilt für die volle Attacke mit beiden Waffen. Ein einzelner Angriff nur mit dieser Waffe hat den Malus nicht.",
        );
      }
      const damagePaths: StatPath[] =
        mode === "melee" ? ["damage.melee", "damage.all"] : ["damage.ranged", "damage.all"];
      for (const path of damagePaths) {
        for (const effect of buckets.get(path) ?? []) damageContributions.push(toContribution(effect));
      }
      if (weapon) {
        for (const effect of itemScoped.get(weapon.instanceId) ?? []) {
          if (effect.target === "damage.self") damageContributions.push(toContribution(effect));
        }
        // Weapon Specialization & Co. — nur mit der gewählten Waffe.
        damageContributions.push(...chosenItemContributions(weapon, "damage.self"));
      }
    }
    const damageBonus = stackContributions(damageContributions);
    if (weaponData) {
      const bonus = damageBonus.total;
      damageText = bonus === 0 ? weaponData.damage : `${weaponData.damage}${bonus > 0 ? "+" : ""}${bonus}`;
    }
    /*
      Die Sammelzeile bekommt KEINEN Malus (sie gehört zu keiner Waffenkombination
      — genau der Fehler, der bei Power Attack schon einmal den Langbogen
      mitgerissen hat), aber einen Satz dazu. Ohne ihn steht am Tisch oben +8 und
      beim Kurzschwert +5, und die Antwort ist nirgends zu sehen.
    */
    if (weapon === null && mode === "melee" && twoWeaponSetup !== null && character.combatOptions.twoWeaponFighting) {
      notes.push("Zweiwaffenkampf ist an — die Mali stehen an den Waffenzeilen, nicht hier.");
    }

    return {
      key,
      label,
      bonuses,
      attack,
      damageText,
      damageBonus,
      critical: weaponData ? `${weaponData.critRange}/${weaponData.critMult}` : "—",
      notes,
      ...(weapon?.slot === undefined ? {} : { slot: weapon.slot }),
    };
  };

  attacks.push(buildAttackLine("melee", "Nahkampf", "melee", null));
  attacks.push(buildAttackLine("ranged", "Fernkampf", "ranged", null));
  for (const weapon of equippedWeapons) {
    const isRanged = weapon.entity.data.weapon?.handedness === "ranged";
    attacks.push(
      buildAttackLine(`weapon:${weapon.instanceId}`, weapon.label, isRanged ? "ranged" : "melee", weapon),
    );
  }

  // --- Fertigkeiten -----------------------------------------------------------
  const classSkillIds = new Set<string>();
  for (const cls of resolved.classes.values()) {
    for (const id of cls.data.classSkillIds) classSkillIds.add(id);
  }
  /**
   * Eine Zeile je Fertigkeit — bei Teilgebiets-Fertigkeiten zusätzlich eine je
   * angelegtem Teilgebiet. Die Grundzeile bleibt stehen: bei Craft/Perform ist
   * sie der untrainierte Wurf, bei Knowledge/Profession der Anker fürs Anlegen.
   */
  type SkillTarget = { id: string; entity: SkillEntity; subtype?: string };
  const skillTargets: SkillTarget[] = [];
  for (const target of resolved.skills) {
    skillTargets.push(target);
    if (!target.entity.data.subtyped) continue;
    for (const entry of character.skillSubtypes) {
      if (entry.skillId === target.id && entry.subtype !== "") {
        skillTargets.push({ ...target, subtype: entry.subtype });
      }
    }
  }

  const skills: SkillLine[] = skillTargets.map(({ id, entity, subtype }) => {
    const data = entity.data;
    const key = skillKey(id, subtype);
    const ranks = character.skillRanks[key] ?? 0;
    const isClassSkill = classSkillIds.has(id);
    const abilityMod = data.keyAbility ? mod(data.keyAbility) : 0;

    const contributions: Contribution[] = [];
    if (ranks > 0) contributions.push(baseContribution("Ränge", ranks));
    if (data.keyAbility) {
      contributions.push(
        baseContribution(`${data.keyAbility.toUpperCase()}-Modifikator`, abilityMod),
      );
    }
    // Synergien: +2 aus jedem anderen Skill mit ≥5 Rängen, der auf diesen zeigt.
    // Teilgebiete zählen einzeln — 5 Ränge Knowledge (arcana) helfen Spellcraft,
    // 5 Ränge Knowledge (religion) nicht.
    for (const { id: otherId, entity: other } of resolved.skills) {
      for (const synergy of other.data.synergies) {
        if (synergy.toSkillId !== id) continue;
        if (synergy.toSubtype !== undefined && synergy.toSubtype !== subtype) continue;
        const sourceKey = skillKey(otherId, synergy.fromSubtype);
        if (sourceKey === key) continue;
        if ((character.skillRanks[sourceKey] ?? 0) < 5) continue;
        contributions.push({
          source: `Synergie: ${skillDisplayName(other, synergy.fromSubtype)}`,
          bonusType: "untyped",
          value: synergy.bonus,
          applied: true,
          condition: synergy.condition,
        });
      }
    }
    if (data.acpApplies && acp < 0) {
      contributions.push({
        source: data.acpDouble ? "Rüstungsmalus (×2)" : "Rüstungsmalus",
        bonusType: "untyped",
        value: data.acpDouble ? acp * 2 : acp,
        applied: true,
        condition: undefined,
      });
    }
    // `skill:<id>` gilt für die ganze Fertigkeit, `skill:<id>#<teilgebiet>` nur
    // für dieses eine (Skill Focus (Knowledge (arcana))).
    for (const effect of buckets.get(`skill:${id}`) ?? []) contributions.push(toContribution(effect));
    if (subtype !== undefined) {
      for (const effect of buckets.get(`skill:${key}`) ?? []) {
        contributions.push(toContribution(effect));
      }
    }
    for (const effect of buckets.get("skill.all") ?? []) contributions.push(toContribution(effect));

    const total = stackContributions(contributions);
    return {
      skillId: id,
      key,
      ...(subtype !== undefined ? { subtype } : {}),
      subtyped: data.subtyped,
      name: skillDisplayName(entity, subtype),
      usable: !(data.trainedOnly && ranks === 0),
      total,
      ranks,
      keyAbility: data.keyAbility,
      isClassSkill,
      maxRanks: maxRanks(totalLevel, isClassSkill),
    };
  });

  // --- Fertigkeitspunkte (vereinfachend mit finalem INT-Modifikator) -----------
  const intMod = mod("int");
  const extraPointsPerLevel = stackPaths(buckets, ["skills.pointsPerLevel"]).total;
  let skillPointsAvailable = 0;
  character.levels.forEach((level, index) => {
    const cls = resolved.classes.get(level.classId);
    if (!cls) return;
    const perLevel = Math.max(1, cls.data.skillPointsPerLevel + intMod + extraPointsPerLevel);
    skillPointsAvailable += index === 0 ? perLevel * 4 : perLevel;
  });
  let skillPointsSpent = 0;
  for (const [key, ranks] of Object.entries(character.skillRanks)) {
    if (ranks <= 0) continue;
    // Klassenfertigkeit gilt für die ganze Fertigkeit, nicht je Teilgebiet.
    const { skillId } = parseSkillKey(key);
    skillPointsSpent += classSkillIds.has(skillId) ? ranks : ranks * 2;
  }

  // --- Talent-Slots -------------------------------------------------------------
  const featSlots = {
    available: baseFeatSlots(totalLevel) + stackPaths(buckets, ["feats.slots"]).total,
    used: character.feats.length,
  };

  /**
   * Zusätzliche Einsätze pro Tag aus Talenten (Extra Turning: viermal mehr
   * vertreiben, mehrfach nehmbar). Wird hier gezählt, weil hier die Talent-
   * Entities schon aufgelöst sind — die Zähler-Vorschläge lesen dann nur noch
   * Zahlen und kennen keine Talent-Namen.
   */
  const featIds = resolved.feats.map((feat) => feat.featId);
  const extraUses: Record<string, number> = {};
  for (const feat of resolved.feats) {
    if (feat.entity?.kind !== "feat") continue;
    /**
     * Nicht auf Schema-Standardwerte verlassen: das Kompendium kommt aus der
     * Datenbank des Geräts, und Einträge, die eine ÄLTERE App-Version dort
     * abgelegt hat, kennen ein neu ergänztes Feld noch nicht. Genau daran ist
     * die App beim ersten Start nach diesem Update abgestürzt.
     */
    for (const bonus of feat.entity.data?.extraUses ?? []) {
      extraUses[bonus.mechanic] = (extraUses[bonus.mechanic] ?? 0) + bonus.perInstance;
    }
  }

  // --- Zauber ---------------------------------------------------------------------
  const spellcasting: SpellcastingBlock[] = [];
  for (const [classId, cls] of resolved.classes) {
    const casting = cls.data.spellcasting;
    if (!casting) continue;
    const classLevel = resolved.classLevelCounts.get(classId) ?? 0;
    const row = timeline.currentRow.get(classId);
    if (!row?.spellsPerDay) continue;

    const abilityMod = mod(casting.ability);
    const casterLevel = stackPaths(buckets, ["cl", `cl:${classId}`], [
      baseContribution(`${cls.name}-Stufe`, classLevel),
    ]);
    const dcBase = 10 + abilityMod + stackPaths(buckets, ["dc.spells"]).total;

    const usedSlots = character.spellState[classId]?.usedSlots ?? [];
    /*
      Der Domänenplatz — der Grund, warum in seinem Bogen bei Grad 1 „3" stand,
      wo Fight Club „4" zeigt.

      Er gilt ab Grad 1 (Grad 0 nie, das sind Kantrips) und nur, wo es überhaupt
      Plätze gibt: `base === null` heißt „diesen Grad kann die Klasse noch
      nicht", und ein Domänenplatz auf einem Grad ohne Plätze wäre ein Zauber aus
      dem Nichts. Genau denselben Vorbehalt hat schon der Bonus aus dem Attribut.
    */
    const domainSlot = casting.domains?.bonusSlot === true ? 1 : 0;
    const slots: SlotInfo[] = row.spellsPerDay.map((base, level) => {
      const usable = base !== null && level > 0;
      const bonus = !usable || !casting.bonusSlots ? 0 : bonusSpells(abilityMod, level);
      const domain = usable ? domainSlot : 0;
      return {
        level,
        base,
        bonus,
        domain,
        total: base === null ? null : base + bonus + domain,
        used: usedSlots[level] ?? 0,
      };
    });

    spellcasting.push({
      classId,
      className: displayName(cls),
      model: casting.model,
      ability: casting.ability,
      abilityMod,
      casterLevel,
      dcBase,
      slots,
      spellsKnown: row.spellsKnown,
      spellListId: casting.spellListId,
      usesSpellbook: casting.spellbook,
      domainPick: casting.domains?.pick ?? 0,
      domains: resolved.domains
        .filter((entry) => entry.classId === classId)
        .map((entry) => ({
          spellListId: entry.spellListId,
          name: entry.entity?.name ?? entry.spellListId,
        })),
    });
  }

  // --- Features (für Bogen-Anzeige inkl. Toggles) -----------------------------------
  const toggled = new Set(character.toggledEffectKeys);
  const features: FeatureLine[] = timeline.features.map((f) => {
    const toggleKeys = f.effects
      .map((_, i) => `${f.featureKey}.${i}`)
      .filter((_, i) => f.effects[i]?.activation === "toggle");
    return {
      key: f.featureKey,
      classId: f.classId,
      className: f.className,
      level: f.level,
      name: f.name,
      description: f.description,
      toggleable: toggleKeys.length > 0,
      active: toggleKeys.some((k) => toggled.has(k)),
    };
  });

  const classLevels = [...resolved.classes.entries()].map(([classId, cls]) => ({
    classId,
    className: displayName(cls),
    level: resolved.classLevelCounts.get(classId) ?? 0,
  }));

  return {
    abilities,
    size,
    sizeModifier,
    totalLevel,
    ecl: totalLevel + (race?.data.la ?? 0),
    classLevels,
    hp,
    ac: { total: acTotal, touch, flatFooted },
    init,
    speedFt,
    bab: timeline.bab,
    saves,
    grapple,
    attacks,
    skills,
    skillPoints: { available: skillPointsAvailable, spent: skillPointsSpent },
    featSlots,
    featIds,
    extraUses,
    spellcasting,
    encumbrance,
    twoWeaponPossible: twoWeaponSetup !== null,
    xp: {
      current: character.xp,
      nextLevelAt: totalLevel >= 20 ? null : xpForLevel(totalLevel + 1),
    },
    features,
    issues,
  };
}
