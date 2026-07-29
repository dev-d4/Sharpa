# video/ — TikTok-videor ur kodbasen

Renderar vertikala videor i 1080×1920 där alla siffror härleds ur den faktiska
fonddatan i [`data/avanza-funds.json`](../data/avanza-funds.json). Ingenting är
handknackat.

Paketet är **medvetet isolerat** från Next.js-appen: egna `node_modules`, egen
`tsconfig.json`, ingen Tailwind. Rotens `tsconfig.json` och `eslint.config.mjs`
exkluderar `video/` så att Vercel-bygget aldrig drar in Remotions renderare.

## Kom igång

```bash
cd video
npm install
npm run build:data   # härleder siffrorna ur fonddatan
npm run build:vo     # genererar speakerrepliker och mäter att de får plats
npm run studio       # förhandsgranska och skrolla i tidslinjen
```

## Två format

| Komposition | Längd | Vad den säljer in |
|---|---|---|
| **PortfolioVideo** | 52 s | Huvudformatet. Hela analysen: innehav, portföljbetyg, nyckeltal, fördelning och förbättringsförslag. |
| **FeeVideo** | 33 s | Sidoformat. En video per fond — avgiften och vad den kostar över tid. |

Båda är satta i ett tempo som går att prata över: varje scen håller sitt slutläge
i två till tre sekunder efter att animationen landat.

## Rendera

```bash
npm run batch                 # portföljvideon + alla fondvideor
npm run batch -- portfolj     # bara portföljvideon
npm run batch -- fonder       # bara fondvideorna
npm run batch -- swedbank     # bara matchande slugg
```

Färdiga filer hamnar i `out/` (gitignorerad).

## Data

All fonddata kommer ur `data/avanza-funds.json` via
[`scripts/build-data.ts`](scripts/build-data.ts), som skriver
`src/data/portfolio.generated.ts`. Den filen ska aldrig redigeras för hand.

Scriptet räknar portföljbetyget med **exakt samma trösklar** som
[`lib/portfolio-score.ts`](../lib/portfolio-score.ts) och viktar nyckeltalen som
[`lib/analysis.ts`](../lib/analysis.ts). Ändras formeln på sajten ska den ändras
här och `npm run build:data` köras om.

Vill du byta portfölj eller lägga till fondvideor: ändra `HOLDINGS`, `SWAPS`
eller `FUND_VIDEO_ISINS` överst i scriptet och kör om det.

Kategorisnitt och billigaste alternativ räknas fram över hela datasetet — inte
handplockat.

## Skärminspelning

Spela in på en riktig telefon (Inställningar → Kontrollcenter → Skärminspelning).
Konvertera till h264 och lägg i `public/screencasts/`:

```bash
npx remotion ffmpeg -i inspelning.mov -c:v libx264 -crf 23 -an -r 30 \
  -pix_fmt yuv420p public/screencasts/portfoljanalys.mp4
```

Peka ut den i [`src/data/portfolio.ts`](src/data/portfolio.ts). Där sitter också
`PORTFOLIO_SCREENCAST_START`, som hoppar förbi de tråkiga sekunderna i början —
sikta på att resultatet syns inom scenens sex sekunder.

Saknas filen renderas en platshållare i telefonramen i stället för att bygget
kraschar, men `npm run batch` varnar i terminalen.

## Speaker

Manuset ligger i [`src/data/script.ts`](src/data/script.ts), en replik per scen.
`npm run build:vo` genererar en ljudfil per replik till `public/vo/` och skriver
manifestet som kompositionen läser. Repliken spelas inifrån sin egen scen, så
den startar automatiskt vid klippet — ingen tidsförskjutning att hålla i synk.

Scriptet **mäter varje replik mot sin scen** och varnar när den inte får plats
eller när tempot går över 3 ord per sekund. Kortar du en replik: kör om
scriptet och justera scenens `duration` i
[`src/PortfolioVideo.tsx`](src/PortfolioVideo.tsx).

Rösten är macOS inbyggda svenska röst (Alva). Den duger för att höra om manuset
ligger i takt med bilden — **den duger inte att publicera med**. Byt ut filerna
i `public/vo/` mot en riktig inspelning eller en betald TTS när timingen sitter.
Filnamnen är det enda som spelar roll: `hook.wav`, `holdings.wav`, `score.wav`,
`metrics.wav`, `proof.wav`, `improvements.wav`, `outro.wav`.

Manuset får aldrig säga köp eller sälj — se listan längst ner.

## Musik

Lägg en fil i `public/music/` och peka ut den i
[`src/data/audio.ts`](src/data/audio.ts). Utan fil renderas videon utan musik.

Nivån ligger på 0,1 under rösten, med en sekunds toning i båda ändar. Kör du
utan speaker kan du gå upp mot 0,25.

Hämta spåret där licensen tillåter TikTok: Epidemic Sound, Artlist, Uppbeat
eller YouTube Audio Library. Ladda inte ner från Spotify eller YouTube.

Alternativet är att lämna `MUSIC_TRACK` som `undefined` och lägga ett trending
sound i TikTok-appen i stället — bättre spridning, men då kan du inte ha
speakerrösten kvar utan att mixa i CapCut först.

`FeeVideo` har inget manus och ingen musik — den är gjord för att få ljud i
appen.

## PortfolioVideo, scen för scen

| Tid | Scen | Innehåll |
|---|---|---|
| 0–5 s | `Hook` | "Hur bra är din portfölj egentligen?" Mörk botten. |
| 5–14 s | `Holdings` | Fyra riktiga bankfonder med kategori, avgift och vikt. |
| 14–22,5 s | `ScoreCard` | Portföljbetyget tickar upp, styrkor och förbättringsområden. |
| 22,5–30 s | `KeyMetrics` | Nyckeltal i 2×2 plus fördelningsstapeln. |
| 30–36,5 s | `PhoneProof` | **Skärminspelningen** — 6,5 av 52 sekunder. |
| 36,5–47 s | `Improvements` | Nuvarande → alternativ, betyg före/efter, lägre avgift i kr. |
| 47–52 s | `Outro` | Märket + "Analysera hela din portfölj." |

Scenlängderna är satta efter de uppmätta replikerna: varje scen rymmer sin
replik plus knappt en sekunds tystnad innan klippet.

Ordningen är fast med avsikt — igenkänningen mellan videor är halva formatet.
Hårda klipp, ingen crossfade.

Inspelningen ligger i mitten för att fungera som *bevis*: animationerna gör
påståendet, telefonen visar att siffrorna kommer ur ett riktigt verktyg. Flytta
den inte först eller sist.

## Designbeslut som inte ska ångras utan skäl

- **Kortytorna speglar analyssidan** — `Card`, `SectionLabel`, `Metric`,
  `StackedBar` och swap-raderna följer samma form som
  `app/analyze/AnalyzeClient.tsx`, uppskalat för 1080 px bredd. Poängen är att
  den som klickar sig in ska känna igen sig.
- **Färgerna** speglar `app/globals.css` (accent `#0B6E99`), inte den separata
  premiumpaletten för `/radgivning/portfolioanalysis`. Ändras tokens där ska
  [`src/theme.ts`](src/theme.ts) följa med.
- **`ON_DARK`-stegen** finns för att `accent` och `neg` bara ger ~2,9:1 mot den
  mörka bottnen. Använd dem på mörka scener, inte grundstegen.
- **Fördelningsfärgerna** är `CHART_PALETTE` i fast ordning, aldrig cyklad.
  De tre första är validerade mot vit kortyta (ΔE 15,5 protan / 25,7 normal);
  ambern ligger under 3:1 mot vitt, vilket `StackedBar` löser med synliga
  etiketter och värden.
- **Diagrammets tvåseriepalett** i `FeeVideo` är validerad: ΔE 15,6 (protanopi),
  27,5 (normalseende), med både legend och direktetiketter.
- **Y-axeln i `DivergenceChart` börjar vid insatt kapital**, inte noll, och det
  står uttryckligen på baslinjen. Utan den texten vore det en trunkerad axel som
  överdriver gapet.
- **Slutetiketterna ligger i en egen högerränna** (`PAD.right`). Inne i
  plotytan skar de kurvan.
- **`SAFE` i `theme.ts`** håller all läsbar text undan TikToks eget UI:
  knappraden till höger, bildtext och användarnamn nedtill.
- **Friskrivningen ligger i `Chrome`**, utanför scenerna, så den inte kan
  glömmas i ett enskilt klipp.

## Innan något publiceras

- Kör `npm run build:data` så att siffrorna stämmer med aktuell fonddata.
- Byt ut Alva-rösten mot en riktig inspelning. Den syntetiska rösten läser som
  en GPS och underminerar trovärdigheten du bygger resten av videon på.
- Videon jämför avgifter och nyckeltal. Den får **inte** säga sälj eller köp —
  det vore investeringsrådgivning, vilket kräver tillstånd hos
  Finansinspektionen som Sharpa inte har (se FAQ:n i
  `components/ui/HowItWorks.tsx`).
- "Lägre avgift per år" är **enbart** avgiftsskillnaden vid 100 000 kr. Den
  innehåller ingen avkastningsprognos, och får inte presenteras som en sådan.
- Lägg mallvideorna i den juristgranskning som ändå ska göras före lansering.
  Formaten repeteras, så en granskning täcker in hela serien.
