import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { withFileLock } from '../playwright/utils/fileLock.js';
import { nowIso } from '../playwright/utils/text.js';
import type { RunControllerStore, RunRecord } from './types.js';

export const DEFAULT_RUN_STORE_PATH = 'artifacts/run-controller/runs.json';
export const DEFAULT_ACTIVE_RUN_LOCK_PATH = 'artifacts/run-controller/active-run.lock';

function buildEmptyStore(): RunControllerStore {
  return {
    version: 1,
    updated_at: nowIso(),
    runs: []
  };
}

export async function loadRunControllerStore(storePath = DEFAULT_RUN_STORE_PATH): Promise<RunControllerStore> {
  const resolvedPath = resolve(storePath);

  try {
    const raw = await readFile(resolvedPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<RunControllerStore>;
    return {
      version: 1,
      updated_at: parsed.updated_at ?? nowIso(),
      runs: Array.isArray(parsed.runs) ? (parsed.runs as RunRecord[]) : []
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return buildEmptyStore();
    }
    throw error;
  }
}

export async function writeRunControllerStore(store: RunControllerStore, storePath = DEFAULT_RUN_STORE_PATH): Promise<string> {
  const resolvedPath = resolve(storePath);
  const tempPath = `${resolvedPath}.tmp`;

  await mkdir(dirname(resolvedPath), { recursive: true });

  const nextStore: RunControllerStore = {
    version: 1,
    updated_at: nowIso(),
    runs: store.runs
  };

  await writeFile(tempPath, `${JSON.stringify(nextStore, null, 2)}\n`, 'utf-8');
  await rename(tempPath, resolvedPath);
  return resolvedPath;
}

export async function upsertRunRecord(runRecord: RunRecord, storePath = DEFAULT_RUN_STORE_PATH): Promise<string> {
  const store = await loadRunControllerStore(storePath);
  const index = store.runs.findIndex((entry) => entry.run_id === runRecord.run_id);

  if (index === -1) {
    store.runs.push(runRecord);
  } else {
    store.runs[index] = runRecord;
  }

  return writeRunControllerStore(store, storePath);
}

export async function withActiveRunLock<T>(
  action: () => Promise<T>,
  lockPath = DEFAULT_ACTIVE_RUN_LOCK_PATH
): Promise<T> {
  return withFileLock(resolve(lockPath), action, 1_000);
}

export async function clearActiveRunLock(lockPath = DEFAULT_ACTIVE_RUN_LOCK_PATH): Promise<void> {
  await rm(resolve(lockPath), { force: true }).catch(() => undefined);
}
