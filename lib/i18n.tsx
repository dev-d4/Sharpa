"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

export type Language = "sv" | "en";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  isEnglish: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "sharpa-language";

// Valet lever i localStorage, inte i React-state: det överlever navigering,
// synkas mellan flikar och läses av useSyncExternalStore utan att servern
// behöver känna till det. Servern renderar alltid svenska — snapshotet på
// servern är därför "sv", och klienten byter direkt efter hydrering.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): Language {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "sv";
  } catch {
    return "sv";
  }
}

const getServerSnapshot = (): Language => "sv";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLanguage = useCallback((next: Language) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Privat läge utan lagring: valet gäller ändå för den här renderingen.
    }
    document.documentElement.lang = next;
    listeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, isEnglish: language === "en" }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
