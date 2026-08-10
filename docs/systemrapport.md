# Systemrapport – Sharpa

Teknisk beskrivning av hur sajten fungerar: analysverktyget, betygsättningen,
portföljbyggaren, fonddatans uppdatering från Avanza och Nordnet, samt den
automatiska portföljbevakningen.

Rapporten beskriver koden som den ser ut i `feature/portfolio-watch`
(2026-08-04). Alla filhänvisningar är relativa till projektroten.

---

## 1. Översikt

| Del | Sidor / endpoints | Kärnlogik |
|---|---|---|
| Analysera portfölj | `/analyze`, `POST /api/analyze` | `lib/analysis.ts`, `lib/analysis-service.ts` |
| Betyg (0–10) | används av analys, portföljlista och bevakning | `lib/portfolio-score.ts` |
| Bygg portfölj | `/bygg-portfolj`, `POST /api/build-portfolio` | `app/api/build-portfolio/route.ts` |
| Fonddata | `GET /api/cron/refresh-funds`, `scripts/refresh-funds.mjs` | `lib/avanza.ts`, `lib/nordnet.ts` |
| Bevakning | `GET /api/cron/check-portfolios` | `lib/portfolio-watch-runner.ts`, `lib/portfolio-watch.ts` |
| Utskick | Resend | `lib/email/send-portfolio-alert.ts`, `lib/email/portfolio-alert.ts` |

Datalagret är Supabase (Postgres). Tabellen `funds` är den gemensamma
fondtabellen; vyerna `avanza_fund_data` och `nordnet_fund_data` filtrerar den
per källa. `avanza_offerings` och `nordnet_offerings` håller vilket utbud som
finns hos respektive plattform (plus Nordnets `display_slug`, som behövs för
detaljanropen).

---

## 2. Analysverktyget (`/analyze`)

### 2.1 Inmatning

Användaren väljer först depå (`avanza`, `nordnet` eller `övrigt`) och fyller
sedan portföljen på ett av tre sätt ([AnalyzeClient.tsx](app/analyze/AnalyzeClient.tsx)):

1. **Fondsökning** – skriv fondnamn, autocompletea mot
   [app/api/funds/search/route.ts](app/api/funds/search/route.ts). Sökningen
   läser namn + ISIN ur rätt vy (`avanza_fund_data` / `nordnet_fund_data`) och
   cachar listan i processminnet i 15 minuter. Klienten värmer cachen vid
   sidladdning med `q=__warmup__`.
2. **Filimport** – CSV/TXT/XLSX från Avanza, Nordnet eller generisk export,
   parsad i [lib/portfolio-import.ts](lib/portfolio-import.ts). Kolumner
   identifieras på rubriknamn (inte position), aktier/ETF:er/certifikat sorteras
   bort, innehav aggregeras per ISIN och taket är 50 innehav (`MAX_HOLDINGS`).
   Värdekolumnen får vara antingen belopp i SEK eller färdiga procentandelar.
3. **Manuell inmatning** – ISIN + vikt.

Vikterna normaliseras till procent; summerar de inte till 100 % noteras det i
analysens sammanfattningstext.

### 2.2 Analyskedjan

`POST /api/analyze` är ett tunt skal runt `analyzePortfolioEntries()` i
[lib/analysis-service.ts](lib/analysis-service.ts). Samma funktion används av
cron-jobbet, vilket är avsiktligt: bevakningen ska räkna om exakt som sajten gör.

Stegen:

1. **Hämta fondunderlaget för depån** (`fetchFundsByCustodian`,
   [lib/funds.ts](lib/funds.ts)):
   - `avanza` → enbart Avanzas fonder.
   - `nordnet` → Nordnets utbud, men överlappande ISIN ersätts med Avanzas rad
     (Avanza har Sharpe, standardavvikelse och ESG som Nordnets listendpoint
     saknar).
   - `övrigt` → Avanza + Nordnet-exklusiva fonder.
2. **Berika Nordnet-exklusiva innehav** (`enrichNordnetOnly`). För ISIN som inte
   finns hos Avanza görs ett detaljanrop mot Nordnets instrument-API för att få
   Sharpe, alfa, beta, standardavvikelse och avgifter. Resultatet skrivs tillbaka
   till `funds`, så anropet görs bara en gång per fond.
3. **Slå upp varje ISIN** (trimmat, versaliserat). Innehav utan träff hamnar i
   `notFound`.
4. **Bygg jämförelseunderlag** – bara fonder i samma `category` som något av
   portföljens innehav skickas in som "peers", vilket håller nere datamängden.
5. **Kör `analyzePortfolio()`** ([lib/analysis.ts](lib/analysis.ts)).

### 2.3 Vad analysen räknar fram

Allt viktas med innehavens vikter (`weightedAvg`) och hoppar över fonder som
saknar värdet i fråga:

- Viktad avgift (`ongoing_cost_actual`, annars `ongoing_cost_estimated`)
- Viktad avkastning 1, 3 och 5 år
- Viktad Sharpe 3 år, alfa 3 år, beta 3 år, standardavvikelse 3 år
- **Kategorifördelning** – grov, på `category_group` (Aktiefonder, Räntefonder,
  Blandfonder, Alternativa, Konvertibler, Penningmarknad, Övrigt)
- **Detaljerad fördelning** – på `selection_id` när det finns (byggarens
  granularitet: Global, Sverige, USA, Teknik, Svenska räntor …), annars fondens
  `category`
- **Aktiv/passiv-fördelning** – från `investment_type`; Nordnet-fonder utan
  fältet räknas som "okänd"
- **Koncentrationsvarningar** – en enskild specifik kategori som väger ≥ 50 %
  flaggas (fångar "fem globalfonder", inte "mycket aktier" generellt)
- **Sammanfattningstext** på svenska med decimalkomma

### 2.4 Fondbytesförslag

För varje innehav ([`generateSwaps`](lib/analysis.ts#L243)):

1. **Peer-urval** – samma `category` och samma geografiska fokus.
   Geografin härleds i första hand ur kategoristrängen (`geoFromCategory`, som
   skiljer "Asien" från "Asien ex Japan") och i andra hand ur fondnamnet
   (`geoFromName`). Saknar någon av fonderna geografisk signal räknas de som
   matchande.
2. **Filter** – fonder utan känd avgift utesluts. De skulle annars få
   kostnadsstraff 0 i rankningen och vinna på felaktiga grunder.
3. **Rankning** – `absoluteScore()`:

   ```
   score = Sharpe(3 år) × 3
         + Avkastning(3 år) × 0,03
         − Avgift × 3
   ```

   Sharpe är huvudsignalen. Avgiften väger tungt (×3 ≈ en dyr fond måste ha
   ungefär en hel Sharpe-enhet mer per extra procentenhet avgift).
   3-årsavkastningen är en svag tiebreaker, så att hög historisk avkastning inte
   kan motivera en dyr fond. Scoren får medvetet bara använda nyckeltal som
   visas i jämförelsen i gränssnittet — användaren ska kunna se exakt de siffror
   som avgjorde rankningen.
4. **Beslut** – slår ingen jämförbar fond den nuvarande stämplas innehavet
   "redan bäst i kategorin". Annars föreslås kategorins toppfond, utan
   marginalkrav. Pekar förslaget på en fond användaren redan äger markeras det
   som konsolidering (`consolidate`).
5. **Motivering** – byggs av de faktiska skillnaderna (bättre Sharpe, lägre
   avgift, högre 3-årsavkastning) med källvärdena utskrivna.
6. **Gruppvikter** – när flera innehav pekar på samma alternativ fördelas
   gruppens totalvikt lika mellan dem (`equalizeGroupWeights`), så att
   jämförelsen inte snedvrids av hur innehaven råkar ligga. Gruppens totalvikt
   är oförändrad.

Slutligen räknas ett "föreslaget scenario" fram (`suggestedMetrics`) med avgift,
avkastning och Sharpe för portföljen om alla byten genomförs.

---

## 3. Betyget (0–10)

Beräknas i [lib/portfolio-score.ts](lib/portfolio-score.ts) ur en färdig analys.
Fyra likaviktade dimensioner, var och en 0–10 poäng. **Dimensioner som saknar
data utelämnas helt** — de drar alltså inte ned betyget — och totalen är ett
oviktat medelvärde av de dimensioner som gick att beräkna, avrundat till en
decimal. Går ingen dimension att beräkna sätts 5,0.

| Dimension | Mått | Trappa |
|---|---|---|
| `cost` | Viktad avgift | < 0,2 % → 10 · < 0,4 % → 8 · < 0,6 % → 6 · < 0,9 % → 4 · annars 2 |
| `sharpe` | Viktad Sharpe 3 år | > 1,2 → 10 · > 0,8 → 8 · > 0,5 → 6 · > 0,2 → 4 · annars 2 |
| `return3yr` | Viktad avkastning 3 år | > 40 % → 10 · > 25 % → 9 · > 15 % → 8 · > 8 % → 7 · > 3 % → 5 · annars 2 |
| `diversification` | Antal kategorier med > 5 % vikt (detaljerad fördelning) | ≥ 4 → 10 · 3 → 8 · 2 → 5 · annars 2 |

Etiketter: ≥ 8,5 **Utmärkt** · ≥ 7 **Bra** · ≥ 5,5 **OK** · ≥ 4 **Kan
förbättras** · annars **Behöver ses över**.

Delpoängen sparas per dimension (`score_breakdown` på portföljen och i
historiken). Det är den uppdelningen som gör att bevakningen kan säga *vilken*
del av betyget som sjunkit — utan den går det bara att konstatera att totalen
ändrats.

Betyget sparas med två decimaler (`NUMERIC(4,2)`). Tidigare heltalsavrundning
gjorde att ett fall från 7,6 till 7,0 såg ut som ingen förändring alls.

Betyget beräknas på tre ställen, alltid med samma funktion:
`POST /api/portfolios` när användaren sparar, i analysvyn för direkt visning,
och i cron-jobbet vid varje kontroll.

---

## 4. Portföljbyggaren (`/bygg-portfolj`)

Bygger ett **exempel** utifrån parametrar användaren ställer in — aldrig utifrån
frågor om användarens personliga förhållanden. Den avgränsningen är medveten och
dokumenterad i koden (COMPLIANCE.md § 2; svar om personen skulle göra utdatan
till en personlig rekommendation enligt 2017/565 art. 9).

### 4.1 Indata

```ts
{
  platform: "avanza" | "nordnet" | "both",
  riskDirect: 1–5,                  // vald risknivå för exemplet
  selections: SelectionId[],        // geografi, bransch, stil, räntetyper
  priorities: { [id]: number },     // 1 = viktigast
  management: "passive" | "mixed" | "active",
  equityOverride: number | null     // manuell aktieandel i procent
}
```

### 4.2 Tillgångsfördelning

Risknivån (1–5) ger aktieandelen: **20 / 40 / 60 / 80 / 100 %**, med etiketterna
Försiktig, Defensiv, Balanserad, Tillväxt, Offensiv. Resten går till räntor.
`equityOverride` sätter andelen manuellt och etiketten härleds då ur andelen.

### 4.3 Kategorislots och viktning

- Max 8 aktieslots (`MAX_EQUITY_SLOTS`), minsta vikt per slot 5 %
  (`MIN_WEIGHT_PCT`).
- Vikter fördelas efter prioritet: vikt ∝ 1/prioritet, med resten fördelad på
  största decimaldel. Utan prioriteringar blir det jämnt.
- Får en kategori mindre än 5 % tas den minst prioriterade bort och vikterna
  räknas om — **inom samma tillgångsslag**. En bortplockad aktiekategori får
  aldrig flytta vikt till räntedelen; aktie-/ränteandelen som valdes i första
  steget är låst. Bortplockade kategorier redovisas för användaren.
- Valdes ingen aktiekategori men aktieandelen är > 0 används en bred global
  aktiefond som kärna.

### 4.4 Fondval per slot

1. **Kategorifiltrering** – `SELECTION_FILTER` mappar varje `SelectionId` till
   ett filter på fondens `category`/`category_group` via `classifyFund()`.
   Klassificeringen sker live på kategoritexten i stället för på den lagrade
   `selection_id`-kolumnen, eftersom kolumnen nollställs av
   fonduppdateringens upsertar. Stilarna (growth/value/smallcap) använder
   `equity_style_box`, som korsar geografiska gränser.
2. **Förvaltningsfilter** – `passive` behåller bara indexfonder (`investment_type
   = INDEX` eller namn som innehåller index/msci/s&p/etf), `active` bara övriga,
   `mixed` allt. Blir poolen tom faller den tillbaka på ofiltrerat urval.
3. **Rankning** – samma viktning som analysens `absoluteScore`, plus en svag
   1-årskomponent:

   ```
   score = Sharpe(3 år) × 3
         + Avkastning(3 år) × 0,03
         + Avkastning(1 år) × 0,01
         − Avgift × 3
   ```

   Fonder helt utan nyckeltal används bara om poolen annars är tom. Bästa fonden
   tas, och samma ISIN kan inte återanvändas i en annan slot.
4. **Avrundning** – eventuell restvikt läggs på första fonden inom respektive
   tillgångsslag, aldrig över slagsgränsen.

Svaret innehåller portföljen, topp 6-kandidater per slot samt poolstatistik
(antal fonder, snitt-Sharpe, snittavgift, snittavkastning) så att gränssnittet
kan visa den valda fonden mot sin kategori. Motiveringstexterna beskriver
parametrarna — inte personen — och avgiftspåståenden hålls till sådant som går
att styrka mot vår egen fonddata (MFL 10 §, 18 §).

---

## 5. Fonddata från Avanza och Nordnet

### 5.1 Källor

**Avanza** – `POST https://www.avanza.se/_api/fund-guide/list`, paginerad 20
fonder per sida, 5–8 sidor parallellt. Ger namn, ISIN, kategori, fondtyp,
avkastning YTD/1/3/5 år, standardavvikelse, **Sharpe 3 år**, totalavgift,
förvaltningsavgift, ESG-poäng och förvaltningstyp.

**Nordnet** – `GET https://www.nordnet.se/api/2/instrument_search/query/fundlist`,
100 per sida. Ger namn, ISIN, fondtyp, Morningstar-kategori, avgifter och
avkastning — **men ingen Sharpe eller standardavvikelse**. De hämtas vid behov
per fond från `api.prod.nntech.io/instrument-screening/v2/mutual-funds/web/<slug>`
(`fetchNordnetDetail`), vilket sker lat: första gången en Nordnet-exklusiv fond
analyseras, varefter värdena cachas i `funds`.

### 5.2 Normalisering

Fondtyp mappas till `category_group` (Equity, Fixed Income, Allocation,
Alternative, Money Market, Other).

Nordnets engelska Morningstar-kategorier översätts till Avanzas svenska
vokabulär, så att peer-jämförelser och bytesförslag fungerar över båda
plattformarna. Tre steg i prioritetsordning:

1. **Statisk karta** (`NN_CATEGORY_TO_AVANZA`, ~60 poster):
   "Global Equity Large Cap" → "Global, Mix bolag" osv.
2. **Dynamisk korsreferens** – för fonder som finns på båda plattformarna
   (samma ISIN) röstas Nordnet-kategorin ihop med Avanza-kategorin, majoritet
   vinner. Fångar kategorier som inte finns i den statiska kartan utan att en
   enstaka avvikare förstör mappningen.
3. **Namnförfining** (`refineCategory`) – innehåller fondnamnet ett mer precist
   land/region än kategorin anger vinner namnet. "Nordnet Sverige Index" har
   Morningstar-kategorin "Europe Equity Large Cap" men klassas som Sverige.

### 5.3 Skrivning till databasen

- **Avanza** skrivs till `funds` (upsert på ISIN) och till `avanza_offerings`.
- **Nordnet** skrivs till `funds` **endast för ISIN som inte finns hos Avanza** —
  Avanzas rader är rikare och får inte skrivas över. Hela utbudet skrivs dock
  till `nordnet_offerings` inklusive `display_slug`.
- `selection_id` utesluts ur upsertarna för att inte radera klassificeringen
  från `scripts/classify-funds.ts`. (Byggaren klassificerar ändå live, se § 4.4.)
- `fetched_at` sätts till körningens tidpunkt för hela batchen. Batchstorlek 500.

### 5.4 Schemaläggning

Definierad i [vercel.json](vercel.json):

| Jobb | Schema (UTC) | Frekvens |
|---|---|---|
| `/api/cron/refresh-funds` | `0 3 * * 1` | Måndagar kl. 03:00 |
| `/api/cron/check-portfolios` | `0 8 * * *` | Dagligen kl. 08:00 |

Båda kräver `Authorization: Bearer $CRON_SECRET`; utan rätt header svarar de 401.

`refresh-funds` anropar `fetchAvanzaFunds({ force: true })` och
`fetchNordnetFunds({ force: true })` — `force` går förbi cachekontrollen och
hämtar alltid färsk data. Fel per källa fångas var för sig, så att ett trasigt
Nordnet-anrop inte hindrar Avanza-uppdateringen. Jobbet loggar den resulterande
fonddataversionen så att de två cron-körningarna går att para ihop vid
felsökning.

**Manuell körning:** `npm run refresh-funds` kör
[scripts/refresh-funds.mjs](scripts/refresh-funds.mjs) (samma hämtnings- och
normaliseringslogik) följt av `scripts/classify-funds.ts`.

**Läscache:** utanför cron-körningen läser `fetchAvanzaFunds` /
`fetchNordnetFunds` från Supabase så länge `fetched_at` i offerings-tabellen är
yngre än **30 dagar**. Cachen är alltså en säkerhetsspärr mot att sidvisningar
börjar skrapa Avanza/Nordnet — den normala färskheten sätts av det veckovisa
cron-jobbet, inte av TTL:en.

**Datafärskhet i gränssnittet:** noten på sajten visar den **äldsta** källans
senaste uppdatering ([lib/freshness.ts](lib/freshness.ts)). Skulle en källa
misslyckas får noten aldrig påstå färskare data än den fonderna faktiskt har.

---

## 6. Portföljbevakningen

Bevakningen körs för sparade portföljer och mejlar användaren när betyget
försämrats mer än tröskeln. Logiken är uppdelad så att beslutsreglerna
([lib/portfolio-watch.ts](lib/portfolio-watch.ts)) är helt fria från I/O och
databaslagret ligger bakom ett `WatchStore`-gränssnitt
([lib/portfolio-watch-store.ts](lib/portfolio-watch-store.ts)) — hela kedjan går
att testa utan databas eller riktiga utskick.

### 6.1 När den körs

**Dagligen kl. 08:00 UTC** (`/api/cron/check-portfolios`).

Att den körs dagligen fastän fonddatan bara uppdateras på måndagar är
avsiktligt. Körningen gate:ar på **fonddataversionen** = `max(funds.fetched_at)`.
Portföljer vars `last_checked_fund_version` redan matchar den aktuella versionen
hoppas över. Alla dagar utom måndag blir därmed nästan gratis, samtidigt som
körningen är robust mot att måndagens jobb misslyckas eller blir försenat.

Två separata cron-jobb, inte ett kedjat: fonduppdateringen får fem timmars
marginal innan kontrollen börjar, och eftersom kontrollen ändå gate:ar på
versionen kan en körning mot halvuppdaterad data bara leda till att arbetet görs
om nästa dag mot den kompletta versionen — aldrig till dubbla mejl.

**Tidsbudget:** `maxDuration = 60` sekunder på funktionen och en egen budget på
**45 sekunder** i körningen. När budgeten passerats startas inga fler batchar och
återstoden rapporteras som `remaining` — nästa dagliga körning tar vid där den
förra slutade, eftersom körningen är idempotent.

### 6.2 Körningen steg för steg

**Förberedelse**

1. Hämta fonddataversionen. Saknas den avbryts hela körningen — utan version går
   det inte att avgöra vad som redan behandlats, och att köra ändå skulle kunna
   mejla samma förändring om och om igen.
2. Hämta alla portföljer och filtrera bort dem som redan kontrollerats mot den
   här versionen.
3. Hämta notisinställningar för de berörda användarna. **Saknad rad = avslaget**
   (opt-in).
4. Fondunderlaget hämtas **en gång per depå**, inte per portfölj. Det är löftet
   som cachas, inte resultatet — portföljerna i en batch körs parallellt och med
   ett resultatcache hade alla sett en tom cache och startat var sin hämtning.

**Per portfölj** (batchar om 5, parallellt inom batchen, egen felhantering per
portfölj så att en trasig portfölj aldrig stoppar resten):

1. Portföljer utan innehav hoppas över.
2. **Analysera om mot aktuell fonddata** via samma `analyzePortfolioEntries` som
   sajten. Detta är hela poängen: tidigare räknades betyget om på portföljens
   sparade analys-snapshot, vilket gjorde att betyget aldrig kunde ändras när
   fonddatan gjorde det.
3. Beräkna nytt betyg och bygg ett kompakt jämförelseunderlag
   (`buildMetricsSnapshot`): portföljnivåns nyckeltal, antal diversifierade
   kategorier, antal innehav utan fonddata, samt Sharpe/avkastning/avgift **per
   ISIN**. Underlaget innehåller varken namn, belopp eller persondata.
4. **Skriv historikraden först.** Unikt index på `(portfolio_id,
   fund_data_version)` gör insert till körningens idempotensspärr — en omkörning
   stoppas här och når aldrig utskicket (`23505` → `already-processed`).
5. Spara ny analys, betyg, delpoäng, `last_checked_at` och
   `last_checked_fund_version` på portföljen. `updated_at` lämnas orört: det
   speglar när *användaren* senast ändrade portföljen.
6. Fatta notifieringsbeslut och köa vid behov.

**Utskick** sker i ett andra steg, grupperat per användare (§ 6.5).

### 6.3 Notifieringsbeslutet

`decideNotification()` returnerar exakt ett utfall, i den här ordningen:

| Utfall | Villkor |
|---|---|
| `baseline` | Inget tidigare betyg finns — bara en baslinje sparas, aldrig mejl |
| `improved` | Nytt betyg högre än förra kontrollen |
| `unchanged` | Fallet mot baslinjen är ≤ 0,005 |
| `below-threshold` | Fallet är mindre än tröskeln |
| `alerts-disabled` | Skulle ha mejlats, men användaren har inte tackat ja |
| `already-notified` | Exakt samma nya betyg har redan mejlats |
| `notify` | Mejla |

**Tröskeln** är `PORTFOLIO_SCORE_DROP_THRESHOLD`, standard **0,5 poäng** på
0–10-skalan. Ogiltiga eller icke-positiva värden faller tillbaka på
standardvärdet i stället för att tysta all bevakning.

**Baslinjen** är `max(föregående betyg, senast mejlade betyg)`. Utan det skulle
en portfölj kunna glida nedåt i steg strax under tröskeln — 8,0 → 7,6 → 7,2 →
6,8 — utan att ett enda steg räknas som en försämring, trots att användaren
tappat långt över tröskeln sedan förra beskedet.

Inställningen kontrolleras *efter* tröskeln, så att loggen skiljer på "inget att
rapportera" och "hade rapporterats om användaren ville".

### 6.4 Orsakshärledning

`deriveChangeReasons()` jämför föregående och nytt underlag och formulerar
**max 3** meningar. Formuleringarna beskriver vad som förändrats i datan och
innehåller medvetet ingen uppmaning att köpa, sälja eller byta något.

Kandidater, med minsta rörelse som räknas som verklig förändring:

| Orsak | Tröskel |
|---|---|
| Viktad Sharpe har sjunkit | ≥ 0,05 |
| Viktad 3-årsavkastning har sjunkit | ≥ 0,5 procentenheter |
| Viktad avgift har ökat | ≥ 0,02 procentenheter |
| Antal fonder med lägre Sharpe än förra kontrollen | ≥ 1 fond, ≥ 0,05 |
| Färre kategorier över 5 % vikt | valfri minskning |
| Fler innehav med saknad/inaktuell fonddata | valfri ökning |

**Urvalet styrs av delpoängen.** Finns `scoreComponents` i båda underlagen
plockas först de betygsdimensioner som bevisligen sjunkit, störst fall först.
Har dimensionen en detaljerad mening används den; annars en generisk ("Portföljens
avgiftsnivå väger nu ned betyget mer än vid förra kontrollen") — det inträffar
t.ex. när avgiften kryssat en poängtröskel med några hundradelar. Det är den
mekanismen som garanterar att ett mejl om ett betygsfall aldrig går ut utan en
förklaring till just det fallet. Orsaker utan egen betygsdimension
(eftersläpande fonder, saknad fonddata) läggs under som komplement.

Äldre historikrader saknar `scoreComponents`; då gäller ren
nyckeltalsjämförelse, sorterad på intern vikt.

### 6.5 Utskicket

Ett mejl går till **en användare, inte en portfölj**. Har flera av användarens
portföljer försämrats i samma körning skickas ett samlat mejl med listvarianten
i stället för tre separata.

- **Avsändare:** `Sharpa Portföljbevakning <bevakning@sharpa.se>` via Resend
  (`RESEND_FROM_PORTFOLIO_ALERTS` kan ändra det). Resend-konfigurationen i
  Supabase används bara för autentiseringsmejl; notiser går direkt mot Resends
  API med en egen nyckel som bara har sending access.
- **Ämnesrad:** `Din portfölj "<namn>" har förändrats` respektive
  `<N> av dina portföljer har förändrats`.
- **Innehåll:** gammalt och nytt betyg, förändringen i poäng, orsakerna,
  datum för kontrollen, samt länk till Mina portföljer ankrad på portföljen
  (`/portfolios#p-<id>`) — inte till analysvyn, som kräver en omkörning innan
  något syns.
- **Idempotens:** en nyckel byggd av portfölj-id, betygen och fonddataversionen
  skickas som Resends `Idempotency-Key`. Två körningar mot samma fonddata som
  kommer fram till samma förändring ger samma nyckel och därmed bara ett mejl,
  även om databasuppdateringen skulle misslyckas mellan sändning och bokföring.
  Flervarianten sorterar portföljerna så att nyckeln inte beror på i vilken
  ordning batcharna blev klara.
- **Avregistrering:** RFC 8058 one-click unsubscribe plus länk i sidfoten.
  Länken bär en HMAC-signerad token (`LINK_SECRET`, egen kontextsträng, 90
  dagars giltighet) i stället för ett oskyddat user-id
  ([lib/unsubscribe-token.ts](lib/unsubscribe-token.ts)).
- **Bokföring:** `score_notified_at`, `last_notification_score` och
  `last_notification_message_id` sätts **först efter att Resend accepterat**
  meddelandet. Ett överhoppat utskick (testläge, saknad nyckel) räknas aldrig som
  skickat — annars skulle en riktig försämring aldrig mejlas när nyckeln väl
  finns. Misslyckat utskick sätter bara status `failed`, så att nästa körning
  försöker igen.

Sändning är avstängd när `NODE_ENV=test`, under Vitest, när
`EMAIL_DRY_RUN=true`, eller när `RESEND_API_KEY` saknas.

### 6.6 Samtycke

Bevakningsmejl kräver aktivt samtycke. Förvalt påslagna utskick är inget giltigt
samtycke (GDPR art. 4.11, skäl 32), och e-post till fysiska personer kräver
föregående samtycke enligt 19 § marknadsföringslagen (2008:486). Därför:

- `notification_preferences.email_score_alerts` har `DEFAULT FALSE`
  (migration `supabase/migrations/20260803_000_opt_in_alerts.sql`).
- **Saknad rad behandlas som avslag** i både API:t och cron-jobbet.
- Användaren tar ställning i sparaformuläret (`POST /api/portfolios`,
  fältet `emailScoreAlerts`) och kan när som helst ändra på `/account#notiser`
  (`PUT /api/notification-preferences`) eller via avregistreringslänken.
  Inställningen skrivs bara när ett värde faktiskt skickats med, så att andra
  vägar in inte tyst ändrar ett tidigare val.

### 6.7 Loggning och integritet

Körningen loggar bara aggregat: antal kontrollerade, uppdaterade, förbättrade,
försämrade, mejlade, överhoppade och misslyckade, antal per beslutsutfall, samt
fonddataversionen. Vid fel loggas portfölj-id (inte persondata). Varken
e-postadresser, portföljnamn eller innehav skrivs till loggen.
`portfolio-watch-store.ts` är märkt `server-only`, så en oavsiktlig klientimport
av service role-nyckeln blir ett byggfel.

---

## 7. Miljövariabler som styr beteendet

| Variabel | Effekt |
|---|---|
| `CRON_SECRET` | Krävs som `Bearer`-token för båda cron-endpointsen |
| `PORTFOLIO_SCORE_DROP_THRESHOLD` | Betygsfall som utlöser mejl (standard 0,5) |
| `RESEND_API_KEY` | Utan den skickas inga mejl (räknas som "skipped") |
| `RESEND_FROM_PORTFOLIO_ALERTS` | Avsändaradress för notiser |
| `EMAIL_DRY_RUN=true` | Stänger av sändning utan att ändra logiken |
| `LINK_SECRET` | Signerar avregistrerings- och rapportlänkar |
| `NEXT_PUBLIC_SITE_URL` | Basadress i mejlens länkar (standard `https://sharpa.se`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role för cron och fonduppdatering |

---

## 8. Sammanfattande tidslinje

```
Måndag 03:00 UTC   refresh-funds
                   → Avanza (~alla fonder) + Nordnet-exklusiva → funds
                   → ny fetched_at = ny fonddataversion

Måndag 08:00 UTC   check-portfolios
                   → versionen har ändrats → alla portföljer analyseras om
                   → betyg + historik uppdateras
                   → betygsfall ≥ 0,5 och samtycke → ett mejl per användare
                   → tidsbudget 45 s; återstoden tas tisdag

Tis–sön 08:00 UTC  check-portfolios
                   → versionen oförändrad → allt hoppas över (billig körning)
                   → utom eventuell återstod från måndagen
```
