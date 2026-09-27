import { ArenaSourceCard } from "@/components/ArenaSourceCard";
import { RealmNamesCard } from "@/components/RealmNamesCard";
import { SignInPrompt } from "@/components/SignInPrompt";
import { StreamerSetup } from "@/components/StreamerSetup";
import { getAppOrigin } from "@/features/auth/origin";
import { getCurrentAccount } from "@/features/auth/queries";
import { getChannelNames } from "@/features/units/channel-names";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const account = await getCurrentAccount();

  if (!account) {
    return (
      <section className="container flex justify-center py-10 tablet:py-14">
        <SignInPrompt
          destination="/setup"
          title="Unlock streamer setup"
          description="Sign in with Twitch to copy your overlay URL and finish the setup checklist before going live."
        />
      </section>
    );
  }

  const url = `${getAppOrigin()}/overlays/${account.id}`;
  const names = await getChannelNames(account.channel);

  return (
    <section className="container grid max-w-5xl gap-7 py-10 tablet:py-14">
      <div>
        <p className="game-kicker">Streamer setup</p>
        <h1 className="mt-2 font-heading text-3xl font-bold tablet:text-5xl">
          Set up your overlay
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Copy your browser-source URL, add it to OBS (recommended size: <strong>300 × 130</strong>), and work through the
          checklist once. Your viewers can keep playing against the same public
          overlay after setup is done.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Share this site link with your viewers (panels, !commands, Discord) so they see your realm&apos;s names,
          lords and leaderboard. Links the bot posts in chat already include it:{" "}
          <code className="select-all break-all text-primary">{`${getAppOrigin()}/?realm=${account.channel.toLowerCase()}`}</code>
        </p>
      </div>
      <div className="game-panel p-5 tablet:p-7">
        <StreamerSetup accountId={account.id} url={url} />
      </div>
      <div className="game-panel p-5 tablet:p-7">
        <ArenaSourceCard url={`${url}/arena`} />
      </div>
      <div className="game-panel p-5 tablet:p-7">
        <RealmNamesCard initial={names} />
      </div>
    </section>
  );
}
