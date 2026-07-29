"use client";

import { useState } from "react";

/**
 * Redaktionellt dragspel: hårlinjeavdelade rader direkt på pappersytan,
 * inget kort. Affordansen är + / − i dämpad grå, inte en pil.
 */
export function AccordionItem({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-6 py-5 text-left"
        >
          <span className={`text-[15px] leading-snug text-ink sm:text-base ${open ? "font-medium" : "font-normal"}`}>
            {q}
          </span>
          <span aria-hidden="true" className="shrink-0 text-lg leading-none font-normal text-ink-3">
            {open ? "−" : "+"}
          </span>
        </button>
      </h3>
      {open && (
        <div className="animate-fade pb-6 pr-10">
          <div className="text-[15px] leading-[1.7] text-ink-2">{a}</div>
        </div>
      )}
    </div>
  );
}

export function Accordion({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-ink">{children}</div>;
}
