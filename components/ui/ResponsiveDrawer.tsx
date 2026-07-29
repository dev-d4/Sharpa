"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ResponsiveDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
};

export function ResponsiveDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  initialFocusRef,
}: ResponsiveDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      initialFocusRef?.current?.focus();
    }, 50);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [initialFocusRef, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end bg-ink/35 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="responsive-drawer-title"
        aria-describedby={description ? "responsive-drawer-description" : undefined}
        className={cn(
          "flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl border border-line bg-white shadow-2xl sm:max-h-[85vh] sm:max-w-xl sm:rounded-lg",
          className
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 id="responsive-drawer-title" className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id="responsive-drawer-description" className="mt-1 text-sm leading-relaxed text-ink-3">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-section hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="border-t border-line bg-white px-5 py-4 sm:px-6">{footer}</footer>}
      </div>
    </div>
  );
}
