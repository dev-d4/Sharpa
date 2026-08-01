import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * Användarens notisinställningar.
 *
 * Går via den inloggade användarens egen Supabase-klient, så RLS gäller —
 * ingen service role behövs här. Saknas rad betyder det att inställningen
 * aldrig ändrats, och portföljbevakningen är då påslagen (kolumnens default).
 */

export const dynamic = "force-dynamic";

export type NotificationPreferences = {
  email_score_alerts: boolean;
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("email_score_alerts")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ email_score_alerts: data?.email_score_alerts ?? true });
}

export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const enabled = body?.email_score_alerts;
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "email_score_alerts måste vara true eller false" }, { status: 400 });
  }

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      email_score_alerts: enabled,
      updated_at: new Date().toISOString(),
      ...(enabled
        ? { unsubscribed_at: null, unsubscribe_source: null }
        : { unsubscribed_at: new Date().toISOString(), unsubscribe_source: "account" }),
    },
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ email_score_alerts: enabled });
}
