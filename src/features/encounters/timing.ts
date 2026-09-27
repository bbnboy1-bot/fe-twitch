/**
 * Per-channel encounter timing (Phase 9), set by the streamer on the Setup page.
 * Stored in `channel_settings`; the worker reads it through `parseGameTiming`.
 */

export type GameTiming = {
  bossMinMinutes: number;
  bossMaxMinutes: number;
  creaturesEnabled: boolean;
  creatureMinMinutes: number;
  creatureMaxMinutes: number;
};

export const TIMING_LIMITS = {
  boss: { min: 5, max: 240 },
  creature: { min: 1, max: 60 },
} as const;

export const DEFAULT_TIMING: GameTiming = {
  bossMinMinutes: 30,
  bossMaxMinutes: 45,
  creaturesEnabled: true,
  creatureMinMinutes: 5,
  creatureMaxMinutes: 10,
};

function clampInt(value: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? Math.round(value) : NaN;
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

/** Tolerant normaliser: clamps to the limits and keeps min <= max. */
export function normalizeTiming(input: Partial<Record<keyof GameTiming, unknown>> | null | undefined): GameTiming {
  const v = input ?? {};
  const b = TIMING_LIMITS.boss;
  const c = TIMING_LIMITS.creature;
  const bossMin = clampInt(v.bossMinMinutes, b.min, b.max, DEFAULT_TIMING.bossMinMinutes);
  const bossMax = clampInt(v.bossMaxMinutes, b.min, b.max, DEFAULT_TIMING.bossMaxMinutes);
  const creMin = clampInt(v.creatureMinMinutes, c.min, c.max, DEFAULT_TIMING.creatureMinMinutes);
  const creMax = clampInt(v.creatureMaxMinutes, c.min, c.max, DEFAULT_TIMING.creatureMaxMinutes);
  const enabled = v.creaturesEnabled === undefined || v.creaturesEnabled === null ? DEFAULT_TIMING.creaturesEnabled : v.creaturesEnabled === true || v.creaturesEnabled === "true" || v.creaturesEnabled === "on";
  return {
    bossMinMinutes: Math.min(bossMin, bossMax),
    bossMaxMinutes: Math.max(bossMin, bossMax),
    creaturesEnabled: enabled,
    creatureMinMinutes: Math.min(creMin, creMax),
    creatureMaxMinutes: Math.max(creMin, creMax),
  };
}

/** From a `channel_settings` row (snake_case columns). */
export function timingFromRow(row: Record<string, unknown> | null | undefined): GameTiming {
  if (!row) return DEFAULT_TIMING;
  return normalizeTiming({
    bossMinMinutes: row.boss_min_minutes,
    bossMaxMinutes: row.boss_max_minutes,
    creaturesEnabled: row.creatures_enabled,
    creatureMinMinutes: row.creature_min_minutes,
    creatureMaxMinutes: row.creature_max_minutes,
  });
}
