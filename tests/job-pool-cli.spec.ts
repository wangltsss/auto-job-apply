import { Writable } from 'node:stream';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { runJobPoolCli } from '../tools/job-pool-cli.js';
import { JOB_POOL_CLI_USAGE, parseJobPoolCliArgs } from '../tools/jobPoolCliArgs.js';

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

test('parseJobPoolCliArgs parses ingest arguments', () => {
  const args = parseJobPoolCliArgs([
    'ingest',
    '--url',
    'https://jobs.example.test/apply/123',
    '--source-type',
    'manual',
    '--company',
    'Example Co',
    '--notes',
    'phone share'
  ]);

  expect(args).toEqual({
    command: 'ingest',
    inputFilePath: undefined,
    sourceUrl: 'https://jobs.example.test/apply/123',
    sourceType: 'manual',
    applyUrl: undefined,
    company: 'Example Co',
    title: undefined,
    location: undefined,
    employmentType: undefined,
    postedAt: undefined,
    notes: 'phone share',
    storePath: undefined
  });
});

test('parseJobPoolCliArgs parses list arguments and validates bad input', () => {
  const listArgs = parseJobPoolCliArgs(['list', '--status', 'queued', '--source-type', 'automated', '--limit', '5']);
  expect(listArgs).toEqual({
    command: 'list',
    status: 'queued',
    sourceType: 'automated',
    limit: 5,
    storePath: undefined
  });

  expect(parseJobPoolCliArgs(['get', '--job-id', 'job_123', '--store-path', './jobs.json'])).toEqual({
    command: 'get',
    jobId: 'job_123',
    storePath: './jobs.json'
  });

  expect(() => parseJobPoolCliArgs(['bogus'])).toThrow('Missing or invalid job-pool command, expected ingest|list|get');
  expect(() => parseJobPoolCliArgs(['ingest'])).toThrow('Missing required --url or --input-file');
  expect(() => parseJobPoolCliArgs(['ingest', '--url', 'https://jobs.example.test/apply/123', '--input-file', './jobs.json'])).toThrow(
    'Use only one of --url or --input-file'
  );
});

test('runJobPoolCli prints help output', async () => {
  const streams = makeStreams();
  const code = await runJobPoolCli(['--help'], streams.stdout as never, streams.stderr as never);

  expect(code).toBe(0);
  expect(streams.stderr.toString()).toBe('');
  expect(streams.stdout.toString()).toBe(`${JOB_POOL_CLI_USAGE}\n`);
});

test('runJobPoolCli ingests and lists jobs with standardized envelopes', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'job-pool-cli-'));
  const storePath = join(tempDir, 'jobs.json');

  try {
    const ingestStreams = makeStreams();
    const ingestCode = await runJobPoolCli(
      [
        'ingest',
        '--url',
        'https://jobs.example.test/apply/123?utm_source=x',
        '--title',
        'Engineer',
        '--store-path',
        storePath
      ],
      ingestStreams.stdout as never,
      ingestStreams.stderr as never
    );

    expect(ingestCode).toBe(0);
    const ingestResult = JSON.parse(ingestStreams.stdout.toString()) as {
      ok: boolean;
      stage: string;
      result: { command: string; ingested_count: number; duplicate_count: number; jobs: Array<{ job_id: string; status: string }> };
    };
    expect(ingestResult.ok).toBeTruthy();
    expect(ingestResult.stage).toBe('job_pool');
    expect(ingestResult.result.command).toBe('ingest');
    expect(ingestResult.result.ingested_count).toBe(1);
    expect(ingestResult.result.duplicate_count).toBe(0);
    expect(ingestResult.result.jobs[0]?.status).toBe('queued');

    const listStreams = makeStreams();
    const listCode = await runJobPoolCli(['list', '--store-path', storePath], listStreams.stdout as never, listStreams.stderr as never);

    expect(listCode).toBe(0);
    const listResult = JSON.parse(listStreams.stdout.toString()) as {
      ok: boolean;
      stage: string;
      result: { command: string; count: number; jobs: Array<{ title: string | null }> };
    };
    expect(listResult.ok).toBeTruthy();
    expect(listResult.stage).toBe('job_pool');
    expect(listResult.result.command).toBe('list');
    expect(listResult.result.count).toBe(1);
    expect(listResult.result.jobs[0]?.title).toBe('Engineer');

    const getStreams = makeStreams();
    const getCode = await runJobPoolCli(
      ['get', '--job-id', ingestResult.result.jobs[0]?.job_id ?? '', '--store-path', storePath],
      getStreams.stdout as never,
      getStreams.stderr as never
    );

    expect(getCode).toBe(0);
    const getResult = JSON.parse(getStreams.stdout.toString()) as {
      ok: boolean;
      stage: string;
      result: { command: string; found: boolean; job: { title: string | null } | null };
    };
    expect(getResult.ok).toBeTruthy();
    expect(getResult.stage).toBe('job_pool');
    expect(getResult.result.command).toBe('get');
    expect(getResult.result.found).toBeTruthy();
    expect(getResult.result.job?.title).toBe('Engineer');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('runJobPoolCli ingests jobs from an input file for automated ingestion', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'job-pool-cli-file-'));
  const storePath = join(tempDir, 'jobs.json');
  const inputFilePath = join(tempDir, 'input.json');

  try {
    await writeFile(
      inputFilePath,
      JSON.stringify(
        [
          {
            source_type: 'automated',
            source_url: 'https://jobs.example.test/apply/200',
            title: 'Engineer I'
          },
          {
            source_type: 'automated',
            source_url: 'https://jobs.example.test/apply/201',
            title: 'Engineer II'
          }
        ],
        null,
        2
      ),
      'utf-8'
    );

    const streams = makeStreams();
    const code = await runJobPoolCli(
      ['ingest', '--input-file', inputFilePath, '--store-path', storePath],
      streams.stdout as never,
      streams.stderr as never
    );

    expect(code).toBe(0);
    const parsed = JSON.parse(streams.stdout.toString()) as {
      ok: boolean;
      stage: string;
      result: { command: string; ingested_count: number; duplicate_count: number; jobs: Array<{ inserted: boolean }> };
    };

    expect(parsed.ok).toBeTruthy();
    expect(parsed.stage).toBe('job_pool');
    expect(parsed.result.command).toBe('ingest');
    expect(parsed.result.ingested_count).toBe(2);
    expect(parsed.result.duplicate_count).toBe(0);
    expect(parsed.result.jobs).toHaveLength(2);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('runJobPoolCli returns standardized failure envelope', async () => {
  const streams = makeStreams();
  const code = await runJobPoolCli(['ingest'], streams.stdout as never, streams.stderr as never);

  expect(code).toBe(1);
  expect(streams.stdout.toString()).toBe('');

  const parsed = JSON.parse(streams.stderr.toString()) as {
    ok: boolean;
    stage: string;
    code: string;
    error: string;
  };

  expect(parsed.ok).toBeFalsy();
  expect(parsed.stage).toBe('job_pool');
  expect(parsed.code).toBe('cli_error');
  expect(parsed.error).toBe('Missing required --url or --input-file');
});
