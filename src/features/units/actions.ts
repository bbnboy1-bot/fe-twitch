"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import { cleanCustomName, NAMEABLE_UNITS, type UnitNameMode } from "./names";

export type RealmNamesState = { status: "idle" | "success" | "error"; message?: string };

/** Saves the streamer's realm naming choice (mode + custom lord names). */
export async function saveRealmNamesAction(_state: RealmNamesState, formData: FormData): Promise<RealmNamesState> {
  const mode: UnitNameMode = formData.get("mode") === "original" ? "original" : "official";
  const custom: Record<string, string> = {};
  for (const unit of NAMEABLE_UNITS) {
    const clean = cleanCustomName(formData.get(`name:${unit.id}`));
    if (clean) custom[unit.id] = clean;
  }
  try {
    const supabase = await createClient();
    // fe_set_channel_settings is newer than the generated Database types.
    const rpc = (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>).bind(supabase);
    const { error } = await rpc("fe_set_channel_settings", { p_mode: mode, p_names: custom });
    if (error) {
      console.error("fe_set_channel_settings failed", error);
      return { status: "error", message: "Could not save. Are you signed in as the streamer?" };
    }
    revalidatePath("/setup");
    return { status: "success", message: "Saved. The bot picks it up within a minute; overlays on next refresh." };
  } catch {
    return { status: "error", message: "Could not save realm names." };
  }
}
