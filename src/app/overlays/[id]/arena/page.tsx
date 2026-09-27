import { notFound } from "next/navigation";

import ArenaOverlayPage from "@/components/ArenaOverlayPage";
import { clampRosterLimit, fetchArenaRoster } from "@/features/arena/roster";
import { loadOverlay } from "@/features/overlay/loader";
import { getActivePoke, getOverlayChannel } from "@/features/overlay/queries";
import { getChannelNames } from "@/features/units/channel-names";
import { createPublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

function parseScale(value: string | undefined): number {
  const n = value ? Number.parseFloat(value) : NaN;
  return Number.isFinite(n) ? Math.max(0.5, Math.min(2, n)) : 1;
}

/**
 * Arena overlay: a second OBS browser source (wide strip, e.g. 1200x100)
 * showing viewers' champions on the field. Same overlay id as the HP card.
 *
 * Query options: ?names=all|fighters|none  ?max=<roster size>  ?scale=0.5..2  ?debug=1
 */
export default async function ArenaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ debug?: string; names?: string; max?: string; scale?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const result = await loadOverlay(id, { getChannel: getOverlayChannel, getPoke: getActivePoke });
  if (result.status === "missing") notFound();

  const rosterLimit = clampRosterLimit(query.max);
  const [roster, names] = await Promise.all([
    fetchArenaRoster(createPublicClient(), result.channel, rosterLimit),
    getChannelNames(result.channel),
  ]);
  const labelMode = query.names === "fighters" || query.names === "none" ? query.names : "all";

  return (
    <ArenaOverlayPage
      channel={result.channel}
      overlayId={id}
      initialPoke={result.initialPoke}
      initialRoster={roster}
      rosterLimit={rosterLimit}
      names={names}
      options={{ names: labelMode, scale: parseScale(query.scale), debug: query.debug === "1" }}
    />
  );
}
