import React from "react";
import { Audio, Sequence, staticFile, interpolate } from "remotion";
import { VOICEOVER } from "../data/voiceover.generated";
import { MUSIC_TRACK, MUSIC_VOLUME, MUSIC_FADE } from "../data/audio";

/**
 * Speakerrepliken för en scen. Läggs inuti scenens <Sequence>, så den startar
 * när scenen klipps in — ingen tidsförskjutning att hålla i synk för hand.
 * Saknas repliken i manifestet renderas ingenting.
 */
export const SceneVoiceover: React.FC<{ scene: string }> = ({ scene }) => {
  const clip = VOICEOVER[scene];
  if (!clip) return null;
  return (
    <Sequence from={clip.delay}>
      <Audio src={staticFile(clip.file)} />
    </Sequence>
  );
};

/**
 * Musikbädden under hela videon, med toning i båda ändar. Ligger på en fast låg
 * nivå i stället för att duckas dynamiskt — rösten täcker nästan hela videon
 * ändå, så en ducker hade bara pumpat.
 */
export const MusicBed: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  if (!MUSIC_TRACK) return null;
  return (
    <Audio
      src={staticFile(MUSIC_TRACK)}
      volume={(frame) =>
        interpolate(
          frame,
          [0, MUSIC_FADE, durationInFrames - MUSIC_FADE, durationInFrames],
          [0, MUSIC_VOLUME, MUSIC_VOLUME, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      }
    />
  );
};
