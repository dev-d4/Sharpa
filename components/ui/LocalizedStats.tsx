"use client";

import { useLanguage } from "@/lib/i18n";
import { formatFundCount, formatPortfolioCount } from "@/lib/portfolio-count";

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 px-2 text-center sm:px-4">
      <span className="figure block text-[15px] leading-tight text-ink sm:text-[19px]">{value}</span>
      <span className="mt-0.5 block text-[10px] leading-snug text-ink-3 sm:text-[11px]">{label}</span>
    </div>
  );
}

// Siffrorna formateras här och inte i serverkomponenten: tusentalsavgränsaren
// skiljer sig mellan språken (2 100+ mot 2,100+) och språkvalet finns bara på
// klienten.
export default function LocalizedStats({
  fundCount,
  portfolioCount,
}: {
  fundCount: number;
  portfolioCount: number;
}) {
  const { isEnglish } = useLanguage();
  const divider = <div aria-hidden="true" className="w-px shrink-0 self-stretch bg-line" />;
  return (
    <section className="py-2.5 sm:py-3">
      <div className="mx-auto flex max-w-lg items-stretch justify-center sm:max-w-none">
        <StatCell
          value={formatFundCount(fundCount, isEnglish ? "en-US" : "sv-SE")}
          label={isEnglish ? "funds analysed" : "fonder analyserade"}
        />
        {divider}
        <StatCell
          value={formatPortfolioCount(portfolioCount)}
          label={isEnglish ? "saved portfolios" : "sparade portföljer"}
        />
        {divider}
        <StatCell
          value={isEnglish ? "SEK 0" : "0 kr"}
          label={isEnglish ? "in commission from fund providers" : "i provision från fondbolag"}
        />
      </div>
    </section>
  );
}
