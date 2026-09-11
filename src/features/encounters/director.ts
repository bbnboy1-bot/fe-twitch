import { ENCOUNTER } from "./rules";

export type Timer = { cancel: () => void };
export type Scheduler = (ms: number, fn: () => void) => Timer;

export type DirectorHooks = {
  spawnFoe: (channel: string) => Promise<void>;
  spawnBoss: (channel: string) => Promise<void>;
  raid: (channel: string) => Promise<void>;
  expireBoss: (channel: string) => Promise<void>;
};

const defaultScheduler: Scheduler = (ms, fn) => {
  const handle = setTimeout(fn, ms);
  return { cancel: () => clearTimeout(handle) };
};

type ChannelTimers = { lull?: Timer; raid?: Timer; boss?: Timer; bossExpiry?: Timer };

/**
 * Drives the battlefield clock per channel: lull → foe, periodic raids while an
 * enemy stands, a boss every 30–45 min that lasts 5 min. All async hooks are
 * serialised by the caller (the ChannelQueue) so timer callbacks and chat
 * commands never interleave inside one channel.
 */
export class EncounterDirector {
  private readonly timers = new Map<string, ChannelTimers>();

  constructor(
    private readonly hooks: DirectorHooks,
    private readonly schedule: Scheduler = defaultScheduler,
    private readonly rng: () => number = Math.random,
    private readonly onError: (error: unknown) => void = (e) => console.error("Encounter timer failed:", e),
  ) {}

  private t(channel: string): ChannelTimers {
    let t = this.timers.get(channel);
    if (!t) {
      t = {};
      this.timers.set(channel, t);
    }
    return t;
  }

  private between(min: number, max: number) {
    return min + Math.floor(this.rng() * (max - min));
  }

  private run(fn: () => Promise<void>) {
    return () => void fn().catch(this.onError);
  }

  /** Called when the bot joins a channel: starts the boss clock (caller spawns the first foe). */
  start(channel: string) {
    this.stop(channel);
    this.t(channel);
    this.scheduleBoss(channel);
  }

  stop(channel: string) {
    const t = this.timers.get(channel);
    if (!t) return;
    for (const timer of Object.values(t)) timer?.cancel();
    this.timers.delete(channel);
  }

  /** An enemy is on the field: start raids (and the boss timer if it's a boss). */
  enemySpawned(channel: string, kind: "foe" | "boss") {
    const t = this.t(channel);
    t.lull?.cancel();
    t.lull = undefined;
    this.scheduleRaid(channel);
    if (kind === "boss") {
      t.bossExpiry?.cancel();
      t.bossExpiry = this.schedule(ENCOUNTER.bossDurationMs, this.run(() => this.hooks.expireBoss(channel)));
    }
  }

  /** The field is empty: stop raids, bring the next foe after a breather. */
  fieldCleared(channel: string) {
    const t = this.t(channel);
    t.raid?.cancel();
    t.raid = undefined;
    t.bossExpiry?.cancel();
    t.bossExpiry = undefined;
    t.lull?.cancel();
    t.lull = this.schedule(ENCOUNTER.lullMs, this.run(() => this.hooks.spawnFoe(channel)));
  }

  /** A mod forced a boss (spawned by the caller): restart the boss clock from now. */
  resetBossClock(channel: string) {
    this.scheduleBoss(channel);
  }

  private scheduleRaid(channel: string) {
    const t = this.t(channel);
    t.raid?.cancel();
    t.raid = this.schedule(
      this.between(ENCOUNTER.raidMinMs, ENCOUNTER.raidMaxMs),
      this.run(async () => {
        await this.hooks.raid(channel);
        // Keep raiding while something is on the field; fieldCleared() cancels this chain.
        if (this.timers.has(channel)) this.scheduleRaid(channel);
      }),
    );
  }

  private scheduleBoss(channel: string) {
    const t = this.t(channel);
    t.boss?.cancel();
    t.boss = this.schedule(
      this.between(ENCOUNTER.bossMinMs, ENCOUNTER.bossMaxMs),
      this.run(async () => {
        await this.hooks.spawnBoss(channel);
        if (this.timers.has(channel)) this.scheduleBoss(channel);
      }),
    );
  }
}
