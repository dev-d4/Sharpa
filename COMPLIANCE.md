# COMPLIANCE.md — arbetsregelbok för Sharpa

> Internt arbetsverktyg. Detta är **inte juridisk rådgivning** och ersätter inte
> granskning av jurist eller kontakt med Finansinspektionen. Läs hela filen innan du
> bygger, skriver eller deployar något som syns för användaren.

Granskad: 2026-08-03. Revidera vid regeländring, ny funktion eller ny datakälla.

---

## 1. Rättslig ram

Sharpa är ett **automatiserat informations- och jämförelseverktyg**. Tjänsten hämtar
publik fonddata, räknar fram nyckeltal (avgift, historisk avkastning, Sharpe,
spridning), rangordnar fonder inom en kategori efter förutbestämda och för alla
användare identiska kriterier, och visar resultatet. Användaren styr själv indata och
fattar själv alla beslut.

Sharpa har **inget tillstånd från Finansinspektionen** och står inte under FI:s tillsyn.
Sharpa får därför **inte** bedriva investeringsrådgivning, portföljförvaltning,
värdepappersrörelse eller försäkringsdistribution. Konkret: Sharpa får aldrig ge en
**personlig rekommendation** — en rekommendation om ett specifikt finansiellt instrument
som framställs som lämplig för en viss person eller som grundas på den personens
förhållanden, och som riktas till en bestämd person i stället för att spridas till
allmänheten (MiFID II art. 4.1(4), delegerade förordningen (EU) 2017/565 art. 9).
Ett av de fyra kriterierna räcker för att flödet ska bli tillståndspliktigt. En
friskrivning läker inte ett flöde som i praktiken framstår som rådgivning.

---

## 2. Röda linjer — bygg aldrig detta

- **Fråga aldrig om användarens ekonomiska situation, mål, kunskap, erfarenhet,
  förlusttolerans eller sparhorisont och visa sedan namngivna fonder.** Kombinationen
  frågor-om-personen → konkret instrument är själva definitionen av personlig
  rekommendation.
- **Skriv aldrig ut användarens svar som motivering till ett fondval** ("eftersom du
  sparar långsiktigt…", "din försiktiga profil…"). Det gör utdatan grundad på personens
  förhållanden.
- **Använd aldrig "din/dina" om ett resultat som innehåller fondnamn** ("din portfölj",
  "ditt förslag"). Skriv "portföljexemplet", "urvalet".
- **Skicka aldrig e-post, push eller notis som innehåller fondnamn, byten, köp- eller
  säljlägen.** Utgående riktad kommunikation om en enskild användares innehav prövas
  hårdast av alla flöden.
- **Bygg aldrig automatisk ombalansering, orderläggning, depåkoppling eller
  "gör så här"-knappar.** Det är portföljförvaltning respektive orderförmedling.
- **Visa aldrig framtida avkastning, prognos, målbelopp eller sparsimulering med
  utfall.** Endast historiska, källbelagda siffror.
- **Lova aldrig utfall, trygghet eller säkerhet.** Finansiell marknadsföring ska vara
  måttfull (MFL 2008:486, god sed / KO:s och FI:s praxis).
- **Hitta aldrig på siffror i marknadsföring** — inga hårdkodade fallback-värden i
  statistik, inga uppskattningar presenterade som mätvärden.
- **Använd aldrig ordet "rådgivning", "rådgivare" eller "råd" om Sharpas egen tjänst** —
  varken i copy, rubriker, URL-segment, metadata eller demomaterial.
- **Skicka aldrig personnummer i URL, query-parameter eller loggrad.**
- **Aktivera aldrig e-postutskick som förval.** Kryssruta ska vara omarkerad.

---

## 3. Språkbruk — förbjudet / godkänt

| Skriv aldrig | Skriv i stället |
|---|---|
| Vi rekommenderar X | X är en av de fonder som matchar dina filter |
| Fonden passar dig | Fonden matchar de kriterier du valt |
| Du bör byta / se över | Fonden har lägre avgift än kategorisnittet |
| Bästa fonden | Högst rankad i kategorin utifrån avgift, avkastning och Sharpe |
| Bäst rankad / Bäst | Plats 1 av N i urvalet |
| Optimal portfölj | Portföljexempel |
| Din portfölj (om genererat exempel) | Portföljexemplet |
| Din profil / din risknivå ger… | Exemplet är byggt för risknivå 3 av 5 |
| Vårt förslag / vi föreslår | Jämförbara alternativ i samma kategori |
| Möjlig förbättring: +X kr per år | Skillnad i historisk avgift och avkastning: X kr räknat på Y kr |
| Trygg, säker, garanterad | (använd inte — beskriv i stället volatilitet/risknivå) |
| Maximal tillväxtpotential | 100 % aktier — större kursrörelser |
| Indexfonder slår aktiva fonder | Indexfonder har generellt lägre avgift |
| Fondexpert / expert | Automatiserad jämförelse |
| Gratis och oberoende (ensamt) | Kostnadsfritt. Vi tar inga provisioner från fondbolag. |
| Ett exempel — inte en rekommendation *(som enda friskrivning)* | (behåll, men lägg friskrivningen intill resultatet, inte bara i sidfoten) |

**Regel:** ord som beskriver *datan* är tillåtna. Ord som beskriver *användaren* eller
*vad användaren ska göra* är förbjudna.

---

## 4. Obligatoriska element

**A. Sidfotsfriskrivning (finns i `app/Footer.tsx` — ändra inte innebörden).**
Ska ligga på varje publik sida.

**B. Resultatfriskrivning.** Direkt intill varje utdata som innehåller fondnamn,
betyg, ranking eller allokering — inte bara i sidfoten. Standardtext:

> Automatiskt genererad information utifrån historiska nyckeltal och generella
> kriterier. Den tar inte hänsyn till din ekonomiska situation och utgör varken
> investeringsrådgivning eller en personlig rekommendation. Alla investeringsbeslut
> fattar du själv och på egen risk. Historisk avkastning är ingen garanti för framtida
> resultat; fondandelar kan både öka och minska i värde och du kan förlora hela eller
> delar av det investerade kapitalet.

**C. Riskupplysning vid varje avkastningssiffra.** Minst:

> Historisk avkastning är ingen garanti för framtida resultat.

**D. Faktabladslänk (KID/basfakta).** Varje gång en namngiven fond visas ska den ha en
länk eller hänvisning till fondens faktablad hos fondbolaget eller depåplattformen.
Saknas maskinell länk, skriv:

> Läs fondens faktablad (KID) hos fondbolaget innan du fattar beslut.

**E. Metod och källa.** Varje sida som rankar eller jämför fonder ska ange
(1) vilka nyckeltal som vägs in och hur, (2) varifrån datan kommer, (3) när den
uppdaterades (`DataFreshness`), (4) att Sharpa inte tar provision.

**F. E-post.** Varje utskick ska innehålla metodrad, friskrivning (se B, kortform),
avregistreringslänk och länk till inställningar. Innehållet får bara beskriva
*förändring i data* — aldrig fondnamn eller åtgärd.

**G. AI.** Visas AI-genererad text för användaren ska det framgå i gränssnittet
(AI-förordningen (EU) 2024/1689 art. 50), och leverantören ska stå i
integritetspolicyn som underbiträde.

---

## 5. Checklista före ny funktion

Svara skriftligt. **Ett "ja" på fråga 1–7 stoppar bygget** tills funktionen ritats om.

1. Ställer funktionen någon fråga om användarens ekonomi, mål, horisont, kunskap,
   erfarenhet eller förlusttolerans?
2. Påverkar användarens svar om personen *vilka namngivna fonder* som visas?
3. Innehåller utdatan ordet "du/din/dig" i samma mening som ett fondnamn?
4. Riktas utdatan till en bestämd person i stället för att visas likadant för alla?
5. Innehåller funktionen en uppmaning att köpa, sälja, byta, flytta eller behålla?
6. Visar funktionen framtida avkastning, prognos eller simulerat utfall?
7. Skickas något ut (e-post/notis) som nämner en enskild fond?
8. Visas namngivna fonder utan länk/hänvisning till faktablad (KID)?
9. Visas siffror som inte kan härledas till en källa och ett datum?
10. Behandlas nya personuppgifter, eller anlitas ett nytt underbiträde, som inte står
    i integritetspolicyn?

Ja på 8–10 → åtgärda innan release, men stoppar inte designen.

## 6. Checklista före deploy/PR

- [ ] Ingen ny text bryter mot tabellen i avsnitt 3 (`grep -niE "rekommend|passar dig|bör du|bäst|optimal|garanti|trygg|säker|expert|vi föreslår"`).
- [ ] Resultatfriskrivning (4B) finns intill varje ny utdata med fondnamn.
- [ ] Nya avkastningssiffror har riskupplysning (4C) och källdatum.
- [ ] Nya fondlistor har faktabladshänvisning (4D).
- [ ] Ingen hårdkodad fallback-siffra i statistik eller marknadsföring.
- [ ] Ingen ny route, rubrik eller metadata innehåller "radgivning"/"rådgivning".
- [ ] Nya e-postmallar: ingen fondnamn, avregistreringslänk finns, friskrivning finns,
      utskicket är opt-in med omarkerad kryssruta.
- [ ] Inga personuppgifter i URL, query-parameter eller `console.log`.
- [ ] Nytt underbiträde/ny datakälla → integritetspolicy och villkor uppdaterade.
- [ ] Ny extern datakälla → licensvillkoren lästa och attribution på plats.
- [ ] Villkor och integritetspolicy stämmer fortfarande med vad koden faktiskt gör.

---

## 7. Öppna frågor för jurist

Numrerade. Punkt 1–4 bör vara besvarade **före publik lansering**.

1. **Portföljbyggaren.** Utgör flödet risknivåfråga → namngiven fondportfölj med vikter
   en personlig rekommendation enligt 2017/565 art. 9, trots friskrivning och trots att
   frågan gäller önskad risknivå och inte personliga förhållanden? *Blockerar: publik
   lansering av `/bygg-portfolj`.*
2. **Bevakningsmejlen.** Är ett automatiskt, riktat mejl om en enskild användares egen
   sparade portfölj — utan fondnamn och utan åtgärdsuppmaning, men med länk till en sida
   som visar namngivna alternativ — inom eller utanför tillståndsplikten? *Blockerar:
   fortsatt drift av `/api/cron/check-portfolios` i prod.*
3. **Morningstar Direct.** Tillåter licensen att data visas för slutanvändare på en
   publik webbplats, och krävs attribution? Samma fråga för Avanzas och Nordnets
   publika API:er. *Blockerar: publik `/radgivning/portfolioanalysis`.*
4. **E-postutskick.** Krävs föregående samtycke enligt MFL 19 § för bevakningsmejlen,
   eller omfattas de av undantaget i 21 § trots att tjänsten är kostnadsfri och ingen
   försäljning skett? *Blockerar: förvald opt-in.*
5. **MAR.** Omfattas Sharpas fondrankningar och bytesförslag av art. 20 och delegerade
   förordningen (EU) 2016/958 om investeringsrekommendationer, givet att
   fondandelar normalt inte handlas på en handelsplats?
6. **Ansvarsbegränsningen** i användarvillkoren p. 6 — håller en total friskrivning mot
   konsument enligt lagen (1994:1512) om avtalsvillkor i konsumentförhållanden?
7. **PRIIP.** Aktualiseras skyldigheten att tillhandahålla KID (förordning 1286/2014)
   när Sharpa presenterar namngivna fonder utan att sälja eller ge råd om dem?
8. **Ordet "rådgivning"** i B2B-spåret (`/radgivning/*`, demorapportens "Ditt företag —
   Finansiell rådgivning") — skapar det ett rådgivningsintryck som i sig är
   vilseledande enligt MFL 10 §, även om mottagaren är ett tillståndspliktigt bolag?

---

## 8. Prövade regelverk

Lag (2007:528) om värdepappersmarknaden · MiFID II (2014/65/EU) art. 4.1(4) ·
delegerade förordningen (EU) 2017/565 art. 9 · MAR (596/2014) art. 20 och delegerade
förordningen (EU) 2016/958 · FFFS 2017:2 · marknadsföringslagen (2008:486) · lagen
(1994:1512) om avtalsvillkor i konsumentförhållanden · PRIIP-förordningen (1286/2014) ·
UCITS-regelverket · SFDR (2019/2088) · lagen (2018:1219) om försäkringsdistribution
(bedömd ej tillämplig — tjänsten omfattar inga försäkringsprodukter) · GDPR
(2016/679) · lagen (2022:482) om elektronisk kommunikation · AI-förordningen
(EU) 2024/1689 · immaterialrätt och licensvillkor för tredjepartsdata.
