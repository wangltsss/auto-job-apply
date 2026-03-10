import { resolve } from 'node:path';

export interface ExecutorCliArgs {
  extractedFormPath: string;
  answerPlanPath: string;
  storageStatePath?: string;
  headless: boolean;
  dryRun: boolean;
  attemptSubmit: boolean;
  traceEnabled: boolean;
  mockMode: boolean;
  cdpEndpoint?: string;
}

export function parseExecutorCliArgs(argv: string[]): ExecutorCliArgs {
  let extractedFormPath = resolve('examples/fixtures/extracted-form.sample.json');
  let answerPlanPath = resolve('examples/fixtures/answer-plan.sample.json');
  let storageStatePath: string | undefined;
  let headless = true;
  let dryRun = true;
  let traceEnabled = true;
  let mockMode = false;
  let cdpEndpoint: string | undefined;

  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) {
      continue;
    }

    if (token === '--storage-state') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --storage-state');
      }
      storageStatePath = resolve(value);
      i += 1;
      continue;
    }

    if (token === '--cdp-endpoint') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --cdp-endpoint');
      }
      cdpEndpoint = value;
      i += 1;
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
    if (token === '--submit') {
      dryRun = false;
      continue;
    }
    if (token === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (token === '--no-trace') {
      traceEnabled = false;
      continue;
    }
    if (token === '--trace') {
      traceEnabled = true;
      continue;
    }
    if (token === '--mock') {
      mockMode = true;
      continue;
    }
    if (token.startsWith('--')) {
      throw new Error(`Unknown flag: ${token}`);
    }

    positional.push(token);
  }

  if (positional[0]) {
    extractedFormPath = resolve(positional[0]);
  }
  if (positional[1]) {
    answerPlanPath = resolve(positional[1]);
  }

  return {
    extractedFormPath,
    answerPlanPath,
    storageStatePath,
    headless,
    dryRun,
    attemptSubmit: !dryRun,
    traceEnabled,
    mockMode,
    cdpEndpoint
  };
}
