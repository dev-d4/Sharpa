/**
 * Renderar båda formaten.
 *
 *   npm run batch              portföljvideon + en video per fond
 *   npm run batch -- portfolj  bara portföljvideon
 *   npm run batch -- fonder    bara fondvideorna
 *   npm run batch -- swedbank  bara fondvideor vars slugg matchar
 *
 * Bundlar en gång och renderar många — därför det här scriptet i stället för en
 * loop över `remotion render`, som hade byggt om projektet för varje video.
 */
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { FUNDS } from "../src/data/funds";
import { PORTFOLIO_SCREENCAST, PORTFOLIO_SCREENCAST_START } from "../src/data/portfolio";

const ROOT = path.join(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "out");

type Job = {
  compositionId: string;
  outputName: string;
  inputProps: Record<string, unknown>;
  screencast?: string;
};

function warnIfMissingScreencast(job: Job) {
  // Renderingen kraschar inte på en saknad inspelning — telefonramen visar en
  // platshållare — men det ska inte gå att missa innan uppladdning.
  if (!job.screencast) {
    console.warn(`  ⚠ ${job.outputName}: ingen skärminspelning angiven, platshållare renderas.`);
  } else if (!fs.existsSync(path.join(ROOT, "public", job.screencast))) {
    console.warn(`  ⚠ ${job.outputName}: hittar inte public/${job.screencast}, platshållare renderas.`);
  }
}

function buildJobs(filter?: string): Job[] {
  const portfolio: Job = {
    compositionId: "PortfolioVideo",
    outputName: "portfoljanalys",
    inputProps: {
      screencast: PORTFOLIO_SCREENCAST,
      screencastStartFrom: PORTFOLIO_SCREENCAST_START,
    },
    screencast: PORTFOLIO_SCREENCAST,
  };

  const fundJobs: Job[] = FUNDS.map((fund) => ({
    compositionId: "FeeVideo",
    outputName: fund.slug,
    inputProps: fund as unknown as Record<string, unknown>,
    screencast: fund.screencast,
  }));

  if (!filter) return [portfolio, ...fundJobs];
  if (filter === "portfolj") return [portfolio];
  if (filter === "fonder") return fundJobs;

  const needle = filter.toLowerCase();
  return fundJobs.filter(
    (j) => j.outputName.includes(needle) || String(j.inputProps.name).toLowerCase().includes(needle),
  );
}

async function main() {
  const jobs = buildJobs(process.argv[2]);

  if (jobs.length === 0) {
    console.error(`Inget matchar "${process.argv[2]}".`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Bundlar…");
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, "src", "index.ts"),
    publicDir: path.join(ROOT, "public"),
  });

  for (const [i, job] of jobs.entries()) {
    warnIfMissingScreencast(job);

    const composition = await selectComposition({
      serveUrl,
      id: job.compositionId,
      inputProps: job.inputProps,
    });

    let lastLogged = -1;
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      crf: 18,
      inputProps: job.inputProps,
      outputLocation: path.join(OUT_DIR, `${job.outputName}.mp4`),
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct >= lastLogged + 25) {
          lastLogged = pct;
          console.log(`  ${job.outputName} ${pct} %`);
        }
      },
    });

    console.log(`  ✓ ${i + 1}/${jobs.length}  out/${job.outputName}.mp4`);
  }

  console.log(
    `\nKlart. Lägg på ett trending sound i TikTok-appen vid uppladdning — ` +
      `ljudet ska väljas där, inte bakas in här.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
