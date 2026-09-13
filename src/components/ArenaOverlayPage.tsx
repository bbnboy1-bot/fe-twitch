"use client";

import { useCallback, useEffect, useState } from "react";

import { ArenaView, type ArenaOptions } from "@/features/arena/ArenaView";
import { type RosterEntry, parseRoster } from "@/features/arena/roster";
import type { ActivePoke } from "@/features/overlay/model";
import { useOverlayRealtime } from "@/features/overlay/use-overlay-realtime";

const ROSTER_REFRESH_MS = 5 * 60_000;

export default function ArenaOverlayPage({
  channel,
  overlayId,
  initialPoke,
  initialRoster,
  rosterLimit,
  options,
}: {
  channel: string;
  overlayId: string;
  initialPoke: ActivePoke | null;
  initialRoster: RosterEntry[];
  rosterLimit: number;
  options: ArenaOptions;
}) {
  const { connection, poke } = useOverlayRealtime({ channel, initialPoke, overlayId });
  const [roster, setRoster] = useState<RosterEntry[]>(initialRoster);

  const refreshRoster = useCallback(async () => {
    try {
      const res = await fetch(`/api/overlays/${overlayId}/arena-roster?limit=${rosterLimit}`, { cache: "no-store" });
      if (!res.ok) return;
      const next = parseRoster(await res.json());
      if (next.length) setRoster(next);
    } catch {
      // Keep the previous roster; the arena is cosmetic.
    }
  }, [overlayId, rosterLimit]);

  useEffect(() => {
    const id = setInterval(() => void refreshRoster(), ROSTER_REFRESH_MS);
    return () => clearInterval(id);
  }, [refreshRoster]);

  // A recruit may change someone's champion, and brand-new players should walk in.
  const onRecruit = useCallback(() => {
    setTimeout(() => void refreshRoster(), 1500);
  }, [refreshRoster]);

  const showConnectionBadge = connection === "reconnecting" || connection === "failed";

  return (
    <main className="overlay-viewport arena-viewport" data-testid="arena-overlay">
      <ArenaView poke={poke} roster={roster} options={options} onRecruit={onRecruit} />
      {showConnectionBadge ? (
        <span className="overlay-connection" data-connection={connection} role="status">
          {connection}
        </span>
      ) : null}
    </main>
  );
}
