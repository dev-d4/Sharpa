import { ButtonLink } from "@/components/ui/button";

/**
 * Portföljbevakning på landningssidan.
 *
 * Samma redaktionella grepp som resten av sidan: hårlinjer, whitespace och
 * diskreta 01–03 i stället för kort, gradienter och färgblock. Notisexemplet
 * är en enkel inramad ruta, inte en dashboardillustration.
 */

const STEPS = [
  {
    title: "Spara din portfölj",
    desc: "Analysera dina fonder och spara resultatet på ditt konto.",
  },
  {
    title: "Vi analyserar den löpande",
    desc: "När fonddatan uppdateras räknas portföljen om mot de nya siffrorna.",
  },
  {
    title: "Du får besked vid viktiga förändringar",
    desc: "Sjunker betyget tydligt mejlar vi dig — med vad som har förändrats.",
  },
];

export default function PortfolioWatch() {
  return (
    <section className="py-12 sm:py-16">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
        <div>
          <p className="label-meta mb-3">Portföljbevakning</p>
          <h2 className="font-display text-[26px] leading-tight text-ink sm:text-[32px]">
            En fondanalys som fortsätter arbeta.
          </h2>
          <p className="mt-3 max-w-[560px] text-[15px] leading-[1.7] text-ink-2">
            Spara din portfölj så analyserar Sharpa om den när fonddata uppdateras. Om betyget
            försämras tydligt får du veta vad som har förändrats.
          </p>

          <ol className="mt-8 border-t border-line">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4 border-b border-line py-4">
                <span className="figure shrink-0 text-[15px] leading-relaxed text-ink-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-[15px] font-medium text-ink">{step.title}</p>
                  <p className="mt-0.5 text-[14px] leading-[1.6] text-ink-2">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <ButtonLink href="/analyze" variant="primary" className="mt-8">
            Analysera och bevaka min portfölj
          </ButtonLink>
        </div>

        {/* Diskret exempel på hur en notis ser ut */}
        <div className="lg:pt-14">
          <p className="label-meta mb-3">Exempel på notis</p>
          <div className="border border-line bg-white p-5 sm:p-6">
            <p className="text-[15px] font-medium text-ink">Din portfölj har förändrats</p>
            <p className="mt-2 text-[14px] leading-[1.6] text-ink-2">
              Betyget har gått från <span className="figure text-ink">7,8</span> till{" "}
              <span className="figure text-ink">7,1</span>
            </p>
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-[14px] leading-[1.6] text-ink-2">
                Riskjusterad avkastning har försämrats för två av dina fonder.
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-[1.5] text-ink-3">
            Notiserna är automatiskt genererad information om din sparade portfölj — inte personlig
            finansiell rådgivning.
          </p>
        </div>
      </div>
    </section>
  );
}
