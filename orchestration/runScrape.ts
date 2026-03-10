import { scrapeForm } from '../playwright/core/scrapeRunner.js';
import { OrchestrationError } from './errors.js';
import type { RunScrapeOptions, ScrapeStageOutput } from './types.js';

export async function runScrape(options: RunScrapeOptions): Promise<ScrapeStageOutput> {
  const output = await scrapeForm({
    url: options.url,
    storageStatePath: options.storageStatePath,
    headless: options.headless,
    traceEnabled: options.traceEnabled,
    timeoutMs: options.timeoutMs
  });

  if (output.result.status !== 'success') {
    throw new OrchestrationError('scrape_failed', 'Scrape stage failed', 'scrape', {
      scrapeStatus: output.result.status,
      reason: output.result.reason,
      artifactPath: output.artifactPath
    });
  }

  return {
    stage: 'scrape',
    scrapeArtifactPath: output.artifactPath,
    scrapeResult: output.result
  };
}
