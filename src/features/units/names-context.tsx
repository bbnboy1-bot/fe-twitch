"use client";

import { createContext, useContext } from "react";

import { type ChannelNames, DEFAULT_CHANNEL_NAMES } from "./names";

const ChannelNamesContext = createContext<ChannelNames>(DEFAULT_CHANNEL_NAMES);

/** Makes the current realm's unit names available to client components on the site. */
export function ChannelNamesProvider({ names, children }: { names: ChannelNames; children: React.ReactNode }) {
  return <ChannelNamesContext.Provider value={names}>{children}</ChannelNamesContext.Provider>;
}

export function useChannelNames(): ChannelNames {
  return useContext(ChannelNamesContext);
}
