import { Coins, Swords, Users } from "lucide-react";

import GuestHeroHomePage from "@/components/GuestHeroHomePage";
import UserHeroHomePage from "@/components/UserHeroHomePage";
import { OverlayView } from "@/features/overlay/OverlayView";
import { UnitPortrait } from "@/features/units/presentation";
import { ROSTER } from "@/features/units/roster";

type Props = {
  user: { id: string; channel: string } | null;
};

export default function HeroHomePage({ user }: Props) {
  return (
    <section className="relative overflow-hidden py-14 tablet:py-20 laptop:py-24">
      <div className="container grid items-center gap-12 laptop:grid-cols-[1.05fr_.95fr]">
        <div className="relative z-10 flex flex-col items-start gap-7">
          <p className="game-kicker">A Twitch chat game with a live OBS overlay</p>

          <div className="grid gap-5">
            <h1 className="max-w-3xl font-heading text-4xl font-bold leading-[1.05] tablet:text-6xl">
              Chat fights the war. Every viewer builds an army.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground tablet:text-lg">
              An enemy unit stands on your overlay. Viewers attack it from chat,
              and whoever lands the finishing blow recruits it. Duel each other
              for gold, spend it at the market, and carry your army from stream
              to stream.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Swords className="size-4 text-primary" /> Weapon triangle combat
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="size-4 text-primary" /> 22 recruitable units
            </span>
            <span className="inline-flex items-center gap-2">
              <Coins className="size-4 text-primary" /> Gold, duels and a market
            </span>
          </div>

          <div className="w-full laptop:max-w-xl">
            {user ? <UserHeroHomePage data={user} /> : <GuestHeroHomePage />}
          </div>
        </div>

        <BattlePreview />
      </div>
    </section>
  );
}

function BattlePreview() {
  const enemy = ROSTER.find((u) => u.id === "kestrel") ?? ROSTER[0];
  const recruits = ["bram", "tamsin", "veyla"]
    .map((id) => ROSTER.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  return (
    <div className="game-panel relative mx-auto w-full max-w-xl p-3">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="game-kicker">What OBS shows</p>
        <p className="text-xs text-muted-foreground">Browser source · 300 × 130</p>
      </div>

      <div className="grid gap-5 p-4 tablet:p-6">
        <div
          className="relative mx-auto w-full max-w-[360px]"
          style={{
            containerName: "overlay",
            containerType: "size",
            aspectRatio: "300/130",
          }}
        >
          <OverlayView
            poke={{ poke: enemy.id, health: 31 }}
            size="standard"
            event={{ kind: "hit", player: "hudson", damage: 7, at: "preview" }}
            catch={{ poke: "orrick", player: "sable_fan", at: "preview" }}
          />
        </div>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Units chat has recruited so far
          </p>
          <ul className="flex gap-3">
            {recruits.map((unit) => (
              <li key={unit.id} className="flex flex-col items-center gap-1">
                <UnitPortrait unit={unit} size={64} />
                <span className="text-xs font-semibold">{unit.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
