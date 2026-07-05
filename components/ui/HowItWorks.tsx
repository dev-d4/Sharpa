"use client";

import { useState } from "react";
import Link from "next/link";
import DonutChart from "@/components/ui/DonutChart";
import { CHART_PALETTE } from "@/lib/chart-palette";

// ── Feature cards ─────────────────────────────────────────────────────────────

const BUILD_SLICES = [
  { label: "Global",   weight: 45 },
  { label: "Räntor",   weight: 30 },
  { label: "Sverige",  weight: 15 },
  { label: "Tillväxt", weight: 10 },
];

const CARD_SHADOW = { boxShadow: "0 1px 2px rgba(16,24,40,.04)" };

function FeatureCard({
  kicker,
  title,
  description,
  bullets,
  cta,
  href,
  visual,
}: {
  kicker: string;
  title: string;
  description: string;
  bullets: string[];
  cta: string;
  href: string;
  visual: React.ReactNode;
}) {
  return (
    <article className="group flex h-full flex-col rounded-[14px] border border-line bg-white p-5 sm:p-6 transition-colors hover:border-info-line" style={CARD_SHADOW}>
      <div className="mb-6">{visual}</div>

      <div className="flex flex-1 flex-col">
        <p className="text-xs font-semibold text-accent uppercase tracking-[0.08em] mb-3">{kicker}</p>
        <h3 className="font-heading text-xl sm:text-2xl font-bold text-ink leading-tight">{title}</h3>
        <p className="mt-3 text-[15px] text-ink-2 leading-[1.7]">{description}</p>
      </div>

      <ul className="mt-6 space-y-3">
        {bullets.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-ink-2">
            <svg className="w-4 h-4 text-pos mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {item}
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className="mt-7 inline-flex items-center justify-center gap-2 rounded-[10px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-press"
      >
        {cta}
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
      </Link>
    </article>
  );
}

// ── Produktvisualer — riktigt innehåll i stället för stockbilder ──────────────

function SwapVisual() {
  return (
    <div className="rounded-[12px] bg-section p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-4 mb-4">Exempel på fondbyte</p>
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-ink-4 uppercase tracking-[0.05em] mb-1.5">Nuvarande</p>
          <p className="text-sm font-semibold text-ink-2 truncate">SEB Sverige Index</p>
          <p className="text-xs text-ink-4 mt-1 tabular-nums">0,40%/år · 5 år +64%</p>
        </div>
        <div className="w-8 h-8 rounded-[10px] bg-white border border-line flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-ink-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-pos uppercase tracking-[0.05em] mb-1.5">Föreslagen</p>
          <p className="text-sm font-semibold text-ink truncate">Avanza Zero</p>
          <p className="text-xs text-pos mt-1 tabular-nums">0,00%/år · 5 år +68%</p>
        </div>
      </div>
      <div className="mt-5 pt-4 border-t border-line-soft flex items-center gap-2">
        <svg className="w-4 h-4 text-pos shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        <p className="text-xs font-semibold text-pos">Lägre avgift och bättre avkastning</p>
      </div>
    </div>
  );
}

function PortfolioVisual() {
  return (
    <div className="rounded-[12px] bg-section p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-4 mb-4">Exempel på portfölj</p>
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
    </div>
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

  return (
    <div className="bg-white rounded-xl border border-line p-5 sm:p-8" style={CARD_SHADOW}>
      <div className="grid sm:grid-cols-2 gap-8 sm:gap-10 items-start">

        {/* Inputs */}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-sm font-medium text-ink-2">Ditt sparkapital</label>
              <span className="text-sm font-semibold text-ink tabular-nums">{capital.toLocaleString("sv-SE")} kr</span>
            </div>
            <input type="range" min={10000} max={2000000} step={10000} value={capital}
              onChange={e => setCapital(Number(e.target.value))} className="w-full accent-accent" />
            <div className="flex justify-between text-[10px] text-ink-4 mt-1">
              <span>10 000 kr</span><span>2 000 000 kr</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-sm font-medium text-ink-2">Din förväntade avkastning</label>
              <span className="text-sm font-semibold text-ink tabular-nums">{grossReturn.toFixed(1)}% / år</span>
            </div>
            <input type="range" min={1} max={15} step={0.5} value={grossReturn}
              onChange={e => setGrossReturn(Number(e.target.value))} className="w-full accent-accent" />
            <div className="flex justify-between text-[10px] text-ink-4 mt-1">
              <span>1%</span><span>15%</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-sm font-medium text-ink-2">Dina fonders avgift</label>
              <span className="text-sm font-semibold text-ink tabular-nums">{fee.toFixed(2)}% / år</span>
            </div>
            <input type="range" min={0.00} max={2.00} step={0.05} value={fee}
              onChange={e => setFee(Number(e.target.value))} className="w-full accent-accent" />
            <div className="flex justify-between text-[10px] text-ink-4 mt-1">
              <span>0%</span>
              <span className="text-warn font-medium">Snitt ~0.80%</span>
              <span>2%</span>
            </div>
          </div>

          {/* Net return display */}
          <div className="flex items-center justify-between bg-section rounded-[10px] px-4 py-3">
            <span className="text-xs text-ink-3">Nettoavkastning</span>
            <span className={`text-sm font-semibold tabular-nums ${net < 1 ? "text-neg" : "text-ink"}`}>
              {net.toFixed(2)}% / år
            </span>
          </div>
        </div>

        {/* Output */}
        <div className="space-y-3">
          <div className="rounded-[10px] border border-line p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4 mb-3">Efter {YEARS} år</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-ink-3">Nuvarande portfölj</p>
                  <p className="text-[10px] text-ink-4">{net.toFixed(2)}% netto/år</p>
                </div>
                <p className="text-xl font-semibold text-ink tabular-nums">{Math.round(endValue).toLocaleString("sv-SE")} kr</p>
              </div>

              <div className="h-px bg-line-soft" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-accent">Optimerad avgift</p>
                  <p className="text-[10px] text-ink-4">{netOpt.toFixed(2)}% netto/år ({TARGET_FEE}% avgift)</p>
                </div>
                <p className="text-xl font-semibold text-accent tabular-nums">{Math.round(endValueOpt).toLocaleString("sv-SE")} kr</p>
              </div>
            </div>
          </div>

          {diff > 0 && (
            <div className="bg-pos-soft border border-pos/15 rounded-[10px] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-pos/70 mb-1">Skillnad efter {YEARS} år</p>
              <p className="text-3xl sm:text-4xl font-semibold text-pos tabular-nums">+{diff.toLocaleString("sv-SE")} kr</p>
              <p className="text-xs text-pos/70 mt-1">med lägre avgift, samma avkastning</p>
            </div>
          )}

          <p className="text-[10px] text-ink-4 leading-relaxed">
            Illustration av ränta-på-ränta-effekten. Inte en finansiell prognos.
          </p>
        </div>
      </div>
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

export default function HowItWorks() {
  return (
    <section className="space-y-16 pt-10 sm:space-y-32 sm:pt-16">

      {/* Section header + feature cards */}
      <div className="space-y-8 sm:space-y-10">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-accent uppercase tracking-[0.08em] mb-3">Vad kan du göra?</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink leading-tight">
            Allt du behöver för smartare fondsparande
          </h2>
          <p className="mt-4 text-base text-ink-2 leading-[1.7]">
            Börja där du är: analysera fonderna du redan äger eller bygg en ny portfölj från grunden.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <FeatureCard
            kicker="Analysera portfölj"
            title="Förbättra det du redan har"
            description="Lägg in dina befintliga fonder och se snabbt om det finns billigare eller starkare alternativ."
            bullets={[
              "Se hur dina fonder faktiskt presterar",
              "Jämför avgifter mot marknadens bästa alternativ",
              "Få konkreta bytesförslag",
            ]}
            cta="Analysera mina fonder"
            href="/analyze"
            visual={<SwapVisual />}
          />

          <FeatureCard
            kicker="Bygg portfölj"
            title="Din portfölj på 2 minuter"
            description="Svara på några frågor om mål och risk, så sätter Sharpa ihop ett tydligt fondförslag."
            bullets={[
              "Svara på 6 frågor om mål och risk",
              "Personliga förslag från 1 500+ fonder",
              "Justera, spara och följ upp",
            ]}
            cta="Bygg din portfölj gratis"
            href="/bygg-portfolj"
            visual={<PortfolioVisual />}
          />
        </div>
      </div>

      {/* Why trust us */}
      <div>
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink mb-8">Varför Sharpa?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8 max-w-4xl">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="border-l-2 border-line pl-4">
              <p className="text-sm font-semibold text-ink mb-1">{item.title}</p>
              <p className="text-sm text-ink-2 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Kalkylator */}
      <div>
        <div className="max-w-2xl mb-8">
          <p className="text-xs font-semibold text-accent uppercase tracking-[0.08em] mb-3">Räkna själv</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink leading-tight">Vad är skillnaden egentligen?</h2>
          <p className="text-ink-2 mt-4 text-base leading-[1.7]">
            Ränta-på-ränta gör att även en liten förbättring i avkastning eller avgift ger stor skillnad på lång sikt.
          </p>
        </div>
        <PortfolioCalculator />
      </div>

      {/* FAQ */}
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
  );
}
