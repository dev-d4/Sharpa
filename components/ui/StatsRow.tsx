import { getAnalyzedPortfolioCount, formatPortfolioCount } from "@/lib/portfolio-count";

// Sifferrad — tre nyckeltal i ren text på canvas, avdelade av tunna vertikala
// hårlinjer på desktop och staplade på mobil. "Portföljer byggda" är live.

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 px-1.5 sm:px-10 text-center">
      <span className="block font-heading font-extrabold text-[18px] sm:text-[26px] text-ink tabular-nums leading-tight">
        {value}
      </span>
      <span className="block mt-1 text-[11px] sm:text-[13px] text-ink-2 leading-snug">{label}</span>
    </div>
  );
}

function Divider() {
  return <div aria-hidden="true" className="w-px h-9 sm:h-8 bg-line shrink-0" />;
}

export default async function StatsRow() {
  const count = await getAnalyzedPortfolioCount();
  const portfolios = count > 0 ? formatPortfolioCount(count) : "15+";

  return (
    <section className="py-12 sm:py-11">
      <div className="mx-auto flex max-w-lg sm:max-w-none items-center justify-center gap-1 sm:gap-0">
        <StatCell value="1 500+" label="fonder analyserade" />
        <Divider />
        <StatCell value={portfolios} label="portföljer byggda" />
        <Divider />
        <StatCell value="0 kr" label="i provision" />
      </div>
    </section>
  );
}
