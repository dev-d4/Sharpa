import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  staticFile,
  OffthreadVideo,
} from "remotion";
import { COLOR } from "../theme";
import { BODY } from "../lib/fonts";

type Props = {
  /** Sökväg relativt video/public/. Utelämnad → platshållare. */
  src?: string;
  delay?: number;
  width?: number;
  /** Hoppa in i inspelningen, i bildrutor. Låt de tråkiga sekunderna i början vara. */
  startFrom?: number;
};

const ASPECT = 19.5 / 9;
const BEZEL = 14;

/**
 * Telefonram med skärminspelningen inuti. Ligger medvetet i mitten av videon,
 * aldrig först och aldrig sist: animationen gör påståendet, inspelningen är
 * beviset att det kommer ur ett riktigt verktyg med riktig data.
 */
export const PhoneFrame: React.FC<Props> = ({ src, delay = 0, width = 480, startFrom = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 70, mass: 1.1 },
    durationInFrames: 30,
  });

  const height = width * ASPECT;
  const screenWidth = width - BEZEL * 2;

  return (
    <div
      style={{
        width,
        height,
        transform: `translateX(${(1 - enter) * 340}px) scale(${0.86 + enter * 0.14})`,
        opacity: enter,
        background: COLOR.ink,
        borderRadius: 52,
        padding: BEZEL,
        boxShadow: "0 30px 80px rgba(23,33,43,.22)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: screenWidth,
          height: height - BEZEL * 2,
          borderRadius: 40,
          overflow: "hidden",
          background: COLOR.canvas,
        }}
      >
        {src ? (
          <OffthreadVideo
            src={staticFile(src)}
            muted
            trimBefore={startFrom}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 32,
              textAlign: "center",
              fontFamily: BODY,
              fontSize: 22,
              lineHeight: 1.5,
              color: COLOR.ink4,
              border: `2px dashed ${COLOR.line}`,
              borderRadius: 40,
              boxSizing: "border-box",
            }}
          >
            Skärminspelning saknas — lägg en mp4 i video/public/screencasts/ och
            peka ut den med fältet screencast.
          </div>
        )}

        {/* Dynamic island */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            width: 108,
            height: 30,
            borderRadius: 999,
            background: COLOR.ink,
          }}
        />
      </div>
    </div>
  );
};
