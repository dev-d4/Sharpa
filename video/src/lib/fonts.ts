import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

// Samma två typsnitt som sajten: Manrope för rubriker, Inter för siffror
// (tabulära siffertecken — kritiskt när ett belopp tickar upp och inte får hoppa).
export const HEADING = loadManrope("normal", {
  weights: ["700", "800"],
  subsets: ["latin"],
}).fontFamily;

export const BODY = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
}).fontFamily;
