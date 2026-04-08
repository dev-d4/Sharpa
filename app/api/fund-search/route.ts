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
  prefer_index: boolean;
  geography: string | null;
  keywords: string[];
}

async function extractFilter(query: string, categories: string[]): Promise<LLMFilter> {
  const client = new Anthropic();

  const categoryList = categories.slice(0, 200).join("\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Du är en fondexpert. En användare vill investera och har skrivit: "${query}"

Din uppgift är att matcha användarens beskrivning mot dessa exakta fondkategorier (välj de som passar bäst):
${categoryList}

Exempel på mappningar:
- "teknikfonder" → välj kategorier som innehåller "teknik" eller "Ny teknik"
- "USA-fonder" → välj kategorier som innehåller "USA"
- "globalfonder" eller "globala fonder" → välj kategorier som innehåller "Global"
- "Sverige" eller "svenska fonder" → välj kategorier som innehåller "Sverige"
- "räntefonder" eller "obligationer" → välj kategorier som innehåller "Ränte"
- "blandfonder" → välj kategorier som innehåller "Blandfond"
- "emerging markets" eller "tillväxtmarknader" → välj kategorier som innehåller "Tillväxt"
- "Norden" eller "nordiska fonder" → välj kategorier som innehåller "Norden"

Returnera ENBART ett JSON-objekt med dessa fält:
- categories: array med exakta kategorinamn från listan ovan som matchar. Max 6. Välj hellre fler än färre.
- category_group: en av "Equity", "Fixed Income", "Allocation", "Alternative", "Money Market", "Other", eller null
- max_cost: maximal avgift i % om användaren nämner "låg avgift", "billig", "index" (sätt då 0.5), annars null
- prefer_index: true om användaren nämner "index" eller "passiv", annars false
- geography: null (används ej)
- keywords: array med fondbolagsnamn om användaren nämner specifika bolag, annars []

Svara BARA med JSON, inga förklaringar.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  // Strip markdown code fences if present
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  console.log("[fund-search] Claude raw response:", text);
  try {
    return JSON.parse(text) as LLMFilter;
  } catch {
    console.log("[fund-search] JSON parse failed");
    return { categories: [], category_group: null, max_cost: null, prefer_index: false, geography: null, keywords: [] };
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

    // Apply category_group filter
    if (filter.category_group) {
      dbQuery = dbQuery.eq("category_group", filter.category_group);
    }

    // Apply cost filter
    if (filter.max_cost !== null) {
      dbQuery = dbQuery.lte("ongoing_cost_actual", filter.max_cost);
    }

    // Apply index filter — prefer low cost instead of strict PASSIVE (Nordnet funds lack investment_type)
    if (filter.prefer_index && filter.max_cost === null) {
      dbQuery = dbQuery.lte("ongoing_cost_actual", 0.5);
    }

    const { data: funds, error } = await dbQuery.limit(2000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let results = funds ?? [];

    // Filter by categories (OR match)
    if (filter.categories.length > 0) {
      results = results.filter((f) => f.category && filter.categories.includes(f.category));
    }

    // Filter by geography keyword in name
    if (filter.geography && filter.categories.length === 0) {
      const geo = filter.geography.toLowerCase();
      results = results.filter((f) => f.name?.toLowerCase().includes(geo));
    }

    // Filter by fund company keywords
    if (filter.keywords.length > 0) {
      const filtered = results.filter((f) =>
        filter.keywords.some((kw) => f.name?.toLowerCase().includes(kw.toLowerCase()))
      );
      if (filtered.length > 0) results = filtered;
    }

    // Score and sort: sharpe (weight 3) + return_3yr (0.05) + return_1yr (0.02) - cost (1.5)
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
    if (filter.prefer_index) filterPills.push("Indexfonder");
    if (filter.max_cost !== null) filterPills.push(`Max ${filter.max_cost}% avgift`);

    return NextResponse.json({
      funds: results.slice(0, 8),
      filterPills,
      filter,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
