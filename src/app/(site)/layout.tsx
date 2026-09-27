import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { ChannelNamesProvider } from "@/features/units/names-context";
import { getSiteChannelNames } from "@/features/units/site-names";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const names = await getSiteChannelNames();
  return (
    <ChannelNamesProvider names={names}>
      <div className="flex min-h-screen flex-col text-foreground">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </ChannelNamesProvider>
  );
}
