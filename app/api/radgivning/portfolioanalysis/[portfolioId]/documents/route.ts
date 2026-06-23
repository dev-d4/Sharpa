import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Params = { portfolioId: string };

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET — list documents with short-lived signed download URLs
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { portfolioId } = await params;
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("portfolio_documents")
    .select("id, file_name, size_bytes, uploaded_at")
    .eq("portfolio_id", portfolioId)
    .order("uploaded_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const docs = await Promise.all(
    (data ?? []).map(async (doc: { id: string; file_name: string; size_bytes: number | null; uploaded_at: string }) => {
      const storagePath = `${portfolioId}/${doc.id}`;
      const { data: signed } = await supabase.storage
        .from("portfolio-docs")
        .createSignedUrl(storagePath, 3600);
      return { ...doc, url: signed?.signedUrl ?? null };
    }),
  );

  return NextResponse.json({ documents: docs });
}

// POST — upload document (multipart/form-data with field "file")
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { portfolioId } = await params;
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Fil saknas" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Max filstorlek är 20 MB" }, { status: 413 });
  }

  const supabase  = adminClient();
  const docId     = crypto.randomUUID();
  const storagePath = `${portfolioId}/${docId}`;

  const { error: uploadError } = await supabase.storage
    .from("portfolio-docs")
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: row, error: dbError } = await supabase
    .from("portfolio_documents")
    .insert({
      id:           docId,
      portfolio_id: portfolioId,
      file_name:    file.name,
      storage_path: storagePath,
      size_bytes:   file.size,
    })
    .select("id, file_name, size_bytes, uploaded_at")
    .single();

  if (dbError) {
    await supabase.storage.from("portfolio-docs").remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const { data: signed } = await supabase.storage
    .from("portfolio-docs")
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json({ document: { ...row, url: signed?.signedUrl ?? null } });
}

// DELETE — remove document by id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { portfolioId } = await params;
  const { id } = await req.json() as { id?: string };

  if (!id) return NextResponse.json({ error: "id krävs" }, { status: 400 });

  const supabase    = adminClient();
  const storagePath = `${portfolioId}/${id}`;

  await supabase.storage.from("portfolio-docs").remove([storagePath]);

  const { error } = await supabase
    .from("portfolio_documents")
    .delete()
    .eq("id", id)
    .eq("portfolio_id", portfolioId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
