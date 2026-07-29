import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";

type Props = {
  children: React.ReactNode;
  /** Bildruta (relativt scenen) där texten börjar glida in. */
  delay?: number;
  damping?: number;
};

/**
 * Text som glider upp bakom en mask. Aldrig fade — fade läser som PowerPoint,
 * mask-reveal läser som redigerad video.
 */
export const MaskReveal: React.FC<Props> = ({ children, delay = 0, damping = 200 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping, stiffness: 120, mass: 0.7 },
    durationInFrames: 22,
  });

  return (
    <span style={{ display: "block", overflow: "hidden", paddingBottom: "0.12em" }}>
      <span
        style={{
          display: "block",
          transform: `translateY(${(1 - progress) * 105}%)`,
        }}
      >
        {children}
      </span>
    </span>
  );
};
