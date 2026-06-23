import { redirect, notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import EditPortfolioClient from "./EditPortfolioClient";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export const dynamic = "force-dynamic";

export default async function EditPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) redirect(`/login?next=/radgivning/admin/portfolios/${id}`);

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim()).filter(Boolean);
  if (!user.email || !adminEmails.includes(user.email)) redirect("/");

  const { data: portfolio } = await adminClient()
    .from("managed_portfolios")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!portfolio) notFound();

  return <EditPortfolioClient portfolio={portfolio} />;
}
