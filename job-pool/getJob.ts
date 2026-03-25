import { loadJobPoolStore } from './store.js';
import type { JobPostingRecord } from './types.js';

export async function getJob(jobId: string, storePath?: string): Promise<JobPostingRecord | null> {
  const store = await loadJobPoolStore(storePath);
  return store.jobs.find((job) => job.job_id === jobId) ?? null;
}
