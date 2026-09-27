import { describe, expect, it } from "vitest";

import { DEFAULT_TIMING, normalizeTiming, timingFromRow } from "./timing";

describe("encounter timing", () => {
  it("defaults to bosses every 30-45 min and creatures every 5-10 min", () => {
    expect(normalizeTiming(null)).toEqual(DEFAULT_TIMING);
    expect(timingFromRow(null)).toEqual(DEFAULT_TIMING);
  });

  it("clamps to the limits, swaps a reversed range, and reads form values", () => {
    expect(
      normalizeTiming({ bossMinMinutes: "60", bossMaxMinutes: "20", creaturesEnabled: "on", creatureMinMinutes: 0, creatureMaxMinutes: 999 }),
    ).toEqual({ bossMinMinutes: 20, bossMaxMinutes: 60, creaturesEnabled: true, creatureMinMinutes: 1, creatureMaxMinutes: 60 });
    expect(normalizeTiming({ creaturesEnabled: false }).creaturesEnabled).toBe(false);
    expect(normalizeTiming({ bossMinMinutes: "abc" }).bossMinMinutes).toBe(30);
  });

  it("maps database columns", () => {
    expect(
      timingFromRow({ boss_min_minutes: 15, boss_max_minutes: 20, creatures_enabled: false, creature_min_minutes: 3, creature_max_minutes: 4 }),
    ).toEqual({ bossMinMinutes: 15, bossMaxMinutes: 20, creaturesEnabled: false, creatureMinMinutes: 3, creatureMaxMinutes: 4 });
  });
});
