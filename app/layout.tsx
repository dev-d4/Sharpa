import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Source_Serif_4, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import Header from "./Header";
import Footer from "./Footer";
import ResumeAfterLogin from "./ResumeAfterLogin";
import { Prefetch } from "@/components/ui/prefetch";
import CookieBanner from "@/components/ui/CookieBanner";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { LanguageProvider } from "@/lib/i18n";
import SiteTranslator from "@/components/SiteTranslator";

// Neutral grotesk för all UI och brödtext — äkta tabulära siffror och full
// svensk teckenuppsättning. Ersätter Manrope, vars geometriska former läste
// som lekfulla i displaystorlek.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});
// Redaktionell serif — endast displayrubriker (landning, sidtitlar, rapport).
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});
// Mono för nyckeltal och versaletiketter.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});
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
    default: "Sharpa – Jämför dina fonder gratis",
    template: "%s – Sharpa",
  },
  description: OG_DESCRIPTION,
  openGraph: {
    title: "Sharpa – Jämför dina fonder gratis",
    description: OG_DESCRIPTION,
    url: SITE_URL,
    siteName: "Sharpa",
    locale: "sv_SE",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Sharpa" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sharpa – Jämför dina fonder gratis",
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

// Fontvariablerna sitter på <html>, inte <body>: Tailwinds @theme skriver
// --font-sans/--font-display/--font-mono på :root, och var()-uppslaget sker där
// variabeln definieras. Låg de på body skulle uppslaget ske utanför räckvidd.
const htmlClass = `${plexSans.variable} ${sourceSerif.variable} ${plexMono.variable} ${dmSerif.variable}`; // unslop-ignore — dm-serif exponeras enbart för rapport/portfolioanalysis
const bodyClass = `${plexSans.className} min-h-dvh flex flex-col text-ink leading-relaxed`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={htmlClass}>
      <body className={bodyClass}>
        <LanguageProvider>
        <SiteTranslator />
        <ScrollToTop />
        <ResumeAfterLogin />
        <Header />

        <Prefetch hrefs={["/analyze", "/bygg-portfolj"]} />
        <main className="flex-1">{children}</main>

        <Footer />

        <CookieBanner />
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
