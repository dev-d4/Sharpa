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

// GET — lista alla rådgivare
export async function GET() {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Ej behörig" }, { status: 403 });

  const { data: advisors } = await adminClient()
    .from("advisor_profiles")
    .select("code, name, created_at")
    .order("name");

  return NextResponse.json({ advisors: advisors ?? [] });
}

// POST — lägg till rådgivare via kod + namn
export async function POST(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Ej behörig" }, { status: 403 });

  const body = await req.json() as { code?: string; name?: string };
  if (!body.code || !body.name) {
    return NextResponse.json({ error: "code och name krävs" }, { status: 400 });
  }

  const { error } = await adminClient()
    .from("advisor_profiles")
    .upsert({ code: body.code, name: body.name }, { onConflict: "code" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — ta bort rådgivare
export async function DELETE(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Ej behörig" }, { status: 403 });

  const { code } = await req.json() as { code: string };
  if (!code) return NextResponse.json({ error: "code krävs" }, { status: 400 });

  const { error } = await adminClient().from("advisor_profiles").delete().eq("code", code);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
