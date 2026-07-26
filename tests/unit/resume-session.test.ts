import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BEFORE_LOGIN_EVENT,
  clearResume,
  markResumeRedirected,
  peekResumePath,
  prepareLoginResume,
  saveResume,
  takeResumeData,
} from "@/lib/resume-session";

function stubStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

describe("resume-session", () => {
  beforeEach(() => {
    vi.useRealTimers();
    Object.defineProperty(globalThis, "localStorage", { value: stubStorage(), configurable: true });
  });

  it("returnerar sparat tillstånd för rätt sida", () => {
    saveResume("/analyze", { entries: 3 });
    expect(peekResumePath()).toBe("/analyze");
    expect(takeResumeData<{ entries: number }>("/analyze")).toEqual({ entries: 3 });
  });

  it("ger inte tillståndet till en annan sida", () => {
    saveResume("/analyze", { entries: 3 });
    expect(takeResumeData("/bygg-portfolj")).toBeNull();
    expect(takeResumeData("/analyze")).toEqual({ entries: 3 });
  });

  it("är engångs — arbetet dyker inte upp igen vid nästa besök", () => {
    saveResume("/analyze", { entries: 3 });
    takeResumeData("/analyze");
    expect(takeResumeData("/analyze")).toBeNull();
    expect(peekResumePath()).toBeNull();
  });

  it("matchar sidan även när vägen har query och hash", () => {
    saveResume("/analyze?portfolio=abc#resultat", { entries: 1 });
    expect(peekResumePath()).toBe("/analyze?portfolio=abc#resultat");
    expect(takeResumeData("/analyze")).toEqual({ entries: 1 });
  });

  it("glömmer arbete som är äldre än en halvtimme", () => {
    vi.useFakeTimers();
    saveResume("/analyze", { entries: 3 });
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(peekResumePath()).toBeNull();
    expect(takeResumeData("/analyze")).toBeNull();
  });

  it("kapar bara en navigering per inloggning, men behåller tillståndet", () => {
    saveResume("/analyze", { entries: 3 });
    markResumeRedirected();
    expect(peekResumePath()).toBeNull();
    expect(takeResumeData("/analyze")).toEqual({ entries: 3 });
  });

  it("prepareLoginResume låter verktyget skriva över med sitt eget tillstånd", () => {
    const listener = () => saveResume("/analyze", { entries: 7 });
    const events: string[] = [];
    Object.defineProperty(globalThis, "window", {
      value: {
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: (e: Event) => { events.push(e.type); listener(); return true; },
      },
      configurable: true,
    });

    prepareLoginResume("/analyze");
    expect(events).toEqual([BEFORE_LOGIN_EVENT]);
    expect(takeResumeData("/analyze")).toEqual({ entries: 7 });
  });

  it("prepareLoginResume sparar vägen även när sidan inget har att spara", () => {
    Object.defineProperty(globalThis, "window", {
      value: { addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true },
      configurable: true,
    });

    prepareLoginResume("/rapport");
    expect(peekResumePath()).toBe("/rapport");
    expect(takeResumeData("/rapport")).toBeNull();
  });

  it("clearResume tömmer posten", () => {
    saveResume("/analyze", { entries: 3 });
    clearResume();
    expect(peekResumePath()).toBeNull();
  });
});
