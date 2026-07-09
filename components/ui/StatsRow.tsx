import { getAnalyzedPortfolioCount, getAnalyzedFundCount, formatPortfolioCount, formatFundCount } from "@/lib/portfolio-count";

// Sifferrad — tre nyckeltal i ren text på canvas, avdelade av tunna vertikala
// hårlinjer på desktop och staplade på mobil. "Fonder analyserade" och
// "portföljer byggda" är live från databasen; "0 kr i provision" är statisk.

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 px-1.5 sm:px-6 text-center">
      <span className="block font-heading font-extrabold text-[13px] sm:text-[17px] text-ink tabular-nums leading-tight">
        {value}
      </span>
      <span className="block mt-0.5 text-[9px] sm:text-[11px] text-ink-2 leading-snug">{label}</span>
    </div>
  );
}

function Divider() {
  return <div aria-hidden="true" className="w-px h-6 sm:h-6 bg-line shrink-0" />;
}

export default async function StatsRow() {
  const [portfolioCount, fundCount] = await Promise.all([
    getAnalyzedPortfolioCount(),
    getAnalyzedFundCount(),
  ]);
  const portfolios = portfolioCount > 0 ? formatPortfolioCount(portfolioCount) : "15+";
  const funds = fundCount > 0 ? formatFundCount(fundCount) : "1 500+";

  return (
    <section className="py-5 sm:py-6">
      <div className="mx-auto flex max-w-lg sm:max-w-none items-center justify-center gap-1 sm:gap-0">
        <StatCell value={funds} label="fonder analyserade" />
        <Divider />
        <StatCell value={portfolios} label="portföljer byggda" />
        <Divider />
        <StatCell value="0 kr" label="i provision" />
      </div>
    </section>
  );
}
