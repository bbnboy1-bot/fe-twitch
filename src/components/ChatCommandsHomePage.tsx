import { Zap } from "lucide-react";

const commands = [
  { cmd: "!fe recruit", alias: "!fe r", note: "Join the game and get your first unit. Free, once per channel." },
  { cmd: "!fe fight", alias: "!fe f", note: "Strike the foe on the field. It strikes back - land the final blow to recruit it." },
  { cmd: "!fe heal", alias: "", note: "Spend a heal-staff use to restore your routed or wounded champion." },
  { cmd: "!fe status", alias: "!fe s", note: "See the enemy's HP, the boss timer, and your champion's HP." },
  { cmd: "!fe boss", alias: "mods only", note: "Summon a boss right now instead of waiting for the timer." },
  { cmd: "!fe army", alias: "", note: "Get a link to your army on this site." },
  { cmd: "!fe gold", alias: "!fe g", note: "Check your gold." },
  { cmd: "!fe shop", alias: "", note: "List what the market sells and for how much." },
  { cmd: "!fe buy sword", alias: "buy lance / axe / tome / staff", note: "Buy a weapon. It auto-equips and lasts 30 fights." },
  { cmd: "!fe duel @name", alias: "!fe d @name", note: "Challenge a viewer. They have 60 seconds to !fe accept or !fe decline." },
  { cmd: "!fe last", alias: "!fe l", note: "Who made the most recent recruit in this channel." },
  { cmd: "!fe help", alias: "!fe h", note: "Print the command list in chat." },
];

export default function ChatCommandsHomePage() {
  return (
    <section className="py-16 tablet:py-24">
      <div className="container max-w-3xl">
        <div className="text-center">
          <p className="game-kicker">Viewer commands</p>
          <h2 className="mt-3 font-heading text-3xl font-bold tablet:text-5xl">
            Everything starts with !fe
          </h2>
          <p className="mt-3 text-muted-foreground">
            Fight results show on the overlay. Recruits, gold and duels are announced in chat.
          </p>
        </div>
        <ol className="game-panel mt-10 divide-y divide-border overflow-hidden">
          {commands.map(({ cmd, alias, note }) => (
            <li
              key={cmd}
              className="flex flex-col gap-1 bg-card p-4 tablet:flex-row tablet:items-center tablet:gap-4"
            >
              <span className="shrink-0 font-mono text-sm font-bold text-primary tablet:w-64">
                {cmd}
                {alias ? <span className="ml-2 font-normal text-muted-foreground">({alias})</span> : null}
              </span>
              <span className="text-sm text-muted-foreground">{note}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Zap className="size-3" />
          Attacks have a short cooldown to keep things fair.
        </p>
      </div>
    </section>
  );
}
