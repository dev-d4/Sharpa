"use client";

import { useLanguage } from "@/lib/i18n";

export default function HeroCopy({ part }: { part: "title" | "description" }) {
  const { isEnglish } = useLanguage();
  if (part === "title") {
    return (
      <h1 className="mx-auto max-w-[680px] font-display text-[34px] leading-[1.1] text-ink sm:text-[48px] lg:text-[52px]">
        {isEnglish ? <>Compare <em className="italic">your funds</em> — at no cost</> : <>Jämför <em className="italic">dina fonder</em> — kostnadsfritt</>}
      </h1>
    );
  }
  return (
    <p className="mx-auto mt-5 max-w-[560px] text-[15px] leading-[1.6] text-ink-2 sm:text-base">
      {isEnglish ? "Search for a fund and compare its fees, historical returns and risk with similar funds. Get a clear result straight away — no login required. We receive no commission from fund providers." : "Sök efter en fond och jämför avgift, historisk avkastning och risk med liknande fonder. Du får ett tydligt resultat direkt — utan att logga in. Vi tar inga provisioner från fondbolag."}
    </p>
  );
}
