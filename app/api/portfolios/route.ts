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

  const { data, error } = await supabase
    .from("portfolios")
    .insert({ user_id: user.id, name, custodian, holdings, analysis, score })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
