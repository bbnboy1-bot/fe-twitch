import { describe, expect, it } from "vitest";

import { ARENA_EVENT_LIMIT, appendArenaEvent, parseArenaState, unseenArenaEvents, type ArenaEvent } from "./events";

const hit = (id: number): ArenaEvent => ({ id, at: "2026-09-13T00:00:00.000Z", type: "hit", player: "viewer", unitId: "bram", damage: 7, crit: false, enemyHp: 40 });

describe("arena events", () => {
  it("parses a worker snapshot and drops malformed entries", () => {
    const state = parseArenaState({
      v: 1,
      fighters: [{ name: "viewer", unitId: "bram", hp: 10, maxHp: 24, routed: false, damage: 9 }, { nope: true }],
      events: [
        hit(2),
        { id: 1, type: "spawn", enemy: "bram", kind: "boss", maxHp: 48 },
        { id: 3, type: "nonsense" },
        { id: 4, type: "duel", a: { player: "a", unitId: "nyx", maxHp: 22 }, b: { player: "b", unitId: "bram", maxHp: 24 }, strikes: [{ att: "a", hit: true, crit: false, damage: 5, hpLeft: 19 }], winner: "a" },
        { type: "hit" },
      ],
    });
    expect(state.fighters).toHaveLength(1);
    expect(state.events.map((e) => e.id)).toEqual([1, 2, 4]); // sorted, junk dropped
    expect(state.events[0]).toMatchObject({ type: "spawn", kind: "boss" });
    expect(state.events[2]).toMatchObject({ type: "duel", winner: "a" });
  });

  it("returns an empty state for anything that is not an object", () => {
    expect(parseArenaState(null).events).toEqual([]);
    expect(parseArenaState("x").fighters).toEqual([]);
    expect(parseArenaState({}).v).toBe(1);
  });

  it("keeps only the newest events and reports the unseen ones", () => {
    let events: ArenaEvent[] = [];
    for (let i = 1; i <= ARENA_EVENT_LIMIT + 5; i++) events = appendArenaEvent(events, hit(i));
    expect(events).toHaveLength(ARENA_EVENT_LIMIT);
    expect(events[0].id).toBe(6);
    expect(unseenArenaEvents(events, 15).map((e) => e.id)).toEqual([16, 17]);
    expect(unseenArenaEvents(events, 99)).toEqual([]);
  });
});
