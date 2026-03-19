import { readFile } from 'node:fs/promises';
import type { PipelineMode } from '../orchestration/types.js';

export interface PipelineCliArgs {
  url: string;
  mode: PipelineMode;
  storageStatePath?: string;
  headless: boolean;
  traceEnabled: boolean;
  dryRun: boolean;
  submit: boolean;
  cdpEndpoint?: string;
  mockOpenClawRawOutputPath?: string;
  mockExecution: boolean;
  applicantProfile: Record<string, unknown>;
}

export const PIPELINE_CLI_USAGE = `Usage: npm run tool:pipeline -- --url <job_url> [--mode scrape|scrape-answer-plan|full] [--storage-state <path>] [--profile <path>] [--mock-response <path>] [--headed] [--headless] [--trace] [--no-trace] [--dry-run] [--submit] [--mock-execution] [--cdp-endpoint <url>]`;

export async function parsePipelineCliArgs(argv: string[]): Promise<PipelineCliArgs> {
  let url = '';
  let mode: PipelineMode = 'full';
  let storageStatePath: string | undefined;
  let headless = true;
  let traceEnabled = true;
  let dryRun = true;
  let submit = false;
  let cdpEndpoint: string | undefined;
  let mockOpenClawRawOutputPath: string | undefined;
  let mockExecution = false;
  let profilePath: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token === '--url') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --url');
      url = value;
      continue;
    }
    if (token === '--mode') {
      const value = argv[++i] as PipelineMode | undefined;
      if (!value || !['scrape', 'scrape-answer-plan', 'full'].includes(value)) {
        throw new Error('Invalid --mode, expected scrape|scrape-answer-plan|full');
      }
      mode = value;
      continue;
    }
    if (token === '--storage-state') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --storage-state');
      storageStatePath = value;
      continue;
    }
    if (token === '--profile') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --profile');
      profilePath = value;
      continue;
    }
    if (token === '--mock-response') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --mock-response');
      mockOpenClawRawOutputPath = value;
      continue;
    }
    if (token === '--cdp-endpoint') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --cdp-endpoint');
      cdpEndpoint = value;
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
    if (token === '--submit') {
      submit = true;
      dryRun = false;
      continue;
    }
    if (token === '--dry-run') {
      dryRun = true;
      submit = false;
      continue;
    }
    if (token === '--mock-execution') {
      mockExecution = true;
      continue;
    }

    throw new Error(`Unknown flag: ${token}`);
  }

  if (!url) {
    throw new Error('Missing required --url');
  }

  const applicantProfile = profilePath ? (JSON.parse(await readFile(profilePath, 'utf-8')) as Record<string, unknown>) : {};

  return {
    url,
    mode,
    storageStatePath,
    headless,
    traceEnabled,
    dryRun,
    submit,
    cdpEndpoint,
    mockOpenClawRawOutputPath,
    mockExecution,
    applicantProfile
  };
}
