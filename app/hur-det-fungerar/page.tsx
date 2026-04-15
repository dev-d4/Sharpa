import Link from "next/link";

export const metadata = {
  title: "Hur det fungerar – Fondanalys",
  description:
    "Lär dig hur Fondanalys analyserar din portfölj, hur riskprofilen beräknas och vad varje nyckeltal betyder.",
};

// ── Reusable components ───────────────────────────────────────────────────────

function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5 scroll-mt-24">
      {children}
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-slate-900">{children}</h2>;
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-600 leading-relaxed">{children}</p>;
}

function MetricCard({
  label,
  formula,
  interpretation,
  good,
  bad,
}: {
  label: string;
  formula: string;
  interpretation: string;
  good: string;
  bad: string;
}) {
  return (
    <div className="border border-slate-100 rounded-xl p-4 space-y-2 bg-slate-50">
      <p className="font-bold text-slate-900">{label}</p>
      <p className="text-xs text-slate-400 font-mono">{formula}</p>
      <p className="text-sm text-slate-600 leading-relaxed">{interpretation}</p>
      <div className="flex gap-2 pt-1 flex-wrap">
        <span className="text-xs text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">Bra: {good}</span>
        <span className="text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">Se upp: {bad}</span>
      </div>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
      {n}
    </div>
  );
}

// ── Table of contents ─────────────────────────────────────────────────────────

const TOC = [
  { href: "#oversikt", label: "Översikt" },
  { href: "#riskprofil", label: "Riskprofilen" },
  { href: "#analys", label: "Portföljanalysen" },
  { href: "#optimering", label: "Optimeringsalgoritmen" },
  { href: "#nyckeltal", label: "Nyckeltal förklarade" },
  { href: "#data", label: "Datakällan" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HurDetFungerar() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Hur det fungerar</h1>
        <p className="text-slate-500 leading-relaxed">
          En genomgång av hur Fondanalys analyserar din portfölj, hur riskprofilen räknas ut och vad varje nyckeltal egentligen mäter.
        </p>
      </div>

      {/* Table of contents */}
      <nav className="bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">Innehåll</p>
        <ul className="space-y-1.5">
          {TOC.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="text-sm text-blue-700 hover:underline">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* 1. Översikt */}
      <Section id="oversikt">
        <SectionTitle>Översikt</SectionTitle>
        <Lead>
          Fondanalys är ett gratis verktyg som hjälper privatinvesterare att förstå sin fondportfölj och hitta bättre alternativ — utan att prata med en rådgivare. Du anger dina fonder och hur stor andel du har i varje, väljer din depå (Avanza, Nordnet eller Övrigt) och får direkt svar på:
        </Lead>
        <ul className="space-y-2 text-sm text-slate-600">
          {[
            "Vad din portfölj kostar i avgifter per år",
            "Hur den har avkastat historiskt (1, 3 och 5 år)",
            "Hur väl den matchar din risktolerans",
            "Vilka enskilda fonder som kan bytas mot bättre alternativ",
            "Hur nyckeltal (avgift, avkastning, Sharpe) skulle förändras om du genomför bytena",
          ].map((point) => (
            <li key={point} className="flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              {point}
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          Fondanalys tillhandahåller inte finansiell rådgivning. All information är i informationssyfte och ska inte ses som köp- eller säljrekommendationer.
        </p>
      </Section>

      {/* 2. Riskprofil */}
      <Section id="riskprofil">
        <SectionTitle>Riskprofilen</SectionTitle>
        <Lead>
          Riskprofilen är en 5-gradig skala — Försiktig, Defensiv, Balanserad, Tillväxt och Offensiv — som beskriver hur mycket risk du är villig att ta med ditt sparande. Den tas fram via fyra frågor:
        </Lead>

        <div className="space-y-3">
          {[
            { q: "Tidshorisont", desc: "Hur länge planerar du att ha pengarna investerade? En längre horisont tillåter mer risk eftersom du har tid att rida ut nedgångar." },
            { q: "Reaktion vid nedgång", desc: "Om portföljen föll 20 % — skulle du sälja, avvakta eller köpa mer? Din faktiska reaktion vid oros avslöjar din reella risktolerans bättre än hypotetiska svar." },
            { q: "Kapitalets vikt", desc: "Hur viktigt är det här kapitalet? Pengar du inte har råd att förlora ska förvaltas försiktigt oavsett horisont." },
            { q: "Risk vs. avkastning", desc: "Vad värderar du mest — att skydda kapitalet eller att maximera avkastningen? Det speglar din grundinställning till investering." },
          ].map(({ q, desc }, i) => (
            <div key={q} className="flex gap-3">
              <StepBadge n={i + 1} />
              <div>
                <p className="font-semibold text-slate-900 text-sm">{q}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Beräkning: </span>
          Varje svar ger 1–5 poäng. Genomsnittet av de fyra svaren avrundas till närmaste heltal och ger en risknivå 1–5. Exempel: svar 2 + 3 + 3 + 4 = 12 → genomsnitt 3 → <span className="font-medium">Balanserad</span>.
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Hur profilen används</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            När du sparar en portfölj jämförs den automatiskt mot din riskprofil. Andelen aktiefonder används som proxy för portföljens risknivå (blandfondsandelen räknas till hälften). Skillnaden märks med en färgad badge på varje portföljkort: grön (i linje), gul (en nivå skillnad), röd (två eller fler nivåers skillnad).
          </p>
        </div>
      </Section>

      {/* 3. Portföljanalys */}
      <Section id="analys">
        <SectionTitle>Portföljanalysen</SectionTitle>
        <Lead>
          Analysen tar emot dina fonder med viktning och beräknar viktat genomsnitt för varje nyckeltal. Det innebär att en fond med 60 % vikt påverkar resultatet tre gånger mer än en fond med 20 % vikt.
        </Lead>

        <div className="space-y-3">
          {[
            { step: 1, title: "Fonddata hämtas", body: "Vi slår upp varje ISIN mot vår databas och hämtar aktuella nyckeltal för rätt depå. Om du väljer Nordnet och en fond enbart finns där hämtas extra data direkt från Nordnets API i realtid." },
            { step: 2, title: "Viktat genomsnitt beräknas", body: "Avgift, avkastning, Sharpe, volatilitet och övriga nyckeltal beräknas som viktat genomsnitt. Kategorier (aktiefonder, räntefonder, blandfonder m.fl.) summeras ihop och visas som en fördelningsgraf." },
            { step: 3, title: "Bytesförslag genereras", body: "Varje fond jämförs mot alla peers i samma fondkategori hos din depå (se nedan). De bästa alternativen presenteras som bytesförslag." },
            { step: 4, title: "Föreslagen portfölj beräknas", body: "Om du genomför alla föreslagna byten beräknas hur portföljens nyckeltal (avgift, avkastning, Sharpe) skulle förändras. Om du angett kr-belopp visas även uppskattad vinst i kronor per år." },
          ].map(({ step, title, body }) => (
            <div key={step} className="flex gap-3">
              <StepBadge n={step} />
              <div>
                <p className="font-semibold text-slate-900 text-sm">{title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. Optimeringsalgoritmen */}
      <Section id="optimering">
        <SectionTitle>Optimeringsalgoritmen</SectionTitle>
        <Lead>
          Bytesförslagen bygger på en poängmodell som jämför varje fond mot alla fonder i samma kategori tillgängliga hos din depå.
        </Lead>

        <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-4 space-y-2">
          <p className="text-sm font-semibold text-slate-800">Poängformel per fond</p>
          <p className="font-mono text-sm text-blue-800 bg-blue-50 rounded-lg px-3 py-2">
            poäng = Sharpe × 3 + avkastning3år × 0,05 + avkastning1år × 0,02 − avgift × 1,5
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Sharpe-kvoten viktas tyngst eftersom den kombinerar avkastning och risk i ett tal. Avgiften subtraheras eftersom den är en säker, annual kostnad. Avkastning 1 och 3 år ges lägre vikt då de är historiska och ej garanterade.
          </p>
        </div>

        <div className="space-y-3 text-sm text-slate-600">
          <p><span className="font-semibold text-slate-800">Bästa i kategorin:</span> Den fond i din portfölj som har högst poäng bland alla sina peers (inklusive sig själv) byts inte ut — den märks istället som "Redan bäst i sin kategori".</p>
          <p><span className="font-semibold text-slate-800">Konsolidering:</span> Om den bästa fonden i en kategori redan finns i din portfölj rekommenderas du att flytta kapitalet dit, istället för att köpa en ny fond.</p>
          <p><span className="font-semibold text-slate-800">Gruppering:</span> Om samma fond är det bästa valet för flera av dina innehav grupperas de till ett "topval-kort" — ett tydligt sätt att se att en fond dominerar en hel kategori i din portfölj.</p>
          <p><span className="font-semibold text-slate-800">Likhetsbeskrivning:</span> Varje bytesförslag förklarar varför fonderna är utbytbara — t.ex. "Båda är globala Large Cap aktiefonder" — baserat på fondkategorin hos din depå.</p>
        </div>
      </Section>

      {/* 5. Nyckeltal */}
      <Section id="nyckeltal">
        <SectionTitle>Nyckeltal förklarade</SectionTitle>
        <Lead>
          Alla nyckeltal i analysen är viktade genomsnitt baserade på din portföljviktning.
        </Lead>

        <div className="space-y-3">
          <MetricCard
            label="Snittavgift (TER / Ongoing charge)"
            formula="Σ (fondavgift × vikt) / 100"
            interpretation="Den genomsnittliga årliga förvaltningsavgiften för hela portföljen. Avgiften dras automatiskt av fondbolagets NAV-kurs varje dag och syns aldrig explicit, men den minskar din avkastning år för år."
            good="Under 0,5 % — typiskt för indexfonder"
            bad="Över 1,0 % — minskar avkastningen markant på sikt"
          />
          <MetricCard
            label="Avkastning 1 år"
            formula="Σ (avkastning1år × vikt) / 100"
            interpretation="Portföljens viktade avkastning de senaste 12 månaderna. Hög 1-årsavkastning kan bero på marknadstiming snarare än fondkvalitet. Används som komplement till 3-årsavkastningen."
            good="Beror på marknad och kategori — jämför mot index"
            bad="Väsentligt under jämförbart index"
          />
          <MetricCard
            label="Avkastning 3 år (annualiserad)"
            formula="Σ (avkastning3år × vikt) / 100"
            interpretation="Genomsnittlig årlig avkastning de senaste tre åren. Längre mätperiod ger en mer rättvisande bild av fondens prestation eftersom enstaka år med extremt hög eller låg avkastning jämnas ut."
            good="Över 7–8 % / år för globala aktiefonder historiskt"
            bad="Konsekvent under sitt jämförelseindex"
          />
          <MetricCard
            label="Sharpe-kvot (3 år)"
            formula="(avkastning − riskfri ränta) / standardavvikelse"
            interpretation="Mäter hur mycket avkastning du får per enhet risk. En Sharpe-kvot på 1,0 innebär att du får lika mycket avkastning som risk. Högre är bättre — det innebär att portföljen kompenserar dig väl för den risk du tar."
            good="Över 1,0 — god riskjusterad avkastning"
            bad="Under 0 — avkastningen kompenserar inte för risken"
          />
          <MetricCard
            label="Volatilitet (standardavvikelse 3 år)"
            formula="Historisk standardavvikelse av månadsavkastning × √12"
            interpretation="Mäter hur mycket portföljens värde svänger från månad till månad. Hög volatilitet är inte alltid dåligt — det beror på din risktolerans och tidshorisont. En ung sparare med lång horisont kan acceptera hög volatilitet."
            good="Låg för kapitalbevarare; hög kan vara OK vid lång horisont"
            bad="Hög volatilitet i kombination med kort tidshorisont"
          />
          <MetricCard
            label="Avkastning 5 år (annualiserad)"
            formula="Σ (avkastning5år × vikt) / 100"
            interpretation="Ger en ännu längre blick bakåt och inkluderar fler marknadscykler. Bra komplement till 3-årstalet för att bedöma om en fond presterat konsekvent eller bara haft ett bra treårsperiod."
            good="Konsekvent positiv avkastning över full marknadscykel"
            bad="Stor diskrepans mot 3-årstalet (kan indikera engångshändelse)"
          />
        </div>
      </Section>

      {/* 6. Data */}
      <Section id="data">
        <SectionTitle>Datakällan</SectionTitle>
        <Lead>
          Fonddata hämtas från Avanza och Nordnet en gång per månad och lagras i vår databas. Det innebär att nyckeltal kan vara upp till 4 veckor gamla.
        </Lead>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {[
            { label: "Avanza", value: "~1 500 fonder" },
            { label: "Nordnet", value: "~1 700 fonder" },
            { label: "Uppdateringsfrekvens", value: "Månadsvis" },
            { label: "Kategorisystem", value: "Avanza / Nordnet" },
            { label: "Lagring", value: "Supabase (PostgreSQL, EU)" },
            { label: "Användardata", value: "Riskprofil & portföljer per konto" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-xl px-4 py-3 flex justify-between">
              <span className="text-slate-500">{label}</span>
              <span className="font-semibold text-slate-800">{value}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">
          Kategoriseringen av fonder (aktiefond, räntefond, blandfond osv.) hämtas direkt från Avanza och Nordnet. Det innebär att alla bytesförslag sker inom samma kategori — en globalfond jämförs alltid mot andra globalfonder, aldrig mot en räntefond eller en Sverigefond.
        </p>
      </Section>

      {/* CTA */}
      <div className="text-center space-y-4 py-4">
        <p className="text-slate-600">Redo att analysera din portfölj?</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/analyze"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md shadow-blue-200 text-sm"
          >
            Analysera din portfölj →
          </Link>
          <Link
            href="/risk-profile"
            className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-6 py-3 rounded-xl transition-all text-sm shadow-sm"
          >
            Ta fram din riskprofil
          </Link>
        </div>
      </div>

    </div>
  );
}
