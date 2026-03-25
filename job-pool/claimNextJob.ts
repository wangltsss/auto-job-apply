import { nowIso } from '../playwright/utils/text.js';
import { mutateJobPoolStore } from './store.js';
import type { ClaimedJobRecord, JobPostingRecord } from './types.js';

function isClaimable(job: JobPostingRecord, currentTime: string): boolean {
  if (job.claimed_by_run_id) {
    return false;
  }

  if (job.status === 'queued') {
    return true;
  }

  if (job.status !== 'failed_retryable') {
    return false;
  }

  return job.next_attempt_at === null || job.next_attempt_at <= currentTime;
}

function compareJobs(a: JobPostingRecord, b: JobPostingRecord): number {
  const aReadyAt = a.next_attempt_at ?? a.discovered_at;
  const bReadyAt = b.next_attempt_at ?? b.discovered_at;

  if (aReadyAt !== bReadyAt) {
    return aReadyAt.localeCompare(bReadyAt);
  }

  return a.discovered_at.localeCompare(b.discovered_at);
}

export async function claimNextJob(runId: string, storePath?: string): Promise<{ claimed: ClaimedJobRecord | null; storePath: string }> {
  const claimedAt = nowIso();
  const out = await mutateJobPoolStore((store) => {
    const candidate = [...store.jobs]
      .filter((job) => isClaimable(job, claimedAt))
      .sort(compareJobs)[0];

    if (!candidate) {
      return null;
    }

    const job = store.jobs.find((entry) => entry.job_id === candidate.job_id);
    if (!job) {
      return null;
    }

    job.status = 'attempting';
    job.claimed_by_run_id = runId;
    job.claimed_at = claimedAt;
    job.last_attempt_started_at = claimedAt;

    return {
      job: { ...job },
      attempt_number: job.attempt_count + 1
    } satisfies ClaimedJobRecord;
  }, storePath);

  return {
    claimed: out.result,
    storePath: out.storePath
  };
}
