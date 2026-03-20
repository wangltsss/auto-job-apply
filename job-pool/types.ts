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
