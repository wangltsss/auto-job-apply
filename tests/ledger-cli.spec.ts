import { Writable } from 'node:stream';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { runExecutor } from '../executor/index.js';
import { runLedgerCli } from '../tools/ledger-cli.js';
import { LEDGER_CLI_USAGE, parseLedgerCliArgs } from '../tools/ledgerCliArgs.js';

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

test('parseLedgerCliArgs parses commands and validates input', () => {
  expect(parseLedgerCliArgs(['list-attempts'])).toEqual({ command: 'list-attempts', storePath: undefined });
  expect(parseLedgerCliArgs(['list-clarifications', '--store-path', './ledger.json'])).toEqual({
    command: 'list-clarifications',
    storePath: './ledger.json'
  });
  expect(() => parseLedgerCliArgs([])).toThrow('Missing or invalid ledger command');
  expect(() => parseLedgerCliArgs(['list-attempts', '--bogus'])).toThrow('Unknown flag: --bogus');
});

test('runLedgerCli prints help output', async () => {
  const streams = makeStreams();
  const code = await runLedgerCli(['--help'], streams.stdout as never, streams.stderr as never);

  expect(code).toBe(0);
  expect(streams.stderr.toString()).toBe('');
  expect(streams.stdout.toString()).toBe(`${LEDGER_CLI_USAGE}\n`);
});

test('runLedgerCli lists attempts and clarifications from the ledger', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'ledger-cli-'));
  const ledgerPath = join(tempDir, 'ledger.json');

  try {
    await runExecutor(resolve('examples/fixtures/extracted-form.sample.json'), resolve('examples/fixtures/valid-openclaw-response.json'), {
      dryRun: false,
      attemptSubmit: true,
      mockMode: true,
      traceEnabled: false,
      ledgerStorePath: ledgerPath
    });

    const attemptsStreams = makeStreams();
    const attemptsCode = await runLedgerCli(['list-attempts', '--store-path', ledgerPath], attemptsStreams.stdout as never, attemptsStreams.stderr as never);
    expect(attemptsCode).toBe(0);
    const attempts = JSON.parse(attemptsStreams.stdout.toString()) as {
      ok: boolean;
      stage: string;
      result: { command: string; count: number; records: Array<{ outcome: string }> };
    };
    expect(attempts.ok).toBeTruthy();
    expect(attempts.stage).toBe('ledger');
    expect(attempts.result.command).toBe('list-attempts');
    expect(attempts.result.count).toBe(1);
    expect(attempts.result.records[0]?.outcome).toBe('failure');

    const clarificationsStreams = makeStreams();
    const clarificationsCode = await runLedgerCli(
      ['list-clarifications', '--store-path', ledgerPath],
      clarificationsStreams.stdout as never,
      clarificationsStreams.stderr as never
    );
    expect(clarificationsCode).toBe(0);
    const clarifications = JSON.parse(clarificationsStreams.stdout.toString()) as {
      ok: boolean;
      stage: string;
      result: { command: string; count: number; records: Array<{ provenance: string; resolved: boolean }> };
    };
    expect(clarifications.ok).toBeTruthy();
    expect(clarifications.stage).toBe('ledger');
    expect(clarifications.result.command).toBe('list-clarifications');
    expect(clarifications.result.count).toBeGreaterThan(0);
    expect(clarifications.result.records[0]?.provenance).toBe('user_clarification_required');
    expect(clarifications.result.records[0]?.resolved).toBeFalsy();
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ledger records include provenance and clarification items', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'ledger-provenance-'));
  const ledgerPath = join(tempDir, 'ledger.json');

  try {
    await runExecutor(resolve('examples/fixtures/extracted-form.sample.json'), resolve('examples/fixtures/valid-openclaw-response.json'), {
      dryRun: false,
      attemptSubmit: true,
      mockMode: true,
      traceEnabled: false,
      ledgerStorePath: ledgerPath
    });

    const ledger = JSON.parse(await readFile(ledgerPath, 'utf-8')) as {
      attempts: Array<{ answer_summary: Array<{ provenance: string }> }>;
      clarifications: Array<{ field_id: string; provenance: string; question_label: string | null }>;
    };

    expect(ledger.attempts[0]?.answer_summary.some((item) => item.provenance === 'user_clarification_required')).toBeTruthy();
    expect(ledger.attempts[0]?.answer_summary.some((item) => item.provenance === 'known_profile' || item.provenance === 'clawdbot_inferred')).toBeTruthy();
    expect(ledger.clarifications.length).toBeGreaterThan(0);
    expect(ledger.clarifications[0]?.provenance).toBe('user_clarification_required');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
