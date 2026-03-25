import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { runExecutor } from '../executor/index.js';
import { recordFailureIncident } from '../incident-manager/index.js';
import {
  enqueueJob,
  queryIncidents,
  queryJob,
  queryLedger,
  queryRun,
  startRun
} from '../index.js';

test('package api enqueues and queries jobs', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'package-api-jobs-'));
  const storePath = join(tempDir, 'jobs.json');

  try {
    const enqueueResult = await enqueueJob({
      jobs: [
        {
          source_url: 'https://jobs.example.test/apply/123?utm_source=x',
          title: 'Engineer'
        }
      ],
      storePath
    });

    expect(enqueueResult.ingested_count).toBe(1);
    expect(enqueueResult.duplicate_count).toBe(0);
    expect(enqueueResult.jobs[0]?.job.job_id).toBeTruthy();

    const queryResult = await queryJob({
      job_id: enqueueResult.jobs[0]?.job.job_id ?? '',
      storePath
    });

    expect(queryResult.found).toBeTruthy();
    expect(queryResult.job?.title).toBe('Engineer');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('package api starts and queries runs', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'package-api-runs-'));
  const jobPoolPath = join(tempDir, 'jobs.json');
  const runStorePath = join(tempDir, 'runs.json');
  const incidentStorePath = join(tempDir, 'incidents.json');
  const activeRunLockPath = join(tempDir, 'active-run.lock');
  const profilePath = join(tempDir, 'profile.json');

  try {
    await enqueueJob({
      jobs: [
        {
          source_url: 'https://jobs.example.test/apply/123',
          title: 'Engineer'
        }
      ],
      storePath: jobPoolPath
    });

    await writeFile(profilePath, JSON.stringify({ basics: { first_name: 'Taylor' } }), 'utf-8');
    const applicantProfile = JSON.parse(await (await import('node:fs/promises')).readFile(profilePath, 'utf-8')) as {
      basics: { first_name: string };
    };

    const startResult = await startRun({
      target_success_count: 1,
      job_pool_path: jobPoolPath,
      run_store_path: runStorePath,
      incident_store_path: incidentStorePath,
      active_run_lock_path: activeRunLockPath,
      applicant_profile: applicantProfile,
      mock_openclaw_raw_output_path: resolve('examples/fixtures/valid-openclaw-response.json'),
      mock_execution: true
    });

    expect(startResult.run.run_id).toBeTruthy();
    expect(startResult.run_store_path).toBeTruthy();

    const singleQuery = await queryRun({
      run_id: startResult.run.run_id,
      run_store_path: runStorePath
    });

    expect('found' in singleQuery && singleQuery.found).toBeTruthy();
    if ('run' in singleQuery) {
      expect(singleQuery.run?.run_id).toBe(startResult.run.run_id);
    }

    const collectionQuery = await queryRun({
      status: 'exhausted',
      run_store_path: runStorePath
    });

    expect('count' in collectionQuery && collectionQuery.count).toBe(1);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('package api queries ledger records', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'package-api-ledger-'));
  const ledgerStorePath = join(tempDir, 'ledger.json');

  try {
    await runExecutor(
      resolve('examples/fixtures/extracted-form.sample.json'),
      resolve('examples/fixtures/answer-plan.sample.json'),
      {
        dryRun: false,
        attemptSubmit: true,
        mockMode: true,
        traceEnabled: false,
        jobId: 'job_123',
        ledgerStorePath
      }
    );

    const result = await queryLedger({
      kind: 'attempts',
      storePath: ledgerStorePath
    });

    expect(result.count).toBeGreaterThan(0);
    expect(Array.isArray(result.records)).toBeTruthy();
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('package api queries active incidents', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'package-api-incidents-'));
  const incidentStorePath = join(tempDir, 'incidents.json');

  try {
    await recordFailureIncident(
      {
        detected_at: '2099-03-25T00:00:00.000Z',
        application_url: 'https://jobs.example.test/apply/123',
        failure_category: 'session',
        failure_code: 'session_state_invalid',
        run_id: 'run_1',
        job_id: 'job_1',
        pipeline_artifact_path: '/tmp/pipeline.json'
      },
      undefined,
      incidentStorePath
    );

    const result = await queryIncidents({
      status: 'active',
      storePath: incidentStorePath
    });

    expect(result.count).toBe(1);
    expect(Array.isArray(result.incidents)).toBeTruthy();
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
