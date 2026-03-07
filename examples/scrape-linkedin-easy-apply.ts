import { scrapeForm } from '../playwright/core/scrapeRunner.js';

async function main(): Promise<void> {
  const url = process.argv[2];
  const storageStatePath = process.argv[3];

  if (!url || !storageStatePath) {
    throw new Error('Usage: npm run scrape:linkedin -- <linkedin-job-url> <storage-state.json>');
  }

  const output = await scrapeForm({
    url,
    storageStatePath,
    headless: false,
    timeoutMs: 45_000,
    traceEnabled: true
  });

  console.log(JSON.stringify({
    status: output.result.status,
    artifactPath: output.artifactPath,
    note: 'LinkedIn scraping expects you to already be authenticated and on a usable Easy Apply state.'
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
