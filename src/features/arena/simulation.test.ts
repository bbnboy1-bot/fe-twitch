import { describe, expect, it } from "vitest";

import { ARENA, baseSpriteSize, crowdScale, formationX, laneFor, orderFighters, pickWander, shouldLabel } from "./simulation";

describe("arena simulation", () => {
  it("sizes sprites from the strip height within sane bounds", () => {
    expect(baseSpriteSize(100)).toBe(60);
    expect(baseSpriteSize(20)).toBe(30);
    expect(baseSpriteSize(400)).toBe(120);
    expect(baseSpriteSize(100, 1.5)).toBe(90);
  });

  it("shrinks the crowd only past the comfort limit", () => {
    expect(crowdScale(5)).toBe(1);
    expect(crowdScale(ARENA.crowdComfort)).toBe(1);
    expect(crowdScale(36)).toBeCloseTo(0.667, 2);
    expect(crowdScale(1000)).toBe(ARENA.minCrowdScale);
  });

  it("gives every viewer a stable lane", () => {
    expect(laneFor("hudson")).toBe(laneFor("hudson"));
    expect(laneFor("hudson")).toBeGreaterThanOrEqual(0);
    expect(laneFor("hudson")).toBeLessThan(ARENA.lanes);
  });

  it("wanders inside the field and faces the way it walks", () => {
    let rng = 0.1;
    const step = pickWander(0.5, () => (rng = (rng + 0.37) % 1));
    expect(step.targetX).toBeGreaterThanOrEqual(ARENA.wanderMin);
    expect(step.targetX).toBeLessThanOrEqual(ARENA.wanderMax);
    expect(step.facing).toBe(step.targetX >= 0.5 ? 1 : -1);
    expect(step.durationMs).toBeGreaterThanOrEqual(300);
    expect(step.pauseMs).toBeGreaterThanOrEqual(ARENA.pauseMinMs);
  });

  it("lines fighters up with the front rank nearest the enemy", () => {
    expect(formationX(0, 1, 0.05)).toBe(ARENA.formationMax);
    const xs = [0, 1, 2].map((i) => formationX(i, 3, 0.05));
    expect(xs[0]).toBeGreaterThan(xs[1]);
    expect(xs[1]).toBeGreaterThan(xs[2]);
    // Many fighters still fit inside the formation band.
    expect(formationX(39, 40, 0.05)).toBeGreaterThanOrEqual(ARENA.formationMin - 1e-9);
  });

  it("orders the most recently active fighters first", () => {
    const ordered = orderFighters([{ name: "a" }, { name: "b" }, { name: "c" }], new Map([["b", 9], ["c", 4]]));
    expect(ordered.map((f) => f.name)).toEqual(["b", "c", "a"]);
  });

  it("labels everyone in a small crowd and only fighters or actors in a big one", () => {
    expect(shouldLabel(10, false, false, "all")).toBe(true);
    expect(shouldLabel(40, false, false, "all")).toBe(false);
    expect(shouldLabel(40, true, false, "all")).toBe(true);
    expect(shouldLabel(3, false, false, "fighters")).toBe(false);
    expect(shouldLabel(3, false, true, "none")).toBe(true);
  });
});
