"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { FUND_SOURCES, formatRefreshDate, oldestSourceRefresh } from "@/lib/freshness";

// Diskret fotnot om fonddatans ålder. Källorna (Avanza/Nordnet) uppdateras var
// för sig — vi visar den äldsta källans senaste uppdatering så att noten aldrig
// påstår färskare data än vad som faktiskt gäller. Logik + tester: lib/freshness.ts
export default function DataFreshness({ className = "" }: { className?: string }) {
  const [date, setDate] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all(
      FUND_SOURCES.map(async (source) => {
        const { data } = await supabase
          .from("funds")
          .select("fetched_at")
          .eq("source", source)
          .order("fetched_at", { ascending: false })
          .limit(1);
        return { source, fetchedAt: (data?.[0]?.fetched_at as string | undefined) ?? null };
      })
    )
      .then((rows) => {
        const ts = oldestSourceRefresh(rows);
        if (ts) setDate(formatRefreshDate(ts));
      })
      .catch(() => { /* ingen not hellre än fel not */ });
  }, []);

  if (!date) return null;
  return (
    <p className={`text-center text-xs text-ink-4 ${className}`}>
      Fonddata senast uppdaterad {date}
    </p>
  );
}
