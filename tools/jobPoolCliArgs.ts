import type { JobSourceType, JobStatus } from '../job-pool/types.js';

export type JobPoolCommand = 'ingest' | 'list' | 'get';

export interface JobPoolIngestCliArgs {
  command: 'ingest';
  sourceUrl?: string;
  inputFilePath?: string;
  sourceType: JobSourceType;
  applyUrl?: string;
  company?: string;
  title?: string;
  location?: string;
  employmentType?: string;
  postedAt?: string;
  notes?: string;
  storePath?: string;
}

export interface JobPoolListCliArgs {
  command: 'list';
  status?: JobStatus;
  sourceType?: JobSourceType;
  limit?: number;
  storePath?: string;
}

export interface JobPoolGetCliArgs {
  command: 'get';
  jobId: string;
  storePath?: string;
}

export type JobPoolCliArgs = JobPoolIngestCliArgs | JobPoolListCliArgs | JobPoolGetCliArgs;

export const JOB_POOL_CLI_USAGE = `Usage:
  npm run tool:job-pool -- ingest (--url <job_url> | --input-file <path>) [--source-type manual|automated] [--apply-url <url>] [--company <name>] [--title <title>] [--location <location>] [--employment-type <type>] [--posted-at <iso_date>] [--notes <text>] [--store-path <path>]
  npm run tool:job-pool -- list [--status <status>] [--source-type manual|automated] [--limit <n>] [--store-path <path>]
  npm run tool:job-pool -- get --job-id <id> [--store-path <path>]`;

function parseCommand(token: string | undefined): JobPoolCommand {
  if (token === 'ingest' || token === 'list' || token === 'get') {
    return token;
  }
  throw new Error('Missing or invalid job-pool command, expected ingest|list|get');
}

export function parseJobPoolCliArgs(argv: string[]): JobPoolCliArgs {
  const command = parseCommand(argv[0]);

  if (command === 'ingest') {
    let sourceUrl: string | undefined;
    let inputFilePath: string | undefined;
    let sourceType: JobSourceType = 'manual';
    let applyUrl: string | undefined;
    let company: string | undefined;
    let title: string | undefined;
    let location: string | undefined;
    let employmentType: string | undefined;
    let postedAt: string | undefined;
    let notes: string | undefined;
    let storePath: string | undefined;

    for (let i = 1; i < argv.length; i += 1) {
      const token = argv[i];
      if (!token) continue;

      if (token === '--url') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --url');
        sourceUrl = value;
        continue;
      }
      if (token === '--input-file') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --input-file');
        inputFilePath = value;
        continue;
      }
      if (token === '--source-type') {
        const value = argv[++i] as JobSourceType | undefined;
        if (!value || !['manual', 'automated'].includes(value)) {
          throw new Error('Invalid --source-type, expected manual|automated');
        }
        sourceType = value;
        continue;
      }
      if (token === '--apply-url') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --apply-url');
        applyUrl = value;
        continue;
      }
      if (token === '--company') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --company');
        company = value;
        continue;
      }
      if (token === '--title') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --title');
        title = value;
        continue;
      }
      if (token === '--location') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --location');
        location = value;
        continue;
      }
      if (token === '--employment-type') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --employment-type');
        employmentType = value;
        continue;
      }
      if (token === '--posted-at') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --posted-at');
        postedAt = value;
        continue;
      }
      if (token === '--notes') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --notes');
        notes = value;
        continue;
      }
      if (token === '--store-path') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --store-path');
        storePath = value;
        continue;
      }

      throw new Error(`Unknown flag: ${token}`);
    }

    if (!sourceUrl && !inputFilePath) {
      throw new Error('Missing required --url or --input-file');
    }

    if (sourceUrl && inputFilePath) {
      throw new Error('Use only one of --url or --input-file');
    }

    return {
      command,
      inputFilePath,
      sourceUrl,
      sourceType,
      applyUrl,
      company,
      title,
      location,
      employmentType,
      postedAt,
      notes,
      storePath
    };
  }

  if (command === 'get') {
    let jobId: string | undefined;
    let storePath: string | undefined;

    for (let i = 1; i < argv.length; i += 1) {
      const token = argv[i];
      if (!token) continue;

      if (token === '--job-id') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --job-id');
        jobId = value;
        continue;
      }
      if (token === '--store-path') {
        const value = argv[++i];
        if (!value) throw new Error('Missing value for --store-path');
        storePath = value;
        continue;
      }

      throw new Error(`Unknown flag: ${token}`);
    }

    if (!jobId) {
      throw new Error('Missing required --job-id');
    }

    return {
      command,
      jobId,
      storePath
    };
  }

  let status: JobStatus | undefined;
  let sourceType: JobSourceType | undefined;
  let limit: number | undefined;
  let storePath: string | undefined;

  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token === '--status') {
      const value = argv[++i] as JobStatus | undefined;
      if (
        !value ||
        !['discovered', 'normalized', 'queued', 'attempting', 'applied', 'failed_retryable', 'failed_terminal', 'skipped'].includes(value)
      ) {
        throw new Error('Invalid --status');
      }
      status = value;
      continue;
    }
    if (token === '--source-type') {
      const value = argv[++i] as JobSourceType | undefined;
      if (!value || !['manual', 'automated'].includes(value)) {
        throw new Error('Invalid --source-type, expected manual|automated');
      }
      sourceType = value;
      continue;
    }
    if (token === '--limit') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --limit');
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('Invalid value for --limit');
      }
      limit = parsed;
      continue;
    }
    if (token === '--store-path') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --store-path');
      storePath = value;
      continue;
    }

    throw new Error(`Unknown flag: ${token}`);
  }

  return {
    command,
    status,
    sourceType,
    limit,
    storePath
  };
}
