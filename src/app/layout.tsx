import type { Metadata } from "next";
import { Cinzel, Open_Sans } from "next/font/google";

import { GAME_NAME, GAME_TAGLINE } from "@/config/brand";
import "@/styles/globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-custom",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: `${GAME_NAME} — ${GAME_TAGLINE}`,
  description:
    "A Fire Emblem-style Twitch chat game: viewers battle enemy units, recruit them into an army, duel each other for gold, and gear up at the market. Live OBS overlay included.",
  keywords: ["Twitch", "chat game", "tactics", "OBS overlay", "Fire Emblem style"],
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${openSans.variable} ${cinzel.variable}`}>
      <body>{children}</body>
    </html>
  );
}
