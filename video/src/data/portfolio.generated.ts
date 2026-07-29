// GENERERAD FIL — ändra inte för hand.
// Skapad av scripts/build-data.ts ur data/avanza-funds.json.
// Kör `npm run build:data` för att uppdatera.

export type Holding = {
  name: string;
  category: string;
  weight: number;
  cost: number;
  isActive: boolean;
};

export type Swap = {
  currentName: string;
  suggestedName: string;
  currentCost: number;
  suggestedCost: number;
};

export type PortfolioMetrics = {
  avgCost: number;
  return1yr: number;
  return3yr: number;
  sharpe: number;
  score: number;
  label: string;
};

export const HOLDINGS: Holding[] = [
  {
    "name": "Swedbank Robur Globalfond A",
    "category": "Global, Tillväxtbolag",
    "weight": 35,
    "cost": 1.4,
    "isActive": true
  },
  {
    "name": "Swedbank Robur Sverige A",
    "category": "Sverige",
    "weight": 25,
    "cost": 1.32,
    "isActive": true
  },
  {
    "name": "Länsförsäkringar Global Vision A",
    "category": "Global, Mix bolag",
    "weight": 25,
    "cost": 1.54,
    "isActive": true
  },
  {
    "name": "Handelsbanken Global Digital (A1 SEK)",
    "category": "Branschfond, Ny teknik",
    "weight": 15,
    "cost": 1.6500000000000001,
    "isActive": true
  }
];

export const CURRENT: PortfolioMetrics = {
  "avgCost": 1.45,
  "return1yr": 4.46,
  "return3yr": 12.04,
  "sharpe": 0.79,
  "score": 6.3,
  "label": "OK"
};

export const SUGGESTED: PortfolioMetrics = {
  "avgCost": 0.63,
  "return1yr": 11.23,
  "return3yr": 15.39,
  "sharpe": 0.97,
  "score": 7.5,
  "label": "Bra"
};

export const SWAPS: Swap[] = [
  {
    "currentName": "Swedbank Robur Globalfond A",
    "suggestedName": "Handelsbanken Global Momentum (A1 SEK)",
    "currentCost": 1.4,
    "suggestedCost": 0.73
  },
  {
    "currentName": "Swedbank Robur Sverige A",
    "suggestedName": "Handelsbanken Sverige 100 Index (B1 SEK)",
    "currentCost": 1.32,
    "suggestedCost": 0.27
  },
  {
    "currentName": "Länsförsäkringar Global Vision A",
    "suggestedName": "Länsförsäkringar Global Index",
    "currentCost": 1.54,
    "suggestedCost": 0.22
  }
];

export const ALLOCATION: { label: string; weight: number }[] = [
  {
    "label": "Global",
    "weight": 60
  },
  {
    "label": "Sverige",
    "weight": 25
  },
  {
    "label": "Branschfonder",
    "weight": 15
  }
];

/** Andel av portföljvikten som ligger i aktivt förvaltade fonder. */
export const ACTIVE_SHARE = 100;

/** Kapitalet "kr per år"-siffran räknas på. */
export const ASSUMED_CAPITAL = 100000;

/** Skillnad i avgiftskostnad per år vid ASSUMED_CAPITAL. Endast avgift — ingen avkastningsprognos. */
export const FEE_SAVING_PER_YEAR = 827;

export type FundVideoData = {
  slug: string;
  name: string;
  category: string;
  fee: number;
  categoryAverageFee: number;
  alternativeName: string;
  alternativeFee: number;
};

/** Underlag till FeeVideo — en video per fond. Kategorisnitt räknat över hela datasetet. */
export const FUND_VIDEOS: FundVideoData[] = [
  {
    "slug": "swedbank-robur-sverige-a",
    "name": "Swedbank Robur Sverige A",
    "category": "Sverige",
    "fee": 1.32,
    "categoryAverageFee": 0.89,
    "alternativeName": "Avanza Zero",
    "alternativeFee": 0
  },
  {
    "slug": "lansforsakringar-global-vision-a",
    "name": "Länsförsäkringar Global Vision A",
    "category": "Global, Mix bolag",
    "fee": 1.54,
    "categoryAverageFee": 1.31,
    "alternativeName": "Avanza Global",
    "alternativeFee": 0.1
  }
];
