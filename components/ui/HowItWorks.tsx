"use client";

import Link from "next/link";
import { AccordionItem } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/button";
import PortfolioWatch from "@/components/ui/PortfolioWatch";
import { useLanguage } from "@/lib/i18n";

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
  const { isEnglish } = useLanguage();
  const trustItems = isEnglish ? [
    { title: "Independent of fund providers", desc: "We receive no commission from fund providers. Sharpa is funded by licence revenue from professional users. Every fund is compared using the same criteria." },
    { title: "Data-driven", desc: "Funds are compared by fees, historical returns and risk — using the same criteria for every fund." },
    { title: "Easy to understand", desc: "You get a clear result without having to be a financial expert." },
  ] : TRUST_ITEMS;
  const faqs = isEnglish ? [
    { q: "Is this financial advice?", a: "No. Sharpa is an automated analysis tool that compares funds using historical key figures. The analysis does not consider your personal circumstances, and you make all investment decisions yourself." },
    { q: "Is Sharpa really free?", a: "Yes. The basic features are free and require neither a credit card nor an account." },
    { q: "Do I need to log in?", a: "No. You can analyse funds and view sample portfolios without an account. You only need an account to save and monitor a portfolio." },
  ] : FAQS;
  return (
    <div>
      {/* Analysera och Bygg är de två aktiva vägarna in i produkten. */}
      <section className="py-12 sm:py-16">
        <div className="max-w-[620px]">
          <p className="label-meta">{isEnglish ? "Two ways to get started" : "Två sätt att komma igång"}</p>
          <h2 className="mt-3 font-display text-[26px] leading-tight text-ink sm:text-[32px]">
            {isEnglish ? "Choose what suits you" : "Välj det som passar dig"}
          </h2>
        </div>

        <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-12">
          <div className="border-t-2 border-ink pt-5">
            <p className="label-meta">{isEnglish ? "I already own funds" : "Jag har redan fonder"}</p>
            <h3 className="mt-3 font-display text-[22px] leading-tight text-ink sm:text-[26px]">
              {isEnglish ? "Analyse my portfolio" : "Analysera min portfölj"}
            </h3>
            <p className="mt-2 max-w-[440px] text-[15px] leading-relaxed text-ink-2">
              {isEnglish ? "Compare fees, returns and risk with similar funds and get a clear score." : "Jämför avgift, avkastning och risk mot liknande fonder och få ett tydligt betyg."}
            </p>
            <ButtonLink href="/analyze" variant="primary" className="mt-6">
              {isEnglish ? "Analyse my portfolio" : "Analysera min portfölj"}
            </ButtonLink>
          </div>

          <div className="border-t-2 border-ink pt-5">
            <p className="label-meta">{isEnglish ? "I want help getting started" : "Jag vill ha hjälp att komma igång"}</p>
            <h3 className="mt-3 font-display text-[22px] leading-tight text-ink sm:text-[26px]">
              {isEnglish ? "Build a sample portfolio" : "Bygg ett portföljexempel"}
            </h3>
            <p className="mt-2 max-w-[440px] text-[15px] leading-relaxed text-ink-2">
              {isEnglish ? "Answer four questions and see an illustrative example tailored to your risk level." : "Svara på fyra frågor och se ett illustrativt exempel anpassat efter din risknivå."}
            </p>
            <ButtonLink href="/bygg-portfolj" variant="primary" className="mt-6">
              {isEnglish ? "Build a sample portfolio" : "Bygg ett portföljexempel"}
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Bevakning kommer efter vägvalet som produktens fortsatta värde. */}
      <div className="h-px bg-line" />
      <PortfolioWatch />

      {/* Förtroendeargumenten hålls till en enda kompakt rad. */}
      <section className="border-y border-line py-10 sm:py-12">
        <p className="label-meta mb-7 text-center">{isEnglish ? "How the comparison works" : "Så fungerar jämförelsen"}</p>
        <div className="grid gap-7 sm:grid-cols-3 sm:gap-8">
          {trustItems.map((item) => (
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
            <p className="label-meta mb-3">{isEnglish ? "Good to know" : "Bra att veta"}</p>
            <h2 className="font-display text-[26px] leading-tight text-ink sm:text-[32px]">
              {isEnglish ? "Frequently asked questions" : "Vanliga frågor"}
            </h2>
            <Link
              href="/faq"
              className="mt-4 inline-block text-sm text-accent underline decoration-line-strong underline-offset-2 transition-colors duration-150 hover:decoration-accent"
            >
              {isEnglish ? "See all questions and answers" : "Se alla frågor och svar"}
            </Link>
          </div>
          <div className="border-t border-ink">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
