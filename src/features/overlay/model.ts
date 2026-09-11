export type EncounterKind = "foe" | "boss" | "lull";

export type ActivePoke = {
  health: number;
  poke: string;
  /** Field HP of the current enemy (Phase 3); older rows default to 50. */
  maxHealth?: number;
  kind?: EncounterKind;
  expiresAt?: string | null;
  battleLog?: string[];
  updatedAt?: string;
  lastEventKind?: string | null;
  lastEventPlayer?: string | null;
  lastEventDamage?: number | null;
  lastEventAt?: string | null;
  lastCatchPoke?: string | null;
  lastCatchPlayer?: string | null;
  lastCatchAt?: string | null;
};

export type OverlaySize = "auto" | "compact" | "standard" | "large";
export type OverlaySnapshot = {
  health: number | null;
  poke: string | null;
  maxHealth?: number | null;
  kind?: string | null;
  expiresAt?: string | null;
  battleLog?: unknown;
  updatedAt: string | null;
  lastEventKind?: string | null;
  lastEventPlayer?: string | null;
  lastEventDamage?: number | null;
  lastEventAt?: string | null;
  lastCatchPoke?: string | null;
  lastCatchPlayer?: string | null;
  lastCatchAt?: string | null;
};
export type OverlayEvent = {
  kind: "hit" | "caught" | "spawn" | "fled" | null;
  player: string | null;
  damage: number | null;
  at: string | null;
};
export type OverlayCatch = {
  poke: string | null;
  player: string | null;
  at: string | null;
};
export type OverlayState = {
  poke: ActivePoke | null;
  updatedAt: string | null;
  event: OverlayEvent;
  catch: OverlayCatch;
};

type ActivePokeChange = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
};

export const DEFAULT_MAX_HEALTH = 50;

export function getHealthPercent(health: number, maxHealth = DEFAULT_MAX_HEALTH) {
  const max = maxHealth > 0 ? maxHealth : DEFAULT_MAX_HEALTH;
  return Math.max(0, Math.min(100, (health / max) * 100));
}

export function getHealthTone(health: number, maxHealth = DEFAULT_MAX_HEALTH) {
  const pct = getHealthPercent(health, maxHealth);
  if (pct <= 30) return "low";
  if (pct <= 60) return "medium";
  return "high";
}

export function parseBattleLog(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string").slice(-6) : [];
}

export function parseEncounterKind(value: unknown): EncounterKind {
  return value === "boss" || value === "lull" ? value : "foe";
}

export function parseOverlaySize(value: string | undefined): OverlaySize {
  return value === "compact" || value === "standard" || value === "large"
    ? value
    : "auto";
}

export function applyOverlaySnapshot(
  current: OverlayState,
  snapshot: OverlaySnapshot,
): OverlayState {
  const nextTime = snapshot.updatedAt ? Date.parse(snapshot.updatedAt) : 0;
  const currentTime = current.updatedAt ? Date.parse(current.updatedAt) : 0;

  if (nextTime < currentTime) return current;
  if (snapshot.poke === null && snapshot.health === null) {
    return {
      poke: null,
      updatedAt: snapshot.updatedAt,
      event: { kind: null, player: null, damage: null, at: null },
      catch: current.catch,
    };
  }
  if (
    typeof snapshot.poke !== "string" ||
    !snapshot.poke ||
    typeof snapshot.health !== "number" ||
    !Number.isFinite(snapshot.health)
  ) {
    return current;
  }

  const k = snapshot.lastEventKind;
  const event: OverlayEvent = {
    kind: k === "hit" || k === "caught" || k === "spawn" || k === "fled" ? k : null,
    player: snapshot.lastEventPlayer ?? null,
    damage: snapshot.lastEventDamage ?? null,
    at: snapshot.lastEventAt ?? null,
  };

  // Only update the persistent catch badge when a new catch lands.
  const catch_: OverlayCatch =
    snapshot.lastCatchPoke && snapshot.lastCatchAt
      ? {
          poke: snapshot.lastCatchPoke,
          player: snapshot.lastCatchPlayer ?? null,
          at: snapshot.lastCatchAt,
        }
      : current.catch;

  return {
    poke: {
      health: snapshot.health,
      poke: snapshot.poke,
      maxHealth: typeof snapshot.maxHealth === "number" ? snapshot.maxHealth : DEFAULT_MAX_HEALTH,
      kind: parseEncounterKind(snapshot.kind),
      expiresAt: snapshot.expiresAt ?? null,
      battleLog: parseBattleLog(snapshot.battleLog),
    },
    updatedAt: snapshot.updatedAt,
    event,
    catch: catch_,
  };
}

export function applyActivePokeChange(
  current: ActivePoke | null,
  change: ActivePokeChange,
): ActivePoke | null {
  if (change.eventType === "DELETE") {
    return null;
  }

  const { health, poke, max_health, kind, expires_at, battle_log } = change.new;
  if (typeof health !== "number" || typeof poke !== "string" || !poke) {
    return current;
  }

  return {
    health,
    poke,
    maxHealth: typeof max_health === "number" ? max_health : DEFAULT_MAX_HEALTH,
    kind: parseEncounterKind(kind),
    expiresAt: typeof expires_at === "string" ? expires_at : null,
    battleLog: parseBattleLog(battle_log),
  };
}
