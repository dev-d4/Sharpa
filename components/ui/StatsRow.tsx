import { getAnalyzedPortfolioCount, getAnalyzedFundCount, formatPortfolioCount, formatFundCount } from "@/lib/portfolio-count";

// Sifferrad — tre nyckeltal i ren text på canvas, avdelade av tunna vertikala
// hårlinjer på desktop och staplade på mobil. "Fonder analyserade" och
// "portföljer byggda" är live från databasen; "0 kr i provision" är statisk.

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 px-2 text-center sm:px-4">
      <span className="figure block text-[15px] leading-tight text-ink sm:text-[19px]">
        {value}
      </span>
      <span className="mt-0.5 block text-[10px] leading-snug text-ink-3 sm:text-[11px]">{label}</span>
    </div>
  );
}

function Divider() {
  return <div aria-hidden="true" className="w-px shrink-0 self-stretch bg-line" />;
}

export default async function StatsRow() {
  const [portfolioCount, fundCount] = await Promise.all([
    getAnalyzedPortfolioCount(),
    getAnalyzedFundCount(),
  ]);

  // Siffrorna är marknadsföringspåståenden och måste kunna styrkas (MFL 10 §).
  // Går uppslaget fel returnerar countRows 0 — då visas raden inte alls, aldrig
  // ett hittepå-värde. Etiketterna beskriver exakt det som räknas.
  if (portfolioCount === 0 || fundCount === 0) return null;

  return (
    <section className="py-2.5 sm:py-3">
      <div className="mx-auto flex max-w-lg items-stretch justify-center sm:max-w-none">
        <StatCell value={formatFundCount(fundCount)} label="fonder i databasen" />
        <Divider />
        <StatCell value={formatPortfolioCount(portfolioCount)} label="sparade portföljer" />
        <Divider />
        <StatCell value="0 kr" label="i provision från fondbolag" />
      </div>
    </section>
  );
}
