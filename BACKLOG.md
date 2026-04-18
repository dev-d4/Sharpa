# Backlog

Lägre siffra = högre prioritet. När du ber Claude läsa igenom denna fil kommer de punkter med lägst siffra att utvecklas först.

## Format
```
[prio] Titel
       Beskrivning (valfritt)
```

---

## Produktfärdighet (från session 2025-04)

[1] Scroll-driven "Hur det fungerar" — premium scrub-upplevelse
    Nuvarande implementation använder wheel-event-interception (steg-för-steg).
    Målet är en kontinuerlig scrub-animation driven av scroll-position (useScroll + useTransform):
    varje px scroll = en liten animation-förändring. Känslan som eftersträvas: premium, flytande,
    som att "kontrollera en timeline". Se designbeskrivning i konversation 2026-04-18.
    Teknisk notering: Framer Motion v12 WAAPI kraschar på color-MotionValues — håll dig till
    opacity, y, scale i style-props. Testa noga i Safari.

[1] Rate limiting på API-routes
    Skydda /api/analyze och /api/fund-quiz mot missbruk och AI-kostnadsbomber.
    Enkel in-memory lösning räcker för start.

[1] SEO-metadata per sida
    Varje route behöver egen title, description och OG-taggar.
    /analyze, /risk-profile, /portfolios, /account etc.

[2] PDF-export av analysresultat
    Största enskilda värdeökning för användare. Exportera portföljsammanfattning +
    bytesförslag som PDF. Bibliotek: @react-pdf/renderer eller puppeteer via API-route.

[2] Delbar analyslänk
    Generera en kort URL efter analys som användaren kan dela med partner eller rådgivare.
    Resultat lagras kortvarigt (eller enkodas i URL).

[3] Stripe + freemium-gates
    Betalmodell: gratis = 1 portfölj + grundanalys, premium = obegränsat + PDF + notiser.
    Stripe Checkout + webhook som sätter is_premium-flagga i Supabase.

[3] Portföljnotiser via e-post
    Veckovis sammanfattning: avkastning, om bytesförslag fortfarande gäller.
    Kräver cron-jobb + e-postleverantör (Resend eller Postmark).

[4] Fondsidor (/fonder/[isin])
    Klickbar fond → dedikerad sida med nyckeltal, kategori, historisk avkastning.
    Bra för SEO — genererar hundratals indexerbara sidor.

## Funktioner


[3] Samlad riskmatchning för alla portföljer
    Visa hur alla portföljer tillsammans matchar mot riskprofilen. Kräver att man lagrar
    totalt portföljvärde (kr) per portfölj för att kunna kapitalvikta sammanvägningen korrekt —
    annars måste man anta lika vikt per portfölj vilket kan ge missvisande resultat.
    Steg: (1) Lägg till valfritt fält `total_value` i portfolios-tabellen, (2) låt användaren
    ange värde vid sparande, (3) beräkna viktad genomsnittlig risknivå och visa mot profilen
    i "Din riskprofil"-sektionen på kontosidan.


<!-- Exempel:
[1] Notiser när en fond presterar dåligt
    Skicka e-post eller push-notis om en fond i portföljen tappar mer än X% på en månad.

[2] Jämför två portföljer
    Lägg in två portföljer och se nyckeltal sida vid sida.

[3] Historisk prestandavy
    Graf som visar portföljens viktade avkastning över tid.
-->


