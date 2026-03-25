import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { listIncidents, recordFailureIncident } from '../incident-manager/index.js';

test('recordFailureIncident opens an incident after repeated matching failures', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'incident-store-'));
  const storePath = join(tempDir, 'incidents.json');

  try {
    const first = await recordFailureIncident(
      {
        detected_at: '2099-03-25T00:00:00.000Z',
        application_url: 'https://jobs.example.test/apply/123',
        failure_category: 'network',
        failure_code: 'navigation_failed',
        run_id: 'run_1',
        job_id: 'job_1',
        pipeline_artifact_path: '/tmp/pipeline-1.json'
      },
      {
        repeated_failure_threshold: 2,
        repeated_failure_window_ms: 60_000,
        repeated_failure_cooldown_ms: 120_000
      },
      storePath
    );

    expect(first.openedIncident).toBeNull();

    const second = await recordFailureIncident(
      {
        detected_at: '2099-03-25T00:00:30.000Z',
        application_url: 'https://jobs.example.test/apply/124',
        failure_category: 'network',
        failure_code: 'navigation_failed',
        run_id: 'run_2',
        job_id: 'job_2',
        pipeline_artifact_path: '/tmp/pipeline-2.json'
      },
      {
        repeated_failure_threshold: 2,
        repeated_failure_window_ms: 60_000,
        repeated_failure_cooldown_ms: 120_000
      },
      storePath
    );

    expect(second.openedIncident).toBeTruthy();
    expect(second.openedIncident?.host).toBe('jobs.example.test');
    expect(second.openedIncident?.status).toBe('active');

    const incidents = await listIncidents({ status: 'active' }, storePath);
    expect(incidents).toHaveLength(1);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('recordFailureIncident opens session incidents immediately', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'incident-session-'));
  const storePath = join(tempDir, 'incidents.json');

  try {
    const out = await recordFailureIncident(
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
      storePath
    );

    expect(out.openedIncident).toBeTruthy();
    expect(out.openedIncident?.reason).toContain('Session failure');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
