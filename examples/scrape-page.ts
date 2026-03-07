import { scrapeForm } from '../playwright/core/scrapeRunner.js';

async function main(): Promise<void> {
  const url = process.argv[2];
  if (!url) {
    throw new Error('Usage: npm run scrape -- <job-application-url> [storage-state.json]');
  }

  const storageStatePath = process.argv[3];
  const output = await scrapeForm({
    url,
    storageStatePath,
    headless: true,
    timeoutMs: 30_000,
    traceEnabled: true
  });

  console.log(JSON.stringify({
    status: output.result.status,
    ats: 'ats' in output.result ? output.result.ats : output.result.ats_guess,
    artifactPath: output.artifactPath
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
