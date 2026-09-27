import type { Metadata } from "next";
import Link from "next/link";

import { GAME_NAME } from "@/config/brand";
import { COMMAND_GROUPS, COMMANDS } from "@/features/commands/reference";
import { unitDisplayName } from "@/features/units/names";
import { LORDS } from "@/features/units/roster";
import { getSiteChannelNames } from "@/features/units/site-names";

export const metadata: Metadata = { title: `Commands | ${GAME_NAME}` };
export const dynamic = "force-dynamic";

export default async function CommandsPage() {
  const names = await getSiteChannelNames();
  const firstLord = LORDS[2];

  return (
    <section className="container grid max-w-4xl gap-8 py-10 tablet:py-14">
      <div>
        <p className="game-kicker">How to play</p>
        <h1 className="mt-2 font-heading text-3xl font-bold tablet:text-5xl">Every !fe command</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Type these in the stream chat. Fight results show on the overlay; recruits, gold and duels are announced in
          chat. New here? Start with <code className="text-primary">!fe start</code>, pick a lord (for example{" "}
          <code className="text-primary">!fe start {unitDisplayName(firstLord, names).split(" ")[0].toLowerCase()}</code>), then{" "}
          <code className="text-primary">!fe fight</code> when a foe appears.
        </p>
      </div>

      <div className="game-panel p-5 text-sm">
        <h2 className="font-heading text-lg font-bold">How a fight works</h2>
        <ol className="mt-2 grid gap-1 pl-5 text-muted-foreground [list-style:decimal]">
          <li>A foe appears on the overlay with an HP bar. Everyone hits it with !fe fight.</li>
          <li>Each hit is announced only on the overlay (crits shout in chat) and pays 1 gold.</li>
          <li>The foe hits your champion back. At 0 HP your champion is routed until the next foe or a !fe heal.</li>
          <li>Whoever lands the final blow recruits the foe and gets 25 gold. The field rests for 45 seconds.</li>
          <li>Every 30 to 45 minutes a warlord arrives: big HP, 5 minute timer, gold pool split by damage.</li>
        </ol>
        <p className="mt-3 text-muted-foreground">
          Weapon triangle: <strong>sword beats axe, axe beats lance, lance beats sword</strong>. Bows and tomes sit
          outside it. Browse every unit and its stats on the <Link href="/units" className="text-primary underline">Units</Link> page.
        </p>
      </div>

      {COMMAND_GROUPS.map(([group, title]) => (
        <div key={group}>
          <h2 className="mb-3 font-heading text-xl font-bold">{title}</h2>
          <ol className="game-panel divide-y divide-border overflow-hidden">
            {COMMANDS.filter((c) => c.group === group).map(({ cmd, alias, note, detail }) => (
              <li key={cmd} className="grid gap-1 bg-card p-4 tablet:grid-cols-[16rem_1fr] tablet:gap-4">
                <span className="font-mono text-sm font-bold text-primary">
                  {cmd}
                  {alias ? <span className="block font-normal text-muted-foreground">{alias}</span> : null}
                </span>
                <span className="text-sm">
                  <span className="block">{note}</span>
                  {detail ? <span className="mt-1 block text-muted-foreground">{detail}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ))}

      <div className="game-panel p-5 text-sm">
        <h2 className="font-heading text-lg font-bold">The lords</h2>
        <p className="mt-1 text-muted-foreground">Any of these can be your starting hero. Names follow this realm&apos;s settings.</p>
        <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 tablet:grid-cols-3">
          {LORDS.map((lord) => (
            <li key={lord.id}>
              <Link href={`/units/${lord.id}`} className="text-primary underline">
                {unitDisplayName(lord, names)}
              </Link>{" "}
              <span className="text-xs text-muted-foreground">{lord.weapon}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
