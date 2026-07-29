// Speglar tokens i app/globals.css (designsystemet "Saklig kapitalförvaltning").
// Duplicerat medvetet: video/ är ett eget npm-paket utan Tailwind, så det finns
// inget att importera. Ändras globals.css ska den här filen följa med.
//
// OBS: detta är sajtens huvudpalett (accent #0B6E99), inte den separata
// premium-paletten för /radgivning/portfolioanalysis (#274C77).

export const COLOR = {
  canvas: "#F7F8FA",
  section: "#F2F4F7",
  ink: "#17212B",
  ink2: "#4B5A68",
  ink3: "#6F7D89",
  ink4: "#9CA8B3",
  accent: "#0B6E99",
  accentHover: "#095D82",
  accentPress: "#084C69",
  pos: "#18864B",
  posSoft: "#E8F3ED",
  neg: "#C23A32",
  negSoft: "#F9ECEB",
  warn: "#B97818",
  warnSoft: "#F7EFE3",
  info: "#EAF3F8",
  line: "#D9E0E6",
  lineSoft: "#E8EDF2",
  white: "#FFFFFF",
} as const;

// Ljusare steg ur samma hues, för scenerna med mörk botten (ink). Accent och neg
// i sina vanliga steg ger bara ~2,5:1 mot #17212B och blir svårlästa i mobil.
// Dessa ligger på 5–7:1 mot ink — mörkt läge är valt, inte en automatisk vändning.
export const ON_DARK = {
  muted: "#7E9CB0",
  accent: "#5FAFD4",
  neg: "#EE8A80",
} as const;

// Tvåseriepalett för avgiftsdiagrammen. Validerad mot canvas-ytan:
// ΔE 15,6 (protan) och 27,5 (normalseende) — båda serierna är dessutom
// direktetiketterade, så identiteten sitter aldrig i färgen enbart.
export const SERIES = {
  expensive: COLOR.neg,
  cheap: COLOR.accent,
} as const;

// Speglar lib/chart-palette.ts. Tas i fast ordning, aldrig cyklad — de tre
// första är validerade mot vit kortyta (ΔE 15,5 protan / 25,7 normal). Amber
// ligger under 3:1 mot vitt, vilket StackedBar löser med synliga etiketter.
export const CHART_PALETTE = [
  "#0B6E99",
  "#D9A542",
  "#18864B",
  "#5D6B78",
  "#7FB3CC",
  "#C26A3A",
] as const;

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 540, // 18 s
} as const;

// TikToks eget UI äter kanterna. Allt som måste läsas ligger innanför detta.
// Höger marginal är extra bred för knappraden (gilla/kommentera/dela).
export const SAFE = {
  top: 260,
  bottom: 470,
  left: 88,
  right: 208,
} as const;

export const SAFE_WIDTH = VIDEO.width - SAFE.left - SAFE.right;

// Krävs i marknadsföring av finansiella tjänster — ligger inbränd i varje video
// så den aldrig kan glömmas bort i ett enskilt klipp.
export const DISCLAIMER =
  "Illustrativ jämförelse, inte en prognos. Historisk avkastning är ingen garanti för framtida avkastning. Sharpa ger inte investeringsrådgivning.";
