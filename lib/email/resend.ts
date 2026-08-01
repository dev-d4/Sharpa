import "server-only";
import { Resend } from "resend";

/**
 * Tunn serverwrapper kring Resends officiella SDK.
 *
 * Endast serverkod. `server-only` gör att en oavsiktlig import från en
 * klientkomponent blir ett byggfel i stället för en läckt API-nyckel.
 *
 * Resend-konfigurationen i Supabase (SMTP) används enbart för
 * autentiseringsmejl. Portföljnotiser går den här vägen, direkt mot Resends
 * API med en egen nyckel som bara har sending access.
 */

export const DEFAULT_PORTFOLIO_ALERT_FROM =
  "Sharpa Portföljbevakning <bevakning@sharpa.se>";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /**
   * Stabil nyckel för utskicket. Skickas som Resends `Idempotency-Key` så att
   * ett omkört cron-jobb inte kan skapa två mejl för samma förändring, även om
   * databasuppdateringen skulle misslyckas mellan sändning och bokföring.
   */
  idempotencyKey?: string;
  /** RFC 8058 one-click unsubscribe. */
  listUnsubscribeUrl?: string;
};

export type SendEmailResult =
  | { ok: true; messageId: string | null; skipped?: false }
  /** Inget mejl skickades — testläge eller saknad konfiguration. */
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; error: string };

/**
 * Sändning är avstängd i test och när nyckeln saknas. Ett "skipped"-resultat
 * räknas aldrig som skickat — anroparen får inte sätta score_notified_at.
 */
export function isEmailSendingEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  if (env.NODE_ENV === "test") return false;
  if (env.VITEST) return false;
  if (env.EMAIL_DRY_RUN === "true") return false;
  return Boolean(env.RESEND_API_KEY);
}

export function getPortfolioAlertFrom(
  env: Record<string, string | undefined> = process.env
): string {
  return env.RESEND_FROM_PORTFOLIO_ALERTS || DEFAULT_PORTFOLIO_ALERT_FROM;
}

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/** Endast för test — nollställer den memoiserade klienten. */
export function __resetResendClient() {
  client = null;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!isEmailSendingEnabled()) {
    const reason =
      process.env.NODE_ENV === "test" || process.env.VITEST
        ? "testläge"
        : process.env.EMAIL_DRY_RUN === "true"
          ? "EMAIL_DRY_RUN"
          : "RESEND_API_KEY saknas";
    // Ämnesraden loggas, aldrig mottagaradressen.
    console.log(`[resend] hoppar över utskick (${reason}): "${input.subject}"`);
    return { ok: false, skipped: true, reason };
  }

  const headers: Record<string, string> = {};
  if (input.listUnsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${input.listUnsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    const { data, error } = await getClient().emails.send(
      {
        from: getPortfolioAlertFrom(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    );

    if (error) {
      console.error(`[resend] utskick misslyckades: ${error.name ?? "error"} — ${error.message}`);
      return { ok: false, error: error.message };
    }

    return { ok: true, messageId: data?.id ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[resend] utskick kastade fel: ${message}`);
    return { ok: false, error: message };
  }
}
