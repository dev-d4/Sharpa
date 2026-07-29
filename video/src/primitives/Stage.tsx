import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, SAFE } from "../theme";

type Props = {
  children: React.ReactNode;
  background?: string;
  /** Vertikal placering inom den säkra ytan. */
  justify?: "center" | "flex-start";
};

/**
 * Scenyta. All läsbar text ligger innanför SAFE, som håller sig undan TikToks
 * eget UI: knappraden till höger och bildtext/användarnamn nedtill.
 */
export const Stage: React.FC<Props> = ({
  children,
  background = COLOR.canvas,
  justify = "center",
}) => (
  <AbsoluteFill style={{ background }}>
    <AbsoluteFill
      style={{
        paddingTop: SAFE.top,
        paddingBottom: SAFE.bottom,
        paddingLeft: SAFE.left,
        paddingRight: SAFE.right,
        display: "flex",
        flexDirection: "column",
        justifyContent: justify,
      }}
    >
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
);
