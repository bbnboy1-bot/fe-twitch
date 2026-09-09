import Link from "next/link";

import { GAME_NAME, REPO_URL } from "@/config/brand";

const linkClassName =
  "font-semibold text-primary underline-offset-4 hover:underline";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background/90 py-8">
      <div className="container">
        <div className="flex flex-col gap-1 text-center text-sm text-muted-foreground">
          <p>
            <Link className={linkClassName} href="/">
              {GAME_NAME}
            </Link>{" "}
            is an original fan-made tactics game. Not affiliated with
            Nintendo or Intelligent Systems.
          </p>
          <p>
            Built on the open-source Pokitch project.{" "}
            <Link className={linkClassName} href={REPO_URL} target="_blank" rel="noreferrer">
              Source code
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
