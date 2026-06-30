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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fondanalys.se";
const OG_DESCRIPTION = "Sök upp dina fonder och se på 2 minuter hur bra de egentligen presterar — och vilka byten som kan ge dig mer för pengarna. Gratis och oberoende.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Fondanalys – Hur bra är dina fonder egentligen?",
    template: "%s – Fondanalys",
  },
  description: OG_DESCRIPTION,
  openGraph: {
    title: "Fondanalys – Hur bra är dina fonder egentligen?",
    description: OG_DESCRIPTION,
    url: SITE_URL,
    siteName: "Fondanalys",
    locale: "sv_SE",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Fondanalys" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fondanalys – Hur bra är dina fonder egentligen?",
    description: OG_DESCRIPTION,
    images: ["/og.png"],
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={`${geist.variable} ${dmSerif.variable} ${geist.className} min-h-dvh flex flex-col text-slate-900 leading-relaxed`}>
        <ScrollToTop />
        <Header />

        <Prefetch hrefs={["/analyze", "/risk-profile"]} />
        <main className="flex-1 pb-nav-safe sm:pb-0">{children}</main>

        <Footer />
        {/* Spacer so the footer clears the fixed mobile bottom nav */}
        <div className="sm:hidden shrink-0" style={{ height: "calc(52px + max(8px, env(safe-area-inset-bottom, 0px)))" }} aria-hidden="true" />

        <CookieBanner />
      </body>
    </html>
  );
}
