import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
