import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { listIncidents } from '../incident-manager/index.js';
import { ingestJobs, loadJobPoolStore } from '../job-pool/index.js';
import { classifyPipelineFailure } from '../run-controller/failurePolicy.js';
import { runController } from '../run-controller/index.js';

test('classifyPipelineFailure treats OpenClaw lock contention as non-retryable session failure', () => {
  expect(
    classifyPipelineFailure({
      started_at: '2026-03-25T00:00:00.000Z',
      ended_at: '2026-03-25T00:00:01.000Z',
      job_id: 'job_123',
      input_url: 'https://jobs.example.test/apply/123',
      stages_run: ['scrape', 'answer_plan'],
      scrape_artifact_path: '/tmp/form.json',
      answer_plan_artifact_path: null,
      answer_plan_status: null,
      execution_result_artifact_path: null,
      final_status: 'error',
      failure_stage: 'answer_plan',
      failure_code: 'openclaw_invocation_failure',
      notes: [
        'openclaw_invocation_failure: OpenClaw returned non-zero exit code',
        JSON.stringify({
          lock_contention: true,
          failure_category: 'session',
          failure_reason: 'openclaw_session_locked',
          stderr: 'session file locked'
        })
      ]
    })
  ).toEqual({
    category: 'session',
    retryable: false
  });
});

test('runController retries a retryable failure and stops when target success count is reached', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'run-controller-'));
  const jobPoolPath = join(tempDir, 'jobs.json');
  const runStorePath = join(tempDir, 'runs.json');
  const incidentStorePath = join(tempDir, 'incidents.json');
  const lockPath = join(tempDir, 'active-run.lock');

  try {
    await ingestJobs([
      {
        source_url: 'https://jobs.example.test/apply/123',
        title: 'Engineer'
      }
    ], jobPoolPath);

    let invocation = 0;
    const result = await runController(
      {
        targetSuccessCount: 1,
        jobPoolPath,
        runStorePath,
        incidentStorePath,
        activeRunLockPath: lockPath,
        retryPolicy: {
          max_attempts_per_job: 3,
          retry_delays_ms: [0, 0]
        }
      },
      {
        runPipeline: async ({ url, jobId }) => {
          invocation += 1;
          return {
            pipelineArtifactPath: `/tmp/pipeline-${invocation}.json`,
            artifact: {
              started_at: `2026-03-25T00:00:0${invocation}.000Z`,
              ended_at: `2026-03-25T00:00:1${invocation}.000Z`,
              job_id: jobId ?? null,
              input_url: url,
              stages_run: ['scrape', 'answer_plan', 'execute'],
              scrape_artifact_path: '/tmp/form.json',
              answer_plan_artifact_path: '/tmp/plan.json',
              answer_plan_status: 'proceed',
              execution_result_artifact_path: invocation === 1 ? null : '/tmp/exec.json',
              final_status: invocation === 1 ? 'error' : 'success',
              failure_stage: invocation === 1 ? 'execute' : null,
              failure_code: invocation === 1 ? 'navigation_failed' : null,
              notes: invocation === 1 ? ['navigation_failed: transient'] : []
            }
          };
        },
        sleep: async () => undefined
      }
    );

    const store = await loadJobPoolStore(jobPoolPath);
    expect(result.runRecord.status).toBe('completed');
    expect(result.runRecord.success_count).toBe(1);
    expect(result.runRecord.attempt_count).toBe(2);
    expect(result.runRecord.attempts).toHaveLength(2);
    expect(result.runRecord.attempts[0]?.retryable).toBeTruthy();
    expect(result.runRecord.attempts[1]?.final_status).toBe('success');
    expect(store.jobs[0]?.status).toBe('applied');
    expect(store.jobs[0]?.attempt_count).toBe(2);
    expect(store.jobs[0]?.claimed_by_run_id).toBeNull();

    await rm(lockPath, { force: true });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('runController marks terminal failures without retry and exhausts when pool is empty', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'run-controller-terminal-'));
  const jobPoolPath = join(tempDir, 'jobs.json');
  const runStorePath = join(tempDir, 'runs.json');
  const incidentStorePath = join(tempDir, 'incidents.json');
  const lockPath = join(tempDir, 'active-run.lock');

  try {
    await ingestJobs([
      {
        source_url: 'https://jobs.example.test/apply/123',
        title: 'Engineer'
      }
    ], jobPoolPath);

    const result = await runController(
      {
        targetSuccessCount: 1,
        jobPoolPath,
        runStorePath,
        incidentStorePath,
        activeRunLockPath: lockPath
      },
      {
        runPipeline: async ({ url, jobId }) => ({
          pipelineArtifactPath: '/tmp/pipeline-terminal.json',
          artifact: {
            started_at: '2026-03-25T00:00:00.000Z',
            ended_at: '2026-03-25T00:00:01.000Z',
            job_id: jobId ?? null,
            input_url: url,
            stages_run: ['scrape', 'answer_plan'],
            scrape_artifact_path: '/tmp/form.json',
            answer_plan_artifact_path: '/tmp/plan.json',
            answer_plan_status: 'quarantine',
            execution_result_artifact_path: null,
            final_status: 'error',
            failure_stage: 'answer_plan',
            failure_code: 'answer_plan_status_quarantine',
            notes: ['answer_plan_status_quarantine: blocked']
          }
        }),
        sleep: async () => undefined
      }
    );

    const store = await loadJobPoolStore(jobPoolPath);
    expect(result.runRecord.status).toBe('exhausted');
    expect(result.runRecord.success_count).toBe(0);
    expect(result.runRecord.attempt_count).toBe(1);
    expect(result.runRecord.attempts[0]?.retryable).toBeFalsy();
    expect(store.jobs[0]?.status).toBe('failed_terminal');
    expect(store.jobs[0]?.attempt_count).toBe(1);
    expect(store.jobs[0]?.last_failure_code).toBe('answer_plan_status_quarantine');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('runController prevents duplicate concurrent runs with an active-run lock', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'run-controller-lock-'));
  const firstJobPoolPath = join(tempDir, 'jobs-a.json');
  const secondJobPoolPath = join(tempDir, 'jobs-b.json');
  const firstRunStorePath = join(tempDir, 'runs-a.json');
  const secondRunStorePath = join(tempDir, 'runs-b.json');
  const firstIncidentStorePath = join(tempDir, 'incidents-a.json');
  const secondIncidentStorePath = join(tempDir, 'incidents-b.json');
  const activeRunLockPath = join(tempDir, 'active-run.lock');

  try {
    await ingestJobs([{ source_url: 'https://jobs.example.test/apply/111', title: 'Engineer' }], firstJobPoolPath);
    await ingestJobs([{ source_url: 'https://jobs.example.test/apply/222', title: 'Designer' }], secondJobPoolPath);

    const firstRun = runController(
      {
        targetSuccessCount: 1,
        jobPoolPath: firstJobPoolPath,
        runStorePath: firstRunStorePath,
        incidentStorePath: firstIncidentStorePath,
        activeRunLockPath
      },
      {
        runPipeline: async ({ url, jobId }) => {
          await new Promise((resolve) => setTimeout(resolve, 1_200));
          return {
            pipelineArtifactPath: '/tmp/pipeline-lock.json',
            artifact: {
              started_at: '2026-03-25T00:00:00.000Z',
              ended_at: '2026-03-25T00:00:01.000Z',
              job_id: jobId ?? null,
              input_url: url,
              stages_run: ['scrape', 'answer_plan', 'execute'],
              scrape_artifact_path: '/tmp/form.json',
              answer_plan_artifact_path: '/tmp/plan.json',
              answer_plan_status: 'proceed',
              execution_result_artifact_path: '/tmp/exec.json',
              final_status: 'success',
              failure_stage: null,
              failure_code: null,
              notes: []
            }
          };
        }
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    await expect(
      runController(
        {
          targetSuccessCount: 1,
          jobPoolPath: secondJobPoolPath,
          runStorePath: secondRunStorePath,
          incidentStorePath: secondIncidentStorePath,
          activeRunLockPath
        },
        {
          runPipeline: async () => {
            throw new Error('second run should not start');
          }
        }
      )
    ).rejects.toThrow(/Timed out waiting for lock/);

    await firstRun;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('runController opens incidents and skips blocked hosts while continuing on other hosts', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'run-controller-incidents-'));
  const jobPoolPath = join(tempDir, 'jobs.json');
  const runStorePath = join(tempDir, 'runs.json');
  const incidentStorePath = join(tempDir, 'incidents.json');
  const lockPath = join(tempDir, 'active-run.lock');

  try {
    await ingestJobs(
      [
        { source_url: 'https://jobs.example.test/apply/123', title: 'Engineer A' },
        { source_url: 'https://jobs.example.test/apply/124', title: 'Engineer B' },
        { source_url: 'https://other.example.test/apply/200', title: 'Designer' }
      ],
      jobPoolPath
    );

    const seen: string[] = [];
    const result = await runController(
      {
        targetSuccessCount: 1,
        jobPoolPath,
        runStorePath,
        activeRunLockPath: lockPath,
        incidentStorePath,
        incidentPolicy: {
          repeated_failure_threshold: 1,
          repeated_failure_window_ms: 60_000,
          repeated_failure_cooldown_ms: 60_000,
          session_failure_cooldown_ms: 60_000
        }
      },
      {
        runPipeline: async ({ url, jobId }) => {
          seen.push(url);
          const blockedHost = url.includes('jobs.example.test');
          return {
            pipelineArtifactPath: `/tmp/${jobId}.json`,
            artifact: {
              started_at: '2099-03-25T00:00:00.000Z',
              ended_at: '2099-03-25T00:00:01.000Z',
              job_id: jobId ?? null,
              input_url: url,
              stages_run: ['scrape', 'answer_plan', 'execute'],
              scrape_artifact_path: '/tmp/form.json',
              answer_plan_artifact_path: '/tmp/plan.json',
              answer_plan_status: 'proceed',
              execution_result_artifact_path: blockedHost ? null : '/tmp/exec.json',
              final_status: blockedHost ? 'error' : 'success',
              failure_stage: blockedHost ? 'execute' : null,
              failure_code: blockedHost ? 'session_state_invalid' : null,
              notes: blockedHost ? ['session_state_invalid: auth expired'] : []
            }
          };
        },
        sleep: async () => undefined
      }
    );

    const store = await loadJobPoolStore(jobPoolPath);
    const incidents = await listIncidents({ status: 'active' }, incidentStorePath);

    expect(result.runRecord.status).toBe('completed');
    expect(result.runRecord.success_count).toBe(1);
    expect(seen).toEqual(['https://jobs.example.test/apply/123', 'https://other.example.test/apply/200']);
    expect(store.jobs.find((job) => job.title === 'Engineer B')?.status).toBe('queued');
    expect(incidents).toHaveLength(1);
    expect(incidents[0]?.host).toBe('jobs.example.test');
    expect(incidents[0]?.failure_category).toBe('session');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
