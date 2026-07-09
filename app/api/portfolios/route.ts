import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { computePortfolioScore } from "@/lib/portfolio-score";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, custodian, holdings, analysis } = body;
  if (!name || !custodian || !holdings || !analysis) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { score } = computePortfolioScore(analysis);
  // The `score` column is INTEGER — round the fractional score (e.g. 7.3 → 7)
  // so Postgres doesn't reject the insert with 22P02 (invalid integer syntax).
  const storedScore = Math.round(score);

  let result = await supabase
    .from("portfolios")
    .insert({ user_id: user.id, name, custodian, holdings, analysis, score: storedScore })
    .select()
    .single();

  // score column may not exist yet (migration not applied) — retry without it
  if (result.error?.code === "PGRST204") {
    result = await supabase
      .from("portfolios")
      .insert({ user_id: user.id, name, custodian, holdings, analysis })
      .select()
      .single();
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json(result.data);
}
