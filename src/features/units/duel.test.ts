import { describe, expect, it } from "vitest";

import { DuelManager, pickChampion, resolveDuel } from "./duel";
import { getUnitById } from "./roster";

const unit = (id: string) => {
  const u = getUnitById(id);
  if (!u) throw new Error(`missing ${id}`);
  return u;
};

describe("resolveDuel", () => {
  it("produces a winner and loser", () => {
    let seed = 7;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const result = resolveDuel(
      { username: "alice", unit: unit("nyx") },
      { username: "bob", unit: unit("bram") },
      rng,
    );
    expect(["alice", "bob"]).toContain(result.winner);
    expect(result.winner).not.toBe(result.loser);
    expect(result.log.length).toBeGreaterThan(0);
  });

  it("weapon override changes triangle outcomes", () => {
    // bram is a lance sentinel; give alice an axe (loses to lance? no: axe loses to lance!)
    // give alice a lance vs sword duelist colm: lance beats sword.
    const result = resolveDuel(
      { username: "alice", unit: unit("bram"), weapon: "lance" },
      { username: "bob", unit: unit("colm") },
      () => 0, // always hit+crit
    );
    expect(result.log.some((line) => line.includes("(weapon advantage)"))).toBe(true);
  });

  it("staff blessing grants bonus hp", () => {
    const plain = resolveDuel(
      { username: "a", unit: unit("liora") },
      { username: "b", unit: unit("orrick") },
      () => 0.5,
    );
    const blessed = resolveDuel(
      { username: "a", unit: unit("liora"), bonusHp: 8 },
      { username: "b", unit: unit("orrick") },
      () => 0.5,
    );
    // same deterministic rng: blessed run should never end with LESS hp for "a"
    expect(blessed.finalHp["a"]).toBeGreaterThanOrEqual(plain.finalHp["a"]);
  });
});

describe("pickChampion", () => {
  it("prefers rarity, then stat total", () => {
    const champ = pickChampion([unit("bram"), unit("caelen"), unit("nyx")]);
    expect(champ?.id).toBe("caelen");
  });
  it("returns null for empty armies", () => {
    expect(pickChampion([])).toBeNull();
  });
});

describe("DuelManager", () => {
  it("accepts a live challenge exactly once", () => {
    const duels = new DuelManager();
    duels.challenge("chan", "Alice", "Bob");
    expect(duels.accept("chan", "bob")).toBe("alice");
    expect(duels.accept("chan", "bob")).toBeNull();
  });

  it("expires stale challenges", () => {
    const duels = new DuelManager(-1);
    duels.challenge("chan", "alice", "bob");
    expect(duels.accept("chan", "bob")).toBeNull();
  });
});
