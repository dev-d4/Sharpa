# Inloggning med magisk länk — drift

Magiska länkar är i drift sedan 2026-07-26 och skickas via Resend med
`no-reply@sharpa.se` som verifierad avsändare.

Bakgrund: Supabases inbyggda e-posttjänst är bara avsedd för utveckling. Den
skickar **2 mejl i timmen för hela projektet**, delat mellan alla användare, och
gav `email rate limit exceeded` i stället för ett inloggningsmejl. Därför är
egen SMTP ett krav, inte en förbättring.

Dokumentet beskriver hur uppsättningen ser ut, så att den går att återskapa
eller felsöka. Konfigurationen bor i Resend och Supabase — inget av den läses
från repot.

## 1. Resend: verifiera avsändardomänen

1. Skapa ett konto på [resend.com](https://resend.com) och gå till **Domains → Add Domain**.
2. Ange `sharpa.se`. Resend visar då ett antal DNS-poster — en MX-post och två
   till tre TXT-poster (SPF och DKIM). Kopiera dem exakt som de står.
3. Lägg in posterna hos den som hanterar DNS för sharpa.se. Verifieringen tar
   oftast några minuter, ibland upp till ett dygn.
4. När domänen står som **Verified**: gå till **API Keys → Create API Key**,
   välj behörigheten *Sending access* och kopiera nyckeln (börjar med `re_`).
   Den visas bara en gång.

Lägg gärna även in en DMARC-post (`_dmarc.sharpa.se` med
`v=DMARC1; p=none; rua=mailto:...`). Den är inte obligatorisk, men Gmail och
Outlook behandlar avsändare utan DMARC hårdare.

## 2. Supabase: koppla in SMTP

**Authentication → Emails → SMTP Settings**, slå på *Enable Custom SMTP*:

| Fält | Värde |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Resend-nyckeln från steg 1 |
| Sender email | `no-reply@sharpa.se` |
| Sender name | `Sharpa` |

Avsändaradressen måste ligga på den domän du verifierade — annars avvisar
Resend utskicket.

## 3. Supabase: höj sändningsgränsen

**Authentication → Rate Limits**. Supabase sätter 30 mejl i timmen när egen
SMTP kopplas in, som skydd. Höj *Rate limit for sending emails* till en nivå
som matchar trafiken — 100/timme är en rimlig start och går att justera senare.

## 4. Supabase: mejlmallen

**Authentication → Emails → Templates → Magic Link**.

- **Subject:** `Din inloggningslänk till Sharpa`
- **Message body:** klistra in innehållet i
  [supabase/templates/magic-link.html](../supabase/templates/magic-link.html).

Mallen ligger i repot för att vara versionshanterad, men Supabase läser den
inte därifrån — ändrar du filen måste den kopieras in på nytt.

## 5. Supabase: kontrollera redirect-URL:erna

**Authentication → URL Configuration.** Det här steget är lätt att missa och
ger ett förvirrande symptom: inloggningen fungerar, men användaren landar på
startsidan i stället för där hen var.

- **Site URL:** `https://sharpa.se`
- **Redirect URLs** måste innehålla, med dubbla asterisker så att query-strängen
  (`?next=...`) matchas:
  - `https://sharpa.se/auth/callback**`
  - `http://localhost:3000/auth/callback**`
  - motsvarande med wildcard för Vercels förhandsvisningsdomän, om inloggning
    ska fungera där (kopiera domänmönstret från Vercel-projektet)

Matchar inte URL:en faller Supabase tillbaka på Site URL, och `?next=` tappas
bort på vägen.

## 6. Flaggan

E-postinloggningen är påslagen som standard i
[lib/features.ts](../lib/features.ts). Ingen miljövariabel behövs för att den
ska fungera.

Behöver du stänga av den snabbt — utskicken börjar studsa, avsändardomänen
hamnar på en blockeringslista — sätt `NEXT_PUBLIC_MAGIC_LINK_ENABLED=false` i
Vercel och deploya om. Google finns kvar som inloggningssätt under tiden.
Variabeln bakas in vid bygget, så en ny deploy krävs.

## 7. Testa

1. Logga ut, gå till `/analyze`, lägg in ett par fonder och kör analysen.
2. Klicka **Logga in** och begär en länk till en riktig adress.
3. Mejlet ska komma inom någon minut, med Sharpa som avsändare — inte
   `noreply@mail.app.supabase.io`.
4. Öppna länken **i en annan flik eller på mobilen**. Du ska landa på
   `/analyze` med analysen kvar — det är vad återupptagningen i
   [lib/resume-session.ts](../lib/resume-session.ts) skyddar.
5. Begär fem länkar i rad. Ingen ska ge `email rate limit exceeded`.

Kommer inget mejl: kolla **Logs → Auth** i Supabase och **Emails** i Resend.
Syns utskicket i Resend men inte i inkorgen är det nästan alltid domän- eller
spamfiltrering, inte koden.
