import { pickChampion } from "@/features/units/duel";
import type { Unit } from "@/features/units/model";
import { getUnitById } from "@/features/units/roster";

/** One viewer who has recruited in this channel, with everything they own. */
export type RosterEntry = {
  user: string;
  units: string[];
  /** Most recent recruit time (ISO). */
  at: string;
};

export const DEFAULT_ROSTER_LIMIT = 40;
export const MAX_ROSTER_LIMIT = 200;

export function clampRosterLimit(value: string | number | undefined): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : value;
  if (!n || !Number.isFinite(n)) return DEFAULT_ROSTER_LIMIT;
  return Math.max(1, Math.min(MAX_ROSTER_LIMIT, n));
}

export function parseRoster(value: unknown): RosterEntry[] {
  if (!Array.isArray(value)) return [];
  const out: RosterEntry[] = [];
  for (const row of value) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    if (typeof r.user !== "string" || !r.user) continue;
    const units = Array.isArray(r.units) ? r.units.filter((u): u is string => typeof u === "string") : [];
    out.push({ user: r.user, units, at: typeof r.at === "string" ? r.at : "" });
  }
  return out;
}

/** The unit a viewer fields, by the same rule the worker uses (`pickChampion`). */
export function championIdFor(unitIds: string[]): string | null {
  const units = unitIds.map((id) => getUnitById(id)).filter((u): u is Unit => Boolean(u));
  return pickChampion(units)?.id ?? null;
}

// eslint-disable-next-line no-unused-vars
type UntypedRpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
type RosterClient = { rpc: unknown };

/** Server-side / API fetch. Returns [] on any failure so the arena still renders. */
export async function fetchArenaRoster(client: RosterClient, channel: string, limit = DEFAULT_ROSTER_LIMIT): Promise<RosterEntry[]> {
  try {
    // fe_arena_roster is newer than the generated Database types.
    const rpc = (client.rpc as UntypedRpc).bind(client);
    const { data, error } = await rpc("fe_arena_roster", { p_channel: channel, p_limit: clampRosterLimit(limit) });
    if (error) return [];
    return parseRoster(data);
  } catch {
    return [];
  }
}
