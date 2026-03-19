import { Writable } from 'node:stream';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { runAnswerPlanCli } from '../tools/answer-plan-cli.js';
import { runExecuteCli } from '../tools/execute-cli.js';
import { runPipelineCli } from '../tools/pipeline-cli.js';
import { runScrapeCli } from '../tools/scrape-cli.js';

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

test('tool CLIs print help output', async () => {
  const cases = [
    { runner: runScrapeCli, stage: 'scrape' },
    { runner: runAnswerPlanCli, stage: 'answer_plan' },
    { runner: runExecuteCli, stage: 'execute' },
    { runner: runPipelineCli, stage: 'pipeline' }
  ];

  for (const item of cases) {
    const streams = makeStreams();
    const code = await item.runner(['--help'], streams.stdout as never, streams.stderr as never);
    expect(code).toBe(0);
    expect(streams.stderr.toString()).toBe('');
    expect(streams.stdout.toString()).toContain('Usage:');
  }
});

test('tool answer-plan CLI emits standardized success envelope', async () => {
  const streams = makeStreams();
  const code = await runAnswerPlanCli(
    [
      '--form-artifact',
      resolve('examples/fixtures/extracted-form.sample.json'),
      '--mock-response',
      resolve('examples/fixtures/valid-openclaw-response.json')
    ],
    streams.stdout as never,
    streams.stderr as never
  );

  expect(code).toBe(0);
  expect(streams.stderr.toString()).toBe('');
  const parsed = JSON.parse(streams.stdout.toString()) as {
    ok: boolean;
    stage: string;
    artifact_paths: { answer_plan_artifact_path?: string };
    result: { answer_plan_status: string };
  };
  expect(parsed.ok).toBeTruthy();
  expect(parsed.stage).toBe('answer_plan');
  expect(parsed.artifact_paths.answer_plan_artifact_path).toBeTruthy();
  expect(parsed.result.answer_plan_status).toBe('quarantine');
});

test('tool execute CLI emits standardized success envelope', async () => {
  const streams = makeStreams();
  const code = await runExecuteCli(
    [
      '--form-artifact',
      resolve('examples/fixtures/extracted-form.sample.json'),
      '--answer-plan-artifact',
      resolve('examples/fixtures/answer-plan.sample.json'),
      '--mock'
    ],
    streams.stdout as never,
    streams.stderr as never
  );

  expect(code).toBe(0);
  expect(streams.stderr.toString()).toBe('');
  const parsed = JSON.parse(streams.stdout.toString()) as {
    ok: boolean;
    stage: string;
    artifact_paths: { execution_result_artifact_path?: string };
    result: { execution_status: string };
  };
  expect(parsed.ok).toBeTruthy();
  expect(parsed.stage).toBe('execute');
  expect(parsed.artifact_paths.execution_result_artifact_path).toBeTruthy();
  expect(parsed.result.execution_status).toBe('success');
});

test('tool pipeline CLI emits standardized failure envelope when the pipeline fails', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'pipeline-cli-contract-'));

  try {
    const htmlPath = join(tempDir, 'application.html');
    await writeFile(
      htmlPath,
      '<!doctype html><html><head><title>Application</title></head><body><form><label for="email">Email</label><input id="email" name="email" type="email" required /></form></body></html>',
      'utf-8'
    );

    const streams = makeStreams();
    const code = await runPipelineCli(
      [
        '--url',
        `file://${htmlPath}`,
        '--mock-response',
        resolve('examples/fixtures/valid-openclaw-response.json'),
        '--mock-execution',
        '--no-trace'
      ],
      streams.stdout as never,
      streams.stderr as never
    );

    expect(code).toBe(1);
    expect(streams.stdout.toString()).toBe('');
    const parsed = JSON.parse(streams.stderr.toString()) as {
      ok: boolean;
      stage: string;
      code: string;
      error: string;
      details: { pipeline_artifact_path?: string; failure_stage?: string | null; notes?: string[] };
    };
    expect(parsed.ok).toBeFalsy();
    expect(parsed.stage).toBe('pipeline');
    expect(parsed.code.length).toBeGreaterThan(0);
    expect(parsed.error).toContain('Pipeline finished with status error');
    expect(parsed.details.pipeline_artifact_path).toBeTruthy();
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('tool CLIs emit standardized failure envelope', async () => {
  const cases = [
    { runner: runScrapeCli, args: [], stage: 'scrape', code: 'cli_error' },
    { runner: runAnswerPlanCli, args: [], stage: 'answer_plan', code: 'cli_error' },
    { runner: runExecuteCli, args: ['--bogus'], stage: 'execute', code: 'cli_error' },
    { runner: runPipelineCli, args: [], stage: 'pipeline', code: 'cli_error' }
  ];

  for (const item of cases) {
    const streams = makeStreams();
    const code = await item.runner(item.args, streams.stdout as never, streams.stderr as never);
    expect(code).toBe(1);
    expect(streams.stdout.toString()).toBe('');
    const parsed = JSON.parse(streams.stderr.toString()) as { ok: boolean; stage: string; code: string; error: string; details: Record<string, unknown> };
    expect(parsed.ok).toBeFalsy();
    expect(parsed.stage).toBe(item.stage);
    expect(parsed.code).toBe(item.code);
    expect(parsed.error.length).toBeGreaterThan(0);
    expect(parsed.details).toEqual({});
  }
});
