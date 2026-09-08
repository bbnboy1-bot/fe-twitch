import { describe, expect, it } from "vitest";

import { resolveStrike, strikesFor, triangleModifier } from "./model";
import { ROSTER, recruitRandomUnit } from "./roster";

describe("weapon triangle", () => {
  it("follows sword > axe > lance > sword", () => {
    expect(triangleModifier("sword", "axe")).toBe(1);
    expect(triangleModifier("axe", "lance")).toBe(1);
    expect(triangleModifier("lance", "sword")).toBe(1);
    expect(triangleModifier("axe", "sword")).toBe(-1);
    expect(triangleModifier("sword", "sword")).toBe(0);
  });

  it("pits tomes against bows", () => {
    expect(triangleModifier("tome", "bow")).toBe(1);
    expect(triangleModifier("bow", "tome")).toBe(1);
  });
});

describe("combat", () => {
  const swordster = {
    stats: { hp: 20, atk: 8, spd: 8, def: 4, skl: 8, lck: 5 },
    weapon: "sword" as const,
  };
  const axeman = {
    stats: { hp: 24, atk: 9, spd: 4, def: 5, skl: 4, lck: 3 },
    weapon: "axe" as const,
  };

  it("always deals at least 1 damage on hit", () => {
    const tank = {
      stats: { hp: 30, atk: 2, spd: 1, def: 99, skl: 1, lck: 1 },
      weapon: "lance" as const,
    };
    const roll = resolveStrike(swordster, tank, () => 0); // rng 0 => guaranteed hit+crit
    expect(roll.hit).toBe(true);
    expect(roll.damage).toBeGreaterThanOrEqual(1);
  });

  it("triples damage on crit", () => {
    const roll = resolveStrike(swordster, axeman, () => 0);
    expect(roll.crit).toBe(true);
    // base = 8 - 5 + 1 (triangle) = 4, crit x3 = 12
    expect(roll.damage).toBe(12);
  });

  it("misses when rng is unfavourable", () => {
    const roll = resolveStrike(swordster, axeman, () => 0.999999);
    expect(roll.hit).toBe(false);
    expect(roll.damage).toBe(0);
  });

  it("grants a follow-up at 4+ speed advantage", () => {
    expect(strikesFor(swordster.stats, axeman.stats)).toBe(2);
    expect(strikesFor(axeman.stats, swordster.stats)).toBe(1);
  });
});

describe("recruiting", () => {
  it("has unique unit ids", () => {
    const ids = new Set(ROSTER.map((x) => x.id));
    expect(ids.size).toBe(ROSTER.length);
  });

  it("returns a roster unit for any rng value", () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999999]) {
      const unit = recruitRandomUnit(() => r);
      expect(ROSTER).toContain(unit);
    }
  });

  it("legendaries stay rare (~1%)", () => {
    let legendaries = 0;
    let seed = 42;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 20000; i++) {
      if (recruitRandomUnit(rng).rarity === "legendary") legendaries++;
    }
    expect(legendaries / 20000).toBeGreaterThan(0.002);
    expect(legendaries / 20000).toBeLessThan(0.03);
  });
});
