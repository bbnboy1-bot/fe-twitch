import { Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signInWithTwitch } from "@/features/auth/actions";

export default function GuestHeroHomePage() {
  return (
    <div className="flex">
      <form action={signInWithTwitch}>
        <Button
          className="h-12 px-6 font-bold"
          variant="primary"
          size="lg"
          type="submit"
        >
          <Radio className="size-5" />
          Sign in with Twitch
        </Button>
      </form>
    </div>
  );
}
