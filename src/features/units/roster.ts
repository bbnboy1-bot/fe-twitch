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
  lord: 0, // never in the random pool
};

/**
 * Lords of Veyra (Phase 7). A viewer picks one with `!fe start <name>`; it is
 * their journey's hero, not a field recruit. Stats sit between rare and warlord.
 * Ids are `lord-*` so ownership rules can find them. Streamers may show these
 * under their realm's own names (see `names.ts`); the roster itself stays original.
 */
export const LORDS: Unit[] = [
  u("lord-wren", "Wren", "Wind of the Steppe", "duelist", "lord", 24, 10, 15, 6, 13, 10),
  u("lord-anselm", "Anselm", "the Gentle Blade", "duelist", "lord", 26, 11, 11, 8, 11, 12),
  u("lord-hadrian", "Hadrian", "the Iron Wall", "berserker", "lord", 34, 15, 6, 13, 8, 5),
  u("lord-elowen", "Elowen", "Rose of the Twin Crowns", "duelist", "lord", 23, 10, 13, 6, 14, 13),
  u("lord-cassian", "Cassian", "the Reckless Prince", "outrider", "lord", 30, 14, 10, 8, 9, 5),
  u("lord-roark", "Roark", "Sellsword of the Coast", "duelist", "lord", 31, 15, 10, 9, 11, 6),
  u("lord-isolde", "Isolde", "the Silver Seer", "arcanist", "lord", 23, 14, 10, 4, 12, 13),
  u("lord-torvin", "Torvin", "the Exalted", "duelist", "lord", 27, 12, 11, 9, 11, 11),
  u("lord-vesper", "Vesper", "the Masked Stranger", "duelist", "lord", 25, 11, 15, 6, 14, 8),
  u("lord-nerys", "Nerys", "the Dragon-Blooded", "duelist", "lord", 27, 12, 11, 8, 10, 12),
  u("lord-ottilie", "Ottilie", "the Iron Empress", "berserker", "lord", 30, 16, 7, 12, 10, 6),
  u("lord-leoric", "Leoric", "the Haunted Heir", "sentinel", "lord", 32, 15, 9, 10, 9, 5),
  u("lord-faelan", "Faelan", "the Golden Schemer", "ranger", "lord", 25, 11, 13, 6, 15, 13),
  u("lord-amaris", "Amaris", "Blade of the Divine", "duelist", "lord", 28, 12, 12, 9, 12, 12),
];

export function isLordId(id: string): boolean {
  return id.startsWith("lord-");
}

/** Find a lord by id, original name, or a channel display name (case-insensitive). */
export function findLord(query: string, displayNames?: Record<string, string>): Unit | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return LORDS.find(
    (l) =>
      l.id === q ||
      l.id === `lord-${q}` ||
      l.name.toLowerCase() === q ||
      (displayNames?.[l.id] ?? "").toLowerCase() === q,
  );
}

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

/**
 * Boss roster — named warlords of Veyra. Not part of the random recruit pool;
 * they only appear as timed/mod-triggered boss events. Defeating one recruits it.
 * `maxHp` is the boss's battle HP on the field (unit `base.hp` stays the HP it
 * has once recruited, so bosses aren't absurd in duels).
 */
export type Boss = Unit & { maxHp: number; goldPool: number; arrival: string };

export const BOSSES: Boss[] = [
  b(u("warlord-ashgar", "Ashgar", "the Ironhand", "sentinel", "legendary", 34, 14, 5, 15, 8, 4), 220, 200, "marches in under a black banner"),
  b(u("warlord-selka", "Selka", "Nightgale", "skyrider", "legendary", 27, 13, 14, 7, 12, 8), 240, 220, "dives out of the storm clouds"),
  b(u("warlord-durn", "Durn", "the Mountain", "berserker", "legendary", 40, 18, 6, 9, 7, 3), 320, 260, "shakes the ground with every step"),
  b(u("warlord-ysolde", "Ysolde", "Hexweaver", "arcanist", "legendary", 26, 17, 10, 6, 14, 7), 260, 240, "steps out of a rift of violet fire"),
  b(u("warlord-corvin", "Corvin", "Twelve-Arrows", "ranger", "legendary", 28, 15, 12, 7, 15, 9), 280, 240, "signals the attack from the treeline"),
  b(u("warlord-vaelen", "Vaelen", "the Usurper", "duelist", "legendary", 30, 16, 15, 9, 16, 10), 400, 320, "rides down the road with the crown of Veyra"),
];

export function isBossId(id: string): boolean {
  return BOSSES.some((x) => x.id === id);
}

export function pickRandomBoss(rng: () => number = Math.random): Boss {
  return BOSSES[Math.floor(rng() * BOSSES.length)] ?? BOSSES[0];
}

export function getUnitById(id: string): Unit | undefined {
  return ROSTER.find((x) => x.id === id) ?? BOSSES.find((x) => x.id === id) ?? LORDS.find((x) => x.id === id);
}

function b(unit: Unit, maxHp: number, goldPool: number, arrival: string): Boss {
  return { ...unit, maxHp, goldPool, arrival };
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
