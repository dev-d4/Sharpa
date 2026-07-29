import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { COLOR } from "./theme";
import { Chrome, type SceneSpec } from "./primitives/Chrome";
import { SceneVoiceover, MusicBed } from "./primitives/SceneAudio";
import { Hook } from "./scenes/Hook";
import { Holdings } from "./scenes/Holdings";
import { ScoreCard } from "./scenes/ScoreCard";
import { KeyMetrics } from "./scenes/KeyMetrics";
import { PhoneProof } from "./scenes/PhoneProof";
import { Improvements } from "./scenes/Improvements";
import { Outro } from "./scenes/Outro";

/**
 * Huvudformatet: hela portföljanalysen på 52 sekunder.
 *
 * Scenlängderna är satta efter de uppmätta speakerreplikerna i
 * src/data/script.ts — varje scen rymmer sin replik plus knappt en sekunds
 * tystnad innan klippet. Ändrar du en replik: kör `npm run build:vo`, som
 * varnar om den inte längre får plats, och justera scenen här.
 *
 * Mörka scener ramar in frågan och uppmaningen; de ljusa scenerna däremellan
 * återanvänder analyssidans egna kortytor så att den som klickar sig in känner
 * igen sig.
 */
export const SCENES = [
  { name: "hook", from: 0, duration: 150, dark: true },
  { name: "holdings", from: 150, duration: 270, dark: false },
  { name: "score", from: 420, duration: 255, dark: false },
  { name: "metrics", from: 675, duration: 225, dark: false },
  { name: "proof", from: 900, duration: 195, dark: false },
  { name: "improvements", from: 1095, duration: 315, dark: false },
  { name: "outro", from: 1410, duration: 150, dark: true },
] as const satisfies readonly SceneSpec[];

export const PORTFOLIO_DURATION = 1560; // 52 s vid 30 fps

export type PortfolioVideoProps = {
  /** Skärminspelning relativt video/public/. Utelämnad → platshållare i ramen. */
  screencast?: string;
  /** Var i inspelningen klippet startar, i bildrutor. */
  screencastStartFrom?: number;
};

export const PortfolioVideo: React.FC<PortfolioVideoProps> = ({
  screencast,
  screencastStartFrom = 0,
}) => (
  <AbsoluteFill style={{ background: COLOR.canvas }}>
    <Sequence from={SCENES[0].from} durationInFrames={SCENES[0].duration}>
      <Hook />
      <SceneVoiceover scene="hook" />
    </Sequence>

    <Sequence from={SCENES[1].from} durationInFrames={SCENES[1].duration}>
      <Holdings />
      <SceneVoiceover scene="holdings" />
    </Sequence>

    <Sequence from={SCENES[2].from} durationInFrames={SCENES[2].duration}>
      <ScoreCard />
      <SceneVoiceover scene="score" />
    </Sequence>

    <Sequence from={SCENES[3].from} durationInFrames={SCENES[3].duration}>
      <KeyMetrics />
      <SceneVoiceover scene="metrics" />
    </Sequence>

    <Sequence from={SCENES[4].from} durationInFrames={SCENES[4].duration}>
      <PhoneProof screencast={screencast} screencastStartFrom={screencastStartFrom} />
      <SceneVoiceover scene="proof" />
    </Sequence>

    <Sequence from={SCENES[5].from} durationInFrames={SCENES[5].duration}>
      <Improvements />
      <SceneVoiceover scene="improvements" />
    </Sequence>

    <Sequence from={SCENES[6].from} durationInFrames={SCENES[6].duration}>
      <Outro />
      <SceneVoiceover scene="outro" />
    </Sequence>

    <Chrome scenes={SCENES} />
    <MusicBed durationInFrames={PORTFOLIO_DURATION} />
  </AbsoluteFill>
);
