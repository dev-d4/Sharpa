import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { computePortfolioScore } from "@/lib/portfolio-score";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, custodian, holdings, analysis } = body;
  if (!holdings || !analysis) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { score } = computePortfolioScore(analysis);
  const updates = {
    ...(name ? { name } : {}),
    ...(custodian ? { custodian } : {}),
    holdings,
    analysis,
    score: Math.round(score),
    updated_at: new Date().toISOString(),
  };

  let result = await supabase
    .from("portfolios")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  // score column may not exist yet (migration not applied) — retry without it
  if (result.error?.code === "PGRST204") {
    const updatesWithoutScore: Partial<typeof updates> = { ...updates };
    delete updatesWithoutScore.score;
    result = await supabase
      .from("portfolios")
      .update(updatesWithoutScore)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result.data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase
    .from("portfolios")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
