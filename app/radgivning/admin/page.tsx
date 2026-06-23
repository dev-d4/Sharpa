import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import AdminClient from "./AdminClient";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export const metadata = {
  title: "Admin — Portföljanalys",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Kontrollera att inloggad användare är admin
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) redirect("/login?next=/radgivning/admin");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim()).filter(Boolean);
  if (!user.email || !adminEmails.includes(user.email)) redirect("/");

  const supabase = adminClient();

  const [
    { data: advisors },
    { data: settingsRows },
    { data: managedPortfolioRows },
  ] = await Promise.all([
    supabase.from("advisor_profiles").select("code, name, created_at").order("name"),
    supabase.from("app_settings").select("key, value"),
    supabase.from("managed_portfolios").select("*").order("display_name"),
  ]);

  const advisorsWithDashboards = (advisors ?? []).map(a => ({ ...a, dashboard: null }));
  const settings = Object.fromEntries((settingsRows ?? []).map(r => [r.key, r.value]));

  return (
    <AdminClient
      advisors={advisorsWithDashboards}
      settings={settings}
      managedPortfolios={managedPortfolioRows ?? []}
    />
  );
}
