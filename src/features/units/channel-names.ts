import { createPublicClient } from "@/lib/supabase/public";

import { type ChannelNames, DEFAULT_CHANNEL_NAMES, parseChannelNames } from "./names";

/** Server-side read of a channel's realm names. Never throws; defaults keep pages rendering. */
export async function getChannelNames(channel: string): Promise<ChannelNames> {
  try {
    const { data, error } = await createPublicClient()
      .from("channel_settings")
      .select("unit_name_mode,unit_names")
      .eq("channel", channel)
      .maybeSingle();
    if (error || !data) return DEFAULT_CHANNEL_NAMES;
    return parseChannelNames({ mode: data.unit_name_mode, custom: data.unit_names });
  } catch {
    return DEFAULT_CHANNEL_NAMES;
  }
}
