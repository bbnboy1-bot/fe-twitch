import { Castle, ChevronDown } from "lucide-react";
import Link from "next/link";

import { getRealm, listRealms } from "@/features/realm/server";

/**
 * Header chip showing which streamer's realm the site is showing (names,
 * leaderboard, lords), with a dropdown to switch. Plain links with `?realm=`,
 * so it works without client JavaScript; the proxy remembers the choice.
 */
export async function RealmPicker({ mobile = false }: { mobile?: boolean }) {
  const [realm, realms] = await Promise.all([getRealm(), listRealms()]);
  const current = realm.channel;
  const others = realms.filter((r) => r !== current);
  const showMine = realm.ownChannel && realm.ownChannel !== current;

  return (
    <details className={`group relative ${mobile ? "" : "ml-2"}`}>
      <summary
        className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted [&::-webkit-details-marker]:hidden"
        title="The streamer whose realm you are viewing"
      >
        <Castle className="size-4" aria-hidden />
        <span className="max-w-36 truncate">{current ? current : "Choose realm"}</span>
        <ChevronDown className="size-3.5 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className={`game-panel z-50 grid max-h-80 w-64 gap-1 overflow-y-auto p-2 ${mobile ? "mt-2" : "absolute right-0 top-11"}`}>
        <p className="px-2 pb-1 text-xs text-muted-foreground">
          Unit names, lords and the leaderboard follow the streamer you pick.
        </p>
        {showMine ? (
          <Link href="?realm=mine" className="rounded-md px-2 py-1.5 text-sm font-semibold text-primary hover:bg-muted">
            Back to my realm ({realm.ownChannel})
          </Link>
        ) : null}
        {others.length === 0 && !showMine ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">No other realms yet.</p>
        ) : null}
        {others.map((r) => (
          <Link key={r} href={`?realm=${encodeURIComponent(r)}`} className="rounded-md px-2 py-1.5 text-sm hover:bg-muted">
            {r}
          </Link>
        ))}
      </div>
    </details>
  );
}
