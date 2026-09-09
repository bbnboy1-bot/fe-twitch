import { SignInPrompt } from "@/components/SignInPrompt";
import { getCurrentAccount } from "@/features/auth/queries";
import { GiftForm } from "@/features/transfers/GiftForm";
import { getTransferContext } from "@/features/transfers/queries";

export const dynamic = "force-dynamic";

export default async function GiftPage() {
  const account = await getCurrentAccount();

  if (!account) {
    return (
      <section className="container flex justify-center py-10 tablet:py-14">
        <SignInPrompt
          destination="/gift"
          title="Sign in to gift units"
          description="Sign in with Twitch to pick a unit from your army and send it to another commander."
        />
      </section>
    );
  }

  const { owned, collectors } = await getTransferContext(account);

  return (
    <section className="container grid max-w-5xl gap-7 py-10 tablet:py-14">
      <div>
        <p className="game-kicker">Gifts</p>
        <h1 className="mt-2 font-heading text-3xl font-bold tablet:text-5xl">
          Send a unit to another commander
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Pick a unit and a recipient. The transfer completes in one step and
          cannot be undone.
        </p>
      </div>
      <div className="game-panel p-5 tablet:p-7">
        <GiftForm owned={owned} collectors={collectors} />
      </div>
    </section>
  );
}
