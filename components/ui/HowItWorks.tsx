"use client";

import { useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { AccordionItem } from "@/components/ui/Accordion";

// ── Trust section ─────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  {
    title: "Oberoende analys",
    desc: "Vi tar inga provisioner från fondbolag. Våra jämförelser bygger på förutbestämda kriterier.",
  },
  {
    title: "Datadrivna beslut",
    desc: "2 100+ fonder jämförda utifrån avgift, historisk avkastning och risk.",
  },
  {
    title: "Enkelt och begripligt",
    desc: "Avancerad analys gjord enkel. Du behöver ingen ekonomiutbildning.",
  },
  {
    title: "Du behåller kontrollen",
    desc: "Du bestämmer alltid. Vi visar data, jämförelser och begränsningar — inte personliga råd.",
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
    <div className="mx-auto max-w-[680px] rounded-md border border-line bg-white p-6 sm:p-9">
      {/* Sliders */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-2">Sparkapital</span>
          <span className="figure text-base text-ink">{kr(capital)}</span>
        </div>
        <input type="range" className="calc-range" min={10000} max={2000000} step={10000} value={capital}
          onChange={(e) => setCapital(Number(e.target.value))} aria-label="Sparkapital" />
        <div className="flex justify-between text-[11px] text-ink-3">
          <span>10 000 kr</span><span>2 000 000 kr</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-2">Din förväntade avkastning</span>
          <span className="figure text-base text-ink">{grossReturn.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %</span>
        </div>
        <input type="range" className="calc-range" min={1} max={15} step={0.5} value={grossReturn}
          onChange={(e) => setGrossReturn(Number(e.target.value))} aria-label="Din förväntade avkastning" />
        <div className="flex justify-between text-[11px] text-ink-3">
          <span>1 %</span><span>15 %</span>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-2">Dina fonders avgift</span>
          <span className="figure text-base text-ink">{fee.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %</span>
        </div>
        <input type="range" className="calc-range" min={0} max={2} step={0.05} value={fee}
          onChange={(e) => setFee(Number(e.target.value))} aria-label="Dina fonders avgift" />
        <div className="flex justify-between text-[11px] text-ink-3">
          <span>0 %</span><span>2 %</span>
        </div>
      </div>

      {/* Kvitto */}
      <div className="border-t border-line pt-6">
        <div className="flex flex-col gap-1 border-b border-line py-3 sm:flex-row sm:justify-between sm:gap-3">
          <span className="text-sm leading-snug text-ink-2">Nuvarande portfölj, 10 år ({net.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} %/år netto)</span>
          <span className="figure text-base text-ink sm:shrink-0">{kr(endValue)}</span>
        </div>
        <div className="flex flex-col gap-1 border-b border-line py-3 sm:flex-row sm:justify-between sm:gap-3">
          <span className="text-sm leading-snug text-ink-2">Optimerad avgift (0,15 %), 10 år</span>
          <span className="figure text-base text-ink sm:shrink-0">{kr(endValueOpt)}</span>
        </div>
        <div className="flex flex-col gap-1 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="text-[15px] font-medium text-ink">Skillnad efter 10 år</span>
          <span className="figure text-[24px] text-pos sm:shrink-0">
            {(diff >= 0 ? "+" : "") + kr(diff)}
          </span>
        </div>
      </div>

      <p className="mt-6 text-xs leading-[1.5] text-ink-3">
        Illustrativ jämförelse med en fondavgift på 0,15 %. Faktiska alternativ och framtida avkastning kan skilja sig. Inte en finansiell prognos.
      </p>
    </div>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  { q: "Är detta finansiell rådgivning?", a: "Nej. Sharpa är ett automatiserat analysverktyg som jämför fonder utifrån historiska nyckeltal. Vi har inget tillstånd att bedriva investeringsrådgivning och analyserna tar inte hänsyn till din personliga situation — alla investeringsbeslut fattar du själv." },
  { q: "Är Sharpa verkligen gratis?", a: "Ja, helt gratis. Ingen avgift, inget kreditkort och inget konto krävs för grundfunktionerna." },
  { q: "Hur skapar ni portföljexemplen?", a: "Automatiskt. Vi beräknar en risknivå baserat på dina svar och visar ett illustrativt exempel med fonder som rankas högt inom varje kategori — utifrån riskjusterad avkastning, historisk avkastning och avgift." },
  { q: "Behöver jag logga in?", a: "Nej. Du kan analysera fonder och se portföljexempel utan konto. Du behöver ett konto bara om du vill spara en portfölj." },
];

// ── Main ──────────────────────────────────────────────────────────────────────
// Genomgående rytm: sektioner delas av tunna hårlinjer i stället för färgblock.

export default function HowItWorks() {
  return (
    <div>

      {/* Vägval — två linjekolumner med en 2px inklinje över, inte kort.
          Analysera och Bygg portfölj är jämbördiga huvudfunktioner och får
          därför samma knappvikt, inte primär/sekundär. */}
      <section className="py-12 sm:py-16">
        <p className="label-meta mb-6">Välj den väg som passar dig</p>

        <div className="grid gap-10 sm:grid-cols-2 sm:gap-12">
          <div className="border-t-2 border-ink pt-5">
            <p className="label-meta">Jag har redan fonder</p>
            <h3 className="mt-3 font-display text-[22px] leading-tight text-ink sm:text-[26px]">
              Analysera min portfölj
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
              Se avgifter, avkastning, risk och möjliga alternativ.
            </p>
            <ButtonLink href="/analyze" variant="primary" className="mt-6">
              Börja analysera
            </ButtonLink>
          </div>

          <div className="border-t-2 border-ink pt-5">
            <p className="label-meta">Jag har ingen portfölj</p>
            <h3 className="mt-3 font-display text-[22px] leading-tight text-ink sm:text-[26px]">
              Skapa ett portföljexempel
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
              Svara på 4 frågor och se ett illustrativt portföljexempel.
            </p>
            <ButtonLink href="/bygg-portfolj" variant="primary" className="mt-6">
              Skapa portföljexempel
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="h-px bg-line" />

      {/* Varför Sharpa — diskreta 01–04 */}
      <section className="py-12 sm:py-16">
        <h2 className="mb-8 font-display text-[26px] leading-tight text-ink sm:mb-10 sm:text-[32px]">Varför Sharpa?</h2>
        <div className="grid max-w-4xl grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2 sm:gap-y-10">
          {TRUST_ITEMS.map((item, i) => (
            <div key={item.title} className="flex gap-4">
              <span className="figure shrink-0 text-[18px] leading-tight text-ink-3">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="mb-1.5 text-[15px] font-medium text-ink">{item.title}</p>
                <p className="text-[15px] leading-[1.6] text-ink-2">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-line" />

      {/* Räkna själv — interaktiv kalkylator */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto mb-8 max-w-[680px] text-center">
          <p className="label-meta mb-3">Räkna själv</p>
          <h2 className="font-display text-[26px] leading-tight text-ink sm:text-[32px]">Vad är skillnaden egentligen?</h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-ink-2">
            Ränta-på-ränta gör att även en liten förbättring i avgift och avkastning ger stor skillnad på lång sikt.
          </p>
        </div>
        <PortfolioCalculator />
      </section>

      <div className="h-px bg-line" />

      {/* Vanliga frågor — hårlinjeavdelade rader, ingen kortyta */}
      <section className="py-12 sm:py-16">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div>
            <h2 className="font-display text-[26px] leading-tight text-ink sm:text-[32px]">Vanliga frågor</h2>
            <p className="mt-4 text-[15px] leading-[1.7] text-ink-2">
              Det viktigaste om hur Sharpa fungerar — kort och rakt på sak.
            </p>
            <Link
              href="/faq"
              className="mt-4 inline-block text-sm text-accent underline decoration-line-strong underline-offset-2 transition-colors duration-150 hover:decoration-accent"
            >
              Se alla frågor och svar
            </Link>
          </div>
          <div className="border-t border-ink">
            {FAQS.map((faq) => <AccordionItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

    </div>
  );
}
