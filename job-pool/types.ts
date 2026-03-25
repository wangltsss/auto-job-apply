export type JobSourceType = 'manual' | 'automated';

export type JobStatus =
  | 'discovered'
  | 'normalized'
  | 'queued'
  | 'attempting'
  | 'applied'
  | 'failed_retryable'
  | 'failed_terminal'
  | 'skipped';

export interface JobPostingRecord {
  job_id: string;
  source_type: JobSourceType;
  source_url: string;
  canonical_job_url: string;
  apply_url: string;
  company: string | null;
  title: string | null;
  location: string | null;
  employment_type: string | null;
  posted_at: string | null;
  discovered_at: string;
  status: JobStatus;
  attempt_count: number;
  claimed_by_run_id: string | null;
  claimed_at: string | null;
  next_attempt_at: string | null;
  last_failure_code: string | null;
  last_pipeline_artifact_path: string | null;
  last_attempt_started_at: string | null;
  last_attempt_ended_at: string | null;
  applied_at: string | null;
  dedupe_key: string;
  notes: string | null;
  raw_payload: Record<string, unknown>;
}

export interface JobPoolStore {
  version: 1;
  updated_at: string;
  jobs: JobPostingRecord[];
}

export interface IngestJobInput {
  source_type?: JobSourceType;
  source_url: string;
  apply_url?: string;
  company?: string | null;
  title?: string | null;
  location?: string | null;
  employment_type?: string | null;
  posted_at?: string | null;
  notes?: string | null;
  raw_payload?: Record<string, unknown>;
}

export interface IngestJobResult {
  inserted: boolean;
  duplicate: boolean;
  job: JobPostingRecord;
}

export interface ListJobsOptions {
  status?: JobStatus;
  source_type?: JobSourceType;
  limit?: number;
}

export interface ClaimedJobRecord {
  job: JobPostingRecord;
  attempt_number: number;
}

export interface FinalizeJobAttemptInput {
  job_id: string;
  run_id: string;
  attempt_number: number;
  started_at: string;
  ended_at: string;
  pipeline_artifact_path: string;
  outcome: 'applied' | 'failed_retryable' | 'failed_terminal';
  failure_code?: string | null;
  next_attempt_at?: string | null;
}
