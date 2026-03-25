import type { PipelineStage } from '../orchestration/types.js';

export type RunStatus = 'active' | 'completed' | 'exhausted';
export type FailureCategory =
  | 'transient_ui'
  | 'network'
  | 'session'
  | 'data'
  | 'reasoning'
  | 'uncertainty'
  | 'site_change'
  | 'policy'
  | 'duplicate'
  | 'unsupported'
  | 'terminal';

export interface RetryPolicy {
  max_attempts_per_job: number;
  retry_delays_ms: number[];
}

export interface RunAttemptRecord {
  attempt_id: string;
  job_id: string;
  application_url: string;
  attempt_number: number;
  started_at: string;
  ended_at: string;
  pipeline_artifact_path: string;
  final_status: 'success' | 'error';
  failure_stage: PipelineStage | null;
  failure_code: string | null;
  failure_category: FailureCategory | null;
  retryable: boolean;
  next_attempt_at: string | null;
  notes: string[];
}

export interface RunRecord {
  run_id: string;
  status: RunStatus;
  started_at: string;
  ended_at: string | null;
  target_success_count: number;
  success_count: number;
  attempt_count: number;
  retry_policy: RetryPolicy;
  attempts: RunAttemptRecord[];
  notes: string[];
}

export interface RunControllerStore {
  version: 1;
  updated_at: string;
  runs: RunRecord[];
}

export interface RunControllerOptions {
  targetSuccessCount: number;
  jobPoolPath?: string;
  runStorePath?: string;
  activeRunLockPath?: string;
  ledgerStorePath?: string;
  storageStatePath?: string;
  headless?: boolean;
  traceEnabled?: boolean;
  timeoutMs?: number;
  applicantProfile?: import('../reasoning/types.js').ApplicantProfile;
  policyFlags?: Partial<import('../reasoning/types.js').ReasoningPolicyFlags>;
  mockOpenClawRawOutputPath?: string;
  dryRun?: boolean;
  submit?: boolean;
  cdpEndpoint?: string;
  mockExecution?: boolean;
  retryPolicy?: Partial<RetryPolicy>;
}

export interface RunControllerResult {
  runRecord: RunRecord;
  runStorePath: string;
}
