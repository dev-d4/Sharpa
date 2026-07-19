import { describe, expect, it } from "vitest";
import { FUND_SOURCES, formatRefreshDate, oldestSourceRefresh } from "@/lib/freshness";

// ── Datanotens korrekthet ─────────────────────────────────────────────────────
// Avanza och Nordnet uppdateras i separata körningar. Noten "Fonddata senast
// uppdaterad X" får aldrig påstå färskare data än den äldst uppdaterade källan
// — annars ljuger den när en källas refresh misslyckats.

describe("oldestSourceRefresh", () => {
  it("returnerar den äldsta källans senaste uppdatering", () => {
    const ts = oldestSourceRefresh([
      { source: "avanza", fetchedAt: "2026-07-17T17:04:10.000Z" },
      { source: "nordnet", fetchedAt: "2026-07-10T06:00:00.000Z" },
    ]);
    // Nordnet är äldst → dess datum ska visas, inte Avanzas färska
    expect(ts).toBe("2026-07-10T06:00:00.000Z");
  });

  it("är symmetrisk — ordningen på källorna spelar ingen roll", () => {
    const a = { source: "avanza", fetchedAt: "2026-07-01T00:00:00.000Z" };
    const b = { source: "nordnet", fetchedAt: "2026-07-15T00:00:00.000Z" };
    expect(oldestSourceRefresh([a, b])).toBe(oldestSourceRefresh([b, a]));
    expect(oldestSourceRefresh([a, b])).toBe("2026-07-01T00:00:00.000Z");
  });

  it("ignorerar källor utan data (kan inte vara inaktuella om de inte finns)", () => {
    const ts = oldestSourceRefresh([
      { source: "avanza", fetchedAt: "2026-07-17T17:04:10.000Z" },
      { source: "nordnet", fetchedAt: null },
    ]);
    expect(ts).toBe("2026-07-17T17:04:10.000Z");
  });

  it("returnerar null när ingen källa har data — hellre ingen not än fel not", () => {
    expect(oldestSourceRefresh([
      { source: "avanza", fetchedAt: null },
      { source: "nordnet", fetchedAt: null },
    ])).toBeNull();
    expect(oldestSourceRefresh([])).toBeNull();
  });

  it("hanterar identiska tidsstämplar (samma cron-körning)", () => {
    const ts = "2026-07-17T17:04:10.000Z";
    expect(oldestSourceRefresh([
      { source: "avanza", fetchedAt: ts },
      { source: "nordnet", fetchedAt: ts },
    ])).toBe(ts);
  });
});

describe("FUND_SOURCES", () => {
  it("täcker båda pipelines som skriver till funds-tabellen", () => {
    // lib/avanza.ts skriver source:"avanza", lib/nordnet.ts source:"nordnet".
    // Läggs en ny källa till måste den in här — annars bevakar noten den inte.
    expect([...FUND_SOURCES].sort()).toEqual(["avanza", "nordnet"]);
  });
});

describe("formatRefreshDate", () => {
  it("formaterar på svenska med dag, månad och år", () => {
    expect(formatRefreshDate("2026-07-17T12:00:00.000Z")).toBe("17 juli 2026");
  });
});
