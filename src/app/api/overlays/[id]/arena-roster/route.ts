import { NextResponse } from "next/server";

import { clampRosterLimit, fetchArenaRoster } from "@/features/arena/roster";
import { getOverlayChannel } from "@/features/overlay/queries";
import { createPublicClient } from "@/lib/supabase/public";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const channel = await getOverlayChannel(id);
    if (!channel) return NextResponse.json({ error: "Overlay not found" }, { status: 404, headers: NO_STORE });
    const limit = clampRosterLimit(new URL(request.url).searchParams.get("limit") ?? undefined);
    const roster = await fetchArenaRoster(createPublicClient(), channel, limit);
    return NextResponse.json(roster, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Overlay not found" }, { status: 404, headers: NO_STORE });
  }
}
