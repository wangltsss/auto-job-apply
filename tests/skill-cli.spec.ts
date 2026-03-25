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

  expect(parseSkillCliArgs(['call', '--operation', 'query_job', '--input-file', './job.json'])).toEqual({
    command: 'call',
    operation: 'query_job',
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
  expect(parsed.result.operations.some((operation) => operation.name === 'start_run')).toBeTruthy();
});

test('runSkillCli invokes package-backed operations with JSON input', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'skill-cli-'));
  const jobPoolPath = join(tempDir, 'jobs.json');
  const inputPath = join(tempDir, 'enqueue.json');

  try {
    await writeFile(
      inputPath,
      JSON.stringify({
        jobs: [
          {
            source_url: 'https://jobs.example.test/apply/123',
            title: 'Engineer'
          }
        ],
        storePath: jobPoolPath
      }),
      'utf-8'
    );

    const streams = makeStreams();
    const code = await runSkillCli(
      ['call', '--operation', 'enqueue_posting', '--input-file', inputPath],
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
    expect(parsed.result.operation).toBe('enqueue_posting');
    expect(parsed.result.output.ingested_count).toBe(1);
    expect(parsed.result.output.duplicate_count).toBe(0);
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
