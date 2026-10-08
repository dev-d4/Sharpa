// Svensk → engelsk ordbok för hela den publika sajten.
//
// SiteTranslator slår upp varje textnod och attribut här. Nycklarna är exakt
// den svenska texten med normaliserade mellanslag (radbrytningar i JSX blir ett
// mellanslag). Fondnamn, bolagsnamn och användardata står medvetet utanför —
// de får aldrig översättas.
//
// Lägg nya strängar i rätt avsnitt så att listan går att underhålla.

export const EN: Record<string, string> = {
  // ---------------------------------------------------------------- Navigation
  "Analysera mina fonder": "Analyse my funds",
  "Skapa portföljexempel": "Create a sample portfolio",
  "Bygg ett portföljexempel": "Build a sample portfolio",
  "Bygg din fondportfölj — gratis": "Build your fund portfolio — free",
  "Bygg din portfölj – Sharpa": "Build your portfolio – Sharpa",
  "Huvudnavigering": "Main navigation",
  "Mobilnavigering": "Mobile navigation",
  "Öppna meny": "Open menu",
  "Stäng meny": "Close menu",
  "Kontomeny": "Account menu",
  "Välj språk": "Choose language",
  "Svenska": "Swedish",
  "Engelska": "English",
  "Mina portföljer": "My portfolios",
  "Mitt konto": "My account",
  "Logga in": "Log in",
  "Logga ut": "Log out",
  "Kontakta oss": "Contact us",
  "Läs mer": "Read more",
  "Mer information": "More information",
  "Tillbaka": "Back",
  "Tillbaka till startsidan": "Back to the home page",
  "Tillbaka till översikten": "Back to the overview",
  "Fortsätt": "Continue",
  "Klar": "Done",
  "Stäng": "Close",
  "Spara": "Save",
  "Ändra namn": "Rename",
  "Börja om": "Start over",
  "Kom igång": "Get started",
  "Försök igen": "Try again",
  "Förstått": "Got it",
  "Hoppa över för nu": "Skip for now",
  "Generera om": "Regenerate",
  "Skriv över": "Overwrite",
  "Rensa alla": "Clear all",
  "Rensa sökning": "Clear search",
  "Ny sökning": "New search",
  "+ Ny portfölj": "+ New portfolio",
  "Ny portfölj": "New portfolio",
  "+ Lägg till": "+ Add",

  // ------------------------------------------------------------------ Landning
  "Sharpa – Hur bra är dina fonder egentligen?": "Sharpa – How good are your funds, really?",
  "Sharpa – Jämför dina fonder gratis": "Sharpa – Compare your funds for free",
  "Sök upp dina fonder och se på 2 minuter hur de står sig mot liknande fonder utifrån avgift, avkastning och risk. Gratis och oberoende.":
    "Look up your funds and see in 2 minutes how they compare with similar funds on fees, returns and risk. Free and independent.",
  "Analysera dina fonder gratis. Spara sedan portföljen så håller vi koll på betyget och mejlar dig vid en tydlig försämring.":
    "Analyse your funds for free. Save your portfolio and we will monitor its score and email you if it clearly deteriorates.",
  "01 · Analysera": "01 · Analyse",
  "02 · Bygg": "02 · Build",
  "Har du redan fonder? Se avgifter, risk och bättre alternativ åt dig.":
    "Already have funds? See fees, risk and better alternatives for you.",
  "Börjar du från noll? Svara på 4 frågor så tar vi fram ett förslag.":
    "Starting from scratch? Answer 4 questions and we will put together a suggestion.",
  "Jämför avgift, avkastning och risk mot liknande fonder och få ett tydligt betyg.":
    "Compare fees, returns and risk with similar funds and get a clear score.",
  "Svara på fyra frågor och se ett illustrativt exempel anpassat efter din risknivå.":
    "Answer four questions and see an illustrative example tailored to your risk level.",
  "Se hur dina fonder står sig": "See how your funds measure up",
  "fonder analyserade": "funds analysed",
  "sparade portföljer": "saved portfolios",
  "portföljer byggda": "portfolios built",
  "Fonder analyserade": "Funds analysed",
  "i provision från fondbolag": "in commission from fund providers",
  "0 kr": "SEK 0",
  "0 kr i provision": "SEK 0 in commission",
  "Oberoende av fondbolag": "Independent of fund providers",
  "För företag och rådgivare": "For businesses and advisers",
  "Sharpa för professionell rådgivning": "Sharpa for professional advice",
  "Jämför fonder och portföljer och skapa transparenta underlag för kundmötet.":
    "Compare funds and portfolios and create transparent material for client meetings.",
  "Professionella verktyg — intresseanmälan": "Professional tools — enquiry",
  "Så fungerar jämförelsen": "How the comparison works",
  "Fonder jämförs utifrån avgift, historisk avkastning och risk — samma kriterier för alla fonder.":
    "Funds are compared by fees, historical returns and risk — using the same criteria for every fund.",

  // ------------------------------------------------------------------- Sökning
  "Sök fond": "Search for a fund",
  "Sök fond, t.ex.": "Search for a fund, e.g.",
  "Sök på fondnamn": "Search by fund name",
  "Sök på fondnamn eller ISIN": "Search by fund name or ISIN",
  "Sök på fondnamn eller ISIN…": "Search by fund name or ISIN…",
  "Sök på fondnamn eller ISIN för att lägga till fonder i din portfölj.":
    "Search by fund name or ISIN to add funds to your portfolio.",
  "Sök manuellt": "Search manually",
  "Sök själv, ladda upp en fil eller låt guiden hjälpa dig hitta fonder.":
    "Search yourself, upload a file or let the guide help you find funds.",
  "Sök och välj flera fonder utan att lämna portföljen.":
    "Search and select several funds without leaving the portfolio.",
  "Söker bland alla fonder…": "Searching all funds…",
  "Söker efter fonder": "Searching for funds",
  "Söker…": "Searching…",
  "Inga fonder hittades": "No funds found",
  "Hittades inte:": "Not found:",
  "Hittades ej i databasen": "Not found in the database",
  "Guidad sökning": "Guided search",
  "Senast använda": "Recently used",
  "Ta bort vald fond": "Remove selected fund",
  "Stäng listan med valda fonder": "Close the list of selected funds",
  "valda fonder": "selected funds",
  "Valda fonder": "Selected funds",
  "vald fond": "selected fund",
  "Välj fonder": "Select funds",
  "Lägg till fonder": "Add funds",
  "Lägg till eller ändra fonder": "Add or change funds",
  "Ändra fonder": "Change funds",
  "Prova att ta bort avgiftsgränsen eller byta marknad":
    "Try removing the fee limit or switching market",

  // ------------------------------------------------------------------- Analysen
  "Analysera min portfölj": "Analyse my portfolio",
  "Analysera portfölj": "Analyse portfolio",
  "Analysera portföljen": "Analyse the portfolio",
  "Analysera hela din portfölj": "Analyse your whole portfolio",
  "Analysera befintlig": "Analyse existing",
  "Analysera befintlig portfölj": "Analyse an existing portfolio",
  "Analyserar portfölj…": "Analysing portfolio…",
  "Bygger din portfölj…": "Building your portfolio…",
  "Beräknar avkastning och risk…": "Calculating returns and risk…",
  "Sammanställer analysen…": "Compiling the analysis…",
  "Hämtar analysdata…": "Loading analysis data…",
  "Hämtar fonddata…": "Loading fund data…",
  "Jämför med liknande alternativ…": "Comparing with similar alternatives…",
  "Beräknar scenario…": "Calculating scenario…",
  "Analys": "Analysis",
  "Analys per fond": "Analysis by fund",
  "Analyserad fond": "Analysed fund",
  "Ditt resultat": "Your result",
  "Din portfölj": "Your portfolio",
  "Nuvarande portfölj": "Current portfolio",
  "Befintlig portfölj": "Existing portfolio",
  "Portfölj": "Portfolio",
  "Portföljanalys": "Portfolio analysis",
  "Portföljbetyg": "Portfolio score",
  "Portföljdata": "Portfolio data",
  "Portföljinnehav": "Portfolio holdings",
  "Portföljexempel": "Sample portfolio",
  "Fondgranskning": "Fund review",
  "Fondguide": "Fund guide",
  "Fondinnehav": "Fund holdings",
  "Fond": "Fund",
  "fond": "fund",
  "fonder": "funds",
  "dina fonder": "your funds",
  "Fonder i exemplet": "Funds in the example",
  "Fondens namn.": "The fund's name.",
  "Kort sammanfattning": "Brief summary",
  "Sammanfattning": "Summary",
  "Nyckeltal": "Key figures",
  "Styrkor": "Strengths",
  "Förbättringsområden": "Areas for improvement",
  "Inga tydliga styrkor utmärker sig.": "No clear strengths stand out.",
  "Inget som sticker ut som svagt.": "Nothing stands out as weak.",
  "Visa detaljerad analys": "Show detailed analysis",
  "Dölj detaljerad analys": "Hide detailed analysis",
  "Visa innehav och nyckeltal": "Show holdings and key figures",
  "Dölj innehav och nyckeltal": "Hide holdings and key figures",
  "Visa jämförelse": "Show comparison",
  "Dölj jämförelse": "Hide comparison",
  "Visa färre jämförelser": "Show fewer comparisons",
  "Visa alla förslag": "Show all suggestions",
  "Dölj fondalternativ": "Hide fund alternatives",
  "Dölj avancerade val": "Hide advanced options",
  "Visa alla avgiftsnivåer": "Show all fee levels",
  "Visa alla förvaltningsstilar": "Show all management styles",
  "Bra att veta": "Good to know",
  "Visas bara som information.": "Shown for information only.",

  // ------------------------------------------------------------------ Nyckeltal
  "Avgift": "Fee",
  "Avgifter": "Fees",
  "Avgift / år": "Fee / year",
  "Avgift per år": "Annual fee",
  "Avgift i %": "Fee in %",
  "Avgift:": "Fee:",
  "Avgiftsräknare": "Fee calculator",
  "Avgiftsräknare i kronor": "Fee calculator in kronor",
  "Avgiftsskillnad": "Fee difference",
  "Låg avgift": "Low fee",
  "Hög avgift": "High fee",
  "Lägst avgift": "Lowest fee",
  "Lägst avgift, följer marknaden passivt": "Lowest fee, tracks the market passively",
  "Maximal avgift?": "Maximum fee?",
  "Prisvärd nivå": "Good value",
  "Riktigt billiga fonder": "Really cheap funds",
  "Ingen gräns": "No limit",
  "Beräknad utifrån redovisad avgift": "Calculated from the reported fee",
  "Avkastning": "Return",
  "Avkastning 1 mån": "1-month return",
  "Avkastning 3 mån": "3-month return",
  "Avkastning 6 mån": "6-month return",
  "Avkastning 1 år": "1-year return",
  "Avkastning 3 år": "3-year return",
  "Avkastning 5 år": "5-year return",
  "Avkastning (3 år, ann.)": "Return (3 years, annualised)",
  "Avkastning i förhållande till risk": "Return relative to risk",
  "Avkastning i förhållande till risk. Högre är bättre.":
    "Return relative to risk. Higher is better.",
  "Avkastningsskillnad": "Return difference",
  "Avk 1 år": "1y return",
  "Avk 3 år": "3y return",
  "1 år:": "1 year:",
  "3 år:": "3 years:",
  "3 år": "3 years",
  "1 år": "1 year",
  "15 år": "15 years",
  "senaste 12 mån": "last 12 months",
  "per år": "per year",
  "Netto per år": "Net per year",
  "Högst 3-årsavkastning": "Highest 3-year return",
  "Bäst historisk avkastning": "Best historical return",
  "Bäst riskjusterad avkastning": "Best risk-adjusted return",
  "Låg historisk avkastning": "Low historical return",
  "Baserat på 3-årsavkastning, annualiserad": "Based on 3-year return, annualised",
  "Baserat på 3-årsavkastning (annualiserad), exklusive avgifter. Historisk avkastning är ingen garanti för framtida resultat.":
    "Based on 3-year return (annualised), excluding fees. Past performance is no guarantee of future results.",
  "Risk": "Risk",
  "risk": "risk",
  "Låg": "Low",
  "Hög": "High",
  "Begränsad": "Limited",
  "Låg riskspridning": "Low diversification",
  "Sharpe 3 år": "Sharpe, 3 years",
  "Högre är bättre": "Higher is better",
  "Lägre är bättre": "Lower is better",
  "Vikt": "Weight",
  "vikt": "weight",
  "Vikt (%)": "Weight (%)",
  "Viktad": "Weighted",
  "Låg vikt": "Low weight",
  "Hög vikt": "High weight",
  "Lägre till högre vikt": "Lower to higher weight",
  "Enda valet — full vikt": "Only choice — full weight",
  "Totalt": "Total",
  "Belopp (kr)": "Amount (SEK)",
  "Belopp kr": "Amount SEK",
  "belopp": "amount",
  "Investerat belopp": "Amount invested",
  "Marknadsvärde": "Market value",
  "Marknadsvärde SEK": "Market value SEK",
  "marknadsvärde": "market value",
  "Värde": "Value",
  "värde": "value",
  "Värde (SEK)": "Value (SEK)",
  "Värde SEK": "Value SEK",
  "Namn": "Name",
  "namn": "name",
  "Typ": "Type",
  "kr": "SEK",
  "Beräknad effekt per år": "Estimated annual effect",
  "Uppskattad avkastning per år": "Estimated annual return",
  "Uppskattad vinst per år": "Estimated annual gain",
  "Beräknat på ett antaget sparkapital om 100 000 kr.":
    "Calculated on an assumed capital of SEK 100,000.",
  "(vid 100 000 kr)": "(on SEK 100,000)",
  "vid 100 000 kr investerat": "with SEK 100,000 invested",
  "Den genomsnittliga årliga avgiften viktat efter din fördelning.":
    "The average annual fee weighted by your allocation.",
  "Portföljens viktade avkastning de senaste 12 månaderna.":
    "The portfolio's weighted return over the last 12 months.",
  "Portföljens viktade totalavkastning de senaste 3 åren.":
    "The portfolio's weighted total return over the last 3 years.",
  "Vad kostar din portfölj?": "What does your portfolio cost?",

  // --------------------------------------------------------------- Omdömen mm.
  "Utmärkt": "Excellent",
  "Kan förbättras": "Could be improved",
  "Behöver ses över": "Needs review",
  "Förbättrad": "Improved",
  "Förbättring:": "Improvement:",
  "Ändring": "Change",
  "oförändrad": "unchanged",
  "försämrats": "deteriorated",
  "Inga": "None",
  "En bra grund med några förbättringsmöjligheter":
    "A solid base with some room for improvement",
  "Flera delar kan förbättras": "Several parts could be improved",
  "Fonden står sig bra i sin kategori": "The fund holds up well in its category",
  "Portföljen har tydliga svagheter i jämförelsen":
    "The portfolio has clear weaknesses in the comparison",
  "Portföljen har historiskt fått bra betalt för risken":
    "Historically the portfolio has been well rewarded for its risk",
  "Portföljen har historiskt fått svagt betalt för risken":
    "Historically the portfolio has been poorly rewarded for its risk",
  "Portföljen är spridd över flera fondkategorier.":
    "The portfolio is spread across several fund categories.",
  "En större del är samlad i få fondkategorier.":
    "A larger share is concentrated in a few fund categories.",
  "Avgifterna är generellt låga i portföljen.":
    "Fees are generally low across the portfolio.",
  "Historiken är varken tydligt stark eller svag.":
    "The track record is neither clearly strong nor clearly weak.",
  "Underlaget räcker inte för en bedömning.":
    "There is not enough data for an assessment.",
  "Vi har inte tillräckligt med data för att ge fonden ett tydligt omdöme.":
    "We do not have enough data to give this fund a clear assessment.",
  "Vi kan inte bedöma portföljens avgiftsnivå.":
    "We cannot assess the portfolio's fee level.",
  "Vi kan inte bedöma spridningen mellan kategorier.":
    "We cannot assess the spread between categories.",
  "den når inte riktigt upp till de bästa i sin kategori":
    "it does not quite reach the best in its category",
  "avkastningen har varit svagare än de bästa i kategorin":
    "returns have been weaker than the best in the category",
  "avkastningen i förhållande till risken når inte upp till de bästa i kategorin":
    "return relative to risk does not reach the best in the category",
  "högre historisk avkastning": "higher historical return",
  "lägre avgift": "lower fee",
  "inget slår den": "nothing beats it",
  "redan bäst": "already best",
  "Starkare helhet i jämförelsen när vi väger samman avgift, avkastning och risk.":
    "A stronger overall result when fees, returns and risk are considered together.",
  "Inget av de tre viktigaste områdena sticker ut som tydligt svagt i jämförelsen.":
    "None of the three key areas stands out as clearly weak in the comparison.",
  "Den sticker inte ut som bäst i sin kategori, men vi hittar inget tydligt starkare alternativ just nu.":
    "It does not stand out as the best in its category, but we cannot find a clearly stronger alternative right now.",
  "Vi hittar inget alternativ som tydligt slår den just nu.":
    "We cannot find an alternative that clearly beats it right now.",

  // ------------------------------------------------------------------ Jämförelse
  "Jämförelse": "Comparison",
  "Historisk jämförelse": "Historical comparison",
  "Medtagna i jämförelsen": "Included in the comparison",
  "Alternativ": "Alternative",
  "Alternativ fond": "Alternative fund",
  "Alternativa fonder": "Alternative funds",
  "Nuvarande fond": "Current fund",
  "Jämförbar fond": "Comparable fund",
  "Jämförbara alternativ": "Comparable alternatives",
  "Jämförbart alternativ": "Comparable alternative",
  "Redan bäst i sin kategori": "Already best in its category",
  "Redan bäst i sina kategorier": "Already best in their categories",
  "Redan i din portfölj": "Already in your portfolio",
  "Inlagd i portföljen": "Added to the portfolio",
  "Inga bättre fondalternativ hittades": "No better fund alternatives found",
  "Inga fonder att jämföra": "No funds to compare",
  "Ersätter": "Replaces",
  "Föregående fond": "Previous fund",
  "Nästa fond": "Next fund",
  "Öka i befintlig fond": "Increase an existing fund",
  "Lägg in den jämförbara fonden i din portfölj":
    "Add the comparable fund to your portfolio",
  "Byt fond under fondnamnet för att se nästa alternativ i samma kategori.":
    "Switch fund below the fund name to see the next alternative in the same category.",
  "Använd pilarna för att bläddra mellan alternativen i samma kategori. Ordningen följer vår sortering på avgift, historisk avkastning och Sharpe — den är inte ett omdöme om vilken fond som är bäst för dig.":
    "Use the arrows to browse alternatives in the same category. The order follows our ranking on fee, historical return and Sharpe — it is not a judgement about which fund is best for you.",
  "Fonder som har starkare historiska nyckeltal enligt samma generella jämförelsekriterier.":
    "Funds with stronger historical key figures according to the same general comparison criteria.",
  "Nyckeltal om innehaven byttes mot de jämförbara alternativen.":
    "Key figures if the holdings were swapped for the comparable alternatives.",
  "Två fonder har tappat mot jämförbara fonder.":
    "Two funds have lost ground against comparable funds.",
  "Logga in för att se jämförbara fondalternativ":
    "Log in to see comparable fund alternatives",

  // ------------------------------------------------------------ Fördelning m.m.
  "Tillgångsslag": "Asset class",
  "Tillgångsfördelning": "Asset allocation",
  "Fördelning": "Allocation",
  "Fördelning i exemplet": "Allocation in the example",
  "Justera fördelning": "Adjust allocation",
  "Fördela mellan kategorierna": "Allocate between categories",
  "Fördela jämnt": "Allocate equally",
  "fördela jämnt": "allocate equally",
  "Kategori": "Category",
  "Kategorier": "Categories",
  "kategori väger": "category weighs",
  "kategorier väger": "categories weigh",
  "Föreslagna kategorier": "Suggested categories",
  "Kategorier för den valda risknivån": "Categories for the selected risk level",
  "Kategorierna nedan matchar den valda risknivån. Behåll dem eller välj egna.":
    "The categories below match the selected risk level. Keep them or choose your own.",
  "Välj de kategorier du vill ha med. De markerade kategorierna ingår redan i förslaget.":
    "Select the categories you want to include. The highlighted ones are already part of the suggestion.",
  "Välj om varje kategori ska få hög, medelstor eller låg vikt":
    "Choose whether each category should have a high, medium or low weight",
  "* Baseras på fondkategori, inte underliggande innehav.":
    "* Based on fund category, not underlying holdings.",
  "* Fördelningen visas på fondnivå och baseras på fondkategori, inte underliggande innehav.":
    "* The allocation is shown at fund level and is based on fund category, not underlying holdings.",
  "* Fördelning baseras på fondkategori, inte underliggande innehav.":
    "* Allocation is based on fund category, not underlying holdings.",
  "Branscher, stil & räntor": "Sectors, style & fixed income",
  "Kärna": "Core",
  "Stabiliserar portföljen": "Stabilises the portfolio",

  // ----------------------------------------------------------- Kategorinamn m.m.
  "Aktier": "Equities",
  "Räntor": "Fixed income",
  "Kassa": "Cash",
  "Övrigt": "Other",
  "övrigt": "other",
  "Räntefond": "Fixed income fund",
  "Räntefonder": "Fixed income funds",
  "Sv. räntor": "Swedish fixed income",
  "Gl. räntor": "Global fixed income",
  "Svenska räntor": "Swedish fixed income",
  "Globala räntor": "Global fixed income",
  "High yield-räntor": "High yield bonds",
  "Högrisk-obligationer med högre avkastning": "High-risk bonds with higher returns",
  "SEK-obligationer — lägst valutarisk": "SEK bonds — lowest currency risk",
  "Euro- och globala obligationer": "Euro and global bonds",
  "Obligationer och penningmarknad": "Bonds and money market",
  "Svenska börsen": "The Swedish stock market",
  "Europeiska börser": "European stock markets",
  "Kinesiska aktier och Hongkong": "Chinese equities and Hong Kong",
  "Brasilien, Mexico och övriga Latinamerika": "Brazil, Mexico and the rest of Latin America",
  "Sverige, Norge, Danmark och Finland": "Sweden, Norway, Denmark and Finland",
  "Afrika och Mellanöstern": "Africa and the Middle East",
  "Tillväxtmarknader": "Emerging markets",
  "Exponering mot tillväxtmarknader": "Exposure to emerging markets",
  "Snabbväxande ekonomier globalt": "Fast-growing economies globally",
  "En av världens snabbast växande ekonomier": "One of the world's fastest growing economies",
  "Bred exponering mot hela världsmarknaden": "Broad exposure to the entire world market",
  "Småbolag": "Small caps",
  "Mindre bolag med högre tillväxtpotential": "Smaller companies with higher growth potential",
  "Tillväxt": "Growth",
  "Tillväxtaktier": "Growth stocks",
  "Tillväxtbolag": "Growth companies",
  "Bolag med hög förväntad vinsttillväxt": "Companies with high expected earnings growth",
  "Värdeaktier": "Value stocks",
  "Undervärderade bolag med stabila kassaflöden": "Undervalued companies with stable cash flows",
  "Teknik- och IT-sektor": "Technology and IT sector",
  "IT, mjukvara, hårdvara och halvledare": "IT, software, hardware and semiconductors",
  "Hälsa & biotech": "Health & biotech",
  "Hälsovård": "Healthcare",
  "Hälsovård och läkemedel": "Healthcare and pharmaceuticals",
  "Läkemedel, biotech och medicinteknik": "Pharmaceuticals, biotech and medtech",
  "Energi & råvaror": "Energy & commodities",
  "Energi och råvaror": "Energy and commodities",
  "Olja, gas och förnybar energi": "Oil, gas and renewable energy",
  "Finans- och banksektorn": "Financial and banking sector",
  "Banker, försäkring och fintech": "Banks, insurance and fintech",
  "Fastighetsbolag och REIT": "Real estate companies and REITs",
  "Industri och tillverkning": "Industrials and manufacturing",
  "Tillverkningsindustri och infrastruktur": "Manufacturing industry and infrastructure",
  "Detaljhandel och konsumtionsvaror": "Retail and consumer goods",
  "Konsumentvaror och detaljhandel": "Consumer goods and retail",
  "Hedgefonder och råvaror": "Hedge funds and commodities",
  "Blandning av aktier och räntor": "A mix of equities and fixed income",
  "Investerar i börsnoterade bolag": "Invests in listed companies",
  "börshandlad fond": "exchange-traded fund",
  "Värdepapper": "Security",
  "värdepapper": "security",
  "värdepapperstyp": "security type",
  "depå": "brokerage account",
  "Depå": "Brokerage account",
  "din depå": "your brokerage account",

  // ---------------------------------------------------------------- Förvaltning
  "Förvaltning": "Management",
  "Förvaltning:": "Management:",
  "Förvaltningsstil": "Management style",
  "Förvaltningsstil?": "Management style?",
  "Aktiv eller passiv förvaltning?": "Active or passive management?",
  "Aktivt förvaltad": "Actively managed",
  "Aktivt förvaltade": "Actively managed",
  "aktivt förvaltade fonder": "actively managed funds",
  "Inkluderar aktiva fonder": "Includes active funds",
  "Fondförvaltare väljer placeringar": "A fund manager picks the investments",
  "Förvaltaren väljer aktivt vilka aktier som köps":
    "The manager actively chooses which shares to buy",
  "Följer ett index, låg avgift": "Tracks an index, low fee",
  "Indexfonder har generellt lägre avgifter": "Index funds generally have lower fees",
  "Mix av passiva indexfonder och aktiva fonder":
    "A mix of passive index funds and active funds",
  "Spelar ingen roll": "Doesn't matter",
  "Vad prioriterar du?": "What do you prioritise?",
  "Vilken typ av fond?": "What type of fund?",
  "Vad ska exemplet innehålla?": "What should the example contain?",
  "Välj minst ett alternativ": "Select at least one option",
  "Välj vad du vill göra": "Choose what you want to do",
  "Välj det som passar dig. Du kan alltid göra det andra sen.":
    "Pick the one that suits you. You can always do the other later.",

  // --------------------------------------------------------------- Risknivåer
  "Vald risknivå": "Selected risk level",
  "Vald risknivå:": "Selected risk level:",
  "Vilken risknivå vill du se ett exempel för?":
    "Which risk level would you like to see an example for?",
  "Högre risk = större andel aktier och större svängningar":
    "Higher risk = a larger share of equities and bigger swings",
  "Lägre risk och volatilitet": "Lower risk and volatility",
  "1 — Låg": "1 — Low",
  "2 — Medellåg": "2 — Medium-low",
  "3 — Medelhög": "3 — Medium-high",
  "4 — Hög": "4 — High",
  "5 — Mycket hög": "5 — Very high",
  "Försiktig": "Cautious",
  "I linje med din profil": "In line with your profile",
  "Din profil ger…": "Your profile gives…",
  "Mer defensiv än din profil": "More defensive than your profile",
  "Lite mer defensiv än din profil": "Slightly more defensive than your profile",
  "Mer offensiv än din profil": "More aggressive than your profile",
  "Lite mer offensiv än din profil": "Slightly more aggressive than your profile",
  "Risknivå 1 (Försiktig): tyngdpunkt på räntor med en mindre kärna av globala aktier.":
    "Risk level 1 (Cautious): weighted towards fixed income with a small core of global equities.",
  "Risknivå 2 (Defensiv): övervikt mot räntor kombinerat med globala och svenska aktier som kärna.":
    "Risk level 2 (Defensive): overweight fixed income combined with global and Swedish equities as the core.",
  "Risknivå 3 (Balanserad): 60% aktier och 40% räntor — global aktieexponering som kärna, svenska aktier som hemmamarknad och en räntedel som buffert.":
    "Risk level 3 (Balanced): 60% equities and 40% fixed income — global equity exposure as the core, Swedish equities as the home market and a fixed income part as a buffer.",
  "Risknivå 4 (Tillväxt): aktiestark fördelning med global spridning, USA och Sverige som tyngdpunkt samt tillväxtmarknader.":
    "Risk level 4 (Growth): equity-heavy allocation with global spread, weighted towards the US and Sweden plus emerging markets.",
  "Risknivå 5 (Offensiv): enbart aktier — bred global och amerikansk exponering med teknik och tillväxtmarknader. Störst kursrörelser.":
    "Risk level 5 (Aggressive): equities only — broad global and US exposure with technology and emerging markets. The largest price movements.",

  // ------------------------------------------------------------------- Byggaren
  "Skapa ett portföljexempel": "Create a sample portfolio",
  "Skapa exempel": "Create an example",
  "Bygg en ny portfölj": "Build a new portfolio",
  "Bygg din första portfölj": "Build your first portfolio",
  "Börja med ett portföljexempel": "Start with a sample portfolio",
  "Svara på några snabba frågor": "Answer a few quick questions",
  "Svara på 5 frågor och se ett illustrativt portföljexempel baserat på valda kriterier och historiska fondnyckeltal.":
    "Answer 5 questions and see an illustrative sample portfolio based on the criteria you choose and historical fund data.",
  "Bygg din första portfölj på 2 minuter — vi ställer 4 frågor och sätter ihop en komplett portfölj åt dig. Eller lägg in din befintliga portfölj, analysera den och spara den här.":
    "Build your first portfolio in 2 minutes — we ask 4 questions and put a complete portfolio together for you. Or enter your existing portfolio, analyse it and save it here.",
  "Ett exempel — inte en rekommendation": "An example — not a recommendation",
  "Läs mer om portföljexemplet": "Read more about the sample portfolio",
  "Varför valdes fonderna?": "Why were these funds selected?",
  "Fortsätt med förslaget som det är, eller ändra kategorierna själv.":
    "Continue with the suggestion as it is, or change the categories yourself.",
  "Ändra förslaget": "Change the suggestion",
  "Justera portföljen och kör analysen": "Adjust the portfolio and run the analysis",
  "Illustrativt exempel, inte personlig rådgivning. Historisk avkastning är ingen garanti för framtida resultat.":
    "Illustrative example, not personal advice. Past performance is no guarantee of future results.",
  "Steg": "Step",

  // ----------------------------------------------------------- Import & plattform
  "Hur vill du lägga in innehaven?": "How would you like to add your holdings?",
  "Var finns dina fonder?": "Where are your funds held?",
  "Sista steget — var handlar du fonder?": "Last step — where do you trade funds?",
  "Jag handlar fonder via Avanza": "I trade funds through Avanza",
  "Jag handlar fonder via Nordnet": "I trade funds through Nordnet",
  "Jag använder flera plattformar": "I use several platforms",
  "Annat ställe": "Somewhere else",
  "Vi anpassar fondvalen till tillgängliga fonder på din plattform":
    "We adapt the fund selection to the funds available on your platform",
  "Vi har fyllt i ditt svar från fondanalysen — klicka för att bekräfta, eller välj ett annat.":
    "We have pre-filled your answer from the fund analysis — click to confirm, or choose another.",
  "Ange innehav i vikt eller belopp": "Enter holdings as weights or amounts",
  "Ange belopp för dina fonder.": "Enter amounts for your funds.",
  "Lägg till minst en fond med belopp.": "Add at least one fund with an amount.",
  "Lägg till minst en fond med vikt.": "Add at least one fund with a weight.",
  "Importera portfölj": "Import portfolio",
  "Importera och analysera": "Import and analyse",
  "Dra in din portföljfil": "Drag in your portfolio file",
  "Släpp filen här": "Drop the file here",
  "Släpp här": "Drop here",
  "CSV eller Excel": "CSV or Excel",
  "eller klicka för att välja · CSV, XLS eller XLSX":
    "or click to choose · CSV, XLS or XLSX",
  "Ladda upp en export från din depå. Vi matchar fonderna och räknar ut deras vikter automatiskt.":
    "Upload an export from your brokerage account. We match the funds and calculate their weights automatically.",
  "Ger exakt matchning i stället för namnsökning.":
    "Gives an exact match instead of a name search.",
  "Används för att sortera bort aktier, ETF:er och certifikat.":
    "Used to filter out shares, ETFs and certificates.",
  "Värdet i kronor — eller en färdig procentandel om du hellre anger det.":
    "The value in kronor — or a ready percentage if you prefer to enter that.",
  "Filen behöver en rubrikrad med": "The file needs a header row with",
  "Filen saknar en namnkolumn och/eller en värdekolumn.":
    "The file is missing a name column and/or a value column.",
  "Filen innehåller inga rader att importera.": "The file contains no rows to import.",
  "Filen innehåller inga fonder att analysera — bara aktier, ETF:er eller certifikat.":
    "The file contains no funds to analyse — only shares, ETFs or certificates.",
  "Hittade inga rader med ett giltigt värde.": "Found no rows with a valid value.",
  "Gamla .xls-filer stöds inte. Spara om filen som .xlsx eller .csv och försök igen.":
    "Old .xls files are not supported. Save the file as .xlsx or .csv and try again.",
  "Kunde inte läsa filen. Kontrollera att det är en CSV- eller Excel-export från din depå.":
    "Could not read the file. Check that it is a CSV or Excel export from your brokerage account.",
  "En fond kunde inte läsas in": "One fund could not be loaded",
  "— sök manuellt för de resterande": "— search manually for the rest",
  "blir matchningen exakt och aktier, ETF:er och certifikat sorteras bort automatiskt.":
    "the match becomes exact and shares, ETFs and certificates are filtered out automatically.",
  "får aldrig innehålla en annan": "must never contain another",

  // ------------------------------------------------------------------- Spara m.m.
  "Spara din portfölj": "Save your portfolio",
  "Spara min portfölj": "Save my portfolio",
  "Spara portfölj": "Save portfolio",
  "Spara din analys och portfölj": "Save your analysis and portfolio",
  "Spara och bevaka portföljen?": "Save and monitor the portfolio?",
  "Spara resultatet och hitta tillbaka": "Save the result and find your way back",
  "Spara portföljen ovan för att låsa upp alternativen.":
    "Save the portfolio above to unlock the alternatives.",
  "Spara portföljen så följer vi betyget och mejlar dig efter varje ny kontroll.":
    "Save the portfolio and we will track its score and email you after every new review.",
  "Spara som PDF": "Save as PDF",
  "Logga in för att spara som PDF": "Log in to save as PDF",
  "Logga in för att spara": "Log in to save",
  "Portföljen sparad ✓": "Portfolio saved ✓",
  "Portföljen sparades ✓": "Portfolio saved ✓",
  "Sparad ✓": "Saved ✓",
  "sparad portfölj": "saved portfolio",
  "Namnge din portfölj": "Name your portfolio",
  "Du har inga sparade portföljer": "You have no saved portfolios",
  "Du har inga sparade portföljer än": "You do not have any saved portfolios yet",
  "Analysera dina fonder eller skapa ett exempel och spara resultatet här för att hitta tillbaka till det.":
    "Analyse your funds or create an example and save the result here so you can find your way back to it.",
  "Kom åt den när som helst från Mina portföljer.":
    "Access it at any time from My portfolios.",
  "Kom åt den från Mitt konto — och få veta om betyget försämras.":
    "Access it from My account — and find out if the score deteriorates.",
  "Logga in för att komma åt den när som helst.": "Log in to access it at any time.",
  "Kunde inte ta bort portföljen. Försök igen.":
    "Could not delete the portfolio. Please try again.",

  // ------------------------------------------------------------- Portföljbevakning
  "Portföljbevakning": "Portfolio monitoring",
  "Portföljbevakning och utskick": "Portfolio monitoring and emails",
  "Få veta när din portfölj förändras": "Find out when your portfolio changes",
  "Portföljen bevakas i bakgrunden.": "The portfolio is monitored in the background.",
  "vi bevakar": "we monitor",
  "vi har upptäckt en försämring": "we have detected a deterioration",
  "Bevakning på": "Monitoring on",
  "Bevakning av": "Monitoring off",
  "Bevakning är på — vi håller koll på portföljen och mejlar dig om betyget försämras tydligt.":
    "Monitoring is on — we keep an eye on the portfolio and email you if the score clearly deteriorates.",
  "Bevakning är av — vi håller fortfarande koll, men mejlar dig inte. Du kan slå på notiser under Mitt konto.":
    "Monitoring is off — we still keep an eye on things, but we will not email you. You can turn notifications on under My account.",
  "Alla portföljer granskas": "All portfolios are reviewed",
  "Du får ett samlat mejl": "You get a single combined email",
  "Vad innebär portföljbevakningen?": "What does portfolio monitoring involve?",
  "Vi granskar alla dina sparade portföljer när fondinformationen uppdateras, normalt en gång i veckan. Sjunker någon minst 0,5 poäng får du ett samlat förändringsmejl. Annars får du ett kort besked om att kontrollen är klar.":
    "We review all your saved portfolios when the fund data is updated, normally once a week. If any drops by at least 0.5 points you get a single email about the change. Otherwise you get a short note that the review is complete.",
  "Exempel: ett portföljbetyg bevakas": "Example: a portfolio score is monitored",
  "Exempel: portföljbetyget har sjunkit": "Example: the portfolio score has fallen",
  "Portföljens avgiftsnivå väger nu ned betyget mer än vid förra kontrollen.":
    "The portfolio's fee level now weighs the score down more than at the last review.",
  "Portföljens historiska treårsavkastning väger nu ned betyget mer än vid förra kontrollen.":
    "The portfolio's historical three-year return now weighs the score down more than at the last review.",
  "Portföljens riskjusterade avkastning (Sharpe) väger nu ned betyget mer än vid förra kontrollen.":
    "The portfolio's risk-adjusted return (Sharpe) now weighs the score down more than at the last review.",
  "Portföljens spridning mellan kategorier väger nu ned betyget mer än vid förra kontrollen.":
    "The portfolio's spread between categories now weighs the score down more than at the last review.",

  // ------------------------------------------------------------------ Inloggning
  "Logga in eller skapa konto": "Log in or create an account",
  "Inget konto? Vi skapar ett åt dig automatiskt.":
    "No account? We will create one for you automatically.",
  "Skicka inloggningslänk": "Send login link",
  "Fortsätt med Google": "Continue with Google",
  "Kolla din e-post": "Check your email",
  "Vi har skickat en inloggningslänk till": "We sent a login link to",
  "E-post": "Email",
  "E-postadress": "Email address",
  "din@email.se": "you@email.com",
  "Logga in för att behålla resultatet. Du kommer tillbaka direkt efteråt.":
    "Log in to keep the result. You will come straight back afterwards.",
  "Logga in gratis för att spara portföljen. Du kommer tillbaka direkt efteråt.":
    "Log in for free to save the portfolio. You will come straight back afterwards.",
  "E-postadressen ser inte giltig ut. Kontrollera stavningen.":
    "That email address does not look valid. Check the spelling.",
  "Det går inte att skapa nya konton just nu. Prova med Google.":
    "New accounts cannot be created right now. Try with Google.",
  "Vi har skickat för många mejl på kort tid. Vänta någon minut och försök igen — eller fortsätt med Google.":
    "We have sent too many emails in a short time. Wait a minute and try again — or continue with Google.",
  "Vi kunde inte skicka länken just nu. Försök igen om en stund, eller fortsätt med Google.":
    "We could not send the link right now. Try again in a moment, or continue with Google.",
  "Vi når inte servern. Kontrollera din uppkoppling och försök igen.":
    "We cannot reach the server. Check your connection and try again.",
  "Ogiltig länk": "Invalid link",
  "Ogiltig länk.": "Invalid link.",
  "Okänt fel": "Unknown error",
  "Ditt konto är redo": "Your account is ready",
  "vart vill du börja?": "where would you like to start?",

  // --------------------------------------------------------------------- Kontot
  "Kontoinformation": "Account information",
  "Inloggningsmetod": "Sign-in method",
  "konto": "account",
  "Konto": "Account",
  "konto-id": "account id",
  "Hantera dina inställningar": "Manage your settings",
  "E-post om portföljkontroller": "Emails about portfolio reviews",
  "Mejla mig efter portföljkontroller.": "Email me after portfolio reviews.",
  "Notisinställning": "Notification setting",
  "Inloggningsmejl påverkas inte av den här inställningen. Notiserna är automatiskt genererad information, inte personlig finansiell rådgivning.":
    "Login emails are not affected by this setting. The notifications are automatically generated information, not personal financial advice.",
  "Radera konto": "Delete account",
  "Ja, radera mitt konto": "Yes, delete my account",
  "Raderar all din data permanent (GDPR)": "Permanently deletes all your data (GDPR)",
  "Du loggas ut från alla enheter": "You will be logged out on all devices",
  "Är du säker?": "Are you sure?",
  "Ditt konto och alla dina sparade portföljer raderas permanent. Det går inte att ångra.":
    "Your account and all your saved portfolios will be permanently deleted. This cannot be undone.",

  // ------------------------------------------------------------------ Felmeddel.
  "Något gick fel": "Something went wrong",
  "Något gick fel. Försök igen.": "Something went wrong. Please try again.",
  "Kunde inte spara": "Could not save",
  "Kunde inte spara. Försök igen.": "Could not save. Please try again.",
  "Kunde inte spara inställningen. Försök igen.":
    "Could not save the setting. Please try again.",
  "Kunde inte analysera fonden just nu. Prova igen om en stund.":
    "Could not analyse the fund right now. Try again in a moment.",
  "Ett oväntat fel uppstod. Försök igen eller gå tillbaka till startsidan.":
    "An unexpected error occurred. Try again or go back to the home page.",
  "Sidan hittades inte": "Page not found",
  "Sidan hittades inte | Sharpa": "Page not found | Sharpa",
  "Sidan du letar efter finns inte eller har flyttats.":
    "The page you are looking for does not exist or has been moved.",

  // ----------------------------------------------------------------------- FAQ
  "Vanliga frågor": "Frequently asked questions",
  "FAQ": "FAQ",
  "Se alla frågor och svar": "See all questions and answers",
  "Svar på de vanligaste frågorna om vad Sharpa är — och inte är.":
    "Answers to the most common questions about what Sharpa is — and is not.",
  "Är Sharpa gratis?": "Is Sharpa free?",
  "Är Sharpa verkligen gratis?": "Is Sharpa really free?",
  "Ja, helt gratis. Ingen avgift, inget kreditkort och inga provisioner från fondbolag.":
    "Yes, completely free. No fee, no credit card and no commission from fund providers.",
  "Ja. Grundfunktionerna är gratis och kräver varken kreditkort eller konto.":
    "Yes. The core features are free and require neither a credit card nor an account.",
  "Behöver jag ett konto?": "Do I need an account?",
  "Behöver jag logga in?": "Do I need to log in?",
  "Nej. Du kan analysera fonder och se portföljexempel utan konto. Ett konto behövs bara om du vill spara och bevaka en portfölj.":
    "No. You can analyse funds and view sample portfolios without an account. An account is only needed if you want to save and monitor a portfolio.",
  "Nej. Du kan analysera och bygga portföljer utan konto. Ett konto behövs bara om du vill spara dina portföljer.":
    "No. You can analyse and build portfolios without an account. An account is only needed if you want to save your portfolios.",
  "Är detta finansiell rådgivning?": "Is this financial advice?",
  "Nej. Sharpa är ett automatiserat analysverktyg som jämför fonder utifrån historiska nyckeltal. Analysen tar inte hänsyn till din personliga situation och alla investeringsbeslut fattar du själv.":
    "No. Sharpa is an automated analysis tool that compares funds using historical key figures. The analysis does not take your personal situation into account and every investment decision is yours.",
  "Hur skapas analyserna och bytesförslagen?": "How are the analyses and swap suggestions created?",
  "Vilka uppgifter sparar ni om mig?": "What data do you store about me?",
  "Hur aktuell är fonddatan?": "How current is the fund data?",
  "Om du skapar ett konto sparar vi din e-postadress samt de portföljer du väljer att spara. Du kan när som helst radera ditt konto och all data under Mitt konto. Läs mer i vår integritetspolicy.":
    "If you create an account we store your email address and the portfolios you choose to save. You can delete your account and all your data at any time under My account. Read more in our privacy policy.",
  "Fonddata hämtas från externa datakällor och uppdateras regelbundet, men inte i realtid. Kontrollera alltid aktuella uppgifter hos fondbolaget eller din depåplattform innan du fattar beslut.":
    "Fund data is collected from external sources and updated regularly, but not in real time. Always check current information with the fund provider or your brokerage platform before making a decision.",
  "Vi tar inga provisioner från fondbolag. Sharpa finansieras av licensintäkter från professionella användare. Jämförelsen följer samma kriterier för alla.":
    "We take no commission from fund providers. Sharpa is funded by licence revenue from professional users. The comparison follows the same criteria for everyone.",
  "Alla analyser, betyg och fondjämförelser i tjänsten genereras":
    "All analyses, scores and fund comparisons in the service are generated",
  "Läs fondens faktablad (KID) hos fondbolaget eller din depåplattform innan du fattar beslut.":
    "Read the fund's key information document (KID) from the fund provider or your brokerage platform before making a decision.",
  "Avgiftsbesparing är en beräkning utifrån redovisade avgifter. Kontrollera alltid aktuella villkor hos fondbolag eller depåplattform. Historisk avkastning är ingen garanti för framtida resultat — avkastningssiffran ska ses som referens, inte som en prognos.":
    "Fee savings are calculated from reported fees. Always check current terms with the fund provider or brokerage platform. Past performance is no guarantee of future results — the return figure should be seen as a reference, not a forecast.",
  "sharpa.se — Automatiskt genererad analys. Historisk avkastning är ingen garanti för framtida resultat. Ej finansiell rådgivning.":
    "sharpa.se — Automatically generated analysis. Past performance is no guarantee of future results. Not financial advice.",

  // ------------------------------------------------------------------- Juridik
  "Integritetspolicy": "Privacy policy",
  "Användarvillkor": "Terms of use",
  "användarvillkor": "terms of use",
  "Användarvillkor | Sharpa": "Terms of use | Sharpa",
  "Användarvillkor för Sharpa.": "Terms of use for Sharpa.",
  "Hur Sharpa hanterar dina personuppgifter.": "How Sharpa handles your personal data.",
  "Kakpolicy": "Cookie policy",
  "Information om hur Sharpa använder cookies.": "Information about how Sharpa uses cookies.",
  "1. Om tjänsten": "1. About the service",
  "2. Inte finansiell rådgivning — inget tillstånd": "2. Not financial advice — no licence",
  "2. Vilka uppgifter samlar vi in?": "2. What data do we collect?",
  "3. Konto och tillgång": "3. Account and access",
  "3. Varför behandlar vi dina uppgifter?": "3. Why do we process your data?",
  "4. Portföljbevakning och utskick": "4. Portfolio monitoring and emails",
  "4. Underbiträden och tredjeparter": "4. Sub-processors and third parties",
  "5. Datakällor och noggrannhet": "5. Data sources and accuracy",
  "6. Immateriella rättigheter": "6. Intellectual property",
  "7. Ansvarsbegränsning": "7. Limitation of liability",
  "8. Dina rättigheter (GDPR)": "8. Your rights (GDPR)",
  "8. Ändringar": "8. Changes",
  "9. Tillämplig lag": "9. Governing law",
  "Sharpa är en webbtjänst som hjälper privatpersoner att sammanställa nyckeltal om fonder och fondportföljer samt jämföra fonder mot varandra utifrån historiska data. Tjänsten är kostnadsfri att använda och riktar sig till privatpersoner i Sverige.":
    "Sharpa is a web service that helps individuals compile key figures about funds and fund portfolios and compare funds with each other using historical data. The service is free to use and is aimed at individuals in Sweden.",
  "Sharpa tillhandahåller inte finansiell rådgivning.": "Sharpa does not provide financial advice.",
  "Sharpa står inte under Finansinspektionens tillsyn och har inget tillstånd att bedriva investeringsrådgivning, värdepappersrörelse, försäkringsdistribution eller annan tillståndspliktig finansiell verksamhet.":
    "Sharpa is not supervised by the Swedish Financial Supervisory Authority and holds no licence to provide investment advice, securities business, insurance distribution or any other licensed financial activity.",
  "För att spara portföljer behöver du skapa ett konto. Du ansvarar för att hålla din inloggningsinformation säker och för all aktivitet som sker från ditt konto.":
    "To save portfolios you need to create an account. You are responsible for keeping your login details secure and for all activity from your account.",
  "Vi förbehåller oss rätten att stänga konton som missbrukar tjänsten, t.ex. genom automatiserade anrop, spridning av felaktig information eller brott mot dessa villkor.":
    "We reserve the right to close accounts that misuse the service, for example through automated requests, spreading incorrect information or breaching these terms.",
  "Allt innehåll, design och kod på Sharpa tillhör Sharpa. Du får inte kopiera, distribuera eller skapa härledda verk utan skriftligt tillstånd.":
    "All content, design and code on Sharpa belongs to Sharpa. You may not copy, distribute or create derivative works without written permission.",
  "Tjänsten tillhandahålls “i befintligt skick”. Beslut som fattas helt eller delvis utifrån information från tjänsten fattas på egen risk, och Sharpa ansvarar inte för ekonomiska förluster som uppstår till följd av sådana beslut.":
    "The service is provided “as is”. Decisions made wholly or partly on the basis of information from the service are made at your own risk, and Sharpa is not liable for financial losses arising from such decisions.",
  "Begränsningen gäller inte skada som Sharpa orsakat genom uppsåt eller grov vårdslöshet, och inskränker inte de rättigheter du har som konsument enligt tvingande lag.":
    "The limitation does not apply to damage caused by Sharpa through intent or gross negligence, and does not restrict the rights you have as a consumer under mandatory law.",
  "Vi kan uppdatera dessa villkor när som helst. Fortsatt användning efter att ändringar trätt i kraft innebär att du accepterar de nya villkoren.":
    "We may update these terms at any time. Continued use after changes take effect means you accept the new terms.",
  "Dessa villkor regleras av svensk lag. Tvister ska i första hand lösas i samförstånd, och i andra hand av allmän domstol i Sverige.":
    "These terms are governed by Swedish law. Disputes shall primarily be resolved by agreement, and otherwise by a general court in Sweden.",
  "Vi samlar in och behandlar följande uppgifter:": "We collect and process the following data:",
  "Vi använder följande underbiträden för att driva tjänsten:":
    "We use the following sub-processors to run the service:",
  "Alla underbiträden behandlar uppgifter enligt våra instruktioner och GDPR. För de leverantörer som är etablerade i USA sker överföringen med stöd av EU-kommissionens beslut om adekvat skyddsnivå (EU–US Data Privacy Framework) eller standardavtalsklausuler enligt artikel 46 GDPR.":
    "All sub-processors handle data according to our instructions and the GDPR. For providers established in the US, transfers rely on the European Commission's adequacy decision (EU–US Data Privacy Framework) or standard contractual clauses under Article 46 GDPR.",
  "Vi lagrar dina uppgifter så länge ditt konto är aktivt. Om du raderar ditt konto raderas alla dina uppgifter (portföljer, bevakningshistorik, notisinställningar och e-postadress) inom 30 dagar.":
    "We store your data for as long as your account is active. If you delete your account, all your data (portfolios, monitoring history, notification settings and email address) is deleted within 30 days.",
  "Har du frågor om din integritet eller vill utöva dina rättigheter, hör av dig via e-post till":
    "If you have questions about your privacy or want to exercise your rights, get in touch by email at",
  "Du har rätt att:": "You have the right to:",
  "Begära tillgång": "Request access",
  "Begära rättelse": "Request rectification",
  "Begära radering": "Request erasure",
  "Begära dataportabilitet": "Request data portability",
  "Invända mot behandling": "Object to processing",
  "Återkalla samtycke": "Withdraw consent",
  "Lämna in klagomål": "Lodge a complaint",
  "till de uppgifter vi har om dig.": "to the data we hold about you.",
  "av felaktiga uppgifter.": "of incorrect data.",
  "av de uppgifter du själv lämnat.": "of the data you have provided yourself.",
  "till Integritetsskyddsmyndigheten (IMY), imy.se.":
    "to the Swedish Authority for Privacy Protection (IMY), imy.se.",
  "till e-postnotiser — under Mitt konto eller via länken i varje utskick. Det påverkar inte behandling som redan skett.":
    "to email notifications — under My account or via the link in every email. This does not affect processing that has already taken place.",
  "Tillhandahålla tjänsten": "Providing the service",
  "Förbättra webbplatsen": "Improving the website",
  "Rättslig grund:": "Legal basis:",
  "berättigat intresse": "legitimate interest",
  "baserad på berättigat intresse.": "based on legitimate interest.",
  "fullgörande av avtal": "performance of a contract",
  "(tjänstens tillhandahållande),": "(provision of the service),",
  "(webbstatistik) och": "(web statistics) and",
  "Anonymiserad besöksstatistik": "Anonymised visitor statistics",
  "— anonymiserad och sammanställd besöksstatistik hjälper oss förstå hur tjänsten används.":
    "— anonymised and aggregated visitor statistics help us understand how the service is used.",
  "— du kan radera ditt konto direkt i kontoinställningarna.":
    "— you can delete your account directly in the account settings.",
  "— exempelvis sidvisningar, hänvisande webbplats, ungefärlig plats, enhet och webbläsare via Vercel Web Analytics.":
    "— for example page views, referring website, approximate location, device and browser via Vercel Web Analytics.",
  "— fondnamn, vikter och analys som du sparar i tjänsten.":
    "— fund names, weights and analyses you save in the service.",
  "— för att du ska kunna logga in och spara portföljer.":
    "— so that you can log in and save portfolios.",
  "— för att räkna om betyget på dina sparade portföljer och, om du har valt det, mejla dig om kontrollens resultat.":
    "— to recalculate the score of your saved portfolios and, if you have chosen it, email you about the result of the review.",
  "— när du skapar ett konto eller loggar in via magisk länk.":
    "— when you create an account or log in via a magic link.",
  "— om du har valt att få e-post efter portföljkontroller.":
    "— if you have chosen to receive emails after portfolio reviews.",
  "— om du sparar en portfölj beräknar vi dagligen om dess betyg och sparar en historikrad per kontroll (betyg, nyckeltal och en kopia av analysen). Det gör att vi kan visa hur portföljen utvecklats och avgöra om något förändrats.":
    "— if you save a portfolio we recalculate its score daily and store one history row per review (score, key figures and a copy of the analysis). That lets us show how the portfolio has developed and determine whether anything has changed.",
  "— om du väljer att logga in med Google.": "— if you choose to log in with Google.",
  "— sessionskakor krävs tekniskt för att hålla dig inloggad.":
    "— session cookies are technically required to keep you logged in.",
  "— sessionskakor som krävs för inloggning.":
    "— session cookies required for logging in.",
  "(Google Ireland Ltd.) — om du väljer att logga in med Google.":
    "(Google Ireland Ltd.) — if you choose to log in with Google.",
  "(Resend Inc., USA) — utskick av e-post. Får din e-postadress och portföljens namn när ett meddelande skickas.":
    "(Resend Inc., USA) — sending email. Receives your email address and the portfolio name when a message is sent.",
  "(Supabase Inc., USA) — databas och autentisering. Data lagras inom EU/EES.":
    "(Supabase Inc., USA) — database and authentication. Data is stored within the EU/EEA.",
  "(Vercel Inc., USA) — webbhosting, serverless-funktioner och anonymiserad webbanalys.":
    "(Vercel Inc., USA) — web hosting, serverless functions and anonymised web analytics.",
  "för e-postnotiser om portföljbevakningen. Du kan när som helst återkalla samtycket under Mitt konto eller via länken i varje utskick.":
    "for email notifications about portfolio monitoring. You can withdraw your consent at any time under My account or via the link in every email.",
  "Fonddatan i tjänsten (avgifter, historisk avkastning, risknyckeltal) hämtas från Avanzas och Nordnets publika fondlistor. Datan rör fonderna, inte dig, och samkörs aldrig med dina personuppgifter utanför din egen sparade portfölj.":
    "The fund data in the service (fees, historical returns, risk figures) comes from Avanza's and Nordnet's public fund lists. The data concerns the funds, not you, and is never combined with your personal data outside your own saved portfolio.",
  "Vissa inställningar (t.ex. val av depåplattform och ditt cookieval) sparas endast lokalt i din webbläsare och skickas inte till oss.":
    "Some settings (such as your chosen brokerage platform and your cookie choice) are stored only locally in your browser and are not sent to us.",
  "Din webbläsare sparar lokalt ditt cookieval och vissa inställningar, t.ex. vald depåplattform. Dessa uppgifter lämnar aldrig din enhet och skickas inte till oss.":
    "Your browser stores your cookie choice and some settings locally, such as your chosen brokerage platform. This data never leaves your device and is not sent to us.",

  // ------------------------------------------------------------------- Cookies
  "Vad är cookies?": "What are cookies?",
  "Vilka cookies använder vi?": "Which cookies do we use?",
  "Hantera cookies": "Manage cookies",
  "enbart nödvändiga cookies": "necessary cookies only",
  "Sharpa använder": "Sharpa uses",
  "Vi använder nödvändiga cookies för autentisering. Inga spårningskakor.":
    "We use necessary cookies for authentication. No tracking cookies.",
  "Cookies (kakor) är små textfiler som lagras i din webbläsare när du besöker en webbplats. De används bland annat för att hålla dig inloggad mellan sidbesök.":
    "Cookies are small text files stored in your browser when you visit a website. Among other things they are used to keep you logged in between page visits.",
  ". Vi använder inga spårningskakor, annonskakor eller analyskakor.":
    ". We use no tracking cookies, advertising cookies or analytics cookies.",
  "Vi använder inga cookies från Google Analytics, Facebook Pixel eller liknande spårningsverktyg.":
    "We use no cookies from Google Analytics, Facebook Pixel or similar tracking tools.",
  "Vi använder Vercel Web Analytics för anonym, sammanställd statistik om exempelvis sidvisningar, hänvisande webbplats, ungefärlig plats, enhet och webbläsare. Tjänsten använder inga cookies och identifierar inte besökare mellan olika dagar eller webbplatser.":
    "We use Vercel Web Analytics for anonymous, aggregated statistics on things like page views, referring website, approximate location, device and browser. The service uses no cookies and does not identify visitors across days or websites.",
  "Eftersom vi enbart använder tekniskt nödvändiga cookies, och Vercel Web Analytics inte använder cookies, begär vi inte samtycke för analyskakor.":
    "Because we only use technically necessary cookies, and Vercel Web Analytics uses no cookies, we do not ask for consent for analytics cookies.",
  "Sätts av vår autentiseringsleverantör Supabase för att hålla dig inloggad. Raderas när du loggar ut eller när sessionen löper ut. Kan inte stängas av utan att inloggning slutar fungera.":
    "Set by our authentication provider Supabase to keep you logged in. Deleted when you log out or when the session expires. It cannot be turned off without login ceasing to work.",
  "Du kan blockera eller radera cookies i din webbläsares inställningar. Observera att om du blockerar nödvändiga sessionskakor kan du inte logga in på Sharpa.":
    "You can block or delete cookies in your browser settings. Note that if you block necessary session cookies you cannot log in to Sharpa.",
  "Instruktioner för de vanligaste webbläsarna:": "Instructions for the most common browsers:",
  "Chrome: Inställningar, Sekretess och säkerhet, Cookies":
    "Chrome: Settings, Privacy and security, Cookies",
  "Firefox: Inställningar, Integritet och säkerhet, Cookies":
    "Firefox: Settings, Privacy and security, Cookies",
  "Safari: Inställningar, Integritet, Hantera webbplatsdata":
    "Safari: Settings, Privacy, Manage website data",
  "Vi samlar": "We do not collect",
  "in känsliga personuppgifter, inga annonskakor och vi delar inte dina uppgifter med tredje part för marknadsföring.":
    "sensitive personal data, we use no advertising cookies and we do not share your data with third parties for marketing.",

  // -------------------------------------------------------------- Rapport/PDF
  "Rådgivarens kommentar": "Adviser's comment",
  "Förhandsvisning av PDF": "PDF preview",
  "Tillgängliga kort": "Available cards",
  "Alla kort är aktiva": "All cards are active",
  "Alla sektioner är aktiva": "All sections are active",
  "Dra ett kort till önskad position i rapporten":
    "Drag a card to the desired position in the report",
  "PDF": "PDF",
  "Scenario": "Scenario",
  "Scenarioanalys": "Scenario analysis",
  "Alternativt scenario": "Alternative scenario",
  "Nuvarande vs scenario": "Current vs scenario",
  "Resultatet jämförs mot den ursprungliga portföljens nyckeltal":
    "The result is compared with the original portfolio's key figures",
  "Tidssimulator": "Time simulator",
  "Värdeutveckling över tid": "Value over time",

  // ---------------------------------------------- Fragment kring interpolationer
  // Text som JSX bryter i flera noder runt ett {uttryck} — varje del slås upp
  // för sig, så bitarna måste stå här var för sig.
  "Svara på": "Answer",
  "frågor — vi visar ett illustrativt portföljexempel.":
    "questions — we will show an illustrative sample portfolio.",
  "Fråga": "Question",
  "av": "of",
  "%/år": "%/year",
  "% räntor": "% fixed income",
  "% aktier ·": "% equities ·",
  "Fonden ger portföljen": "The fund gives the portfolio",
  "Fördelningen är automatiskt genererad utifrån den risknivå du valt och generella nyckeltal. Den tar inte hänsyn till din personliga ekonomiska situation och utgör varken investeringsrådgivning eller en personlig rekommendation. Alla investeringsbeslut fattar du själv och på egen risk. Historisk avkastning är ingen garanti för framtida resultat.":
    "The allocation is generated automatically from the risk level you chose and general key figures. It does not take your personal financial situation into account and constitutes neither investment advice nor a personal recommendation. Every investment decision is yours and made at your own risk. Past performance is no guarantee of future results.",

  // Gemener: API:t och byggaren skickar in dessa via toLowerCase().
  "försiktig": "cautious",
  "defensiv": "defensive",
  "balanserad": "balanced",
  "tillväxt": "growth",
  "offensiv": "aggressive",
  "indexfonder": "index funds",
  "en mix av index och aktiva fonder": "a mix of index and active funds",
  "svenska räntor": "Swedish fixed income",
  "globala räntor": "global fixed income",
  "svenska aktier": "Swedish equities",
  "globala aktier": "global equities",
  "tillväxtmarknader": "emerging markets",
  "småbolag": "small caps",
  "aktier": "equities",
  "räntor": "fixed income",
  "Äger du inga fonder?": "Don't own any funds?",
  "Genom att logga in godkänner du våra": "By logging in you accept our",
  "Sharpa är personuppgiftsansvarig för behandlingen av dina personuppgifter. Har du frågor om hur vi hanterar dina uppgifter är du välkommen att kontakta oss på":
    "Sharpa is the data controller for the processing of your personal data. If you have questions about how we handle your data you are welcome to contact us at",
  "Vi använder enbart sessionskakor som är nödvändiga för att autentisering ska fungera. Vercel Web Analytics använder inga cookies. Vi använder inga spårnings- eller annonskakor. Du kan läsa mer i vår":
    "We only use session cookies that are necessary for authentication to work. Vercel Web Analytics uses no cookies. We use no tracking or advertising cookies. You can read more in our",
  "utifrån historiska nyckeltal och generella, förutbestämda kriterier. De tar inte hänsyn till din ekonomiska situation, dina kunskaper, din erfarenhet eller dina mål, och utgör därför inte personliga rekommendationer. Ingenting i tjänsten ska tolkas som råd om köp, försäljning eller innehav av finansiella instrument.":
    "from historical key figures and general, predetermined criteria. They do not take your financial situation, knowledge, experience or goals into account, and therefore do not constitute personal recommendations. Nothing in the service should be interpreted as advice to buy, sell or hold financial instruments.",
  "Historisk avkastning är ingen garanti för framtida avkastning. Fondandelar kan både öka och minska i värde och det är inte säkert att du får tillbaka det investerade kapitalet. Alla investeringsbeslut fattar du själv och på egen risk. Rådgör med en auktoriserad finansiell rådgivare innan du fattar investeringsbeslut.":
    "Past performance is no guarantee of future returns. Fund units can rise as well as fall in value and you may not get back the capital you invested. Every investment decision is yours and made at your own risk. Consult an authorised financial adviser before making investment decisions.",
  "Sparar du en portfölj räknar vi om dess betyg när fondinformationen uppdateras och sparar resultatet som historik. Har du aktivt valt e-post får du ett samlat förändringsmejl när minst en granskad portfölj når den angivna larmgränsen, annars ett kontrollbesked med aktuella betyg. Utskicken beskriver kontrollens resultat — de innehåller inga uppmaningar att köpa, sälja eller byta fonder och utgör inte rådgivning. Du kan när som helst stänga av dem under Mitt konto eller via länken i varje meddelande.":
    "If you save a portfolio we recalculate its score when the fund data is updated and store the result as history. If you have actively opted in to email, you receive a single change email when at least one reviewed portfolio reaches the stated alert threshold, otherwise a review notice with current scores. The emails describe the result of the review — they contain no prompts to buy, sell or switch funds and do not constitute advice. You can turn them off at any time under My account or via the link in every message.",
  "Fonddata hämtas från Avanzas och Nordnets publika fondlistor och uppdateras regelbundet, men inte i realtid. Vi kan inte garantera att uppgifterna alltid är fullständiga, korrekta eller aktuella. Kontrollera alltid uppgifter om en fond (avgift, avkastning, risk) och läs fondens faktablad (KID) hos fondbolaget eller din depåplattform innan du fattar beslut.":
    "Fund data comes from Avanza's and Nordnet's public fund lists and is updated regularly, but not in real time. We cannot guarantee that the information is always complete, correct or current. Always check a fund's details (fee, return, risk) and read the fund's key information document (KID) from the fund provider or your brokerage platform before making a decision.",

  // ------------------------------------------------------------------- Diverse
  "och": "and",
  "eller": "or",
  "till": "to",
  "inte": "not",
  ", inte": ", not",
  "Ange lösenord för att fortsätta": "Enter password to continue",
  "Allt rådgivaren behöver": "Everything the adviser needs",
  "Admin — Portföljanalys": "Admin — Portfolio analysis",
  "Hur bra är": "How good are",
};

// Texter som byggs ihop med siffror eller namn kan inte slås upp exakt. De
// matchas i stället mot mönster, och grupperna flyttas över till resultatet.
// Mönstren provas först när det exakta uppslaget missat.
//
// En funktion som ersättning får `t`, som slår upp en delfras i ordboken — det
// behövs när en grupp själv innehåller svensk text (t.ex. risknivåns namn i
// portföljsammanfattningen, som API:t bygger ihop på servern).
export type PatternReplacement =
  | string
  | ((groups: (string | undefined)[], t: (fragment: string) => string) => string);

export const EN_PATTERNS: [RegExp, PatternReplacement][] = [
  [/^Steg (\d+) av (\d+)$/, "Step $1 of $2"],
  [/^Fråga (\d+) av (\d+)$/, "Question $1 of $2"],
  [/^(\d+) av (\d+)$/, "$1 of $2"],
  [/^av (\d+) fonder$/, "of $1 funds"],
  [/^(\d+) fonder kunde inte läsas in$/, "$1 funds could not be loaded"],
  [/^(\d+) av dina portföljer har förändrats$/, "$1 of your portfolios have changed"],
  [/^Minska vikten för (.+)$/, "Decrease the weight of $1"],
  [/^Öka vikten för (.+)$/, "Increase the weight of $1"],
  [/^(.+), vart vill du börja\?$/, "$1, where would you like to start?"],
  [/^~(\d+)% aktier · minst svängningar$/, "~$1% equities · smallest swings"],
  [/^~(\d+)% aktier · jämn mix aktier\/räntor$/, "~$1% equities · even mix of equities/fixed income"],
  [/^~(\d+)% aktier · störst svängningar$/, "~$1% equities · largest swings"],
  [/^~(\d+)% aktier$/, "~$1% equities"],
  [/^(.+) kr\/år i beräknad skillnad$/, "SEK $1/year in estimated difference"],
  [/^(.+) kr investerat$/, "SEK $1 invested"],
  [/^· snitt ([\d.,]+)%$/, "· avg $1%"],
  [/^Avkastning (\d+) år ([\d.,-]+)%$/, ([years, value]) => `${years}-year return ${value}%`],
  [/^Avgift ([\d.,]+)%\/år$/, "Fee $1%/year"],

  // Portföljsammanfattningen från /api/build-portfolio.
  [
    /^En (.+?) portfölj med (\d+)% aktier(?: och (\d+)% räntor)?, byggd med (.+?) fördelat över (\d+) områden?\.$/,
    ([risk, equity, bond, mgmt, areas], t) =>
      `A ${t(risk!)} portfolio with ${equity}% equities${bond ? ` and ${bond}% fixed income` : ""}, ` +
      `built with ${t(mgmt!)} spread across ${areas} area${areas === "1" ? "" : "s"}.`,
  ],

  // Motiveringarna per fond i byggaren.
  [
    /^Stark kombination av riskjusterad avkastning och låg avgift(?: av (\d+) fonder)?\.$/,
    ([pool]) => `Strong combination of risk-adjusted return and low fee${pool ? ` out of ${pool} funds` : ""}.`,
  ],
  [
    /^Stark kombination av historisk avkastning och låg avgift(?: av (\d+) fonder)?\.$/,
    ([pool]) => `Strong combination of historical return and low fee${pool ? ` out of ${pool} funds` : ""}.`,
  ],
  [
    /^Stark riskjusterad avkastning(?: av (\d+) fonder)?\.$/,
    ([pool]) => `Strong risk-adjusted return${pool ? ` out of ${pool} funds` : ""}.`,
  ],
  [
    /^Stark historisk avkastning(?: av (\d+) fonder)?\.$/,
    ([pool]) => `Strong historical return${pool ? ` out of ${pool} funds` : ""}.`,
  ],
  [
    /^Lägre avgift än kategorisnittet(?: av (\d+) fonder)?\. Riskjusterad och historisk avkastning har också vägts in i rangordningen\.$/,
    ([pool]) =>
      `Lower fee than the category average${pool ? ` out of ${pool} funds` : ""}. ` +
      "Risk-adjusted and historical returns have also been weighed into the ranking.",
  ],
  [
    /^Högt rankad i sin kategori utifrån riskjusterad avkastning, historisk avkastning och avgift(?: av (\d+) fonder)?\.$/,
    ([pool]) =>
      `Highly ranked in its category on risk-adjusted return, historical return and fee${pool ? ` out of ${pool} funds` : ""}.`,
  ],
];

// Sidtitlar sätts ihop av Next med ett suffix. Slå upp basdelen och behåll
// suffixet oöversatt.
export const TITLE_SUFFIXES = [" – Sharpa", " | Sharpa"];

// Attribut som får översättas. `alt` utelämnas medvetet: alt-texterna är
// logotypnamn.
export const TRANSLATABLE_ATTRIBUTES = ["aria-label", "placeholder", "title"] as const;
