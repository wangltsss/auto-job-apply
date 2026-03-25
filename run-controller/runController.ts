import { randomUUID } from 'node:crypto';
import { claimNextJobExcludingHosts, finalizeJobAttempt, loadJobPoolStore } from '../job-pool/index.js';
import { getActiveIncidents, getActiveIncidentHosts, recordFailureIncident } from '../incident-manager/index.js';
import { runPipeline } from '../orchestration/pipeline.js';
import type { PipelineRunResult } from '../orchestration/types.js';
import { nowIso } from '../playwright/utils/text.js';
import { buildRetryPolicy, classifyPipelineFailure, computeNextAttemptAt } from './failurePolicy.js';
import { DEFAULT_RUN_STORE_PATH, upsertRunRecord, withActiveRunLock } from './store.js';
import type { RunAttemptRecord, RunControllerOptions, RunControllerResult, RunRecord } from './types.js';

interface RunControllerDeps {
  runPipeline: (options: import('../orchestration/types.js').PipelineRunOptions) => Promise<PipelineRunResult>;
  sleep: (ms: number) => Promise<void>;
  now: () => string;
}

function buildRunRecord(options: RunControllerOptions, retryPolicy: ReturnType<typeof buildRetryPolicy>, currentTime: string): RunRecord {
  return {
    run_id: randomUUID(),
    status: 'active',
    started_at: currentTime,
    ended_at: null,
    target_success_count: options.targetSuccessCount,
    success_count: 0,
    attempt_count: 0,
    retry_policy: retryPolicy,
    attempts: [],
    notes: []
  };
}

function buildAttemptRecord(
  pipelineResult: PipelineRunResult,
  jobId: string,
  applicationUrl: string,
  attemptNumber: number,
  failureCategory: RunAttemptRecord['failure_category'],
  retryable: boolean,
  nextAttemptAt: string | null
): RunAttemptRecord {
  return {
    attempt_id: randomUUID(),
    job_id: jobId,
    application_url: applicationUrl,
    attempt_number: attemptNumber,
    started_at: pipelineResult.artifact.started_at,
    ended_at: pipelineResult.artifact.ended_at,
    pipeline_artifact_path: pipelineResult.pipelineArtifactPath,
    final_status: pipelineResult.artifact.final_status,
    failure_stage: pipelineResult.artifact.failure_stage,
    failure_code: pipelineResult.artifact.failure_code,
    failure_category: failureCategory,
    retryable,
    next_attempt_at: nextAttemptAt,
    notes: pipelineResult.artifact.notes
  };
}

export async function runController(
  options: RunControllerOptions,
  deps: Partial<RunControllerDeps> = {}
): Promise<RunControllerResult> {
  if (options.targetSuccessCount <= 0) {
    throw new Error('targetSuccessCount must be greater than 0');
  }

  const runPipelineFn = deps.runPipeline ?? runPipeline;
  const sleep = deps.sleep ?? (async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = deps.now ?? nowIso;
  const retryPolicy = buildRetryPolicy(options.retryPolicy);
  const runStorePath = options.runStorePath ?? DEFAULT_RUN_STORE_PATH;

  return withActiveRunLock(async () => {
    const runRecord = buildRunRecord(options, retryPolicy, now());
    const persist = async (): Promise<void> => {
      await upsertRunRecord(runRecord, runStorePath);
    };

      await persist();

    while (runRecord.success_count < runRecord.target_success_count) {
      const blockedHosts = await getActiveIncidentHosts(options.incidentStorePath);
      const claimOut = await claimNextJobExcludingHosts(runRecord.run_id, blockedHosts, options.jobPoolPath);
      if (!claimOut.claimed) {
        const jobPool = await loadJobPoolStore(options.jobPoolPath);
        const activeIncidents = await getActiveIncidents(options.incidentStorePath);
        const nextRetryAt = jobPool.jobs
          .filter((job) => job.status === 'failed_retryable' && job.claimed_by_run_id === null && job.next_attempt_at)
          .map((job) => job.next_attempt_at as string)
          .sort()[0] ?? null;
        const nextIncidentResumeAt = activeIncidents.map((incident) => incident.cooldown_until).sort()[0] ?? null;

        const nextResumeAt = [nextRetryAt, nextIncidentResumeAt].filter(Boolean).sort()[0] ?? null;

        if (!nextResumeAt) {
          runRecord.status = 'exhausted';
          runRecord.ended_at = now();
          await persist();
          return { runRecord, runStorePath };
        }

        const waitMs = Math.max(0, new Date(nextResumeAt).getTime() - new Date(now()).getTime());
        runRecord.notes.push(`Waiting ${waitMs}ms for next resume window at ${nextResumeAt}.`);
        await persist();
        await sleep(waitMs);
        continue;
      }

      const { job, attempt_number: attemptNumber } = claimOut.claimed;
      const pipelineResult = await runPipelineFn({
        mode: 'full',
        url: job.apply_url,
        jobId: job.job_id,
        ledgerStorePath: options.ledgerStorePath,
        storageStatePath: options.storageStatePath,
        headless: options.headless,
        traceEnabled: options.traceEnabled,
        timeoutMs: options.timeoutMs,
        applicantProfile: options.applicantProfile,
        policyFlags: options.policyFlags,
        mockOpenClawRawOutputPath: options.mockOpenClawRawOutputPath,
        dryRun: options.dryRun,
        submit: options.submit,
        cdpEndpoint: options.cdpEndpoint,
        mockExecution: options.mockExecution
      });

      runRecord.attempt_count += 1;

      if (pipelineResult.artifact.final_status === 'success') {
        await finalizeJobAttempt({
          job_id: job.job_id,
          run_id: runRecord.run_id,
          attempt_number: attemptNumber,
          started_at: pipelineResult.artifact.started_at,
          ended_at: pipelineResult.artifact.ended_at,
          pipeline_artifact_path: pipelineResult.pipelineArtifactPath,
          outcome: 'applied',
          failure_code: null
        }, options.jobPoolPath);

        runRecord.success_count += 1;
        runRecord.attempts.push(
          buildAttemptRecord(pipelineResult, job.job_id, job.apply_url, attemptNumber, null, false, null)
        );
        await persist();
        continue;
      }

      const decision = classifyPipelineFailure(pipelineResult.artifact);
      const nextAttemptAt = decision.retryable ? computeNextAttemptAt(attemptNumber, retryPolicy, now()) : null;
      const exhausted = !decision.retryable || nextAttemptAt === null;

      await finalizeJobAttempt({
        job_id: job.job_id,
        run_id: runRecord.run_id,
        attempt_number: attemptNumber,
        started_at: pipelineResult.artifact.started_at,
        ended_at: pipelineResult.artifact.ended_at,
        pipeline_artifact_path: pipelineResult.pipelineArtifactPath,
        outcome: exhausted ? 'failed_terminal' : 'failed_retryable',
        failure_code: pipelineResult.artifact.failure_code,
        next_attempt_at: nextAttemptAt
      }, options.jobPoolPath);

      runRecord.attempts.push(
        buildAttemptRecord(
          pipelineResult,
          job.job_id,
          job.apply_url,
          attemptNumber,
          decision.category,
          decision.retryable && !exhausted,
          exhausted ? null : nextAttemptAt
        )
      );

      if (decision.category) {
        const incidentOut = await recordFailureIncident(
          {
            detected_at: pipelineResult.artifact.ended_at,
            application_url: job.apply_url,
            failure_category: decision.category,
            failure_code: pipelineResult.artifact.failure_code,
            run_id: runRecord.run_id,
            job_id: job.job_id,
            pipeline_artifact_path: pipelineResult.pipelineArtifactPath
          },
          options.incidentPolicy,
          options.incidentStorePath
        );

        if (incidentOut.openedIncident) {
          runRecord.notes.push(
            `Opened incident ${incidentOut.openedIncident.incident_id} for host ${incidentOut.openedIncident.host} until ${incidentOut.openedIncident.cooldown_until}.`
          );
        }
      }
      await persist();
    }

    runRecord.status = 'completed';
    runRecord.ended_at = now();
    await persist();
    return { runRecord, runStorePath };
  }, options.activeRunLockPath);
}
