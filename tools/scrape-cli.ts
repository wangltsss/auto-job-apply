import { runScrape } from '../orchestration/runScrape.js';

function parseArgs(argv: string[]): { url: string; storageStatePath?: string; headless: boolean; traceEnabled: boolean; timeoutMs?: number } {
  let url = '';
  let storageStatePath: string | undefined;
  let headless = true;
  let traceEnabled = true;
  let timeoutMs: number | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token === '--url') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --url');
      url = value;
      continue;
    }
    if (token === '--storage-state') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --storage-state');
      storageStatePath = value;
      continue;
    }
    if (token === '--headed') {
      headless = false;
      continue;
    }
    if (token === '--headless') {
      headless = true;
      continue;
    }
    if (token === '--trace') {
      traceEnabled = true;
      continue;
    }
    if (token === '--no-trace') {
      traceEnabled = false;
      continue;
    }
    if (token === '--timeout-ms') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --timeout-ms');
      timeoutMs = Number(value);
      continue;
    }
    throw new Error(`Unknown flag: ${token}`);
  }

  if (!url) {
    throw new Error('Missing required --url');
  }

  return { url, storageStatePath, headless, traceEnabled, timeoutMs };
}

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    const output = await runScrape(args);
    const scrapeUrl = output.scrapeResult.status === 'success' ? output.scrapeResult.url : output.scrapeResult.current_url;
    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        stage: output.stage,
        scrape_artifact_path: output.scrapeArtifactPath,
        scrape_status: output.scrapeResult.status,
        url: scrapeUrl
      })}\n`
    );
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      })}\n`
    );
    process.exitCode = 1;
  }
}

main();
