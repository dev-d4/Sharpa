"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

/**
 * Portföljbevakning på landningssidan — riktning 1b ("notisen i centrum").
 *
 * Notisen styrs av hur långt användaren har scrollat genom sektionen: läget går
 * från "vi bevakar" till "vi har upptäckt en försämring" och betyget rullar
 * ned 7,8 → 7,1. Scrollar man tillbaka spolas förloppet tillbaka. Allt som
 * animeras ligger i DOM:en från start med reserverad plats, så inget hoppar.
 * Vid prefers-reduced-motion visas slutläget direkt.
 */

const SCORE_BEFORE = 7.8;
const SCORE_AFTER = 7.1;
const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const DELTA = `−${fmt(Math.abs(SCORE_BEFORE - SCORE_AFTER))}`;

export default function PortfolioWatch() {
  const { isEnglish } = useLanguage();
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
          {isEnglish ? "Find out when your portfolio changes" : "Få veta när din portfölj förändras"}
        </h2>
        <p className="max-w-[620px] text-[15px] leading-[1.65] text-ink-2 sm:text-base">
          {isEnglish ? "Save your portfolio and we will track its score and email you after every new review." : "Spara portföljen så följer vi betyget och mejlar dig efter varje ny kontroll."}
        </p>
      </div>

      <div className="grid items-stretch gap-8 border-t border-line pt-7 lg:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)] lg:gap-16">
        <div className="flex max-w-[560px] min-w-0 flex-col gap-6">
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
                {isEnglish ? "Example: a portfolio score is monitored" : "Exempel: ett portföljbetyg bevakas"}
              </span>
              <span
                aria-hidden={!revealed}
                className={`label-meta col-start-1 row-start-1 ${fadeIn(revealed)}`}
              >
                {isEnglish ? "Example: the portfolio score has fallen" : "Exempel: portföljbetyget har sjunkit"}
              </span>
            </span>
          </div>

          <p
            className="figure flex items-baseline gap-4 leading-none tracking-[-0.02em] sm:gap-[22px]"
            aria-label={
              revealed
                ? (isEnglish ? `The score has fallen from ${SCORE_BEFORE.toFixed(1)} to ${SCORE_AFTER.toFixed(1)}, ${DELTA}` : `Betyget har gått från ${fmt(SCORE_BEFORE)} till ${fmt(SCORE_AFTER)}, ${DELTA}`)
                : (isEnglish ? `The score is ${SCORE_BEFORE.toFixed(1)}` : `Betyget är ${fmt(SCORE_BEFORE)}`)
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
              {isEnglish ? "The portfolio is monitored in the background." : "Portföljen bevakas i bakgrunden."}
            </span>
            <span
              aria-hidden={!revealed}
              className={`col-start-1 row-start-1 ${fadeIn(revealed)}`}
            >
              {isEnglish ? "Two funds have fallen behind comparable funds." : "Två fonder har tappat mot jämförbara fonder."}
            </span>
          </span>

          {/* Friskrivningen står intill utdatan, inte i den dämpade sidospalten —
              se COMPLIANCE.md § 4B. */}
          <p className="max-w-[420px] text-xs leading-[1.6] text-ink-4">
            {isEnglish ? "Illustrative example, not personal advice. Past performance is no guarantee of future results." : "Illustrativt exempel, inte personlig rådgivning. Historisk avkastning är ingen garanti för framtida resultat."}
          </p>
        </div>

        <aside className="rounded-md border border-line bg-white p-5 sm:p-6" aria-label={isEnglish ? "Example notification" : "Exempel på notis"}>
          <div className="flex items-center gap-2.5">
            <Mail aria-hidden="true" className="size-4 shrink-0 text-accent" strokeWidth={1.7} />
            <p className="label-meta">{isEnglish ? "Example notification" : "Exempel på notis"}</p>
          </div>
          <h3 className="mt-4 text-base font-semibold leading-snug text-ink">
            {isEnglish ? "The portfolio score has fallen" : "Portföljbetyget har sjunkit"}
          </h3>
          <p className="mt-2 max-w-[360px] text-sm leading-relaxed text-ink-2">
            {isEnglish ? "The latest review shows that two funds have fallen behind comparable funds." : "Den senaste kontrollen visar att två fonder har tappat mot jämförbara fonder."}
          </p>

          <div
            className="mt-5 grid grid-cols-[1fr_auto_1fr] items-end gap-3 border-t border-line-soft pt-4"
            aria-label={isEnglish ? "The score has changed from 7.8 to 7.1" : "Betyget har ändrats från 7,8 till 7,1"}
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">{isEnglish ? "Previous" : "Tidigare"}</p>
              <p aria-hidden="true" className="figure mt-1 text-xl text-ink-3">7,8</p>
            </div>
            <ArrowRight aria-hidden="true" className="mb-1 size-4 text-ink-4" strokeWidth={1.6} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">{isEnglish ? "Now" : "Nu"}</p>
              <p aria-hidden="true" className="figure mt-1 text-xl text-ink">7,1</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
