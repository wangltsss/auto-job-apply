import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { parseExecutorCliArgs } from '../executor/cliArgs.js';

test('parseExecutorCliArgs defaults to dry-run real mode', () => {
  const args = parseExecutorCliArgs([]);

  expect(args.dryRun).toBeTruthy();
  expect(args.attemptSubmit).toBeFalsy();
  expect(args.mockMode).toBeFalsy();
  expect(args.headless).toBeTruthy();
  expect(args.traceEnabled).toBeTruthy();
});

test('parseExecutorCliArgs parses explicit flags and paths', () => {
  const args = parseExecutorCliArgs([
    './artifacts/forms/a.json',
    './artifacts/answer-plans/b.json',
    '--storage-state',
    './state/linkedin.json',
    '--headed',
    '--submit',
    '--no-trace',
    '--mock',
    '--cdp-endpoint',
    'http://127.0.0.1:9222'
  ]);

  expect(args.extractedFormPath).toBe(resolve('./artifacts/forms/a.json'));
  expect(args.answerPlanPath).toBe(resolve('./artifacts/answer-plans/b.json'));
  expect(args.storageStatePath).toBe(resolve('./state/linkedin.json'));
  expect(args.headless).toBeFalsy();
  expect(args.dryRun).toBeFalsy();
  expect(args.attemptSubmit).toBeTruthy();
  expect(args.traceEnabled).toBeFalsy();
  expect(args.mockMode).toBeTruthy();
  expect(args.cdpEndpoint).toBe('http://127.0.0.1:9222');
});

test('parseExecutorCliArgs rejects unknown flags', () => {
  expect(() => parseExecutorCliArgs(['--bogus'])).toThrow('Unknown flag: --bogus');
});
