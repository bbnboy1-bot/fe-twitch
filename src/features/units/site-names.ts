import { cache } from "react";

import { getRealm } from "@/features/realm/server";

import { getChannelNames } from "./channel-names";
import { type ChannelNames, DEFAULT_CHANNEL_NAMES } from "./names";

/** Unit names for the realm this visitor is viewing (see `features/realm`). */
export const getSiteChannelNames = cache(async (): Promise<ChannelNames> => {
  try {
    const { channel } = await getRealm();
    if (!channel) return DEFAULT_CHANNEL_NAMES;
    return await getChannelNames(channel);
  } catch {
    return DEFAULT_CHANNEL_NAMES;
  }
});
