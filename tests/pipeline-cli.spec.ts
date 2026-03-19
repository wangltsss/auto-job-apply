import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { parsePipelineCliArgs } from '../tools/pipelineCliArgs.js';

test('parsePipelineCliArgs parses flags and profile file', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'pipeline-cli-'));

  try {
    const profilePath = join(tempDir, 'profile.json');
    await writeFile(profilePath, JSON.stringify({ basics: { first_name: 'Taylor' } }), 'utf-8');

    const args = await parsePipelineCliArgs([
      '--url',
      'https://jobs.example.test/apply/123',
      '--mode',
      'scrape-answer-plan',
      '--profile',
      profilePath,
      '--mock-response',
      './response.json',
      '--headed',
      '--no-trace',
      '--submit',
      '--mock-execution',
      '--cdp-endpoint',
      'http://127.0.0.1:9222'
    ]);

    expect(args.url).toBe('https://jobs.example.test/apply/123');
    expect(args.mode).toBe('scrape-answer-plan');
    expect(args.headless).toBeFalsy();
    expect(args.traceEnabled).toBeFalsy();
    expect(args.submit).toBeTruthy();
    expect(args.dryRun).toBeFalsy();
    expect(args.mockExecution).toBeTruthy();
    expect(args.cdpEndpoint).toBe('http://127.0.0.1:9222');
    expect(args.mockOpenClawRawOutputPath).toBe('./response.json');
    expect(args.applicantProfile).toEqual({ basics: { first_name: 'Taylor' } });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('parsePipelineCliArgs toggles dry-run explicitly and validates mode', async () => {
  const args = await parsePipelineCliArgs(['--url', 'https://jobs.example.test/apply/123', '--submit', '--dry-run']);
  expect(args.submit).toBeFalsy();
  expect(args.dryRun).toBeTruthy();

  await expect(parsePipelineCliArgs(['--url', 'https://jobs.example.test/apply/123', '--mode', 'bogus'])).rejects.toThrow(
    'Invalid --mode, expected scrape|scrape-answer-plan|full'
  );
});

test('parsePipelineCliArgs requires url and rejects unknown flags', async () => {
  await expect(parsePipelineCliArgs([])).rejects.toThrow('Missing required --url');
  await expect(parsePipelineCliArgs(['--url', 'https://jobs.example.test/apply/123', '--bogus'])).rejects.toThrow('Unknown flag: --bogus');
});
