import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { nowIso } from '../playwright/utils/text.js';
import { withFileLock } from '../playwright/utils/fileLock.js';
import type { JobPoolStore, JobPostingRecord } from './types.js';

export const DEFAULT_JOB_POOL_PATH = 'artifacts/job-pool/jobs.json';

function buildEmptyStore(): JobPoolStore {
  return {
    version: 1,
    updated_at: nowIso(),
    jobs: []
  };
}

function hydrateJob(job: Partial<JobPostingRecord>): JobPostingRecord {
  return {
    job_id: job.job_id ?? '',
    source_type: job.source_type ?? 'manual',
    source_url: job.source_url ?? '',
    canonical_job_url: job.canonical_job_url ?? '',
    apply_url: job.apply_url ?? '',
    company: job.company ?? null,
    title: job.title ?? null,
    location: job.location ?? null,
    employment_type: job.employment_type ?? null,
    posted_at: job.posted_at ?? null,
    discovered_at: job.discovered_at ?? nowIso(),
    status: job.status ?? 'queued',
    attempt_count: job.attempt_count ?? 0,
    claimed_by_run_id: job.claimed_by_run_id ?? null,
    claimed_at: job.claimed_at ?? null,
    next_attempt_at: job.next_attempt_at ?? null,
    last_failure_code: job.last_failure_code ?? null,
    last_pipeline_artifact_path: job.last_pipeline_artifact_path ?? null,
    last_attempt_started_at: job.last_attempt_started_at ?? null,
    last_attempt_ended_at: job.last_attempt_ended_at ?? null,
    applied_at: job.applied_at ?? null,
    dedupe_key: job.dedupe_key ?? '',
    notes: job.notes ?? null,
    raw_payload: job.raw_payload ?? {}
  };
}

export async function loadJobPoolStore(storePath = DEFAULT_JOB_POOL_PATH): Promise<JobPoolStore> {
  const resolvedPath = resolve(storePath);

  try {
    const raw = await readFile(resolvedPath, 'utf-8');
    const parsed = JSON.parse(raw) as JobPoolStore;
    return {
      version: 1,
      updated_at: parsed.updated_at ?? nowIso(),
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs.map((job) => hydrateJob(job)) : []
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return buildEmptyStore();
    }
    throw error;
  }
}

export async function writeJobPoolStore(store: JobPoolStore, storePath = DEFAULT_JOB_POOL_PATH): Promise<string> {
  const resolvedPath = resolve(storePath);
  const resolvedDir = resolve(resolvedPath, '..');
  const tempPath = `${resolvedPath}.tmp`;

  await mkdir(resolvedDir, { recursive: true });

  const nextStore: JobPoolStore = {
    version: 1,
    updated_at: nowIso(),
    jobs: store.jobs
  };

  await writeFile(tempPath, `${JSON.stringify(nextStore, null, 2)}\n`, 'utf-8');
  await rename(tempPath, resolvedPath);
  return resolvedPath;
}

export async function mutateJobPoolStore<T>(
  mutator: (store: JobPoolStore) => Promise<T> | T,
  storePath = DEFAULT_JOB_POOL_PATH
): Promise<{ result: T; storePath: string }> {
  const resolvedPath = resolve(storePath);
  const lockPath = `${resolvedPath}.lock`;

  return withFileLock(lockPath, async () => {
    const store = await loadJobPoolStore(storePath);
    const result = await mutator(store);
    const writtenPath = await writeJobPoolStore(store, storePath);
    return {
      result,
      storePath: writtenPath
    };
  });
}
