import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PortfolioMetricsSnapshot } from "./portfolio-watch";
import type {
  HistoryRow,
  NotificationRecord,
  PortfolioPatch,
  WatchPortfolio,
  WatchStore,
} from "./portfolio-watch-runner";

/**
 * Supabase-implementationen av {@link WatchStore}.
 *
 * Använder service role och körs uteslutande i serverkod (cron-jobbet). Nyckeln
 * lämnar aldrig servern — `server-only` gör en klientimport till ett byggfel.
 */

export function getAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY måste vara satta");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function createSupabaseWatchStore(supabase: SupabaseClient = getAdminSupabase()): WatchStore {
  return {
    async getFundDataVersion() {
      // Senaste hämtningstidpunkten i fondtabellen identifierar dataversionen.
      // Byts den har refresh-funds kört; är den oförändrad finns inget nytt att
      // analysera.
      const { data, error } = await supabase
        .from("funds")
        .select("fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(`[cron] kunde inte läsa fonddataversion: ${error.message}`);
        return null;
      }
      return data?.fetched_at ? new Date(data.fetched_at).toISOString() : null;
    },

    async listPortfolios() {
      const { data, error } = await supabase
        .from("portfolios")
        .select(
          "id, user_id, name, custodian, holdings, analysis, score, last_notification_score, last_checked_fund_version"
        );
      if (error) throw new Error(`kunde inte hämta portföljer: ${error.message}`);
      return (data ?? []) as WatchPortfolio[];
    },

    async getAlertPreferences(userIds) {
      const map = new Map<string, boolean>();
      if (userIds.length === 0) return map;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("user_id, email_score_alerts")
        .in("user_id", userIds);

      if (error) {
        console.error(`[cron] kunde inte läsa notisinställningar: ${error.message}`);
        return map;
      }
      for (const row of data ?? []) map.set(row.user_id, row.email_score_alerts !== false);
      return map;
    },

    async getUserEmail(userId) {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error) return null;
      return data?.user?.email ?? null;
    },

    async getPreviousMetrics(portfolioIds) {
      const map = new Map<string, PortfolioMetricsSnapshot>();
      if (portfolioIds.length === 0) return map;

      const { data, error } = await supabase
        .from("portfolio_score_history")
        .select("portfolio_id, metrics, calculated_at")
        .in("portfolio_id", portfolioIds)
        .order("calculated_at", { ascending: false });

      if (error) {
        console.error(`[cron] kunde inte läsa betygshistorik: ${error.message}`);
        return map;
      }
      // Sorterad fallande — första raden per portfölj är den senaste.
      for (const row of data ?? []) {
        if (!map.has(row.portfolio_id) && row.metrics) {
          map.set(row.portfolio_id, row.metrics as PortfolioMetricsSnapshot);
        }
      }
      return map;
    },

    async insertHistory(row: HistoryRow) {
      const { data, error } = await supabase
        .from("portfolio_score_history")
        .insert(row)
        .select("id")
        .maybeSingle();

      // 23505 = unique_violation. Raden fanns redan, alltså har portföljen redan
      // behandlats mot den här fonddataversionen.
      if (error?.code === "23505") return { inserted: false, id: null };
      if (error) throw new Error(`kunde inte spara historik: ${error.message}`);

      return { inserted: true, id: data?.id ?? null };
    },

    async updatePortfolio(portfolioId: string, patch: PortfolioPatch) {
      // updated_at lämnas orört: det speglar när ANVÄNDAREN senast ändrade
      // portföljen och styr påminnelselogiken.
      const { error } = await supabase
        .from("portfolios")
        .update({
          analysis: patch.analysis,
          score: patch.score,
          score_breakdown: patch.score_breakdown,
          last_checked_at: patch.last_checked_at,
          last_checked_fund_version: patch.last_checked_fund_version,
        })
        .eq("id", portfolioId);

      if (error) throw new Error(`kunde inte spara portfölj: ${error.message}`);
    },

    async markNotified(record: NotificationRecord) {
      const { error } = await supabase
        .from("portfolios")
        .update({
          score_notified_at: record.notifiedAt,
          last_notification_score: record.score,
          last_notification_message_id: record.messageId,
          last_notification_status: "sent",
        })
        .eq("id", record.portfolioId);

      if (error) throw new Error(`kunde inte bokföra notis: ${error.message}`);

      if (record.historyId) {
        await supabase
          .from("portfolio_score_history")
          .update({ notified: true, notification_message_id: record.messageId })
          .eq("id", record.historyId);
      }
    },

    async markNotificationFailed(portfolioId: string) {
      // Endast status — score_notified_at och last_notification_score lämnas
      // orörda så att nästa körning försöker igen.
      await supabase
        .from("portfolios")
        .update({ last_notification_status: "failed" })
        .eq("id", portfolioId);
    },
  };
}
