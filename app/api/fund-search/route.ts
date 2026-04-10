import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Fetch distinct categories from the appropriate view
async function getCategories(view: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const seen = new Set<string>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from(view)
      .select("category")
      .not("category", "is", null)
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    for (const row of data) if (row.category) seen.add(row.category);
    if (data.length < PAGE) break;
  }
  console.log(`[fund-search] fetched ${seen.size} distinct categories from ${view}`);
  return Array.from(seen).sort();
}

interface LLMFilter {
  categories: string[];
  category_group: string | null;
  max_cost: number | null;
  management_type: "active" | "passive" | null;
  name_all: string[];      // ALL terms must appear in fund name (AND)
  name_includes: string[]; // any term must appear in fund name (OR), fallback
  name_excludes: string[]; // no term may appear in fund name
  keywords: string[];      // fund company names to match
}

async function extractFilter(query: string, categories: string[]): Promise<LLMFilter> {
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Du är en fondexpert. En användare söker fonder och har skrivit: "${query}"

Tillgängliga fondkategorier:
${categories.join("\n")}

Returnera ENBART ett JSON-objekt med dessa fält:

- categories: exakta kategorinamn från listan ovan som matchar användarens intent. Max 6, hellre fler än färre. Tom array om ingen kategori passar.
- category_group: en av "Equity", "Fixed Income", "Allocation", "Alternative", "Money Market", "Other", eller null
- max_cost: maximal avgift i procent om användaren signalerar kostnadskänslighet (t.ex. "låg avgift", "billig"), annars null
- management_type: "passive" om användaren vill ha indexfonder/passiva fonder, "active" om användaren vill ha aktivt förvaltade fonder, annars null
- name_all: nyckelord från frågan som ALLA måste finnas i fondnamnet. T.ex. "sverige index" → ["sverige", "index"], "global index" → ["global", "index"], "teknik usa" → ["teknik", "usa"]. Annars [].
- name_includes: ord där minst ett måste finnas i fondnamnet (OR). Normalt [].
- name_excludes: ord som inte får finnas i fondnamnet. Normalt [].
- keywords: specifika fondbolagsnamn om användaren nämner dem (t.ex. ["Länsförsäkringar"]), annars []

Svara BARA med JSON.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  console.log("[fund-search] Claude raw response:", text);
  try {
    return JSON.parse(text) as LLMFilter;
  } catch {
    console.log("[fund-search] JSON parse failed");
    return { categories: [], category_group: null, max_cost: null, management_type: null, name_all: [], name_includes: [], name_excludes: [], keywords: [] };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query, custodian } = await req.json();
    if (!query || query.trim().length < 3) {
      return NextResponse.json({ error: "För kort sökfras" }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY saknas" }, { status: 500 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB ej tillgänglig" }, { status: 500 });

    // Choose the right view based on custodian
    const view = custodian === "avanza" ? "avanza_fund_data"
      : custodian === "nordnet" ? "nordnet_fund_data"
      : "funds";

    const categories = await getCategories(view);
    const filter = await extractFilter(query.trim(), categories);
    console.log(`[fund-search] query="${query}" filter:`, JSON.stringify(filter));

    let dbQuery = supabase
      .from(view)
      .select("isin, name, category, category_group, sharpe_3yr, return_1yr, return_3yr, ongoing_cost_actual, ongoing_cost_estimated, investment_type")
      .not("name", "is", null);

    if (filter.category_group) {
      dbQuery = dbQuery.eq("category_group", filter.category_group);
    }

    if (filter.max_cost !== null) {
      dbQuery = dbQuery.lte("ongoing_cost_actual", filter.max_cost);
    }

    // investment_type values: "ACTIVE", "INDEX", or null (Nordnet funds)
    if (filter.management_type === "active") {
      dbQuery = dbQuery.or("investment_type.eq.ACTIVE,investment_type.is.null");
    } else if (filter.management_type === "passive") {
      dbQuery = dbQuery.or("investment_type.eq.INDEX,investment_type.is.null");
    }

    const { data: funds, error } = await dbQuery.limit(2000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const allFunds = funds ?? [];

    function matchesManagementType(f: typeof allFunds[0]): boolean {
      if (!filter.management_type) return true;
      if (filter.management_type === "passive") {
        if (f.investment_type === "INDEX") return true;
        const n = f.name?.toLowerCase() ?? "";
        return n.includes("index") || n.includes("msci") || n.includes("s&p");
      }
      if (filter.management_type === "active") {
        if (f.investment_type === "ACTIVE") return true;
        if (f.investment_type === "INDEX") return false;
        const n = f.name?.toLowerCase() ?? "";
        return !n.includes("index") && !n.includes("msci") && !n.includes("s&p") && !n.includes("etf");
      }
      return true;
    }

    function matchesNameAll(f: typeof allFunds[0]): boolean {
      if (filter.name_all.length === 0) return true;
      return filter.name_all.every((term) => f.name?.toLowerCase().includes(term.toLowerCase()));
    }

    function matchesNameExcludes(f: typeof allFunds[0]): boolean {
      if (filter.name_excludes.length === 0) return true;
      return !filter.name_excludes.some((term) => f.name?.toLowerCase().includes(term.toLowerCase()));
    }

    // Primary: category + management_type match (most important, never narrowed by name)
    const categoryMatched = allFunds.filter((f) => {
      const catOk = filter.categories.length === 0 || (f.category != null && filter.categories.includes(f.category));
      return catOk && matchesManagementType(f) && matchesNameExcludes(f);
    });

    // Additive: name_all catches funds with wrong/missing category (e.g. Nordnet funds)
    // Only adds funds not already found via category match
    const categoryMatchedIsins = new Set(categoryMatched.map((f) => f.isin));
    const nameMatched = filter.name_all.length > 0
      ? allFunds.filter((f) =>
          !categoryMatchedIsins.has(f.isin) &&
          matchesNameAll(f) &&
          matchesManagementType(f) &&
          matchesNameExcludes(f)
        )
      : [];

    // If Claude extracted nothing meaningful, return empty — query was gibberish
    const hasAnyFilter =
      filter.categories.length > 0 ||
      filter.category_group !== null ||
      filter.management_type !== null ||
      filter.max_cost !== null ||
      filter.name_all.length > 0 ||
      filter.keywords.length > 0;

    if (!hasAnyFilter) {
      return NextResponse.json({ funds: [], filterPills: [], filter });
    }

    let results = [...categoryMatched, ...nameMatched];

    // Filter by fund company keywords
    if (filter.keywords.length > 0) {
      const filtered = results.filter((f) =>
        filter.keywords.some((kw) => f.name?.toLowerCase().includes(kw.toLowerCase()))
      );
      if (filtered.length > 0) results = filtered;
    }

    // Score and sort
    results.sort((a, b) => {
      const scoreA =
        (a.sharpe_3yr ?? 0) * 3 +
        (a.return_3yr ?? 0) * 0.05 +
        (a.return_1yr ?? 0) * 0.02 -
        ((a.ongoing_cost_actual ?? a.ongoing_cost_estimated ?? 0)) * 1.5;
      const scoreB =
        (b.sharpe_3yr ?? 0) * 3 +
        (b.return_3yr ?? 0) * 0.05 +
        (b.return_1yr ?? 0) * 0.02 -
        ((b.ongoing_cost_actual ?? b.ongoing_cost_estimated ?? 0)) * 1.5;
      return scoreB - scoreA;
    });

    // Build human-readable filter summary
    const filterPills: string[] = [];
    if (filter.categories.length > 0) filterPills.push(...filter.categories.slice(0, 3));
    if (filter.management_type === "active") filterPills.push("Aktivt förvaltade");
    if (filter.management_type === "passive") filterPills.push("Indexfonder");
    if (filter.max_cost !== null) filterPills.push(`Max ${filter.max_cost}% avgift`);

    return NextResponse.json({
      funds: results, // all ranked results — UI paginates locally
      filterPills,
      filter,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
