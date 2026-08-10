"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Portföljbevakning på landningssidan — riktning 1b ("notisen i centrum").
 *
 * Betygsfallet bär sektionen genom skala; de tre stegen står som en dämpad
 * kolumn till höger på desktop och som en vågrät rad på mobil. Stegskenans
 * loop är ren CSS och oberoende av scroll.
 *
 * Notisen styrs av hur långt användaren har scrollat genom sektionen: läget går
 * från "vi bevakar" till "vi har upptäckt en försämring" och betyget rullar
 * ned 7,8 → 7,1. Scrollar man tillbaka spolas förloppet tillbaka. Allt som
 * animeras ligger i DOM:en från start med reserverad plats, så inget hoppar.
 * Vid prefers-reduced-motion visas slutläget direkt.
 */

const STEPS = ["Spara din portfölj", "Alla portföljer granskas", "Du får ett samlat mejl"];

const SCORE_BEFORE = 7.8;
const SCORE_AFTER = 7.1;
const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const DELTA = `−${fmt(Math.abs(SCORE_BEFORE - SCORE_AFTER))}`;

export default function PortfolioWatch() {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(SCORE_BEFORE);
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    if (reduced) {
      raf = requestAnimationFrame(() => {
        setRevealed(true);
        setComplete(true);
        setScore(SCORE_AFTER);
      });
      return () => cancelAnimationFrame(raf);
    }

    const update = () => {
      raf = 0;
      const { top } = el.getBoundingClientRect();
      // Förloppet pågår medan sektionens överkant rör sig genom mitten av
      // skärmen. Det ger en tydlig, kontrollerbar rörelse även på små skärmar.
      const start = window.innerHeight * 0.82;
      const end = window.innerHeight * 0.25;
      const progress = Math.min(1, Math.max(0, (start - top) / (start - end)));

      setScore(SCORE_BEFORE + (SCORE_AFTER - SCORE_BEFORE) * progress);
      setRevealed(progress > 0.12);
      setComplete(progress > 0.92);
    };
    const requestUpdate = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      cancelAnimationFrame(raf);
    };
  }, []);

  /**
   * Fade in/ut. Texterna som byts ut ligger i samma rutnätscell, så in- och
   * uttoning staplas i tid i stället för att köras samtidigt — annars går det
   * att läsa båda varianterna ovanpå varandra mitt i övergången.
   */
  const MOTION_OFF = "motion-reduce:transition-none motion-reduce:delay-0";
  const fadeIn = (on: boolean) =>
    `transition-opacity duration-500 ease-out delay-200 ${MOTION_OFF} ${on ? "opacity-100" : "opacity-0"}`;
  const fadeOut = (on: boolean) =>
    `transition-opacity duration-200 ease-out ${MOTION_OFF} ${on ? "opacity-100" : "opacity-0"}`;

  return (
    <section ref={ref} className="flex flex-col gap-8 py-12 sm:gap-10 sm:py-16">
      {/* Intro */}
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[26px] leading-[1.12] text-ink sm:text-[30px]">
          Få veta när din portfölj förändras
        </h2>
        <p className="max-w-[620px] text-[15px] leading-[1.65] text-ink-2 sm:text-base">
          Spara portföljen så följer vi betyget och mejlar dig efter varje ny kontroll.
        </p>
      </div>

      <div className="grid items-start gap-10 border-t border-line pt-7 lg:grid-cols-2 lg:gap-16">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Etikett — pricken tänds när försämringen upptäcks */}
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className={`size-[7px] shrink-0 rounded-[1px] transition-colors duration-700 ${
                revealed ? "bg-accent" : "bg-ink-4"
              }`}
            />
            <span className="grid">
              <span className={`label-meta col-start-1 row-start-1 ${fadeOut(!revealed)}`}>
                Exempel: ett portföljbetyg bevakas
              </span>
              <span
                aria-hidden={!revealed}
                className={`label-meta col-start-1 row-start-1 ${fadeIn(revealed)}`}
              >
                Exempel: portföljbetyget har sjunkit
              </span>
            </span>
          </div>

          <p
            className="figure flex items-baseline gap-4 leading-none tracking-[-0.02em] sm:gap-[22px]"
            aria-label={
              revealed
                ? `Betyget har gått från ${fmt(SCORE_BEFORE)} till ${fmt(SCORE_AFTER)}, ${DELTA}`
                : `Betyget är ${fmt(SCORE_BEFORE)}`
            }
          >
            <span
              aria-hidden
              className={`text-[length:clamp(48px,12vw,76px)] transition-colors duration-700 ${
                revealed ? "text-ink-4" : "text-ink"
              }`}
            >
              {fmt(SCORE_BEFORE)}
            </span>
            <span
              aria-hidden
              className={`self-center text-[length:clamp(20px,5vw,30px)] text-ink-3 ${fadeIn(revealed)}`}
            >
              →
            </span>
            <span
              aria-hidden
              className={`text-[length:clamp(48px,12vw,76px)] text-ink ${fadeIn(revealed)}`}
            >
              {fmt(score)}
            </span>
            <span
              aria-hidden
              className={`self-center text-[16px] text-neg sm:text-[18px] transition-opacity duration-300 ease-out ${MOTION_OFF} ${complete ? "opacity-100" : "opacity-0"}`}
            >
              {DELTA}
            </span>
          </p>

          {/* Exempeltexten byts ut i samma rutnätscell så höjden är konstant. */}
          <span className="grid max-w-[420px] text-[15px] leading-[1.6] text-ink-2 sm:text-base">
            <span className={`col-start-1 row-start-1 ${fadeOut(!revealed)}`}>
              Portföljen bevakas i bakgrunden.
            </span>
            <span
              aria-hidden={!revealed}
              className={`col-start-1 row-start-1 ${fadeIn(revealed)}`}
            >
              Två fonder har tappat mot jämförbara fonder.
            </span>
          </span>

          {/* Friskrivningen står intill utdatan, inte i den dämpade sidospalten —
              se COMPLIANCE.md § 4B. */}
          <p className="max-w-[420px] text-xs leading-[1.6] text-ink-4">
            Illustrativt exempel, inte personlig rådgivning. Historisk avkastning är ingen garanti
            för framtida resultat.
          </p>
        </div>

        {/* Ett ljust segment vandrar längs skenan i en ständig loop. Bara linjen
            rör sig — texten står stilla och fullt läsbar hela tiden. Skenan
            ligger vågrätt ovanför stegen på mobil och lodrätt vid sidan på
            desktop, så flödet alltid följer läsriktningen. */}
        <ol className="relative grid min-w-0 grid-cols-3 gap-x-4 pt-6 lg:flex lg:flex-col lg:gap-0 lg:pl-7 lg:pt-0">
          {/* Skenorna spänner mellan första och sista prickens mittpunkt, så
              segmentet alltid börjar och slutar exakt på en punkt. På mobil är
              det kolumnmitterna: en halv kolumnbredd in från vardera kanten. */}
          <span
            aria-hidden
            className="absolute left-[calc((100%-2rem)/6)] right-[calc((100%-2rem)/6)] top-[3px] h-px bg-line-strong lg:hidden"
          >
            <span className="animate-rail-draw-x rail-glow absolute inset-y-0 bg-accent" />
          </span>
          <span
            aria-hidden
            className="absolute bottom-[11px] left-[3px] top-[10px] hidden w-px bg-line-strong lg:block"
          >
            <span className="animate-rail-draw rail-glow absolute inset-x-0 bg-accent" />
          </span>
          {STEPS.map((step, i) => (
            <li
              key={step}
              /* Fast höjd på desktop i stället för padding: då ligger prickarna
                 garanterat jämnt fördelade på skenan — och mittenpricken exakt
                 på 50 % — även om en etikett skulle radbrytas. */
              className="relative min-w-0 text-center lg:text-left lg:[&:not(:last-child)]:h-[112px]"
            >
              <span
                aria-hidden
                className={`absolute -top-6 left-1/2 size-[7px] -translate-x-1/2 rounded-full bg-line-strong lg:left-0 lg:top-[7px] lg:-ml-7 lg:translate-x-0 ${
                  ["animate-dot-lit-1", "animate-dot-lit-2", "animate-dot-lit-3"][i]
                }`}
              />
              <span className="block text-sm leading-snug text-ink lg:text-base">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
