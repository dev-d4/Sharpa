import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * Betygshistorik för den inloggade användarens portföljer.
 *
 * Läser med användarens egen klient — RLS-policyn "select own score history"
 * ser till att bara egna rader returneras. Används av /portfolios för att visa
 * den senaste förändringen per portfölj.
 */

export const dynamic = "force-dynamic";

const MAX_ROWS = 200;

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("portfolio_score_history")
    .select("id, portfolio_id, score, previous_score, score_delta, reasons, notified, calculated_at")
    .order("calculated_at", { ascending: false })
    .limit(MAX_ROWS);

  // Tabellen kan saknas om migrationen inte körts än — då är historiken bara tom.
  if (error) return NextResponse.json([]);
  return NextResponse.json(data ?? []);
}
