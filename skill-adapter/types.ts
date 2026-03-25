import type {
  EnqueueJobInput,
  EnqueueJobResult,
  QueryIncidentInput,
  QueryIncidentResult,
  QueryJobInput,
  QueryJobResult,
  QueryLedgerInput,
  QueryLedgerResult,
  QueryRunInput,
  QueryRunResult,
  StartRunInput,
  StartRunResult
} from '../package-api/index.js';

export type SkillOperationName =
  | 'describe_operations'
  | '/ingest'
  | '/apply'
  | 'enqueue_posting'
  | 'query_job'
  | 'start_run'
  | 'query_run'
  | 'query_ledger'
  | 'query_incidents';

export interface SkillOperationDescriptor {
  name: SkillOperationName;
  description: string;
  input_summary: string;
}

export interface DescribeOperationsResult {
  operations: SkillOperationDescriptor[];
}

export interface SlashIngestInput {
  url?: string;
  urls?: string[];
  source_type?: 'manual' | 'automated';
  apply_url?: string;
  company?: string | null;
  title?: string | null;
  location?: string | null;
  employment_type?: string | null;
  posted_at?: string | null;
  notes?: string | null;
  raw_payload?: Record<string, unknown>;
  storePath?: string;
}

export interface SlashApplyInput extends Omit<StartRunInput, 'target_success_count'> {
  count?: number;
  target_success_count?: number;
}

export interface SkillOperationInputMap {
  describe_operations: Record<string, never>;
  '/ingest': SlashIngestInput;
  '/apply': SlashApplyInput;
  enqueue_posting: EnqueueJobInput;
  query_job: QueryJobInput;
  start_run: StartRunInput;
  query_run: QueryRunInput;
  query_ledger: QueryLedgerInput;
  query_incidents: QueryIncidentInput;
}

export interface SkillOperationResultMap {
  describe_operations: DescribeOperationsResult;
  '/ingest': EnqueueJobResult;
  '/apply': StartRunResult;
  enqueue_posting: EnqueueJobResult;
  query_job: QueryJobResult;
  start_run: StartRunResult;
  query_run: QueryRunResult;
  query_ledger: QueryLedgerResult;
  query_incidents: QueryIncidentResult;
}
