import type { Rarity, Unit, UnitClass, WeaponType } from "./model";
import { getUnitById } from "./roster";

/**
 * Original, generated-for-now visuals for units. Everything here is plain
 * SVG so the overlay never depends on an external image host. An artist can
 * later swap `ClassGlyph` for real portraits without touching callers.
 */

export const CLASS_META: Record<
  UnitClass,
  { label: string; blurb: string; hue: number }
> = {
  duelist: { label: "Duelist", blurb: "Fast sword infantry. Strikes twice against slower foes.", hue: 205 },
  sentinel: { label: "Sentinel", blurb: "Armoured lance wall. Shrugs off hits, moves slowly.", hue: 250 },
  outrider: { label: "Outrider", blurb: "Mounted lance. Balanced stats, reliable in any fight.", hue: 150 },
  berserker: { label: "Berserker", blurb: "Axe bruiser. Huge damage, thin defence.", hue: 25 },
  skyrider: { label: "Skyrider", blurb: "Flying lance. Speed and skill over bulk.", hue: 300 },
  ranger: { label: "Ranger", blurb: "Bow specialist. Accurate and hard to pin down.", hue: 120 },
  arcanist: { label: "Arcanist", blurb: "Tome wielder. Beats bows, ignores armour's bulk.", hue: 280 },
  mender: { label: "Mender", blurb: "Staff support. Lucky and durable, low attack.", hue: 60 },
};

export const RARITY_META: Record<
  Rarity,
  { label: string; color: string; odds: string }
> = {
  common: { label: "Common", color: "oklch(0.72 0.02 250)", odds: "70%" },
  uncommon: { label: "Uncommon", color: "oklch(0.72 0.15 150)", odds: "22%" },
  rare: { label: "Rare", color: "oklch(0.72 0.15 250)", odds: "7%" },
  legendary: { label: "Legendary", color: "oklch(0.83 0.14 82)", odds: "1%" },
};

export const WEAPON_LABEL: Record<WeaponType, string> = {
  sword: "Sword",
  lance: "Lance",
  axe: "Axe",
  bow: "Bow",
  tome: "Tome",
  staff: "Staff",
};

/** Human name for whatever is stored in `collections.poke` (a unit id). */
export function getUnitDisplayName(id: string | null | undefined) {
  if (!id) return "";
  const unit = getUnitById(id);
  return unit ? unit.name : id.charAt(0).toUpperCase() + id.slice(1);
}

export function getUnitFullTitle(id: string) {
  const unit = getUnitById(id);
  return unit ? `${unit.name} ${unit.epithet}` : getUnitDisplayName(id);
}

export function formatRecruitDate(value: string, locale = "en-GB") {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function classColor(unitClass: UnitClass, l = 0.62, c = 0.13) {
  return `oklch(${l} ${c} ${CLASS_META[unitClass].hue})`;
}

/* ---------- Glyphs (simple placeholder icons, one per class) ---------- */

function Glyph({ unitClass }: { unitClass: UnitClass }) {
  // All glyphs are drawn in a 0 0 40 40 box, stroke-based, currentColor.
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (unitClass) {
    case "duelist": // sword: blade, crossguard, grip
      return (
        <g {...common}>
          <path d="M14 26 30 10" />
          <path d="M30 10v5M30 10h-5" strokeWidth={2} />
          <path d="M10 22l8 8" />
          <path d="M11 29l-4 4" />
        </g>
      );
    case "sentinel": // shield + lance tip
      return (
        <g {...common}>
          <path d="M20 8l10 4v8c0 6-4 10-10 12-6-2-10-6-10-12v-8z" />
          <path d="M20 14v12" />
        </g>
      );
    case "outrider": // lance
      return (
        <g {...common}>
          <path d="M9 31 29 11" />
          <path d="M22 9h8v8" />
          <path d="M13 27l-4 4" />
        </g>
      );
    case "berserker": // axe
      return (
        <g {...common}>
          <path d="M14 30 26 14" />
          <path d="M22 10c5 0 9 3 10 8-4 1-8 0-11-3z" />
        </g>
      );
    case "skyrider": // wing
      return (
        <g {...common}>
          <path d="M8 26c6-10 14-13 24-12-3 4-6 6-10 7 2 2 4 3 7 3-6 4-14 5-21 2z" />
        </g>
      );
    case "ranger": // bow + arrow
      return (
        <g {...common}>
          <path d="M12 10c8 4 12 10 12 20" />
          <path d="M12 10 24 30" strokeWidth={2} />
          <path d="M10 30 30 10M30 10h-6M30 10v6" />
        </g>
      );
    case "arcanist": // open tome + spark
      return (
        <g {...common}>
          <path d="M8 13c4-2 8-2 12 0v17c-4-2-8-2-12 0z" />
          <path d="M32 13c-4-2-8-2-12 0v17c4-2 8-2 12 0z" />
          <path d="M20 6l1.5 3 3 1.5-3 1.5L20 15l-1.5-3-3-1.5 3-1.5z" strokeWidth={2} />
        </g>
      );
    case "mender": // staff with orb
      return (
        <g {...common}>
          <path d="M20 16v18" />
          <circle cx="20" cy="11" r="5" />
          <path d="M14 34h12" />
        </g>
      );
  }
}

/* ---------- Portrait ---------- */

export function UnitPortrait({
  unit,
  size = 96,
  showName = false,
  className,
}: {
  unit: Unit;
  size?: number | string;
  showName?: boolean;
  className?: string;
}) {
  const rarity = RARITY_META[unit.rarity];
  const base = classColor(unit.unitClass, 0.4, 0.09);
  const light = classColor(unit.unitClass, 0.6, 0.12);
  const ink = classColor(unit.unitClass, 0.93, 0.03);
  const isLegendary = unit.rarity === "legendary";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${unit.name} ${unit.epithet}, ${CLASS_META[unit.unitClass].label}`}
      className={className}
      data-rarity={unit.rarity}
    >
      <defs>
        <linearGradient id={`p-${unit.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={base} />
        </linearGradient>
      </defs>
      {/* Heraldic shield frame. Rarity sets the border. */}
      <path
        d="M50 4 88 14v34c0 22-16 38-38 48C28 86 12 70 12 48V14z"
        fill={`url(#p-${unit.id})`}
        stroke={rarity.color}
        strokeWidth={isLegendary ? 5 : 3.5}
      />
      {isLegendary ? (
        <path
          d="M50 10 82 18v30c0 18-13 32-32 41C31 80 18 66 18 48V18z"
          fill="none"
          stroke={rarity.color}
          strokeWidth={1.5}
          opacity={0.7}
        />
      ) : null}
      <g
        transform={showName ? "translate(26 18) scale(1.2)" : "translate(24 22) scale(1.3)"}
        color={ink}
      >
        <Glyph unitClass={unit.unitClass} />
      </g>
      {showName ? (
        <>
          <rect x="22" y="66" width="56" height="16" rx="3" fill="oklch(0.15 0.02 258 / 0.7)" />
          <text
            x="50"
            y="78"
            textAnchor="middle"
            fontSize="11"
            fontWeight={700}
            fill={ink}
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {unit.name}
          </text>
        </>
      ) : null}
    </svg>
  );
}

/** Portrait by id with a neutral fallback for unknown ids. */
export function UnitPortraitById({
  id,
  ...rest
}: { id: string } & Omit<Parameters<typeof UnitPortrait>[0], "unit">) {
  const unit = getUnitById(id);
  if (!unit) {
    return (
      <svg viewBox="0 0 100 100" width={rest.size ?? 96} height={rest.size ?? 96} className={rest.className} aria-hidden="true">
        <path
          d="M50 4 88 14v34c0 22-16 38-38 48C28 86 12 70 12 48V14z"
          fill="oklch(0.3 0.02 250)"
          stroke="oklch(0.6 0.02 250)"
          strokeWidth={3}
        />
        <text x="50" y="58" textAnchor="middle" fontSize="28" fill="oklch(0.85 0.02 250)">?</text>
      </svg>
    );
  }
  return <UnitPortrait unit={unit} {...rest} />;
}

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  const meta = RARITY_META[rarity];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-semibold"
      style={{ borderColor: meta.color, color: meta.color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}
