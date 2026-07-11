import type { Metadata } from "next";
import { Inter, Manrope, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import Header from "./Header";
import Footer from "./Footer";
import { Prefetch } from "@/components/ui/prefetch";
import CookieBanner from "@/components/ui/CookieBanner";
import { ScrollToTop } from "@/components/ui/ScrollToTop";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" }); // unslop-ignore — valt för tabulära siffror i datatäta vyer
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
export const dmSerif = DM_Serif_Display({ // unslop-ignore — används endast av rapport/portfolioanalysis (eget designsystem)
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sharpa.se";
const OG_DESCRIPTION = "Sök upp dina fonder och se på 2 minuter hur de står sig mot liknande fonder utifrån avgift, avkastning och risk. Gratis och oberoende.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sharpa – Hur bra är dina fonder egentligen?",
    template: "%s – Sharpa",
  },
  description: OG_DESCRIPTION,
  openGraph: {
    title: "Sharpa – Hur bra är dina fonder egentligen?",
    description: OG_DESCRIPTION,
    url: SITE_URL,
    siteName: "Sharpa",
    locale: "sv_SE",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Sharpa" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sharpa – Hur bra är dina fonder egentligen?",
    description: OG_DESCRIPTION,
    images: ["/og.png"],
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/apple-icon.png",
  },
  robots: { index: true, follow: true },
};

const bodyClass = `${inter.variable} ${manrope.variable} ${dmSerif.variable} ${inter.className} min-h-dvh flex flex-col text-slate-900 leading-relaxed`; // unslop-ignore — dm-serif exponeras enbart för rapport/portfolioanalysis

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={bodyClass}>
        <ScrollToTop />
        <Header />

        <Prefetch hrefs={["/analyze", "/bygg-portfolj"]} />
        <main className="flex-1 pb-nav-safe sm:pb-0">{children}</main>

        <Footer />
        {/* Spacer so the footer clears the fixed mobile quick actions */}
        <div className="sm:hidden shrink-0" style={{ height: "calc(76px + max(8px, env(safe-area-inset-bottom, 0px)))" }} aria-hidden="true" />

        <CookieBanner />
      </body>
    </html>
  );
}
