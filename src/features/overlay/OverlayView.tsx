"use client";

import { useEffect, useState } from "react";

import { GAME_NAME } from "@/config/brand";
import {
  CLASS_META,
  UnitPortraitById,
  getUnitDisplayName,
} from "@/features/units/presentation";
import { getUnitById } from "@/features/units/roster";

import {
  getHealthPercent,
  getHealthTone,
  type ActivePoke,
  type OverlayCatch,
  type OverlayEvent,
  type OverlaySize,
} from "./model";

/**
 * Battle window shown in OBS. `poke` is the current enemy unit id + HP.
 * When a "caught" event lands, the defeated unit is shown being recruited
 * for ~2.4s before the next challenger appears.
 */
export function OverlayView({
  poke,
  size,
  event,
  catch: lastCatch,
  hideCatch = false,
  hideAttack = false,
  primaryColor,
  cardColor,
  textColor,
  theme = "default",
  hideTicker = false,
}: {
  poke: ActivePoke;
  size: OverlaySize;
  event: OverlayEvent;
  catch: OverlayCatch;
  hideCatch?: boolean;
  hideAttack?: boolean;
  primaryColor?: string;
  cardColor?: string;
  textColor?: string;
  theme?: string;
  hideTicker?: boolean;
}) {
  const [recruit, setRecruit] = useState<{
    unitId: string;
    phase: "strike" | "banner";
  } | null>(null);
  const [isDamaged, setIsDamaged] = useState(false);

  useEffect(() => {
    if (event.kind === "caught" && event.at && lastCatch.poke) {
      setRecruit({ unitId: lastCatch.poke, phase: "strike" });
      const bannerTimer = setTimeout(
        () => setRecruit((prev) => (prev ? { ...prev, phase: "banner" } : null)),
        500,
      );
      const doneTimer = setTimeout(() => setRecruit(null), 2400);
      return () => {
        clearTimeout(bannerTimer);
        clearTimeout(doneTimer);
      };
    } else if (event.kind === "hit" && event.at) {
      setIsDamaged(true);
      const timer = setTimeout(() => setIsDamaged(false), 500);
      return () => clearTimeout(timer);
    }
  }, [event.at, event.kind, lastCatch.poke]);

  const maxHealth = poke.maxHealth ?? 50;
  const kind = poke.kind ?? "foe";
  const quiet = !recruit && kind === "lull";
  const displayId = recruit ? recruit.unitId : poke.poke;
  const displayHealth = recruit ? 0 : Math.max(0, Math.min(maxHealth, poke.health));
  const tone = getHealthTone(displayHealth, maxHealth);
  const unit = getUnitById(displayId);
  const feed = (poke.battleLog ?? []).slice(-3).reverse();
  const secondsLeft = useCountdown(kind === "boss" ? poke.expiresAt ?? null : null);

  const customStyles: React.CSSProperties = {};
  const hex = (v: string) => (v.startsWith("#") ? v : `#${v}`);
  if (primaryColor) {
    customStyles["--overlay-primary" as never] = hex(primaryColor);
    customStyles["--overlay-primary-border" as never] = `${hex(primaryColor)}66`;
  }
  if (cardColor) customStyles["--overlay-card" as never] = hex(cardColor);
  if (textColor) {
    customStyles["--overlay-text" as never] = hex(textColor);
    customStyles["--overlay-muted-text" as never] = `${hex(textColor)}bf`;
  }

  return (
    <article
      data-testid="overlay-card"
      data-size={size}
      data-health={tone}
      data-theme={theme}
      data-kind={kind}
      className="overlay-card"
      style={customStyles}
    >
      <figure
        className={`overlay-sprite-frame ${isDamaged ? "is-damaged" : ""} ${
          recruit ? `is-recruiting phase-${recruit.phase}` : ""
        }`}
      >
        <UnitPortraitById key={displayId} id={displayId} size="100%" className={`overlay-sprite ${quiet ? "is-quiet" : ""}`} />
      </figure>

      <div className="overlay-details">
        <div className="overlay-heading">
          <h1>
            {kind === "boss" && !recruit ? <em className="overlay-boss-tag">BOSS</em> : null}
            {quiet ? "The field is quiet" : getUnitDisplayName(displayId)}
            {unit && !quiet ? <small>{unit.epithet}</small> : null}
          </h1>
          <span>
            {quiet ? "" : `${displayHealth}/${maxHealth}`}
            {secondsLeft !== null && !recruit ? ` · ${formatCountdown(secondsLeft)}` : ""}
          </span>
        </div>
        <div className="overlay-health-track" aria-label={`${displayHealth} of ${maxHealth} health`}>
          <div className="overlay-health-fill" style={{ width: `${getHealthPercent(displayHealth, maxHealth)}%` }} />
        </div>
        {quiet ? (
          <p className="overlay-unit-class">Next foe arrives soon…</p>
        ) : unit ? (
          <p className="overlay-unit-class">{CLASS_META[unit.unitClass].label}</p>
        ) : null}
        {!hideCatch && lastCatch.poke && lastCatch.player ? (
          <p className="overlay-last-catch">
            Last: @<span>{lastCatch.player}</span> recruited {getUnitDisplayName(lastCatch.poke)}
          </p>
        ) : null}
        {!hideAttack && event.player && event.kind === "hit" ? (
          <p className="overlay-last-attack">
            Hit: @<span>{event.player}</span> (-{event.damage ?? 0} HP)
          </p>
        ) : null}
        {feed.length ? (
          <ul className="overlay-feed" aria-label="Battle feed">
            {feed.map((line, i) => (
              <li key={`${line}-${i}`} data-fresh={i === 0 ? "true" : "false"}>
                {line}
              </li>
            ))}
          </ul>
        ) : null}
        {!hideTicker && (
          <div className="overlay-ticker" role="marquee">
            <span className="overlay-ticker-text">
              {GAME_NAME} • Type !fe fight to battle • Defeat a unit to recruit it • !fe recruit to start •
            </span>
          </div>
        )}
      </div>

      {event.kind && event.at ? (
        <span key={event.at} className="overlay-event" data-kind={event.kind} role="status">
          {event.kind === "caught"
            ? `⚔ RECRUITED @${event.player}`
            : event.kind === "spawn"
              ? kind === "boss"
                ? "💀 BOSS ARRIVES"
                : "⚠ NEW FOE"
              : event.kind === "fled"
                ? "ESCAPED"
                : `-${event.damage ?? 0} @${event.player}`}
        </span>
      ) : null}
    </article>
  );
}

/** Seconds until `iso`, ticking once a second; null when there's no deadline. */
function useCountdown(iso: string | null): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!iso) {
      setLeft(null);
      return;
    }
    const deadline = Date.parse(iso);
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);
  return left;
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
