import { LogIn, Menu, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentAccount } from "@/features/auth/queries";
import { GAME_NAME } from "@/config/brand";
import { Crest } from "./Crest";
import UserDropdown from "./UserDropdown";

const menuItems = [
  { name: "Army", path: "/collections" },
  { name: "Units", path: "/units" },
  { name: "Leaderboard", path: "/leaderboard" },
  { name: "Gift", path: "/gift" },
  { name: "Trade", path: "/trade" },
];

export default async function Header() {
  const account = await getCurrentAccount();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="container flex min-h-16 items-center justify-between gap-4 py-3">
        <Brand />
        <nav className="hidden items-center gap-1 rounded-lg border border-border bg-card/70 p-1 tablet:flex">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary hover:text-primary-foreground"
            >
              {item.name}
            </Link>
          ))}
          <div className="ml-2 pl-2 border-l border-border flex items-center">
            <HeaderAccount channel={account?.channel ?? null} />
          </div>
        </nav>

        <details className="group relative tablet:hidden">
          <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md transition hover:bg-muted [&::-webkit-details-marker]:hidden">
            <Menu className="size-5 group-open:hidden" />
            <X className="hidden size-5 group-open:block" />
            <span className="sr-only">Toggle navigation</span>
          </summary>
          <div className="game-panel absolute right-0 top-12 w-72 p-3">
            <div className="mb-3 border-b border-border pb-3">
              <HeaderAccount channel={account?.channel ?? null} mobile />
            </div>
            <nav className="flex flex-col gap-2">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-base font-semibold transition hover:bg-muted"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}

function Brand() {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <Crest size={34} />
      <span className="font-heading text-xl font-bold tracking-wide">{GAME_NAME}</span>
    </Link>
  );
}

function HeaderAccount({
  channel,
  mobile = false,
}: {
  channel: string | null;
  mobile?: boolean;
}) {
  if (!channel) {
    return (
      <div
        className={
          mobile ? "flex flex-col gap-2" : "flex items-center gap-2"
        }
      >
        <Button asChild variant="outline" size={mobile ? "default" : "sm"}>
          <Link href="/setup">
            <LogIn data-icon="inline-start" /> Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return <UserDropdown channel={channel} mobile={mobile} />;
}
