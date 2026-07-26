// Feature flags — set to true to re-enable
export const ENTERPRISE_FEATURES_ENABLED = false;

/**
 * Inloggning med magisk länk.
 *
 * Påslagen sedan utskicken går via egen SMTP (Resend, verifierad avsändare
 * no-reply@sharpa.se). Dessförinnan användes Supabases inbyggda e-posttjänst,
 * som bara delar ut ett par mejl i timmen för hela projektet och gav
 * användarna "email rate limit exceeded" i stället för ett inloggningsmejl.
 *
 * Sätt NEXT_PUBLIC_MAGIC_LINK_ENABLED=false för att snabbt stänga av
 * e-postinloggningen igen — t.ex. om utskicken börjar studsa — utan att
 * behöva ändra i koden. Se docs/inloggning-magisk-lank.md.
 */
export const MAGIC_LINK_ENABLED = process.env.NEXT_PUBLIC_MAGIC_LINK_ENABLED !== "false";
