import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AttackInput,
  AttackResult,
  GameStore,
  WelcomePackInput,
} from "./game";

export class SupabaseGameStore implements GameStore {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async ensureEncounter(input: { channel: string; poke: string }) {
    const { error } = await this.client.rpc("ensure_active_poke", {
      p_channel: input.channel,
      p_poke: input.poke,
    });

    if (error) {
      throw error;
    }
  }

  async getStatus(channel: string) {
    const { data, error } = await this.client
      .from("active_pokes")
      .select("health,poke")
      .eq("channel", channel)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data ? { health: data.health, poke: data.poke } : null;
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
    const { data, error } = await this.client.rpc("process_poke_attack", {
      p_channel: input.channel,
      p_damage: input.damage,
      p_next_poke: input.nextPoke,
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