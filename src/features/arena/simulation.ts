/**
 * Pure layout math for the arena overlay. Everything here is deterministic
 * given its inputs (an rng is injected where randomness is wanted) so the
 * view can stay thin and this can be unit tested.
 *
 * Coordinates are fractions of the arena width (0..1) unless noted.
 */

export const ARENA = {
  /** Where the enemy stands, as a fraction of width. */
  enemyX: 0.9,
  /** Wanderers roam between these. */
  wanderMin: 0.03,
  wanderMax: 0.6,
  /** Fighters line up between these, front rank nearest the enemy. */
  formationMin: 0.12,
  formationMax: 0.66,
  /** Duelists square off around the centre. */
  duelLeftX: 0.4,
  duelRightX: 0.52,
  /** Walking speed in widths per second (slow stroll). */
  walkSpeed: 0.035,
  pauseMinMs: 1_200,
  pauseMaxMs: 4_500,
  /** Sprites per row before the crowd starts shrinking. */
  crowdComfort: 16,
  minCrowdScale: 0.55,
  /** Number of depth lanes; lane 0 is furthest back. */
  lanes: 4,
};

/** Sprite size in px for a given viewport height, before crowd scaling. */
export function baseSpriteSize(height: number, scale = 1): number {
  return Math.round(Math.max(30, Math.min(120, height * 0.6)) * scale);
}

/** Shrink everyone a little when the field is packed. */
export function crowdScale(count: number): number {
  if (count <= ARENA.crowdComfort) return 1;
  return Math.max(ARENA.minCrowdScale, Math.sqrt(ARENA.crowdComfort / count));
}

/** Stable pseudo-random lane per name so the same viewer always stands at the same depth. */
export function laneFor(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % ARENA.lanes;
}

export type WanderStep = {
  targetX: number;
  facing: 1 | -1;
  /** How long the walk takes, ms (distance / speed). */
  durationMs: number;
  /** Idle time before the next step, ms. */
  pauseMs: number;
};

/** Choose the next stroll for an idle sprite. */
export function pickWander(currentX: number, rng: () => number = Math.random): WanderStep {
  const span = ARENA.wanderMax - ARENA.wanderMin;
  // Short hops feel like milling about; the occasional long walk keeps things moving.
  const hop = (rng() < 0.25 ? 0.4 : 0.12) * span;
  const dir = rng() < 0.5 ? -1 : 1;
  const raw = currentX + dir * hop * (0.4 + rng() * 0.6);
  const targetX = Math.min(ARENA.wanderMax, Math.max(ARENA.wanderMin, raw));
  const distance = Math.abs(targetX - currentX);
  return {
    targetX,
    facing: targetX >= currentX ? 1 : -1,
    durationMs: Math.max(300, Math.round((distance / ARENA.walkSpeed) * 1000)),
    pauseMs: Math.round(ARENA.pauseMinMs + rng() * (ARENA.pauseMaxMs - ARENA.pauseMinMs)),
  };
}

/** Where each fighter stands when lined up. Index 0 is the front rank (closest to the enemy). */
export function formationX(index: number, count: number, spriteWidthFraction: number): number {
  const span = ARENA.formationMax - ARENA.formationMin;
  const spacing = count <= 1 ? 0 : Math.min(spriteWidthFraction * 0.85, span / (count - 1));
  return ARENA.formationMax - index * spacing;
}

/** Most recently active fighters go to the front. `recency` maps name -> last event id. */
export function orderFighters<T extends { name: string }>(fighters: T[], recency: Map<string, number>): T[] {
  return [...fighters].sort((a, b) => (recency.get(b.name) ?? 0) - (recency.get(a.name) ?? 0) || a.name.localeCompare(b.name));
}

/** Names stay readable while the crowd is small; past that only the ones that matter get labels. */
export function shouldLabel(count: number, isFighter: boolean, isActing: boolean, mode: "all" | "fighters" | "none"): boolean {
  if (mode === "none") return isActing;
  if (mode === "fighters") return isFighter || isActing;
  if (count <= 24) return true;
  return isFighter || isActing;
}
