import React from "react";
import { COLOR } from "../theme";
import { BODY } from "../lib/fonts";

/**
 * Versal sektionsetikett — samma typografiska mönster som analyssidans
 * "PORTFÖLJBETYG", "NYCKELTAL", "FÖRDELNING".
 */
export const SectionLabel: React.FC<{
  children: React.ReactNode;
  color?: string;
  marginBottom?: number;
}> = ({ children, color = COLOR.ink3, marginBottom = 18 }) => (
  <div
    style={{
      fontFamily: BODY,
      fontSize: 23,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color,
      marginBottom,
    }}
  >
    {children}
  </div>
);
