import { GOLD, STAFF_BONUS_HP } from "@/features/economy/shop";
import {
  type Rng,
  type Stats,
  type Unit,
  type WeaponType,
  resolveStrike,
  strikesFor,
  triangleModifier,
} from "@/features/units/model";
import { type Boss } from "@/features/units/roster";

/** All Phase 3 timing/tuning knobs live here. Times in ms. */
export const ENCOUNTER = {
  /** Breather between a foe falling and the next one arriving. */
  lullMs: 45_000,
  /** Random raid window while an enemy is on the field. */
  raidMinMs: 60_000,
  raidMaxMs: 120_000,
  /** Boss cadence and how long chat has to beat one. */
  bossMinMs: 30 * 60_000,
  bossMaxMs: 45 * 60_000,
  bossDurationMs: 5 * 60_000,
  /** Gold paid on top of the boss pool to whoever lands the killing blow. */
  bossFinisherGold: 40,
  /** Consolation gold per contributor if a boss escapes. */
  bossEscapeGold: 10,
  /** Minimum share any boss contributor receives. */
  bossMinShare: 5,
  /** Field HP multiplier per rarity for regular foes (unit base.hp * mult). */
  hpMultiplier: { common: 2, uncommon: 2.5, rare: 3, legendary: 4 } as const,
};

export type EncounterKind = "foe" | "boss";

/** Regular foes scale with their own stats so a legendary is a real fight. */
export function enemyMaxHp(unit: Unit): number {
  return Math.round(unit.base.hp * ENCOUNTER.hpMultiplier[unit.rarity]);
}

export function bossMaxHp(boss: Boss): number {
  return boss.maxHp;
}

export type PlayerStrike = {
  damage: number;
  crit: boolean;
  triangle: -1 | 0 | 1;
};

/**
 * A viewer's `!fe fight` hit. Base roll (5–14) always lands so chat never
 * feels cheated; a champion adds atk/3, the weapon triangle ±3, and a crit
 * (skl vs foe lck) doubles it. Players without a unit just use the base roll.
 */
export function rollPlayerStrike(
  baseRoll: number,
  champion: { stats: Stats; weapon: WeaponType } | null,
  enemy: Unit,
  rng: Rng = Math.random,
): PlayerStrike {
  if (!champion) return { damage: baseRoll, crit: false, triangle: 0 };
  const tri = triangleModifier(champion.weapon, enemy.weapon) as -1 | 0 | 1;
  const critChance = Math.min(25, Math.max(0, champion.stats.skl - enemy.base.lck));
  const crit = rng() * 100 < critChance;
  const raw = Math.max(1, baseRoll + Math.floor(champion.stats.atk / 3) + tri * 3);
  return { damage: crit ? raw * 2 : raw, crit, triangle: tri };
}

export type EnemyStrike = { hit: boolean; crit: boolean; damage: number; strikes: number };

/** Enemy counterattack / raid on a champion using the duel math. Bosses double-strike more often. */
export function rollEnemyStrike(
  enemy: Unit,
  champion: { stats: Stats; weapon: WeaponType },
  rng: Rng = Math.random,
): EnemyStrike {
  const strikes = strikesFor(enemy.base, champion.stats);
  let damage = 0;
  let hit = false;
  let crit = false;
  for (let i = 0; i < strikes; i++) {
    const roll = resolveStrike({ stats: enemy.base, weapon: enemy.weapon }, champion, rng);
    if (roll.hit) {
      hit = true;
      crit = crit || roll.crit;
      damage += roll.damage;
    }
  }
  return { hit, crit, damage, strikes };
}

export function championMaxHp(unit: Unit, hasStaff: boolean): number {
  return unit.base.hp + (hasStaff ? STAFF_BONUS_HP : 0);
}

export type Payout = { user: string; gold: number };

/**
 * Split a boss's gold pool by damage dealt (min share each), finisher bonus on top.
 * Every contributor also already earned GOLD.bossHit per hit during the fight.
 */
export function splitBossGold(
  pool: number,
  contributions: Map<string, number>,
  finisher: string | null,
): Payout[] {
  const total = [...contributions.values()].reduce((a, b) => a + b, 0);
  const out: Payout[] = [];
  for (const [user, dealt] of contributions) {
    const share = total > 0 ? Math.round((dealt / total) * pool) : 0;
    let gold = Math.max(ENCOUNTER.bossMinShare, share);
    if (user === finisher) gold += ENCOUNTER.bossFinisherGold;
    out.push({ user, gold });
  }
  return out.sort((a, b) => b.gold - a.gold);
}

export function escapePayouts(contributions: Map<string, number>): Payout[] {
  return [...contributions.keys()].map((user) => ({ user, gold: ENCOUNTER.bossEscapeGold }));
}

export const HIT_GOLD = GOLD.bossHit;
