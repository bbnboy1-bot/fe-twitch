import { describe, expect, it } from "vitest";

import { BOSSES, getUnitById } from "@/features/units/roster";

import { enemyMaxHp, escapePayouts, rollEnemyStrike, rollPlayerStrike, splitBossGold } from "./rules";

const bram = getUnitById("bram")!;
const caelen = getUnitById("caelen")!;

describe("encounter rules", () => {
  it("scales foe HP by rarity so legendaries are real fights", () => {
    expect(enemyMaxHp(bram)).toBe(48);
    expect(enemyMaxHp(caelen)).toBe(104);
  });

  it("bosses have 200–400 field HP and are resolvable by id", () => {
    for (const boss of BOSSES) {
      expect(boss.maxHp).toBeGreaterThanOrEqual(200);
      expect(boss.maxHp).toBeLessThanOrEqual(400);
      expect(getUnitById(boss.id)).toBe(boss);
    }
  });

  it("player strikes always land, with champion bonus, triangle and crit", () => {
    expect(rollPlayerStrike(9, null, bram, () => 0)).toEqual({ damage: 9, crit: false, triangle: 0 });
    // Tamsin (sword, atk 5, skl 7) vs Bram (lance, lck 3): sword loses to lance → -3; +1 from atk/3 → 7; crit ×2.
    const tamsin = getUnitById("tamsin")!;
    expect(rollPlayerStrike(9, { stats: tamsin.base, weapon: tamsin.weapon }, bram, () => 0)).toEqual({ damage: 14, crit: true, triangle: -1 });
    expect(rollPlayerStrike(9, { stats: tamsin.base, weapon: "axe" }, bram, () => 0.99)).toEqual({ damage: 13, crit: false, triangle: 1 });
  });

  it("enemy strikes use duel math and can double", () => {
    const nyx = getUnitById("nyx")!; // spd 13 vs Bram spd 3 → doubles
    const strike = rollEnemyStrike(nyx, { stats: bram.base, weapon: bram.weapon }, () => 0);
    expect(strike.strikes).toBe(2);
    expect(strike.hit).toBe(true);
  });

  it("splits boss gold by damage with a minimum share and finisher bonus", () => {
    const payouts = splitBossGold(200, new Map([["a", 150], ["b", 49], ["c", 1]]), "b");
    expect(payouts).toEqual([
      { user: "a", gold: 150 },
      { user: "b", gold: 49 + 40 },
      { user: "c", gold: 5 },
    ]);
    expect(escapePayouts(new Map([["a", 1]]))).toEqual([{ user: "a", gold: 10 }]);
  });
});
