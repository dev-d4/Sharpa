import { getAnalyzedPortfolioCount, getAnalyzedFundCount, formatPortfolioCount, formatFundCount } from "@/lib/portfolio-count";

// Sifferrad — tre nyckeltal i ren text på canvas, avdelade av tunna vertikala
// hårlinjer på desktop och staplade på mobil. "Fonder analyserade" och
// "portföljer byggda" är live från databasen; "0 kr i provision" är statisk.

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 px-2 text-center sm:px-6">
      <span className="figure block text-[18px] leading-tight text-ink sm:text-[26px]">
        {value}
      </span>
      <span className="mt-1.5 block text-[11px] leading-snug text-ink-3 sm:text-[13px]">{label}</span>
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
  const portfolios = portfolioCount > 0 ? formatPortfolioCount(portfolioCount) : "15+";
  const funds = fundCount > 0 ? formatFundCount(fundCount) : "1 500+";

  return (
    <section className="py-8 sm:py-10">
      <div className="mx-auto flex max-w-lg items-stretch justify-center sm:max-w-none">
        <StatCell value={funds} label="fonder analyserade" />
        <Divider />
        <StatCell value={portfolios} label="portföljexempel skapade" />
        <Divider />
        <StatCell value="0 kr" label="i provision" />
      </div>
    </section>
  );
}
