"use client";

import { useLanguage } from "@/lib/i18n";

export default function HeroCopy({ part }: { part: "title" | "description" }) {
  const { isEnglish } = useLanguage();
  if (part === "title") {
    return (
      <h1 className="mx-auto max-w-[680px] font-display text-[34px] leading-[1.1] text-ink sm:text-[48px] lg:text-[52px]">
        {isEnglish ? <>How good are <em className="italic">your funds</em>, really?</> : <>Hur bra är <em className="italic">dina fonder</em> egentligen?</>}
      </h1>
    );
  }
  return (
    <p className="mx-auto mt-5 max-w-[560px] text-[15px] leading-[1.6] text-ink-2 sm:text-base">
      {isEnglish ? "Analyse your funds for free. Save your portfolio and we will monitor its score and email you if it clearly deteriorates." : "Analysera dina fonder gratis. Spara sedan portföljen så håller vi koll på betyget och mejlar dig vid en tydlig försämring."}
    </p>
  );
}
