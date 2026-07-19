// ── Fonddatans ålder ──────────────────────────────────────────────────────────
// Avanza- och Nordnet-datan uppdateras i separata körningar med varsin
// tidsstämpel (lib/avanza.ts resp. lib/nordnet.ts sätter fetched_at = now för
// hela sin batch). Datanoten på sajten får därför ALDRIG utgå från den senast
// uppdaterade raden i funds-tabellen — om en källa misslyckats skulle noten
// påstå färskare data än vad t.ex. Nordnet-fonderna faktiskt har.
// Regeln: visa den ÄLDSTA källans senaste uppdatering.

export const FUND_SOURCES = ["avanza", "nordnet"] as const;

export type SourceRefresh = {
  source: string;
  /** Senaste fetched_at för källan, eller null om källan saknar rader */
  fetchedAt: string | null;
};

/**
 * Den tidsstämpel datanoten ska visa: äldsta av källornas senaste uppdatering.
 * Källor utan rader ignoreras (kan inte vara inaktuella om de inte finns).
 * Returnerar null om ingen källa har data.
 */
export function oldestSourceRefresh(rows: SourceRefresh[]): string | null {
  const present = rows.filter((r): r is { source: string; fetchedAt: string } => r.fetchedAt !== null);
  if (present.length === 0) return null;
  return present.reduce((a, b) =>
    new Date(a.fetchedAt).getTime() <= new Date(b.fetchedAt).getTime() ? a : b
  ).fetchedAt;
}

/** Datumformatet i datanoten, t.ex. "17 juli 2026" */
export function formatRefreshDate(ts: string): string {
  return new Date(ts).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
}
