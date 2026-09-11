import { Coins, Crown, ShieldCheck, Skull, Swords, Users } from "lucide-react";

const features = [
  {
    icon: Swords,
    title: "Fight from chat",
    description:
      "Foes announce themselves in chat and take the field. Each !fe fight lands a strike boosted by your best unit and the weapon triangle - and the foe hits back, so watch your champion's HP.",
  },
  {
    icon: Crown,
    title: "Recruit what you defeat",
    description:
      "The finishing blow recruits the unit into your army and pays out gold. Legendary units show up about one time in a hundred.",
  },
  {
    icon: Users,
    title: "Duel other viewers",
    description:
      "Challenge someone with !fe duel. Your best unit takes the field, the weapon triangle decides who has the edge, and the winner takes gold.",
  },
  {
    icon: Coins,
    title: "Gear up at the market",
    description:
      "Spend gold on a steel sword, lance, axe, an ember tome or a heal staff. Each lasts thirty fights and overrides your unit's default weapon.",
  },
  {
    icon: Skull,
    title: "Bosses for the whole chat",
    description:
      "Every half hour or so a named warlord arrives with hundreds of HP and five minutes on the clock. Gold is split by damage dealt, and whoever lands the final blow recruits the boss.",
  },
  {
    icon: ShieldCheck,
    title: "Armies that persist",
    description:
      "Every recruit is saved to the viewer's Twitch account. Gift units, trade them, and pick up where you left off next stream.",
  },
];

export default function FeaturesHomePage() {
  return (
    <section className="border-y border-border bg-background/70 py-16 tablet:py-24">
      <div className="container">
        <div className="max-w-2xl">
          <p className="game-kicker">How the game plays</p>
          <h2 className="mt-3 font-heading text-3xl font-bold tablet:text-5xl">
            Tactics-style combat, run entirely from chat
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything happens in Twitch chat. The overlay shows the fight,
            the site keeps the records.
          </p>
        </div>
        <div className="mt-10 grid gap-4 tablet:grid-cols-2 laptop:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article key={title} className="game-panel flex min-h-36 gap-4 p-5">
              <span className="pixel-corners flex size-11 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <div>
                <h3 className="font-heading font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
