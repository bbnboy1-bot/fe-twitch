import type tmi from "tmi.js";
import { describe, expect, it } from "vitest";

import type { Scheduler, Timer } from "@/features/encounters/director";
import { ENCOUNTER } from "@/features/encounters/rules";
import { BOSSES } from "@/features/units/roster";

import { type AttackInput, type GameStore, PokemonGame } from "./game";

/** Manual clock: timers fire only when tests call `fire`. */
function createClock() {
  const pending: Array<{ at: number; fn: () => void; cancelled: boolean }> = [];
  let now = 1_000_000;
  const scheduler: Scheduler = (ms, fn) => {
    const entry = { at: now + ms, fn, cancelled: false };
    pending.push(entry);
    const timer: Timer = { cancel: () => void (entry.cancelled = true) };
    return timer;
  };
  const advance = async (ms: number) => {
    now += ms;
    for (const e of [...pending].sort((a, b) => a.at - b.at)) {
      if (!e.cancelled && e.at <= now) {
        pending.splice(pending.indexOf(e), 1);
        e.fn();
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  };
  return { scheduler, advance, now: () => now, pending };
}

function createChatClient() {
  const messages: Array<{ channel: string; message: string }> = [];
  const say = async (channel: string, message: string) => {
    messages.push({ channel, message });
  };
  const client = { say } as unknown as tmi.Client;
  return { client, messages, say };
}

type StoreOverrides = Partial<GameStore>;

/** Fake store that mirrors enemy HP like the DB would. */
function createStore(overrides: StoreOverrides = {}) {
  const state = { health: 0, maxHealth: 0, poke: "", kind: "lull" };
  const gold = new Map<string, number>();
  const attacks: AttackInput[] = [];
  const spawns: Array<{ poke: string; maxHealth: number; kind: string }> = [];
  const store: GameStore = {
    getUserUnitIds: async () => [],
    earnGold: async ({ user, amount }) => {
      gold.set(user, (gold.get(user) ?? 0) + amount);
      return gold.get(user) ?? 0;
    },
    getGold: async ({ user }) => gold.get(user) ?? 0,
    buyWeapon: async () => ({ ok: false, gold: 0 }),
    useEquippedWeapon: async () => null,
    useStaff: async () => null,
    spawnEncounter: async (input) => {
      Object.assign(state, { health: input.maxHealth, maxHealth: input.maxHealth, poke: input.poke, kind: input.kind });
      spawns.push({ poke: input.poke, maxHealth: input.maxHealth, kind: input.kind });
    },
    logBattle: async () => undefined,
    endEncounter: async () => {
      state.kind = "lull";
      state.health = 0;
    },
    attack: async (input) => {
      attacks.push(input);
      if (state.kind === "lull") return { outcome: "none" };
      state.health -= input.damage;
      if (state.health > 0) {
        return { outcome: "hit", damage: input.damage, health: state.health, maxHealth: state.maxHealth, poke: state.poke, kind: state.kind };
      }
      const poke = state.poke;
      state.kind = "lull";
      return { outcome: "caught", damage: input.damage, poke, kind: "foe", maxHealth: state.maxHealth, lastCatchPoke: poke, lastCatchPlayer: input.username };
    },
    claimWelcomePack: async () => ({ granted: false }),
    getStatus: async () => (state.kind === "lull" ? null : { ...state }),
    getLastCatch: async () => null,
    ...overrides,
  };
  return { store, state, gold, attacks, spawns };
}

const viewer = { twitchId: "1234", username: "viewer" };

/** Cycles through fixed rolls so tests can script crit/hit outcomes. */
function sequence(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

function createGame(opts: { store?: StoreOverrides; unit?: string; rng?: () => number; roll?: number } = {}) {
  const clock = createClock();
  const chat = createChatClient();
  const fake = createStore(opts.store);
  const game = new PokemonGame(fake.store, "https://fe-twitch.vercel.app", {
    getRandomPokemon: async () => opts.unit ?? "bram",
    rollDamage: () => opts.roll ?? 9,
    rng: opts.rng ?? (() => 0.99), // no crits, no counter hits by default
    now: clock.now,
    scheduler: clock.scheduler,
    say: chat.say,
    pickBoss: () => BOSSES[0],
  });
  return { game, clock, ...chat, ...fake };
}

describe("PokemonGame encounters", () => {
  it("announces the first foe with stat-scaled HP when a channel starts", async () => {
    const { game, messages, spawns } = createGame();
    await game.initialize("streamer");
    expect(spawns).toEqual([{ poke: "bram", maxHealth: 48, kind: "foe" }]); // 24 hp × 2 (common)
    expect(messages[0].message).toContain("Bram the Steadfast [common] takes the field! 48 HP");
  });

  it("hits silently, pays 1g per hit, and announces the recruit with a lull afterwards", async () => {
    const { game, client, messages, attacks, gold, clock, spawns } = createGame();
    await game.initialize("streamer");
    messages.length = 0;

    for (let i = 0; i < 5; i++) await game.handle("attack", client, "streamer", viewer);
    expect(attacks).toHaveLength(5);
    expect(messages).toEqual([]); // 45 damage dealt, nothing said
    await game.handle("attack", client, "streamer", viewer); // 54 > 48 → recruit
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain("@viewer bested and recruited Bram the Steadfast");
    expect(gold.get("viewer")).toBe(6 + 25);

    // Field is quiet during the lull, then the next foe arrives.
    messages.length = 0;
    await game.handle("attack", client, "streamer", viewer);
    expect(messages[0].message).toContain("field is quiet");
    await clock.advance(ENCOUNTER.lullMs + 1);
    expect(spawns).toHaveLength(2);
    expect(messages.at(-1)?.message).toContain("takes the field");
  });

  it("uses the champion for bonus damage and lets the foe counterattack and rout it", async () => {
    // Champion: Tamsin (sword, atk 5, skl 7) vs Bram (lance, lck 3). Sword loses to lance → -3, +1 from atk/3 → 7 dmg.
    const { game, client, messages } = createGame({
      store: { getUserUnitIds: async () => ["tamsin"] },
      rng: sequence([0.5, 0, 0.5]), // per attack: player crit roll (miss), enemy hit (lands), enemy crit (miss)
    });
    await game.initialize("streamer");
    messages.length = 0;
    await game.handle("attack", client, "streamer", viewer);
    expect(messages).toEqual([]); // plain hits are silent
    // Bram counters: atk 7 - def 3 + 1 (triangle) = 5, no crit (skl 4 - lck 5 < 0) → Tamsin 18 → 13.
    await game.handle("status", client, "streamer", viewer);
    expect(messages.at(-1)?.message).toContain("Your Tamsin: 13/18 HP");

    for (let i = 0; i < 3; i++) await game.handle("attack", client, "streamer", viewer);
    expect(messages.some((m) => m.message.includes("Tamsin is routed"))).toBe(true);
    messages.length = 0;
    await game.handle("attack", client, "streamer", viewer);
    expect(messages[0].message).toContain("your champion is routed");
    await game.handle("heal", client, "streamer", viewer);
    expect(messages[1].message).toContain("need a heal staff");
  });

  it("heals a routed champion with a staff", async () => {
    const { game, client, messages } = createGame({
      store: { getUserUnitIds: async () => ["tamsin"], useStaff: async () => ({ kind: "staff", uses: 29 }) },
      rng: sequence([0.5, 0, 0.5]),
    });
    await game.initialize("streamer");
    for (let i = 0; i < 4; i++) await game.handle("attack", client, "streamer", viewer);
    await game.handle("heal", client, "streamer", viewer);
    expect(messages.at(-1)?.message).toContain("Tamsin is restored to 18 HP (29 staff uses left)");
    messages.length = 0;
    await game.handle("attack", client, "streamer", viewer);
    expect(messages.some((m) => m.message.includes("champion is routed!"))).toBe(false);
  });

  it("raids a random fighter on the raid timer, never lurkers", async () => {
    const { game, client, messages, clock } = createGame({
      store: { getUserUnitIds: async () => ["tamsin"] },
      rng: () => 0,
    });
    await game.initialize("streamer");
    await clock.advance(ENCOUNTER.raidMaxMs + 1);
    expect(messages.some((m) => m.message.includes("charges"))).toBe(false); // nobody has fought yet
    await game.handle("attack", client, "streamer", viewer);
    messages.length = 0;
    await clock.advance(ENCOUNTER.raidMaxMs + 1);
    expect(messages[0].message).toMatch(/Bram (charges|CRITS) @viewer's Tamsin for \d+!/);
  });

  it("only mods can summon a boss; boss defeat splits gold and recruits the boss for the finisher", async () => {
    const { game, client, messages, gold, spawns, attacks } = createGame({ roll: 14 });
    await game.initialize("streamer");
    await game.handle("boss", client, "streamer", viewer);
    expect(messages.at(-1)?.message).toContain("only mods can summon a boss");

    const mod = { twitchId: "1", username: "hudson", isMod: true };
    await game.handle("boss", client, "streamer", mod);
    expect(spawns.at(-1)).toEqual({ poke: "warlord-ashgar", maxHealth: 220, kind: "boss" });
    expect(messages.at(-1)?.message).toContain("💀 BOSS: Ashgar the Ironhand");
    expect(messages.at(-1)?.message).toContain("Bram flees");

    // 14 dmg per hit, 220 HP: hudson 8 hits (112), viewer finishes with 8 more (112) → viewer 220.
    for (let i = 0; i < 8; i++) await game.handle("attack", client, "streamer", mod);
    for (let i = 0; i < 7; i++) await game.handle("attack", client, "streamer", viewer);
    expect(attacks.at(-1)?.damage).toBe(14);
    messages.length = 0;
    await game.handle("attack", client, "streamer", viewer);
    expect(messages[0].message).toContain("Ashgar the Ironhand falls! @viewer lands the final blow and recruits them!");
    // Pool 200 split 112/112 → 100 each; viewer +40 finisher. Plus 1g/hit and 25g recruit.
    expect(gold.get("viewer")).toBe(8 + 25 + 100 + 40);
    expect(gold.get("hudson")).toBe(8 + 100);
  });

  it("lets a boss escape after its timer with consolation gold", async () => {
    const { game, client, messages, gold, clock, state } = createGame();
    await game.initialize("streamer");
    const mod = { twitchId: "1", username: "hudson", isMod: true };
    await game.handle("boss", client, "streamer", mod);
    await game.handle("attack", client, "streamer", viewer);
    messages.length = 0;
    await clock.advance(ENCOUNTER.bossDurationMs + 1);
    expect(messages[0].message).toContain("Ashgar the Ironhand escapes with 211/220 HP left! 1 fighters each take 10g");
    expect(gold.get("viewer")).toBe(1 + ENCOUNTER.bossEscapeGold);
    expect(state.kind).toBe("lull");
    await clock.advance(ENCOUNTER.lullMs + 1);
    expect(messages.at(-1)?.message).toContain("takes the field");
  });

  it("spawns a boss on the boss clock", async () => {
    const { game, messages, clock } = createGame();
    await game.initialize("streamer");
    await clock.advance(ENCOUNTER.bossMaxMs + 1);
    expect(messages.some((m) => m.message.includes("💀 BOSS"))).toBe(true);
  });

  it("claims a welcome pack once using the stable Twitch identity", async () => {
    const claims: unknown[] = [];
    const { game, client, messages } = createGame({
      store: {
        claimWelcomePack: async (input) => {
          claims.push(input);
          return { granted: true, poke: "tamsin" };
        },
      },
      unit: "tamsin",
    });
    await game.handle("welcome-pack", client, "streamer", viewer);
    expect(claims).toEqual([{ channel: "streamer", poke: "tamsin", twitchId: "1234", username: "viewer" }]);
    expect(messages.at(-1)?.message).toBe("@viewer recruited Tamsin Quickblade [common] into their army!");
  });
});
