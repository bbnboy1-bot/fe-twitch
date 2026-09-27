import { cookies } from "next/headers";
import { cache } from "react";

import { getCurrentAccount } from "@/features/auth/queries";

import { pickRealm, REALM_COOKIE, type RealmSource } from "./realm";

export type Realm = {
  channel: string | null;
  source: RealmSource;
  /** The signed-in streamer's own channel, if any (for "back to my realm"). */
  ownChannel: string | null;
};

/**
 * The realm for this request. The proxy has already copied any `?realm=` into
 * the cookie on the incoming request, so reading the cookie covers case 1 too.
 */
export const getRealm = cache(async (): Promise<Realm> => {
  let cookie: string | null = null;
  try {
    cookie = (await cookies()).get(REALM_COOKIE)?.value ?? null;
  } catch {
    cookie = null;
  }
  let ownChannel: string | null = null;
  try {
    ownChannel = (await getCurrentAccount())?.channel ?? null;
  } catch {
    ownChannel = null;
  }
  const picked = pickRealm({ cookie, accountChannel: ownChannel, envDefault: process.env.NEXT_PUBLIC_DEFAULT_CHANNEL });
  return { ...picked, ownChannel: ownChannel?.toLowerCase() ?? null };
});

