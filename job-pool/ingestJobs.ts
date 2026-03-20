import { loadJobPoolStore, writeJobPoolStore } from './store.js';
import { normalizeJobPosting } from './normalizeJobPosting.js';
import type { IngestJobInput, IngestJobResult, JobPostingRecord } from './types.js';

function findDuplicate(jobs: JobPostingRecord[], candidate: JobPostingRecord): JobPostingRecord | null {
  const canonicalMatch = jobs.find((job) => job.canonical_job_url === candidate.canonical_job_url);
  if (canonicalMatch) {
    return canonicalMatch;
  }

  const dedupeMatch = jobs.find((job) => job.dedupe_key === candidate.dedupe_key);
  if (dedupeMatch) {
    return dedupeMatch;
  }

  const tupleMatch = jobs.find(
    (job) =>
      job.apply_url === candidate.apply_url &&
      job.company === candidate.company &&
      job.title === candidate.title &&
      job.location === candidate.location
  );

  return tupleMatch ?? null;
}

export async function ingestJobs(inputs: IngestJobInput[], storePath?: string): Promise<{ results: IngestJobResult[]; storePath: string }> {
  const store = await loadJobPoolStore(storePath);
  const results: IngestJobResult[] = [];

  for (const input of inputs) {
    const normalized = normalizeJobPosting(input);
    const duplicate = findDuplicate(store.jobs, normalized);

    if (duplicate) {
      results.push({
        inserted: false,
        duplicate: true,
        job: duplicate
      });
      continue;
    }

    store.jobs.push(normalized);
    results.push({
      inserted: true,
      duplicate: false,
      job: normalized
    });
  }

  const writtenPath = await writeJobPoolStore(store, storePath);
  return {
    results,
    storePath: writtenPath
  };
}
