import type { Metadata } from "next";
import Link from "next/link";

import { GAME_NAME } from "@/config/brand";
import { BOSSES } from "@/features/units/roster";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Richest commanders, biggest armies, and warlord slayers.",
};

export const dynamic = "force-dynamic";

type Entry = { user: string; value: number };
type Boards = { gold: Entry[]; army: Entry[]; warlords: Entry[] };

const EMPTY: Boards = { gold: [], army: [], warlords: [] };

async function getBoards(channel: string): Promise<Boards> {
  if (!channel) return EMPTY;
  const supabase = createPublicClient();
  // fe_leaderboard is newer than the generated Database types.
  const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>)("fe_leaderboard", { p_channel: channel, p_limit: 10 });
  if (error) {
    console.error("Leaderboard query failed:", error);
    return EMPTY;
  }
  const raw = (data ?? {}) as Partial<Record<keyof Boards, unknown>>;
  const list = (v: unknown): Entry[] =>
    Array.isArray(v)
      ? v.filter((x): x is Entry => typeof x === "object" && x !== null && typeof (x as Entry).user === "string")
      : [];
  return { gold: list(raw.gold), army: list(raw.army), warlords: list(raw.warlords) };
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const params = await searchParams;
  const channel = (params.channel ?? process.env.NEXT_PUBLIC_DEFAULT_CHANNEL ?? "").trim().toLowerCase();
  const boards = await getBoards(channel);

  return (
    <section className="container grid gap-8 py-10 tablet:py-14">
      <div className="max-w-2xl">
        <p className="game-kicker">Hall of renown</p>
        <h1 className="mt-2 font-heading text-3xl font-bold tablet:text-5xl">Leaderboard</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {channel ? (
            <>
              Standings for <strong>{channel}</strong>. Gold comes from fights, recruits and boss kills; warlord
              slayers are the {BOSSES.length} bosses of Veyra, recruited by whoever lands the final blow.
            </>
          ) : (
            <>
              Add <code>?channel=name</code> to the address to see a channel&apos;s standings in {GAME_NAME}.
            </>
          )}
        </p>
      </div>

      <div className="grid gap-6 laptop:grid-cols-3">
        <Board title="Richest" unit="g" entries={boards.gold} />
        <Board title="Biggest army" unit=" units" entries={boards.army} />
        <Board title="Warlord slayers" unit=" bosses" entries={boards.warlords} />
      </div>

      <p className="text-xs text-muted-foreground">
        Looking for someone in particular?{" "}
        <Link href="/collections" className="underline underline-offset-4">
          Search the army rolls
        </Link>
        .
      </p>
    </section>
  );
}

function Board({ title, unit, entries }: { title: string; unit: string; entries: Entry[] }) {
  return (
    <div className="game-panel p-4">
      <h2 className="font-heading text-lg font-bold">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No entries yet.</p>
      ) : (
        <ol className="mt-3 grid gap-1.5">
          {entries.map((e, i) => (
            <li key={e.user} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <span className="mr-2 inline-block w-5 text-right font-heading text-muted-foreground">{i + 1}.</span>
                <Link href={`/collections?mode=user&q=${encodeURIComponent(e.user)}`} className="hover:underline">
                  {e.user}
                </Link>
              </span>
              <span className="shrink-0 font-heading font-bold tabular-nums">
                {e.value}
                {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
