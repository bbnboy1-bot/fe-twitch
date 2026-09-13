import { createPublicClient } from "@/lib/supabase/public";

import { parseArenaState } from "@/features/arena/events";

import { type ActivePoke, parseBattleLog } from "./model";

const OVERLAY_EVENT_COLUMNS =
  "health,max_health,kind,expires_at,battle_log,arena,poke,updated_at,last_event_kind,last_event_player,last_event_damage,last_event_at,last_catch_poke,last_catch_player,last_catch_at";
/** Same without Phase 6's `arena`, so the card keeps working until that migration lands. */
const PHASE5_OVERLAY_COLUMNS = OVERLAY_EVENT_COLUMNS.replace("arena,", "");
const LEGACY_OVERLAY_COLUMNS = "health,poke,updated_at";

const channelPromises = new Map<string, Promise<string | null>>();

export function getOverlayChannel(accountId: string): Promise<string | null> {
  let promise = channelPromises.get(accountId);
  if (!promise) {
    promise = (async () => {
      try {
        const supabase = createPublicClient();
        const { data, error } = await supabase.rpc("get_overlay_channel", {
          p_account_id: accountId,
        });

        if (error) {
          throw error;
        }

        return data ?? null;
      } catch (err) {
        channelPromises.delete(accountId);
        throw err;
      }
    })();
    channelPromises.set(accountId, promise);
  }
  return promise;
}

const pokePromises = new Map<string, { promise: Promise<ActivePoke | null>; expiry: number }>();
const POKE_CACHE_TTL_MS = 2_000; // 2 seconds

export function getActivePoke(channel: string): Promise<ActivePoke | null> {
  const now = Date.now();
  const cached = pokePromises.get(channel);
  if (cached && cached.expiry > now) {
    return cached.promise;
  }

  const promise = (async () => {
    try {
      const supabase = createPublicClient();
      let { data, error } = await supabase
        .from("active_pokes")
        .select(OVERLAY_EVENT_COLUMNS)
        .eq("channel", channel)
        .maybeSingle();

      // Database without the Phase 6 arena column yet: drop just that column.
      if (error?.code === "42703") {
        const phase5 = await supabase
          .from("active_pokes")
          .select(PHASE5_OVERLAY_COLUMNS)
          .eq("channel", channel)
          .maybeSingle();
        data = phase5.data ? ({ ...(phase5.data as unknown as Record<string, unknown>), arena: {} } as unknown as typeof data) : null;
        error = phase5.error;
      }

      // Local or stale databases can lag behind the overlay-events migration.
      // In that case, keep the overlay available without event badges.
      if (error?.code === "42703") {
        const legacyResult = await supabase
          .from("active_pokes")
          .select(LEGACY_OVERLAY_COLUMNS)
          .eq("channel", channel)
          .maybeSingle();

        data = legacyResult.data
          ? {
              ...legacyResult.data,
              max_health: 50,
              kind: "foe",
              expires_at: null,
              battle_log: [],
              arena: {},
              last_event_kind: null,
              last_event_player: null,
              last_event_damage: null,
              last_event_at: null,
              last_catch_poke: null,
              last_catch_player: null,
              last_catch_at: null,
            }
          : null;
        error = legacyResult.error;
      }

      if (error) {
        throw error;
      }

      if (!data) return null;
      return {
        health: data.health,
        poke: data.poke,
        maxHealth: "max_health" in data && typeof data.max_health === "number" ? data.max_health : 50,
        kind: "kind" in data && (data.kind === "boss" || data.kind === "lull") ? data.kind : "foe",
        expiresAt: "expires_at" in data ? (data.expires_at as string | null) : null,
        battleLog: parseBattleLog("battle_log" in data ? data.battle_log : []),
        arena: parseArenaState("arena" in data ? data.arena : {}),
        updatedAt: data.updated_at,
        lastEventKind: "last_event_kind" in data ? data.last_event_kind : null,
        lastEventPlayer:
          "last_event_player" in data ? data.last_event_player : null,
        lastEventDamage:
          "last_event_damage" in data ? data.last_event_damage : null,
        lastEventAt: "last_event_at" in data ? data.last_event_at : null,
        lastCatchPoke: "last_catch_poke" in data ? data.last_catch_poke : null,
        lastCatchPlayer:
          "last_catch_player" in data ? data.last_catch_player : null,
        lastCatchAt: "last_catch_at" in data ? data.last_catch_at : null,
      } satisfies ActivePoke;
    } catch (err) {
      pokePromises.delete(channel);
      throw err;
    }
  })();

  pokePromises.set(channel, { promise, expiry: now + POKE_CACHE_TTL_MS });
  return promise;
}
