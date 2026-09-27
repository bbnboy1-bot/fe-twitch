import type { SupabaseClient } from "@supabase/supabase-js";

import type { ArenaState } from "@/features/arena/events";
import { type GameTiming, timingFromRow } from "@/features/encounters/timing";
import { type ChannelNames, parseChannelNames } from "@/features/units/names";

import type {
  AttackInput,
  AttackResult,
  GameStore,
  SpawnInput,
  WelcomePackInput,
} from "./game";

export class SupabaseGameStore implements GameStore {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async spawnEncounter(input: SpawnInput) {
    const { error } = await this.client.rpc("fe_spawn_encounter", {
      p_channel: input.channel,
      p_poke: input.poke,
      p_max_health: input.maxHealth,
      p_kind: input.kind,
      p_duration_seconds: input.durationSeconds,
    });
    if (error) throw error;
  }

  async logBattle(channel: string, line: string) {
    const { error } = await this.client.rpc("fe_log_battle", { p_channel: channel, p_line: line });
    if (error) throw error;
  }

  async getChannelNames(channel: string): Promise<ChannelNames> {
    const { data, error } = await this.client
      .from("channel_settings")
      .select("unit_name_mode,unit_names")
      .eq("channel", channel)
      .maybeSingle();
    if (error) throw error;
    return parseChannelNames(data ? { mode: data.unit_name_mode, custom: data.unit_names } : null);
  }

  async getGameTiming(channel: string): Promise<GameTiming> {
    const { data, error } = await this.client
      .from("channel_settings")
      .select("boss_min_minutes,boss_max_minutes,creatures_enabled,creature_min_minutes,creature_max_minutes")
      .eq("channel", channel)
      .maybeSingle();
    if (error) throw error;
    return timingFromRow(data as Record<string, unknown> | null);
  }

  async getChampionChoice(input: { channel: string; user: string }): Promise<string | null> {
    const { data, error } = await this.client
      .from("player_champions")
      .select("unit_id")
      .eq("channel", input.channel)
      .eq("user", input.user)
      .maybeSingle();
    if (error) throw error;
    return (data?.unit_id as string | null) ?? null;
  }

  async setChampion(input: { channel: string; user: string; unitId: string | null }): Promise<boolean> {
    const { data, error } = await this.client.rpc("fe_set_champion", {
      p_channel: input.channel,
      p_user: input.user,
      p_unit: input.unitId,
    });
    if (error) throw error;
    return data === true;
  }

  async chooseLord(input: { channel: string; user: string; lordId: string; twitchId: string }): Promise<{ previous: string | null; first: boolean; same: boolean }> {
    const { data, error } = await this.client.rpc("fe_choose_lord", {
      p_channel: input.channel,
      p_user: input.user,
      p_lord: input.lordId,
      p_twitch_id: input.twitchId,
    });
    if (error) throw error;
    return data as { previous: string | null; first: boolean; same: boolean };
  }

  async syncArena(channel: string, arena: ArenaState) {
    const { error } = await this.client.rpc("fe_arena_sync", { p_channel: channel, p_arena: arena });
    if (error) throw error;
  }

  async endEncounter(channel: string) {
    const { error } = await this.client.rpc("fe_end_encounter", { p_channel: channel });
    if (error) throw error;
  }

  async useStaff(input: { channel: string; user: string }) {
    const { data, error } = await this.client.rpc("fe_use_staff", {
      p_channel: input.channel,
      p_user: input.user,
    });
    if (error) throw error;
    return data as { kind: string; uses: number } | null;
  }

  async getStatus(channel: string) {
    const { data, error } = await this.client
      .from("active_pokes")
      .select("health,max_health,poke,kind")
      .eq("channel", channel)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data
      ? { health: data.health, maxHealth: data.max_health, poke: data.poke, kind: data.kind }
      : null;
  }

  async getLastCatch(channel: string) {
    const { data, error } = await this.client
      .from("collections")
      .select("poke,user")
      .eq("channel", channel)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data ? { poke: data.poke, username: data.user } : null;
  }

  async attack(input: AttackInput): Promise<AttackResult> {
    const { data, error } = await this.client.rpc("fe_attack_encounter", {
      p_channel: input.channel,
      p_damage: input.damage,
      p_twitch_id: input.twitchId,
      p_username: input.username,
    });

    if (error) {
      throw error;
    }

    return data as AttackResult;
  }

  async claimWelcomePack(
    input: WelcomePackInput,
  ): Promise<{ granted: boolean; poke?: string }> {
    const { data, error } = await this.client.rpc("claim_welcome_pack", {
      p_channel: input.channel,
      p_poke: input.poke,
      p_twitch_id: input.twitchId,
      p_username: input.username,
    });

    if (error) {
      throw error;
    }

    return data as { granted: boolean; poke?: string };
  }

  async getUserUnitIds(input: { channel: string; user: string }) {
    const { data, error } = await this.client
      .from("collections")
      .select("poke")
      .eq("channel", input.channel)
      .eq("user", input.user);
    if (error) throw error;
    return (data ?? []).map((row: { poke: string }) => row.poke);
  }

  async earnGold(input: { channel: string; user: string; amount: number }) {
    const { data, error } = await this.client.rpc("fe_earn_gold", {
      p_channel: input.channel,
      p_user: input.user,
      p_amount: input.amount,
    });
    if (error) throw error;
    return data as number;
  }

  async getGold(input: { channel: string; user: string }) {
    const { data, error } = await this.client
      .from("wallets")
      .select("gold")
      .eq("channel", input.channel)
      .eq("user", input.user)
      .maybeSingle();
    if (error) throw error;
    return data?.gold ?? 0;
  }

  async buyWeapon(input: {
    channel: string;
    user: string;
    kind: string;
    price: number;
    uses: number;
  }) {
    const { data, error } = await this.client.rpc("fe_buy_weapon", {
      p_channel: input.channel,
      p_user: input.user,
      p_kind: input.kind,
      p_price: input.price,
      p_uses: input.uses,
    });
    if (error) throw error;
    return data as { ok: boolean; gold: number };
  }

  async useEquippedWeapon(input: { channel: string; user: string }) {
    const { data, error } = await this.client.rpc("fe_use_equipped_weapon", {
      p_channel: input.channel,
      p_user: input.user,
    });
    if (error) throw error;
    return data as { kind: string; uses: number } | null;
  }
}
