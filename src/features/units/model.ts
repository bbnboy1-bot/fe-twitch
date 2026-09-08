/**
 * Emblem-style unit system (original IP).
 * Classes, weapon triangle, stats and combat math recognisable to
 * tactics fans, with an original roster and setting.
 */

export type WeaponType = "sword" | "lance" | "axe" | "bow" | "tome" | "staff";

export type UnitClass =
  | "duelist" // fast sword infantry (myrmidon-style)
  | "sentinel" // armored lance wall (knight-style)
  | "outrider" // mounted lance (cavalier-style)
  | "berserker" // axe bruiser
  | "skyrider" // flying lance (pegasus-style)
  | "ranger" // bow
  | "arcanist" // tome
  | "mender"; // staff support

export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export type Stats = {
  hp: number;
  atk: number;
  spd: number;
  def: number;
  skl: number; // hit + crit contribution
  lck: number; // crit avoidance + small hit boost
};

export type Unit = {
  id: string;
  name: string;
  epithet: string;
  unitClass: UnitClass;
  weapon: WeaponType;
  rarity: Rarity;
  base: Stats;
};

export const CLASS_WEAPON: Record<UnitClass, WeaponType> = {
  duelist: "sword",
  sentinel: "lance",
  outrider: "lance",
  berserker: "axe",
  skyrider: "lance",
  ranger: "bow",
  arcanist: "tome",
  mender: "staff",
};

/** Classic triangle: sword > axe > lance > sword. Tomes beat bows; staves neutral. */
export function triangleModifier(a: WeaponType, b: WeaponType): number {
  const beats: Partial<Record<WeaponType, WeaponType>> = {
    sword: "axe",
    axe: "lance",
    lance: "sword",
    tome: "bow",
    bow: "tome",
  };
  if (beats[a] === b) return 1;
  if (beats[b] === a) return -1;
  return 0;
}

export type CombatRoll = {
  hit: boolean;
  crit: boolean;
  damage: number;
  triangle: -1 | 0 | 1;
};

export type Rng = () => number; // [0, 1)

/**
 * One strike, FE-flavoured:
 * hit% = 70 + 2*skl + lck - foe spd*2, clamped 10..100, ±15 for triangle
 * crit% = skl - foe lck, clamped 0..35
 * damage = atk - foe def (min 1), +1/-1 triangle, x3 on crit
 */
export function resolveStrike(
  attacker: { stats: Stats; weapon: WeaponType },
  defender: { stats: Stats; weapon: WeaponType },
  rng: Rng = Math.random,
): CombatRoll {
  const tri = triangleModifier(attacker.weapon, defender.weapon) as -1 | 0 | 1;

  const hitChance = clamp(
    70 +
      attacker.stats.skl * 2 +
      attacker.stats.lck -
      defender.stats.spd * 2 +
      tri * 15,
    10,
    100,
  );
  const critChance = clamp(attacker.stats.skl - defender.stats.lck, 0, 35);

  const hit = rng() * 100 < hitChance;
  if (!hit) return { hit: false, crit: false, damage: 0, triangle: tri };

  const crit = rng() * 100 < critChance;
  const raw = Math.max(1, attacker.stats.atk - defender.stats.def + tri);
  return { hit: true, crit, damage: crit ? raw * 3 : raw, triangle: tri };
}

/** Doubling rule: 4+ spd advantage grants a follow-up strike. */
export function strikesFor(attacker: Stats, defender: Stats): 1 | 2 {
  return attacker.spd - defender.spd >= 4 ? 2 : 1;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
