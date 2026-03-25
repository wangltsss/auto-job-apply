import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { nowIso } from '../playwright/utils/text.js';
import type { ApplicationLedgerStore } from './types.js';

export const DEFAULT_APPLICATION_LEDGER_PATH = 'artifacts/application-ledger/ledger.json';

function resolveLedgerPath(storePath?: string): string {
  return storePath ?? process.env.AUTO_APPLY_LEDGER_PATH ?? DEFAULT_APPLICATION_LEDGER_PATH;
}

function buildEmptyLedger(): ApplicationLedgerStore {
  return {
    version: 1,
    updated_at: nowIso(),
    attempts: [],
    successes: [],
    failures: [],
    clarifications: []
  };
}

export async function loadApplicationLedger(storePath = DEFAULT_APPLICATION_LEDGER_PATH): Promise<ApplicationLedgerStore> {
  const resolvedPath = resolve(resolveLedgerPath(storePath));

  try {
    const raw = await readFile(resolvedPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ApplicationLedgerStore>;
    return {
      version: 1,
      updated_at: parsed.updated_at ?? nowIso(),
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      successes: Array.isArray(parsed.successes) ? parsed.successes : [],
      failures: Array.isArray(parsed.failures) ? parsed.failures : [],
      clarifications: Array.isArray(parsed.clarifications) ? parsed.clarifications : []
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return buildEmptyLedger();
    }
    throw error;
  }
}

export async function writeApplicationLedger(store: ApplicationLedgerStore, storePath = DEFAULT_APPLICATION_LEDGER_PATH): Promise<string> {
  const resolvedPath = resolve(resolveLedgerPath(storePath));
  const tempPath = `${resolvedPath}.tmp`;

  await mkdir(dirname(resolvedPath), { recursive: true });

  const nextStore: ApplicationLedgerStore = {
    version: 1,
    updated_at: nowIso(),
    attempts: store.attempts,
    successes: store.successes,
    failures: store.failures,
    clarifications: store.clarifications
  };

  await writeFile(tempPath, `${JSON.stringify(nextStore, null, 2)}\n`, 'utf-8');
  await rename(tempPath, resolvedPath);
  return resolvedPath;
}
