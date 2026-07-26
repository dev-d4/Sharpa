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
| Host | `smtp.resend.com` (samma för alla regioner) |
| Port | `587` |
| Username | `resend` |
| Password | Resend-nyckeln från steg 1 |
| Sender email | `no-reply@sharpa.se` |
| Sender name | `Sharpa` |

**Avsändaradressen måste ligga på den verifierade domänen.** Det är den enda
fällan i hela uppsättningen som ser ut som något annat: sätter man en vanlig
Gmail-adress som avsändare autentiserar Supabase mot Resend utan problem — API-
nyckeln registreras till och med som använd — men Resend avvisar sedan
meddelandet eftersom du inte äger gmail.com. Symptomen blir `unexpected_failure`
med `Error sending magic link email` i klienten, och ingenting alls i Resends
Emails-logg.

Adressen behöver däremot inte vara en riktig brevlåda. Resend signerar med DKIM
för domänen och det räcker för utskicket — men svar på mejlet studsar. Ska svar
gå fram, peka vidare `no-reply@sharpa.se` hos den som hanterar e-post för
domänen, eller använd en adress som redan läses.

## 3. Supabase: höj sändningsgränsen

**Authentication → Rate Limits**. Supabase sätter 30 mejl i timmen när egen
SMTP kopplas in, som skydd. Höj *Rate limit for sending emails* till en nivå
som matchar trafiken — 100/timme är en rimlig start och går att justera senare.

## 4. Supabase: mejlmallarna

**Två** mallar måste fyllas i, under **Authentication → Emails → Templates**.
Supabase väljer mellan dem utifrån om adressen redan finns som användare, och
eftersom `/login` skapar konto automatiskt möter varje förstagångsanvändare den
andra. Missar man den får nya användare Supabases engelska standardtext
("Confirm your signup") medan återvändande får den fina — avsändaren byter
skepnad mitt i flödet.

| Mall | När den används | Subject | Innehåll |
| --- | --- | --- | --- |
| **Magic Link** | Adressen finns redan | `Din inloggningslänk till Sharpa` | [magic-link.html](../supabase/templates/magic-link.html) |
| **Confirm signup** | Ny adress | `Välkommen till Sharpa` | [confirm-signup.html](../supabase/templates/confirm-signup.html) |

Mallarna ligger i repot för att vara versionshanterade, men Supabase läser dem
inte därifrån — ändrar du en fil måste den kopieras in på nytt. Ändrar du
utseendet i den ena, gör samma sak i den andra.

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

## Felsökning

`authErrorMessage` ([lib/auth-errors.ts](../lib/auth-errors.ts)) loggar
Supabases originalfel till webbläsarkonsolen medan användaren får en begriplig
text. Börja alltid där — raden `[auth] inloggningsfel` innehåller `code`,
`status` och Supabases egen formulering.

Var utskicket tog vägen avgörs sedan av **Emails**-loggen i Resend:

| Symptom | Var felet sitter |
| --- | --- |
| Inget i Resends Emails-logg, `Error sending magic link email` i konsolen | Resend avvisade meddelandet — nästan alltid en avsändaradress utanför den verifierade domänen (se steg 2) |
| Utskicket syns i Resend men inte i inkorgen | Leverans eller spamfilter, inte koden. Kolla DKIM/SPF och skräpposten |
| `email rate limit exceeded` | Sändningsgränsen i Supabase, steg 3 — inte Resend |
| Inloggningen fungerar men landar på startsidan | Redirect-URL:erna i steg 5 saknar `**` |
| Mejlet är plötsligt Supabases engelska standardtext | Adressen är ny — det är *Confirm signup*-mallen, steg 4 |

Att API-nyckeln står som använd i Resend säger bara att autentiseringen gick
igenom. Det utesluter inte att meddelandet avvisades i nästa steg.
