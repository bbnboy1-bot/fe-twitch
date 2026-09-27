/**
 * Structured battlefield events for the arena overlay (Phase 6).
 *
 * The worker appends one event per battlefield action and mirrors the current
 * encounter's fighters, then writes the whole object to `active_pokes.arena`.
 * The DB broadcast trigger ships it to `overlay:<channel>` alongside the HP
 * card snapshot. The overlay replays any event whose `id` it hasn't seen.
 */

export const ARENA_VERSION = 1;
/** How many recent events travel with each snapshot. */
export const ARENA_EVENT_LIMIT = 12;

export type ArenaFighter = {
  name: string;
  /** Champion unit id; null when the viewer has no units yet. */
  unitId: string | null;
  hp: number;
  maxHp: number;
  routed: boolean;
  damage: number;
};

export type DuelStrike = {
  /** Username of the striker. */
  att: string;
  hit: boolean;
  crit: boolean;
  damage: number;
  /** Defender HP after this strike. */
  hpLeft: number;
};

export type DuelSide = { player: string; unitId: string; maxHp: number };

export type ArenaEvent =
  | { id: number; at: string; type: "spawn"; enemy: string; kind: "foe" | "boss"; maxHp: number }
  | { id: number; at: string; type: "hit"; player: string; unitId: string | null; damage: number; crit: boolean; enemyHp: number }
  | { id: number; at: string; type: "counter"; player: string; unitId: string | null; damage: number; crit: boolean; hpLeft: number }
  | { id: number; at: string; type: "rout"; player: string; unitId: string | null; damage: number; enemy: string }
  | { id: number; at: string; type: "raid"; player: string; unitId: string | null; damage: number; crit: boolean; miss: boolean; routed: boolean }
  | { id: number; at: string; type: "heal"; player: string; unitId: string | null; hp: number }
  | { id: number; at: string; type: "recruit"; player: string; unitId: string | null; enemy: string; boss: boolean; slain?: boolean }
  | { id: number; at: string; type: "escape"; enemy: string }
  | { id: number; at: string; type: "duel"; a: DuelSide; b: DuelSide; strikes: DuelStrike[]; winner: string };

export type ArenaEventType = ArenaEvent["type"];

/** An event before the worker stamps `id`/`at` (distributes over the union). */
export type ArenaEventInput = ArenaEvent extends infer E ? (E extends ArenaEvent ? Omit<E, "id" | "at"> : never) : never;

export type ArenaState = {
  v: number;
  fighters: ArenaFighter[];
  events: ArenaEvent[];
};

export const EMPTY_ARENA: ArenaState = { v: ARENA_VERSION, fighters: [], events: [] };

const EVENT_TYPES: ReadonlySet<string> = new Set([
  "spawn",
  "hit",
  "counter",
  "rout",
  "raid",
  "heal",
  "recruit",
  "escape",
  "duel",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseFighter(value: unknown): ArenaFighter | null {
  if (!isRecord(value) || typeof value.name !== "string" || !value.name) return null;
  return {
    name: value.name,
    unitId: typeof value.unitId === "string" ? value.unitId : null,
    hp: num(value.hp),
    maxHp: num(value.maxHp),
    routed: value.routed === true,
    damage: num(value.damage),
  };
}

function parseEvent(value: unknown): ArenaEvent | null {
  if (!isRecord(value)) return null;
  const type = value.type;
  if (typeof type !== "string" || !EVENT_TYPES.has(type)) return null;
  if (typeof value.id !== "number" || !Number.isFinite(value.id)) return null;
  const base = { id: value.id, at: str(value.at) };
  const unitId = typeof value.unitId === "string" ? value.unitId : null;
  switch (type as ArenaEventType) {
    case "spawn":
      return { ...base, type: "spawn", enemy: str(value.enemy), kind: value.kind === "boss" ? "boss" : "foe", maxHp: num(value.maxHp) };
    case "hit":
      return { ...base, type: "hit", player: str(value.player), unitId, damage: num(value.damage), crit: value.crit === true, enemyHp: num(value.enemyHp) };
    case "counter":
      return { ...base, type: "counter", player: str(value.player), unitId, damage: num(value.damage), crit: value.crit === true, hpLeft: num(value.hpLeft) };
    case "rout":
      return { ...base, type: "rout", player: str(value.player), unitId, damage: num(value.damage), enemy: str(value.enemy) };
    case "raid":
      return {
        ...base,
        type: "raid",
        player: str(value.player),
        unitId,
        damage: num(value.damage),
        crit: value.crit === true,
        miss: value.miss === true,
        routed: value.routed === true,
      };
    case "heal":
      return { ...base, type: "heal", player: str(value.player), unitId, hp: num(value.hp) };
    case "recruit":
      return { ...base, type: "recruit", player: str(value.player), unitId, enemy: str(value.enemy), boss: value.boss === true, slain: value.slain === true };
    case "escape":
      return { ...base, type: "escape", enemy: str(value.enemy) };
    case "duel": {
      const side = (v: unknown): DuelSide | null =>
        isRecord(v) && typeof v.player === "string" && typeof v.unitId === "string"
          ? { player: v.player, unitId: v.unitId, maxHp: num(v.maxHp) }
          : null;
      const a = side(value.a);
      const b = side(value.b);
      if (!a || !b) return null;
      const strikes: DuelStrike[] = Array.isArray(value.strikes)
        ? value.strikes.filter(isRecord).map((s) => ({
            att: str(s.att),
            hit: s.hit === true,
            crit: s.crit === true,
            damage: num(s.damage),
            hpLeft: num(s.hpLeft),
          }))
        : [];
      return { ...base, type: "duel", a, b, strikes, winner: str(value.winner) };
    }
  }
  return null;
}

/** Tolerant parser: anything malformed is dropped rather than crashing the overlay. */
export function parseArenaState(value: unknown): ArenaState {
  if (!isRecord(value)) return EMPTY_ARENA;
  const fighters = Array.isArray(value.fighters)
    ? value.fighters.map(parseFighter).filter((f): f is ArenaFighter => f !== null)
    : [];
  const events = Array.isArray(value.events)
    ? value.events.map(parseEvent).filter((e): e is ArenaEvent => e !== null)
    : [];
  events.sort((x, y) => x.id - y.id);
  return { v: num(value.v, ARENA_VERSION), fighters, events };
}

/** Newest-last append that keeps the payload small. */
export function appendArenaEvent(events: ArenaEvent[], event: ArenaEvent): ArenaEvent[] {
  return [...events, event].slice(-ARENA_EVENT_LIMIT);
}

/** Events the overlay has not played yet, in order. */
export function unseenArenaEvents(events: ArenaEvent[], lastSeenId: number): ArenaEvent[] {
  return events.filter((e) => e.id > lastSeenId);
}
