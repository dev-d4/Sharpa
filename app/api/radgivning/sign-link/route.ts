import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { signLink } from "@/lib/link-signing";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const { advisorId, portfolioId, advisorName } = await req.json() as {
    advisorId:   string;
    portfolioId: string;
    advisorName?: string;
  };

  if (!advisorId?.trim() || !portfolioId?.trim()) {
    return NextResponse.json(
      { error: "advisorId och portfolioId krävs" },
      { status: 400 },
    );
  }

  // Skapa rådgivarprofil om den inte redan finns
  const { error } = await adminClient()
    .from("advisor_profiles")
    .upsert(
      { code: advisorId.trim(), name: advisorName?.trim() || advisorId.trim() },
      { onConflict: "code", ignoreDuplicates: true },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { ts, sig } = signLink(advisorId.trim(), portfolioId.trim());
  return NextResponse.json({ ts, sig });
}
