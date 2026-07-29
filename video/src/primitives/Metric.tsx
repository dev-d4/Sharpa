import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLOR } from "../theme";
import { BODY } from "../lib/fonts";
import { TickingNumber } from "./TickingNumber";

type Props = {
  label: string;
  value: number;
  format: (n: number) => string;
  sub: string;
  delay?: number;
  valueColor?: string;
};

/**
 * En ruta i nyckeltalsrutnätet — etikett, stort tal, underrad. Motsvarar
 * <Metric> i app/analyze/AnalyzeClient.tsx.
 */
export const Metric: React.FC<Props> = ({
  label,
  value,
  format,
  sub,
  delay = 0,
  valueColor = COLOR.ink,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ opacity }}>
      <div style={{ fontFamily: BODY, fontSize: 24, fontWeight: 500, color: COLOR.ink3 }}>
        {label}
      </div>
      <TickingNumber
        value={value}
        delay={delay}
        durationInFrames={26}
        format={format}
        style={{
          display: "block",
          marginTop: 6,
          fontSize: 54,
          fontWeight: 700,
          lineHeight: 1.1,
          color: valueColor,
        }}
      />
      <div style={{ fontFamily: BODY, fontSize: 22, fontWeight: 400, color: COLOR.ink4, marginTop: 2 }}>
        {sub}
      </div>
    </div>
  );
};
