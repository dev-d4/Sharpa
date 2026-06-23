import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function assertAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim()).filter(Boolean);
  return user.email && adminEmails.includes(user.email) ? user : null;
}

// GET — hämta alla app-inställningar
export async function GET() {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Ej behörig" }, { status: 403 });

  const { data } = await adminClient().from("app_settings").select("key, value");
  return NextResponse.json(Object.fromEntries((data ?? []).map(r => [r.key, r.value])));
}

// PUT — uppdatera en eller flera inställningar
export async function PUT(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Ej behörig" }, { status: 403 });

  const updates = await req.json() as Record<string, string>;
  const admin = adminClient();

  for (const [key, value] of Object.entries(updates)) {
    await admin.from("app_settings").upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  }

  return NextResponse.json({ ok: true });
}
