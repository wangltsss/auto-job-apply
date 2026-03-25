import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { nowIso } from '../playwright/utils/text.js';
import type { IncidentManagerStore } from './types.js';

export const DEFAULT_INCIDENT_STORE_PATH = 'artifacts/incidents/incidents.json';

function buildEmptyStore(): IncidentManagerStore {
  return {
    version: 1,
    updated_at: nowIso(),
    events: [],
    incidents: []
  };
}

export async function loadIncidentStore(storePath = DEFAULT_INCIDENT_STORE_PATH): Promise<IncidentManagerStore> {
  const resolvedPath = resolve(storePath);

  try {
    const raw = await readFile(resolvedPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<IncidentManagerStore>;
    return {
      version: 1,
      updated_at: parsed.updated_at ?? nowIso(),
      events: Array.isArray(parsed.events) ? parsed.events : [],
      incidents: Array.isArray(parsed.incidents) ? parsed.incidents : []
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return buildEmptyStore();
    }
    throw error;
  }
}

export async function writeIncidentStore(store: IncidentManagerStore, storePath = DEFAULT_INCIDENT_STORE_PATH): Promise<string> {
  const resolvedPath = resolve(storePath);
  const tempPath = `${resolvedPath}.${randomUUID()}.tmp`;

  await mkdir(dirname(resolvedPath), { recursive: true });

  const nextStore: IncidentManagerStore = {
    version: 1,
    updated_at: nowIso(),
    events: store.events,
    incidents: store.incidents
  };

  await writeFile(tempPath, `${JSON.stringify(nextStore, null, 2)}\n`, 'utf-8');
  await rename(tempPath, resolvedPath);
  return resolvedPath;
}
