export interface ScrapeCliArgs {
  url: string;
  storageStatePath?: string;
  headless: boolean;
  traceEnabled: boolean;
  timeoutMs?: number;
}

export const SCRAPE_CLI_USAGE = `Usage: npm run tool:scrape -- --url <job_url> [--storage-state <path>] [--headed] [--headless] [--trace] [--no-trace] [--timeout-ms <ms>]`;

export function parseScrapeCliArgs(argv: string[]): ScrapeCliArgs {
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
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('Invalid value for --timeout-ms');
      }
      timeoutMs = parsed;
      continue;
    }
    throw new Error(`Unknown flag: ${token}`);
  }

  if (!url) {
    throw new Error('Missing required --url');
  }

  return { url, storageStatePath, headless, traceEnabled, timeoutMs };
}
