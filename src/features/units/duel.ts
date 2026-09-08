import {
  type Rng,
  type Stats,
  type Unit,
  type WeaponType,
  resolveStrike,
  strikesFor,
} from "./model";

export type Fighter = {
  username: string;
  unit: Unit;
  /** Equipped weapon overrides the unit's class weapon. */
  weapon?: WeaponType;
  /** Bonus HP (e.g. heal staff blessing). */
  bonusHp?: number;
};

export type DuelResult = {
  winner: string;
  loser: string;
  rounds: number;
  log: string[];
  finalHp: Record<string, number>;
};

const MAX_ROUNDS = 12;

/** Full auto-resolved duel: alternating strikes, doubling, first KO wins. */
export function resolveDuel(a: Fighter, b: Fighter, rng: Rng = Math.random): DuelResult {
  const hp: Record<string, number> = {
    [a.username]: a.unit.base.hp + (a.bonusHp ?? 0),
    [b.username]: b.unit.base.hp + (b.bonusHp ?? 0),
  };
  const log: string[] = [];
  const side = (f: Fighter) => ({
    stats: f.unit.base,
    weapon: f.weapon ?? f.unit.weapon,
  });

  let round = 0;
  // Faster fighter opens the duel; ties favour the challenger (a).
  let [att, def] = b.unit.base.spd > a.unit.base.spd ? [b, a] : [a, b];

  while (round < MAX_ROUNDS) {
    round++;
    const strikes = strikesFor(att.unit.base, def.unit.base);
    for (let i = 0; i < strikes; i++) {
      const roll = resolveStrike(side(att), side(def), rng);
      if (!roll.hit) {
        log.push(`${att.unit.name} misses ${def.unit.name}!`);
        continue;
      }
      hp[def.username] = Math.max(0, hp[def.username] - roll.damage);
      log.push(
        `${att.unit.name} ${roll.crit ? "CRITS" : "strikes"} ${def.unit.name} for ${roll.damage}!` +
          (roll.triangle === 1 ? " (weapon advantage)" : ""),
      );
      if (hp[def.username] <= 0) {
        return {
          winner: att.username,
          loser: def.username,
          rounds: round,
          log,
          finalHp: hp,
        };
      }
    }
    [att, def] = [def, att];
  }

  // Timeout: most remaining HP (percentage of start) wins; tie → challenger.
  const pct = (f: Fighter) => hp[f.username] / (f.unit.base.hp + (f.bonusHp ?? 0));
  const winner = pct(b) > pct(a) ? b : a;
  const loser = winner === a ? b : a;
  return { winner: winner.username, loser: loser.username, rounds: round, log, finalHp: hp };
}

/** Pick a collector's champion: best rarity, then stat total. */
export function pickChampion(units: Unit[]): Unit | null {
  const rank = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
  const total = (s: Stats) => s.hp + s.atk + s.spd + s.def + s.skl + s.lck;
  return (
    [...units].sort(
      (x, y) => rank[y.rarity] - rank[x.rarity] || total(y.base) - total(x.base),
    )[0] ?? null
  );
}

/** Ephemeral challenge tracker (worker memory; no DB needed). */
export class DuelManager {
  private pending = new Map<string, { challenger: string; createdAt: number }>();
  constructor(private readonly ttlMs = 60_000) {}

  private key(channel: string, target: string) {
    return `${channel}:${target.toLowerCase()}`;
  }

  challenge(channel: string, challenger: string, target: string) {
    this.pending.set(this.key(channel, target), {
      challenger: challenger.toLowerCase(),
      createdAt: Date.now(),
    });
  }

  /** Returns the challenger if @target has a live challenge, consuming it. */
  accept(channel: string, target: string): string | null {
    const k = this.key(channel, target);
    const entry = this.pending.get(k);
    if (!entry) return null;
    this.pending.delete(k);
    if (Date.now() - entry.createdAt > this.ttlMs) return null;
    return entry.challenger;
  }

  decline(channel: string, target: string): string | null {
    const k = this.key(channel, target);
    const entry = this.pending.get(k);
    this.pending.delete(k);
    return entry ? entry.challenger : null;
  }
}
