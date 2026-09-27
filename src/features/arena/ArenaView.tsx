"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import type { ActivePoke } from "@/features/overlay/model";
import { type ChannelNames, DEFAULT_CHANNEL_NAMES, unitDisplayName } from "@/features/units/names";
import { getUnitById } from "@/features/units/roster";

import { ArenaBackground } from "./ArenaBackground";
import { ArenaSprite, type SpriteAction } from "./ArenaSprite";
import { type ArenaEvent, unseenArenaEvents } from "./events";
import { type RosterEntry, championIdFor } from "./roster";
import { ARENA, baseSpriteSize, crowdScale, formationX, laneFor, orderFighters, pickWander, shouldLabel } from "./simulation";

export type ArenaOptions = {
  names: "all" | "fighters" | "none";
  /** Sprite size multiplier from the query string. */
  scale: number;
  debug: boolean;
};

type Mode = "wander" | "formation" | "duel";

type SimUnit = {
  name: string;
  unitId: string | null;
  x: number;
  facing: 1 | -1;
  moveMs: number;
  lane: number;
  mode: Mode;
  /** When to pick the next stroll (wander mode). */
  nextStepAt: number;
  /** When the current walk ends. */
  arriveAt: number;
  action: SpriteAction;
  actionUntil: number;
  /** Local HP shown during a duel replay. */
  duelHp: { hp: number; max: number } | null;
  /** Last time this unit did something, for labels and front-rank ordering. */
  lastActiveAt: number;
};

type Float = { id: number; x: number; lane: number; text: string; tone: "hit" | "crit" | "miss" | "heal" | "hurt" };
type Banner = { id: number; text: string; tone: "recruit" | "boss" | "escape" | "duel" };

const ACTION_MS: Record<SpriteAction, number> = {
  idle: 0,
  walk: 0,
  attack: 600,
  flinch: 450,
  down: 1600,
  heal: 900,
  enter: 800,
  leave: 1500,
  raid: 700,
};
const ACTING_GRACE_MS = 6_000;
const FLOAT_MS = 950;
const BANNER_MS = 3_200;
const DUEL_STRIKE_MS = 720;
const DUEL_HOLD_MS = 2_400;

function walkDuration(from: number, to: number) {
  return Math.max(300, Math.round((Math.abs(to - from) / ARENA.walkSpeed) * 1000));
}

export function ArenaView({
  poke,
  roster,
  options,
  names = DEFAULT_CHANNEL_NAMES,
  onRecruit,
}: {
  poke: ActivePoke | null;
  roster: RosterEntry[];
  options: ArenaOptions;
  /** Realm names for this channel (Phase 7). */
  names?: ChannelNames;
  // eslint-disable-next-line no-unused-vars
  onRecruit?: (player: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // The simulation lives in one long-lived Map (held in state so render may read it);
  // `tick` is bumped whenever it changes and doubles as "now" for the render pass.
  const [sim] = useState(() => new Map<string, SimUnit>());
  const lastSeen = useRef<number | null>(null);
  const [lastSeenShown, setLastSeenShown] = useState<number | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const floatSeq = useRef(0);
  const [floats, setFloats] = useState<Float[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [enemyAction, setEnemyAction] = useState<{ action: SpriteAction; until: number }>({ action: "idle", until: 0 });
  const [leaving, setLeaving] = useState<{ unitId: string; kind: "foe" | "boss"; action: SpriteAction } | null>(null);
  const [tick, rerender] = useReducer(() => Date.now(), 0);

  const later = useCallback((ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  useEffect(() => {
    const set = timers.current;
    return () => set.forEach(clearTimeout);
  }, []);

  // Measure the OBS source. The whole layout is relative to this box.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- roster -> wanderers -----------------------------------------------------------------

  const ensureUnit = useCallback((name: string, unitId: string | null): SimUnit => {
    const key = name.toLowerCase();
    let u = sim.get(key);
    if (!u) {
      const now = Date.now();
      u = {
        name,
        unitId,
        x: ARENA.wanderMin + Math.random() * (ARENA.wanderMax - ARENA.wanderMin),
        facing: Math.random() < 0.5 ? 1 : -1,
        moveMs: 0,
        lane: laneFor(key),
        mode: "wander",
        nextStepAt: now + Math.random() * 2000,
        arriveAt: 0,
        action: "idle",
        actionUntil: 0,
        duelHp: null,
        lastActiveAt: 0,
      };
      sim.set(key, u);
    } else if (unitId && u.unitId !== unitId) {
      u.unitId = unitId;
    }
    return u;
  }, [sim]);

  useEffect(() => {
    for (const entry of roster) ensureUnit(entry.user, championIdFor(entry.units));
    rerender();
  }, [roster, ensureUnit]);

  // ---- fight state -> formation --------------------------------------------------------------

  const fightActive = Boolean(poke && poke.kind !== "lull" && poke.health > 0);
  const fighters = poke?.arena?.fighters ?? [];
  const fighterKey = fighters.map((f) => `${f.name}:${f.unitId ?? ""}:${f.routed ? 1 : 0}`).join("|");

  useEffect(() => {
    const now = Date.now();
    const recency = new Map<string, number>();
    for (const f of fighters) recency.set(f.name, sim.get(f.name.toLowerCase())?.lastActiveAt ?? 0);
    const ordered = orderFighters(fighters, recency);
    const inFight = new Set<string>();
    const spriteW = size.w > 0 ? (baseSpriteSize(size.h, options.scale) * crowdScale(sim.size)) / size.w : 0.05;
    ordered.forEach((f, i) => {
      const u = ensureUnit(f.name, f.unitId);
      inFight.add(u.name.toLowerCase());
      if (u.mode === "duel") return;
      if (!fightActive) return;
      const target = formationX(i, ordered.length, spriteW);
      if (u.mode !== "formation" || Math.abs(u.x - target) > 0.002) {
        u.moveMs = walkDuration(u.x, target);
        u.x = target;
        u.facing = 1;
        u.mode = "formation";
        u.lane = Math.min(ARENA.lanes - 1, 1 + (i % (ARENA.lanes - 1)));
      }
    });
    // Anyone no longer fighting (or the fight ended) drifts back to wandering.
    for (const u of sim.values()) {
      if (u.mode === "formation" && (!fightActive || !inFight.has(u.name.toLowerCase()))) {
        u.mode = "wander";
        u.lane = laneFor(u.name.toLowerCase());
        u.nextStepAt = now + 400 + Math.random() * 2500;
      }
    }
    rerender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fightActive, fighterKey, size.w, size.h, options.scale, ensureUnit]);

  // ---- wander tick ----------------------------------------------------------------------------

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const u of sim.values()) {
        if (u.action !== "idle" && u.action !== "walk" && u.actionUntil && now >= u.actionUntil) {
          u.action = "idle";
          u.actionUntil = 0;
          changed = true;
        }
        if (u.mode !== "wander") continue;
        if (u.action === "walk" && now >= u.arriveAt) {
          u.action = "idle";
          changed = true;
        }
        if ((u.action === "idle" || u.action === "walk") && now >= u.nextStepAt) {
          const step = pickWander(u.x);
          u.x = step.targetX;
          u.facing = step.facing;
          u.moveMs = step.durationMs;
          u.arriveAt = now + step.durationMs;
          u.nextStepAt = u.arriveAt + step.pauseMs;
          u.action = "walk";
          changed = true;
        }
      }
      if (enemyAction.until && now >= enemyAction.until) {
        setEnemyAction({ action: "idle", until: 0 });
      }
      if (changed) rerender();
    }, 200);
    return () => clearInterval(id);
  }, [enemyAction.until, sim]);

  // ---- event playback -------------------------------------------------------------------------

  const act = useCallback(
    (u: SimUnit, action: SpriteAction, ms = ACTION_MS[action]) => {
      u.action = action;
      u.actionUntil = Date.now() + ms;
      u.lastActiveAt = Date.now();
      if (u.mode === "wander" && action !== "idle") {
        // Pause the stroll so the animation plays in place.
        u.nextStepAt = Math.max(u.nextStepAt, u.actionUntil + 300);
      }
    },
    [],
  );

  const float = useCallback(
    (x: number, lane: number, text: string, tone: Float["tone"]) => {
      const id = ++floatSeq.current;
      setFloats((list) => [...list, { id, x, lane, text, tone }]);
      later(FLOAT_MS, () => setFloats((list) => list.filter((f) => f.id !== id)));
    },
    [later],
  );

  const showBanner = useCallback(
    (text: string, tone: Banner["tone"]) => {
      const id = ++floatSeq.current;
      setBanner({ id, text, tone });
      later(BANNER_MS, () => setBanner((b) => (b?.id === id ? null : b)));
    },
    [later],
  );

  const enemyDo = useCallback((action: SpriteAction, ms = ACTION_MS[action]) => {
    setEnemyAction({ action, until: Date.now() + ms });
  }, []);

  const playDuel = useCallback(
    (ev: Extract<ArenaEvent, { type: "duel" }>) => {
      const a = ensureUnit(ev.a.player, ev.a.unitId);
      const b = ensureUnit(ev.b.player, ev.b.unitId);
      for (const [u, x, facing, hp] of [
        [a, ARENA.duelLeftX, 1, ev.a.maxHp],
        [b, ARENA.duelRightX, -1, ev.b.maxHp],
      ] as const) {
        u.mode = "duel";
        u.moveMs = walkDuration(u.x, x);
        u.x = x;
        u.facing = facing;
        u.lane = ARENA.lanes - 1;
        u.duelHp = { hp, max: hp };
        u.action = "walk";
        u.lastActiveAt = Date.now();
      }
      rerender();
      const approach = Math.max(a.moveMs, b.moveMs) + 300;
      ev.strikes.forEach((s, i) => {
        later(approach + i * DUEL_STRIKE_MS, () => {
          const att = s.att.toLowerCase() === a.name.toLowerCase() ? a : b;
          const def = att === a ? b : a;
          act(att, "attack");
          if (s.hit) {
            act(def, "flinch");
            if (def.duelHp) def.duelHp = { ...def.duelHp, hp: s.hpLeft };
            float(def.x, def.lane, s.crit ? `${s.damage}!` : `${s.damage}`, s.crit ? "crit" : "hurt");
          } else {
            float(def.x, def.lane, "miss", "miss");
          }
          rerender();
        });
      });
      const end = approach + ev.strikes.length * DUEL_STRIKE_MS + 200;
      later(end, () => {
        const winner = ev.winner.toLowerCase() === a.name.toLowerCase() ? a : b;
        const loser = winner === a ? b : a;
        act(loser, "down", DUEL_HOLD_MS);
        act(winner, "heal", 900);
        const wu = winner.unitId ? getUnitById(winner.unitId) : undefined;
        showBanner(`${winner.name}'s ${wu ? unitDisplayName(wu, names) : "champion"} wins the duel`, "duel");
        rerender();
      });
      later(end + DUEL_HOLD_MS, () => {
        for (const u of [a, b]) {
          u.mode = "wander";
          u.duelHp = null;
          u.lane = laneFor(u.name.toLowerCase());
          u.nextStepAt = Date.now() + 300;
          u.action = "idle";
        }
        rerender();
      });
    },
    [act, ensureUnit, float, later, names, showBanner],
  );

  const play = useCallback(
    (ev: ArenaEvent) => {
      const enemyLane = 2;
      switch (ev.type) {
        case "spawn": {
          setLeaving(null);
          enemyDo("enter");
          break;
        }
        case "hit": {
          const u = ensureUnit(ev.player, ev.unitId);
          act(u, "attack");
          enemyDo("flinch");
          float(ARENA.enemyX, enemyLane, ev.crit ? `${ev.damage}!` : `${ev.damage}`, ev.crit ? "crit" : "hit");
          break;
        }
        case "counter": {
          const u = ensureUnit(ev.player, ev.unitId);
          act(u, "flinch");
          float(u.x, u.lane, `${ev.damage}`, "hurt");
          break;
        }
        case "rout": {
          const u = ensureUnit(ev.player, ev.unitId);
          act(u, "down");
          float(u.x, u.lane, `${ev.damage}`, "hurt");
          break;
        }
        case "raid": {
          const u = ensureUnit(ev.player, ev.unitId);
          enemyDo("raid");
          later(300, () => {
            if (ev.miss) {
              float(u.x, u.lane, "miss", "miss");
            } else {
              act(u, ev.routed ? "down" : "flinch");
              float(u.x, u.lane, ev.crit ? `${ev.damage}!` : `${ev.damage}`, ev.crit ? "crit" : "hurt");
            }
            rerender();
          });
          break;
        }
        case "heal": {
          const u = ensureUnit(ev.player, ev.unitId);
          act(u, "heal");
          float(u.x, u.lane, `+${ev.hp}`, "heal");
          break;
        }
        case "recruit": {
          const u = ensureUnit(ev.player, ev.unitId);
          act(u, "attack");
          const enemy = getUnitById(ev.enemy);
          const enemyName = enemy ? unitDisplayName(enemy, names) : ev.enemy;
          setLeaving({ unitId: ev.enemy, kind: ev.boss ? "boss" : "foe", action: "down" });
          later(ACTION_MS.leave, () => setLeaving(null));
          showBanner(
            ev.boss
              ? `${ev.player} slays ${enemy ? `${enemyName} ${enemy.epithet}` : ev.enemy}`
              : ev.slain
                ? `${ev.player} slays the ${enemyName}`
                : `${ev.player} recruits ${enemyName}`,
            ev.boss ? "boss" : "recruit",
          );
          onRecruit?.(ev.player);
          break;
        }
        case "escape": {
          const enemy = getUnitById(ev.enemy);
          setLeaving({ unitId: ev.enemy, kind: "boss", action: "leave" });
          later(ACTION_MS.leave, () => setLeaving(null));
          showBanner(`${enemy ? unitDisplayName(enemy, names) : ev.enemy} escapes`, "escape");
          break;
        }
        case "duel":
          playDuel(ev);
          break;
      }
      rerender();
    },
    [act, enemyDo, ensureUnit, float, later, names, onRecruit, playDuel, showBanner],
  );

  const events = poke?.arena?.events;
  useEffect(() => {
    if (!events) return;
    if (lastSeen.current === null) {
      // First snapshot: don't replay history, just remember where we are.
      lastSeen.current = events.reduce((m, e) => Math.max(m, e.id), 0);
      setLastSeenShown(lastSeen.current);
      return;
    }
    const fresh = unseenArenaEvents(events, lastSeen.current);
    if (fresh.length === 0) return;
    lastSeen.current = fresh[fresh.length - 1].id;
    setLastSeenShown(lastSeen.current);
    // Bursts (someone spamming !fe fight) stagger slightly so each swing reads.
    fresh.forEach((ev, i) => (i === 0 ? play(ev) : later(i * 140, () => play(ev))));
  }, [events, play, later]);

  // ---- render -------------------------------------------------------------------------------------

  const units = [...sim.values()];
  const spriteSize = baseSpriteSize(size.h, options.scale) * crowdScale(units.length);
  const now = tick;
  const fighterByName = new Map(fighters.map((f) => [f.name.toLowerCase(), f]));
  const enemyId = leaving?.unitId ?? (fightActive ? poke?.poke ?? null : null);
  const enemyKind: "foe" | "boss" = leaving?.kind ?? (poke?.kind === "boss" ? "boss" : "foe");
  const enemyUnit = enemyId ? getUnitById(enemyId) : undefined;
  const enemyHp = fightActive && poke && !leaving ? { hp: Math.max(0, poke.health), max: poke.maxHealth ?? 50 } : leaving ? { hp: 0, max: 1 } : null;

  return (
    <div
      ref={hostRef}
      className="arena"
      data-testid="arena"
      data-fight={fightActive ? "true" : "false"}
      data-debug={options.debug ? "true" : "false"}
      style={{ "--arena-h": `${size.h}px` } as React.CSSProperties}
    >
      <ArenaBackground width={size.w} height={size.h} />
      <div className="arena-field">
        {units.map((u) => {
          const f = fighterByName.get(u.name.toLowerCase());
          const isFighter = Boolean(f) && fightActive;
          const acting = u.action !== "idle" && u.action !== "walk" ? true : now - u.lastActiveAt < ACTING_GRACE_MS;
          const routed = Boolean(f?.routed) && fightActive && u.mode !== "duel";
          return (
            <ArenaSprite
              key={u.name.toLowerCase()}
              name={u.name}
              unitId={u.unitId}
              x={u.x}
              lane={u.lane}
              facing={u.facing}
              size={spriteSize}
              moveMs={u.moveMs}
              action={routed && u.action === "idle" ? "down" : u.action}
              showName={shouldLabel(units.length, isFighter, acting, options.names)}
              hp={u.duelHp ?? (isFighter && f && f.maxHp > 0 ? { hp: f.hp, max: f.maxHp } : null)}
              routed={routed}
              dim={fightActive && !isFighter && u.mode === "wander" && units.length > 6}
            />
          );
        })}
        {enemyId ? (
          <ArenaSprite
            key={`enemy:${enemyId}`}
            name={enemyUnit ? unitDisplayName(enemyUnit, names) : enemyId}
            unitId={enemyId}
            x={ARENA.enemyX}
            lane={2}
            facing={-1}
            size={spriteSize * (enemyKind === "boss" ? 1.55 : 1.15)}
            moveMs={0}
            action={leaving ? leaving.action : enemyAction.action}
            showName
            hp={enemyHp}
            role={enemyKind === "boss" ? "boss" : "enemy"}
            epithet={enemyKind === "boss" ? enemyUnit?.epithet ?? null : null}
          />
        ) : null}
        {floats.map((fl) => (
          <span
            key={fl.id}
            className="arena-float"
            data-tone={fl.tone}
            style={{ left: `${fl.x * 100}%`, "--lane": fl.lane, "--unit-size": `${spriteSize}px` } as React.CSSProperties}
          >
            {fl.text}
          </span>
        ))}
      </div>
      {banner ? (
        <div key={banner.id} className="arena-banner" data-tone={banner.tone} role="status">
          {banner.text}
        </div>
      ) : null}
      {!fightActive && !leaving && !banner ? <div className="arena-quiet">The field is quiet</div> : null}
      {options.debug ? (
        <output className="arena-debug">
          {size.w}x{size.h} | {units.length} units | {fighters.length} fighting | fight={String(fightActive)} | lastEvent={lastSeenShown ?? "-"}
        </output>
      ) : null}
    </div>
  );
}
