import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computePortfolioScore } from "@/lib/portfolio-score";
import type { PortfolioAnalysis } from "@/lib/analysis";

const SCORE_DROP_THRESHOLD = 0.5; // notify if score drops by this many points (0–10 scale)
const REMINDER_DAYS = 90;          // remind if portfolio not updated in this many days

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Stub: replace with Resend call when email is configured ───────────────────
async function sendScoreDropEmail(email: string, portfolioName: string, oldScore: number, newScore: number) {
  console.log(`[cron] SCORE DROP EMAIL → ${email}: "${portfolioName}" ${oldScore} → ${newScore}`);
  // TODO: await resend.emails.send({ ... })
}

async function sendReminderEmail(email: string, portfolioName: string, daysSince: number) {
  console.log(`[cron] REMINDER EMAIL → ${email}: "${portfolioName}" (${daysSince} dagar sedan analys)`);
  // TODO: await resend.emails.send({ ... })
}
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret (set automatically by Vercel in production)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  const now = new Date();

  // Fetch all portfolios (bypasses RLS via service role)
  const { data: portfolios, error } = await supabase
    .from("portfolios")
    .select("id, user_id, name, analysis, score, score_notified_at, reminder_sent_at, updated_at");

  if (error) {
    console.error("[cron] Failed to fetch portfolios:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = { checked: 0, scoreUpdates: 0, scoreAlerts: 0, reminders: 0 };

  for (const portfolio of portfolios ?? []) {
    results.checked++;

    const analysis = portfolio.analysis as PortfolioAnalysis;
    const { score: newScore } = computePortfolioScore(analysis);
    const oldScore: number | null = portfolio.score;

    // ── Detect score drop ────────────────────────────────────────────────────
    const scoreDrop = oldScore !== null && (oldScore - newScore) >= SCORE_DROP_THRESHOLD;
    const lastNotified = portfolio.score_notified_at ? new Date(portfolio.score_notified_at) : null;
    const notifiedRecently = lastNotified && (now.getTime() - lastNotified.getTime()) < 7 * 24 * 60 * 60 * 1000;

    if (scoreDrop && !notifiedRecently) {
      const { data: userInfo } = await supabase.auth.admin.getUserById(portfolio.user_id);
      const email = userInfo?.user?.email;
      if (email) {
        await sendScoreDropEmail(email, portfolio.name, oldScore!, newScore);
        results.scoreAlerts++;
      }
    }

    // ── Detect stale portfolio (> REMINDER_DAYS since last analysis) ─────────
    const updatedAt = new Date(portfolio.updated_at);
    const daysSince = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    const lastReminder = portfolio.reminder_sent_at ? new Date(portfolio.reminder_sent_at) : null;
    const reminderRecently = lastReminder && (now.getTime() - lastReminder.getTime()) < REMINDER_DAYS * 24 * 60 * 60 * 1000;

    if (daysSince >= REMINDER_DAYS && !reminderRecently) {
      const { data: userInfo } = await supabase.auth.admin.getUserById(portfolio.user_id);
      const email = userInfo?.user?.email;
      if (email) {
        await sendReminderEmail(email, portfolio.name, daysSince);
        results.reminders++;
      }
    }

    // ── Persist updated score and notification timestamps ────────────────────
    const patch: Record<string, unknown> = { score: newScore };
    if (scoreDrop && !notifiedRecently) patch.score_notified_at = now.toISOString();
    if (daysSince >= REMINDER_DAYS && !reminderRecently) patch.reminder_sent_at = now.toISOString();

    if (oldScore !== newScore || Object.keys(patch).length > 1) {
      await supabase.from("portfolios").update(patch).eq("id", portfolio.id);
      results.scoreUpdates++;
    }
  }

  console.log("[cron] check-portfolios done:", results);
  return NextResponse.json({ ok: true, ...results });
}
