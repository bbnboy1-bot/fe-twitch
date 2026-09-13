"use client";

import { useEffect, useState } from "react";

import { UnitPortraitById } from "@/features/units/presentation";
import { getUnitById } from "@/features/units/roster";

/**
 * Art swap point. Drop `public/sprites/<unitId>.png` (any original pixel art)
 * and the arena uses it instead of the SVG portrait, no code change needed.
 * Each id is probed once per page load and remembered.
 */
const SPRITE_DIR = "/sprites";
const probes = new Map<string, Promise<boolean>>();

function probeSprite(unitId: string): Promise<boolean> {
  let p = probes.get(unitId);
  if (!p) {
    p = new Promise<boolean>((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = `${SPRITE_DIR}/${unitId}.png`;
    });
    probes.set(unitId, p);
  }
  return p;
}

function useSpriteImage(unitId: string | null): boolean {
  const [hasImage, setHasImage] = useState(false);
  useEffect(() => {
    let live = true;
    setHasImage(false);
    if (!unitId) return;
    void probeSprite(unitId).then((ok) => {
      if (live) setHasImage(ok);
    });
    return () => {
      live = false;
    };
  }, [unitId]);
  return hasImage;
}

export type SpriteAction = "idle" | "walk" | "attack" | "flinch" | "down" | "heal" | "enter" | "leave" | "raid";

export type ArenaSpriteProps = {
  name: string;
  unitId: string | null;
  /** Left position as a fraction of arena width. */
  x: number;
  /** Depth lane, 0 = back. */
  lane: number;
  facing: 1 | -1;
  size: number;
  /** ms for the current walk (0 = snap). */
  moveMs: number;
  action: SpriteAction;
  showName: boolean;
  hp?: { hp: number; max: number } | null;
  routed?: boolean;
  /** Enemy / boss styling. */
  role?: "player" | "enemy" | "boss";
  epithet?: string | null;
  dim?: boolean;
};

export function ArenaSprite({
  name,
  unitId,
  x,
  lane,
  facing,
  size,
  moveMs,
  action,
  showName,
  hp,
  routed = false,
  role = "player",
  epithet = null,
  dim = false,
}: ArenaSpriteProps) {
  const hasImage = useSpriteImage(unitId);
  const unit = unitId ? getUnitById(unitId) : undefined;
  const pct = hp && hp.max > 0 ? Math.max(0, Math.min(100, (hp.hp / hp.max) * 100)) : null;
  const tone = pct === null ? "full" : pct <= 30 ? "low" : pct <= 60 ? "mid" : "full";

  return (
    <div
      className="arena-unit"
      data-role={role}
      data-action={action}
      data-routed={routed ? "true" : "false"}
      data-dim={dim ? "true" : "false"}
      data-lane={lane}
      style={
        {
          left: `${x * 100}%`,
          "--unit-size": `${size}px`,
          "--facing": facing,
          "--lane": lane,
          "--move-ms": `${moveMs}ms`,
          zIndex: 10 + lane,
        } as React.CSSProperties
      }
    >
      <div className="arena-unit-label" data-visible={showName ? "true" : "false"}>
        <span className="arena-unit-name">{role === "player" ? name : unit?.name ?? name}</span>
        {role !== "player" && epithet ? <span className="arena-unit-epithet">{epithet}</span> : null}
        {pct !== null ? (
          <span className="arena-unit-hp" data-tone={tone} aria-label={`${hp?.hp} of ${hp?.max} HP`}>
            <span style={{ width: `${pct}%` }} />
          </span>
        ) : null}
      </div>
      <div className="arena-unit-body">
        <div className="arena-unit-art">
          {hasImage && unitId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${SPRITE_DIR}/${unitId}.png`} alt="" draggable={false} />
          ) : unitId ? (
            <UnitPortraitById id={unitId} size="100%" />
          ) : (
            <UnitPortraitById id="recruit" size="100%" />
          )}
        </div>
        <span className="arena-unit-shadow" />
      </div>
    </div>
  );
}
