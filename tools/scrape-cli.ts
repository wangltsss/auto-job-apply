import { runScrape } from '../orchestration/runScrape.js';
import { buildFailureEnvelope, buildSuccessEnvelope, hasHelpFlag, isDirectExecution, writeJsonLine } from './cliShared.js';
import { parseScrapeCliArgs, SCRAPE_CLI_USAGE } from './scrapeCliArgs.js';

export async function runScrapeCli(
  argv: string[],
  stdout: NodeJS.WriteStream = process.stdout,
  stderr: NodeJS.WriteStream = process.stderr
): Promise<number> {
  if (hasHelpFlag(argv)) {
    stdout.write(`${SCRAPE_CLI_USAGE}\n`);
    return 0;
  }

  try {
    const args = parseScrapeCliArgs(argv);
    const output = await runScrape(args);
    const scrapeUrl = output.scrapeResult.status === 'success' ? output.scrapeResult.url : output.scrapeResult.current_url;
    writeJsonLine(
      buildSuccessEnvelope('scrape', { scrape_artifact_path: output.scrapeArtifactPath }, {
        scrape_status: output.scrapeResult.status,
        url: scrapeUrl
      }),
      stdout
    );
    return 0;
  } catch (error) {
    writeJsonLine(buildFailureEnvelope(error, 'scrape'), stderr);
    return 1;
  }
}

async function main(): Promise<void> {
  process.exitCode = await runScrapeCli(process.argv.slice(2));
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  void main();
}
