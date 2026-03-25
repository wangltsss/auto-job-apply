import type { RunStatus } from '../run-controller/types.js';

export type RunCommand = 'start-run' | 'query-run';

export interface StartRunCliArgs {
  command: 'start-run';
  targetSuccessCount: number;
  jobPoolPath?: string;
  runStorePath?: string;
  activeRunLockPath?: string;
  ledgerStorePath?: string;
  profilePath?: string;
  mockResponsePath?: string;
  storageStatePath?: string;
  headless: boolean;
  traceEnabled: boolean;
  dryRun: boolean;
  submit: boolean;
  cdpEndpoint?: string;
  mockExecution: boolean;
}

export interface QueryRunCliArgs {
  command: 'query-run';
  runId?: string;
  status?: RunStatus;
  limit?: number;
  runStorePath?: string;
}

export type RunCliArgs = StartRunCliArgs | QueryRunCliArgs;

export const RUN_CLI_USAGE = `Usage:
  npm run tool:run -- start-run --target-success-count <n> [--job-pool-path <path>] [--run-store-path <path>] [--active-run-lock-path <path>] [--ledger-store-path <path>] [--profile <path>] [--mock-response <path>] [--storage-state <path>] [--headed] [--no-trace] [--submit] [--mock-execution] [--cdp-endpoint <url>]
  npm run tool:run -- query-run [--run-id <id>] [--status active|completed|exhausted] [--limit <n>] [--run-store-path <path>]`;

function parseCommand(token: string | undefined): RunCommand {
  if (token === 'start-run' || token === 'query-run') {
    return token;
  }
  throw new Error('Missing or invalid run command, expected start-run|query-run');
}

export function parseRunCliArgs(argv: string[]): RunCliArgs {
  const command = parseCommand(argv[0]);

  if (command === 'start-run') {
    let targetSuccessCount: number | undefined;
    let jobPoolPath: string | undefined;
    let runStorePath: string | undefined;
    let activeRunLockPath: string | undefined;
    let ledgerStorePath: string | undefined;
    let profilePath: string | undefined;
    let mockResponsePath: string | undefined;
    let storageStatePath: string | undefined;
    let headless = true;
    let traceEnabled = true;
    let dryRun = true;
    let submit = false;
    let cdpEndpoint: string | undefined;
    let mockExecution = false;

    for (let i = 1; i < argv.length; i += 1) {
      const token = argv[i];
      if (!token) continue;

      if (token === '--target-success-count') {
        const value = argv[++i];
        const parsed = Number(value);
        if (!value || !Number.isInteger(parsed) || parsed <= 0) {
          throw new Error('Invalid value for --target-success-count');
        }
        targetSuccessCount = parsed;
        continue;
      }
      if (token === '--job-pool-path') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --job-pool-path');
        jobPoolPath = value;
        continue;
      }
      if (token === '--run-store-path') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --run-store-path');
        runStorePath = value;
        continue;
      }
      if (token === '--active-run-lock-path') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --active-run-lock-path');
        activeRunLockPath = value;
        continue;
      }
      if (token === '--ledger-store-path') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --ledger-store-path');
        ledgerStorePath = value;
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
        mockResponsePath = value;
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
        submit = false;
        dryRun = true;
        continue;
      }
      if (token === '--cdp-endpoint') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --cdp-endpoint');
        cdpEndpoint = value;
        continue;
      }
      if (token === '--mock-execution') {
        mockExecution = true;
        continue;
      }

      throw new Error(`Unknown flag: ${token}`);
    }

    if (!targetSuccessCount) {
      throw new Error('Missing required --target-success-count');
    }

    return {
      command,
      targetSuccessCount,
      jobPoolPath,
      runStorePath,
      activeRunLockPath,
      ledgerStorePath,
      profilePath,
      mockResponsePath,
      storageStatePath,
      headless,
      traceEnabled,
      dryRun,
      submit,
      cdpEndpoint,
      mockExecution
    };
  }

  let runId: string | undefined;
  let status: RunStatus | undefined;
  let limit: number | undefined;
  let runStorePath: string | undefined;

  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token === '--run-id') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --run-id');
      runId = value;
      continue;
    }
    if (token === '--status') {
      const value = argv[++i] as RunStatus | undefined;
      if (!value || !['active', 'completed', 'exhausted'].includes(value)) {
        throw new Error('Invalid --status, expected active|completed|exhausted');
      }
      status = value;
      continue;
    }
    if (token === '--limit') {
      const value = argv[++i];
      const parsed = Number(value);
      if (!value || !Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('Invalid value for --limit');
      }
      limit = parsed;
      continue;
    }
    if (token === '--run-store-path') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --run-store-path');
      runStorePath = value;
      continue;
    }

    throw new Error(`Unknown flag: ${token}`);
  }

  return {
    command,
    runId,
    status,
    limit,
    runStorePath
  };
}
