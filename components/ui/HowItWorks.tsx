"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import DonutChart from "@/components/ui/DonutChart";

// ── Feature cards ─────────────────────────────────────────────────────────────

const BUILD_SLICES = [
  { label: "Global",   weight: 45 },
  { label: "Räntor",   weight: 30 },
  { label: "Sverige",  weight: 15 },
  { label: "Tillväxt", weight: 10 },
];

function BuildCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
    >
      <div className="p-5 sm:p-7 flex flex-col flex-1 space-y-5">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">Bygg portfölj</p>
          <h3 className="text-xl font-bold text-slate-900">Din portfölj på 2 minuter</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Svara på 6 frågor om dina mål och risktolerans. Vi sätter ihop en komplett fondportfölj anpassad just för dig.
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 w-fit">
          <DonutChart slices={BUILD_SLICES} centerLabel="70%" centerSub="Aktier" size={88} thickness={14} horizontal disableHover />
        </div>

        <ul className="space-y-2.5">
          {[
            "Personliga fondförslag från 1 500+ fonder",
            "Justerbara andelar med en slider",
            "Spara och följ upp dina portföljer",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
              <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {item}
            </li>
          ))}
        </ul>

        <div className="pt-2 mt-auto">
          <Link
            href="/bygg-portfolj"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-md shadow-blue-500/25"
          >
            Bygg din portfölj gratis →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function AnalyzeCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
    >
      <div className="p-5 sm:p-7 flex flex-col flex-1 space-y-5">
        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Analysera portfölj</p>
          <h3 className="text-xl font-bold text-slate-900">Förbättra det du redan har</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Lägg in dina befintliga fonder och se direkt hur de presterar — avgifter, risk och konkreta bytesförslag.
          </p>
        </div>

        {/* Mock swap suggestion preview */}
        <div className="bg-slate-50 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Nuvarande</p>
              <p className="text-xs font-semibold text-slate-700 truncate">SEB Sverige Index</p>
              <p className="text-[10px] text-slate-400">Avgift 0.40%/år</p>
            </div>
            <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">Föreslagen</p>
              <p className="text-xs font-semibold text-slate-700 truncate">Avanza Zero</p>
              <p className="text-[10px] text-emerald-600">Avgift 0.00%/år</p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-2">
            <p className="text-[10px] font-semibold text-emerald-600">▲ Sparar 0.40% per år i avgifter</p>
          </div>
        </div>

        <ul className="space-y-2.5">
          {[
            "Avgiftsanalys och jämförelse",
            "Riskbedömning och Sharpe-kvot",
            "Konkreta fondbytesförslag",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
              <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {item}
            </li>
          ))}
        </ul>

        <div className="pt-2 mt-auto">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Analysera mina fonder →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Trust section ─────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  {
    icon: (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Oberoende analys",
    desc: "Vi tar inga provisioner från fondbolag. Våra rekommendationer är alltid neutrala.",
  },
  {
    icon: (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Datadrivna beslut",
    desc: "1 500+ fonder analyserade med Sharpe-kvot, historisk avkastning och avgiftsstruktur.",
  },
  {
    icon: (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Enkelt och begripligt",
    desc: "Avancerad analys gjord enkel. Du behöver ingen ekonomiutbildning.",
  },
  {
    icon: (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-8">
      <div className="grid sm:grid-cols-2 gap-8 sm:gap-10 items-start">

        {/* Inputs */}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-sm font-semibold text-slate-700">Ditt sparkapital</label>
              <span className="text-sm font-bold text-slate-900 tabular-nums">{capital.toLocaleString("sv-SE")} kr</span>
            </div>
            <input type="range" min={10000} max={2000000} step={10000} value={capital}
              onChange={e => setCapital(Number(e.target.value))} className="w-full accent-blue-500" />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>10 000 kr</span><span>2 000 000 kr</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-sm font-semibold text-slate-700">Din förväntade avkastning</label>
              <span className="text-sm font-bold text-slate-900 tabular-nums">{grossReturn.toFixed(1)}% / år</span>
            </div>
            <input type="range" min={1} max={15} step={0.5} value={grossReturn}
              onChange={e => setGrossReturn(Number(e.target.value))} className="w-full accent-blue-500" />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>1%</span><span>15%</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-sm font-semibold text-slate-700">Dina fonders avgift</label>
              <span className="text-sm font-bold text-slate-900 tabular-nums">{fee.toFixed(2)}% / år</span>
            </div>
            <input type="range" min={0.00} max={2.00} step={0.05} value={fee}
              onChange={e => setFee(Number(e.target.value))} className="w-full accent-blue-500" />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0%</span>
              <span className="text-amber-500 font-medium">Snitt ~0.80%</span>
              <span>2%</span>
            </div>
          </div>

          {/* Net return display */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <span className="text-xs text-slate-500">Nettoavkastning</span>
            <span className={`text-sm font-bold tabular-nums ${net < 1 ? "text-red-500" : "text-slate-800"}`}>
              {net.toFixed(2)}% / år
            </span>
          </div>
        </div>

        {/* Output */}
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Efter {YEARS} år</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Nuvarande portfölj</p>
                  <p className="text-[10px] text-slate-400">{net.toFixed(2)}% netto/år</p>
                </div>
                <p className="text-xl font-bold text-slate-800 tabular-nums">{Math.round(endValue).toLocaleString("sv-SE")} kr</p>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-600">Optimerad avgift</p>
                  <p className="text-[10px] text-slate-400">{netOpt.toFixed(2)}% netto/år ({TARGET_FEE}% avgift)</p>
                </div>
                <p className="text-xl font-bold text-blue-600 tabular-nums">{Math.round(endValueOpt).toLocaleString("sv-SE")} kr</p>
              </div>
            </div>
          </div>

          {diff > 0 && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-green-700/60 mb-1">Skillnad efter {YEARS} år</p>
              <p className="text-3xl sm:text-4xl font-bold text-green-700 tabular-nums">+{diff.toLocaleString("sv-SE")} kr</p>
              <p className="text-xs text-green-700/50 mt-1">med lägre avgift, samma avkastning</p>
            </div>
          )}

          <p className="text-[10px] text-slate-300 leading-relaxed">
            Illustration av ränta-på-ränta-effekten. Inte en finansiell prognos.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  { q: "Är Fondanalys verkligen gratis?", a: "Ja, helt gratis. Ingen avgift, inget kreditkort och inget konto krävs för grundfunktionerna." },
  { q: "Hur skapar ni portföljförslagen?", a: "Vi beräknar din risknivå baserat på dina svar och matchar sedan bäst rankade fonder inom varje kategori — rangordnade på Sharpe-kvot, historisk avkastning och avgift." },
  { q: "Behöver jag logga in?", a: "Nej. Du kan bygga och analysera portföljer utan konto. Du behöver ett konto bara om du vill spara dina portföljer." },
  { q: "Kan jag ändra min portfölj efter att ha fått förslaget?", a: "Ja. På resultatsidan kan du justera aktie/ränte-fördelningen, generera om portföljen och bläddra bland alternativa fonder." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between py-4 text-left gap-4">
        <span className="text-sm font-semibold text-slate-800">{q}</span>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <p className="text-sm text-slate-500 leading-relaxed pb-4">{a}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HowItWorks() {
  return (
    <section className="space-y-16 sm:space-y-32">

      {/* Section header + cards — grouped tightly together */}
      <div className="space-y-10 sm:space-y-12">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3">Vad kan du göra?</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            Allt du behöver för smartare fondsparande
          </h2>
          <p className="text-slate-400 mt-3 text-base max-w-md mx-auto">
            Från att bygga din första portfölj till att optimera en befintlig.
          </p>
        </motion.div>

        {/* Two feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <BuildCard />
          <AnalyzeCard />
        </div>
      </div>

      {/* Why trust us */}
      <div>
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Varför Fondanalys?</h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-8 max-w-3xl mx-auto">
          {TRUST_ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              className="flex gap-4"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-1">{item.title}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Kalkylator */}
      <div>
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3">Räkna själv</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">Vad är skillnaden egentligen?</h2>
          <p className="text-slate-400 mt-3 text-base max-w-md mx-auto">
            Ränta-på-ränta gör att även en liten förbättring i avkastning eller avgift ger stor skillnad på lång sikt.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <PortfolioCalculator />
        </motion.div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto w-full">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Vanliga frågor</h2>
        </motion.div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6">
          {FAQS.map((faq) => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
        </div>
      </div>

    </section>
  );
}
