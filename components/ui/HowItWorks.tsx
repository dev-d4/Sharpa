"use client";

import { useState } from "react";
import Link from "next/link";
import DonutChart from "@/components/ui/DonutChart";
import { CHART_PALETTE } from "@/lib/chart-palette";

// ── Feature cards ─────────────────────────────────────────────────────────────
// Varje kort leds av beviset (fondjämförelse resp. donut), avskilt med en tunn
// linje. Under: kort rubrik, en mening, och en textlänk som CTA — ingen knapp.

const BUILD_SLICES = [
  { label: "Global",   weight: 45 },
  { label: "Räntor",   weight: 30 },
  { label: "Sverige",  weight: 15 },
  { label: "Tillväxt", weight: 10 },
];

const CARD_SHADOW = { boxShadow: "0 1px 2px rgba(16,24,40,.04)" };

function FeatureCard({
  title,
  description,
  cta,
  href,
  proof,
}: {
  title: string;
  description: string;
  cta: string;
  href: string;
  proof: React.ReactNode;
}) {
  return (
    <article className="group flex h-full flex-col rounded-[14px] border border-line bg-white p-5 sm:p-7 transition-colors hover:border-info-line" style={CARD_SHADOW}>
      <div className="mb-5 flex h-[140px] items-center justify-center border-b border-line-soft pb-5">{proof}</div>
      <h3 className="font-heading text-[15px] font-bold text-ink">{title}</h3>
      <p className="mt-1.5 flex-1 text-[13px] text-ink-2 leading-[1.6]">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1 text-[13.5px] font-semibold text-accent transition-colors hover:text-accent-hover"
      >
        {cta}
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
      </Link>
    </article>
  );
}

// ── Produktbevis — riktigt innehåll leder varje kort ─────────────────────────

function SwapProof() {
  return (
    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-ink-4 mb-1">Nuvarande</p>
        <p className="font-heading text-sm font-bold text-ink truncate">SEB Sverige Index</p>
      </div>
      <svg className="w-4 h-4 text-ink-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-ink-4 mb-1">Föreslagen</p>
        <p className="font-heading text-sm font-bold text-ink truncate">Avanza Zero</p>
      </div>
    </div>
  );
}

function PortfolioProof() {
  return (
    <DonutChart
      slices={BUILD_SLICES}
      palette={CHART_PALETTE}
      centerLabel="70%"
      centerSub="Aktier"
      size={104}
      thickness={16}
      horizontal
      disableHover
    />
  );
}

// ── Trust section ─────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  {
    title: "Oberoende analys",
    desc: "Vi tar inga provisioner från fondbolag. Våra rekommendationer är alltid neutrala.",
  },
  {
    title: "Datadrivna beslut",
    desc: "1 500+ fonder analyserade med Sharpe-kvot, historisk avkastning och avgiftsstruktur.",
  },
  {
    title: "Enkelt och begripligt",
    desc: "Avancerad analys gjord enkel. Du behöver ingen ekonomiutbildning.",
  },
  {
    title: "Du behåller kontrollen",
    desc: "Du bestämmer alltid. Vi ger verktygen och insikterna — inga råd mot din vilja.",
  },
];

// ── Kalkylator ────────────────────────────────────────────────────────────────
// Smal centrerad "ark"-kolumn med tre sliders och ett kvitto-liknande resultat.
// Beräkningsmodellen (0,15 % optimerad avgift, 10 år) är oförändrad.

function PortfolioCalculator() {
  const [capital, setCapital]     = useState(200000);
  const [grossReturn, setGrossReturn] = useState(8.0);
  const [fee, setFee]             = useState(0.80);
  const YEARS = 10;
  const TARGET_FEE = 0.15;

  const net         = grossReturn - fee;
  const netOpt      = grossReturn - TARGET_FEE;
  const endValue    = capital * Math.pow(1 + net / 100, YEARS);
  const endValueOpt = capital * Math.pow(1 + netOpt / 100, YEARS);
  const diff        = Math.round(endValueOpt - endValue);

  const kr = (n: number) => Math.round(n).toLocaleString("sv-SE") + " kr";

  return (
    <div className="mx-auto max-w-[680px] rounded-md border border-line bg-white p-6 sm:p-9" style={CARD_SHADOW}>
      {/* Sliders */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-ink-2">Sparkapital</span>
          <span className="text-sm font-semibold text-ink tabular-nums">{kr(capital)}</span>
        </div>
        <input type="range" className="calc-range" min={10000} max={2000000} step={10000} value={capital}
          onChange={(e) => setCapital(Number(e.target.value))} aria-label="Sparkapital" />
        <div className="flex justify-between text-[11px] text-ink-4">
          <span>10 000 kr</span><span>2 000 000 kr</span>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-ink-2">Din förväntade avkastning</span>
          <span className="text-sm font-semibold text-ink tabular-nums">{grossReturn.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %</span>
        </div>
        <input type="range" className="calc-range" min={1} max={15} step={0.5} value={grossReturn}
          onChange={(e) => setGrossReturn(Number(e.target.value))} aria-label="Din förväntade avkastning" />
        <div className="flex justify-between text-[11px] text-ink-4">
          <span>1 %</span><span>15 %</span>
        </div>
      </div>

      <div className="mb-7">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-ink-2">Dina fonders avgift</span>
          <span className="text-sm font-semibold text-ink tabular-nums">{fee.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %</span>
        </div>
        <input type="range" className="calc-range" min={0} max={2} step={0.05} value={fee}
          onChange={(e) => setFee(Number(e.target.value))} aria-label="Dina fonders avgift" />
        <div className="flex justify-between text-[11px] text-ink-4">
          <span>0 %</span><span>2 %</span>
        </div>
      </div>

      {/* Kvitto */}
      <div className="border-t border-line pt-5">
        <div className="flex justify-between border-b border-dashed border-line py-2">
          <span className="text-[13px] text-ink-2">Nuvarande portfölj, 10 år ({net.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} %/år netto)</span>
          <span className="text-sm font-semibold text-ink tabular-nums shrink-0 pl-3">{kr(endValue)}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-[13px] text-ink-2">Optimerad avgift (0,15 %), 10 år</span>
          <span className="text-sm font-semibold text-accent tabular-nums shrink-0 pl-3">{kr(endValueOpt)}</span>
        </div>
        <div className="flex items-center justify-between pt-4">
          <span className="font-heading text-[15px] font-bold text-pos">Skillnad efter 10 år</span>
          <span className="font-heading text-[19px] font-extrabold text-pos tabular-nums shrink-0 pl-3">
            {(diff >= 0 ? "+" : "") + kr(diff)}
          </span>
        </div>
      </div>

      <p className="mt-5 text-[11.5px] text-ink-4 leading-[1.5]">
        Illustration av ränta-på-ränta-effekten. Inte en finansiell prognos.
      </p>
    </div>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  { q: "Är detta finansiell rådgivning?", a: "Nej. Sharpa är ett automatiserat analysverktyg som jämför fonder utifrån historiska nyckeltal. Vi har inget tillstånd att bedriva investeringsrådgivning och analyserna tar inte hänsyn till din personliga situation — alla investeringsbeslut fattar du själv." },
  { q: "Är Sharpa verkligen gratis?", a: "Ja, helt gratis. Ingen avgift, inget kreditkort och inget konto krävs för grundfunktionerna." },
  { q: "Hur skapar ni portföljförslagen?", a: "Automatiskt. Vi beräknar din risknivå baserat på dina svar och matchar sedan bäst rankade fonder inom varje kategori — rangordnade på Sharpe-kvot, historisk avkastning och avgift." },
  { q: "Behöver jag logga in?", a: "Nej. Du kan bygga och analysera portföljer utan konto. Du behöver ett konto bara om du vill spara dina portföljer." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line-soft last:border-0">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between py-4 text-left gap-4">
        <span className="text-sm font-semibold text-ink">{q}</span>
        <svg
          className={`w-4 h-4 text-ink-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <p className="text-sm text-ink-2 leading-[1.7] pb-5">{a}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
// Genomgående rytm: sektioner delas av tunna hårlinjer i stället för färgblock.

export default function HowItWorks() {
  return (
    <div>

      {/* Vad kan du göra — proof-ledda kort */}
      <section className="py-16 sm:py-16">
        <p className="text-xs font-semibold text-accent uppercase tracking-[0.08em] mb-3">Vad kan du göra?</p>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink leading-tight">
          Allt du behöver för smartare fondsparande
        </h2>
        <p className="mt-3 text-[15px] text-ink-2 leading-[1.7]">
          Från att bygga din första portfölj till att optimera en befintlig.
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-6">
          <FeatureCard
            title="Förbättra det du redan har."
            description="Se om du kan få mer för pengarna, på samma risknivå."
            cta="Analysera mina fonder"
            href="/analyze"
            proof={<SwapProof />}
          />
          <FeatureCard
            title="Din portfölj på 2 minuter."
            description="Svara på 6 frågor — vi sätter ihop portföljen."
            cta="Bygg din portfölj gratis"
            href="/bygg-portfolj"
            proof={<PortfolioProof />}
          />
        </div>
      </section>

      <div className="h-px bg-line" />

      {/* Varför Sharpa — diskreta 01–04 */}
      <section className="py-16 sm:py-16">
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink mb-8">Varför Sharpa?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-9 max-w-4xl">
          {TRUST_ITEMS.map((item, i) => (
            <div key={item.title} className="flex gap-4">
              <span className="font-heading text-[22px] font-extrabold leading-none text-[#D8DDE1] tabular-nums shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink mb-1.5">{item.title}</p>
                <p className="text-sm text-ink-2 leading-[1.6]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-line" />

      {/* Räkna själv — interaktiv kalkylator */}
      <section className="py-16 sm:py-16">
        <div className="mx-auto max-w-[680px] mb-8 text-center">
          <p className="text-xs font-semibold text-accent uppercase tracking-[0.08em] mb-3">Räkna själv</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink leading-tight">Vad är skillnaden egentligen?</h2>
          <p className="mt-3 text-[13.5px] text-ink-2 leading-[1.6]">
            Ränta-på-ränta gör att även en liten förbättring i avgift ger stor skillnad på lång sikt.
          </p>
        </div>
        <PortfolioCalculator />
      </section>

      <div className="h-px bg-line" />

      {/* FAQ — oförändrad */}
      <section className="py-16 sm:py-16">
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 lg:gap-16 items-start">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink leading-tight">Vanliga frågor</h2>
            <p className="text-ink-2 mt-4 text-base leading-[1.7]">
              Det viktigaste om hur Sharpa fungerar — kort och rakt på sak.
            </p>
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
            >
              Se alla frågor och svar
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-line px-6" style={CARD_SHADOW}>
            {FAQS.map((faq) => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

    </div>
  );
}
