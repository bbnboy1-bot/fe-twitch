import type { Rarity, Unit } from "./model";

/**
 * Original roster for the realm of Veyra. Names/characters are ours;
 * the archetypes are the familiar tactics classics.
 */
export const ROSTER: Unit[] = [
  // ---- Common ----
  u("bram", "Bram", "the Steadfast", "sentinel", "common", 24, 7, 3, 9, 4, 3),
  u("wick", "Wick", "of the Backroads", "outrider", "common", 20, 6, 6, 5, 5, 4),
  u("tamsin", "Tamsin", "Quickblade", "duelist", "common", 18, 5, 8, 3, 7, 5),
  u("orrick", "Orrick", "Timberfell", "berserker", "common", 26, 9, 4, 4, 3, 2),
  u("perrin", "Perrin", "Hedgebow", "ranger", "common", 19, 6, 6, 3, 6, 4),
  u("liora", "Liora", "Candlewise", "mender", "common", 17, 3, 5, 3, 5, 8),
  u("edda", "Edda", "Sparkscript", "arcanist", "common", 17, 7, 5, 2, 6, 4),
  u("colm", "Colm", "Greyfoot", "duelist", "common", 19, 5, 7, 4, 6, 4),

  // ---- Uncommon ----
  u("sable", "Sable", "Winterlance", "skyrider", "uncommon", 20, 7, 9, 4, 7, 5),
  u("gunnar", "Gunnar", "Oakbreaker", "berserker", "uncommon", 29, 11, 5, 5, 4, 3),
  u("maren", "Maren", "of the Vale", "outrider", "uncommon", 23, 8, 7, 6, 6, 5),
  u("iseld", "Iseld", "Stormquill", "arcanist", "uncommon", 19, 9, 6, 3, 8, 4),
  u("dain", "Dain", "Wallwarden", "sentinel", "uncommon", 28, 8, 3, 12, 5, 3),
  u("rhosyn", "Rhosyn", "Truefeather", "ranger", "uncommon", 21, 8, 8, 4, 9, 5),

  // ---- Rare ----
  u("kestrel", "Kestrel", "Dawnwing", "skyrider", "rare", 23, 9, 12, 5, 10, 7),
  u("veyla", "Veyla", "Emberveil", "arcanist", "rare", 21, 12, 8, 4, 10, 6),
  u("aldric", "Aldric", "the Unbroken", "sentinel", "rare", 32, 10, 4, 14, 7, 5),
  u("nyx", "Nyx", "Threadcutter", "duelist", "rare", 22, 9, 13, 5, 12, 8),
  u("solenne", "Solenne", "Lightmother", "mender", "rare", 22, 5, 8, 6, 8, 12),

  // ---- Legendary ----
  u("caelen", "Caelen", "Heir of Veyra", "duelist", "legendary", 26, 12, 13, 8, 13, 11),
  u("morrigan", "Morrigan", "the Last Tempest", "arcanist", "legendary", 24, 15, 10, 6, 13, 8),
  u("brannoc", "Brannoc", "Worldsplitter", "berserker", "legendary", 36, 16, 8, 8, 9, 6),
];

const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 700,
  uncommon: 220,
  rare: 70,
  legendary: 10,
};

/** Weighted random recruit — drop-in replacement for getRandomPokemonSpeciesName. */
export function recruitRandomUnit(rng: () => number = Math.random): Unit {
  const total = ROSTER.reduce((s, x) => s + RARITY_WEIGHT[x.rarity], 0);
  let roll = rng() * total;
  for (const unit of ROSTER) {
    roll -= RARITY_WEIGHT[unit.rarity];
    if (roll < 0) return unit;
  }
  return ROSTER[0];
}

export function getUnitById(id: string): Unit | undefined {
  return ROSTER.find((x) => x.id === id);
}

// compact constructor
function u(
  id: string,
  name: string,
  epithet: string,
  unitClass: Unit["unitClass"],
  rarity: Rarity,
  hp: number,
  atk: number,
  spd: number,
  def: number,
  skl: number,
  lck: number,
): Unit {
  const weapon = {
    duelist: "sword",
    sentinel: "lance",
    outrider: "lance",
    berserker: "axe",
    skyrider: "lance",
    ranger: "bow",
    arcanist: "tome",
    mender: "staff",
  }[unitClass] as Unit["weapon"];
  return {
    id,
    name,
    epithet,
    unitClass,
    weapon,
    rarity,
    base: { hp, atk, spd, def, skl, lck },
  };
}
