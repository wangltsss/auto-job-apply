import { Writable } from 'node:stream';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { runRunCli } from '../tools/run-cli.js';
import { parseRunCliArgs, RUN_CLI_USAGE } from '../tools/runCliArgs.js';

class CaptureStream extends Writable {
  chunks: string[] = [];

  override _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf-8'));
    callback();
  }

  toString(): string {
    return this.chunks.join('');
  }
}

function makeStreams(): { stdout: CaptureStream; stderr: CaptureStream } {
  return {
    stdout: new CaptureStream(),
    stderr: new CaptureStream()
  };
}

test('parseRunCliArgs parses start-run and query-run arguments', () => {
  expect(
    parseRunCliArgs([
      'start-run',
      '--target-success-count',
      '2',
      '--job-pool-path',
      './jobs.json',
      '--run-store-path',
      './runs.json',
      '--profile',
      './profile.json',
      '--mock-response',
      './response.json',
      '--mock-execution',
      '--submit'
    ])
  ).toEqual({
    command: 'start-run',
    targetSuccessCount: 2,
    jobPoolPath: './jobs.json',
    runStorePath: './runs.json',
    activeRunLockPath: undefined,
    ledgerStorePath: undefined,
    profilePath: './profile.json',
    mockResponsePath: './response.json',
    storageStatePath: undefined,
    headless: true,
    traceEnabled: true,
    dryRun: false,
    submit: true,
    cdpEndpoint: undefined,
    mockExecution: true
  });

  expect(parseRunCliArgs(['query-run', '--run-id', 'run_123', '--run-store-path', './runs.json'])).toEqual({
    command: 'query-run',
    runId: 'run_123',
    status: undefined,
    limit: undefined,
    runStorePath: './runs.json'
  });
});

test('runRunCli prints help output', async () => {
  const streams = makeStreams();
  const code = await runRunCli(['--help'], streams.stdout as never, streams.stderr as never);

  expect(code).toBe(0);
  expect(streams.stderr.toString()).toBe('');
  expect(streams.stdout.toString()).toBe(`${RUN_CLI_USAGE}\n`);
});

test('runRunCli starts a run and queries it with standardized envelopes', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'run-cli-'));
  const jobPoolPath = join(tempDir, 'jobs.json');
  const runStorePath = join(tempDir, 'runs.json');
  const profilePath = join(tempDir, 'profile.json');

  try {
    await writeFile(profilePath, JSON.stringify({ basics: { first_name: 'Taylor' } }), 'utf-8');

    const enqueueStreams = makeStreams();
    const enqueueCode = await import('../tools/job-pool-cli.js').then(({ runJobPoolCli }) =>
      runJobPoolCli(
        ['ingest', '--url', 'https://jobs.example.test/apply/123', '--title', 'Engineer', '--store-path', jobPoolPath],
        enqueueStreams.stdout as never,
        enqueueStreams.stderr as never
      )
    );
    expect(enqueueCode).toBe(0);

    const startStreams = makeStreams();
    const startCode = await runRunCli(
      [
        'start-run',
        '--target-success-count',
        '1',
        '--job-pool-path',
        jobPoolPath,
        '--run-store-path',
        runStorePath,
        '--profile',
        profilePath,
        '--mock-response',
        resolve('examples/fixtures/valid-openclaw-response.json'),
        '--mock-execution'
      ],
      startStreams.stdout as never,
      startStreams.stderr as never
    );

    expect(startCode).toBe(0);
    const startResult = JSON.parse(startStreams.stdout.toString()) as {
      ok: boolean;
      stage: string;
      result: { command: string; run_id: string; status: string };
    };
    expect(startResult.ok).toBeTruthy();
    expect(startResult.stage).toBe('run');
    expect(startResult.result.command).toBe('start-run');
    expect(startResult.result.run_id).toBeTruthy();

    const queryStreams = makeStreams();
    const queryCode = await runRunCli(
      ['query-run', '--run-id', startResult.result.run_id, '--run-store-path', runStorePath],
      queryStreams.stdout as never,
      queryStreams.stderr as never
    );

    expect(queryCode).toBe(0);
    const queryResult = JSON.parse(queryStreams.stdout.toString()) as {
      ok: boolean;
      stage: string;
      result: { command: string; found: boolean; run: { run_id: string; status: string } | null };
    };
    expect(queryResult.ok).toBeTruthy();
    expect(queryResult.stage).toBe('run');
    expect(queryResult.result.command).toBe('query-run');
    expect(queryResult.result.found).toBeTruthy();
    expect(queryResult.result.run?.run_id).toBe(startResult.result.run_id);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('package root exports stable public modules', async () => {
  const pkg = await import('../index.js');

  expect(pkg.applicationLedger).toBeTruthy();
  expect(pkg.jobPool).toBeTruthy();
  expect(pkg.orchestration).toBeTruthy();
  expect(pkg.reasoning).toBeTruthy();
  expect(pkg.runController).toBeTruthy();
});
