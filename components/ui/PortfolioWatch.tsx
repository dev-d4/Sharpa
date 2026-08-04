"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Portföljbevakning på landningssidan — riktning 1b ("notisen i centrum").
 *
 * Betygsfallet bär sektionen genom skala; de tre stegen ligger som dämpade
 * marginalnoteringar bredvid. Sektionen har medvetet ingen egen CTA — den finns
 * längre ned på sidan.
 *
 * Notisen styrs av hur långt användaren har scrollat genom sektionen: läget går
 * från "vi bevakar" till "vi har upptäckt en försämring" och betyget rullar
 * ned 7,8 → 7,1. Scrollar man tillbaka spolas förloppet tillbaka. Allt som
 * animeras ligger i DOM:en från start med reserverad plats, så inget hoppar.
 * Vid prefers-reduced-motion visas slutläget direkt.
 */

const STEPS = [
  {
    title: "Spara din portfölj",
    desc: "Analysera dina fonder och spara resultatet på ditt konto.",
  },
  {
    title: "Vi håller koll åt dig",
    desc: "Sharpa bevakar portföljen i bakgrunden. Du behöver inte göra något.",
  },
  {
    title: "Slå på notiser om du vill",
    desc: "Väljer du att få notiser mejlar vi dig när betyget försämras tydligt — med vad som har förändrats.",
  },
];

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
    <section ref={ref} className="flex flex-col gap-10 py-12 sm:gap-[52px] sm:py-16">
      {/* Intro */}
      <div className="flex flex-col gap-4">
        <p className="label-meta">Portföljbevakning</p>
        <h2 className="font-display text-[26px] leading-[1.12] text-ink sm:text-[30px]">
          Din portfölj bevakas — även när du inte gör det.
        </h2>
        <p className="max-w-[620px] text-[15px] leading-[1.65] text-ink-2 sm:text-base">
          Analysen är inte en engångssak. Vi håller ett öga på din sparade portfölj och hör av oss
          när något viktigt har förändrats.
        </p>
      </div>

      {/* Artefakt: notisen i stor skala, stegen underordnade */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] lg:items-start lg:gap-16">
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
                Ditt portföljbetyg bevakas
              </span>
              <span
                aria-hidden={!revealed}
                className={`label-meta col-start-1 row-start-1 ${fadeIn(revealed)}`}
              >
                Ditt portföljbetyg har sjunkit
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

          {/* Brödtexten byts ut i samma rutnätscell så höjden är konstant */}
          <span className="grid max-w-[420px] text-[15px] leading-[1.6] text-ink-2 sm:text-base">
            <span className={`col-start-1 row-start-1 ${fadeOut(!revealed)}`}>
              Vi bevakar din sparade portfölj i bakgrunden — du behöver inte göra något.
            </span>
            <span
              aria-hidden={!revealed}
              className={`col-start-1 row-start-1 ${fadeIn(revealed)}`}
            >
              Två av dina fonder har tappat mot liknande fonder. Du får ett mejl med
              sammanfattningen.
            </span>
          </span>

          {/* Friskrivningen står intill utdatan, inte i den dämpade sidospalten —
              se COMPLIANCE.md § 4B. */}
          <p className="max-w-[420px] text-xs leading-[1.6] text-ink-4">
            Automatiskt genererad information om en sparad portfölj — inte personlig finansiell
            rådgivning. Siffrorna ovan är ett illustrativt exempel. Historisk avkastning är ingen
            garanti för framtida resultat.
          </p>
        </div>

        {/* Tre steg som marginalnoteringar — hårlinjen flyttar från topp till
            vänsterkant vid samma brytpunkt som kolumnerna läggs sida vid sida. */}
        <div className="flex min-w-0 flex-col border-t border-line pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <ol className="flex flex-col gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-1">
                <span className="figure text-xs text-ink-4">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-sm font-semibold text-ink">{step.title}</p>
                <p className="text-[13px] leading-[1.55] text-ink-2">{step.desc}</p>
              </li>
            ))}
          </ol>

        </div>
      </div>
    </section>
  );
}
