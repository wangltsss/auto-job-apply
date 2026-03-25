import { mutateJobPoolStore } from './store.js';
import type { FinalizeJobAttemptInput } from './types.js';

export async function finalizeJobAttempt(input: FinalizeJobAttemptInput, storePath?: string): Promise<{ storePath: string }> {
  const out = await mutateJobPoolStore((store) => {
    const job = store.jobs.find((entry) => entry.job_id === input.job_id);
    if (!job) {
      throw new Error(`Unknown job_id: ${input.job_id}`);
    }

    if (job.claimed_by_run_id !== input.run_id) {
      throw new Error(`Job ${input.job_id} is not claimed by run ${input.run_id}`);
    }

    job.attempt_count = input.attempt_number;
    job.status = input.outcome;
    job.claimed_by_run_id = null;
    job.claimed_at = null;
    job.next_attempt_at = input.outcome === 'failed_retryable' ? input.next_attempt_at ?? null : null;
    job.last_failure_code = input.failure_code ?? null;
    job.last_pipeline_artifact_path = input.pipeline_artifact_path;
    job.last_attempt_started_at = input.started_at;
    job.last_attempt_ended_at = input.ended_at;
    job.applied_at = input.outcome === 'applied' ? input.ended_at : job.applied_at;
  }, storePath);

  return {
    storePath: out.storePath
  };
}
