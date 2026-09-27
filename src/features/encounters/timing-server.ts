import { createPublicClient } from "@/lib/supabase/public";

import { DEFAULT_TIMING, type GameTiming, timingFromRow } from "./timing";

/** Server-side read of a channel's timing settings. Never throws. */
export async function getGameTiming(channel: string): Promise<GameTiming> {
  try {
    const { data, error } = await createPublicClient()
      .from("channel_settings")
      .select("boss_min_minutes,boss_max_minutes,creatures_enabled,creature_min_minutes,creature_max_minutes")
      .eq("channel", channel)
      .maybeSingle();
    if (error) return DEFAULT_TIMING;
    return timingFromRow(data as Record<string, unknown> | null);
  } catch {
    return DEFAULT_TIMING;
  }
}
