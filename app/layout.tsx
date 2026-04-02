import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import NavAuth from "./NavAuth";
import { Prefetch } from "@/components/ui/prefetch";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fondanalys – Optimera din fondportfölj",
  description: "Analysera din fondportfölj med relevanta nyckeltal och få personliga fondbytesförslag.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={`${geist.className} min-h-screen text-slate-900 bg-gradient-to-br from-white via-slate-50 to-blue-50`}>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.svg" alt="Fondanalys" width={32} height={32} />
              <span className="font-bold text-slate-900">Fondanalys</span>
            </Link>

            <nav className="flex items-center gap-4 sm:gap-6">
              <Link href="/analyze" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Analysera
              </Link>
              <NavAuth />
            </nav>
          </div>
        </header>

        {/* Shared background effects — all pages */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          {/* Dot pattern */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              opacity: 0.2,
            }}
          />
          {/* Blue glow top-left — gradient, no blur */}
          <div
            className="absolute top-0 left-0 w-[600px] h-[500px]"
            style={{
              background: "radial-gradient(ellipse at 0% 0%, rgba(59,130,246,0.18) 0%, transparent 65%)",
            }}
          />
        </div>
        <Prefetch hrefs={["/analyze", "/risk-profile"]} />
        <main>{children}</main>

        <footer className="border-t border-slate-200 mt-24">
          <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2.5">
                <Image src="/logo.svg" alt="Fondanalys" width={24} height={24} />
                <span className="text-sm font-semibold text-slate-700">Fondanalys</span>
              </div>
              <nav className="flex items-center gap-6 text-xs text-slate-400">
                <Link href="/analyze" className="hover:text-slate-600 transition-colors">Analysera</Link>
                <Link href="/account" className="hover:text-slate-600 transition-colors">Mitt konto</Link>
              </nav>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fondanalys tillhandahåller inte finansiell rådgivning. All information är endast i informationssyfte och ska inte ses som råd om köp eller försäljning av finansiella instrument.
            </p>
            <p className="text-xs text-slate-300">© 2026 Fondanalys</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
