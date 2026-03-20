import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { nowIso } from '../playwright/utils/text.js';
import type { JobPoolStore } from './types.js';

export const DEFAULT_JOB_POOL_PATH = 'artifacts/job-pool/jobs.json';

function buildEmptyStore(): JobPoolStore {
  return {
    version: 1,
    updated_at: nowIso(),
    jobs: []
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
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : []
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
