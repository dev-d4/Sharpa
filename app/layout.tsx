import type { Metadata } from "next";
import { Geist, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import Header from "./Header";
import Footer from "./Footer";
import { Prefetch } from "@/components/ui/prefetch";
import CookieBanner from "@/components/ui/CookieBanner";
import { ScrollToTop } from "@/components/ui/ScrollToTop";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
export const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fondanalys – Optimera din fondportfölj",
  description: "Analysera din fondportfölj med relevanta nyckeltal och få personliga fondbytesförslag.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={`${geist.variable} ${dmSerif.variable} ${geist.className} min-h-screen text-slate-900 leading-relaxed`}>
        <ScrollToTop />
        <Header />

        <Prefetch hrefs={["/analyze", "/risk-profile"]} />
        <main className="pb-nav-safe sm:pb-0">{children}</main>

        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
