import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const { data, error } = await adminClient()
    .from("managed_portfolios")
    .select("*")
    .order("display_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ portfolios: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    morningstar_id?: string;
    slug?: string;
    display_name?: string;
    fee?: number | null;
    risk_level?: number | null;
    portfolio_type?: string;
    commentary?: string;
    active?: boolean;
  };

  if (!body.morningstar_id?.trim() || !body.slug?.trim()) {
    return NextResponse.json({ error: "morningstar_id och slug krävs" }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from("managed_portfolios")
    .insert({
      morningstar_id:  body.morningstar_id.trim(),
      slug:            body.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      display_name:    body.display_name?.trim() ?? "",
      fee:             body.fee ?? null,
      risk_level:      body.risk_level ?? null,
      portfolio_type:  body.portfolio_type ?? "equity",
      commentary:      body.commentary ?? "",
      active:          body.active ?? true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "Morningstar-ID eller slug är redan registrerat" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ portfolio: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as {
    id?: string;
    slug?: string;
    display_name?: string;
    fee?: number | null;
    risk_level?: number | null;
    portfolio_type?: string;
    commentary?: string;
    metadata?: Record<string, unknown>;
    active?: boolean;
  };

  if (!body.id) return NextResponse.json({ error: "id krävs" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.slug           !== undefined) updates.slug           = body.slug.trim().toLowerCase().replace(/\s+/g, "-");
  if (body.display_name   !== undefined) updates.display_name   = body.display_name.trim();
  if ("fee"                in body)      updates.fee            = body.fee ?? null;
  if ("risk_level"         in body)      updates.risk_level     = body.risk_level ?? null;
  if (body.portfolio_type  !== undefined) updates.portfolio_type = body.portfolio_type;
  if (body.commentary      !== undefined) updates.commentary     = body.commentary;
  if (body.metadata        !== undefined) updates.metadata       = body.metadata;
  if (body.active          !== undefined) updates.active         = body.active;

  const { data, error } = await adminClient()
    .from("managed_portfolios")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "Slug är redan registrerat" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ portfolio: data });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json() as { id?: string };
  if (!body.id) return NextResponse.json({ error: "id krävs" }, { status: 400 });

  const { error } = await adminClient()
    .from("managed_portfolios")
    .delete()
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
