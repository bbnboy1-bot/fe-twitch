import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { SupabaseGameStore } from "./store";

describe("SupabaseGameStore", () => {
  it("reads current status and the latest channel catch", async () => {
    const requests: Array<{ table: string; filters: unknown[] }> = [];
    const rows = {
      active_pokes: { data: { health: 30, poke: "pikachu" }, error: null },
      collections: { data: { poke: "mew", user: "winner" }, error: null },
    };
    const client = {
      from: (table: keyof typeof rows) => {
        const filters: unknown[] = [];
        const builder = {
          select: () => builder,
          eq: (column: string, value: string) => {
            filters.push({ column, value });
            return builder;
          },
          order: () => builder,
          limit: () => builder,
          maybeSingle: async () => {
            requests.push({ table, filters });
            return rows[table];
          },
        };
        return builder;
      },
    } as unknown as SupabaseClient;
    const store = new SupabaseGameStore(client);

    await expect(store.getStatus("streamer")).resolves.toEqual({
      health: 30,
      poke: "pikachu",
    });
    await expect(store.getLastCatch("streamer")).resolves.toEqual({
      poke: "mew",
      username: "winner",
    });
    expect(requests).toEqual([
      {
        table: "active_pokes",
        filters: [{ column: "channel", value: "streamer" }],
      },
      {
        table: "collections",
        filters: [{ column: "channel", value: "streamer" }],
      },
    ]);
  });

  it("initializes an encounter with one idempotent RPC", async () => {
    const calls: Array<{ name: string; params: unknown }> = [];
    const client = {
      rpc: async (name: string, params: unknown) => {
        calls.push({ name, params });
        return { data: null, error: null };
      },
    } as unknown as SupabaseClient;
    const store = new SupabaseGameStore(client);

    await store.spawnEncounter({ channel: "streamer", poke: "bram", maxHealth: 48, kind: "foe", durationSeconds: null });

    expect(calls).toEqual([
      {
        name: "fe_spawn_encounter",
        params: { p_channel: "streamer", p_poke: "bram", p_max_health: 48, p_kind: "foe", p_duration_seconds: null },
      },
    ]);
  });

  it("maps one attack RPC call to the game result", async () => {
    const calls: Array<{ name: string; params: unknown }> = [];
    const client = {
      rpc: async (name: string, params: unknown) => {
        calls.push({ name, params });
        return {
          data: {
            outcome: "hit",
            damage: 8,
            health: 42,
            maxHealth: 50,
            poke: "bram",
            kind: "foe",
          },
          error: null,
        };
      },
    } as unknown as SupabaseClient;
    const store = new SupabaseGameStore(client);

    const result = await store.attack({
      channel: "streamer",
      damage: 8,
      twitchId: "1234",
      username: "viewer",
    });

    expect(calls).toEqual([
      {
        name: "fe_attack_encounter",
        params: {
          p_channel: "streamer",
          p_damage: 8,
          p_twitch_id: "1234",
          p_username: "viewer",
        },
      },
    ]);
    expect(result).toEqual({
      outcome: "hit",
      damage: 8,
      health: 42,
      maxHealth: 50,
      poke: "bram",
      kind: "foe",
    });
  });

  it("throws instead of acknowledging a failed gameplay transaction", async () => {
    const client = {
      rpc: async () => ({
        data: null,
        error: new Error("database unavailable"),
      }),
    } as unknown as SupabaseClient;
    const store = new SupabaseGameStore(client);

    await expect(
      store.claimWelcomePack({
        channel: "streamer",
        poke: "bulbasaur",
        twitchId: "1234",
        username: "viewer",
      }),
    ).rejects.toThrow("database unavailable");
  });

  it("maps a welcome-pack RPC result", async () => {
    const client = {
      rpc: async () => ({
        data: { granted: true, poke: "bulbasaur" },
        error: null,
      }),
    } as unknown as SupabaseClient;
    const store = new SupabaseGameStore(client);

    await expect(
      store.claimWelcomePack({
        channel: "streamer",
        poke: "bulbasaur",
        twitchId: "1234",
        username: "viewer",
      }),
    ).resolves.toEqual({ granted: true, poke: "bulbasaur" });
  });
});
