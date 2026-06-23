import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET ?advisor=CODE
export async function GET(req: NextRequest) {
  const advisorCode = req.nextUrl.searchParams.get("advisor");
  if (!advisorCode) return NextResponse.json({ sections: null });

  const { data } = await adminClient()
    .from("advisor_dashboards")
    .select("sections")
    .eq("advisor_code", advisorCode)
    .maybeSingle();

  return NextResponse.json({ sections: data?.sections ?? null });
}

// PUT — { sections: LayoutRow[] | { rows: LayoutRow[], comment: string }, advisorCode }
export async function PUT(req: NextRequest) {
  const body = await req.json() as { sections?: unknown; advisorCode?: string };
  if (!body.advisorCode || body.sections === undefined) {
    return NextResponse.json({ error: "advisorCode och sections krävs" }, { status: 400 });
  }

  const { error } = await adminClient()
    .from("advisor_dashboards")
    .upsert(
      { advisor_code: body.advisorCode, sections: body.sections, updated_at: new Date().toISOString() },
      { onConflict: "advisor_code" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
