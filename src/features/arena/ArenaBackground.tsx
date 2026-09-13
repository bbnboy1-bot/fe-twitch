"use client";

import { useMemo } from "react";

/**
 * Original, code-drawn pixel-art ruins: dusk sky, misty hills, the broken
 * walls and pillars of a fallen keep along the skyline, and a cracked
 * flagstone floor with moss creeping through. Everything is quantised to a
 * pixel grid derived from the viewport height so it reads as pixel art at
 * 100px tall or 400px tall. Palette follows the site theme (midnight steel,
 * gilt) with cold stone and a muted moss green.
 */

const PALETTE = {
  skyTop: "oklch(0.15 0.03 258)",
  skyMid: "oklch(0.19 0.035 258)",
  skyLow: "oklch(0.25 0.05 262)",
  horizon: "oklch(0.33 0.06 70)",
  moon: "oklch(0.86 0.12 84)",
  moonShade: "oklch(0.7 0.11 80)",
  star: "oklch(0.9 0.04 85)",
  hillBack: "oklch(0.27 0.045 258)",
  hillFront: "oklch(0.23 0.04 256)",
  stone: "oklch(0.36 0.025 252)",
  stoneLight: "oklch(0.44 0.025 250)",
  stoneDark: "oklch(0.28 0.025 254)",
  mortar: "oklch(0.24 0.025 254)",
  floor: "oklch(0.33 0.02 250)",
  floorLight: "oklch(0.38 0.02 248)",
  floorDark: "oklch(0.27 0.02 252)",
  crack: "oklch(0.2 0.02 254)",
  moss: "oklch(0.36 0.075 140)",
  mossDark: "oklch(0.3 0.07 142)",
  mossLight: "oklch(0.44 0.08 135)",
  ember: "oklch(0.7 0.16 45)",
};

/** Small deterministic PRNG so the ruins are identical on every render. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const HORIZON_FRACTION = 0.34;

type Rect = { x: number; y: number; w: number; h: number; fill: string };

function buildField(width: number, height: number): { rects: Rect[]; px: number } {
  const px = Math.max(2, Math.round(height / 34));
  const cols = Math.ceil(width / px);
  const rows = Math.ceil(height / px);
  const horizonRow = Math.round(rows * HORIZON_FRACTION);
  const rects: Rect[] = [];
  const rng = mulberry32(0x5eed + cols * 31 + rows);
  const cell = (c: number, r: number, fill: string) => {
    if (c < 0 || c >= cols || r < 0 || r >= rows) return;
    rects.push({ x: c * px, y: r * px, w: px, h: px, fill });
  };

  // Sky in four flat bands (pixel-art gradient).
  const bands = [PALETTE.skyTop, PALETTE.skyMid, PALETTE.skyLow, PALETTE.horizon];
  for (let b = 0; b < bands.length; b++) {
    const y0 = Math.round((horizonRow * b) / bands.length);
    const y1 = Math.round((horizonRow * (b + 1)) / bands.length);
    rects.push({ x: 0, y: y0 * px, w: width, h: (y1 - y0) * px + px, fill: bands[b] });
  }

  // Stars: sparse, only in the upper half of the sky.
  const starCount = Math.round(cols / 18);
  for (let i = 0; i < starCount; i++) {
    cell(Math.floor(rng() * cols), Math.floor(rng() * Math.max(1, horizonRow * 0.55)), PALETTE.star);
  }

  // A small gilt moon, top left, never behind the enemy.
  const moonR = Math.max(2, Math.round(rows * 0.09));
  const moonCx = Math.round(cols * 0.08);
  const moonCy = Math.max(moonR + 1, Math.round(horizonRow * 0.35));
  for (let dy = -moonR; dy <= moonR; dy++) {
    for (let dx = -moonR; dx <= moonR; dx++) {
      if (dx * dx + dy * dy > moonR * moonR) continue;
      const shade = dx > moonR * 0.35 && dy > -moonR * 0.2;
      cell(moonCx + dx, moonCy + dy, shade ? PALETTE.moonShade : PALETTE.moon);
    }
  }

  // Misty hills: two stepped silhouettes from summed sines, quantised to the grid.
  const hill = (seed: number, amp: number, fill: string, base: number) => {
    for (let c = 0; c < cols; c++) {
      const t = c / cols;
      const h =
        Math.sin(t * 9 + seed) * 0.5 + Math.sin(t * 23 + seed * 2.3) * 0.3 + Math.sin(t * 47 + seed * 5.1) * 0.2;
      const top = Math.round(horizonRow - base - (h + 1) * amp);
      rects.push({ x: c * px, y: top * px, w: px, h: (horizonRow - top + 1) * px, fill });
    }
  };
  hill(1.3, Math.max(1, rows * 0.09), PALETTE.hillBack, Math.max(1, Math.round(rows * 0.04)));
  hill(4.1, Math.max(1, rows * 0.06), PALETTE.hillFront, 0);

  // ---- The fallen keep: wall stubs and pillars standing on the horizon line. ----
  const wallBase = horizonRow; // walls sit on the floor edge
  const stoneAt = (c: number, r: number, light: number) =>
    cell(c, r, light < 0.15 ? PALETTE.stoneLight : light > 0.85 ? PALETTE.stoneDark : PALETTE.stone);

  // Wall segments: a run of columns with a crumbled top edge and the odd window.
  const wall = (c0: number, len: number, tallest: number) => {
    const floor = Math.max(2, Math.round(tallest * 0.45));
    let h = Math.max(floor, Math.round(tallest * (0.75 + rng() * 0.25)));
    for (let c = c0; c < c0 + len; c++) {
      // crumble: heights drift by at most one row per column, never below the stub height
      h = Math.max(floor, Math.min(tallest, h + (rng() < 0.25 ? (rng() < 0.5 ? -1 : 1) : 0)));
      if (rng() < 0.05) continue; // a missing column = a breach
      for (let r = wallBase - h + 1; r <= wallBase; r++) {
        // brick courses three rows high; vertical joints stagger every other course
        const depth = wallBase - r;
        const course = Math.floor(depth / 3);
        const mortar = depth % 3 === 2 || (c + (course % 2) * 3) % 6 === 0;
        if (mortar) cell(c, r, PALETTE.mortar);
        else stoneAt(c, r, rng());
      }
      // an arched window through the taller stretches
      if (h >= 5 && (c - c0) % 9 === 4) {
        for (let r = wallBase - h + 3; r <= wallBase - 2; r++) cell(c, r, PALETTE.skyLow);
        cell(c, wallBase - h + 2, PALETTE.skyMid);
      }
    }
  };

  // A pillar: narrow, with a wider capital, sometimes snapped short.
  const pillar = (c: number, h: number, snapped: boolean) => {
    for (let r = wallBase - h + 1; r <= wallBase; r++) {
      stoneAt(c, r, 0.1);
      stoneAt(c + 1, r, rng() * 0.8);
      stoneAt(c + 2, r, 0.9);
    }
    if (!snapped) {
      for (let d = -1; d <= 3; d++) cell(c + d, wallBase - h, PALETTE.stoneLight);
      for (let d = 0; d <= 2; d++) cell(c + d, wallBase, PALETTE.stoneLight);
    } else {
      cell(c + Math.floor(rng() * 3), wallBase - h, PALETTE.stoneDark);
      cell(c + 1, wallBase - h + 1, PALETTE.stoneDark);
    }
  };

  const tall = Math.max(5, Math.round(rows * 0.3));
  const positions = [0.14, 0.31, 0.47, 0.6, 0.74, 0.95];
  positions.forEach((p, i) => {
    const c0 = Math.round(cols * p);
    if (i % 2 === 0) {
      wall(c0, Math.max(6, Math.round(cols * (0.07 + rng() * 0.06))), tall);
    } else {
      pillar(c0, Math.max(3, Math.round(tall * (0.55 + rng() * 0.6))), rng() < 0.5);
      if (rng() < 0.7) pillar(c0 + Math.max(4, Math.round(cols * 0.025)), Math.max(2, Math.round(tall * (0.3 + rng() * 0.5))), true);
    }
  });
  // One surviving arch, left of centre, so the skyline reads as a gateway.
  {
    const ac = Math.round(cols * 0.4);
    const span = Math.max(4, Math.round(cols * 0.03));
    const ah = Math.min(tall + 2, Math.max(5, Math.round(rows * 0.3)));
    for (let r = wallBase - ah + 1; r <= wallBase; r++) {
      stoneAt(ac - 1, r, 0.1);
      stoneAt(ac, r, rng());
      stoneAt(ac + span, r, rng());
      stoneAt(ac + span + 1, r, 0.9);
    }
    for (let d = 0; d <= span; d++) {
      const lift = Math.round(Math.sin((d / span) * Math.PI) * 2);
      stoneAt(ac + d, wallBase - ah + 1 - lift, 0.1);
      if (d > 0 && d < span) stoneAt(ac + d, wallBase - ah + 2 - lift, rng());
    }
  }

  // ---- Floor: cracked flagstones with moss in the gaps. ----
  rects.push({ x: 0, y: horizonRow * px, w: width, h: height - horizonRow * px, fill: PALETTE.floor });
  const tile = Math.max(4, Math.round(rows * 0.15));
  for (let r = horizonRow + 1; r < rows; r++) {
    const rowIndex = Math.floor((r - horizonRow) / tile);
    const offset = (rowIndex % 2) * Math.floor(tile / 2);
    for (let c = 0; c < cols; c++) {
      const localR = (r - horizonRow) % tile;
      const localC = (c + offset) % tile;
      const tileSeed = mulberry32(rowIndex * 7919 + Math.floor((c + offset) / tile) * 104729 + cols)();
      if (tileSeed < 0.07) {
        // missing slab: moss and earth
        cell(c, r, tileSeed < 0.03 ? PALETTE.mossDark : PALETTE.moss);
        continue;
      }
      if (localR === 0 || localC === 0) cell(c, r, PALETTE.floorDark);
      else if (tileSeed > 0.8 && (localR + localC) % 3 === 0) cell(c, r, PALETTE.floorLight);
    }
  }
  // Cracks: short staggered runs of dark pixels.
  const crackCount = Math.round(cols / 10);
  for (let i = 0; i < crackCount; i++) {
    let c = Math.floor(rng() * cols);
    let r = horizonRow + 1 + Math.floor(rng() * (rows - horizonRow - 2));
    const len = 3 + Math.floor(rng() * 5);
    for (let k = 0; k < len; k++) {
      cell(c, r, PALETTE.crack);
      c += rng() < 0.6 ? 1 : 0;
      r += rng() < 0.5 ? 1 : 0;
    }
  }
  // Moss tufts between slabs, denser up front.
  const tufts = Math.round(cols * (rows - horizonRow) * 0.035);
  for (let i = 0; i < tufts; i++) {
    const c = Math.floor(rng() * cols);
    const r = horizonRow + 1 + Math.floor(Math.pow(rng(), 0.7) * (rows - horizonRow - 1));
    cell(c, r, rng() < 0.6 ? PALETTE.moss : PALETTE.mossLight);
  }

  // Rubble at the foot of the ruins and a couple of toppled column drums.
  const rubble = Math.round(cols * 0.35);
  for (let i = 0; i < rubble; i++) {
    const c = Math.floor(rng() * cols);
    const r = horizonRow + 1 + Math.floor(Math.pow(rng(), 2.2) * (rows - horizonRow - 1));
    cell(c, r, rng() < 0.5 ? PALETTE.stoneDark : PALETTE.stone);
    if (rng() < 0.4) cell(c + 1, r, PALETTE.stoneLight);
  }
  for (const p of [0.22, 0.68]) {
    const c0 = Math.round(cols * p);
    const r = horizonRow + 2 + Math.floor(rng() * Math.max(1, (rows - horizonRow) * 0.3));
    const len = Math.max(3, Math.round(cols * 0.02));
    for (let k = 0; k < len; k++) {
      cell(c0 + k, r, k === 0 || k === len - 1 ? PALETTE.stoneDark : PALETTE.stone);
      cell(c0 + k, r + 1, PALETTE.stoneDark);
    }
    cell(c0 + 1, r - 1, PALETTE.stoneLight);
  }
  // A few embers where a brazier once stood, right of the arch, low down.
  for (let i = 0; i < 4; i++) {
    cell(Math.round(cols * 0.55) + Math.floor(rng() * 4), rows - 2 - Math.floor(rng() * 3), PALETTE.ember);
  }

  // Foreground shadow line at the very bottom.
  rects.push({ x: 0, y: height - px, w: width, h: px, fill: PALETTE.floorDark });

  return { rects, px };
}

export function ArenaBackground({ width, height }: { width: number; height: number }) {
  const { rects } = useMemo(() => buildField(Math.max(1, width), Math.max(1, height)), [width, height]);
  if (width < 2 || height < 2) return null;
  return (
    <svg
      className="arena-bg"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
      ))}
    </svg>
  );
}
