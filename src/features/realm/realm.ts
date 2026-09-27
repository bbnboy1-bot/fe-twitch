/**
 * Realms (multi-streamer support).
 *
 * The site serves many streamers. A visitor's "realm" is the channel whose
 * names, leaderboard and lords they are looking at. Resolution order:
 *
 *   1. `?realm=<channel>` on the URL (every link the bot posts carries it);
 *      the proxy copies it into the `fe_realm` cookie so it sticks.
 *   2. The `fe_realm` cookie (the last realm this browser visited).
 *   3. The signed-in streamer's own channel.
 *   4. `NEXT_PUBLIC_DEFAULT_CHANNEL` (optional, for single-streamer deployments).
 *   5. No realm: built-in defaults (community names, empty leaderboard prompt).
 */

export const REALM_PARAM = "realm";
export const REALM_COOKIE = "fe_realm";
/** Cookie lifetime: a year. It only holds a public channel name. */
export const REALM_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Twitch logins: 4-25 chars of letters, digits and underscores (be lenient on the low end). */
export function normalizeRealm(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim().replace(/^[#@]/, "").toLowerCase();
  return /^[a-z0-9_]{1,25}$/.test(v) ? v : null;
}

export type RealmSource = "param" | "cookie" | "account" | "env" | "none";

export function pickRealm(input: {
  param?: string | null;
  cookie?: string | null;
  accountChannel?: string | null;
  envDefault?: string | null;
}): { channel: string | null; source: RealmSource } {
  const param = normalizeRealm(input.param);
  if (param) return { channel: param, source: "param" };
  const cookie = normalizeRealm(input.cookie);
  if (cookie) return { channel: cookie, source: "cookie" };
  const account = normalizeRealm(input.accountChannel);
  if (account) return { channel: account, source: "account" };
  const env = normalizeRealm(input.envDefault);
  if (env) return { channel: env, source: "env" };
  return { channel: null, source: "none" };
}

/** Adds `?realm=` to a site URL (used by the bot for every link it posts). */
export function withRealm(url: URL, channel: string): URL {
  const realm = normalizeRealm(channel);
  if (realm) url.searchParams.set(REALM_PARAM, realm);
  return url;
}
