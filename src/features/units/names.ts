import type { Unit } from "./model";
import { BOSSES, getUnitById, LORDS, ROSTER } from "./roster";

/**
 * Realm names (Phase 7).
 *
 * The roster ships with original names. A streamer can choose, per channel,
 * to show every unit (lords, warlords, recruits) under the well-known names
 * their community expects ("official" mode), or the original Veyran names
 * ("original" mode), and can additionally type a custom name for any unit. The choice lives in
 * `channel_settings`; the worker, overlays and leaderboard resolve names
 * through `unitDisplayName` so the roster itself never changes.
 */

export type UnitNameMode = "official" | "original";

export type ChannelNames = {
  mode: UnitNameMode;
  /** unitId -> custom display name typed by the streamer. */
  custom: Record<string, string>;
};

export const DEFAULT_CHANNEL_NAMES: ChannelNames = { mode: "official", custom: {} };

export const NAME_DISCLAIMER =
  "FE Duel is a fan-made community game. It is not affiliated with, endorsed by or associated with Nintendo or Intelligent Systems. Fire Emblem and its character names are trademarks of their respective owners. Original names are always available with one click.";

/** The "official" preset: unit id -> the name the community knows. Lords first, then warlords, then the recruit roster by class. */
export const OFFICIAL_NAMES: Record<string, string> = {
  "lord-wren": "Lyn",
  "lord-anselm": "Eliwood",
  "lord-hadrian": "Hector",
  "lord-elowen": "Eirika",
  "lord-cassian": "Ephraim",
  "lord-roark": "Ike",
  "lord-isolde": "Micaiah",
  "lord-torvin": "Chrom",
  "lord-vesper": "Lucina",
  "lord-nerys": "Corrin",
  "lord-ottilie": "Edelgard",
  "lord-leoric": "Dimitri",
  "lord-faelan": "Claude",
  "lord-amaris": "Alear",
  // Warlords (bosses)
  "warlord-ashgar": "Zephiel",
  "warlord-selka": "Petrine",
  "warlord-durn": "Ashnard",
  "warlord-ysolde": "Nergal",
  "warlord-corvin": "Narcian",
  "warlord-vaelen": "Lyon",
  // Common
  bram: "Oswin",
  wick: "Sain",
  tamsin: "Fir",
  orrick: "Dorcas",
  perrin: "Wil",
  liora: "Priscilla",
  edda: "Nino",
  colm: "Guy",
  // Uncommon
  sable: "Florina",
  gunnar: "Bartre",
  maren: "Kent",
  iseld: "Erk",
  dain: "Gilliam",
  rhosyn: "Rebecca",
  // Rare
  kestrel: "Tana",
  veyla: "Pent",
  aldric: "Gatrie",
  nyx: "Mia",
  solenne: "Natasha",
  // Legendary
  caelen: "Marth",
  morrigan: "Lilina",
  brannoc: "Hawkeye",
};

/** @deprecated use OFFICIAL_NAMES; kept for callers that only care about lords. */
export const OFFICIAL_LORD_NAMES: Record<string, string> = Object.fromEntries(LORDS.map((l) => [l.id, OFFICIAL_NAMES[l.id] ?? l.name]));

/** Every renamable unit, in the order the setup page shows them. */
export const NAMEABLE_UNITS: Unit[] = [...LORDS, ...BOSSES, ...ROSTER];

const MAX_NAME_LENGTH = 24;

export function cleanCustomName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.replace(/[\u2014\u2013]/g, "-").replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
  return v.length ? v : null;
}

export function parseChannelNames(value: unknown): ChannelNames {
  if (typeof value !== "object" || value === null) return DEFAULT_CHANNEL_NAMES;
  const v = value as Record<string, unknown>;
  const mode: UnitNameMode = v.mode === "original" ? "original" : "official";
  const custom: Record<string, string> = {};
  const raw = typeof v.custom === "object" && v.custom !== null ? (v.custom as Record<string, unknown>) : {};
  for (const [id, name] of Object.entries(raw)) {
    const clean = cleanCustomName(name);
    if (clean && getUnitById(id)) custom[id] = clean;
  }
  return { mode, custom };
}

/** Display name for a unit in a given channel: custom > official preset (in official mode) > original. */
export function unitDisplayName(unit: Pick<Unit, "id" | "name">, names: ChannelNames = DEFAULT_CHANNEL_NAMES): string {
  const custom = names.custom[unit.id];
  if (custom) return custom;
  if (names.mode === "official") return OFFICIAL_NAMES[unit.id] ?? unit.name;
  return unit.name;
}

/** All lord display names for the channel, handy for `!fe start` matching and the setup page. */
export function lordDisplayNames(names: ChannelNames = DEFAULT_CHANNEL_NAMES): Record<string, string> {
  return Object.fromEntries(LORDS.map((l) => [l.id, unitDisplayName(l, names)]));
}

/** A copy of the unit carrying its channel display name, so existing `unit.name` call sites just work. */
export function withChannelName<T extends Unit>(unit: T, names: ChannelNames = DEFAULT_CHANNEL_NAMES): T {
  const name = unitDisplayName(unit, names);
  return name === unit.name ? unit : { ...unit, name };
}
