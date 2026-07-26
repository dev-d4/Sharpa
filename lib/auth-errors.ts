/**
 * Översätter Supabases inloggningsfel till begriplig svenska.
 *
 * Supabase svarar på engelska och ofta i tekniska termer — "email rate limit
 * exceeded" säger ingenting om vad användaren ska göra. Vi visar i stället vad
 * som hände och vad nästa steg är, och faller tillbaka på ett neutralt
 * meddelande för fel vi inte känner igen (originalet hjälper ändå ingen).
 */

type AuthErrorLike = { message?: string; status?: number; code?: string } | null | undefined;

export function authErrorMessage(error: AuthErrorLike): string {
  const message = error?.message?.toLowerCase() ?? "";
  const code = error?.code ?? "";

  // Användaren ska aldrig se Supabases engelska teknikprosa, men den behövs för
  // felsökning — utan den går det inte att skilja en trasig SMTP-konfiguration
  // från ett avvisat utskick.
  if (error) {
    console.error("[auth] inloggningsfel", { code: error.code, status: error.status, message: error.message });
  }

  if (code === "over_email_send_rate_limit" || message.includes("rate limit")) {
    return "Vi har skickat för många mejl på kort tid. Vänta någon minut och försök igen — eller fortsätt med Google.";
  }

  if (code === "validation_failed" || message.includes("invalid email") || message.includes("unable to validate email")) {
    return "E-postadressen ser inte giltig ut. Kontrollera stavningen.";
  }

  if (message.includes("signups not allowed") || message.includes("signup is disabled")) {
    return "Det går inte att skapa nya konton just nu. Prova med Google.";
  }

  if (error?.status === 0 || message.includes("failed to fetch") || message.includes("network")) {
    return "Vi når inte servern. Kontrollera din uppkoppling och försök igen.";
  }

  return "Vi kunde inte skicka länken just nu. Försök igen om en stund, eller fortsätt med Google.";
}
