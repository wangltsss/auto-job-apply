import type { LedgerQueryKind } from '../application-ledger/queryLedger.js';
import type {
  ApplicationAttemptRecord,
  ApplicationSuccessRecord,
  ClarificationItemRecord,
  FailureRecord
} from '../application-ledger/types.js';
import type { IncidentRecord, IncidentStatus } from '../incident-manager/types.js';
import type { IngestJobInput, IngestJobResult, JobPostingRecord } from '../job-pool/types.js';
import type { ApplicantProfile, ReasoningPolicyFlags } from '../reasoning/types.js';
import type { RunControllerOptions, RunRecord, RunStatus } from '../run-controller/types.js';

export interface EnqueueJobInput {
  jobs: IngestJobInput[];
  storePath?: string;
}

export interface EnqueueJobResult {
  store_path: string;
  ingested_count: number;
  duplicate_count: number;
  jobs: IngestJobResult[];
}

export interface QueryJobInput {
  job_id: string;
  storePath?: string;
}

export interface QueryJobResult {
  found: boolean;
  job: JobPostingRecord | null;
}

export interface StartRunInput {
  target_success_count: number;
  job_pool_path?: string;
  run_store_path?: string;
  incident_store_path?: string;
  active_run_lock_path?: string;
  ledger_store_path?: string;
  storage_state_path?: string;
  headless?: boolean;
  trace_enabled?: boolean;
  timeout_ms?: number;
  applicant_profile?: ApplicantProfile;
  policy_flags?: Partial<ReasoningPolicyFlags>;
  mock_openclaw_raw_output_path?: string;
  dry_run?: boolean;
  submit?: boolean;
  cdp_endpoint?: string;
  mock_execution?: boolean;
  retry_policy?: Partial<RunControllerOptions['retryPolicy']>;
}

export interface StartRunResult {
  run_store_path: string;
  run: RunRecord;
}

export interface QueryRunInput {
  run_id?: string;
  status?: RunStatus;
  limit?: number;
  run_store_path?: string;
}

export type QueryRunResult =
  | {
      found: boolean;
      run: RunRecord | null;
    }
  | {
      count: number;
      runs: RunRecord[];
    };

export interface QueryLedgerInput {
  kind: LedgerQueryKind;
  storePath?: string;
}

export type LedgerQueryRecords =
  | ApplicationAttemptRecord[]
  | ApplicationSuccessRecord[]
  | FailureRecord[]
  | ClarificationItemRecord[];

export interface QueryLedgerResult {
  count: number;
  records: LedgerQueryRecords;
}

export interface QueryIncidentInput {
  status?: IncidentStatus;
  limit?: number;
  storePath?: string;
}

export interface QueryIncidentResult {
  count: number;
  incidents: IncidentRecord[];
}
