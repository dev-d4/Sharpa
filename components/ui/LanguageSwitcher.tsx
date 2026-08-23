"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLanguage, type Language } from "@/lib/i18n";

// Språknamnen står alltid på sitt eget språk — därför data-no-translate på
// roten, så att SiteTranslator inte gör "Svenska" till "Swedish".
const LANGUAGES: { code: Language; name: string }[] = [
  { code: "sv", name: "Svenska" },
  { code: "en", name: "English" },
];

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage, isEnglish } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function closeOnEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={ref} data-no-translate className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-xs border border-line-strong bg-white px-2 py-1.5 text-ink-2 transition-colors hover:bg-section hover:text-ink"
        aria-label={isEnglish ? "Choose language" : "Välj språk"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="language-menu"
      >
        <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{language}</span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id="language-menu"
          role="listbox"
          aria-label={isEnglish ? "Language" : "Språk"}
          className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-md border border-line bg-white py-1 shadow-[0_8px_28px_rgba(20,20,30,.12)]"
        >
          {LANGUAGES.map((item) => {
            const active = language === item.code;
            return (
              <li key={item.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage(item.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-section ${
                    active ? "font-medium text-ink" : "text-ink-2"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                      {item.code}
                    </span>
                    {item.name}
                  </span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
