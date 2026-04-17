import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "./Header";
import Footer from "./Footer";
import { Prefetch } from "@/components/ui/prefetch";
import CookieBanner from "@/components/ui/CookieBanner";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fondanalys – Optimera din fondportfölj",
  description: "Analysera din fondportfölj med relevanta nyckeltal och få personliga fondbytesförslag.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={`${geist.className} min-h-screen text-slate-900 leading-relaxed`}>
        <Header />

        {/* Blue glow top-left — fixed, behind all content */}
        <div
          className="fixed top-0 left-0 w-[600px] h-[500px] pointer-events-none -z-10"
          style={{
            background: "radial-gradient(ellipse at 0% 0%, rgba(59,130,246,0.15) 0%, transparent 65%)",
          }}
        />
        <Prefetch hrefs={["/analyze", "/risk-profile"]} />
        <main>{children}</main>

        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
