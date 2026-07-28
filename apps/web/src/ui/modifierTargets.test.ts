import { describe, expect, it } from "vitest";
import { MODIFIER_TARGETS, describeModifier } from "./modifierTargets.js";

const SKILLS: Record<string, string> = {
  "srd:skill:listen": "Listen",
  "srd:skill:knowledge": "Knowledge",
};
const name = (id: string) => SKILLS[id];

describe("describeModifier", () => {
  it(`nennt Ziel und Bonusart zusammen, wie Fight Club es zeigt`, () => {
    expect(describeModifier("ac", "dodge", name)).toBe("RK: Ausweichen");
    expect(describeModifier("ac", "natural", name)).toBe("RK: natürliche Rüstung");
    expect(describeModifier("init", "untyped", name)).toBe("Initiative");
  });

  it(`löst Fertigkeits-Ziele auf — MIT den Doppelpunkten in der Kennung`, () => {
    /*
      Der Fehler, der am Bogen zu sehen war: ein split(":") auf
      „skill:srd:skill:listen" liefert „srd", und bei Alertness stand deshalb
      „srd +2 · srd +2" statt „Listen +2 · Spot +2".
    */
    expect(describeModifier("skill:srd:skill:listen", "untyped", name)).toBe("Listen");
  });

  it(`hängt das Teilgebiet an`, () => {
    expect(describeModifier("skill:srd:skill:knowledge#arcana", "untyped", name)).toBe(
      "Knowledge (arcana)",
    );
  });

  it(`erfindet keine Beschriftung für Unbekanntes`, () => {
    // Lieber den rohen Pfad zeigen als eine Bezeichnung, die nicht stimmt.
    expect(describeModifier("ac", "profane", name)).toBe("RK (ohne Art) (profane)");
    expect(describeModifier("flag:weaponFinesse", "untyped", name)).toBe(
      "flag:weaponFinesse (untyped)",
    );
  });

  it(`kommt ohne Namensauflösung zurecht`, () => {
    expect(describeModifier("skill:srd:skill:listen", "untyped")).toBe("srd:skill:listen");
  });
});

describe("MODIFIER_TARGETS", () => {
  it(`hat eindeutige Schlüssel`, () => {
    const keys = MODIFIER_TARGETS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it(`bietet nichts an, was die Engine nicht rechnet`, () => {
    // „Touch AC", „Flat-Footed AC" und „Armor Penalty" gibt es bei Fight Club,
    // hier aber nicht als Effekt-Ziel — ein Knopf dafür wäre ein Knopf, der
    // nichts tut.
    const paths = MODIFIER_TARGETS.map((t) => t.path);
    expect(paths).not.toContain("ac.touch");
    expect(paths).not.toContain("ac.flatFooted");
    expect(paths).not.toContain("acp");
    // Und nichts, was zwar ein gültiger Pfad ist, aber keinen Verbraucher hat.
    expect(paths).not.toContain("sr");
  });
});
