import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLOR } from "../theme";

type Props = {
  children: React.ReactNode;
  delay?: number;
  padding?: number;
};

/**
 * Vitt kort med hårlinjeram — samma form som sektionskorten på analyssidan
 * (rounded-xl, border #D9E0E6, mycket svag skugga), uppskalat för 1080 px bred
 * video. Poängen är att den som klickar sig in på sajten ska känna igen sig.
 */
export const Card: React.FC<Props> = ({ children, delay = 0, padding = 44 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 90, mass: 0.9 },
    durationInFrames: 24,
  });
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        background: COLOR.white,
        border: `2px solid ${COLOR.line}`,
        borderRadius: 28,
        padding,
        boxShadow: "0 2px 6px rgba(16,24,40,.05)",
        opacity,
        transform: `translateY(${(1 - enter) * 28}px)`,
      }}
    >
      {children}
    </div>
  );
};
