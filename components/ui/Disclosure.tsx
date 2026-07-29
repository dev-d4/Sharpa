"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * Sekundärt innehåll bakom en textlänksknapp. Stängd som standard.
 *
 * Innehållet villkorsrenderas, vilket är mönstret resten av appen använder
 * (FAQ-dragspelet, "Visa alla förslag"). Ut-/infällningen är en kort fade som
 * respekterar prefers-reduced-motion via .animate-fade.
 */
export function Disclosure({
  showLabel,
  hideLabel,
  children,
  className,
}: {
  showLabel: string;
  hideLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1.5 text-sm text-accent underline decoration-line-strong underline-offset-2 transition-colors duration-150 hover:decoration-accent"
      >
        {open ? hideLabel : showLabel}
        {open ? (
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div id={panelId} className="animate-fade mt-6">
          {children}
        </div>
      )}
    </div>
  );
}
