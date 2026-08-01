import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { escapeHtml } from "@/lib/email/portfolio-alert";

/**
 * Avregistrering från portföljnotiser.
 *
 * GET  — användaren klickar på länken i mejlet. Stänger av notiserna och visar
 *        en begriplig bekräftelsesida.
 * POST — RFC 8058 one-click unsubscribe. Mejlklienten (Gmail, Apple Mail)
 *        anropar adressen i List-Unsubscribe utan användarinteraktion och
 *        förväntar sig 200/202 utan innehåll.
 *
 * Token är signerad och tidsbegränsad. Ett rått user-id i länken skulle låta
 * vem som helst stänga av bevakningen åt någon annan.
 *
 * Endast portföljnotiser påverkas. Inloggningsmejl går via Supabase Auth och
 * berörs inte av den här inställningen.
 */

export const dynamic = "force-dynamic";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Stänger av e-postnotiser för användaren. Idempotent. */
async function disableAlerts(
  userId: string,
  source: "link" | "one-click"
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAdminSupabase();
  if (!supabase) return { ok: false, error: "config" };

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      email_score_alerts: false,
      updated_at: new Date().toISOString(),
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_source: source,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error(`[unsubscribe] kunde inte spara inställning: ${error.message}`);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ── Bekräftelsesida ───────────────────────────────────────────────────────────

function page(opts: { title: string; body: string; showAccountLink?: boolean }): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://sharpa.se").replace(/\/+$/, "");
  const link = opts.showAccountLink
    ? `<p class="cta"><a href="${escapeHtml(site)}/account#notiser">Hantera dina notisinställningar</a></p>`
    : `<p class="cta"><a href="${escapeHtml(site)}">Till sharpa.se</a></p>`;

  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(opts.title)} · Sharpa</title>
<style>
  body { margin:0; background:#F7F8F9; color:#17212B;
         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; }
  main { max-width:480px; margin:0 auto; padding:48px 20px; }
  .card { background:#fff; border:1px solid #E7EAEE; border-radius:12px; padding:32px; }
  .brand { font-size:19px; font-weight:700; letter-spacing:-0.3px; color:#1F3A5F; }
  h1 { font-size:20px; line-height:28px; font-weight:600; margin:24px 0 0; }
  p { font-size:15px; line-height:23px; color:#4B5A68; margin:12px 0 0; }
  .cta { margin-top:24px; }
  .cta a { color:#1F3A5F; font-weight:600; text-decoration:underline; }
  .foot { font-size:12px; line-height:18px; color:#9CA8B3; margin-top:20px; text-align:center; }
</style>
</head>
<body>
  <main>
    <div class="card">
      <span class="brand">Sharpa</span>
      <h1>${escapeHtml(opts.title)}</h1>
      <p>${opts.body}</p>
      ${link}
    </div>
    <p class="foot">Sharpa · Automatiserad fondanalys</p>
  </main>
</body>
</html>`;
}

function html(body: string, status: number) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const verified = verifyUnsubscribeToken(token);

  if (!verified.ok) {
    const body =
      verified.reason === "expired"
        ? "Länken har slutat gälla. Logga in på Sharpa så kan du ändra dina notisinställningar under Mitt konto."
        : "Länken gick inte att verifiera. Logga in på Sharpa så kan du ändra dina notisinställningar under Mitt konto.";
    return html(page({ title: "Länken fungerar inte", body, showAccountLink: true }), 400);
  }

  const result = await disableAlerts(verified.userId, "link");
  if (!result.ok) {
    return html(
      page({
        title: "Något gick fel",
        body: "Vi kunde inte spara ändringen just nu. Försök igen om en stund, eller stäng av notiserna under Mitt konto.",
        showAccountLink: true,
      }),
      500
    );
  }

  return html(
    page({
      title: "Portföljbevakningen är avstängd",
      body:
        "Du får inga fler mejl när betyget på dina sparade portföljer förändras. " +
        "Portföljerna finns kvar och analyseras fortfarande om — du kan se dem när du loggar in. " +
        "Inloggningsmejl påverkas inte.",
      showAccountLink: true,
    }),
    200
  );
}

export async function POST(req: NextRequest) {
  // Token kan ligga i query (List-Unsubscribe-URL:en) — mejlklienten postar
  // ett fast formulärvärde, inte vår token.
  const token = req.nextUrl.searchParams.get("token");
  const verified = verifyUnsubscribeToken(token);

  if (!verified.ok) {
    return new NextResponse(null, { status: 400 });
  }

  const result = await disableAlerts(verified.userId, "one-click");
  if (!result.ok) {
    return new NextResponse(null, { status: 500 });
  }

  // RFC 8058: tom 200 räcker. Mejlklienten visar sin egen bekräftelse.
  return new NextResponse(null, { status: 200 });
}
