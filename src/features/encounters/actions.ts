"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import { normalizeTiming } from "./timing";

export type TimingState = { status: "idle" | "success" | "error"; message?: string };

/** Saves the streamer's boss/creature timing. The bot picks it up within a minute. */
export async function saveGameTimingAction(_state: TimingState, formData: FormData): Promise<TimingState> {
  const t = normalizeTiming({
    bossMinMinutes: formData.get("bossMin"),
    bossMaxMinutes: formData.get("bossMax"),
    creaturesEnabled: formData.get("creatures") === "on",
    creatureMinMinutes: formData.get("creatureMin"),
    creatureMaxMinutes: formData.get("creatureMax"),
  });
  try {
    const supabase = await createClient();
    // fe_set_game_settings is newer than the generated Database types.
    const rpc = (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>).bind(supabase);
    const { error } = await rpc("fe_set_game_settings", {
      p_boss_min: t.bossMinMinutes,
      p_boss_max: t.bossMaxMinutes,
      p_creatures: t.creaturesEnabled,
      p_creature_min: t.creatureMinMinutes,
      p_creature_max: t.creatureMaxMinutes,
    });
    if (error) {
      console.error("fe_set_game_settings failed", error);
      return { status: "error", message: "Could not save. Are you signed in as the streamer?" };
    }
    revalidatePath("/setup");
    return { status: "success", message: "Saved. The bot applies it within a minute." };
  } catch {
    return { status: "error", message: "Could not save timing." };
  }
}
