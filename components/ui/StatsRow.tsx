import { getAnalyzedPortfolioCount, getAnalyzedFundCount } from "@/lib/portfolio-count";
import LocalizedStats from "@/components/ui/LocalizedStats";

// Sifferrad — tre nyckeltal i ren text på canvas, avdelade av tunna vertikala
// hårlinjer på desktop och staplade på mobil. "Fonder analyserade" och
// "portföljer byggda" är live från databasen; "0 kr i provision" är statisk.

export default async function StatsRow() {
  const [portfolioCount, fundCount] = await Promise.all([
    getAnalyzedPortfolioCount(),
    getAnalyzedFundCount(),
  ]);

  // Siffrorna är marknadsföringspåståenden och måste kunna styrkas (MFL 10 §).
  // Går uppslaget fel returnerar countRows 0 — då visas raden inte alls, aldrig
  // ett hittepå-värde. Etiketterna beskriver exakt det som räknas.
  if (portfolioCount === 0 || fundCount === 0) return null;

  return <LocalizedStats fundCount={fundCount} portfolioCount={portfolioCount} />;
}
