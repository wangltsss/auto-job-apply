import { readFile } from 'node:fs/promises';
import { getJob, ingestJobs, listJobs } from '../job-pool/index.js';
import type { IngestJobInput } from '../job-pool/types.js';
import { buildFailureEnvelope, buildSuccessEnvelope, hasHelpFlag, isDirectExecution, writeJsonLine } from './cliShared.js';
import { JOB_POOL_CLI_USAGE, parseJobPoolCliArgs } from './jobPoolCliArgs.js';

async function loadIngestInputsFromFile(inputFilePath: string): Promise<IngestJobInput[]> {
  const raw = JSON.parse(await readFile(inputFilePath, 'utf-8')) as IngestJobInput | IngestJobInput[];
  return Array.isArray(raw) ? raw : [raw];
}

export async function runJobPoolCli(
  argv: string[],
  stdout: NodeJS.WriteStream = process.stdout,
  stderr: NodeJS.WriteStream = process.stderr
): Promise<number> {
  if (hasHelpFlag(argv) || argv.length === 0) {
    stdout.write(`${JOB_POOL_CLI_USAGE}\n`);
    return 0;
  }

  try {
    const args = parseJobPoolCliArgs(argv);

    if (args.command === 'ingest') {
      const inputs =
        args.inputFilePath
          ? await loadIngestInputsFromFile(args.inputFilePath)
          : [
              {
                source_type: args.sourceType,
                source_url: args.sourceUrl ?? '',
                apply_url: args.applyUrl,
                company: args.company,
                title: args.title,
                location: args.location,
                employment_type: args.employmentType,
                posted_at: args.postedAt,
                notes: args.notes
              }
            ];

      const output = await ingestJobs(
        inputs,
        args.storePath
      );

      writeJsonLine(
        buildSuccessEnvelope(
          'job_pool',
          {},
          {
            command: 'ingest',
            store_path: output.storePath,
            ingested_count: output.results.filter((item) => item.inserted).length,
            duplicate_count: output.results.filter((item) => item.duplicate).length,
            jobs: output.results.map((item) => ({
              inserted: item.inserted,
              duplicate: item.duplicate,
              job_id: item.job.job_id,
              status: item.job.status,
              canonical_job_url: item.job.canonical_job_url
            }))
          }
        ),
        stdout
      );
      return 0;
    }

    if (args.command === 'get') {
      const job = await getJob(args.jobId, args.storePath);
      writeJsonLine(
        buildSuccessEnvelope(
          'job_pool',
          {},
          {
            command: 'get',
            found: Boolean(job),
            job
          }
        ),
        stdout
      );
      return job ? 0 : 1;
    }

    const jobs = await listJobs(
      {
        status: args.status,
        source_type: args.sourceType,
        limit: args.limit
      },
      args.storePath
    );

    writeJsonLine(
      buildSuccessEnvelope(
        'job_pool',
        {},
        {
          command: 'list',
          count: jobs.length,
          jobs
        }
      ),
      stdout
    );
    return 0;
  } catch (error) {
    writeJsonLine(buildFailureEnvelope(error, 'job_pool'), stderr);
    return 1;
  }
}

async function main(): Promise<void> {
  process.exitCode = await runJobPoolCli(process.argv.slice(2));
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  void main();
}
