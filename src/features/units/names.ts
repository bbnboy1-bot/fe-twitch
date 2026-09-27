import type { Unit } from "./model";
import { LORDS } from "./roster";

/**
 * Realm names (Phase 7).
 *
 * The roster ships with original names. A streamer can choose, per channel,
 * to show the lords under the well-known names their community expects
 * ("official" mode), or the original Veyran names ("original" mode), and can
 * additionally type a custom name for any lord. The choice lives in
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

/** The "official" preset: lord id -> the name the community knows. */
export const OFFICIAL_LORD_NAMES: Record<string, string> = {
  "lord-sable": "Lyn",
  "lord-aldric": "Eliwood",
  "lord-brannoc": "Hector",
  "lord-elowen": "Eirika",
  "lord-caelan": "Ephraim",
  "lord-roark": "Ike",
  "lord-isolde": "Micaiah",
  "lord-torvin": "Chrom",
  "lord-vesper": "Lucina",
  "lord-nerys": "Corrin",
  "lord-ottilie": "Edelgard",
  "lord-leoric": "Dimitri",
  "lord-faelan": "Claude",
  "lord-amaris": "Alear",
};

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
    if (clean && LORDS.some((l) => l.id === id)) custom[id] = clean;
  }
  return { mode, custom };
}

/** Display name for a unit in a given channel: custom > official preset (in official mode) > original. */
export function unitDisplayName(unit: Pick<Unit, "id" | "name">, names: ChannelNames = DEFAULT_CHANNEL_NAMES): string {
  const custom = names.custom[unit.id];
  if (custom) return custom;
  if (names.mode === "official") return OFFICIAL_LORD_NAMES[unit.id] ?? unit.name;
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
