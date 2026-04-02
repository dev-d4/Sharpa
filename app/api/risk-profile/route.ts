import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { calcRiskScore, RISK_LABELS } from "@/lib/risk";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("risk_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json(data ?? null);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { q1, q2, q3, q4 } = await req.json();
  if (!q1 || !q2 || !q3 || !q4) {
    return NextResponse.json({ error: "Missing answers" }, { status: 400 });
  }

  const score = calcRiskScore(q1, q2, q3, q4);
  const label = RISK_LABELS[score];

  const { data, error } = await supabase
    .from("risk_profiles")
    .upsert(
      { user_id: user.id, q1, q2, q3, q4, score, label, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
