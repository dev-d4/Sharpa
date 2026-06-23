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

// GET — hämta alla kommentarblock (öppet, används även på dashboard)
export async function GET() {
  const { data } = await adminClient()
    .from("dashboard_commentary")
    .select("id, content, updated_at")
    .order("updated_at");
  return NextResponse.json(data ?? []);
}

// POST — skapa nytt block
export async function POST(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Ej behörig" }, { status: 403 });

  const body = await req.json() as { content: string };
  const { error, data } = await adminClient()
    .from("dashboard_commentary")
    .insert({
      content:    body.content,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PUT — uppdatera befintligt block
export async function PUT(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Ej behörig" }, { status: 403 });

  const body = await req.json() as { id: string; content: string };
  if (!body.id) return NextResponse.json({ error: "id krävs" }, { status: 400 });

  const { error } = await adminClient()
    .from("dashboard_commentary")
    .update({
      content:    body.content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — ta bort block
export async function DELETE(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Ej behörig" }, { status: 403 });

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id krävs" }, { status: 400 });

  const { error } = await adminClient().from("dashboard_commentary").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
