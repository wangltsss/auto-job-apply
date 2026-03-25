import { Writable } from 'node:stream';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { runSkillCli } from '../tools/skill-cli.js';
import { parseSkillCliArgs, SKILL_CLI_USAGE } from '../tools/skillCliArgs.js';

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

test('parseSkillCliArgs parses describe and call commands', () => {
  expect(parseSkillCliArgs(['describe'])).toEqual({ command: 'describe' });

  expect(parseSkillCliArgs(['call', '--operation', '/ingest', '--input-file', './job.json'])).toEqual({
    command: 'call',
    operation: '/ingest',
    inputFilePath: './job.json',
    inputJson: undefined
  });
});

test('runSkillCli prints help output', async () => {
  const streams = makeStreams();
  const code = await runSkillCli(['--help'], streams.stdout as never, streams.stderr as never);

  expect(code).toBe(0);
  expect(streams.stderr.toString()).toBe('');
  expect(streams.stdout.toString()).toBe(`${SKILL_CLI_USAGE}\n`);
});

test('runSkillCli describes operations', async () => {
  const streams = makeStreams();
  const code = await runSkillCli(['describe'], streams.stdout as never, streams.stderr as never);

  expect(code).toBe(0);
  const parsed = JSON.parse(streams.stdout.toString()) as {
    ok: boolean;
    stage: string;
    result: { command: string; operations: Array<{ name: string }> };
  };

  expect(parsed.ok).toBeTruthy();
  expect(parsed.stage).toBe('skill');
  expect(parsed.result.command).toBe('describe');
  expect(parsed.result.operations.some((operation) => operation.name === '/ingest')).toBeTruthy();
  expect(parsed.result.operations.some((operation) => operation.name === '/apply')).toBeTruthy();
});

test('runSkillCli invokes /ingest with JSON input', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'skill-cli-'));
  const jobPoolPath = join(tempDir, 'jobs.json');
  const inputPath = join(tempDir, 'enqueue.json');

  try {
    await writeFile(
      inputPath,
      JSON.stringify({
        url: 'https://jobs.example.test/apply/123',
        title: 'Engineer',
        storePath: jobPoolPath
      }),
      'utf-8'
    );

    const streams = makeStreams();
    const code = await runSkillCli(
      ['call', '--operation', '/ingest', '--input-file', inputPath],
      streams.stdout as never,
      streams.stderr as never
    );

    expect(code).toBe(0);
    const parsed = JSON.parse(streams.stdout.toString()) as {
      ok: boolean;
      stage: string;
      result: {
        command: string;
        operation: string;
        output: { ingested_count: number; duplicate_count: number };
      };
    };

    expect(parsed.ok).toBeTruthy();
    expect(parsed.stage).toBe('skill');
    expect(parsed.result.command).toBe('call');
    expect(parsed.result.operation).toBe('/ingest');
    expect(parsed.result.output.ingested_count).toBe(1);
    expect(parsed.result.output.duplicate_count).toBe(0);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('runSkillCli invokes /apply with count shorthand', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'skill-cli-apply-'));
  const jobPoolPath = join(tempDir, 'jobs.json');
  const runStorePath = join(tempDir, 'runs.json');
  const incidentStorePath = join(tempDir, 'incidents.json');
  const activeRunLockPath = join(tempDir, 'active-run.lock');
  const inputPath = join(tempDir, 'apply.json');

  try {
    await runSkillCli(
      [
        'call',
        '--operation',
        '/ingest',
        '--input-json',
        JSON.stringify({
          url: 'https://jobs.example.test/apply/123',
          title: 'Engineer',
          storePath: jobPoolPath
        })
      ],
      makeStreams().stdout as never,
      makeStreams().stderr as never
    );

    await writeFile(
      inputPath,
      JSON.stringify({
        count: 1,
        job_pool_path: jobPoolPath,
        run_store_path: runStorePath,
        incident_store_path: incidentStorePath,
        active_run_lock_path: activeRunLockPath,
        applicant_profile: { basics: { first_name: 'Taylor' } },
        mock_openclaw_raw_output_path: join(process.cwd(), 'examples/fixtures/valid-openclaw-response.json'),
        mock_execution: true
      }),
      'utf-8'
    );

    const streams = makeStreams();
    const code = await runSkillCli(
      ['call', '--operation', '/apply', '--input-file', inputPath],
      streams.stdout as never,
      streams.stderr as never
    );

    expect(code).toBe(0);
    const parsed = JSON.parse(streams.stdout.toString()) as {
      ok: boolean;
      result: {
        operation: string;
        output: { run: { target_success_count: number; attempt_count: number } };
      };
    };
    expect(parsed.ok).toBeTruthy();
    expect(parsed.result.operation).toBe('/apply');
    expect(parsed.result.output.run.target_success_count).toBe(1);
    expect(parsed.result.output.run.attempt_count).toBe(1);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('runSkillCli emits standardized failure envelopes', async () => {
  const streams = makeStreams();
  const code = await runSkillCli(['call', '--operation', 'query_job', '--input-json', '[]'], streams.stdout as never, streams.stderr as never);

  expect(code).toBe(1);
  expect(streams.stdout.toString()).toBe('');

  const parsed = JSON.parse(streams.stderr.toString()) as {
    ok: boolean;
    stage: string;
    code: string;
    error: string;
  };

  expect(parsed.ok).toBeFalsy();
  expect(parsed.stage).toBe('skill');
  expect(parsed.code).toBe('cli_error');
  expect(parsed.error).toContain('JSON object');
});
