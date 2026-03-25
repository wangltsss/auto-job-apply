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

export interface SkillOperationInputMap {
  describe_operations: Record<string, never>;
  enqueue_posting: EnqueueJobInput;
  query_job: QueryJobInput;
  start_run: StartRunInput;
  query_run: QueryRunInput;
  query_ledger: QueryLedgerInput;
  query_incidents: QueryIncidentInput;
}

export interface SkillOperationResultMap {
  describe_operations: DescribeOperationsResult;
  enqueue_posting: EnqueueJobResult;
  query_job: QueryJobResult;
  start_run: StartRunResult;
  query_run: QueryRunResult;
  query_ledger: QueryLedgerResult;
  query_incidents: QueryIncidentResult;
}
