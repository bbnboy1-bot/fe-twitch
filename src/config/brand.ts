/**
 * Single place for the game's public-facing name and wording.
 * Change GAME_NAME here and it flows through the header, metadata, overlay
 * ticker and footer.
 */
export const GAME_NAME = "FE Duel";
export const GAME_TAGLINE = "Chat-run tactics for Twitch";
export const REALM_NAME = "the realm of Veyra";

/** Twitch account the worker chats from. Set NEXT_PUBLIC_BOT_USERNAME in Vercel + .env.local. */
export const BOT_USERNAME =
  process.env.NEXT_PUBLIC_BOT_USERNAME?.trim() || "fireemblemgame";

export const REPO_URL = "https://github.com/bbnboy1-bot/fe-twitch";
