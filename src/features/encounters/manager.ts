import type { Unit } from "@/features/units/model";

import type { EncounterKind } from "./rules";

export type Fighter = {
  username: string;
  unitId: string | null;
  hp: number;
  maxHp: number;
  routed: boolean;
  damageDealt: number;
};

export type Encounter = {
  kind: EncounterKind;
  unit: Unit;
  maxHp: number;
  hp: number;
  spawnedAt: number;
  expiresAt: number | null;
  /** Damage per user, used for boss payouts and raid targeting. */
  contributions: Map<string, number>;
  fighters: Map<string, Fighter>;
};

type ChannelState = {
  encounter: Encounter | null;
  /** Users who were routed; cleared each spawn. */
  lastBossAt: number | null;
};

/**
 * In-memory battlefield state per channel: who is on the field, everyone's
 * champion HP, and damage contributions. The DB (active_pokes) mirrors the
 * enemy HP for the overlay; this holds everything the overlay doesn't need.
 * Lost on worker restart, which just means a fresh spawn — acceptable.
 */
export class EncounterManager {
  private readonly channels = new Map<string, ChannelState>();

  private state(channel: string): ChannelState {
    let s = this.channels.get(channel);
    if (!s) {
      s = { encounter: null, lastBossAt: null };
      this.channels.set(channel, s);
    }
    return s;
  }

  current(channel: string): Encounter | null {
    return this.state(channel).encounter;
  }

  spawn(channel: string, kind: EncounterKind, unit: Unit, maxHp: number, now: number, durationMs: number | null): Encounter {
    const encounter: Encounter = {
      kind,
      unit,
      maxHp,
      hp: maxHp,
      spawnedAt: now,
      expiresAt: durationMs ? now + durationMs : null,
      contributions: new Map(),
      fighters: new Map(),
    };
    const s = this.state(channel);
    s.encounter = encounter;
    if (kind === "boss") s.lastBossAt = now;
    return encounter;
  }

  /** Clears the field (defeat, escape). Returns the encounter that ended. */
  end(channel: string): Encounter | null {
    const s = this.state(channel);
    const e = s.encounter;
    s.encounter = null;
    return e;
  }

  isExpired(channel: string, now: number): boolean {
    const e = this.current(channel);
    return Boolean(e && e.expiresAt !== null && now >= e.expiresAt);
  }

  /** Register (or fetch) a viewer's fighter for this encounter. HP resets each spawn. */
  fighter(channel: string, username: string, unitId: string | null, maxHp: number): Fighter {
    const e = this.current(channel);
    if (!e) throw new Error("No encounter");
    let f = e.fighters.get(username);
    if (!f) {
      f = { username, unitId, hp: maxHp, maxHp, routed: false, damageDealt: 0 };
      e.fighters.set(username, f);
    }
    return f;
  }

  getFighter(channel: string, username: string): Fighter | null {
    return this.current(channel)?.fighters.get(username) ?? null;
  }

  /** Apply player damage to the enemy. Returns remaining HP. */
  damageEnemy(channel: string, username: string, amount: number): number {
    const e = this.current(channel);
    if (!e) throw new Error("No encounter");
    e.hp = Math.max(0, e.hp - amount);
    e.contributions.set(username, (e.contributions.get(username) ?? 0) + amount);
    const f = e.fighters.get(username);
    if (f) f.damageDealt += amount;
    return e.hp;
  }

  /** Enemy hurts a fighter; routes them at 0. Returns the updated fighter. */
  damageFighter(channel: string, username: string, amount: number): Fighter | null {
    const f = this.getFighter(channel, username);
    if (!f) return null;
    f.hp = Math.max(0, f.hp - amount);
    if (f.hp === 0) f.routed = true;
    return f;
  }

  heal(channel: string, username: string): Fighter | null {
    const f = this.getFighter(channel, username);
    if (!f) return null;
    f.hp = f.maxHp;
    f.routed = false;
    return f;
  }

  /** Someone who has fought this enemy and is still standing — raid target. */
  pickRaidTarget(channel: string, rng: () => number = Math.random): Fighter | null {
    const e = this.current(channel);
    if (!e) return null;
    const standing = [...e.fighters.values()].filter((f) => !f.routed && f.unitId && f.damageDealt > 0);
    if (standing.length === 0) return null;
    return standing[Math.floor(rng() * standing.length)] ?? null;
  }

  lastBossAt(channel: string): number | null {
    return this.state(channel).lastBossAt;
  }
}
