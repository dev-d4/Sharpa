import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { verifyLink } from "@/lib/link-signing";
import { fetchFromMorningstar, type PortfolioData } from "@/lib/morningstar-api";
import { getTWRData, type TWRData } from "@/lib/twr-mock-data";
import { getHoldingMeta } from "@/lib/holding-metadata";
import MorningstarDashboard from "./MorningstarDashboard";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "b", "i", "u", "s",
    "h1", "h2", "h3", "h4", "ul", "ol", "li",
    "a", "blockquote", "code", "pre",
  ],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["https", "mailto"],
};

type ManagedPortfolio = {
  id:             string;
  morningstar_id: string;
  slug:           string;
  display_name:   string;
  fee:            number | null;
  risk_level:     number | null;
  portfolio_type: string;
  commentary:     string;
  metadata:       Record<string, unknown>;
  active:         boolean;
};

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export const dynamic = "force-dynamic";

export default async function PortfolioAnalysisPage({
  params,
  searchParams,
}: {
  params:       Promise<{ portfolioId: string }>;
  searchParams: Promise<{ refresh?: string; name?: string; advisor?: string; ts?: string; sig?: string }>;
}) {
  const { portfolioId }                     = await params;
  const { refresh, name, advisor, ts, sig } = await searchParams;

  const decodedSlug  = decodeURIComponent(portfolioId);
  const forceRefresh = refresh === "1";

  // ── Slå upp slug i managed_portfolios (tabellen kanske inte finns ännu) ──
  const supabase = adminClient();

  let managed: ManagedPortfolio | null = null;
  try {
    const SELECT = "id, morningstar_id, slug, display_name, fee, risk_level, portfolio_type, commentary, metadata, active";
    const { data: bySlug } = await supabase
      .from("managed_portfolios")
      .select(SELECT)
      .eq("slug", decodedSlug)
      .maybeSingle();
    managed = bySlug as ManagedPortfolio | null;

    if (!managed) {
      const { data: byMsId } = await supabase
        .from("managed_portfolios")
        .select(SELECT)
        .eq("morningstar_id", decodedSlug)
        .maybeSingle();
      managed = byMsId as ManagedPortfolio | null;
    }
  } catch {
    // Tabellen saknas eller annan DB-fel — fall igenom med null
  }

  // Bestäm vilket Morningstar-ID som ska användas för datahämtning
  const morningstarId = managed?.morningstar_id ?? decodedSlug;
  const portfolioType = (managed?.portfolio_type ?? "equity") as "equity" | "bond";
  const resolvedName  = name ?? managed?.display_name ?? decodedSlug;

  // ── Verifiera HMAC-signatur om rådgivare anges ────────────────────────────
  if (advisor) {
    if (!ts || !sig || !verifyLink(advisor, decodedSlug, ts, sig)) {
      notFound();
    }
  }

  // ── Portföljdata (Morningstar / cache) ────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  let data: PortfolioData | null = null;
  let fetchError: string | null  = null;

  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from("morningstar_cache")
      .select("data")
      .eq("portfolio_id", morningstarId)
      .eq("cache_date", today)
      .maybeSingle();
    if (cached?.data) data = { ...(cached.data as PortfolioData), _source: "cache" };
  }

  if (!data) {
    try {
      data = await fetchFromMorningstar(morningstarId, portfolioType);
      await supabase.from("morningstar_cache").upsert(
        { portfolio_id: morningstarId, cache_date: today, data },
        { onConflict: "portfolio_id,cache_date" },
      );
      data = { ...data, _source: "live" };
    } catch (err) {
      // Morningstar nere — försök med senaste tillgängliga cache oavsett datum
      const { data: stale, error: staleError } = await supabase
        .from("morningstar_cache")
        .select("data, cache_date")
        .eq("portfolio_id", morningstarId)
        .order("cache_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (stale?.data) {
        data = { ...(stale.data as PortfolioData), _source: "cache", _stale_date: stale.cache_date };
      } else {
        const msError   = err instanceof Error ? err.message : String(err);
        const cacheInfo = staleError ? ` | Cache-fel: ${staleError.message}` : " | Ingen cachad data hittades";
        fetchError = msError + cacheInfo;
      }
    }
  }

  // ── Sparad dashboard-config ───────────────────────────────────────────────
  let savedSections: unknown = null;
  if (advisor) {
    const { data: db } = await supabase
      .from("advisor_dashboards")
      .select("sections")
      .eq("advisor_code", advisor)
      .maybeSingle();
    savedSections = db?.sections ?? null;
  }

  // ── Berika holdings med fondmetadata (temporärt hårdkodat per ISIN) ────────
  if (data) {
    data = {
      ...data,
      holdings: data.holdings.map(h => {
        const meta = getHoldingMeta(h.isin, h.name);
        return meta ? { ...h, ...meta } : h;
      }),
    };
  }

  // ── TWR-data (hårdkodat per slug, ersätt med API-anrop senare) ───────────
  // Use the resolved slug from DB so the lookup works regardless of how the URL was accessed.
  const twrData: TWRData | null = getTWRData(managed?.slug ?? decodedSlug);

  // ── Kommentar (per portfölj, från managed_portfolios.commentary) ──────────
  const commentary: { id: string; content: string; title?: string }[] = [];
  if (managed?.commentary?.trim()) {
    const commentaryTitle = typeof managed.metadata?.commentary_title === "string" && managed.metadata.commentary_title.trim()
      ? managed.metadata.commentary_title.trim()
      : undefined;
    commentary.push({
      id:      managed.id,
      content: sanitizeHtml(managed.commentary, SANITIZE_OPTIONS),
      title:   commentaryTitle,
    });
  }

  return (
    <MorningstarDashboard
      portfolioId={morningstarId}
      urlSlug={decodedSlug}
      portfolioName={resolvedName}
      portfolioType={portfolioType}
      data={data}
      error={fetchError}
      advisorId={advisor ?? null}
      linkTs={ts ?? null}
      linkSig={sig ?? null}
      savedSections={savedSections}
      commentary={commentary}
      twrData={twrData}
      managedPortfolio={managed}
      canEdit={true}
    />
  );
}
