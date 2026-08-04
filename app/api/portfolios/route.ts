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
  const { name, custodian, holdings, analysis, emailScoreAlerts } = body;
  if (!name || !custodian || !holdings || !analysis) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Betyget sparas med decimaler (kolumnen är NUMERIC(4,2) sedan migrationen
  // 20260801_000). Tidigare avrundades det till heltal, vilket gjorde att en
  // försämring från 7,6 till 7,0 kunde se ut som ingen förändring alls.
  const scoreResult = computePortfolioScore(analysis);

  // Användaren tar aktivt ställning till bevakningen i sparaformuläret. Vi
  // skriver bara inställningen när ett värde faktiskt skickats med, så att
  // andra vägar in (t.ex. import) inte tyst ändrar ett tidigare val.
  if (typeof emailScoreAlerts === "boolean") {
    await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        email_score_alerts: emailScoreAlerts,
        updated_at: new Date().toISOString(),
        ...(emailScoreAlerts
          ? { unsubscribed_at: null, unsubscribe_source: null }
          : { unsubscribed_at: new Date().toISOString(), unsubscribe_source: "account" }),
      },
      { onConflict: "user_id" }
    );
  }

  let result = await supabase
    .from("portfolios")
    .insert({
      user_id: user.id,
      name,
      custodian,
      holdings,
      analysis,
      score: scoreResult.score,
      score_breakdown: scoreResult,
    })
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
