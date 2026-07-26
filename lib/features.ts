// Feature flags — set to true to re-enable
export const ENTERPRISE_FEATURES_ENABLED = false;

/**
 * Inloggning med magisk länk.
 *
 * Avstängd tills projektet har egen SMTP. Supabases inbyggda e-posttjänst är
 * bara avsedd för utveckling och delar ut ett fåtal mejl per timme för hela
 * projektet — användare möttes av "email rate limit exceeded" i stället för
 * ett inloggningsmejl. Koden för magiska länkar finns kvar och tas i bruk
 * genom att sätta NEXT_PUBLIC_MAGIC_LINK_ENABLED=true när SMTP är på plats
 * (Supabase → Auth → Emails → SMTP Settings, och höj gränsen under Rate Limits).
 */
export const MAGIC_LINK_ENABLED = process.env.NEXT_PUBLIC_MAGIC_LINK_ENABLED === "true";
