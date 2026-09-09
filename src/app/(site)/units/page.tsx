import type { Metadata } from "next";
import Link from "next/link";

import { GAME_NAME } from "@/config/brand";
import type { Rarity } from "@/features/units/model";
import {
  CLASS_META,
  RARITY_META,
  UnitPortrait,
  WEAPON_LABEL,
} from "@/features/units/presentation";
import { ROSTER } from "@/features/units/roster";

export const metadata: Metadata = {
  title: `Units | ${GAME_NAME}`,
  description: "Every recruitable unit, its class, weapon and rarity.",
};

const RARITY_ORDER: Rarity[] = ["legendary", "rare", "uncommon", "common"];

export default function UnitsPage() {
  return (
    <section className="container grid gap-8 py-10 tablet:py-14">
      <div className="max-w-2xl">
        <p className="game-kicker">The roster</p>
        <h1 className="mt-2 font-heading text-3xl font-bold tablet:text-5xl">
          {ROSTER.length} units of Veyra
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Any of these can appear on the overlay. Defeat one and it joins your
          army. Rarer units are stronger and rarer to see.
        </p>
      </div>

      {RARITY_ORDER.map((rarity) => {
        const units = ROSTER.filter((u) => u.rarity === rarity);
        const meta = RARITY_META[rarity];
        return (
          <div key={rarity}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="font-heading text-xl font-bold" style={{ color: meta.color }}>
                {meta.label}
              </h2>
              <span className="text-xs text-muted-foreground">
                about {meta.odds} of encounters
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-3 tablet:grid-cols-3 laptop:grid-cols-4">
              {units.map((unit) => (
                <li key={unit.id}>
                  <Link
                    href={`/units/${unit.id}`}
                    className="game-panel flex items-center gap-3 p-3 transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <UnitPortrait unit={unit} size={56} />
                    <span className="min-w-0">
                      <span className="block truncate font-heading font-bold">{unit.name}</span>
                      <span className="block truncate text-xs italic text-muted-foreground">
                        {unit.epithet}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {CLASS_META[unit.unitClass].label} · {WEAPON_LABEL[unit.weapon]}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
