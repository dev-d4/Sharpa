import { SCENES } from "../PortfolioVideo";

/**
 * Speakermanus, en replik per scen.
 *
 * Repliken spelas inifrån sin egen <Sequence>, så den startar automatiskt när
 * scenen klipps in — ingen manuell tidsförskjutning att hålla i synk.
 *
 * Regler för texten:
 * - Den ska beskriva det som faktiskt syns i bild, inte något annat.
 * - Aldrig köp- eller säljuppmaningar. "Du får alternativ" går bra,
 *   "byt till den här" är investeringsrådgivning.
 * - Sikta på 2,4–2,7 ord per sekund. Över 3 låter jäktat och lämnar ingen
 *   luft vid klippen. `npm run build:vo` varnar om en replik inte får plats.
 */
export type ScriptLine = {
  /** Måste matcha ett scennamn i PortfolioVideo. */
  scene: (typeof SCENES)[number]["name"];
  text: string;
  /** Fördröjning in i scenen innan repliken börjar, i bildrutor. */
  delay?: number;
};

export const SCRIPT: ScriptLine[] = [
  {
    scene: "hook",
    text: "Fyra fonder hos banken. Men hur bra är de egentligen?",
    delay: 8,
  },
  {
    scene: "holdings",
    text: "Det här är en helt vanlig bankportfölj. Fyra aktivt förvaltade fonder, alla med avgifter över 1,3 procent.",
    delay: 10,
  },
  {
    scene: "score",
    text: "Sharpa ger den 6,3 av tio. Spridningen är bra. Men avgiften är hög, och allt är aktivt förvaltat.",
    delay: 10,
  },
  {
    scene: "metrics",
    text: "Alla nyckeltal på ett ställe. Avgift, avkastning, risk, och hur portföljen är fördelad.",
    delay: 10,
  },
  {
    scene: "proof",
    text: "Du söker upp en fond, eller klistrar in hela portföljen. Det tar ett par minuter.",
    delay: 10,
  },
  {
    scene: "improvements",
    text: "Du får alternativ i samma kategorier. Betyget går från 6,3 till 7,5, och avgiften ner 827 kronor om året.",
    delay: 10,
  },
  {
    scene: "outro",
    text: "Gratis, utan provision. Sharpa punkt se.",
    delay: 12,
  },
];
