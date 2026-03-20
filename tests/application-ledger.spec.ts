import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { runExecutor } from '../executor/index.js';

test('runExecutor records successful attempts in the application ledger', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'application-ledger-success-'));
  const ledgerPath = join(tempDir, 'ledger.json');

  try {
    const { result, ledgerStorePath } = await runExecutor(
      resolve('examples/fixtures/extracted-form.sample.json'),
      resolve('examples/fixtures/answer-plan.sample.json'),
      {
        dryRun: true,
        attemptSubmit: false,
        mockMode: true,
        traceEnabled: false,
        ledgerStorePath: ledgerPath
      }
    );

    expect(result.status).toBe('success');
    const ledger = JSON.parse(await readFile(ledgerStorePath, 'utf-8')) as {
      attempts: Array<{ outcome: string; application_url: string; answer_summary: unknown[] }>;
      successes: Array<{ application_url: string; submitted_answers_summary: unknown[] }>;
      failures: unknown[];
    };
    expect(ledger.attempts).toHaveLength(1);
    expect(ledger.attempts[0]?.outcome).toBe('success');
    expect(ledger.attempts[0]?.application_url).toContain('jobs.example.test');
    expect(ledger.attempts[0]?.answer_summary.length).toBeGreaterThan(0);
    expect(ledger.successes).toHaveLength(1);
    expect(ledger.successes[0]?.submitted_answers_summary.length).toBeGreaterThan(0);
    expect(ledger.failures).toHaveLength(0);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('runExecutor records failed attempts in the application ledger', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'application-ledger-failure-'));
  const ledgerPath = join(tempDir, 'ledger.json');

  try {
    const { result, ledgerStorePath } = await runExecutor(
      resolve('examples/fixtures/extracted-form.sample.json'),
      resolve('examples/fixtures/valid-openclaw-response.json'),
      {
        dryRun: false,
        attemptSubmit: true,
        mockMode: true,
        traceEnabled: false,
        ledgerStorePath: ledgerPath
      }
    );

    expect(result.status).toBe('error');
    expect(result.failure_code).toBe('submit_blocked_by_policy');
    const ledger = JSON.parse(await readFile(ledgerStorePath, 'utf-8')) as {
      attempts: Array<{ outcome: string; failure_code: string | null }>;
      successes: unknown[];
      failures: Array<{ failure_code: string | null; details: { notes: string[] } }>;
    };
    expect(ledger.attempts).toHaveLength(1);
    expect(ledger.attempts[0]?.outcome).toBe('failure');
    expect(ledger.attempts[0]?.failure_code).toBe('submit_blocked_by_policy');
    expect(ledger.successes).toHaveLength(0);
    expect(ledger.failures).toHaveLength(1);
    expect(ledger.failures[0]?.failure_code).toBe('submit_blocked_by_policy');
    expect(ledger.failures[0]?.details.notes.length).toBeGreaterThan(0);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
