"use client";

import Link from "next/link";
import { AccordionItem } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/button";
import PortfolioWatch from "@/components/ui/PortfolioWatch";

const TRUST_ITEMS = [
  {
    title: "Oberoende av fondbolag",
    desc: "Vi tar inga provisioner från fondbolag. Sharpa finansieras av licensintäkter från professionella användare. Jämförelsen följer samma kriterier för alla.",
  },
  {
    title: "Datadrivet",
    desc: "Fonder jämförs utifrån avgift, historisk avkastning och risk — samma kriterier för alla fonder.",
  },
  {
    title: "Begripligt",
    desc: "Du får ett tydligt resultat utan att behöva vara expert på ekonomi.",
  },
];

const FAQS = [
  {
    q: "Är detta finansiell rådgivning?",
    a: "Nej. Sharpa är ett automatiserat analysverktyg som jämför fonder utifrån historiska nyckeltal. Analysen tar inte hänsyn till din personliga situation och alla investeringsbeslut fattar du själv.",
  },
  {
    q: "Är Sharpa verkligen gratis?",
    a: "Ja. Grundfunktionerna är gratis och kräver varken kreditkort eller konto.",
  },
  {
    q: "Behöver jag logga in?",
    a: "Nej. Du kan analysera fonder och se portföljexempel utan konto. Ett konto behövs bara om du vill spara och bevaka en portfölj.",
  },
];

export default function HowItWorks() {
  return (
    <div>
      {/* Analysera och Bygg är de två aktiva vägarna in i produkten. */}
      <section className="py-14 sm:py-20">
        <p className="label-meta text-center">Välj vad du vill göra</p>

        <div className="mt-7 grid gap-8 sm:grid-cols-2 sm:gap-12">
          <div className="border-t-2 border-ink pt-5">
            <p className="label-meta">01 · Analysera</p>
            <h3 className="mt-3 font-display text-[22px] leading-tight text-ink sm:text-[26px]">
              Se hur dina fonder står sig
            </h3>
            <p className="mt-2 max-w-[440px] text-[15px] leading-relaxed text-ink-2">
              Jämför avgift, avkastning och risk mot liknande fonder och få ett tydligt betyg.
            </p>
            <ButtonLink href="/analyze" variant="primary" className="mt-6">
              Analysera min portfölj
            </ButtonLink>
          </div>

          <div className="border-t-2 border-ink pt-5">
            <p className="label-meta">02 · Bygg</p>
            <h3 className="mt-3 font-display text-[22px] leading-tight text-ink sm:text-[26px]">
              Börja med ett portföljexempel
            </h3>
            <p className="mt-2 max-w-[440px] text-[15px] leading-relaxed text-ink-2">
              Svara på fyra frågor och se ett illustrativt exempel anpassat efter din risknivå.
            </p>
            <ButtonLink href="/bygg-portfolj" variant="primary" className="mt-6">
              Bygg ett portföljexempel
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Bevakning kommer efter vägvalet som produktens fortsatta värde. */}
      <div className="h-px bg-line" />
      <PortfolioWatch />

      {/* Förtroendeargumenten hålls till en enda kompakt rad. */}
      <section className="border-y border-line py-10 sm:py-12">
        <p className="label-meta mb-7 text-center">Så fungerar jämförelsen</p>
        <div className="grid gap-7 sm:grid-cols-3 sm:gap-8">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title}>
              <h3 className="text-[15px] font-semibold text-ink">{item.title}</h3>
              <p className="mt-1 text-sm leading-[1.6] text-ink-2">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Kort FAQ. */}
      <section className="py-14 sm:py-20">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
          <div>
            <p className="label-meta mb-3">Bra att veta</p>
            <h2 className="font-display text-[26px] leading-tight text-ink sm:text-[32px]">
              Vanliga frågor
            </h2>
            <Link
              href="/faq"
              className="mt-4 inline-block text-sm text-accent underline decoration-line-strong underline-offset-2 transition-colors duration-150 hover:decoration-accent"
            >
              Se alla frågor och svar
            </Link>
          </div>
          <div className="border-t border-ink">
            {FAQS.map((faq) => (
              <AccordionItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
