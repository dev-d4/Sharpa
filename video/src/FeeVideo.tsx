import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { COLOR } from "./theme";
import { Chrome, type SceneSpec } from "./primitives/Chrome";
import { calculateFeeGap } from "./lib/fee";
import type { FundVideoInput } from "./data/funds";
import { FundIntro } from "./scenes/FundIntro";
import { FeeTicker } from "./scenes/FeeTicker";
import { Divergence } from "./scenes/Divergence";
import { PhoneProof } from "./scenes/PhoneProof";
import { Alternatives } from "./scenes/Alternatives";
import { Outro } from "./scenes/Outro";

/**
 * Sidoformatet: en video per fond, 33 sekunder. Bygger på samma primitiver som
 * PortfolioVideo men håller sig till en enda fonds avgift.
 *
 * Ordningen är fast med avsikt — igenkänningen mellan videor är halva formatet.
 * Hårda klipp, ingen crossfade.
 */
export const SCENES = [
  { name: "intro", from: 0, duration: 120, dark: true },
  { name: "ticker", from: 120, duration: 180, dark: true },
  { name: "divergence", from: 300, duration: 210, dark: false },
  { name: "proof", from: 510, duration: 180, dark: false },
  { name: "alternatives", from: 690, duration: 180, dark: false },
  { name: "outro", from: 870, duration: 120, dark: true },
] as const satisfies readonly SceneSpec[];

export const FEE_DURATION = 990; // 33 s vid 30 fps

export const FeeVideo: React.FC<FundVideoInput> = (fund) => {
  const gap = calculateFeeGap(fund.fee);

  return (
    <AbsoluteFill style={{ background: COLOR.canvas }}>
      <Sequence from={SCENES[0].from} durationInFrames={SCENES[0].duration}>
        <FundIntro name={fund.name} fee={fund.fee} category={fund.category} />
      </Sequence>

      <Sequence from={SCENES[1].from} durationInFrames={SCENES[1].duration}>
        <FeeTicker gap={gap.gap} />
      </Sequence>

      <Sequence from={SCENES[2].from} durationInFrames={SCENES[2].duration}>
        <Divergence
          expensiveSeries={gap.expensiveSeries}
          cheapSeries={gap.cheapSeries}
          gap={gap.gap}
        />
      </Sequence>

      <Sequence from={SCENES[3].from} durationInFrames={SCENES[3].duration}>
        <PhoneProof
          screencast={fund.screencast}
          headline="Kolla din egen fond"
          sub="Sök på namnet. Tar under en minut."
        />
      </Sequence>

      <Sequence from={SCENES[4].from} durationInFrames={SCENES[4].duration}>
        <Alternatives
          name={fund.name}
          fee={fund.fee}
          categoryAverageFee={fund.categoryAverageFee}
          category={fund.category}
          alternativeName={fund.alternativeName}
          alternativeFee={fund.alternativeFee}
        />
      </Sequence>

      <Sequence from={SCENES[5].from} durationInFrames={SCENES[5].duration}>
        <Outro headline={["Jämför din fond", "på en minut."]} />
      </Sequence>

      <Chrome scenes={SCENES} />
    </AbsoluteFill>
  );
};
