import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GAME_NAME } from "@/config/brand";
import { CLASS_WEAPON, type WeaponType } from "@/features/units/model";
import {
  CLASS_META,
  RarityBadge,
  UnitPortrait,
  WEAPON_LABEL,
} from "@/features/units/presentation";
import { BOSSES, getUnitById, ROSTER } from "@/features/units/roster";

type PageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return [...ROSTER, ...BOSSES].map((u) => ({ id: u.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const unit = getUnitById(id);
  return {
    title: unit ? `${unit.name} ${unit.epithet} | ${GAME_NAME}` : `Unit | ${GAME_NAME}`,
  };
}

/** Which weapons this unit's weapon beats / loses to. */
function triangle(weapon: WeaponType): { beats: WeaponType | null; losesTo: WeaponType | null } {
  const table: Partial<Record<WeaponType, [WeaponType, WeaponType]>> = {
    sword: ["axe", "lance"],
    axe: ["lance", "sword"],
    lance: ["sword", "axe"],
  };
  const row = table[weapon];
  return row ? { beats: row[0], losesTo: row[1] } : { beats: null, losesTo: null };
}

export default async function UnitPage({ params }: PageProps) {
  const { id } = await params;
  const unit = getUnitById(id);
  if (!unit) notFound();

  const stats = [
    ["HP", unit.base.hp, 40],
    ["Attack", unit.base.atk, 20],
    ["Speed", unit.base.spd, 16],
    ["Defence", unit.base.def, 16],
    ["Skill", unit.base.skl, 16],
    ["Luck", unit.base.lck, 16],
  ] as const;
  const total = Object.values(unit.base).reduce((a, b) => a + b, 0);
  const tri = triangle(unit.weapon);
  const classMeta = CLASS_META[unit.unitClass];

  return (
    <section className="container grid gap-6 py-10 tablet:py-14">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/units">
          <ArrowLeft className="size-4" /> All units
        </Link>
      </Button>

      <div className="grid gap-6 laptop:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <Card className="game-panel overflow-hidden shadow-none">
          <CardContent className="media-surface grid min-h-[360px] place-items-center p-8">
            <UnitPortrait unit={unit} size={260} />
          </CardContent>
        </Card>

        <Card className="game-panel shadow-none">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <RarityBadge rarity={unit.rarity} />
              <span className="text-xs text-muted-foreground">
                {classMeta.label} · {WEAPON_LABEL[unit.weapon]}
              </span>
            </div>
            <CardTitle className="mt-2 font-heading text-3xl font-bold">
              {unit.name}{" "}
              <span className="text-lg font-medium italic text-muted-foreground">{unit.epithet}</span>
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">{classMeta.blurb}</p>
          </CardHeader>
          <CardContent className="grid gap-6">
            <dl className="grid gap-2">
              {stats.map(([label, value, max]) => (
                <div key={label} className="grid grid-cols-[80px_1fr_36px] items-center gap-3 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="h-2 overflow-hidden rounded-sm bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                    />
                  </dd>
                  <dd className="text-right font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold tabular-nums">{total}</span>
              </div>
            </dl>

            <div className="grid gap-1 text-sm">
              <p>
                <span className="text-muted-foreground">Default weapon:</span>{" "}
                {WEAPON_LABEL[CLASS_WEAPON[unit.unitClass]]}
              </p>
              {unit.weapon === "tome" || unit.weapon === "bow" ? (
                <p className="text-muted-foreground">
                  Tomes and bows are each other&apos;s foil: whoever attacks gets the edge.
                </p>
              ) : tri.beats && tri.losesTo ? (
                <p className="text-muted-foreground">
                  {WEAPON_LABEL[unit.weapon]} beats {WEAPON_LABEL[tri.beats]} and loses to{" "}
                  {WEAPON_LABEL[tri.losesTo]}.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Staves sit outside the weapon triangle. A heal staff grants bonus HP instead.
                </p>
              )}
              <p className="text-muted-foreground">
                Doubles a foe when 4+ faster. Crits deal triple damage.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
