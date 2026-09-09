import { BOT_USERNAME } from "@/config/brand";

const steps = [
  ["Sign in with Twitch", "Your channel is registered and the bot joins your chat."],
  [
    "Add the overlay to OBS",
    "Copy your browser-source URL from the setup page and add it at 300 × 130 (or pick another preset).",
  ],
  [
    "Mod the bot",
    `Run /mod ${BOT_USERNAME} in your chat so it can reply without rate limits.`,
  ],
  ["Go live", "Tell chat to type !fe muster. The first unit is free."],
];

export default function HowToUseHomePage() {
  return (
    <section id="how-to-use" className="py-16 tablet:py-24">
      <div className="container max-w-4xl">
        <div className="text-center">
          <p className="game-kicker">Streamer setup</p>
          <h2 className="mt-3 font-heading text-3xl font-bold tablet:text-5xl">
            Live in four steps
          </h2>
          <p className="mt-3 text-muted-foreground">
            One overlay URL, set once. Progress is kept between streams.
          </p>
        </div>
        <ol className="game-panel mt-10 divide-y divide-border overflow-hidden">
          {steps.map(([title, description], index) => (
            <li
              key={title}
              className="grid gap-3 bg-card p-5 tablet:grid-cols-[56px_200px_1fr] tablet:items-center"
            >
              <span className="font-heading text-lg font-bold text-primary">
                {index + 1}
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
