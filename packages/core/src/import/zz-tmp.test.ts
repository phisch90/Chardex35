import { describe, it, expect } from "vitest";
import { parseFightClubXml } from "/home/user/test/packages/core/src/import/fightclub.js";

describe("rankless", () => {
  it("drops", () => {
    const xml = `<characters version="3"><pc><name>X</name><raceClass>Human Fighter 1</raceClass><skills>Listen +11, Spot +9, Climb (4) +6</skills></pc></characters>`;
    const r = parseFightClubXml(xml);
    console.log(JSON.stringify(r.pcs[0]!.skills), JSON.stringify(r.issues));
    const xml2 = `<characters version="3"><npc><name>Wolf</name><raceClass>Wolf</raceClass><skills>Hide +2, Listen +5, Move Silently +3, Spot +5, Survival +1</skills></npc></characters>`;
    const r2 = parseFightClubXml(xml2);
    console.log("npc:", JSON.stringify(r2.pcs[0]!.skills), JSON.stringify(r2.issues));
  });
});
