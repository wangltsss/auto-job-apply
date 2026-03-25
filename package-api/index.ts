import { ingestJobs, getJob } from '../job-pool/index.js';
import { listIncidents } from '../incident-manager/index.js';
import { queryLedger as queryLedgerInternal } from '../application-ledger/index.js';
import { getRun, listRuns, runController } from '../run-controller/index.js';
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
} from './types.js';

export async function enqueueJob(input: EnqueueJobInput): Promise<EnqueueJobResult> {
  const output = await ingestJobs(input.jobs, input.storePath);

  return {
    store_path: output.storePath,
    ingested_count: output.results.filter((item) => item.inserted).length,
    duplicate_count: output.results.filter((item) => item.duplicate).length,
    jobs: output.results
  };
}

export async function queryJob(input: QueryJobInput): Promise<QueryJobResult> {
  const job = await getJob(input.job_id, input.storePath);

  return {
    found: Boolean(job),
    job
  };
}

export async function startRun(input: StartRunInput): Promise<StartRunResult> {
  const output = await runController({
    targetSuccessCount: input.target_success_count,
    jobPoolPath: input.job_pool_path,
    runStorePath: input.run_store_path,
    incidentStorePath: input.incident_store_path,
    activeRunLockPath: input.active_run_lock_path,
    ledgerStorePath: input.ledger_store_path,
    storageStatePath: input.storage_state_path,
    headless: input.headless,
    traceEnabled: input.trace_enabled,
    timeoutMs: input.timeout_ms,
    applicantProfile: input.applicant_profile,
    policyFlags: input.policy_flags,
    mockOpenClawRawOutputPath: input.mock_openclaw_raw_output_path,
    dryRun: input.dry_run,
    submit: input.submit,
    cdpEndpoint: input.cdp_endpoint,
    mockExecution: input.mock_execution,
    retryPolicy: input.retry_policy
  });

  return {
    run_store_path: output.runStorePath,
    run: output.runRecord
  };
}

export async function queryRun(input: QueryRunInput): Promise<QueryRunResult> {
  if (input.run_id) {
    const run = await getRun(input.run_id, input.run_store_path);
    return {
      found: Boolean(run),
      run
    };
  }

  const runs = await listRuns(
    {
      status: input.status,
      limit: input.limit
    },
    input.run_store_path
  );

  return {
    count: runs.length,
    runs
  };
}

export async function queryLedger(input: QueryLedgerInput): Promise<QueryLedgerResult> {
  const records = await queryLedgerInternal(input.kind, input.storePath);
  return {
    count: records.length,
    records
  };
}

export async function queryIncidents(input: QueryIncidentInput): Promise<QueryIncidentResult> {
  const incidents = await listIncidents(
    {
      status: input.status,
      limit: input.limit
    },
    input.storePath
  );

  return {
    count: incidents.length,
    incidents
  };
}

export type {
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
} from './types.js';
