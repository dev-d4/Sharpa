import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, ON_DARK, SAFE, DISCLAIMER } from "../theme";
import { BODY } from "../lib/fonts";

export type SceneSpec = {
  readonly name: string;
  readonly from: number;
  readonly duration: number;
  readonly dark: boolean;
};

/**
 * Beständigt lager över alla scener: märket uppe, friskrivningen nere.
 *
 * Ligger utanför scenerna av två skäl — det animeras inte om vid varje klipp,
 * och friskrivningen kan inte glömmas bort i ett enskilt klipp.
 */
export const Chrome: React.FC<{ scenes: readonly SceneSpec[] }> = ({ scenes }) => {
  const frame = useCurrentFrame();
  const scene = scenes.find((s) => frame >= s.from && frame < s.from + s.duration);
  const dark = scene?.dark ?? false;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 116,
          left: SAFE.left,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <svg width={40} height={40} viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="12" fill={COLOR.accent} />
          <path
            d="M20 40 L32 20 L44 40"
            stroke={COLOR.white}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          style={{
            fontFamily: BODY,
            fontSize: 30,
            fontWeight: 700,
            color: dark ? COLOR.white : COLOR.ink,
          }}
        >
          Sharpa
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 338,
          left: SAFE.left,
          right: SAFE.right,
          fontFamily: BODY,
          fontSize: 19,
          fontWeight: 400,
          lineHeight: 1.45,
          color: dark ? ON_DARK.muted : COLOR.ink2,
        }}
      >
        {DISCLAIMER}
      </div>
    </AbsoluteFill>
  );
};
