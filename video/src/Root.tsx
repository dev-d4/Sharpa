import React from "react";
import { Composition } from "remotion";
import { PortfolioVideo, PORTFOLIO_DURATION } from "./PortfolioVideo";
import { FeeVideo, FEE_DURATION } from "./FeeVideo";
import { VIDEO } from "./theme";
import { FUNDS } from "./data/funds";
import { PORTFOLIO_SCREENCAST, PORTFOLIO_SCREENCAST_START } from "./data/portfolio";

/**
 * PortfolioVideo är huvudformatet — hela analysen: betyg, nyckeltal och
 * förbättringsförslag. FeeVideo är sidoformatet för en video per fond.
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="PortfolioVideo"
      component={PortfolioVideo}
      durationInFrames={PORTFOLIO_DURATION}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={{
        screencast: PORTFOLIO_SCREENCAST,
        screencastStartFrom: PORTFOLIO_SCREENCAST_START,
      }}
    />
    <Composition
      id="FeeVideo"
      component={FeeVideo}
      durationInFrames={FEE_DURATION}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={FUNDS[0]}
    />
  </>
);
