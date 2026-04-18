import Link from "next/link";

export const metadata = {
  title: "Hur det fungerar – Fondanalys",
  description:
    "Lär dig hur Fondanalys analyserar din portfölj, hur riskprofilen tas fram och vad varje nyckeltal betyder.",
};

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
  interpretation,
  good,
  bad,
}: {
  label: string;
  interpretation: string;
  good: string;
  bad: string;
}) {
  return (
    <div className="border border-slate-100 rounded-xl p-4 space-y-2 bg-slate-50">
      <p className="font-bold text-slate-900">{label}</p>
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

const TOC = [
  { href: "#oversikt", label: "Översikt" },
  { href: "#riskprofil", label: "Riskprofilen" },
  { href: "#analys", label: "Portföljanalysen" },
  { href: "#nyckeltal", label: "Nyckeltal förklarade" },
];

export default function HurDetFungerar() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Hur det fungerar</h1>
        <p className="text-slate-500 leading-relaxed">
          En genomgång av hur Fondanalys analyserar din portfölj, hur riskprofilen tas fram och vad varje nyckeltal egentligen mäter.
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
          Fondanalys hjälper privatinvesterare att förstå sin fondportfölj och hitta bättre alternativ — utan att prata med en rådgivare. Du anger dina fonder och hur stor andel du har i varje, och får direkt svar på:
        </Lead>
        <ul className="space-y-2 text-sm text-slate-600">
          {[
            "Vad din portfölj kostar i avgifter per år",
            "Hur den har avkastat historiskt",
            "Hur väl den matchar din risktolerans",
            "Vilka fonder som kan bytas mot bättre alternativ",
            "Hur din portfölj skulle se ut efter rekommenderade byten",
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
            { q: "Reaktion vid nedgång", desc: "Om portföljen föll 20 % — skulle du sälja, avvakta eller köpa mer? Din faktiska reaktion vid oro avslöjar din reella risktolerans." },
            { q: "Kapitalets vikt", desc: "Hur viktigt är det här kapitalet? Pengar du inte har råd att förlora ska förvaltas försiktigt oavsett horisont." },
            { q: "Risk vs. avkastning", desc: "Vad värderar du mest — att skydda kapitalet eller att maximera avkastningen?" },
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

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Hur profilen används</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            När du sparar en portfölj jämförs den automatiskt mot din riskprofil. Skillnaden syns som en färgad badge på varje portföljkort: grön (i linje), gul (nära), röd (tydlig avvikelse).
          </p>
        </div>
      </Section>

      {/* 3. Portföljanalys */}
      <Section id="analys">
        <SectionTitle>Portföljanalysen</SectionTitle>
        <Lead>
          Analysen tar emot dina fonder med viktning och räknar ut hur din portfölj presterar som helhet — inte bara fond för fond.
        </Lead>

        <div className="space-y-3">
          {[
            { step: 1, title: "Fonddata hämtas", body: "Vi slår upp varje fond i vår databas och hämtar aktuella nyckeltal." },
            { step: 2, title: "Portföljen vägs ihop", body: "Avgift, avkastning, Sharpe och övriga nyckeltal vägs ihop baserat på hur stor andel du har i varje fond. En fond med stor andel påverkar resultatet mer." },
            { step: 3, title: "Bytesförslag tas fram", body: "Varje fond jämförs mot liknande fonder i samma kategori. De bästa alternativen presenteras som bytesförslag." },
            { step: 4, title: "Föreslagen portfölj visas", body: "Om du genomför alla föreslagna byten beräknas hur din portfölj skulle förändras — avgifter, avkastning och risk." },
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

      {/* 4. Nyckeltal */}
      <Section id="nyckeltal">
        <SectionTitle>Nyckeltal förklarade</SectionTitle>
        <Lead>
          Alla nyckeltal i analysen är viktade genomsnitt baserade på din portföljviktning.
        </Lead>

        <div className="space-y-3">
          <MetricCard
            label="Snittavgift"
            interpretation="Den genomsnittliga årliga förvaltningsavgiften för hela portföljen. Avgiften dras automatiskt och syns aldrig explicit, men den minskar din avkastning år för år."
            good="Under 0,5 % — typiskt för indexfonder"
            bad="Över 1,0 % — minskar avkastningen markant på sikt"
          />
          <MetricCard
            label="Avkastning 1 år"
            interpretation="Portföljens avkastning de senaste 12 månaderna. Används som komplement till 3-årsavkastningen."
            good="Beror på marknad och kategori — jämför mot index"
            bad="Väsentligt under jämförbart index"
          />
          <MetricCard
            label="Avkastning 3 år (annualiserad)"
            interpretation="Genomsnittlig årlig avkastning de senaste tre åren. Längre mätperiod ger en mer rättvisande bild än ett enskilt år."
            good="Över 7–8 % / år för globala aktiefonder historiskt"
            bad="Konsekvent under sitt jämförelseindex"
          />
          <MetricCard
            label="Sharpe-kvot"
            interpretation="Mäter hur mycket avkastning du får per enhet risk. Högre är bättre — det innebär att portföljen kompenserar dig väl för den risk du tar."
            good="Över 1,0 — god riskjusterad avkastning"
            bad="Under 0 — avkastningen kompenserar inte för risken"
          />
          <MetricCard
            label="Volatilitet"
            interpretation="Mäter hur mycket portföljens värde svänger. Hög volatilitet är inte alltid dåligt — det beror på din risktolerans och tidshorisont."
            good="Låg för kapitalbevarare; hög kan vara OK vid lång horisont"
            bad="Hög volatilitet i kombination med kort tidshorisont"
          />
          <MetricCard
            label="Avkastning 5 år (annualiserad)"
            interpretation="Ger en längre blick bakåt och inkluderar fler marknadscykler. Bra komplement till 3-årstalet."
            good="Konsekvent positiv avkastning över full marknadscykel"
            bad="Stor diskrepans mot 3-årstalet"
          />
        </div>
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
