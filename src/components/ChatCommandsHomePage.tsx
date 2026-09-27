import { Zap } from "lucide-react";
import Link from "next/link";

import { HOMEPAGE_COMMANDS } from "@/features/commands/reference";

const commands = HOMEPAGE_COMMANDS;

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
            Fight results show on the overlay. Recruits, gold and duels are announced in chat.{" "}
            <Link href="/commands" className="text-primary underline">Full command guide</Link>
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
