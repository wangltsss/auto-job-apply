import { loadRunControllerStore } from './store.js';
import type { RunRecord, RunStatus } from './types.js';

export async function getRun(runId: string, storePath?: string): Promise<RunRecord | null> {
  const store = await loadRunControllerStore(storePath);
  return store.runs.find((run) => run.run_id === runId) ?? null;
}

export async function listRuns(
  options: { status?: RunStatus; limit?: number } = {},
  storePath?: string
): Promise<RunRecord[]> {
  const store = await loadRunControllerStore(storePath);

  return store.runs
    .filter((run) => (options.status ? run.status === options.status : true))
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, options.limit ?? store.runs.length);
}
