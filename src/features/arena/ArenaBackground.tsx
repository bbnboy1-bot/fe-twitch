"use client";

import { useMemo } from "react";

/**
 * Original, code-drawn pixel-art field: dusk sky, two ranks of hills, grass
 * with tufts and a trodden dirt ring where the fighting happens. Everything
 * is quantised to a pixel grid derived from the viewport height so it reads
 * as pixel art at 100px tall or 400px tall. Palette follows the site theme
 * (midnight steel, gilt) with a muted green for the ground.
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
  grass: "oklch(0.4 0.085 140)",
  grassDark: "oklch(0.34 0.08 142)",
  grassLight: "oklch(0.47 0.09 135)",
  dirt: "oklch(0.43 0.06 62)",
  dirtDark: "oklch(0.35 0.055 58)",
  edge: "oklch(0.3 0.07 145)",
};

/** Small deterministic PRNG so the field is identical on every render. */
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
    const x = Math.floor(rng() * cols);
    const y = Math.floor(rng() * Math.max(1, horizonRow * 0.55));
    rects.push({ x: x * px, y: y * px, w: px, h: px, fill: PALETTE.star });
  }

  // A small gilt moon, top left, never behind the enemy.
  const moonR = Math.max(2, Math.round(rows * 0.09));
  const moonCx = Math.round(cols * 0.08);
  const moonCy = Math.max(moonR + 1, Math.round(horizonRow * 0.35));
  for (let dy = -moonR; dy <= moonR; dy++) {
    for (let dx = -moonR; dx <= moonR; dx++) {
      if (dx * dx + dy * dy > moonR * moonR) continue;
      const shade = dx > moonR * 0.35 && dy > -moonR * 0.2;
      rects.push({ x: (moonCx + dx) * px, y: (moonCy + dy) * px, w: px, h: px, fill: shade ? PALETTE.moonShade : PALETTE.moon });
    }
  }

  // Hills: two stepped silhouettes from summed sines, quantised to the grid.
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

  // Ground.
  rects.push({ x: 0, y: horizonRow * px, w: width, h: height - horizonRow * px, fill: PALETTE.grass });
  rects.push({ x: 0, y: horizonRow * px, w: width, h: px, fill: PALETTE.edge });

  // Dirt ring: an ellipse drawn as two-pixel-thick steps, centred on the fight zone.
  const cx = cols * 0.55;
  const cy = horizonRow + (rows - horizonRow) * 0.68;
  const rx = cols * 0.42;
  const ry = (rows - horizonRow) * 0.26;
  const painted = new Set<string>();
  const paint = (c: number, r: number, fill: string) => {
    const k = `${c},${r}`;
    if (painted.has(k) || r <= horizonRow || r >= rows) return;
    painted.add(k);
    rects.push({ x: c * px, y: r * px, w: px, h: px, fill });
  };
  const steps = Math.max(48, cols * 2);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const c = Math.round(cx + Math.cos(a) * rx);
    const r = Math.round(cy + Math.sin(a) * ry);
    paint(c, r, PALETTE.dirt);
    paint(c, r + 1, PALETTE.dirt);
    paint(c + 1, r, PALETTE.dirt);
    if (Math.sin(a) > 0) paint(c, r + 2, PALETTE.dirtDark);
  }
  // Worn patch inside the ring so it reads as trodden earth, not a line.
  for (let i = 0; i < Math.round(cols * 1.2); i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * 0.9;
    paint(Math.round(cx + Math.cos(a) * rx * d), Math.round(cy + Math.sin(a) * ry * d), rng() < 0.6 ? PALETTE.dirt : PALETTE.dirtDark);
  }

  // Grass tufts, sparser near the horizon and denser up front.
  const tufts = Math.round(cols * (rows - horizonRow) * 0.06);
  for (let i = 0; i < tufts; i++) {
    const c = Math.floor(rng() * cols);
    const r = horizonRow + 1 + Math.floor(Math.pow(rng(), 0.7) * (rows - horizonRow - 1));
    const key = `${c},${r}`;
    if (painted.has(key)) continue;
    rects.push({ x: c * px, y: r * px, w: px, h: px, fill: rng() < 0.55 ? PALETTE.grassDark : PALETTE.grassLight });
  }

  // Foreground shadow line at the very bottom.
  rects.push({ x: 0, y: height - px, w: width, h: px, fill: PALETTE.grassDark });

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
