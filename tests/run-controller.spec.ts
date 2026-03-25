import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { ingestJobs, loadJobPoolStore } from '../job-pool/index.js';
import { runController } from '../run-controller/index.js';

test('runController retries a retryable failure and stops when target success count is reached', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'run-controller-'));
  const jobPoolPath = join(tempDir, 'jobs.json');
  const runStorePath = join(tempDir, 'runs.json');
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
        runStorePath
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
  const activeRunLockPath = join(tempDir, 'active-run.lock');

  try {
    await ingestJobs([{ source_url: 'https://jobs.example.test/apply/111', title: 'Engineer' }], firstJobPoolPath);
    await ingestJobs([{ source_url: 'https://jobs.example.test/apply/222', title: 'Designer' }], secondJobPoolPath);

    const firstRun = runController(
      {
        targetSuccessCount: 1,
        jobPoolPath: firstJobPoolPath,
        runStorePath: firstRunStorePath,
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
