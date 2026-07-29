/**
 * Genererar en ljudfil per replik i src/data/script.ts och skriver en manifest
 * som kompositionen läser.
 *
 *   npm run build:vo
 *
 * Rösten är macOS inbyggda svenska röst (Alva). Den duger för att höra om
 * manuset ligger i takt med bilden — den duger inte att publicera med. Byt ut
 * filerna i public/vo/ mot en riktig inspelning eller en betald TTS när
 * timingen sitter; filnamnen är det enda som spelar roll.
 *
 * Scriptet varnar när en replik är längre än sin scen, eller när tempot går
 * över 3 ord per sekund.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SCRIPT } from "../src/data/script";
import { SCENES } from "../src/PortfolioVideo";
import { VIDEO } from "../src/theme";

const ROOT = path.join(import.meta.dirname, "..");
const VO_DIR = path.join(ROOT, "public", "vo");
const VOICE = "Alva";
/** Ord per minut till `say`. 175 ligger nära en lugn svensk uppläsning. */
const RATE = 192;

/**
 * Läser längden ur WAV-huvudet. Remotions medföljande ffmpeg är avskalad och
 * saknar både mp3- och m4a-muxer, så vi stannar i WAV — då behövs inget
 * externt anrop bara för att mäta längden.
 */
function durationSeconds(file: string): number {
  const buf = fs.readFileSync(file);
  const byteRate = buf.readUInt32LE(28);

  // Hoppa fram till data-chunken; say skriver ibland extra chunkar före den.
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "data") return size / byteRate;
    offset += 8 + size + (size % 2);
  }
  throw new Error(`Hittar ingen data-chunk i ${file}`);
}

function main() {
  fs.rmSync(VO_DIR, { recursive: true, force: true });
  fs.mkdirSync(VO_DIR, { recursive: true });

  const manifest: Record<string, { file: string; delay: number }> = {};
  let warnings = 0;

  for (const line of SCRIPT) {
    const scene = SCENES.find((s) => s.name === line.scene);
    if (!scene) throw new Error(`Manuset pekar på en scen som inte finns: ${line.scene}`);

    const wav = path.join(VO_DIR, `${line.scene}.wav`);

    execFileSync("say", [
      "-v",
      VOICE,
      "-r",
      String(RATE),
      "--file-format=WAVE",
      "--data-format=LEI16@22050",
      "-o",
      wav,
      line.text,
    ]);

    const seconds = durationSeconds(wav);
    const delay = line.delay ?? 0;
    const sceneSeconds = scene.duration / VIDEO.fps;
    const availableSeconds = sceneSeconds - delay / VIDEO.fps;
    const words = line.text.split(/\s+/).length;
    const pace = words / seconds;

    const fits = seconds <= availableSeconds;
    const flag = !fits ? "  ⚠ FÖR LÅNG" : pace > 3 ? "  ⚠ jäktat tempo" : "";
    if (flag) warnings++;

    console.log(
      `${line.scene.padEnd(14)} ${seconds.toFixed(1)}s av ${availableSeconds.toFixed(1)}s  ` +
        `${words} ord  ${pace.toFixed(1)} ord/s${flag}`,
    );

    manifest[line.scene] = { file: `vo/${line.scene}.wav`, delay };
  }

  const out = `// GENERERAD FIL — ändra inte för hand.
// Skapad av scripts/build-voiceover.ts. Kör \`npm run build:vo\` för att uppdatera.

export type VoiceoverClip = { file: string; delay: number };

/** Nyckel = scennamn i PortfolioVideo. Saknas en scen spelas ingen replik. */
export const VOICEOVER: Record<string, VoiceoverClip> = ${JSON.stringify(manifest, null, 2)};
`;
  fs.writeFileSync(path.join(ROOT, "src", "data", "voiceover.generated.ts"), out);

  console.log(`\nSkrev ${Object.keys(manifest).length} repliker till public/vo/.`);
  if (warnings > 0) {
    console.log(`${warnings} replik(er) behöver kortas — se varningarna ovan.`);
  }
}

main();
