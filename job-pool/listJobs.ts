import { loadJobPoolStore } from './store.js';
import type { JobPostingRecord, ListJobsOptions } from './types.js';

export async function listJobs(options: ListJobsOptions = {}, storePath?: string): Promise<JobPostingRecord[]> {
  const store = await loadJobPoolStore(storePath);

  return store.jobs
    .filter((job) => (options.status ? job.status === options.status : true))
    .filter((job) => (options.source_type ? job.source_type === options.source_type : true))
    .sort((a, b) => b.discovered_at.localeCompare(a.discovered_at))
    .slice(0, options.limit ?? store.jobs.length);
}
