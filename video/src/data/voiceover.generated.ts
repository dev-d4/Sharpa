// GENERERAD FIL — ändra inte för hand.
// Skapad av scripts/build-voiceover.ts. Kör `npm run build:vo` för att uppdatera.

export type VoiceoverClip = { file: string; delay: number };

/** Nyckel = scennamn i PortfolioVideo. Saknas en scen spelas ingen replik. */
export const VOICEOVER: Record<string, VoiceoverClip> = {
  "hook": {
    "file": "vo/hook.wav",
    "delay": 8
  },
  "holdings": {
    "file": "vo/holdings.wav",
    "delay": 10
  },
  "score": {
    "file": "vo/score.wav",
    "delay": 10
  },
  "metrics": {
    "file": "vo/metrics.wav",
    "delay": 10
  },
  "proof": {
    "file": "vo/proof.wav",
    "delay": 10
  },
  "improvements": {
    "file": "vo/improvements.wav",
    "delay": 10
  },
  "outro": {
    "file": "vo/outro.wav",
    "delay": 12
  }
};
